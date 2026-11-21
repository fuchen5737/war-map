import test from "node:test";
import assert from "node:assert/strict";

import { EVENTS } from "../data/events.js";
import { UNITS, FACTIONS, ARMS, unitOf } from "../data/units.js";

test("每条战事都有单位符号，没有遗漏", () => {
  const missing = EVENTS.filter((e) => !UNITS[e.id]).map((e) => e.id);
  assert.deepEqual(missing, [], `这些战事还没定符号：${missing.join(", ")}`);
});

test("符号表里没有指向不存在战事的条目", () => {
  const ids = new Set(EVENTS.map((e) => e.id));
  const extra = Object.keys(UNITS).filter((id) => !ids.has(id));
  assert.deepEqual(extra, [], `这些条目对不上任何战事：${extra.join(", ")}`);
});

test("阵营与兵种都必须是已定义的键", () => {
  for (const [id, [faction, arm]] of Object.entries(UNITS)) {
    assert.ok(FACTIONS[faction], `${id} 的阵营 ${faction} 未定义`);
    assert.ok(ARMS[arm], `${id} 的兵种 ${arm} 未定义`);
  }
});

test("每个阵营、每个兵种都真的用上了", () => {
  const factions = new Set(Object.values(UNITS).map((u) => u[0]));
  const arms = new Set(Object.values(UNITS).map((u) => u[1]));
  assert.deepEqual([...Object.keys(FACTIONS)].sort(), [...factions].sort());
  assert.deepEqual([...Object.keys(ARMS)].sort(), [...arms].sort());
});

test("unitOf 给出颜色与可读标签", () => {
  const u = unitOf("aj-1937-songhu");
  assert.equal(u.faction, "gov");
  assert.equal(u.arm, "inf");
  assert.match(u.color, /^#[0-9a-f]{6}$/i);
  assert.match(u.label, /·/);
});

test("unitOf 对未登记的战事返回 null 而不是抛错", () => {
  assert.equal(unitOf("nope-0000-x"), null);
});

test("事件类战事一律标为政治事件，不画成部队", () => {
  // 条约、建都、事变、退位这类不该有行军箭头，也不该显示成兵种符号
  const political = ["op-1842-nanjing", "jw-1895-maguan", "bx-1901-xinchou", "xh-1912-tuiwei", "aj-1936-xian", "lb-1945-chongqing"];
  for (const id of political) {
    assert.equal(UNITS[id]?.[1], "pol", `${id} 应当标为政治事件`);
  }
});
