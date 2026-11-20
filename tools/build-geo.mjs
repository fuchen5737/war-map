// 把原始 GeoJSON 压成运行时底图：投影到 Albers 平面、抽稀、裁掉远离中国范围的部分。
// 输出 data/geo/basemap.json（省份面 + 邻国面 + 主要河流 + 视域 bbox）。
import { readFile, writeFile } from "node:fs/promises";
import { project } from "../src/geo.js";

const RAW = new URL("../data/geo/raw/", import.meta.url);
const OUT = new URL("../data/geo/basemap.json", import.meta.url);

// 视域：覆盖中国本土 + 台湾 + 朝鲜半岛 + 日本西部 + 印度支那 + 蒙古/苏俄远东一部分
const LON = [72, 148];
const LAT = [-2, 56];

// 抽稀容差（投影单位；1 单位 ≈ 6371km）
const TOL_CN = 0.0009;
const TOL_WORLD = 0.0035;
const TOL_RIVER = 0.0012;

// 丢弃面积过小的碎环（约 30 平方公里以下）
const MIN_RING_AREA = 4e-6;

const readJSON = async (name) => JSON.parse(await readFile(new URL(name, RAW), "utf8"));

function ringArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker，迭代版避免深递归 */
function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = -1;
    let idx = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i += 1) if (keep[i]) out.push(points[i]);
  return out;
}

const round = (v) => Math.round(v * 1e4) / 1e4;

function insideView(lon, lat, pad = 6) {
  return lon > LON[0] - pad && lon < LON[1] + pad && lat > LAT[0] - pad && lat < LAT[1] + pad;
}

function polygonToRings(coords, tol, filterArea = MIN_RING_AREA) {
  // coords: [ [ [lon,lat], ... ] ]  (外环 + 内环)
  const rings = [];
  for (const ring of coords) {
    const proj = [];
    for (const [lon, lat] of ring) {
      if (!insideView(lon, lat)) continue;
      const [x, y] = project(lon, lat);
      proj.push([x, y]);
    }
    if (proj.length < 4) continue;
    const simp = simplify(proj, tol);
    if (simp.length < 4) continue;
    if (ringArea(simp) < filterArea) continue;
    rings.push(simp.map(([x, y]) => [round(x), round(y)]));
  }
  return rings;
}

function featureToShapes(geometry, tol, filterArea) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [polygonToRings(geometry.coordinates, tol, filterArea)].filter((r) => r.length);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly) => polygonToRings(poly, tol, filterArea))
      .filter((rings) => rings.length);
  }
  return [];
}

function lineToPaths(geometry, tol) {
  const parts = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
  const out = [];
  for (const line of parts) {
    const proj = [];
    for (const [lon, lat] of line) {
      if (!insideView(lon, lat)) continue;
      proj.push(project(lon, lat));
    }
    if (proj.length < 2) continue;
    const simp = simplify(proj, tol);
    if (simp.length < 2) continue;
    out.push(simp.map(([x, y]) => [round(x), round(y)]));
  }
  return out;
}

const CN_NAME = {
  110000: "北平", 120000: "天津", 130000: "河北", 140000: "山西", 150000: "绥远",
  210000: "辽宁", 220000: "吉林", 230000: "黑龙江", 310000: "上海", 320000: "江苏",
  330000: "浙江", 340000: "安徽", 350000: "福建", 360000: "江西", 370000: "山东",
  410000: "河南", 420000: "湖北", 430000: "湖南", 440000: "广东", 450000: "广西",
  460000: "海南", 500000: "重庆", 510000: "四川", 520000: "贵州", 530000: "云南",
  540000: "西藏", 610000: "陕西", 620000: "甘肃", 630000: "青海", 640000: "宁夏",
  650000: "新疆", 710000: "台湾", 810000: "香港", 820000: "澳门",
};

// 视域内需要保留的邻国/地区（近现代史里反复出现的地名）
const WORLD_KEEP = new Set([
  "China", "Taiwan", "Japan", "Korea", "North Korea", "South Korea", "Mongolia",
  "Russia", "India", "Pakistan", "Nepal", "Bhutan", "Myanmar", "Burma", "Thailand",
  "Laos", "Vietnam", "Cambodia", "Philippines", "Malaysia", "Indonesia",
  "Bangladesh", "Kazakhstan", "Kyrgyzstan", "Tajikistan", "Afghanistan",
  "Uzbekistan", "Turkmenistan", "Hong Kong", "Macao", "Macau", "Sri Lanka",
]);

const WORLD_CN = {
  China: "中国", Japan: "日本", Korea: "朝鲜", "South Korea": "韩国", "North Korea": "朝鲜",
  Mongolia: "蒙古", Russia: "俄国", India: "印度", Pakistan: "巴基斯坦", Nepal: "尼泊尔",
  Bhutan: "不丹", Myanmar: "缅甸", Burma: "缅甸", Thailand: "暹罗", Laos: "老挝",
  Vietnam: "越南", Cambodia: "柬埔寨", Philippines: "菲律宾", Malaysia: "马来亚",
  Indonesia: "荷属东印度", Bangladesh: "孟加拉", Kazakhstan: "哈萨克",
  Kyrgyzstan: "吉尔吉斯", Tajikistan: "塔吉克", Afghanistan: "阿富汗",
  Uzbekistan: "乌兹别克", Turkmenistan: "土库曼", "Sri Lanka": "锡兰",
  Taiwan: "台湾",
};

