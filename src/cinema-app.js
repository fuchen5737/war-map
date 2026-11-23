// 影片模式的装配层：和 src/app.js 同一个数据底座，但不装任何交互控件。
//
// 版式取自参考片：整幅地图铺满，红斜线是占领区，旭日旗跟着战线铺开，
// 金星是胜仗，白火苗是殉国的将领，年份压左上角，解说压底部。
//
// 这一页只走十四年抗战（1931.9—1945.10），因为参考片讲的就是这一段。

import { EVENTS, ERAS, TIMELINE } from "../data/events.js";
import { CONTROL } from "../data/control.js";
import { createInsetView, project } from "./geo.js";
import { NODES, createNodePlayer, nodeIndexAtYear } from "./nodes.js";
import { buildControlSteps, controlAt, waveOrder, waveAlpha } from "./control.js";
import { sortByYear, revealedAt, formatYear } from "./timeline.js";
import { drawFilm, captionFor } from "./cinema.js";
import { clamp } from "./kit/index.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// 只取抗战那一段：参考片的范围就是「九一八到南京受降」
const WAR = NODES.filter((n) => n.era === "anti");
const FROM = WAR.length ? WAR[0].year : TIMELINE.from;
const TO = WAR.length ? WAR[WAR.length - 1].year : TIMELINE.to;
const SORTED = sortByYear(EVENTS.filter((e) => e.era === "anti"));

const canvas = $("film");
const ctx = canvas.getContext("2d");
let dpr = 1;
let base = null;
let view = null;
let controlSteps = null;
let pointsCache = null;

const player = createNodePlayer({ nodes: WAR, from: FROM, to: TO });

const state = {
  year: FROM,
  nodeIdx: 0,
  activeIds: [],
  playing: false,
  speed: 1,
  stamp: 0,
  zoom: 1,
  caption: "",
};

// 镜头：焦点在地图坐标里，zoom=1 为整幅
const camera = { fx: 0, fy: 0, zoom: 1, rect: null };

// 调试钩子：验收脚本据此读到真实 view 与当前控制态
if (new URLSearchParams(location.search).has("debug")) {
  window.__cf = {
    get view() { return view; },
    get player() { return player; },
    get control() { return controlState(); },
    get camera() { return camera; },
    get base() { return base; },
    get nodes() { return WAR; },
    rebuild() { buildView(); },
    seek(id) {
      const i = WAR.findIndex((n) => n.id === id);
      if (i < 0) return false;
      player.pause();
      player.seekNode(i, performance.now());
      enterNode(WAR[i]);
      return true;
    },
  };
}

/* ───────────────────────── 尺寸与视图 ───────────────────────── */

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view = createInsetView(base.bbox, rect.width, rect.height, {}, camera.zoom, [camera.fx, camera.fy]);
}

function buildView() {
  const rect = canvas.getBoundingClientRect();
  view = createInsetView(base.bbox, rect.width, rect.height, {}, camera.zoom, [camera.fx, camera.fy]);
}

/** 一节战事在地图坐标里的外接矩形 */
function rectFor(node) {
  if (!node || !node.events.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const e of node.events) {
    const [x, y] = project(e.at[0], e.at[1]);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  // 单点战事也要留出周边：只给 0.06 会推到最紧，海岸线一占，画面全是海
  const MIN = 0.085;
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    dx: Math.max(MIN, x1 - x0),
    dy: Math.max(MIN, y1 - y0),
    origin: [(x0 + x1) / 2, (y0 + y1) / 2],
  };
}

