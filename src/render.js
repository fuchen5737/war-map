// 地图渲染：全部用 Canvas 2D 手绘，不依赖任何地图瓦片或第三方库。
// 一个 draw(view, state) 负责整帧；调用方只管在 rAF 里喂 state。

import { lonLatToScreen, toScreenX, toScreenY } from "./geo.js";
import { unitOf, FACTIONS } from "../data/units.js";

// 明度阶梯：海最暗 → 邻国次之 → 中国本土最亮。
// 三层之间必须一眼分得开，否则邻国陆地会被读成海里的窟窿。
const C = {
  sea: "#0d2230",
  seaDeep: "#040d14",
  land: "#5b6a52",
  landEdge: "rgba(198,222,224,0.20)",
  neighbor: "#243740",
  neighborEdge: "rgba(160,190,204,0.24)",
  border: "rgba(198,224,214,0.26)",
  coast: "rgba(228,168,66,0.62)",
  river: "#3f8aa2",
  graticule: "rgba(126,168,190,0.11)",
  label: "rgba(196,218,224,0.66)",
  labelStrong: "rgba(206,226,236,0.82)",
  ink: "#eef4f8",
  accent: "#e0a03a",
  accentSoft: "rgba(224,160,58,0.22)",
  red: "#c9503c",
  redSoft: "rgba(201,80,60,0.2)",
  quiet: "rgba(120,150,168,0.30)",
};

const ERA_TINT = {
  opium: "56,96,140",
  taiping: "150,72,60",
  arrow: "92,80,140",
  revolt: "120,96,60",
  french: "48,116,116",
  jiawu: "150,110,50",
  boxer: "140,70,90",
  russo: "70,100,120",
  xinhai: "120,120,60",
  warlord: "110,84,110",
  soviet: "150,60,60",
  anti: "176,58,44",
  liberation: "188,120,48",
};

