// 地图上的「标记符号」：旗帜、火苗、金星、括号。
//
// 这一层只画形状，不认识任何战事数据。调用方给坐标、尺寸、颜色，
// 它保证在任何底色上都读得出来（每个形状都先描一道暗边）。
//
// 设计口径：符号是「谁在这里做了什么」，不是装饰。
// 所以形状必须能彼此区分（旗/火/星三种轮廓差别够大），
// 而且不许靠颜色单独承担语义——色盲读者也要分得开。

import { rgba, lighten } from "./ease.js";

/** 统一的暗底描边：压在浅色高原或深色海面上都能读 */
function halo(ctx, path, width = 2.6) {
  ctx.save();
  ctx.strokeStyle = "rgba(5,12,17,0.82)";
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * 旭日旗：白底 + 红色放射线。
 * 参考片里这个旗子跟着侵略路线一路铺开，是最强的一个「这里被占了」信号。
 *
 * @param {number} size 旗面边长
 */
export function drawRisingSun(ctx, x, y, size, opts = {}) {
  const { color = "#d24a3a", rays = 16, alpha = 1, pole = true } = opts;
  const s = size;
  const h = s * 0.72;
  const x0 = x - s / 2;
  const y0 = y - h / 2;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 旗杆
  if (pole) {
    ctx.strokeStyle = "rgba(214,228,236,0.55)";
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(x0, y0 - s * 0.06);
    ctx.lineTo(x0, y0 + h + s * 0.16);
    ctx.stroke();
  }

  // 白底
  halo(ctx, () => {
    ctx.beginPath();
    ctx.rect(x0, y0, s, h);
  }, Math.max(2, s * 0.09));
  ctx.fillStyle = "#f2ece4";
  ctx.fillRect(x0, y0, s, h);

  // 放射线：从中心向外，被旗面裁掉
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, s, h);
  ctx.clip();
  const cx = x0 + s * 0.42;
  const cy = y0 + h / 2;
  const R = Math.hypot(s, h);
  ctx.fillStyle = color;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const half = (Math.PI / rays) * 0.62;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - half) * R, cy + Math.sin(a - half) * R);
    ctx.lineTo(cx + Math.cos(a + half) * R, cy + Math.sin(a + half) * R);
    ctx.closePath();
    ctx.fill();
  }
  // 中心圆
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // 旗面描边
  ctx.strokeStyle = "rgba(5,12,17,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, s - 1, h - 1);
  ctx.restore();
}

/**
 * 火苗：殉国的将领。
 * 形状是「上尖下圆的一滴水」，内焰更亮，静止时也轻轻摆。
 *
 * @param {number} t 0..1 的时间相位，用来让火苗轻微摇曳
 */
export function drawFlame(ctx, x, y, size, opts = {}) {
  const { color = "#eae4e4", alpha = 1, t = 0 } = opts;
  const s = size;
  const sway = Math.sin(t * Math.PI * 2) * s * 0.08;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  // 外焰
  const outer = () => {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.62);
    ctx.bezierCurveTo(s * 0.30 + sway, -s * 0.16, s * 0.34, s * 0.20, 0, s * 0.46);
    ctx.bezierCurveTo(-s * 0.34, s * 0.20, -s * 0.30 + sway, -s * 0.16, 0, -s * 0.62);
    ctx.closePath();
  };
  halo(ctx, outer, Math.max(2, s * 0.34));
  ctx.fillStyle = color;
  outer();
  ctx.fill();

  // 内焰
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.24);
  ctx.bezierCurveTo(s * 0.15, -s * 0.02, s * 0.16, s * 0.14, 0, s * 0.26);
  ctx.bezierCurveTo(-s * 0.16, s * 0.14, -s * 0.15, -s * 0.02, 0, -s * 0.24);
  ctx.closePath();
  ctx.fillStyle = rgba(lighten(color, 0.45), 0.92);
  ctx.fill();

  ctx.restore();
}

/**
 * 金星：胜仗。四角星（sparkle），比五角星更像「一次事件」而不是「一个单位」。
 */
export function drawStar(ctx, x, y, r, opts = {}) {
  const { color = "#e8b45c", alpha = 1, inner = 0.30 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * inner;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  halo(ctx, path, Math.max(2, r * 0.42));
  ctx.fillStyle = color;
  path();
  ctx.fill();
  ctx.restore();
}

/**
 * 括号：给「敌后根据地」这类成片区域用，标出一段范围而不是一个点。
 * 只画上括号，压在区域上沿，不遮挡内部。
 */
export function drawBracket(ctx, x0, x1, y, opts = {}) {
  const { color = "#e8b45c", alpha = 1, tick = 6, lineWidth = 2 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x0, y + tick);
    ctx.lineTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1, y + tick);
  };
  halo(ctx, path, lineWidth + 2.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * 圆章：条约、事变、受降这类「政治事件」。
 * 双环 + 中心点，和兵种符号里的「空心圆」区分在双层轮廓。
 */
export function drawSeal(ctx, x, y, r, opts = {}) {
  const { color = "#eef4f8", alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  const outer = () => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  };
  halo(ctx, outer, Math.max(2, r * 0.5));
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  outer();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
