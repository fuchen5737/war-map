// 字幕与年份层：视频版式的「文字部分」。
//
// 参考片里没有侧栏、没有时间轴，所有文字都压在画面上：
// 左上角是年份，底部是解说。这一层只负责把文字放对位置、
// 在任何底色上都读得出来（暗角 + 描边 + 渐隐）。
//
// 全部画在 canvas 上而不是 DOM——视频模式要能整帧导出。

import { rgba } from "./ease.js";

const FONT_YEAR = '"Helvetica Neue", "PingFang SC", system-ui, sans-serif';
const FONT_CN = '"Songti SC", "Source Han Serif SC", "Noto Serif CJK SC", serif';

/** 画面四角的暗角，压住底图让文字浮起来 */
export function drawVignette(ctx, w, h, strength = 0.5) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(2,6,9,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 底部字幕带：一层从透明到深的渐变，字幕压在上面 */
export function drawCaptionBand(ctx, w, h, opts = {}) {
  const { height = Math.round(h * 0.20), strength = 0.82 } = opts;
  const g = ctx.createLinearGradient(0, h - height, 0, h);
  g.addColorStop(0, "rgba(3,8,12,0)");
  g.addColorStop(0.55, `rgba(3,8,12,${strength * 0.7})`);
  g.addColorStop(1, `rgba(3,8,12,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, h - height, w, height);
  ctx.restore();
}

/**
 * 年份牌：大号数字 + 小号月份，左上角。
 * 数字用等宽感强的无衬线，年份跳动时不晃。
 */
export function drawYearCard(ctx, x, y, year, month, opts = {}) {
  const {
    size = 46,
    color = "rgba(238,244,248,0.96)",
    subColor = "rgba(206,226,236,0.62)",
    alpha = 1,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "alphabetic";

  const label = String(year);
  ctx.font = `600 ${size}px ${FONT_YEAR}`;
  const wYear = ctx.measureText(label).width;

  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);

  if (month) {
    ctx.shadowBlur = 8;
    ctx.font = `500 ${Math.round(size * 0.34)}px ${FONT_YEAR}`;
    ctx.fillStyle = subColor;
    ctx.fillText(`${month}月`, x + wYear + size * 0.16, y - size * 0.04);
  }
  ctx.restore();
}

/**
 * 解说字幕：居中、最多两行、自动折行。
 * 一次只说一件事——长句拆成多帧是时间轴的事，不是这一层的事。
 *
 * @returns {number} 实际占用的行数
 */
export function drawCaption(ctx, text, w, h, opts = {}) {
  const {
    size = Math.max(15, Math.round(h * 0.030)),
    color = "rgba(232,236,238,0.94)",
    maxWidth = Math.round(w * 0.72),
    bottom = Math.round(h * 0.085),
    lineHeight = 1.62,
    alpha = 1,
    maxLines = 2,
  } = opts;
  if (!text) return 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `400 ${size}px ${FONT_CN}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;

  // 按字符折行（中文没有空格可切）
  const lines = [];
  let cur = "";
  for (const ch of String(text)) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) break;
    } else {
      cur += ch;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  // 截断时补省略号，别让读者以为话说完了
  if (lines.length === maxLines && cur && !lines.includes(cur)) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }

  const startY = h - bottom - (lines.length - 1) * size * lineHeight;
  ctx.fillStyle = color;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, startY + i * size * lineHeight));

  ctx.restore();
  return lines.length;
}

/**
 * 左上角的栏目题头（片名/章节），小字、字距拉开。
 * 只在片头几秒出现，然后淡出。
 */
export function drawKicker(ctx, x, y, text, opts = {}) {
  const { size = 13, color = "rgba(224,160,58,0.92)", alpha = 1, tracking = 0.34 } = opts;
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${size}px ${FONT_YEAR}`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 8;

  // 手工加字距：canvas 没有 letterSpacing 的通用支持
  let cx = x;
  ctx.fillStyle = color;
  for (const ch of String(text)) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + size * tracking;
  }
  ctx.restore();
}

/** 右下角的小字出处 */
export function drawSource(ctx, w, h, text, opts = {}) {
  const { size = 11, color = "rgba(150,182,198,0.42)", pad = 18 } = opts;
  if (!text) return;
  ctx.save();
  ctx.font = `400 ${size}px ${FONT_YEAR}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = color;
  ctx.fillText(text, w - pad, h - pad * 0.6);
  ctx.restore();
}

/**
 * 影片式上下黑边。窄屏下用它把 16:9 的内容框成电影比例。
 * @returns {{top:number, bottom:number}} 可见区域
 */