function ringPath(ctx, view, ring) {
  ctx.beginPath();
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = ring[i];
    const sx = toScreenX(view, x);
    const sy = toScreenY(view, y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

function shapePaths(ctx, view, shapes, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  for (const shape of shapes) for (const ring of shape) {
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = ring[i];
      const sx = toScreenX(view, x);
      const sy = toScreenY(view, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill("evenodd");
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * 控制区：按省翻色。
 *
 * 只在「控制真的变了」的那些省上色，政府方面（gov）就是地形底色、不另画——
 * 这样第一帧双方都在图上，守方不会从空白里冒出来。
 * 翻色用进攻方的纯色，不做半透明叠半透明（两个半透明叠出的是浑浊的第三色）。
 * 刚翻过来的省多给一层亮边，随后褪到常态，读起来才像「这一下是刚打下来的」。
 */
function drawControl(ctx, view, base, control) {
  if (!control || !control.held || !control.held.size) return;
  if (!base.provinceByName) {
    base.provinceByName = new Map(base.provinces.map((p) => [p.name, p]));
  }
  const wave = control.wave || new Map();

  // 画一块省面：fill 是阵营纯色，翻色途中更实一点并带一圈光，翻完落回常态浓度。
  const paint = (prov, color, a) => {
    const flipping = a < 1;
    ctx.globalAlpha = a * (flipping ? 0.66 : 0.46);
    shapePaths(ctx, view, prov.shapes, color, null, 0);
    // 再罩一层很淡的地形，留一点起伏，不然整块像贴纸
    overlayTerrain(ctx, view, base, prov.shapes, 0.22);
    ctx.globalAlpha = 1;
    if (flipping) {
      ctx.save();
      ctx.globalAlpha = (1 - a) * 0.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 13 * (1 - a);
      shapePaths(ctx, view, prov.shapes, null, color, 2.2);
      ctx.restore();
    } else {
      shapePaths(ctx, view, prov.shapes, null, color, 1.1);
    }
  };

  ctx.save();

  // 零、政府方面的底色：整幅本土先压一层很淡的暖色。
  // 双方第一帧都该有颜色——政府方面若只是地形原色，读起来像「无人区」，
  // 而不是「此刻归政府」。这一层很淡，只负责把「有主」讲清楚。
  const govColor = FACTIONS.gov ? FACTIONS.gov.color : "#dcb45e";
  ctx.globalAlpha = 0.07;
  for (const p of base.provinces) shapePaths(ctx, view, p.shapes, govColor, null, 0);
  ctx.globalAlpha = 1;

  // 一、易手前垫底：另一方的纯色先顶住，新颜色才是在旧颜色上盖过去，
  // 而不是从地形底色里淡出来（半透明叠半透明会得浑浊的第三色）。
  for (const [name, w] of wave) {
    if (w.a >= 1 || w.from === "gov" || w.to === "gov") continue;
    const prov = base.provinceByName.get(name);
    if (!prov) continue;
    paint(prov, FACTIONS[w.from] ? FACTIONS[w.from].color : "#8a9aa4", 1);
  }

  // 二、被谁占着：控制态里非政府方面的那几省，刚易手的按进度渐入。
  for (const [name, faction] of control.held) {
    if (faction === "gov") continue;
    const prov = base.provinceByName.get(name);
    if (!prov) continue;
    const w = wave.get(name);
    const a = w ? w.a : 1; // 0 还没轮到它，1 已经翻完
    if (a <= 0) continue;
    paint(prov, FACTIONS[faction] ? FACTIONS[faction].color : "#8a9aa4", a);
  }

  // 三、交回政府方面的省：旧颜色淡出，不要瞬间消失。
  for (const [name, w] of wave) {
    if (w.a >= 1 || w.to !== "gov" || w.from === "gov") continue;
    const prov = base.provinceByName.get(name);
    if (!prov) continue;
    ctx.globalAlpha = (1 - w.a) * 0.46;
    shapePaths(ctx, view, prov.shapes, FACTIONS[w.from] ? FACTIONS[w.from].color : "#8a9aa4", null, 0);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawGraticule(ctx, view) {
  ctx.save();
  ctx.strokeStyle = C.graticule;
  ctx.lineWidth = 1;
  for (let lon = 70; lon <= 150; lon += 10) {
    ctx.beginPath();
    for (let lat = -5; lat <= 55; lat += 2) {
      const [x, y] = lonLatToScreen(view, lon, lat);
      if (lat === -5) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let lat = 0; lat <= 50; lat += 10) {
    ctx.beginPath();
    for (let lon = 70; lon <= 150; lon += 2) {
      const [x, y] = lonLatToScreen(view, lon, lat);
      if (lon === 70) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 把离线烘好的地形图贴到给定的多边形路径里。
 * 图是按整幅 bbox 对齐的（tools/bake-terrain.py 与 geo.js 用同一套投影），
 * 所以只要把 bbox 四角映射到屏幕矩形，再裁到路径内即可。
 * 图本身已经是分层设色 + 晕渲，正常混合即可；alpha 用来让邻国退后一层。
 */
function overlayTerrain(ctx, view, base, shapes, alpha, wash) {
  const img = base.terrain;
  if (!img || !img.complete || !img.naturalWidth) return;
  const [minX, minY, maxX, maxY] = base.bbox;
  const x0 = toScreenX(view, minX);
  const y0 = toScreenY(view, maxY);
  const w = (maxX - minX) * view.s;
  const h = (maxY - minY) * view.s;
  if (w <= 0 || h <= 0) return;

  ctx.save();
  ctx.beginPath();
  for (const shape of shapes) for (const ring of shape) {
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = ring[i];
      const sx = toScreenX(view, x);
      const sy = toScreenY(view, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }
  ctx.clip("evenodd");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x0, y0, w, h);
  if (wash) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, view.width, view.height);
  }
  ctx.restore();
}

function drawBasemap(ctx, view, base, control, opts = {}) {
  const { width, height } = view;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, C.seaDeep);
  g.addColorStop(1, C.sea);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  drawGraticule(ctx, view);

  // 邻国：先铺一层压暗的地形，让境外也有地貌，但明显退到本土之后
  for (const n of base.neighbors) {
    shapePaths(ctx, view, n.shapes, C.neighbor, null, 0);
  }
  overlayTerrain(ctx, view, base, base.neighbors.flatMap((n) => n.shapes), 0.5, "rgba(9,22,31,0.52)");
  for (const n of base.neighbors) {
    shapePaths(ctx, view, n.shapes, null, C.neighborEdge, 1);
  }

  // 本土：地形自己就是底色，只在图片没加载出来时退回纯色
  for (const p of base.provinces) {
    shapePaths(ctx, view, p.shapes, C.land, null, 0);
  }
  overlayTerrain(ctx, view, base, base.provinces.flatMap((p) => p.shapes), 1);
  // 控制区压在省界之下：色块是「谁占着」，界线是「省在哪」，两层不能互相盖住
  // 影院模式不用实色块（那里画斜线占领区），用 opts.skipControl 关掉这一层
  if (!opts.skipControl) drawControl(ctx, view, base, control);
  for (const p of base.provinces) {
    shapePaths(ctx, view, p.shapes, null, C.border, 1);
  }

  // 国界单独描一道暖色，让「中国」从邻国里立起来
  if (base.outline) {
    ctx.save();
    ctx.shadowColor = "rgba(224,160,58,0.35)";
    ctx.shadowBlur = 8;
    shapePaths(ctx, view, base.outline, null, C.coast, 1.6);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = C.river;
  ctx.lineWidth = 1.3;
  ctx.lineJoin = "round";
  for (const r of base.rivers) {
    ctx.beginPath();
    r.path.forEach(([x, y], i) => {
      const sx = toScreenX(view, x);
      const sy = toScreenY(view, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlaceLabels(ctx, view, base, zoom, avoid, dots) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hit = (list, x, y, hw, hh) => !!list && list.some(([ax, ay]) => Math.abs(ax - x) < hw && Math.abs(ay - y) < hh);
  // 只有高亮那个大圆环会让地名挪开；普通小点靠描边压住，不让字忽隐忽现
  const clear = (x, y, name) => {
    const hw = ctx.measureText(name).width / 2 + 11;
    // 只画完整落得进空闲区的字——半截字比没有字更难看
    if (Number.isFinite(view.freeLeft)) {
      if (x - hw < view.freeLeft + 2) return false;
      if (x + hw > view.freeLeft + view.freeW - 2) return false;
      if (y < view.freeTop + 10 || y > view.freeTop + view.freeH - 10) return false;
    }
    return !hit(avoid, x, y, hw, 14);
  };
  // 描一层底色再写字，压在圆点或国界上也读得出来
  const put = (name, x, y) => {
    ctx.strokeStyle = "rgba(7,20,28,0.62)";
    ctx.lineWidth = 2.8;
    ctx.lineJoin = "round";
    ctx.strokeText(name, x, y);
    ctx.fillText(name, x, y);
  };

  // 邻国：只要放大不太狠就标，让「边境之外是什么」一眼可读
  if (zoom < 1.8) {
    ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(150,180,196,0.42)";
    for (const n of base.neighbors) {
      if (!n.label) continue;
      const x = toScreenX(view, n.label[0]);
      const y = toScreenY(view, n.label[1]);
      if (x < -40 || y < -20 || x > view.width + 40 || y > view.height + 20) continue;
      if (!clear(x, y, n.name)) continue;
      put(n.name, x, y);
    }
  }

  // 省份：按「它在这块画布上占多少像素」决定标不标，而不是按点数。
  // 小省（上海、天津、香港）默认让位，放大后才出现。
  const px2 = view.s * view.s;
  for (const p of base.provinces) {
    if (!p.label || !p.area) continue;
    const screenArea = p.area * px2;
    if (screenArea < 2200) continue;
    const x = toScreenX(view, p.label[0]);
    const y = toScreenY(view, p.label[1]);
    if (x < -30 || y < -14 || x > view.width + 30 || y > view.height + 14) continue;
    if (!clear(x, y, p.name)) continue;
    const big = screenArea > 14000;
    ctx.font = `${big ? 600 : 500} ${big ? 12 : 11}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = big ? C.labelStrong : C.label;
    put(p.name, x, y);
  }
  ctx.restore();
}

/** 箭头：曲线 + 箭头头部，按 progress 逐段画出 */
export function drawArrow(ctx, view, arrow, progress, alpha, tint, weight = 1) {
  const pts = arrow.pts.map(([lon, lat]) => lonLatToScreen(view, lon, lat));
  if (pts.length < 2 || progress <= 0) return;

  // 累积长度，按 progress 截断
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total < 1) return;

  // 大沽口到天津这类近距机动，投影到屏幕上只有七八像素——照实画等于没画。
  // 方向是真的，长度按最小可读距离拉伸（这类「短箭头」在地图学里本来就靠符号化处理）。
  const MIN_SPAN = 46 * weight;
  if (total < MIN_SPAN) {
    const k = MIN_SPAN / total;
    const [ox, oy] = pts[0];
    for (let i = 0; i < pts.length; i++) {
      pts[i] = [ox + (pts[i][0] - ox) * k, oy + (pts[i][1] - oy) * k];
    }
    for (let i = 0; i < segs.length; i++) segs[i] *= k;
    total = MIN_SPAN;
  }
  const want = total * progress;

  const path = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = segs[i - 1];
    if (acc + d <= want) {
      path.push(pts[i]);
      acc += d;
    } else {
      const t = (want - acc) / d;
      path.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      break;
    }
  }
  if (path.length < 2) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (arrow.kind === "naval") ctx.setLineDash([7, 5]);
  if (arrow.kind === "retreat") ctx.setLineDash([3, 4]);

  // 先描一道暗底：箭头压在敌我同色的省面上也得看得出来
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(6,14,20,0.85)";
  ctx.lineWidth = (arrow.kind === "naval" ? 2 : 2.4) * weight + 2.4;
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    if (i < path.length - 1) {
      const mx = (path[i][0] + path[i + 1][0]) / 2;
      const my = (path[i][1] + path[i + 1][1]) / 2;
      ctx.quadraticCurveTo(path[i][0], path[i][1], mx, my);
    } else {
      ctx.lineTo(path[i][0], path[i][1]);
    }
  }
  ctx.stroke();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = tint;
  ctx.lineWidth = (arrow.kind === "naval" ? 2 : 2.4) * weight;
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    // 轻微二次贝塞尔，让折线不至于像矢量图
    if (i < path.length - 1) {
      const mx = (path[i][0] + path[i + 1][0]) / 2;
      const my = (path[i][1] + path[i + 1][1]) / 2;
      ctx.quadraticCurveTo(path[i][0], path[i][1], mx, my);
    } else {
      ctx.lineTo(path[i][0], path[i][1]);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 箭头头部
  const last = path[path.length - 1];
  const prev = path[path.length - 2];
  const ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const head = (arrow.kind === "naval" ? 7 : 9) * weight;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(last[0], last[1]);
  ctx.lineTo(last[0] - head * Math.cos(ang - 0.42), last[1] - head * Math.sin(ang - 0.42));
  ctx.lineTo(last[0] - head * 0.62 * Math.cos(ang), last[1] - head * 0.62 * Math.sin(ang));
  ctx.lineTo(last[0] - head * Math.cos(ang + 0.42), last[1] - head * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();

  if (arrow.label && progress > 0.55 && weight >= 1) {
    ctx.globalAlpha = alpha * Math.min(1, (progress - 0.55) / 0.3);
    ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = tint;
    ctx.fillText(arrow.label, last[0], last[1] - 12);
  }
  ctx.restore();
}

/** 尚未发生的战事：一层几乎看不见的底噪，让任何年份的地图都不至于空白 */
function drawUnborn(ctx, view, all, revealedCount, zoom) {
  if (revealedCount >= all.length) return;
  ctx.save();
  ctx.fillStyle = "rgba(150,182,198,0.17)";
  for (let i = revealedCount; i < all.length; i++) {
    const e = all[i];
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (x < -20 || y < -20 || x > view.width + 20 || y > view.height + 20) continue;
    ctx.beginPath();
    ctx.arc(x, y, e.scale === 3 ? 2 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 兵种符号：一个小方框里画不同记号，颜色由阵营决定。
 * 尺寸随 scale 与 zoom 缩放；所有形状都按「以原点为中心、边长 2r」绘制，
 * 调用方先把坐标平移到点位。
 */
function unitGlyph(ctx, arm, r, color, weight) {
  ctx.lineWidth = weight;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();

  if (arm === "inf") {
    // 步兵：方框内打叉
    const s = r * 0.86;
    ctx.rect(-s, -s * 0.74, s * 2, s * 1.48);
    ctx.moveTo(-s, -s * 0.74);
    ctx.lineTo(s, s * 0.74);
    ctx.moveTo(s, -s * 0.74);
    ctx.lineTo(-s, s * 0.74);
    ctx.stroke();
    return;
  }
  if (arm === "cav") {
    // 骑兵：方框内一道斜线
    const s = r * 0.86;
    ctx.rect(-s, -s * 0.74, s * 2, s * 1.48);
    ctx.moveTo(-s, -s * 0.74);
    ctx.lineTo(s, s * 0.74);
    ctx.stroke();
    return;
  }
  if (arm === "nav") {
    // 舰队：船体（下窄上宽的梯形）+ 桅杆
    const s = r * 0.95;
    ctx.moveTo(-s, s * 0.18);
    ctx.lineTo(s, s * 0.18);
    ctx.lineTo(s * 0.5, s * 0.86);
    ctx.lineTo(-s * 0.5, s * 0.86);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.18);
    ctx.lineTo(0, -s * 0.9);
    ctx.stroke();
    return;
  }
  if (arm === "fort") {
    // 炮台：五边形棱堡 + 中心点
    const s = r * 0.95;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const px = Math.cos(a) * s;
      const py = Math.sin(a) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // 政治事件：空心圆 + 中心点，不当成部队
  const s = r * 0.9;
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** 战事点位：兵种符号 + 阵营色；scale 决定大小，刚点亮时有涟漪 */
function drawEventDots(ctx, view, list, player, stamp, activeSet, zoom, labelId) {
  const labels = [];
  ctx.save();
  for (const e of list) {
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (x < -60 || y < -60 || x > view.width + 60 || y > view.height + 60) continue;
    const fresh = player.freshness(e.id, stamp, 1600);
    const isActive = activeSet.has(e.id);
    const unit = unitOf(e.id);
    const tint = ERA_TINT[e.era] || "150,160,170";
    const color = unit ? unit.color : `rgb(${tint})`;
    const baseR = (e.scale === 3 ? 7 : e.scale === 2 ? 5.6 : 4.4) * (zoom > 1.4 ? 1.1 : 1);

    if (fresh < 1) {
      // 刚点亮：一圈扩散的涟漪
      const k = 1 - fresh;
      ctx.beginPath();
      ctx.arc(x, y, baseR + 22 * k, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${tint},${0.5 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (isActive) {
      ctx.beginPath();
      ctx.arc(x, y, baseR + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224,160,58,0.9)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    const grow = fresh < 1 ? 0.6 + 0.4 * fresh : 1;
    ctx.save();
    ctx.translate(x, y);
    // 深色描边打底：符号压在浅色高原或深色海面上都得读得出来
    ctx.save();
    ctx.globalAlpha = 0.72;
    unitGlyph(ctx, unit ? unit.arm : "pol", baseR * grow + 1.6, "rgba(8,16,22,0.9)", 3.4);
    ctx.restore();
    // 高亮时提亮阵营色而不是换成琥珀——否则一点亮就丢了「这是谁」
    unitGlyph(ctx, unit ? unit.arm : "pol", baseR * grow, isActive ? boost(color) : color, e.scale === 3 ? 1.9 : 1.5);
    ctx.restore();

    // 名字放进第二趟画：先占位的先赢，压不到别人身上
    if (e.scale === 3) labels.push({ e, x, y, r: baseR, hot: isActive && e.id === labelId });
  }

  // 高亮的那条优先，然后按 zoom 决定其余大事件要不要挂名字
  labels.sort((a, b) => Number(b.hot) - Number(a.hot));
  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const placed = [];
  for (const it of labels) {
    if (!it.hot && zoom <= 1.5) continue;
    const w = ctx.measureText(it.e.name).width + 8;
    const lx = it.x + it.r + 6;
    const ly = it.y;
    const box = [lx, ly - 8, lx + w, ly + 8];
    if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    placed.push(box);
    ctx.strokeStyle = "rgba(7,20,28,0.72)";
    ctx.lineWidth = 2.8;
    ctx.lineJoin = "round";
    ctx.strokeText(it.e.name, lx, ly);
    ctx.fillStyle = it.hot ? C.ink : "rgba(214,228,236,0.78)";
    ctx.fillText(it.e.name, lx, ly);
  }
  ctx.restore();
}

/** 提亮一个 #rrggbb 颜色：往白里掺 30%，用于高亮态 */
/** 把 `#d24a3a` 这样的阵营色转成带透明度的 rgba，供箭头随阵营上色 */
function rgbaOf(color, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function boost(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (v) => Math.round(v + (255 - v) * 0.3);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

/** 正在播放的那一年、那个方向：一条从上一个战事连到当前战事的「锋线」 */
function drawFront(ctx, view, list, year, eras) {
  if (list.length < 2) return;
  const era = eras.find((e) => year >= e.from && year <= e.to);
  if (!era) return;
  const recent = list.filter((e) => e.era === era.id).slice(-14);
  if (recent.length < 3) return;
  ctx.save();
  ctx.strokeStyle = `rgba(${ERA_TINT[era.id] || "150,160,170"},0.22)`;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  recent.forEach((e, i) => {
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

/** 把绘制裁到面板围出来的空闲区：地图可以铺到半透明面板底下，文字和符号不行 */
export function clipFree(ctx, view) {
  if (!Number.isFinite(view.freeLeft) || !Number.isFinite(view.freeTop)) return;
  ctx.beginPath();
  ctx.rect(view.freeLeft, view.freeTop, view.freeW, view.freeH);
  ctx.clip();
}

/**
 * 图例：兵种形状 + 阵营色，钉在空闲区左下角。
 * 用和地图上完全相同的 unitGlyph 画，图例和实际符号不会走样。
 */
function drawLegend(ctx, view) {
  if (!Number.isFinite(view.freeLeft) || view.freeW < 520 || view.freeH < 360) return;
  const arms = [["inf", "步兵"], ["cav", "骑兵"], ["nav", "舰队"], ["fort", "炮台"], ["pol", "事件"]];
  const factions = [["gov", "中国"], ["rev", "革命"], ["jp", "日本"], ["west", "列强"], ["ru", "俄国"]];
  const cellW = 52;
  const cellH = 26;
  const w = arms.length * cellW + 16;
  const h = cellH * 2 + 12;
  // 钉在右下角：左下角是档案卡的位置，图例别被它盖住
  const x0 = view.freeLeft + view.freeW - 16 - w;
  const y0 = view.freeTop + view.freeH - 16 - h;

  ctx.save();
  ctx.fillStyle = "rgba(8,15,21,0.86)";
  ctx.strokeStyle = "rgba(150,182,198,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, 3);
  ctx.fill();
  ctx.stroke();

  ctx.font = "500 10px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // 兵种：画的是地图上那个符号本身
  arms.forEach(([arm, name], i) => {
    const cx = x0 + 8 + i * cellW + 7;
    const cy = y0 + 6 + cellH * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    unitGlyph(ctx, arm, 4.6, "rgba(196,218,224,0.72)", 1.3);
    ctx.restore();
    ctx.fillStyle = "rgba(196,218,224,0.6)";
    ctx.fillText(name, cx + 11, cy);
  });

  // 阵营：方块色 + 名字
  factions.forEach(([f, name], i) => {
    const cx = x0 + 8 + i * cellW;
    const cy = y0 + 6 + cellH * 1.5;
    ctx.fillStyle = FACTIONS[f].color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(cx + 1, cy - 4, 8, 8, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(196,218,224,0.6)";
    ctx.fillText(name, cx + 13, cy);
  });
  ctx.restore();
}

export function drawBasemapExported(ctx, view, base, control, opts) {
  return drawBasemap(ctx, view, base, control, opts);
}

export function draw(ctx, view, state) {
  const { base, events, eras, year, player, stamp, zoom = 1 } = state;
  const activeSet = state.activeIds instanceof Set ? state.activeIds : new Set(state.activeIds || []);
  const revealed = state.revealed;
  ctx.clearRect(0, 0, view.width, view.height);
  drawBasemap(ctx, view, base, state.control);

  // 以下全部是「信息层」，一律裁到空闲区，免得字压在战事流面板上
  ctx.save();
  clipFree(ctx, view);

  // 高亮点附近的地名让位——「朝鲜」压在鸭绿江的圆点上就没法读了
  const avoid = revealed
    .filter((e) => activeSet.has(e.id))
    .map((e) => lonLatToScreen(view, e.at[0], e.at[1]));
  const dots = revealed.map((e) => lonLatToScreen(view, e.at[0], e.at[1]));
  drawPlaceLabels(ctx, view, base, zoom, avoid, dots);

  drawUnborn(ctx, view, events, revealed.length, zoom);
  drawFront(ctx, view, revealed, year, eras);

  // 同一个节点里的几条战事用一根细虚线串起来——它们是一件事情的几处
  if (activeSet.size > 1) {
    const group = revealed.filter((e) => activeSet.has(e.id));
    if (group.length > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(224,160,58,0.34)";
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 4]);
      ctx.beginPath();
      group.forEach((e, i) => {
        const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  // 高亮一组点时只给最后一条（节点的落点）挂名字
  let labelId = null;
  for (const e of revealed) if (activeSet.has(e.id)) labelId = e.id;

  // ── 箭头瘦身 ──
  // 只画「此刻正在发生」的机动：当前节点上的箭头，加一条上一节点的残影。
  // 满屏箭头读起来像所有机动的示意图，等于什么也没说（这也是同类作品最常见的败笔）。
  const activeArrows = revealed.filter((e) => activeSet.has(e.id) && e.arrows && e.arrows.length);
  const residArrows = revealed.filter((e) => !activeSet.has(e.id) && e.arrows && e.arrows.length).slice(-1);

  // 上一节点的箭头只留一点痕迹，指个方向就走
  const arrowColor = (e) => {
    const u = unitOf(e.id);
    return u ? u.color : `rgb(${ERA_TINT[e.era] || "150,160,170"})`;
  };
  for (const e of residArrows) {
    for (const a of e.arrows) {
      drawArrow(ctx, view, a, 1, 0.2, arrowColor(e));
    }
  }

  // 当前节点里最长的那条「推进」当主箭头领跑：先它一条，其余跟在后头压细
  const flat = [];
  for (const e of activeArrows) for (const a of e.arrows) flat.push({ e, a });
  const span = (a) => {
    const p = a.pts.map(([lon, lat]) => lonLatToScreen(view, lon, lat));
    let t = 0;
    for (let i = 1; i < p.length; i++) t += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return t;
  };
  let lead = null;
  for (const it of flat) {
    if (it.a.kind !== "advance") continue;
    if (!lead || span(it.a) > span(lead.a)) lead = it;
  }
  if (!lead && flat.length) lead = flat[0];

  for (const it of flat) {
    const isLead = it === lead;
    const fade = player.freshness(it.e.id, stamp, 2600);
    // 箭头先到、目标后亮：让两者不同时发生，因果才读得出来
    const grow = Math.min(1, fade / 0.6);
    drawArrow(ctx, view, it.a, grow, isLead ? 0.95 : 0.42, arrowColor(it.e), isLead ? 1 : 0.62);
  }

  drawEventDots(ctx, view, revealed, player, stamp, activeSet, zoom, labelId);
  drawLegend(ctx, view);
  ctx.restore();
}

export { ERA_TINT, C as COLORS };
