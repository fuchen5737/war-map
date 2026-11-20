// 交互与装配：把数据集、投影、渲染、时间轴缝在一起。
// 结构上分成三块：地图（canvas）、时间轴（transport）、战事流（feed）。

import { EVENTS, ERAS, TIMELINE } from "../data/events.js";
import { createInsetView, lonLatToScreen } from "./geo.js";
import { draw, ERA_TINT } from "./render.js";
import { NODES, createNodePlayer, nodeIndexAtYear, nextNodeIndex, prevNodeIndex } from "./nodes.js";
import {
  sortByYear, yearOf, revealedAt, revealedCount,
  formatYear, densityByYear,
} from "./timeline.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const narrow = window.matchMedia("(max-width: 860px)");

const SORTED = sortByYear(EVENTS);
const FROM = TIMELINE.from;
const TO = TIMELINE.to;
// 起手节点取第一个战役节点：否则 1840 年 1 月开局是一张空图
const START = NODES.length ? NODES[0].year : FROM;
// 战事 → 所属节点，点地图时用它找回上下文
const NODE_OF = new Map(NODES.flatMap((n) => n.events.map((e) => [e.id, n])));

const state = {
  year: START,
  nodeIdx: 0,
  activeIds: [],
  hoverId: null,
  playing: false,
  speed: 1,
  feedOpen: false,
  zoom: 1,
  stamp: 0,
};

let base = null;
let view = null;
const canvas = $("map");
const ctx = canvas.getContext("2d");
let dpr = 1;

const player = createNodePlayer({ nodes: NODES, from: FROM, to: TO });

/* ───────────────────────── 尺寸 ───────────────────────── */

/**
 * 面板围出的可视区：地图只在这块空地中央铺开，不被左右栏压住。
 * 尺寸直接量面板真实几何，断点变化时无需另写一套数字。
 */
function insets(rect) {
  const rail = $("rail").getBoundingClientRect();
  const feed = $("feed").getBoundingClientRect();
  const transport = $("transport").getBoundingClientRect();
  const wide = window.matchMedia("(min-width: 861px)").matches;
  const feedVisible = wide || state.feedOpen;
  return {
    left: wide ? Math.max(0, rail.right - rect.left) : 0,
    right: wide && feedVisible ? Math.max(0, rect.right - feed.left) : 0,
    top: wide ? 0 : Math.max(0, rail.bottom - rect.top),
    bottom: Math.max(0, rect.bottom - transport.top),
  };
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view = createInsetView(base.bbox, rect.width, rect.height, insets(rect), state.zoom);
}

/* ───────────────────────── 渲染循环 ───────────────────────── */

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  state.stamp = now;

  if (player.playing) {
    const born = player.tick(dt * state.speed, now);
    for (const n of born) enterNode(n, { animate: true });
    state.year = player.year;
    syncClock(state.year);
    syncNow();
    if (!player.playing) setPlaying(false);
  }
  syncNodeBar();

  draw(ctx, view, {
    base,
    events: EVENTS,
    eras: ERAS,
    year: state.year,
    revealed: revealedAt(SORTED, state.year),
    player,
    stamp: now,
    activeIds: state.activeIds,
    zoom: state.zoom,
  });

  requestAnimationFrame(frame);
}

/* ───────────────────────── 时间轴 ───────────────────────── */

function syncClock(year) {
  const { year: y, month } = formatYear(year);
  $("year-big").textContent = y;
  $("month-small").textContent = `${month}月`;
  const pct = ((year - FROM) / (TO - FROM)) * 100;
  $("density").style.setProperty("--p", `${pct}%`);
  $("density").setAttribute("aria-valuenow", String(y));
}

/** 左栏「此刻」：显示当前节点所属战役、节次与节点名。空档年单独说清楚。 */
function syncNow() {
  const nodeMode = player.mode === "node";
  const n = nodeMode
    ? player.node
    : NODES[Math.max(0, nodeIndexAtYear(NODES, state.year))];
  if (!n) return;

  const gap = !nodeMode && state.year - n.year > 0.9;
  const era = ERAS.find((e) => e.id === n.era);
  const next = NODES[n.seq + 1];
  $("era-label").textContent = gap
    ? `间歇 · ${n.campaignName}已告段落`
    : `此刻 · ${era ? era.name : ""}`;
  $("era-name").textContent = n.campaignName;
  $("node-pos").textContent = `${n.index}/${n.total}`;
  $("node-title").textContent = n.title;
  $("era-blurb").textContent = gap
    ? (next ? `下一场在 ${next.date.slice(0, 4)} 年：${next.campaignName} · ${next.title}` : "战事已止。")
    : n.campaignBlurb;
  document.body.classList.toggle("era-gap", gap);

  for (const el of document.querySelectorAll(".era-item")) {
    el.classList.toggle("on", el.dataset.era === n.era);
  }
}

