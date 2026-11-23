// 斜线填充：把一块区域刷成「有条纹的占领区」，而不是一块实色。
//
// 为什么要条纹：实色块把地形完全盖住，读者不知道那儿是山还是平原；
// 条纹留了缝，底图透出来，同时「这块地归别人了」这件事一眼就看见。
//
// 图案用离屏 canvas 烘一次，按 key 缓存。同一个颜色只做一次图，
// 逐帧只是 fillStyle 换引用。

const cache = new Map();

/**
 * 生成一张可平铺的 45° 斜线图案。
 *
 * @param {CanvasRenderingContext2D} ctx 任意 2D 上下文，只用来 createPattern
 * @param {object} opts
 * @param {string} opts.color   线条颜色
 * @param {number} [opts.period=4]  相邻两条线的垂直间距（CSS px）
 * @param {number} [opts.width=1.4] 线宽（CSS px）
 * @param {number} [opts.angle=45]  倾斜角度，正值为左下→右上
 * @param {string} [opts.bg]        底色；省略则透明（让底图透出来）
 * @param {number} [opts.dpr=1]     设备像素比，线条在 retina 上才不糊
 * @returns {CanvasPattern}
 */
export function hatchPattern(ctx, opts = {}) {
  const {
    color = "#c0342f",
    period = 4,
    width = 1.4,
    angle = 45,
    bg = null,
    dpr = 1,
  } = opts;

  const key = [color, period, width, angle, bg || "-", dpr].join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  // 45° 时，水平间距 period*√2 才能让垂距正好是 period。
  const rad = (angle * Math.PI) / 180;
  const tile = Math.max(2, Math.round(period * Math.SQRT2));
  const size = Math.max(2, Math.round(tile * dpr));

  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d");

  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);
  }

  g.strokeStyle = color;
  g.lineWidth = Math.max(1, width * dpr);
  g.lineCap = "butt";
  g.beginPath();

  if (Math.abs(angle - 45) < 0.01) {
    // 标准对角线平铺：主对角线 + 两个对角补丁，接缝处才连得上。
    g.moveTo(-1, size + 1);
    g.lineTo(size + 1, -1);
    g.moveTo(-1, 1);
    g.lineTo(1, -1);
    g.moveTo(size - 1, size + 1);
    g.lineTo(size + 1, size - 1);
  } else {
    // 任意角度：在放大的方块里画若干平行线，靠 repeat 接缝。
    const span = size * 2;
    g.save();
    g.translate(size / 2, size / 2);
    g.rotate(rad);
    const step = period * dpr;
    for (let d = -span; d <= span; d += step) {
      g.moveTo(-span, d);
      g.lineTo(span, d);
    }
    g.restore();
  }
  g.stroke();

  const pat = ctx.createPattern(cv, "repeat");
  cache.set(key, pat);
  return pat;
}

/**
 * 用斜线填一条或多条路径。
 * `path` 是回调，里面自己 beginPath/画路径，这里负责 fill。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {() => void} path    画路径的回调（不含 fill）
 * @param {object} opts        同 hatchPattern，另有 alpha
 */
export function hatchFill(ctx, path, opts = {}) {
  const { alpha = 1 } = opts;
  const pat = hatchPattern(ctx, opts);
  ctx.save();
  ctx.globalAlpha = alpha;
  path();
  ctx.fillStyle = pat;
  ctx.fill("evenodd");
  ctx.restore();
}

/** 清掉图案缓存。改了颜色/密度又不想重启时用。 */
export function clearHatchCache() {
  cache.clear();
}

/** 缓存里现有多少张图，测试用。 */
export function hatchCacheSize() {
  return cache.size;
}

/** 一块图案贴图的边长（设备像素），测试与对齐用。 */
export function hatchTileSize(period = 4, dpr = 1) {
  const tile = Math.max(2, Math.round(period * Math.SQRT2));
  return Math.max(2, Math.round(tile * dpr));
}
