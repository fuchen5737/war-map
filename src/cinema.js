// 影片模式：参考片的版式——整幅地图铺满画面，没有侧栏、没有时间轴，
// 占领区是红斜线，旭日旗跟着战线铺开，胜仗是金星、殉国是白火苗，
// 年份压在左上角，解说压在底部。
//
// 这一层只做「怎么画」，取数与判定全在 data/ 与 src/control.js。
// 所有图形都来自 src/kit/ 的组件，这里只负责编排顺序与时机。

import { lonLatToScreen, toScreenX, toScreenY } from "./geo.js";
import { FACTIONS, unitOf } from "../data/units.js";
import { valorOf, basesAt } from "../data/valor.js";
import { ERA_TINT } from "./render.js";
import {
  clamp,
  rgba,
  lighten,
  mixColor,
  pulse,
  window01,
  smoothstep,
  hatchPattern,
  drawRisingSun,
  drawFlame,
  drawStar,
  drawBracket,
  drawSeal,
  drawVignette,
  drawCaptionBand,
  drawYearCard,
  drawCaption,
  drawKicker,
  drawSource,
  drawDayCount,
  drawTitleCard,
  drawFilmLegend,
} from "./kit/index.js";

// 影片模式的调色：比交互版更沉，让红斜线与金星跳出来
const F = {
  sea: "#060d12",
  seaDeep: "#02070a",
  land: "#0c141a",
  neighbor: "#0b1218",
  border: "rgba(198,216,222,0.30)",
  coast: "rgba(214,206,198,0.72)",
  label: "rgba(206,222,230,0.50)",
  labelStrong: "rgba(222,234,240,0.72)",
  ink: "#eef4f8",
  gold: "#e8b45c",
  flame: "#eae4e4",
  red: "#8a1626",
  redDark: "#6a0f1b",
};

/** 占领区的斜线颜色：日占最红，其他列强各给一个可分辨的色 */
function hatchColorFor(faction) {
  const f = FACTIONS[faction];
  if (!f) return F.red;
  if (faction === "jp") return F.red;
  return lighten(f.color, 0.1);
}

/**
 * 整帧。state 与交互版同构，额外接一个 caption（本帧解说）。
 */
/** 抗战起点（1931.7 九一八所在年），用来算「第 N 天」 */
const WAR_FROM = 1931.5;

/** 右上标题下那行小注：地点 + 交战方，短到一行放得下 */
function captionSub(state, node) {
  const evs = node.events || [];
  if (!evs.length) return "";
  const places = evs.map((e) => e.place).filter(Boolean);
  return places.slice(0, 2).join("、");
}

