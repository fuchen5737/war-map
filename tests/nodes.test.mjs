import test from "node:test";
import assert from "node:assert/strict";

import { EVENTS } from "../data/events.js";
import { CAMPAIGNS } from "../data/campaigns.js";
import {
  buildNodes, NODES, nodeIndexAtYear, nextNodeIndex, prevNodeIndex,
  nodeDwell, createNodePlayer, TRAVEL_SEC,
} from "../src/nodes.js";

/* ───────────────────────── 数据完整性 ───────────────────────── */

test("每条战事都恰好属于一个节点", () => {
  const seen = new Map();
  for (const n of NODES) {
    for (const e of n.events) {
      assert.ok(!seen.has(e.id), `${e.id} 被两个节点引用`);
      seen.set(e.id, n.id);
    }
  }
  assert.equal(seen.size, EVENTS.length);
  for (const e of EVENTS) assert.ok(seen.has(e.id), `${e.id} 没有编入任何节点`);
});

test("节点按时间单调排列", () => {
  for (let i = 1; i < NODES.length; i++) {
    assert.ok(NODES[i].year >= NODES[i - 1].year - 1e-9, `第 ${i} 个节点时间倒挂`);
    assert.equal(NODES[i].seq, i);
  }
});

test("节点取自组内最后一条战事的时刻与地点", () => {
  for (const n of NODES) {
    const last = n.events[n.events.length - 1];
    assert.equal(n.date, last.date);
    assert.deepEqual(n.at, last.at);
    assert.equal(n.scale, Math.max(...n.events.map((e) => e.scale)));
  }
});

test("节点的战役元信息与定义一致", () => {
  const byId = new Map(CAMPAIGNS.map((c) => [c.id, c]));
  for (const n of NODES) {
    const c = byId.get(n.campaignId);
    assert.ok(c, `未知战役 ${n.campaignId}`);
    assert.equal(n.campaignName, c.name);
    assert.equal(n.era, c.era);
    assert.equal(n.total, c.nodes.length);
    assert.ok(n.index >= 1 && n.index <= n.total);
    assert.equal(c.nodes[n.index - 1].title, n.title);
  }
});

test("节点 id 唯一，且每场战役的节点都在", () => {
  assert.equal(new Set(NODES.map((n) => n.id)).size, NODES.length);
  for (const c of CAMPAIGNS) {
    const mine = NODES.filter((n) => n.campaignId === c.id);
    assert.equal(mine.length, c.nodes.length, `${c.name} 节点数不对`);
  }
});

test("buildNodes 拒绝重复引用、未知 id 与漏编战事", () => {
  const camp = (nodes) => [{ id: "x", name: "试验", era: "opium", blurb: "", nodes }];
  const ev = (id) => ({ id, date: "1900-01-01", era: "opium", name: id, place: "", at: [110, 30], scale: 1, result: "", note: "" });
  const events = [ev("a"), ev("b")];

  assert.throws(() => buildNodes(camp([{ title: "一", events: ["a", "a"] }, { title: "二", events: ["b"] }]), events), /重复引用/);
  assert.throws(() => buildNodes(camp([{ title: "一", events: ["a", "b", "zzz"] }]), events), /不存在的战事/);
  assert.throws(() => buildNodes(camp([{ title: "一", events: ["a"] }]), events), /没有编入任何节点/);
});

test("buildNodes 同刻节点按战役定义顺序稳定排序", () => {
  const events = [
    { id: "a", date: "1900-05-01", era: "opium", name: "a", place: "", at: [110, 30], scale: 1, result: "", note: "" },
    { id: "b", date: "1900-05-01", era: "opium", name: "b", place: "", at: [111, 31], scale: 1, result: "", note: "" },
  ];
  const camp = [
    { id: "c1", name: "甲", era: "opium", blurb: "", nodes: [{ title: "甲一", events: ["a"] }] },
    { id: "c2", name: "乙", era: "opium", blurb: "", nodes: [{ title: "乙一", events: ["b"] }] },
  ];
  const nodes = buildNodes(camp, events);
  assert.deepEqual(nodes.map((n) => n.id), ["c1/1", "c2/1"]);
});

/* ───────────────────────── 时点定位 ───────────────────────── */