/** 节点停留进度：一根从 0 长到 1 的细线，说明「这一节还没讲完」 */
function syncNodeBar() {
  const p = player.dwellProgress;
  $("node-bar").style.transform = `scaleX(${p.toFixed(3)})`;
  $("node-bar").style.opacity = player.playing ? "1" : "0";
}

function setPlaying(on) {
  state.playing = on;
  document.body.classList.toggle("playing", on);
  $("btn-play").setAttribute("aria-label", on ? "暂停" : "播放");
  if (!on) player.pause();
  syncNodeBar();
}

/** 走到第 k 个节点（瞬时到位） */
function goNode(k, opts = {}) {
  const n = NODES[Math.max(0, Math.min(NODES.length - 1, k))];
  if (!n) return;
  player.seekNode(n.seq, performance.now());
  state.year = n.year;
  state.nodeIdx = n.seq;
  state.activeIds = n.events.map((e) => e.id);
  syncClock(state.year);
  syncNow();
  if (opts.rebuild !== false) rebuildFeed(n);
  if (opts.dossier) showDossier(n.events[n.events.length - 1], { node: n });
  if (opts.rebuild !== false) markActive(n.id);
}

/** 播放到达一个节点：记下它、推进流、弹档案 */
function enterNode(n, opts = {}) {
  state.nodeIdx = n.seq;
  state.year = n.year;
  state.activeIds = n.events.map((e) => e.id);
  pushFeedNode(n, opts.animate);
  markActive(n.id);
  // 窄屏地图本来就小，播放时弹卡片会盖住刚亮起来的点；左栏已经写着这一节是什么了
  if (!narrow.matches) showDossier(n.events[n.events.length - 1], { auto: true, node: n });
}

/** 拖动年表尺：年份自由，节点跟着走 */
function seekYear(year, opts = {}) {
  const y = Math.max(FROM, Math.min(TO, year));
  player.seekFree(y, performance.now());
  state.year = y;
  state.nodeIdx = player.index;
  const n = NODES[Math.max(0, player.index)];
  state.activeIds = n ? n.events.map((e) => e.id) : [];
  syncClock(y);
  syncNow();
  if (opts.rebuild) rebuildFeed(n);
}

/* ───────────────────────── 战事流 ───────────────────────── */

const feedList = $("feed-list");
const seen = new Set();

function feedItemEl(n) {
  const li = document.createElement("li");
  li.className = "feed-item";
  li.dataset.id = n.id;
  li.dataset.era = n.era;
  const { year } = formatYear(n.year);
  li.innerHTML = `
    <span class="fi-year"></span>
    <span class="fi-body">
      <b class="fi-name"></b>
      <em class="fi-place"></em>
    </span>`;
  li.querySelector(".fi-year").textContent = year;
  li.querySelector(".fi-name").textContent = n.title;
  li.querySelector(".fi-place").textContent = n.events.length > 1
    ? `${n.campaignName} · 同刻 ${n.events.length} 处`
    : `${n.campaignName} · ${n.events[0].place}`;
  if (n.events.length > 1) li.title = n.events.map((e) => e.name).join("；");
  li.addEventListener("click", () => {
    state.nodeIdx = n.seq;
    state.activeIds = n.events.map((e) => e.id);
    showDossier(n.events[n.events.length - 1], { node: n });
    markActive(n.id);
  });
  return li;
}

function pushFeedNode(n, animate) {
  if (seen.has(n.id)) {
    markActive(n.id);
    return;
  }
  seen.add(n.id);
  const li = feedItemEl(n);
  if (animate && !reduceMotion.matches) li.classList.add("enter");
  feedList.prepend(li);
  if (feedList.children.length > 60) feedList.lastElementChild?.remove();
  $("shown").textContent = revealedCount(SORTED, player.year);
  for (const other of feedList.children) other.classList.remove("on");
  li.classList.add("on");
}

function rebuildFeed(node) {
  seen.clear();
  feedList.textContent = "";
  const upto = node ? node.seq : 0;
  const list = NODES.slice(Math.max(0, upto - 59), upto + 1);
  for (const n of list) {
    seen.add(n.id);
    feedList.prepend(feedItemEl(n));
  }
  $("shown").textContent = revealedCount(SORTED, state.year);
  if (node) markActive(node.id);
}

/* ───────────────────────── 档案卡 ───────────────────────── */

let dossierTimer = null;

