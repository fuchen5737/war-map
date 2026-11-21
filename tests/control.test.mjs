import test from "node:test";
import assert from "node:assert/strict";

import { NODES } from "../src/nodes.js";
import { buildControlSteps, controlAt, waveOrder, waveAlpha } from "../src/control.js";
import { CONTROL } from "../data/control.js";
import { FACTIONS } from "../data/units.js";
import basemap from "../data/geo/basemap.json" with { type: "json" };

const PROVINCES = new Set(basemap.provinces.map((p) => p.name));
const NODE_IDS = new Set(NODES.map((n) => n.id));

test("控制区数据：节点 id 都真实存在", () => {
  for (const entry of CONTROL) {
    assert.ok(NODE_IDS.has(entry.node), `未知节点 ${entry.node}`);
  }
});

test("控制区数据：省名都在底图里（写错一个就构建期炸）", () => {
  for (const entry of CONTROL) {
    for (const name of Object.keys(entry.set)) {
      assert.ok(PROVINCES.has(name), `${entry.node} 引用了底图里没有的省：${name}`);
    }
  }
});

test("控制区数据：阵营都是已定义的键", () => {
  for (const entry of CONTROL) {
    for (const [name, faction] of Object.entries(entry.set)) {
      assert.ok(FACTIONS[faction], `${entry.node} 的 ${name} 用了未定义阵营 ${faction}`);
    }
  }
});

test("buildControlSteps：节点数与节点数组一一对应", () => {
  const steps = buildControlSteps(undefined, NODES);
  assert.equal(steps.length, NODES.length);
  steps.forEach((s, i) => assert.equal(s.nodeId, NODES[i].id));
});

test("buildControlSteps：累计态单调——后一节包含前一节尚未交出的省", () => {
  const steps = buildControlSteps(undefined, NODES);
  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1].held;
    const cur = steps[i].held;
    const changed = new Set((steps[i].changes || []).map((c) => c.province));
    for (const [name, faction] of prev) {
      if (changed.has(name)) continue;
      assert.equal(cur.get(name), faction, `第 ${i} 节 ${name} 无故改变`);
    }
  }
});

test("buildControlSteps：没有变化的节点 changes 为 null", () => {
  const steps = buildControlSteps(undefined, NODES);
  assert.ok(steps[0].changes === null, "第一节不该有变化（首条是英舰队抵珠江口）");
});

test("buildControlSteps：重复声明同一状态不算变化", () => {
  const nodes = NODES.slice(0, 3);
  const steps = buildControlSteps(
    [
      { node: nodes[1].id, set: { 江苏: "rev" } },
      { node: nodes[2].id, set: { 江苏: "rev" } },
    ],
    nodes,
  );
  assert.ok(steps[1].changes);
  assert.equal(steps[2].changes, null);
  assert.equal(steps[2].held.get("江苏"), "rev");
});

test("buildControlSteps：未知节点抛错", () => {
  assert.throws(
    () => buildControlSteps([{ node: "nope/1", set: { 江苏: "rev" } }], NODES),
    /不存在的节点/,
  );
});

test("buildControlSteps：未定义阵营抛错", () => {
  assert.throws(
    () => buildControlSteps([{ node: NODES[0].id, set: { 江苏: "alien" } }], NODES),
    /阵营未定义/,
  );
});

test("controlAt：夹取两端，缺省全是政府方面", () => {
  const steps = buildControlSteps(undefined, NODES);
  assert.equal(controlAt([], 0).size, 0);
  assert.equal(controlAt(steps, -5).size, controlAt(steps, 0).size);
  assert.equal(controlAt(steps, 9999).size, controlAt(steps, steps.length - 1).size);
});

test("controlAt：香港自鸦片战争起一直在列强手里，直到抗战受降", () => {
  const steps = buildControlSteps(undefined, NODES);
  const at = (id) => controlAt(steps, NODES.findIndex((n) => n.id === id));
  assert.equal(at("op-1/4").get("香港"), undefined);
  assert.equal(at("op-1/5").get("香港"), "west");
  assert.equal(at("aj-3/3").get("香港"), "west");
  assert.equal(at("aj-3/4").get("香港"), "jp");
  assert.equal(at("aj-4/3").get("香港"), "gov");
});