export function drawLetterbox(ctx, w, h, aspect = 16 / 9) {
  const targetH = w / aspect;
  const bar = Math.max(0, Math.round((h - targetH) / 2));
  if (bar > 0) {
    ctx.save();
    ctx.fillStyle = "#02060a";
    ctx.fillRect(0, 0, w, bar);
    ctx.fillRect(0, h - bar, w, bar);
    ctx.restore();
  }
  return { top: bar, bottom: h - bar };
}

/** 统一的文字底色：给「白字压在浅色地形上」兜底 */
export function textShadow(ctx, blur = 10, color = "rgba(0,0,0,0.8)") {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export const FONTS = { FONT_YEAR, FONT_CN };

/** 供测试断言用：一段文字按给定宽度折成几行 */
export function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const lines = [];
  let cur = "";
  for (const ch of String(text)) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) return lines;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export { rgba };

/**
 * 年份牌下面那行小字：「全面抗战 第 2478 天」。
 * 参考片用它把「大数字」换算成读者能感到的时间——天数是累积的，
 * 比再写一遍年份更能说明「熬了多久」。
 */
export function drawDayCount(ctx, x, y, opts = {}) {
  const {
    prefix = "全面抗战",
    days = 0,
    size = 12,
    color = "rgba(214,226,234,0.66)",
    trackColor = "rgba(224,160,58,0.92)",
    alpha = 1,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "middle";
  ctx.font = `400 ${size}px ${FONT_CN}`;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillText(prefix, x, y);
  const wPre = ctx.measureText(prefix).width;
  const track = ` 第 ${days} 天`;
  ctx.fillStyle = trackColor;
  ctx.fillText(track, x + wPre + size * 0.25, y);
  ctx.restore();
}

/**
 * 右上角的战役标题：一道朱红竖线 + 战役名 + 一行小注。
 * 位置靠右时右对齐；文字仍从竖线右侧排起。
 */
export function drawTitleCard(ctx, x, y, title, sub, opts = {}) {
  const {
    size = 26,
    subSize = 13,
    color = "rgba(238,244,248,0.96)",
    subColor = "rgba(206,222,230,0.62)",
    rule = "rgba(179,39,58,0.92)",
    align = "right",
    alpha = 1,
  } = opts;
  if (!title) return 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "alphabetic";

  ctx.font = `600 ${size}px ${FONT_CN}`;
  const wTitle = ctx.measureText(title).width;
  const x0 = align === "right" ? x - wTitle : x; // 竖线位置
  const ruleW = Math.max(2, Math.round(size * 0.09));

  ctx.fillStyle = rule;
  ctx.fillRect(x0 - size * 0.42, y - size * 0.92, ruleW, sub ? size * 1.55 : size * 1.0);

  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(title, x0, y);

  if (sub) {
    ctx.shadowBlur = 7;
    ctx.font = `400 ${subSize}px ${FONT_CN}`;
    ctx.fillStyle = subColor;
    ctx.fillText(sub, x0, y + subSize * 1.72);
  }
  ctx.restore();
  return wTitle;
}

/**
 * 画面左下角的图例：一行小样 + 标签。
 * items: [{ kind: "hatch"|"dot"|"star"|"flame"|"ring", color, label }]
 */
export function drawFilmLegend(ctx, x, y, items, opts = {}) {
  const { size = 11, gap = 18, alpha = 1, color = "rgba(198,214,222,0.66)" } = opts;
  if (!items || !items.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `400 ${size}px ${FONT_CN}`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 6;

  let cx = x;
  for (const it of items) {
    const r = size * 0.42;
    const cy = y;
    if (it.kind === "hatch") {
      ctx.save();
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - r + i * 3.2, cy + r);
        ctx.lineTo(cx + r + i * 3.2 - r * 2, cy - r);
        ctx.stroke();
      }
      ctx.strokeStyle = it.color;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else if (it.kind === "star") {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.32;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (it.kind === "flame") {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.25);
      ctx.bezierCurveTo(cx + r * 0.95, cy - r * 0.1, cx + r * 0.7, cy + r, cx, cy + r);
      ctx.bezierCurveTo(cx - r * 0.7, cy + r, cx - r * 0.95, cy - r * 0.1, cx, cy - r * 1.25);
      ctx.fill();
    } else {
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = color;
    const label = it.label;
    ctx.fillText(label, cx + r + size * 0.62, cy);
    cx += r + size * 0.62 + ctx.measureText(label).width + gap;
  }
  ctx.restore();
}