function showDossier(e, opts = {}) {
  const d = $("dossier");
  const era = ERAS.find((x) => x.id === e.era);
  const node = opts.node || NODE_OF.get(e.id);
  $("d-era").textContent = era ? era.name : "";
  $("d-ctx").textContent = node
    ? `${node.campaignName} · ${node.index}/${node.total}${node.events.length > 1 ? ` · 同刻 ${node.events.length} 处` : ""}`
    : "";
  const { year, month } = formatYear(yearOf(e));
  $("d-date").textContent = `${year}年${month}月`;
  $("d-scale").textContent = e.scale === 3 ? "决定性" : e.scale === 2 ? "战役" : "战斗";
  $("d-scale").dataset.scale = String(e.scale);
  $("d-name").textContent = e.name;
  $("d-place").textContent = e.place;
  $("d-note").textContent = e.note;
  $("d-result").textContent = e.result;
  d.hidden = false;
  d.classList.add("in");
  clearTimeout(dossierTimer);
  if (opts.auto) {
    dossierTimer = setTimeout(() => {
      if (player.playing) hideDossier();
    }, 3600);
  }
}

function hideDossier() {
  const d = $("dossier");
  d.classList.remove("in");
  d.hidden = true;
}

/* ───────────────────────── 事件绑定 ───────────────────────── */

function bind() {
  $("btn-play").addEventListener("click", () => {
    if (player.playing) {
      setPlaying(false);
      return;
    }
    // 停在末节时按播放＝重看一遍，而不是把最后一节再念一次就停
    if (player.atEnd || state.nodeIdx >= NODES.length - 1) goNode(0, { rebuild: true });
    setPlaying(true);
    player.play(performance.now());
  });

  $("btn-prev").addEventListener("click", () => {
    setPlaying(false);
    const k = prevNodeIndex(NODES, state.year);
    goNode(k < 0 ? 0 : k, { dossier: true });
  });

  $("btn-next").addEventListener("click", () => {
    setPlaying(false);
    const k = nextNodeIndex(NODES, state.year);
    goNode(k < 0 ? NODES.length - 1 : k, { dossier: true });
  });

  $("btn-reset").addEventListener("click", () => {
    setPlaying(false);
    goNode(0, { rebuild: true });
    hideDossier();
  });

  $("btn-speed").addEventListener("click", () => {
    const steps = [1, 2, 4];
    const i = steps.indexOf(state.speed);
    state.speed = steps[(i + 1) % steps.length];
    $("btn-speed").textContent = `${state.speed}×`;
  });

  $("dossier-close").addEventListener("click", hideDossier);

  // 窄屏没有左栏页脚，关于入口挪到时间轴右侧；两个入口共用一套开合与焦点归还
  let aboutFrom = $("btn-about");
  const openAbout = (from) => {
    aboutFrom = from;
    $("about").hidden = false;
    $("about-close").focus();
  };
  const closeAbout = () => {
    if ($("about").hidden) return false;
    $("about").hidden = true;
    aboutFrom.focus();
    return true;
  };
  $("btn-about").addEventListener("click", (ev) => openAbout(ev.currentTarget));
  $("btn-about-narrow").addEventListener("click", (ev) => openAbout(ev.currentTarget));
  $("about-close").addEventListener("click", closeAbout);
  $("about").addEventListener("click", (ev) => {
    if (ev.target === $("about")) closeAbout();
  });

  $("btn-feed-toggle").addEventListener("click", () => {
    state.feedOpen = !state.feedOpen;
    document.body.classList.toggle("feed-open", state.feedOpen);
    $("btn-feed-toggle").setAttribute("aria-expanded", String(state.feedOpen));
    $("btn-feed-toggle").setAttribute("aria-label", state.feedOpen ? "收起战事流" : "展开战事流");
    resize();
  });

  // 时间轴拖拽
  const density = $("density");
  let dragging = false;
  const yearFromPointer = (clientX) => {
    const r = density.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return FROM + t * (TO - FROM);
  };
  density.addEventListener("pointerdown", (ev) => {
    dragging = true;
    // 捕获失败不该拖累定位（老浏览器或合成事件都可能不给 pointerId）
    try { density.setPointerCapture(ev.pointerId); } catch {}
    setPlaying(false);
    seekYear(yearFromPointer(ev.clientX));
    density.classList.add("drag");
  });
  density.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    seekYear(yearFromPointer(ev.clientX));
  });
  density.addEventListener("pointerup", (ev) => {
    dragging = false;
    density.classList.remove("drag");
    try { density.releasePointerCapture(ev.pointerId); } catch {}
    const n = NODES[Math.max(0, player.index)];
    rebuildFeed(n);
    if (n) showDossier(n.events[n.events.length - 1], { node: n });
  });

  density.addEventListener("keydown", (ev) => {
    const step = ev.shiftKey ? 1 : 0.1;
    if (ev.key === "ArrowRight") { setPlaying(false); seekYear(state.year + step, { rebuild: true }); ev.preventDefault(); }
    if (ev.key === "ArrowLeft") { setPlaying(false); seekYear(state.year - step, { rebuild: true }); ev.preventDefault(); }
    if (ev.key === "Home") { setPlaying(false); goNode(0, { rebuild: true }); ev.preventDefault(); }
    if (ev.key === "End") { setPlaying(false); goNode(NODES.length - 1, { rebuild: true }); ev.preventDefault(); }
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.target.closest("input, textarea")) return;
    if (ev.key === " " && !ev.target.closest("button")) {
      ev.preventDefault();
      $("btn-play").click();
    }
    if (ev.key === "ArrowRight" && !ev.target.closest("#density")) { $("btn-next").click(); ev.preventDefault(); }
    if (ev.key === "ArrowLeft" && !ev.target.closest("#density")) { $("btn-prev").click(); ev.preventDefault(); }
    if (ev.key === "Home") { $("btn-reset").click(); ev.preventDefault(); }
    if (ev.key === "Escape") {
      if (!closeAbout()) hideDossier();
    }
  });

  // 地图点选：命中最近的战事点
  canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const list = revealedAt(SORTED, state.year);
    let best = null;
    let bestD = 22;
    for (const e of list) {
      const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
      const d = Math.hypot(x - mx, y - my);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      const n = NODE_OF.get(best.id);
      state.activeIds = n ? n.events.map((e) => e.id) : [best.id];
      showDossier(best, { node: n });
      if (n) {
        // 点地图只是「查看」，不动此刻的时间轴位置——否则会打断正在播的节拍
        markActive(n.id);
        scrollFeedTo(n.id);
      }
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const list = revealedAt(SORTED, state.year);
    let hit = null;
    let bestD = 18;
    for (const e of list) {
      const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
      const d = Math.hypot(x - mx, y - my);
      if (d < bestD) { bestD = d; hit = e; }
    }
    canvas.style.cursor = hit ? "pointer" : "grab";
    if (hit) canvas.title = `${hit.name} · ${hit.place}`;
    else canvas.removeAttribute("title");
  });

  // 滚轮缩放
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const next = Math.max(1, Math.min(3.2, state.zoom * (ev.deltaY > 0 ? 0.9 : 1.1)));
    state.zoom = next;
    resize();
  }, { passive: false });

  reduceMotion.addEventListener?.("change", () => {});
  window.addEventListener("resize", resize);
}