test("controlAt：东北在九一八后归日、日本投降后归还、辽沈后归革命武装", () => {
  const steps = buildControlSteps(undefined, NODES);
  const at = (id) => controlAt(steps, NODES.findIndex((n) => n.id === id));
  assert.equal(at("aj-1/1").get("辽宁"), "jp");
  assert.equal(at("aj-1/2").get("吉林"), "jp");
  assert.equal(at("aj-4/2").get("吉林"), "jp");
  assert.equal(at("aj-4/3").get("吉林"), "gov");
  assert.equal(at("lb-1/6").get("吉林"), "rev");
});

test("controlAt：日俄战争后辽宁先归日、抗战受降归还", () => {
  const steps = buildControlSteps(undefined, NODES);
  const at = (id) => controlAt(steps, NODES.findIndex((n) => n.id === id));
  assert.equal(at("rj-1/6").get("辽宁"), undefined);
  assert.equal(at("rj-1/7").get("辽宁"), "jp");
  assert.equal(at("wl-2/8").get("辽宁"), "gov");
});

test("controlAt：太平天国据江浙皖赣，天京陷落尽失", () => {
  const steps = buildControlSteps(undefined, NODES);
  const at = (id) => controlAt(steps, NODES.findIndex((n) => n.id === id));
  assert.equal(at("tp-1/5").get("江苏"), "rev");
  assert.equal(at("tp-1/9").get("浙江"), "rev");
  assert.equal(at("tp-1/10").get("安徽"), "gov");
  assert.equal(at("tp-1/13").get("江苏"), "gov");
  assert.equal(at("tp-1/13").get("浙江"), "gov");
});

test("controlAt：1950 年只剩港台之外全部归政府/革命武装，无列强残留", () => {
  const steps = buildControlSteps(undefined, NODES);
  const last = controlAt(steps, steps.length - 1);
  for (const [name, faction] of last) {
    assert.notEqual(faction, "jp", `末节 ${name} 仍是日本占领`);
    assert.notEqual(faction, "west", `末节 ${name} 仍是列强占领`);
  }
});

test("waveOrder：按到战事的距离排序，delay 单调不减且有上限", () => {
  const changes = [
    { province: "新疆", from: "gov", to: "rev" },
    { province: "江苏", from: "gov", to: "rev" },
    { province: "上海", from: "gov", to: "rev" },
  ];
  const points = new Map([["新疆", [-0.4, 0.1]], ["江苏", [0.2, -0.05]], ["上海", [0.22, -0.07]]]);
  const node = { at: [121.5, 31.2] }; // 上海附近
  const out = waveOrder(changes, node, points);
  assert.equal(out.length, 3);
  assert.equal(out[0].province, "上海");
  assert.equal(out[1].province, "江苏");
  assert.equal(out[2].province, "新疆");
  for (let i = 1; i < out.length; i += 1) assert.ok(out[i].delay >= out[i - 1].delay);
  for (const o of out) assert.ok(o.delay <= 0.6);
});

test("waveOrder：没有坐标时退回声明顺序，不抛错", () => {
  const changes = [
    { province: "甲", from: "gov", to: "rev" },
    { province: "乙", from: "gov", to: "rev" },
  ];
  const out = waveOrder(changes, { at: [120, 30] }, null);
  assert.deepEqual(out.map((o) => o.province), ["甲", "乙"]);
});

test("waveOrder：空输入返回空数组", () => {
  assert.deepEqual(waveOrder(null, null, null), []);
  assert.deepEqual(waveOrder([], null, null), []);
});

test("waveAlpha：未到点 0，到点后 span 内升到 1 并夹住", () => {
  assert.equal(waveAlpha(0.2, 0.1), 0);
  assert.equal(waveAlpha(0.2, 0.2), 0);
  assert.ok(waveAlpha(0.2, 0.29) > 0 && waveAlpha(0.2, 0.29) < 1);
  assert.equal(waveAlpha(0.2, 0.38), 1);
  assert.equal(waveAlpha(0.2, 5), 1);
});