/** 把镜头挪到这一节：整幅 → 推近，比例按「战区占画面 62%」算 */
function goalFor(node) {
  // 最后一节（受降）把镜头拉回整幅：讲了十四年，最后让人看一眼全图
  if (node && WAR.length && node.id === WAR[WAR.length - 1].id) {
    const [minX, minY, maxX, maxY] = base.bbox;
    return { fx: (minX + maxX) / 2, fy: (minY + maxY) / 2, zoom: 1 };
  }
  let t = rectFor(node);
  let merged = false;
  // 战场之外，画面里还得有占领区——否则这一帧全是墨色，读不出「打到哪儿了」。
  // 取离战场最近的一块占领省，把它的位置并进取景框。
  const occ = occupiedPoints();
  if (t && occ.length) {
    let best = null;
    let bestD = Infinity;
    for (const [px, py] of occ) {
      const d = Math.hypot(px - t.cx, py - t.cy);
      if (d < bestD) { bestD = d; best = [px, py]; }
    }
    // 占领区离战场太远就别并进来：一帧框住半个中国，读起来像全国图
    if (best && bestD < 0.42) {
      const x0 = Math.min(t.cx - t.dx / 2, best[0]);
      const x1 = Math.max(t.cx + t.dx / 2, best[0]);
      const y0 = Math.min(t.cy - t.dy / 2, best[1]);
      const y1 = Math.max(t.cy + t.dy / 2, best[1]);
      // 占领区离得太远时不要硬并——一帧框住半个中国，就退回只框战场
      if (x1 - x0 < 0.55 && y1 - y0 < 0.55) {
        merged = true;
        t.cx = (x0 + x1) / 2;
        t.cy = (y0 + y1) / 2;
        t.dx = x1 - x0;
        t.dy = y1 - y0;
      }
    }
  }
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const [minX, minY, maxX, maxY] = base.bbox;
  const sBase = Math.min(W / (maxX - minX), H / (maxY - minY));
  if (!t) {
    return { fx: (minX + maxX) / 2, fy: (minY + maxY) / 2, zoom: 1 };
  }
  // 参考片是区域级特写：战场只占画面三四成，省界放大到能认出县一级的邻接。
  // 战区取画面 32%，上限推到 5 倍——不够近就还是「全国图」，那是另一部片子。
  // 参考片的镜头是「一省到两省」的框，不是把战场怼满屏：
  // 太深会把占领区挤出画面，看起来就像什么都没有。
  let want = Math.min((W * 0.55) / t.dx, (H * 0.55) / t.dy);
  let zoom = clamp(want / sBase, 1, 3.1);
  // 并进占领区之后如果框被撑得太大（近景变成全国图），退回只框战场：
  // 那样的镜头读起来像「看全图」，而这一节讲的是某个城。
  if (merged && zoom < 2.0) {
    t = rectFor(node);
    want = Math.min((W * 0.55) / t.dx, (H * 0.55) / t.dy);
    zoom = clamp(want / sBase, 1, 2.8);
  }
  const k = clamp((zoom - 1) / 1.9, 0, 1);
  const cx0 = (minX + maxX) / 2;
  const cy0 = (minY + maxY) / 2;
  let fx = cx0 + (t.cx - cx0) * k;
  let fy = cy0 + (t.cy - cy0) * k;
  const halfW = W / sBase / zoom / 2;
  const halfH = H / sBase / zoom / 2;
  // 允许镜头探出视域四成（画面边缘就是海，参考片也这样），
  // 否则华东战场的取景会被底图右边界钉死，只能看全图。
  const padX = halfW * 0.42;
  const padY = halfH * 0.42;
  const loX = minX + halfW - padX;
  const hiX = maxX - halfW + padX;
  const loY = minY + halfH - padY;
  const hiY = maxY - halfH + padY;
  fx = hiX > loX ? Math.min(hiX, Math.max(loX, fx)) : (minX + maxX) / 2;
  fy = hiY > loY ? Math.min(hiY, Math.max(loY, fy)) : (minY + maxY) / 2;
  // 右栏压住画面右侧三成，可见区中心在 0.35W：
  // 镜头只右移这一点（0.15W），多了就把占领区推到画框外去
  const shift = (W * 0.15) / (sBase * zoom) * k;
  fx = hiX > loX ? Math.min(hiX, Math.max(loX, fx + shift)) : cx0;

  // 战场本身必须落在看得见的那半边——取景框把占领区并进来之后，
  // 战场可能被推到右栏底下，那这一节就白讲了。
  if (t && t.origin) {
    const px = (t.origin[0] - fx) * sBase * zoom + W / 2;
    const py = H / 2 - (t.origin[1] - fy) * sBase * zoom;
    if (px > W * 0.62) fx += (px - W * 0.62) / (sBase * zoom);
    else if (px < W * 0.18) fx += (px - W * 0.18) / (sBase * zoom);
    if (py > H * 0.72) fy -= (py - H * 0.72) / (sBase * zoom);
    else if (py < H * 0.22) fy -= (py - H * 0.22) / (sBase * zoom);
    fx = hiX > loX ? Math.min(hiX, Math.max(loX, fx)) : cx0;
    fy = hiY > loY ? Math.min(hiY, Math.max(loY, fy)) : cy0;
  }
  return { fx, fy, zoom };
}

function stepCamera(dt) {
  const goal = goalFor(player.node);
  const k = reduceMotion.matches ? 1 : Math.min(1, dt * 2.6);
  const nz = camera.zoom + (goal.zoom - camera.zoom) * k;
  const nx = camera.fx + (goal.fx - camera.fx) * k;
  const ny = camera.fy + (goal.fy - camera.fy) * k;
  const moved =
    Math.abs(nz - camera.zoom) > 1e-4 ||
    Math.abs(nx - camera.fx) > 1e-5 ||
    Math.abs(ny - camera.fy) > 1e-5;
  if (!moved) return;
  camera.zoom = nz;
  camera.fx = nx;
  camera.fy = ny;
  buildView();
}

/* ───────────────────────── 控制区 ───────────────────────── */

/** 当前已被占领的省的标注点（投影坐标） */
function occupiedPoints() {
  const st = controlState();
  if (!st) return [];
  const pts = provincePoints();
  const out = [];
  for (const [name, faction] of st.held) {
    if (faction !== "jp") continue;
    if (name === "台湾") continue; // 1895 年就割让了，不参与取景
    const p = pts.get(name);
    if (p) out.push(p);
  }
  return out;
}