const RIVER_KEEP = {
  Yangtze: "长江", "Chang Jiang": "长江", Huang: "黄河", Amur: "黑龙江",
  Mekong: "湄公河", Xi: "西江", Huai: "淮河", Yalu: "鸭绿江", Han: "汉水",
};

const china = await readJSON("china-provinces.json");
const world = await readJSON("world.geo.json");
const rivers = await readJSON("rivers.geojson");

const provinces = [];
for (const f of china.features) {
  // 阿里 DataV 里有一条 "100000_JD" 的南海断续线，不是省份，跳过
  if (!f.properties.name || !/^\d+$/.test(String(f.properties.adcode))) continue;
  const adcode = Number(f.properties.adcode);
  const shapes = featureToShapes(f.geometry, TOL_CN);
  if (!shapes.length) continue;
  const c = f.properties.centroid || f.properties.center;
  const label = c ? project(c[0], c[1]).map((v) => Math.round(v * 1e4) / 1e4) : null;
  // 投影后面积（鞋带公式，取绝对值）：渲染时按面积决定要不要标地名，
  // 否则宁夏、海南这些小省的名字会跟邻居挤成一团。
  let area = 0;
  for (const shape of shapes) {
    for (const ring of shape) {
      let a = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      }
      area += Math.abs(a) / 2;
    }
  }
  provinces.push({
    id: String(adcode),
    name: CN_NAME[adcode] || f.properties.name,
    modern: f.properties.name,
    label,
    area,
    shapes,
  });
}

// 中国本土、台湾、港澳由省界图层负责，邻国图层不重复画
const SKIP_NEIGHBOR = new Set(["China", "Taiwan", "Hong Kong", "Macao", "Macau"]);
const neighborMap = new Map();
for (const f of world.features) {
  const name = f.properties?.name;
  if (!name || !WORLD_KEEP.has(name) || SKIP_NEIGHBOR.has(name)) continue;
  const shapes = featureToShapes(f.geometry, TOL_WORLD, MIN_RING_AREA * 4);
  if (!shapes.length) continue;
  const cn = WORLD_CN[name] || name;
  const area = shapes.reduce((n, s) => n + s.reduce((m, r) => m + r.length, 0), 0);
  const prev = neighborMap.get(cn);
  // 同一中文名的多个 feature（如南北朝鲜、缅甸两个拼写）只留点数最多的那块
  if (prev && prev.area >= area) continue;
  let sx = 0, sy = 0, n = 0;
  for (const shape of shapes) for (const ring of shape) for (const [x, y] of ring) { sx += x; sy += y; n++; }
  neighborMap.set(cn, {
    name: cn,
    en: name,
    label: n ? [Math.round((sx / n) * 1e4) / 1e4, Math.round((sy / n) * 1e4) / 1e4] : null,
    shapes,
    area,
  });
}
const neighbors = [...neighborMap.values()]
  .sort((a, b) => b.area - a.area)
  .map(({ area, ...rest }) => rest);

const riverPaths = [];
for (const f of rivers.features) {
  const en = f.properties?.name;
  if (!en || !RIVER_KEEP[en]) continue;
  const paths = lineToPaths(f.geometry, TOL_RIVER);
  for (const path of paths) if (path.length > 2) riverPaths.push({ name: RIVER_KEEP[en], en, path });
}

// 国界轮廓：用 world.geo.json 的 China 单独描一遍，让海岸线有分量
const outline = [];
for (const f of world.features) {
  if (f.properties?.name !== "China") continue;
  const shapes = featureToShapes(f.geometry, TOL_WORLD * 0.55, MIN_RING_AREA * 4);
  outline.push(...shapes);
}

// 视域 bbox（投影后）：以国界轮廓为准，四周留一点余量，
// 这样画布被两侧面板夹住时，中国主体仍居中且占满可视区。
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const shape of outline) {
  for (const ring of shape) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const padX = (maxX - minX) * 0.085;
const padTop = (maxY - minY) * 0.10;
const padBottom = (maxY - minY) * 0.14;
const round4 = (n) => Math.round(n * 1e4) / 1e4;
const bbox = [
  round4(minX - padX),
  round4(minY - padBottom),
  round4(maxX + padX),
  round4(maxY + padTop),
];

const payload = {
  bbox,
  lonRange: LON,
  latRange: LAT,
  provinces,
  neighbors,
  outline,
  rivers: riverPaths,
};

await writeFile(OUT, JSON.stringify(payload));
const bytes = JSON.stringify(payload).length;
const pts = provinces.reduce((n, p) => n + p.shapes.reduce((m, s) => m + s.reduce((k, r) => k + r.length, 0), 0), 0);
console.log(`basemap.json ${(bytes / 1024).toFixed(0)} KB | 省 ${provinces.length} | 邻国 ${neighbors.length} | 河 ${riverPaths.length} | 省界点 ${pts}`);
console.log("bbox", bbox);