export function drawFilm(ctx, view, state) {
  const { base, year, player, stamp, revealed, activeIds, control } = state;
  const activeSet = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  const W = view.width;
  const H = view.height;

  ctx.clearRect(0, 0, W, H);
  drawSea(ctx, view);
  drawLand(ctx, view, base);
  drawHatchOccupation(ctx, view, base, control, player, stamp);
  drawProvinceLines(ctx, view, base);
  drawFlags(ctx, view, base, control, year, player, stamp);
  drawBases(ctx, view, base, year);
  drawArrows(ctx, view, revealed, activeSet, player, stamp);
  drawMarkers(ctx, view, revealed, activeSet, player, stamp);
  drawLabels(ctx, view, base, state.zoom || 1);
  drawFrontLine(ctx, view, revealed, year);

  // 文字层最后压上
  //
  // 竖屏时画布只有 390 宽，按 H 算字号会把字顶到画面外，
  // 所以窄屏一律改用 W 做基准，并把标题挪到年份下方、字幕抬高。
  const narrow = W < 680;
  drawVignette(ctx, W, H, 0.62);
  drawCaptionBand(ctx, W, H, { height: Math.round(H * (narrow ? 0.30 : 0.24)), strength: 0.9 });
  drawYearCard(ctx, Math.round(W * (narrow ? 0.055 : 0.045)), Math.round(H * (narrow ? 0.125 : 0.145)), Math.floor(year), monthOf(year), {
    size: narrow ? Math.max(30, Math.round(W * 0.135)) : Math.max(34, Math.round(H * 0.075)),
  });
  drawKicker(ctx, Math.round(W * (narrow ? 0.058 : 0.048)), Math.round(H * (narrow ? 0.033 : 0.062)), "十四年抗战 · 1931—1945", {
    size: narrow ? Math.max(10, Math.round(W * 0.026)) : Math.max(10, Math.round(H * 0.017)),
  });
  // 「第 N 天」：把年份换算成熬过来的天数，比再写一遍数字更有分量
  if (year >= WAR_FROM) {
    drawDayCount(ctx, Math.round(W * (narrow ? 0.058 : 0.048)), Math.round(H * (narrow ? 0.163 : 0.185)), {
      prefix: year >= 1937.47 ? "全面抗战" : "九一八以来",
      days: Math.max(1, Math.round((year - WAR_FROM) * 365.2425)),
      size: narrow ? Math.max(11, Math.round(W * 0.028)) : Math.max(11, Math.round(H * 0.017)),
    });
  }
  // 右上：当前这一节的名字（多战事的节点用节点标题，单战事用它自己的名字）
  const node = player && player.node;
  if (node) {
    const title = node.total > 1 ? node.title : node.events[0].name;
    const sub = captionSub(state, node);
    drawTitleCard(ctx, Math.round(W * (narrow ? 0.94 : 0.955)), Math.round(H * (narrow ? 0.20 : 0.125)), title, sub, {
      size: narrow ? Math.max(15, Math.round(W * 0.05)) : Math.max(17, Math.round(H * 0.036)),
      subSize: narrow ? Math.max(10, Math.round(W * 0.026)) : Math.max(11, Math.round(H * 0.017)),
    });
  }
  const cap = state.caption;
  if (cap) {
    drawCaption(ctx, cap, W, H, {
      size: narrow ? Math.max(13, Math.round(W * 0.038)) : Math.max(14, Math.round(H * 0.031)),
      maxWidth: Math.round(W * (narrow ? 0.88 : 0.72)),
      bottom: Math.round(H * (narrow ? 0.175 : 0.165)),
    });
  }
  // 左下角图例：三种符号各自的含义，一帧就看懂
  drawFilmLegend(ctx, Math.round(W * (narrow ? 0.058 : 0.048)), Math.round(H * (narrow ? 0.895 : 0.945)), [
    { kind: "hatch", color: "rgba(179,39,58,0.95)", label: "日军占领区" },
    { kind: "star", color: "#e8b45c", label: narrow ? "胜仗 · 根据地" : "胜仗 · 敌后根据地" },
    { kind: "flame", color: "#eae4e4", label: "殉国将领" },
  ], { size: narrow ? Math.max(9, Math.round(W * 0.024)) : Math.max(10, Math.round(H * 0.016)), gap: narrow ? 12 : 18 });
  drawSource(ctx, W, H, "底图：现代省界简化 · 地形：AWS Terrain Tiles", {
    size: Math.max(9, Math.round(H * 0.014)),
    pad: Math.round(W * 0.02),
  });
}

function monthOf(year) {
  const m = Math.floor((year - Math.floor(year)) * 12) + 1;
  return Math.min(12, Math.max(1, m));
}

/* ───────────────────────── 底图 ───────────────────────── */

function drawSea(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, F.seaDeep);
  g.addColorStop(1, F.sea);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
}

