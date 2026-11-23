// 数值与颜色的最小工具集。整个 kit 里凡是能算的都不碰 DOM，方便单测。

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** 0→1 三次缓出，收尾比开头快，用来做「镜头落位」「翻色」这类单向运动 */
export const easeOut = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;

/** 两端都平缓，中段快，适合「淡入淡出」 */
export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** 一条 0→1→0 的包络，用于「刚出现时闪一下」 */
export const pulse = (t) => Math.sin(clamp(t, 0, 1) * Math.PI);

/**
 * 把 t 映射到 [from, from+dur] 这段区间上的 0→1 进度，区间外夹取。
 * 时间轴上的每一条 cue 都靠它换算，避免到处手写减法。
 */
export const window01 = (t, from, dur) => clamp((t - from) / Math.max(dur, 1e-6), 0, 1);

/** #rrggbb / #rgb / rgb() / rgba() → [r,g,b]。解析不了才退回白色。 */
export function parseHex(hex) {
  const s = String(hex).trim();
  const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
  let h = s.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n) || h.length !== 6) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 任意色值 + alpha → rgba()。已经是 rgba 的原样返回。 */
export function rgba(color, alpha = 1) {
  const s = String(color).trim();
  if (s.startsWith("rgba")) return s;
  if (s.startsWith("rgb")) return s.replace(/^rgb\(/, "rgba(").replace(/\)$/, `, ${alpha})`);
  const [r, g, b] = parseHex(s);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 两色线性混合，t=0 取 a，t=1 取 b */
export function mixColor(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  const k = clamp(t, 0, 1);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], k)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** 往白里掺 t，用来做「高亮但不换色」——一换色就丢了「这是谁」 */
export function lighten(hex, t = 0.3) {
  return mixColor(hex, "#ffffff", t);
}
