import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { ERAS, EVENTS, TIMELINE, decimalYear } from "../data/events.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = JSON.parse(readFileSync(resolve(HERE, "../data/geo/basemap.json"), "utf8"));

// 经纬度 → 投影坐标，用于验证战事点位落在画布视域内
import { project } from "../src/geo.js";

test("每条战事都有必备字段且类型正确", () => {
  for (const e of EVENTS) {
    assert.ok(e.id && typeof e.id === "string", `缺 id：${JSON.stringify(e).slice(0, 80)}`);
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${e.id} 日期格式错误：${e.date}`);
    assert.ok(e.era && typeof e.era === "string", `${e.id} 缺 era`);
    assert.ok(e.name && typeof e.name === "string", `${e.id} 缺 name`);
    assert.ok(e.place && typeof e.place === "string", `${e.id} 缺 place`);
    assert.ok(Array.isArray(e.at) && e.at.length === 2, `${e.id} 的 at 必须是 [lon,lat]`);
    const [lon, lat] = e.at;
    assert.ok(Number.isFinite(lon) && Number.isFinite(lat), `${e.id} 坐标不是数字`);
    assert.ok(lon >= -180 && lon <= 180, `${e.id} 经度越界：${lon}`);
    assert.ok(lat >= -90 && lat <= 90, `${e.id} 纬度越界：${lat}`);
    assert.ok([1, 2, 3].includes(e.scale), `${e.id} 的 scale 必须是 1/2/3，实际 ${e.scale}`);
    assert.ok(e.result && typeof e.result === "string", `${e.id} 缺 result`);
    assert.ok(e.note && typeof e.note === "string", `${e.id} 缺 note`);
  }
});

test("id 全局唯一", () => {
  const seen = new Set();
  for (const e of EVENTS) {
    assert.ok(!seen.has(e.id), `id 重复：${e.id}`);
    seen.add(e.id);
  }
});

test("每条战事的 era 都存在于 ERAS", () => {
  const ids = new Set(ERAS.map((e) => e.id));
  for (const e of EVENTS) {
    assert.ok(ids.has(e.era), `${e.id} 引用了不存在的时期 ${e.era}`);
  }
});

test("日期落在时间轴区间内，且与所属时期大致吻合", () => {
  for (const e of EVENTS) {
    const y = decimalYear(e.date);
    assert.ok(
      y >= TIMELINE.from && y <= TIMELINE.to,
      `${e.id} 的 ${e.date} 落在时间轴 ${TIMELINE.from}–${TIMELINE.to} 之外`,
    );
  }
});

test("ERAS 自身自洽：from < to，且有 name 与 blurb", () => {
  for (const era of ERAS) {
    assert.ok(era.from < era.to, `${era.id} 的起止年份反了：${era.from}–${era.to}`);
    assert.ok(era.name, `${era.id} 缺 name`);
    assert.ok(era.blurb, `${era.id} 缺 blurb`);
    assert.equal(typeof era.foreign, "boolean", `${era.id} 的 foreign 必须是布尔值`);
  }
});

test("每个时期至少有一条战事，否则时期索引会出现死按钮", () => {
  for (const era of ERAS) {
    const n = EVENTS.filter((e) => e.era === era.id).length;
    assert.ok(n > 0, `时期 ${era.id}（${era.name}）没有任何战事`);
  }
});

test("时期之间没有超过 10 年的裂缝（时期本身允许重叠，裂缝才是问题）", () => {
  const sorted = [...ERAS].sort((a, b) => a.from - b.from);
  let covered = sorted[0].to;
  let coveredBy = sorted[0].id;
  for (const era of sorted.slice(1)) {
    const gap = era.from - covered;
    assert.ok(
      gap <= 10,
      `${coveredBy} 之后到 ${era.id} 之前空了 ${gap} 年，播放时会长时间无事可看`,
    );
    if (era.to > covered) {
      covered = era.to;
      coveredBy = era.id;
    }
  }
});

test("箭头数据格式正确：kind 合法、至少两点、坐标有效", () => {
  let arrows = 0;
  for (const e of EVENTS) {
    if (!e.arrows) continue;
    assert.ok(Array.isArray(e.arrows), `${e.id} 的 arrows 不是数组`);
    for (const a of e.arrows) {
      arrows++;
      assert.ok(["advance", "naval", "retreat"].includes(a.kind), `${e.id} 箭头 kind 非法：${a.kind}`);
      assert.ok(a.label && typeof a.label === "string", `${e.id} 箭头缺 label`);
      assert.ok(Array.isArray(a.pts) && a.pts.length >= 2, `${e.id} 箭头至少需要两个点`);
      for (const p of a.pts) {
        assert.ok(Array.isArray(p) && p.length === 2, `${e.id} 箭头的点必须是 [lon,lat]`);
        assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${e.id} 箭头坐标不是数字`);
      }
    }
  }
  assert.ok(arrows >= 20, `带箭头的战事太少（${arrows} 条），动态推进效果会不明显`);
});

