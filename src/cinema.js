// 影片模式：照参考片的版式重画——区域级镜头、带发光边缘的占领区、
// 城市落点带「沦陷 M.D」小签、右栏信息面板、左栏年份与引文。
//
// 这一层只做「怎么画」；取数在 data/，判定在 src/control.js，
// 图形基元在 src/kit/。

import { lonLatToScreen, toScreenX, toScreenY, project } from "./geo.js";
import { FACTIONS } from "../data/units.js";
import { valorOf, basesAt } from "../data/valor.js";
import { CITIES, yearToStamp, stampToDecimal, fallLabel } from "../data/cities.js";
import { momentOf } from "../data/moments.js";
import {
  clamp,
  rgba,
  lighten,
  mixColor,
  pulse,
  smoothstep,
  hatchPattern,
  drawStar,
  drawFlame,
  drawBracket,
  drawVignette,
  drawPanelTitle,
  drawCityGrid,
  drawQuoteBlock,
  drawFallTag,
  drawInsetFrame,
  drawFilmLegend,
  drawSource,
  FONTS,
} from "./kit/index.js";

const F = {
  sea: "#05090d",
  land: "#0b1219",
  neighbor: "#070c11",
  border: "rgba(150,170,186,0.10)",
  coast: "rgba(186,200,212,0.30)",
  label: "rgba(170,188,202,0.34)",
  labelStrong: "rgba(198,212,224,0.52)",
  ink: "#eef2f5",
  gold: "#e8b45c",
  flame: "#eae4e4",
  red: "#8f1424",
  redHi: "#ff5a2c",
};

/** 占领区颜色：日占最红，其余列强各给一个可分辨的色 */
function hatchColorFor(faction) {
  const f = FACTIONS[faction];
  if (!f) return F.red;
  if (faction === "jp") return F.red;
  return lighten(f.color, 0.06);
}

const WAR_FROM = 1931.5;
const DECLARE = 1937 + 6 / 12; // 「三个月灭亡中国」起算（1937.7）
const DECLARE_END = DECLARE + 0.25; // 三个月期限

/* ───────────────────────── 整帧 ───────────────────────── */

export function drawFilm(ctx, view, state) {
  const { base, year, player, stamp, revealed, activeIds, control } = state;
  const activeSet = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  const W = view.width;
  const H = view.height;
  const narrow = W < 680;
  const node = player && player.node;
  const moment = node ? momentOf(node.id) : null;
  const t = yearToStamp(year);

  ctx.clearRect(0, 0, W, H);
  drawSea(ctx, view);
  drawLand(ctx, view, base);
  drawOccupation(ctx, view, base, control, player, stamp);
  drawProvinceLines(ctx, view, base);
  drawCities(ctx, view, base, t, year);
  if (moment && moment.kind === "massacre") drawMassacre(ctx, view, moment, player, stamp);
  if (year >= 1945.55) {
    // 停住时给终态，否则画面停在节点上却一颗光点都没有
    const lit = player && player.mode === "node" && player.playing ? clamp(player.dwellProgress, 0, 1) : 1;
    drawLiberation(ctx, view, base, lit, stamp);
  }
  drawBases(ctx, view, base, year);
  drawArrows(ctx, view, revealed, activeSet, player, stamp);
  drawMarkers(ctx, view, revealed, activeSet, player, stamp);
  drawPlaceLabels(ctx, view, base, state.zoom || 1);

  // 右栏要压一层暗角，避免标题落进红块里读不清
  const panelW = narrow ? 0 : Math.round(W * 0.30);
  const shade = ctx.createLinearGradient(W - panelW * 1.25, 0, W, 0);
  shade.addColorStop(0, "rgba(4,8,12,0)");
  shade.addColorStop(1, "rgba(4,8,12,0.78)");
  ctx.fillStyle = shade;
  ctx.fillRect(W - panelW * 1.25, 0, panelW * 1.25, H);
  drawVignette(ctx, W, H, 0.5);
  // 底部压一条暗带，字幕与图例压得上
  const band = ctx.createLinearGradient(0, H * 0.72, 0, H);
  band.addColorStop(0, "rgba(4,8,12,0)");
  band.addColorStop(1, "rgba(4,8,12,0.86)");
  ctx.fillStyle = band;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);

  drawLeftColumn(ctx, W, H, year, narrow);
  if (node) drawRightPanel(ctx, W, H, state, node, moment, t, narrow);
  drawFootNote(ctx, W, H, state, narrow);
}