function markActive(id) {
  for (const li of feedList.children) li.classList.toggle("on", li.dataset.id === id);
}

function scrollFeedTo(id) {
  const li = [...feedList.children].find((x) => x.dataset.id === id);
  if (li) li.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
}

/* ───────────────────────── 启动 ───────────────────────── */

async function boot() {
  const res = await fetch("data/geo/basemap.json");
  base = await res.json();

  $("total").textContent = EVENTS.length;
  $("about-count").textContent = EVENTS.length;
  $("about-nodes").textContent = NODES.length;

  buildEraNav();
  buildTicks();
  resize();
  bind();
  goNode(0, { rebuild: true });
  requestAnimationFrame(frame);
}

function buildEraNav() {
  const nav = $("eras");
  for (const era of ERAS) {
    const b = document.createElement("button");
    b.className = "era-item";
    b.dataset.era = era.id;
    // 小色点＝地图上这个时期的点位颜色，把年份栏和地图上的点对上号
    b.innerHTML = `<span class="ei-main"><i class="ei-dot"></i><span class="ei-name"></span></span><span class="ei-span"></span>`;
    b.style.setProperty("--tint", ERA_TINT[era.id] || "150,160,170");
    b.querySelector(".ei-name").textContent = era.name;
    b.querySelector(".ei-span").textContent = `${era.from}—${era.to}`;
    b.addEventListener("click", () => {
      setPlaying(false);
      // 跳到这个时期的第一节，而不是它开始的那一年——年表上可能先有空档
      const first = NODES.find((n) => n.era === era.id);
      goNode(first ? first.seq : 0, { rebuild: true });
      hideDossier();
    });
    nav.appendChild(b);
  }
}

function buildTicks() {
  const bars = densityByYear(EVENTS, FROM, TO);
  const max = Math.max(...bars);
  const el = $("density");
  const frag = document.createDocumentFragment();
  bars.forEach((n, i) => {
    if (!n) return;
    const b = document.createElement("i");
    b.style.left = `${(i / bars.length) * 100}%`;
    b.style.height = `${Math.max(8, (n / max) * 100)}%`;
    b.title = `${FROM + i}年 · ${n} 条`;
    frag.appendChild(b);
  });
  el.appendChild(frag);

  const ticks = document.querySelector(".ticks");
  for (let y = 1840; y <= 1950; y += 10) {
    const s = document.createElement("span");
    s.style.left = `${((y - FROM) / (TO - FROM)) * 100}%`;
    s.textContent = y === 1950 ? "" : String(y);
    ticks.appendChild(s);
  }
}

boot();