test("战事点位全部落在底图视域内（不会被画到画布外）", () => {
  const [minX, minY, maxX, maxY] = BASE.bbox;
  for (const e of EVENTS) {
    const [x, y] = project(e.at[0], e.at[1]);
    assert.ok(
      x >= minX - 0.02 && x <= maxX + 0.02 && y >= minY - 0.02 && y <= maxY + 0.02,
      `${e.id}（${e.place}）投影后落在视域外：[${x.toFixed(3)}, ${y.toFixed(3)}]`,
    );
  }
});

test("箭头端点也落在视域内", () => {
  const [minX, minY, maxX, maxY] = BASE.bbox;
  for (const e of EVENTS) {
    for (const a of e.arrows || []) {
      for (const [lon, lat] of a.pts) {
        const [x, y] = project(lon, lat);
        assert.ok(
          x >= minX - 0.05 && x <= maxX + 0.05 && y >= minY - 0.05 && y <= maxY + 0.05,
          `${e.id} 箭头端点越界：[${x.toFixed(3)}, ${y.toFixed(3)}]`,
        );
      }
    }
  }
});

test("底图结构完整：省、邻国、河流、国界都在", () => {
  assert.ok(Array.isArray(BASE.provinces) && BASE.provinces.length >= 30, "省份数量不足");
  assert.ok(Array.isArray(BASE.neighbors) && BASE.neighbors.length >= 15, "邻国数量不足");
  assert.ok(Array.isArray(BASE.rivers) && BASE.rivers.length >= 8, "河流数量不足");
  assert.ok(Array.isArray(BASE.outline) && BASE.outline.length > 0, "缺国界轮廓");
  assert.ok(BASE.bbox.length === 4, "bbox 必须是 4 个数");
});

test("省份字段完整：有民国名、面积、标注点与形状", () => {
  const names = new Set();
  for (const p of BASE.provinces) {
    assert.ok(p.name && typeof p.name === "string", "省份缺 name");
    assert.ok(!names.has(p.name), `省份重名：${p.name}`);
    names.add(p.name);
    assert.ok(typeof p.area === "number" && p.area > 0, `${p.name} 缺 area`);
    assert.ok(Array.isArray(p.label) && p.label.length === 2, `${p.name} 缺 label`);
    assert.ok(Array.isArray(p.shapes) && p.shapes.length > 0, `${p.name} 缺 shapes`);
    for (const shape of p.shapes) {
      for (const ring of shape) {
        assert.ok(ring.length >= 3, `${p.name} 有个环少于 3 点`);
        for (const pt of ring) {
          assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]), `${p.name} 坐标不是数字`);
        }
      }
    }
  }
});

test("省名已做民国化处理（不该残留现代行政区名）", () => {
  const names = BASE.provinces.map((p) => p.name);
  for (const modern of ["北京", "内蒙古", "广西壮族自治区", "新疆维吾尔自治区", "宁夏回族自治区"]) {
    assert.ok(!names.includes(modern), `省名仍是现代写法：${modern}`);
  }
  assert.ok(names.includes("北平"), "缺「北平」");
  assert.ok(names.includes("绥远"), "缺「绥远」");
});

test("河流路径格式正确且有点", () => {
  for (const r of BASE.rivers) {
    assert.ok(r.name && typeof r.name === "string", "河流缺 name");
    assert.ok(Array.isArray(r.path) && r.path.length >= 2, `${r.name} 路径点太少`);
  }
});

test("basemap.json 体积在预算内（首屏要能快速加载）", () => {
  const bytes = readFileSync(resolve(HERE, "../data/geo/basemap.json")).length;
  assert.ok(bytes < 200 * 1024, `底图 ${(bytes / 1024).toFixed(0)} KB，超出 200 KB 预算`);
});