function shapePath(ctx, view, shapes) {
  ctx.beginPath();
  for (const shape of shapes) {
    for (const ring of shape) {
      for (let i = 0; i < ring.length; i++) {
        const x = toScreenX(view, ring[i][0]);
        const y = toScreenY(view, ring[i][1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
}

function drawLand(ctx, view, base) {
  // 邻国：压得更暗，只作为「境外」
  for (const n of base.neighbors) {
    shapePath(ctx, view, n.shapes);
    ctx.fillStyle = F.neighbor;
    ctx.fill("evenodd");
  }
  // 本土
  for (const p of base.provinces) {
    shapePath(ctx, view, p.shapes);
    ctx.fillStyle = F.land;
    ctx.fill("evenodd");
  }
  // 地形：只在本土范围内贴一层很淡的起伏
  const img = base.terrain;
  if (img && img.complete && img.naturalWidth) {
    const [minX, minY, maxX, maxY] = base.bbox;
    const x0 = toScreenX(view, minX);
    const y0 = toScreenY(view, maxY);
    const w = (maxX - minX) * view.s;
    const h = (maxY - minY) * view.s;
    ctx.save();
    shapePath(ctx, view, base.provinces.flatMap((p) => p.shapes));
    ctx.clip("evenodd");
    ctx.globalAlpha = 0.24;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x0, y0, w, h);
    ctx.restore();
  }
}

function drawProvinceLines(ctx, view, base) {
  ctx.save();
  ctx.strokeStyle = F.border;
  ctx.lineWidth = 0.8;
  for (const p of base.provinces) {
    shapePath(ctx, view, p.shapes);
    ctx.stroke();
  }
  if (base.outline) {
    ctx.strokeStyle = F.coast;
    ctx.lineWidth = 1.4;
    shapePath(ctx, view, base.outline);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────────────────────── 占领区斜线 ───────────────────────── */

function drawHatchOccupation(ctx, view, base, control, player, stamp) {
  if (!control || !control.held || !control.held.size) return;
  if (!base.provinceByName) base.provinceByName = new Map(base.provinces.map((p) => [p.name, p]));
  const wave = control.wave || new Map();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 全部裁进国界以内：边界外洇的那一圈不能糊到蒙古、朝鲜、海面上
  ctx.save();
  if (base.outline) {
    shapePath(ctx, view, base.outline);
    ctx.clip("evenodd");
  }

  for (const [name, faction] of control.held) {
    if (faction === "gov") continue;
    const prov = base.provinceByName.get(name);
    if (!prov) continue;

    const w = wave.get(name);
    const a = w ? w.a : 1;
    if (a <= 0) continue;

    const color = hatchColorFor(faction);
    // 参考片里占领区是「暗红成片 + 极淡斜纹」：底色与条纹的明度只差一点，
    // 所以这里两层都做成不透明的深红，不再靠 alpha 与陆地/地形混色——
    // 混出来的红会发灰发粉，正是之前比参考片「淡」的原因。
    // 只有日军占领区用斜线——这是全片的视觉主语。
    // 革命根据地改用很淡的平铺色，读作「我方活动区」，不与占领区抢注意力
    // （参考片里根据地是用金色括号 + 金星标的，不靠整块翻色）。
    const isOcc = faction === "jp";
    const baseC = mixColor(color, "#000000", isOcc ? 0.46 : 0.62);
    const lineC = mixColor(color, "#000000", 0.26);
    const pat = isOcc
      ? hatchPattern(ctx, { color: lineC, period: 4.4, width: 2.2, angle: 45, bg: baseC, dpr })
      : null;

    ctx.save();
    shapePath(ctx, view, prov.shapes);
    ctx.globalAlpha = clamp(a, 0, 1) * (isOcc ? 1 : 0.5);
    ctx.fillStyle = pat || baseC;
    ctx.fill("evenodd");
    ctx.restore();

    // 边界外再洇一圈同样的斜线：省与省之间的缝隙被糊上，
    // 占领区读起来是一整片，而不是几块分开的补丁。
    if (pat) {
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1) * 0.85;
      ctx.strokeStyle = pat;
      ctx.lineWidth = 22;
      ctx.lineJoin = "round";
      shapePath(ctx, view, prov.shapes);
      ctx.stroke();
      ctx.restore();
    }

    // 刚翻过来的一瞬：一道亮边扫过，读作「这一下是刚打下来的」
    if (a < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - a) * 0.9;
      ctx.strokeStyle = lighten(color, 0.45);
      ctx.lineWidth = 2.4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16 * (1 - a);
      shapePath(ctx, view, prov.shapes);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();}

/* ───────────────────────── 旭日旗 ───────────────────────── */

/**
 * 旗子沿战线铺开：每一省一面，按面积定大小，新占下的先亮一下。
 * 太多会糊，所以只给「日占」的省挂旗，并且按屏幕面积过滤小省。
 */
function drawFlags(ctx, view, base, control, year, player, stamp) {
  if (!control || !control.held) return;
  if (!base.provinceByName) base.provinceByName = new Map(base.provinces.map((p) => [p.name, p]));
  const wave = control.wave || new Map();
  const px2 = view.s * view.s;
  const list = [];

  for (const [name, faction] of control.held) {
    if (faction !== "jp") continue;
    const prov = base.provinceByName.get(name);
    if (!prov || !prov.label || !prov.area) continue;
    const screenArea = prov.area * px2;
    if (screenArea < 5200) continue; // 太小的省挂旗会糊成一团
    const x = toScreenX(view, prov.label[0]);
    const y = toScreenY(view, prov.label[1]);
    if (x < -20 || y < -20 || x > view.width + 20 || y > view.height + 20) continue;
    list.push({ x, y, screenArea, a: wave.get(name)?.a ?? 1, name });
  }

  // 大的先画，小的叠在上面，视觉上从中心向外铺
  list.sort((a, b) => b.screenArea - a.screenArea);
  const max = 12;
  for (const it of list.slice(0, max)) {
    const size = clamp(Math.sqrt(it.screenArea) * 0.16, 19, 31);
    // 刚占下的旗子有一个「插上去」的弹动
    const pop = it.a < 1 ? smoothstep(it.a) : 1;
    drawRisingSun(ctx, it.x, it.y - size * 0.5, size * pop, {
      color: "#c8342f",
      alpha: 0.42 + 0.58 * pop,
      rays: 16,
    });
  }
}

/* ───────────────────────── 敌后根据地 ───────────────────────── */

function drawBases(ctx, view, base, year) {
  const list = basesAt(year);
  if (!list.length) return;
  if (!base.provinceByName) base.provinceByName = new Map(base.provinces.map((p) => [p.name, p]));
  ctx.save();
  for (const b of list) {
    const provs = b.provinces.map((n) => base.provinceByName.get(n)).filter((p) => p && p.label);
    if (!provs.length) continue;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y = Infinity;
    for (const p of provs) {
      const x = toScreenX(view, p.label[0]);
      const yy = toScreenY(view, p.label[1]);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y = Math.min(y, yy);
    }
    if (!Number.isFinite(x0)) continue;
    const pad = 10;
    drawBracket(ctx, x0 - pad, x1 + pad, y - 22, {
      color: F.gold,
      alpha: 0.7,
      tick: 5,
      lineWidth: 1.6,
    });
    ctx.save();
    ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = rgba(F.gold, 0.82);
    ctx.strokeStyle = "rgba(6,14,19,0.75)";
    ctx.lineWidth = 2.6;
    const label = b.name;
    const cx = (x0 + x1) / 2;
    ctx.strokeText(label, cx, y - 26);
    ctx.fillText(label, cx, y - 26);
    ctx.restore();
  }
  ctx.restore();
}

/* ───────────────────────── 机动 ───────────────────────── */

function drawArrows(ctx, view, revealed, activeSet, player, stamp) {
  const active = revealed.filter((e) => activeSet.has(e.id) && e.arrows && e.arrows.length);
  if (!active.length) return;
  const flat = [];
  for (const e of active) for (const a of e.arrows) flat.push({ e, a });

  const span = (a) => {
    const p = a.pts.map(([lon, lat]) => lonLatToScreen(view, lon, lat));
    let t = 0;
    for (let i = 1; i < p.length; i += 1) t += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return t;
  };
  let lead = null;
  for (const it of flat) {
    if (it.a.kind !== "advance") continue;
    if (!lead || span(it.a) > span(lead.a)) lead = it;
  }
  if (!lead) lead = flat[0];

  for (const it of flat) {
    const isLead = it === lead;
    const fade = player.freshness(it.e.id, stamp, 2800);
    const grow = Math.min(1, fade / 0.55);
    if (grow <= 0) continue;
    const u = unitOf(it.e.id);
    const color = u ? u.color : `rgb(${ERA_TINT[it.e.era] || "150,160,170"})`;
    drawArrowOn(ctx, view, it.a, grow, isLead ? 0.92 : 0.4, color, isLead ? 1.15 : 0.7);
  }
}

/** 与 render.js 的 drawArrow 同构，但底色更重、头部更大，适合铺满屏幕的画面 */
function drawArrowOn(ctx, view, arrow, progress, alpha, tint, weight = 1) {
  const pts = arrow.pts.map(([lon, lat]) => lonLatToScreen(view, lon, lat));
  if (pts.length < 2) return;
  const MIN_SPAN = 54 * weight;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total <= 0) return;
  if (total < MIN_SPAN) {
    const k = MIN_SPAN / total;
    const [ox, oy] = pts[0];
    for (let i = 1; i < pts.length; i += 1) {
      pts[i] = [ox + (pts[i][0] - ox) * k, oy + (pts[i][1] - oy) * k];
      segs[i - 1] *= k;
    }
    total = MIN_SPAN;
  }

  const cut = total * clamp(progress, 0, 1);
  const line = [];
  let acc = 0;
  line.push(pts[0]);
  for (let i = 1; i < pts.length; i += 1) {
    if (acc + segs[i - 1] <= cut) {
      line.push(pts[i]);
      acc += segs[i - 1];
    } else {
      const t = (cut - acc) / segs[i - 1];
      line.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      break;
    }
  }
  if (line.length < 2) return;

  const naval = arrow.kind === "naval";
  const retreat = arrow.kind === "retreat";

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(naval ? [7, 5] : retreat ? [3, 4] : []);
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(4,10,14,0.9)";
  ctx.lineWidth = (naval ? 2.6 : 3) * weight + 2.6;
  ctx.beginPath();
  line.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = tint;
  ctx.lineWidth = (naval ? 2.2 : 2.6) * weight;
  ctx.beginPath();
  line.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.setLineDash([]);

  // 头部
  if (line.length >= 2) {
    const a = line[line.length - 2];
    const b = line[line.length - 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const h = 11 * weight;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - Math.cos(ang - 0.42) * h, b[1] - Math.sin(ang - 0.42) * h);
    ctx.lineTo(b[0] - Math.cos(ang + 0.42) * h, b[1] - Math.sin(ang + 0.42) * h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ───────────────────────── 金星与火苗 ───────────────────────── */

function drawMarkers(ctx, view, revealed, activeSet, player, stamp) {
  for (const e of revealed) {
    const v = valorOf(e.id);
    if (!v) continue;
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (x < -30 || y < -30 || x > view.width + 30 || y > view.height + 30) continue;

    const hot = activeSet.has(e.id);
    const fade = player.freshness(e.id, stamp, 3200);
    // 旧的标记一直留着，但压淡；正在讲的那一条亮起来
    const alpha = hot ? 1 : 0.34;
    const size = hot ? 11 : 7.5;

    if (v.kind === "victory") {
      const s = size * (0.8 + 0.5 * pulse(1 - fade));
      drawStar(ctx, x, y - 12, s, { color: F.gold, alpha });
    } else if (v.kind === "martyr") {
      drawFlame(ctx, x, y - 14, size * 1.5, {
        color: F.flame,
        alpha,
        t: (stamp / 1000 + x * 0.01) % 1,
      });
      if (hot && v.who) {
        ctx.save();
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeStyle = "rgba(6,14,19,0.8)";
        ctx.lineWidth = 3;
        ctx.fillStyle = rgba(F.flame, 0.92);
        ctx.strokeText(v.who, x, y - 26);
        ctx.fillText(v.who, x, y - 26);
        ctx.restore();
      }
    }
  }
}

/* ───────────────────────── 战线与地名 ───────────────────────── */

function drawFrontLine(ctx, view, revealed, year) {
  const recent = revealed.filter((e) => year - e.year <= 1.5).slice(-18);
  if (recent.length < 3) return;
  ctx.save();
  ctx.strokeStyle = rgba(F.red, 0.4);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  recent.forEach((e, i) => {
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawLabels(ctx, view, base, zoom) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const px2 = view.s * view.s;
  const put = (name, x, y, strong) => {
    ctx.font = `${strong ? 600 : 500} ${strong ? 12 : 10.5}px ui-sans-serif, system-ui, sans-serif`;
    ctx.strokeStyle = "rgba(5,12,17,0.7)";
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.strokeText(name, x, y);
    ctx.fillStyle = strong ? F.labelStrong : F.label;
    ctx.fillText(name, x, y);
  };
  for (const p of base.provinces) {
    if (!p.label || !p.area) continue;
    const area = p.area * px2;
    if (area < 4200) continue;
    const x = toScreenX(view, p.label[0]);
    const y = toScreenY(view, p.label[1]);
    if (x < -30 || y < -14 || x > view.width + 30 || y > view.height + 14) continue;
    put(p.name, x, y, area > 20000);
  }
  ctx.restore();
}

/* ───────────────────────── 解说词 ───────────────────────── */

/**
 * 每个节点的解说。参考片的做法是「一句话说清这一刻」，
 * 所以这里也只用一句，超出就交给下一节。
 */
export function captionFor(node) {
  if (!node) return "";
  const first = node.events[0];
  if (!first) return node.title;
  // 单条战事：标题 + 结果，结果里已经有信息就不再重复标题
  if (node.events.length === 1) {
    return `${first.place}｜${first.result}`;
  }
  return `${node.title}｜${node.events.map((e) => e.place).join("、")}`;
}
