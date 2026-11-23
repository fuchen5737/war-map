import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOMENTS, momentOf, momentNodes } from "../data/moments.js";
import { NODES } from "../src/nodes.js";
import { project } from "../src/geo.js";

const base = JSON.parse(readFileSync(new URL("../data/geo/basemap.json", import.meta.url)));
const [minX, minY, maxX, maxY] = base.bbox;
const nodeIds = new Set(NODES.map((n) => n.id));

test("每一节特写都挂在一个真实存在的节点上", () => {
  assert.ok(MOMENTS.length >= 2);
  for (const m of MOMENTS) {
    assert.ok(nodeIds.has(m.node), `节点不存在：${m.node}`);
  }
});

test("节点不重复（一节只能有一种画法）", () => {
  const seen = new Set();
  for (const m of MOMENTS) {
    assert.ok(!seen.has(m.node), `重复：${m.node}`);
    seen.add(m.node);
  }
});

test("kind 只有 massacre 与 surrender 两种", () => {
  for (const m of MOMENTS) {
    assert.ok(["massacre", "surrender"].includes(m.kind), `${m.node} kind=${m.kind}`);
  }
});

test("标题、副题、注文都不为空", () => {
  for (const m of MOMENTS) {
    for (const k of ["title", "sub", "kicker", "note"]) {
      assert.ok(typeof m[k] === "string" && m[k].length > 0, `${m.node} 缺 ${k}`);
    }
  }
});

test("南京大屠杀：光点数 × 每点人数 = 30 万", () => {
  const m = momentOf("aj-2/5");
  assert.ok(m, "没有登记南京大屠杀");
  assert.equal(m.kind, "massacre");
  assert.match(m.title, /南京大屠杀/);
  assert.match(m.kicker, /30\s*万/);
  const per = m.note.match(/([一二三四五六七八九十百千万]+)人/);
  assert.ok(per, "注文里要写每个光点代表多少人");
  const digits = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const perDot = digits[per[1][0]] * (per[1].includes("百") ? 100 : per[1].includes("千") ? 1000 : 1);
  assert.equal(m.dots * perDot, 300000, `光点 ${m.dots} × ${perDot} ≠ 30 万`);
});

test("南京受降：光复城市 41 / 41", () => {
  const m = momentOf("aj-4/4");
  assert.ok(m, "没有登记南京受降");
  assert.equal(m.kind, "surrender");
  assert.match(m.kicker, /41/);
});

test("坐标都落在底图 bbox 内", () => {
  for (const m of MOMENTS) {
    const [x, y] = project(m.at[0], m.at[1]);
    assert.ok(x >= minX && x <= maxX, `${m.node} x=${x}`);
    assert.ok(y >= minY && y <= maxY, `${m.node} y=${y}`);
  }
});

test("momentOf 未登记返回 null，momentNodes 与 MOMENTS 对齐", () => {
  assert.equal(momentOf("op-1/1"), null);
  assert.equal(momentOf("nope"), null);
  assert.deepEqual(momentNodes(), MOMENTS.map((m) => m.node));
});