test("nodeIndexAtYear 与线性扫描一致", () => {
  const linear = (year) => {
    let k = 0;
    for (let i = 0; i < NODES.length; i++) if (NODES[i].year <= year) k = i;
    return k;
  };
  const probes = [1800, 1840, 1840.46, 1840.47, 1850, 1900, 1937.7, 1949, 1949.99, 2000];
  for (let i = 0; i < NODES.length; i++) probes.push(NODES[i].year, NODES[i].year - 1e-6, NODES[i].year + 1e-6);
  for (const y of probes) assert.equal(nodeIndexAtYear(NODES, y), linear(y), `year=${y}`);
});

test("nodeIndexAtYear 夹在两端", () => {
  assert.equal(nodeIndexAtYear(NODES, 1000), 0);
  assert.equal(nodeIndexAtYear(NODES, 9999), NODES.length - 1);
  assert.equal(nodeIndexAtYear([], 1900), -1);
});

test("nextNodeIndex / prevNodeIndex 严格跨越", () => {
  const k = Math.floor(NODES.length / 2);
  const y = NODES[k].year;
  assert.equal(nextNodeIndex(NODES, y), k + 1);
  assert.equal(prevNodeIndex(NODES, y), k - 1);
  assert.equal(nextNodeIndex(NODES, NODES[0].year - 1), 0);
  assert.equal(prevNodeIndex(NODES, NODES[0].year), -1);
  assert.equal(nextNodeIndex(NODES, NODES[NODES.length - 1].year), -1);
  assert.equal(prevNodeIndex(NODES, NODES[NODES.length - 1].year), NODES.length - 2);
  // 两端之外
  assert.equal(nextNodeIndex(NODES, 1800), 0);
  assert.equal(prevNodeIndex(NODES, 9999), NODES.length - 1);
});

/* ───────────────────────── 停留时长 ───────────────────────── */

test("nodeDwell 夹在 [min,max] 且单调", () => {
  assert.equal(nodeDwell({ events: [1], scale: 1 }), 1.15);
  assert.ok(nodeDwell({ events: [1, 2, 3], scale: 1 }) > nodeDwell({ events: [1], scale: 1 }));
  assert.ok(nodeDwell({ events: [1], scale: 3 }) > nodeDwell({ events: [1], scale: 1 }));
  assert.ok(nodeDwell({ events: new Array(50).fill(1), scale: 3 }) <= 3);
  assert.ok(nodeDwell({ events: [], scale: 1 }) >= 1);
});

/* ───────────────────────── 播放器 ───────────────────────── */

function makePlayer(index = 0) {
  return createNodePlayer({ nodes: NODES, from: 1840, to: 1950, index });
}

test("播放逐节点推进，年份在节点之间过渡", () => {
  const p = makePlayer(0);
  p.play(0);
  assert.equal(p.playing, true);
  assert.equal(p.mode, "node");
  assert.equal(p.index, 0);
  assert.equal(p.year, NODES[0].year);

  // 停留期内年份不动
  assert.deepEqual(p.tick(0.2, 10), []);
  assert.equal(p.year, NODES[0].year);

  // 停留走完 → 进入过渡：下标已经到下一个，年份还在路上
  let stamp = 100;
  for (let i = 0; i < 200 && p.index === 0; i++) p.tick(0.05, (stamp += 50));
  assert.equal(p.index, 1);
  for (let i = 0; i < 3; i++) p.tick(0.05, (stamp += 50));
  assert.ok(p.year > NODES[0].year && p.year < NODES[1].year, "过渡期年份应在两节点之间");

  // 过渡走完，节点才上报
  const arrived = [];
  for (let i = 0; i < 200 && arrived.length === 0; i++) {
    arrived.push(...p.tick(0.05, (stamp += 50)));
  }
  assert.equal(arrived.length, 1);
  assert.equal(arrived[0].id, NODES[1].id);
  assert.equal(p.year, NODES[1].year);
});