function provincePoints() {
  const m = new Map();
  for (const p of base.provinces) if (p.label) m.set(p.name, p.label);
  return m;
}

function controlState() {
  if (!controlSteps) return null;
  // 用「画面上那一年」在全书节点里的位置查累计态。
  // 别用 player.node：自由拖动时它停在上一个节点上，
  // 会出现「年份已经是 1935、省面却还是 1933 的样子」。
  const globalIdx = nodeIndexAtYear(NODES, player.year);
  const i = clamp(globalIdx >= 0 ? globalIdx : 0, 0, controlSteps.length - 1);
  const held = controlAt(controlSteps, i);
  const wave = new Map();
  const step = controlSteps[i];
  if (step && step.changes) {
    if (!pointsCache) pointsCache = provincePoints();
    const order = waveOrder(step.changes, NODES[i], pointsCache);
    const t = player.playing ? player.dwellProgress : 1;
    for (const w of order) {
      wave.set(w.province, { a: waveAlpha(w.delay, t), from: w.from, to: w.to });
    }
  }
  return { held, wave };
}

/* ───────────────────────── 播放 ───────────────────────── */

function enterNode(n) {
  state.nodeIdx = n.seq;
  state.year = n.year;
  state.activeIds = n.events.map((e) => e.id);
  state.caption = captionFor(n);
  syncHud();
}

function setPlaying(on) {
  if (on) {
    if (player.atEnd) player.seekNode(0, performance.now());
    player.play(performance.now());
    // 从节点模式起播时，先补上当前这一节的状态
    if (player.node) enterNode(player.node);
  } else {
    player.pause();
  }
  state.playing = player.playing;
  document.body.classList.toggle("playing", state.playing);
  document.body.classList.toggle("ended", player.atEnd && !state.playing);
  $("btn-play").setAttribute("aria-label", state.playing ? "暂停" : "播放");
}

function syncHud() {
  const { year, month } = formatYear(state.year);
  const node = player.node;
  // 视觉读数全在 canvas 上；这里只维护进度条与读屏摘要
  $("sr-now").textContent = `${year}年${month}月${node ? `，${node.campaignName}，${node.index}/${node.total}，${node.title}` : ""}。${state.caption || ""}`;
  const pct = ((state.year - FROM) / (TO - FROM)) * 100;
  $("hud-bar").style.setProperty("--p", `${clamp(pct, 0, 100)}%`);
  $("hud-bar").setAttribute("aria-valuenow", String(year));
}

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  state.stamp = now;

  if (player.playing) {
    const born = player.tick(dt * state.speed, now);
    for (const n of born) enterNode(n);
    state.year = player.year;
    if (!player.playing) setPlaying(false);
    else syncHud();
  }
  stepCamera(dt);

  drawFilm(ctx, view, {
    base,
    year: state.year,
    revealed: revealedAt(SORTED, state.year),
    player,
    stamp: now,
    activeIds: state.activeIds,
    zoom: camera.zoom,
    control: controlState(),
    caption: state.caption,
  });

  requestAnimationFrame(frame);
}

/* ───────────────────────── 载入 ───────────────────────── */

async function loadTerrain() {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      base.terrain = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = "data/geo/terrain.webp";
  });
}

async function boot() {
  const res = await fetch("data/geo/basemap.json");
  base = await res.json();
  await loadTerrain();

  controlSteps = buildControlSteps(CONTROL, NODES);
  const [minX, minY, maxX, maxY] = base.bbox;
  camera.fx = (minX + maxX) / 2;
  camera.fy = (minY + maxY) / 2;

  resize();
  window.addEventListener("resize", resize);

  player.seekNode(0, performance.now());
  enterNode(WAR[0]);

  $("btn-play").addEventListener("click", () => setPlaying(!player.playing));
  $("btn-restart").addEventListener("click", () => {
    player.seekNode(0, performance.now());
    enterNode(WAR[0]);
    setPlaying(true);
  });
  $("hud-bar").addEventListener("click", (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const p = clamp((ev.clientX - r.left) / r.width, 0, 1);
    const year = FROM + p * (TO - FROM);
    // 影片是按节点讲的，点进度条就跳到最近的那一节：
    // 年份与字幕永远对得上，不会出现「写着 1935、说的却是 1933 那一节」。
    let idx = 0;
    let best = Infinity;
    WAR.forEach((n, k) => {
      const d = Math.abs(n.year - year);
      if (d < best) { best = d; idx = k; }
    });
    // 注意用 idx 而不是 WAR[idx].seq：player 只在抗战这 22 节里跑，
    // 传全书的 seq 会被夹到最后一节（曾经因此把标题画成「南京受降」）
    player.seekNode(idx, performance.now());
    enterNode(WAR[idx]);
    syncHud();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space") {
      ev.preventDefault();
      setPlaying(!player.playing);
    } else if (ev.key === "Home") {
      player.seekNode(0, performance.now());
      enterNode(WAR[0]);
      syncHud();
    }
  });

  syncHud();
  requestAnimationFrame(frame);
}

boot();
