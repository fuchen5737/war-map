// 地图渲染：全部用 Canvas 2D 手绘，不依赖任何地图瓦片或第三方库。
// 一个 draw(view, state) 负责整帧；调用方只管在 rAF 里喂 state。

import { createView, lonLatToScreen, toScreenX, toScreenY, screenToLonLat } from "./geo.js";

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

/** 势力范围：按时期给几个大区域刷一层极淡的色，靠颜色而不是文字说话 */
const SPHERES = [
  {
    era: "opium", tint: "56,96,140",
    zones: [
      { name: "英军活动", bbox: [110, 20, 123, 33] },
      { name: "英军北上", bbox: [119, 33, 123, 41] },
    ],
  },
  {
    era: "taiping", tint: "150,72,60",
    zones: [
      { name: "太平天国", bbox: [110, 24, 122, 33] },
      { name: "清军", bbox: [108, 28, 118, 36] },
    ],
  },
  {
    era: "jiawu", tint: "150,110,50",
    zones: [
      { name: "日军", bbox: [121, 37, 127, 42] },
      { name: "北洋水师", bbox: [120, 36, 124, 40] },
    ],
  },
  {
    era: "anti", tint: "176,58,44",
    zones: [
      { name: "日军占领", bbox: [108, 30, 122, 42] },
      { name: "日军占领", bbox: [113, 22, 122, 31] },
      { name: "日军占领", bbox: [125, 40, 132, 48] },
    ],
  },
];

function drawSpheres(ctx, view, year, eras) {
  for (const sp of SPHERES) {
    const era = eras.find((e) => e.id === sp.era);
    if (!era) continue;
    if (year < era.from - 0.5 || year > era.to + 0.5) continue;
    const fade = Math.min(1, Math.min(year - (era.from - 0.5), era.to + 0.5 - year) / 0.6);
    if (fade <= 0) continue;
    ctx.save();
    for (const z of sp.zones) {
      const [lon0, lat0, lon1, lat1] = z.bbox;
      const pts = [
        lonLatToScreen(view, lon0, lat0),
        lonLatToScreen(view, lon1, lat0),
        lonLatToScreen(view, lon1, lat1),
        lonLatToScreen(view, lon0, lat1),
      ];
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(0, Math.min(...pts.map((p) => p[1])), 0, Math.max(...pts.map((p) => p[1])));
      g.addColorStop(0, `rgba(${sp.tint},${0.1 * fade})`);
      g.addColorStop(1, `rgba(${sp.tint},${0.03 * fade})`);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  }
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

function drawBasemap(ctx, view, base) {
  const { width, height } = view;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, C.seaDeep);
  g.addColorStop(1, C.sea);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  drawGraticule(ctx, view);

  for (const n of base.neighbors) {
    shapePaths(ctx, view, n.shapes, C.neighbor, C.neighborEdge, 1);
  }
  for (const p of base.provinces) {
    shapePaths(ctx, view, p.shapes, C.land, C.border, 1);
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

function drawPlaceLabels(ctx, view, base, zoom, avoid, dots) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hit = (list, x, y, hw, hh) => !!list && list.some(([ax, ay]) => Math.abs(ax - x) < hw && Math.abs(ay - y) < hh);
  // 只有高亮那个大圆环会让地名挪开；普通小点靠描边压住，不让字忽隐忽现
  const clear = (x, y, name) => !hit(avoid, x, y, ctx.measureText(name).width / 2 + 11, 14);
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
function drawArrow(ctx, view, arrow, progress, alpha, tint) {
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
  ctx.strokeStyle = tint;
  ctx.lineWidth = arrow.kind === "naval" ? 2 : 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (arrow.kind === "naval") ctx.setLineDash([7, 5]);
  if (arrow.kind === "retreat") ctx.setLineDash([3, 4]);

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
  const head = arrow.kind === "naval" ? 7 : 9;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(last[0], last[1]);
  ctx.lineTo(last[0] - head * Math.cos(ang - 0.42), last[1] - head * Math.sin(ang - 0.42));
  ctx.lineTo(last[0] - head * 0.62 * Math.cos(ang), last[1] - head * 0.62 * Math.sin(ang));
  ctx.lineTo(last[0] - head * Math.cos(ang + 0.42), last[1] - head * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();

  if (arrow.label && progress > 0.55) {
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

/** 战事点位：圆点 + 呼吸光环；scale 决定大小 */
function drawEventDots(ctx, view, list, player, stamp, activeSet, zoom, labelId) {
  ctx.save();
  for (const e of list) {
    const [x, y] = lonLatToScreen(view, e.at[0], e.at[1]);
    if (x < -60 || y < -60 || x > view.width + 60 || y > view.height + 60) continue;
    const fresh = player.freshness(e.id, stamp, 1600);
    const isActive = activeSet.has(e.id);
    const baseR = (e.scale === 3 ? 5.4 : e.scale === 2 ? 4 : 3) * (zoom > 1.4 ? 1.15 : 1);
    const tint = ERA_TINT[e.era] || "150,160,170";

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
      ctx.arc(x, y, baseR + 9, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224,160,58,0.9)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, baseR * (fresh < 1 ? 0.6 + 0.4 * fresh : 1), 0, Math.PI * 2);
    ctx.fillStyle = isActive ? C.accent : `rgb(${tint})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(10,18,24,0.85)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 一个节点里可能并排两三条战事，只给其中一条挂名字；否则两行字会叠在一起看不清
    const showLabel = e.scale === 3 && (isActive ? e.id === labelId : zoom > 1.5);
    if (showLabel) {
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isActive ? C.ink : "rgba(214,228,236,0.72)";
      ctx.fillText(e.name, x + baseR + 6, y);
    }
  }
  ctx.restore();
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

export function draw(ctx, view, state) {
  const { base, events, eras, year, player, stamp, zoom = 1 } = state;
  const activeSet = state.activeIds instanceof Set ? state.activeIds : new Set(state.activeIds || []);
  const revealed = state.revealed;
  // 高亮点附近的地名让位——「朝鲜」压在鸭绿江的圆点上就没法读了
  const avoid = revealed
    .filter((e) => activeSet.has(e.id))
    .map((e) => lonLatToScreen(view, e.at[0], e.at[1]));
  ctx.clearRect(0, 0, view.width, view.height);
  drawBasemap(ctx, view, base);
  drawSpheres(ctx, view, year, eras);
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

  // 箭头只画「当前时期」的最近 6 条，加上当前节点上的与正在查看的那条。
  // 若按全场最近 6 条来画，1876 年收复乌鲁木齐那种横贯新疆的长箭头会一直挂在 1911 年的图上。
  const curEra = eras.find((e) => year >= e.from && year <= e.to);
  const withArrows = revealed
    .filter((e) => e.arrows && e.arrows.length && curEra && e.era === curEra.id)
    .slice(-6);
  for (const e of revealed) {
    if (activeSet.has(e.id) && e.arrows && e.arrows.length && !withArrows.includes(e)) withArrows.push(e);
  }
  for (const e of withArrows) {
    const hot = activeSet.has(e.id);
    const fade = player.freshness(e.id, stamp, 2600);
    const alpha = hot ? 0.95 : 0.42 + 0.4 * (1 - fade);
    for (const a of e.arrows) {
      drawArrow(ctx, view, a, fade < 1 ? fade : 1, alpha, hot ? C.accent : `rgba(${ERA_TINT[e.era] || "150,160,170"},0.9)`);
    }
  }

  drawEventDots(ctx, view, revealed, player, stamp, activeSet, zoom, labelId);
}

export { ERA_TINT, C as COLORS };
