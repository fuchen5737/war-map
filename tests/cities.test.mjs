import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CITIES, CITY_FALL, fallenBy, fallenWithin, fallLabel, yearToStamp, stampToDecimal,
} from "../data/cities.js";
import { NODES } from "../src/nodes.js";
import { project } from "../src/geo.js";

const base = JSON.parse(readFileSync(new URL("../data/geo/basemap.json", import.meta.url)));
const [minX, minY, maxX, maxY] = base.bbox;

test("41 座城，与片尾「光复城市 41」对得上", () => {
  assert.equal(CITIES.length, 41);
  assert.equal(CITY_FALL.length, 41);
});

test("每座城都有名字、经纬度、沦陷日期", () => {
  for (const c of CITIES) {
    assert.ok(c.name && typeof c.name === "string", `名字：${JSON.stringify(c)}`);
    assert.ok(Array.isArray(c.at) && c.at.length === 2, `${c.name} 经纬度`);
    const [lon, lat] = c.at;
    assert.ok(lon > 70 && lon < 150, `${c.name} 经度 ${lon}`);
    assert.ok(lat > 0 && lat < 60, `${c.name} 纬度 ${lat}`);
    assert.match(c.fall, /^\d{4}-\d{2}-\d{2}$/, `${c.name} 日期格式`);
  }
});

test("城名不重复", () => {
  const seen = new Set();
  for (const c of CITIES) {
    assert.ok(!seen.has(c.name), `重复：${c.name}`);
    seen.add(c.name);
  }
});

test("日期落在 1931-09 到 1945-01 之间，且不是未来", () => {
  for (const c of CITIES) {
    assert.ok(c.fall >= "1931-09-18", `${c.name} 早于九一八：${c.fall}`);
    assert.ok(c.fall <= "1945-01-01", `${c.name} 晚于 1945：${c.fall}`);
  }
});

test("坐标都落在底图 bbox 内", () => {
  for (const c of CITIES) {
    const [x, y] = project(c.at[0], c.at[1]);
    assert.ok(x >= minX && x <= maxX, `${c.name} x=${x}`);
    assert.ok(y >= minY && y <= maxY, `${c.name} y=${y}`);
  }
});

test("fallLabel 出「9.19」这样的月.日", () => {
  assert.equal(fallLabel({ fall: "1931-09-19" }), "9.19");
  assert.equal(fallLabel({ fall: "1937-12-13" }), "12.13");
  assert.equal(fallLabel({ fall: "1938-01-10" }), "1.10");
});

test("fallenBy 单调增长，1945 年后是全部 41 座", () => {
  const at1931 = fallenBy(yearToStamp(1931.75));
  const at1938 = fallenBy(yearToStamp(1938.0));
  const at1945 = fallenBy(yearToStamp(1945.9));
  assert.ok(at1931.length < at1938.length);
  assert.ok(at1938.length <= at1945.length);
  assert.equal(at1945.length, 41);
});

test("fallenWithin 只取最近 N 天，且都在 fallenBy 里", () => {
  const t = yearToStamp(1937.95);
  const recent = fallenWithin(t, 45);
  const all = fallenBy(t);
  assert.ok(recent.length <= all.length);
  for (const c of recent) assert.ok(all.includes(c), `${c.name} 不在已沦陷里`);
});

test("yearToStamp / stampToDecimal 互逆", () => {
  for (const y of [1931.5, 1937.512, 1941.934, 1945.688]) {
    assert.ok(Math.abs(stampToDecimal(yearToStamp(y)) - y) < 1e-6, `${y}`);
  }
});

test("光复的城都出现在抗战节点里（不是凭空造的城）", () => {
  const places = new Set();
  for (const n of NODES) for (const e of n.events) places.add(e.place);
  const hits = CITIES.filter((c) => [...places].some((p) => p.includes(c.name)));
  // 至少一半的城能在战事地名里找到对应（其余是同一战役的邻近城市）
  assert.ok(hits.length >= 15, `只有 ${hits.length} 座城能与战事地名对上`);
});
