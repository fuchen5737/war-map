// 投影与视图：Albers 等积圆锥投影（中国常用参数），经纬度 → 平面坐标。
// 构建脚本与运行时共用本文件，保证底图与战役点位严格同一套坐标。

const D2R = Math.PI / 180;

const ALBERS = {
  lon0: 105 * D2R,
  lat0: 35 * D2R,
  lat1: 25 * D2R,
  lat2: 47 * D2R,
};

const N = (Math.sin(ALBERS.lat1) + Math.sin(ALBERS.lat2)) / 2;
const C = Math.cos(ALBERS.lat1) ** 2 + 2 * N * Math.sin(ALBERS.lat1);
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(ALBERS.lat0)) / N;

/** 经纬度 → 投影平面（无量纲，约等于地球半径倍数） */
export function project(lon, lat) {
  const phi = lat * D2R;
  const theta = N * (lon * D2R - ALBERS.lon0);
  const rho = Math.sqrt(Math.max(C - 2 * N * Math.sin(phi), 0)) / N;
  return [rho * Math.sin(theta), RHO0 - rho * Math.cos(theta)];
}

/** 投影平面 → 经纬度（反解，用于鼠标取点） */
export function unproject(x, y) {
  const dy = RHO0 - y;
  let rho = Math.sqrt(x * x + dy * dy);
  rho *= N > 0 ? 1 : -1;
  const theta = Math.atan2(x, dy);
  const phi = Math.asin((C - (rho * N) ** 2) / (2 * N));
  return [(theta / N + ALBERS.lon0) / D2R, phi / D2R];
}

/**
 * 视图：把投影坐标映射到画布像素。
 * zoom=1 时整幅地图居中铺满；以 (anchorX, anchorY)（像素）为缩放锚点。
 */
export function createView(bbox, width, height, zoom = 1, panX = 0, panY = 0) {
  const [minX, minY, maxX, maxY] = bbox;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const base = Math.min(width / (maxX - minX), height / (maxY - minY));
  const s = base * zoom;
  return {
    s,
    tx: width / 2 - cx * s + panX,
    ty: height / 2 + cy * s + panY,
    width,
    height,
  };
}

/**
 * 带内边距的视图：地图只在「左栏右缘 — 右栏左缘 — 底部时间轴上缘」围出的
 * 空闲区域里铺开，不被面板压住。inset 单位为像素。
 */
export function createInsetView(bbox, width, height, inset = {}, zoom = 1, focus = null) {
  const { left = 0, right = 0, top = 0, bottom = 0 } = inset;
  const freeW = Math.max(80, width - left - right);
  const freeH = Math.max(80, height - top - bottom);
  const [minX, minY, maxX, maxY] = bbox;
  // focus 是地图坐标里的镜头中心；不给就退回整个视域的中心
  const cx = focus ? focus[0] : (minX + maxX) / 2;
  const cy = focus ? focus[1] : (minY + maxY) / 2;
  const s = Math.min(freeW / (maxX - minX), freeH / (maxY - minY)) * zoom;
  const freeCx = left + freeW / 2;
  const freeCy = top + freeH / 2;
  return {
    s,
    tx: freeCx - cx * s,
    ty: freeCy + cy * s,
    width,
    height,
    freeW,
    freeH,
    freeLeft: left,
    freeTop: top,
  };
}

export const toScreenX = (view, x) => view.tx + x * view.s;
export const toScreenY = (view, y) => view.ty - y * view.s;
export const toMapX = (view, sx) => (sx - view.tx) / view.s;
export const toMapY = (view, sy) => (view.ty - sy) / view.s;

/** 经纬度 → 屏幕像素 */
export function lonLatToScreen(view, lon, lat) {
  const [x, y] = project(lon, lat);
  return [toScreenX(view, x), toScreenY(view, y)];
}

/** 屏幕像素 → 经纬度 */
export function screenToLonLat(view, sx, sy) {
  return unproject(toMapX(view, sx), toMapY(view, sy));
}

/** 粗略的公里数换算（用于比例尺，取 35°N 处每度经线约 111km） */
export const KM_PER_UNIT = 6371;

/** 两点间的大圆距离（公里），仅用于展示比例尺与行程长度 */
export function haversine(a, b) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = lat1 * D2R;
  const p2 = lat2 * D2R;
  const dp = (lat2 - lat1) * D2R;
  const dl = (lon2 - lon1) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
