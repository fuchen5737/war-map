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
    rebuild() { buildView(); },
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
  const MIN = 0.06;
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    dx: Math.max(MIN, x1 - x0),
    dy: Math.max(MIN, y1 - y0),
  };
}

/** 把镜头挪到这一节：整幅 → 推近，比例按「战区占画面 62%」算 */
function goalFor(node) {
  // 最后一节（受降）把镜头拉回整幅：讲了十四年，最后让人看一眼全图
  if (node && WAR.length && node.id === WAR[WAR.length - 1].id) {
    const [minX, minY, maxX, maxY] = base.bbox;
    return { fx: (minX + maxX) / 2, fy: (minY + maxY) / 2, zoom: 1 };
  }
  const t = rectFor(node);
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const [minX, minY, maxX, maxY] = base.bbox;
  const sBase = Math.min(W / (maxX - minX), H / (maxY - minY));
  if (!t) {
    return { fx: (minX + maxX) / 2, fy: (minY + maxY) / 2, zoom: 1 };
  }
  // 战区占画面 52%：再大就把周围的省挤出画面，读不出「打到了哪里」；
  // 上限 2.0 让早期东北的小战场也能推近（参考片里九一八、江桥都推得很近）
  // 战区占画面 64%：够近看得出打在哪一省，又不至于把邻省全挤出画面
  // （参考片也没把地图裁到只剩战场，边上总留着「这里离哪儿近」的参照）
  const want = Math.min((W * 0.64) / t.dx, (H * 0.64) / t.dy);
  const zoom = clamp(want / sBase, 1, 1.75);
  const k = clamp((zoom - 1) / 1.5, 0, 1);
  const cx0 = (minX + maxX) / 2;
  const cy0 = (minY + maxY) / 2;
  let fx = cx0 + (t.cx - cx0) * k;
  let fy = cy0 + (t.cy - cy0) * k;
  const halfW = W / sBase / zoom / 2;
  const halfH = H / sBase / zoom / 2;
  fx = Math.min(maxX - halfW, Math.max(minX + halfW, fx));
  fy = Math.min(maxY - halfH, Math.max(minY + halfH, fy));
  if (!(maxX - minX > halfW * 2)) fx = cx0;
  if (!(maxY - minY > halfH * 2)) fy = cy0;
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