test("tick 不重复上报同一节点", () => {
  const p = makePlayer(0);
  p.play(0);
  const seen = new Set();
  let stamp = 0;
  for (let i = 0; i < 20000; i++) {
    for (const n of p.tick(0.05, (stamp += 50))) {
      assert.ok(!seen.has(n.id), `${n.id} 被上报两次`);
      seen.add(n.id);
    }
    if (!p.playing) break;
  }
  // 起点所在的那个节点是「已经在场」的，不算被上报；其余每个节点各报一次
  assert.equal(seen.size, NODES.length - 1);
  for (const n of NODES.slice(1)) assert.ok(seen.has(n.id), `${n.id} 没被播到`);
});

test("走到末节点自动停并标记 atEnd", () => {
  const p = makePlayer(NODES.length - 1);
  assert.equal(p.atEnd, false);
  p.play(0);
  let stamp = 0;
  for (let i = 0; i < 400; i++) {
    p.tick(0.1, (stamp += 100));
    if (!p.playing) break;
  }
  assert.equal(p.playing, false);
  assert.equal(p.atEnd, true);
  assert.equal(p.index, NODES.length - 1);
});

test("终点再按播放会从头开始", () => {
  const p = makePlayer(NODES.length - 1);
  p.play(0);
  let stamp = 0;
  for (let i = 0; i < 400 && p.playing; i++) p.tick(0.1, (stamp += 100));
  assert.equal(p.atEnd, true);
  p.play(stamp);
  assert.equal(p.playing, true);
  assert.equal(p.index, 0);
});

test("seekNode 瞬时到位，seekFree 保留年份", () => {
  const p = makePlayer(0);
  p.seekNode(10, 0);
  assert.equal(p.index, 10);
  assert.equal(p.year, NODES[10].year);
  assert.equal(p.mode, "node");

  p.seekFree(1901.25, 0);
  assert.equal(p.mode, "free");
  assert.equal(p.year, 1901.25);
  assert.equal(p.index, nodeIndexAtYear(NODES, 1901.25));
});

test("seekFree 把年份夹在时间轴区间内", () => {
  const p = makePlayer(0);
  p.seekFree(1700, 0);
  assert.equal(p.year, 1840);
  p.seekFree(2999, 0);
  assert.equal(p.year, 1950);
});

test("free 模式起播吸附到之后的节点，不倒退", () => {
  const p = makePlayer(0);
  p.seekFree(1901.25, 0);
  const k = nodeIndexAtYear(NODES, 1901.25);
  p.play(0);
  assert.equal(p.mode, "node");
  assert.equal(p.playing, true);
  assert.ok(p.index >= k, "起播不应退回到当前年份之前的节点");
});

test("freshness 只在刚点亮后小于 1，向前拖标点、向后拖清空", () => {
  const p = makePlayer(0);
  p.seekNode(5, 1000);
  const ids = NODES[5].events.map((e) => e.id);
  assert.ok(ids.every((id) => p.freshness(id, 1000, 1600) === 0));
  assert.ok(ids.every((id) => p.freshness(id, 1800, 1600) > 0.4 && p.freshness(id, 1800, 1600) < 0.6));
  assert.ok(ids.every((id) => p.freshness(id, 9000, 1600) === 1));

  p.seekFree(1911, 2000);
  assert.ok(NODES[nodeIndexAtYear(NODES, 1911)].events.every((e) => p.freshness(e.id, 2000, 1600) === 0));
  p.seekFree(1850, 3000);
  assert.ok(EVENTS.every((e) => p.freshness(e.id, 3000, 1600) === 1), "向后拖应清空所有涟漪");
});

test("dwellProgress 在停留期递增，过渡期为 0", () => {
  const p = makePlayer(1);
  p.play(0);
  assert.equal(p.dwellProgress, 0);
  p.tick(0.2, 10);
  const mid = p.dwellProgress;
  assert.ok(mid > 0 && mid < 1);

  // 跨过节点的瞬间进入过渡期，进度归零
  let stamp = 20;
  const before = p.index;
  for (let i = 0; i < 200 && p.index === before; i++) p.tick(0.05, (stamp += 50));
  assert.equal(p.index, before + 1);
  assert.equal(p.dwellProgress, 0);
});

test("TRAVEL_SEC 短于最短停留，节拍不会糊成一片", () => {
  assert.ok(TRAVEL_SEC > 0);
  assert.ok(TRAVEL_SEC < nodeDwell({ events: [], scale: 1 }));
});