/* ───────────────────────── 左栏 ───────────────────────── */

function drawLeftColumn(ctx, W, H, year, narrow) {
  const x = Math.round(W * 0.036);
  const y0 = Math.round(H * 0.115);
  const yearSize = narrow ? Math.round(W * 0.15) : Math.round(H * 0.135);
  const dateSize = Math.round(yearSize * 0.34);

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // 小标题
  ctx.font = '400 11px "Songti SC","Source Han Serif SC",serif';
  ctx.fillStyle = "rgba(186,200,212,0.55)";
  ctx.fillText("十四年抗战 · 1931—1945", x, y0 - yearSize * 0.62);

  // 大年份
  ctx.font = `700 ${yearSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = F.ink;
  ctx.shadowColor = "rgba(3,8,12,0.7)";
  ctx.shadowBlur = 16;
  const ys = String(Math.floor(year));
  ctx.fillText(ys, x, y0 + yearSize * 0.72);
  const yw = ctx.measureText(ys).width;
  ctx.shadowBlur = 0;

  // 「.08.02」跟在年份右下方
  const stamp = yearToStamp(year);
  const d = new Date(stamp);
  const md = `.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  ctx.font = `600 ${dateSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(232,238,242,0.82)";
  ctx.fillText(md, x + yw + dateSize * 0.12, y0 + yearSize * 0.72);

  // 第 N 天
  if (year >= WAR_FROM) {
    const days = Math.max(1, Math.round((year - WAR_FROM) * 365.2425));
    const dy = y0 + yearSize * 0.72 + Math.round(H * 0.052);
    ctx.font = '400 13px "Songti SC","Source Han Serif SC",serif';
    ctx.fillStyle = "rgba(214,224,232,0.78)";
    ctx.fillText(year >= DECLARE ? "全面抗战" : "九一八以来", x, dy);
    const pw = ctx.measureText(year >= DECLARE ? "全面抗战" : "九一八以来").width;
    ctx.font = '700 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = "#f2f5f7";
    ctx.fillText(`第 ${days} 天`, x + pw + 10, dy);
  }

  // 引文块：「三个月灭亡中国」——到期那天划掉
  const qy = y0 + yearSize * 0.72 + Math.round(H * 0.115);
  const over = year > DECLARE_END;
  const prog = clamp((year - DECLARE) / (DECLARE_END - DECLARE), 0, 1);
  const left = Math.max(0, Math.round((DECLARE_END - year) * 365.25));
  drawQuoteBlock(ctx, x, qy, Math.round(W * (narrow ? 0.5 : 0.215)), {
    kicker: "日本军国主义者叫嚣",
    quote: "「三个月灭亡中国」",
    struck: over,
    progress: prog,
    note: over ? "三个月期限 · 已过" : `三个月期限 · 还剩 ${left} 天`,
    size: narrow ? 16 : 19,
    alpha: year < 1932.5 ? 0.55 : 1,
  });
  ctx.restore();
}

/* ───────────────────────── 右栏 ───────────────────────── */

function drawRightPanel(ctx, W, H, state, node, moment, t, narrow) {
  if (narrow) return;
  const panelW = Math.round(W * 0.255);
  const x = W - panelW - Math.round(W * 0.038);
  const top = Math.round(H * 0.10);

  const title = moment ? moment.title : node.title || node.events[0].name;
  const ev = node.events[node.events.length - 1] || node.events[0];
  ctx.save();
  ctx.font = '700 34px "Songti SC","Source Han Serif SC",serif';
  const titleW = ctx.measureText(title).width;
  ctx.restore();
  drawPanelTitle(ctx, x, top, title, moment ? moment.sub : subLine(node), {
    size: titleW > panelW ? 26 : 32,
    subSize: 12.5,
  });
  if (moment) {
    // 特殊时刻的第三个数据点单独一行，破折号也照参考片那样压到副题下
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = '600 13.5px "Songti SC","Source Han Serif SC",serif';
    ctx.fillStyle = "rgba(236,222,206,0.86)";
    ctx.fillText(moment.kicker, x, top + 78);
    ctx.restore();
  }

  // 定位小图：整幅中国轮廓 + 战场红框（代替参考片里的史料照片）
  const insetW = panelW;
  const insetH = Math.round(panelW * 0.62);
  const insetY = top + (moment ? 100 : 84);
  drawInsetFrame(ctx, x, insetY, insetW, insetH, {
    caption: moment ? moment.note : `${ev.date.replace(/-/g, ".")}　${ev.place}`,
    draw: (c, ix, iy, iw, ih) =>
      moment && moment.kind === "massacre"
        ? drawMassacreInset(c, ix, iy, iw, ih, moment, state.stamp)
        : drawLocator(c, ix, iy, iw, ih, state.base, node),
  });

  // 沦陷城市格
  const fallen = CITIES.filter((c) => stampOf(c.fall) <= t);
  const lit = state.year >= 1945.6;
  drawCityGrid(ctx, x, insetY + insetH + 42, panelW, fallen, {
    label: lit ? "光复城市" : "沦陷城市",
    count: lit ? CITIES.length : fallen.length,
    headAccent: lit ? "#e8b45c" : "#ff6a44",
    accent: lit ? "#e8b45c" : "#ff5a3c",
    dim: lit ? "rgba(74,58,30,0.55)" : "rgba(150,42,44,0.55)",
    dimText: lit ? "rgba(226,206,164,0.78)" : "rgba(232,196,196,0.75)",
    freshFill: lit ? "rgba(120,88,30,0.85)" : "rgba(150,26,30,0.92)",
    freshStroke: lit ? "rgba(240,196,110,0.9)" : null,
    freshText: lit ? "#ffeDC2" : "#fff3ef",
    dimStroke: lit ? "rgba(150,116,52,0.45)" : "rgba(150,42,44,0.5)",
    rowH: 24,
    gap: 5,
    size: 11.5,
    maxRows: 8,
  });
}

function subLine(node) {
  const evs = node.events;
  if (evs.length === 1) return evs[0].place;
  return evs.map((e) => e.place).slice(0, 3).join(" · ");
}

/** 定位小图：本土轮廓填暗底，战场外接矩形点一个朱红方框 */
function drawLocator(ctx, x, y, w, h, base, node) {
  const [minX, minY, maxX, maxY] = base.bbox;
  const s = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.92;
  const tx = x + w / 2 - ((minX + maxX) / 2) * s;
  const ty = y + h / 2 + ((minY + maxY) / 2) * s;

  ctx.save();
  ctx.fillStyle = "rgba(16,26,34,0.95)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(150,170,186,0.20)";
  ctx.lineWidth = 0.8;
  if (base.outline) {
    ctx.beginPath();
    for (const shape of base.outline) {
      for (const ring of shape) {
        ring.forEach((pt, i) => {
          const px = tx + pt[0] * s;
          const py = ty - pt[1] * s;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      }
    }
    ctx.fillStyle = "rgba(38,50,60,0.9)";
    ctx.fill("evenodd");
    ctx.stroke();
  }
  // 战场框
  if (node && node.events.length) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const e of node.events) {
      const [px, py] = project(e.at[0], e.at[1]);
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
    const pad = 0.035;
    const bx = tx + (x0 - pad) * s;
    const by = ty - (y1 + pad) * s;
    const bw = Math.max(8, (x1 - x0 + pad * 2) * s);
    const bh = Math.max(8, (y1 - y0 + pad * 2) * s);
    ctx.strokeStyle = "rgba(255,90,44,0.95)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(255,90,44,0.14)";
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.restore();
}

/* ───────────────────────── 底图 ───────────────────────── */

function drawSea(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, "#03070a");
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
  for (const n of base.neighbors) {
    shapePath(ctx, view, n.shapes);
    ctx.fillStyle = F.neighbor;
    ctx.fill("evenodd");
  }
  for (const p of base.provinces) {
    shapePath(ctx, view, p.shapes);
    ctx.fillStyle = F.land;
    ctx.fill("evenodd");
  }
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
    ctx.globalAlpha = 0.18;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x0, y0, w, h);
    ctx.restore();
  }
}

function drawProvinceLines(ctx, view, base) {
  ctx.save();
  ctx.strokeStyle = F.border;
  ctx.lineWidth = 0.7;
  for (const p of base.provinces) {
    shapePath(ctx, view, p.shapes);
    ctx.stroke();
  }
  if (base.outline) {
    ctx.strokeStyle = F.coast;
    ctx.lineWidth = 1.2;
    shapePath(ctx, view, base.outline);
    ctx.stroke();
  }
  ctx.restore();
}

/* ───────────────────────── 占领区：一整块，发光边缘 ───────────────────────── */

function drawOccupation(ctx, view, base, control, player, stamp) {
  if (!control || !control.held || !control.held.size) return;
  if (!base.provinceByName) base.provinceByName = new Map(base.provinces.map((p) => [p.name, p]));
  const wave = control.wave || new Map();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 按阵营分组：同色的一起描，才能合成一整块而不是一堆补丁
  const groups = new Map();
  for (const [name, faction] of control.held) {
    if (faction !== "jp") continue; // 参考片只把占领区刷红，根据地交给金色括号
    const prov = base.provinceByName.get(name);
    if (!prov) continue;
    let g = groups.get(faction);
    if (!g) {
      g = { provinces: [], color: hatchColorFor(faction) };
      groups.set(faction, g);
    }
    g.provinces.push(prov);
  }
  if (!groups.size) return;

  for (const [, g] of groups) {
    // 一条路径装下所有省的环：nonzero 填充，内部共享边不出缝
    ctx.save();
    ctx.beginPath();
    for (const p of g.provinces) {
      for (const shape of p.shapes) {
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

    // 光边：用阴影当外发光，只有整块的轮廓会投影，内部缝隙不投
    const occ = g.color === F.red;
    const glow = occ ? "rgba(255,96,44,0.95)" : rgba(lighten(g.color, 0.3), 0.7);
    ctx.save();
    // 外圈：大半径的晕
    ctx.shadowColor = glow;
    ctx.shadowBlur = 38;
    ctx.fillStyle = occ ? "rgba(150,24,32,0.92)" : rgba(mixColor(g.color, "#000", 0.5), 0.75);
    ctx.fill("nonzero");
    // 内圈：小半径的亮边，把轮廓勾清楚
    ctx.shadowColor = occ ? "rgba(255,140,80,0.95)" : glow;
    ctx.shadowBlur = 9;
    ctx.fill("nonzero");
    ctx.restore();

    // 阴影只画了外圈，内芯再补一次纯色，避免中心发暗
    ctx.fillStyle = occ ? "rgba(126,18,26,0.95)" : rgba(mixColor(g.color, "#000", 0.5), 0.72);
    ctx.fill("nonzero");

    // 斜线：只铺在这块里
    ctx.save();
    ctx.clip("nonzero");
    const baseC = mixColor(g.color, "#000000", occ ? 0.34 : 0.55);
    const lineC = mixColor(g.color, "#000000", occ ? 0.06 : 0.34);
    const pattern = hatchPattern(ctx, {
      color: rgba(lineC, 0.92),
      period: 3.4,
      width: 1.15,
      angle: 45,
      bg: rgba(baseC, 0.97),
      dpr,
    });
    const [minX, minY, maxX, maxY] = base.bbox;
    ctx.fillStyle = pattern;
    ctx.fillRect(
      toScreenX(view, minX),
      toScreenY(view, maxY),
      (maxX - minX) * view.s,
      (maxY - minY) * view.s,
    );
    ctx.restore();
    ctx.restore();
  }
}

/* ───────────────────────── 城市与标签 ───────────────────────── */

function drawCities(ctx, view, base, t, year) {
  const fallen = CITIES.filter((c) => stampOf(c.fall) <= t);
  const recent = year >= 1945.55 ? [] : fallen.slice(-3);
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // 城市名互相压住比不标还难看：记下已占的矩形，撞上就翻到点的左边
  const used = [];

  for (const c of fallen) {
    const [x, y] = lonLatToScreen(view, c.at[0], c.at[1]);
    if (x < -40 || y < -20 || x > view.width + 40 || y > view.height + 20) continue;

    // 点
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240,246,250,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(6,12,16,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 城市名：默认挂在点右侧，撞了就翻到左侧，两边都撞就跳过
    ctx.font = '600 12px "Songti SC","Source Han Serif SC",serif';
    const tw = ctx.measureText(c.name).width;
    const hit = (bx, by) => used.some((r) => bx < r[0] + r[2] && bx + tw > r[0] && by < r[1] + r[3] && by + 13 > r[1]);
    let nx = x + 6;
    let align = "left";
    if (hit(nx, y - 6)) {
      nx = x - 6;
      align = "right";
      if (hit(nx - tw, y - 6)) continue;
    }
    used.push([align === "left" ? nx : nx - tw, y - 6, tw, 13]);

    ctx.textAlign = align;
    ctx.strokeStyle = "rgba(3,7,11,0.92)";
    ctx.lineWidth = 3.4;
    ctx.lineJoin = "round";
    ctx.strokeText(c.name, nx, y);
    ctx.fillStyle = "rgba(240,246,250,0.97)";
    ctx.fillText(c.name, nx, y);

    if (recent.includes(c)) {
      drawFallTag(ctx, x, y + 9, `沦陷 ${fallLabel(c)}`, { size: 9.5 });
      ctx.textAlign = "left";
    }
  }
  ctx.restore();
}

function stampOf(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/* ───────────────────────── 南京：一片光点 ───────────────────────── */

/**
 * 三十万不是一个能画成箭头的数字。
 * 参考片的做法是把整片区域点满光点，每个点代表一千人——
 * 数量本身成为图形，比任何标注都重。
 */
function drawMassacre(ctx, view, moment, player, stamp) {
  const k = player && player.mode === "node" && player.playing ? clamp(player.dwellProgress, 0, 1) : 1;
  const [cx, cy] = lonLatToScreen(view, moment.at[0], moment.at[1]);
  // 像素半径，跟画面尺寸走，不跟投影比例走
  const R = Math.min(view.freeW || view.width, view.freeH || view.height) * 0.115;
  const n = moment.dots;
  const t = (stamp || 0) / 1000;
  ctx.save();
  // 一团暗红底，让光点有地方可落
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
  g.addColorStop(0, "rgba(96,10,16,0.62)");
  g.addColorStop(0.7, "rgba(96,10,16,0.28)");
  g.addColorStop(1, "rgba(96,10,16,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
  ctx.fill();
  // 每个点带一小圈晕，点才「亮」得出来，不是一粒灰
  const dot = Math.max(0.85, R * 0.012);
  for (let i = 0; i < n; i++) {
    // 哈希定位置：每一帧都落在同一处，不会抖
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const c = Math.sin(i * 4.1414) * 9876.5432;
    const ang = (a - Math.floor(a)) * Math.PI * 2;
    // 平方根分布，点才均匀铺满圆面而不是挤在圆心
    const rad = Math.sqrt(b - Math.floor(b)) * R;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad * 0.86;
    const appear = clamp((k * 1.35 - (i / n) * 0.35) / 0.25, 0, 1);
    if (appear <= 0) continue;
    const tw = 0.72 + 0.28 * Math.sin(t * 1.6 + (c - Math.floor(c)) * 6.28);
    const al = 0.9 * appear * tw;
    const halo = ctx.createRadialGradient(px, py, 0, px, py, dot * 2.4);
    halo.addColorStop(0, `rgba(255,248,242,${al * 0.55})`);
    halo.addColorStop(1, "rgba(250,220,210,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, dot * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,244,${al})`;
    ctx.beginPath();
    ctx.arc(px, py, dot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 右栏的插图版：同样一片点，缩小了画 */
function drawMassacreInset(ctx, x, y, w, h, moment, stamp) {
  const t = (stamp || 0) / 1000;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.min(w, h) * 0.46;
  ctx.save();
  ctx.fillStyle = "rgba(10,6,8,1)";
  ctx.fillRect(x, y, w, h);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, "rgba(126,16,22,0.62)");
  g.addColorStop(1, "rgba(126,16,22,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const n = moment.dots;
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const c = Math.sin(i * 4.1414) * 9876.5432;
    const ang = (a - Math.floor(a)) * Math.PI * 2;
    const rad = Math.sqrt(b - Math.floor(b)) * R * 0.96;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad * 0.82;
    const tw = 0.62 + 0.38 * Math.sin(t * 1.6 + (c - Math.floor(c)) * 6.28);
    ctx.fillStyle = `rgba(246,238,232,${0.7 * tw})`;
    ctx.beginPath();
    ctx.arc(px, py, 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ───────────────────────── 光复：金色光点 ───────────────────────── */

/**
 * 受降之后，沦陷城市一颗颗亮起来——不画旗、不画箭头，只画光。
 * 参考片用一片金色光点收尾：十四年打下来，地图上终于没有红块了。
 */
function drawLiberation(ctx, view, base, k, stamp) {
  const t = (stamp || 0) / 1000;
  ctx.save();
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    const [x, y] = lonLatToScreen(view, c.at[0], c.at[1]);
    if (x < -40 || y < -20 || x > view.width + 40 || y > view.height + 20) continue;
    // 一座城一小簇光点，按渐入进度逐簇亮起
    // 从北往南一座座亮：先沈阳，最后独山
    const appear = clamp((k * 1.5 - (i / CITIES.length) * 0.5) / 0.35, 0, 1);
    if (appear <= 0) continue;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 * appear);
    glow.addColorStop(0, rgba(F.gold, 0.42 * appear));
    glow.addColorStop(1, rgba(F.gold, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 26 * appear, 0, Math.PI * 2);
    ctx.fill();
    // 城里撒一把细碎的光：靠哈希固定住位置，不能逐帧乱跳
    const n = 9;
    for (let j = 0; j < n; j++) {
      const a = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
      const b = Math.sin(i * 43.332 + j * 12.9898) * 24634.6345;
      const ang = (a - Math.floor(a)) * Math.PI * 2;
      const rad = (0.25 + (b - Math.floor(b)) * 0.75) * 14 * appear;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad * 0.8;
      const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + j * 1.7);
      ctx.fillStyle = rgba("#ffe6ae", 0.9 * appear * tw);
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ───────────────────────── 根据地 / 箭头 / 标记 ───────────────────────── */

function drawBases(ctx, view, base, year) {
  const list = basesAt(year);
  if (!list.length) return;
  ctx.save();
  for (const b of list) {
    const pts = b.provinces
      .map((n) => base.provinceByName.get(n))
      .filter(Boolean)
      .map((p) => p.label)
      .filter(Boolean)
      .map(([mx, my]) => [toScreenX(view, mx), toScreenY(view, my)]);
    if (!pts.length) continue;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - 12;
    const x1 = Math.max(...xs) + 12;
    const y = Math.min(...ys) - 10;
    drawBracket(ctx, x0, x1, y, { color: rgba(F.gold, 0.72), tick: 5, lineWidth: 1.4 });
    ctx.font = '600 10px "Songti SC","Source Han Serif SC",serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = rgba(F.gold, 0.85);
    ctx.fillText(b.name, (x0 + x1) / 2, y + 4);
  }
  ctx.restore();
}

function drawArrows(ctx, view, revealed, activeSet, player) {
  const active = revealed.filter((e) => activeSet.has(e.id) && e.arrows && e.arrows.length);
  if (!active.length) return;
  const span = (a) => {
    let d = 0;
    for (let i = 1; i < a.pts.length; i++) {
      const [x0, y0] = project(a.pts[i - 1][0], a.pts[i - 1][1]);
      const [x1, y1] = project(a.pts[i][0], a.pts[i][1]);
      d += Math.hypot(x1 - x0, y1 - y0);
    }
    return d;
  };
  const flat = [];
  for (const e of active) for (const a of e.arrows) flat.push({ e, a });
  flat.sort((p, q) => span(q.a) - span(p.a));
  flat.forEach((it, i) => {
    const lead = i === 0;
    drawArrowOn(ctx, view, it.a, 1, lead ? 0.95 : 0.5, rgba(F.redHi, 0.9), lead ? 1 : 0.7);
  });
}

function drawArrowOn(ctx, view, arrow, progress, alpha, tint, weight = 1) {
  const pts = arrow.pts.map((p) => lonLatToScreen(view, p[0], p[1]));
  if (pts.length < 2) return;
  let total = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total < 1) return;
  const MIN_SPAN = 54 * weight;
  if (total < MIN_SPAN) {
    const k = MIN_SPAN / total;
    const [ox, oy] = pts[0];
    for (let i = 0; i < pts.length; i++) {
      pts[i] = [ox + (pts[i][0] - ox) * k, oy + (pts[i][1] - oy) * k];
    }
    total = MIN_SPAN;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = tint;
  ctx.lineWidth = 2.2 * weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (arrow.kind === "naval") ctx.setLineDash([7, 5]);
  else if (arrow.kind === "retreat") ctx.setLineDash([3, 4]);

  // 沿累积长度截断
  const limit = total * clamp(progress, 0, 1);
  let acc = 0;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  let tip = pts[0];
  let dir = [1, 0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d <= limit) {
      ctx.lineTo(pts[i][0], pts[i][1]);
      acc += d;
      tip = pts[i];
      dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
    } else {
      const r = (limit - acc) / d;
      const px = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r;
      const py = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r;
      ctx.lineTo(px, py);
      tip = [px, py];
      dir = [px - pts[i - 1][0], py - pts[i - 1][1]];
      break;
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 箭头
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / len;
  const uy = dir[1] / len;
  const head = 9 * weight;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(tip[0] - ux * head - uy * head * 0.42, tip[1] - uy * head + ux * head * 0.42);
  ctx.lineTo(tip[0] - ux * head + uy * head * 0.42, tip[1] - uy * head - ux * head * 0.42);
  ctx.closePath();
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.restore();
}

function drawMarkers(ctx, view, revealed, activeSet, player, stamp) {
  for (const e of revealed) {
    const v = valorOf(e.id);
    if (!v) continue;
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (x < -30 || y < -30 || x > view.width + 30 || y > view.height + 30) continue;
    const hot = activeSet.has(e.id);
    const fade = player.freshness(e.id, stamp, 3200);
    const alpha = hot ? 1 : 0.55;
    const size = hot ? 11 : 8;

    if (v.kind === "victory") {
      const s = size * (0.85 + 0.4 * pulse(1 - fade));
      drawStar(ctx, x, y - 13, s, { color: F.gold, alpha });
    } else if (v.kind === "martyr") {
      drawFlame(ctx, x, y - 15, size * 1.5, {
        color: F.flame,
        alpha,
        t: (stamp / 1000 + x * 0.01) % 1,
      });
      if (hot && v.who) {
        ctx.save();
        ctx.font = '600 10.5px "Songti SC","Source Han Serif SC",serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeStyle = "rgba(5,12,17,0.85)";
        ctx.lineWidth = 3;
        ctx.fillStyle = rgba(F.flame, 0.94);
        ctx.strokeText(v.who, x, y - 27);
        ctx.fillText(v.who, x, y - 27);
        ctx.restore();
      }
    }
  }
}

/* ───────────────────────── 地名 / 图例 / 脚注 ───────────────────────── */

function drawPlaceLabels(ctx, view, base, zoom) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const px2 = view.s * view.s;
  for (const p of base.provinces) {
    if (!p.label || !p.area) continue;
    const area = p.area * px2;
    if (area < 9000) continue;
    const x = toScreenX(view, p.label[0]);
    const y = toScreenY(view, p.label[1]);
    if (x < -40 || y < -20 || x > view.width + 40 || y > view.height + 20) continue;
    ctx.font = `${area > 60000 ? 600 : 400} ${area > 60000 ? 12.5 : 11}px "Songti SC","Source Han Serif SC",serif`;
    ctx.strokeStyle = "rgba(4,9,13,0.72)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(p.name, x, y);
    ctx.fillStyle = area > 60000 ? F.labelStrong : F.label;
    ctx.fillText(p.name, x, y);
  }
  ctx.restore();
}

function drawFootNote(ctx, W, H, state, narrow) {
  const x = Math.round(W * 0.036);
  const y = Math.round(H * (narrow ? 0.90 : 0.935));
  drawFilmLegend(ctx, x, y, [
    { kind: "hatch", color: rgba(F.red, 0.95), label: "日军占领区（示意）" },
    { kind: "star", color: F.gold, label: "胜利 · 抗日根据地" },
    { kind: "flame", color: F.flame, label: "殉国" },
  ], { size: narrow ? 9 : 10, gap: narrow ? 12 : 16, alpha: 0.78 });

  const cap = state.caption;
  if (cap) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = '400 12.5px "Songti SC","Source Han Serif SC",serif';
    ctx.fillStyle = "rgba(222,230,238,0.80)";
    ctx.shadowColor = "rgba(3,8,12,0.9)";
    ctx.shadowBlur = 10;
    ctx.fillText(cap, Math.round(W * 0.42), Math.round(H * 0.845));
    ctx.restore();
  }
  drawSource(ctx, W, H, "底图：现代省界简化 · 地形：AWS Terrain Tiles", {
    size: 9,
    pad: Math.round(W * 0.036),
  });
}

/* ───────────────────────── 解说词 ───────────────────────── */

export function captionFor(node) {
  if (!node) return "";
  const first = node.events[0];
  if (!first) return node.title;
  if (node.events.length === 1) return `${first.place}｜${first.result}`;
  return `${node.title}｜${node.events.map((e) => e.place).join("、")}`;
}
