// 绘图组件库的单元测试。
//
// 这些组件不碰 DOM、不认战事数据，只吃「一个 2D 上下文的子集 + 参数」，
// 所以能在 node 里用替身上下文测：几何算错、颜色解析错、折行切错，
// 都会在这里先暴露，而不是等到截图里才发现一片白。

import test from "node:test";
import assert from "node:assert/strict";

import {
  clamp,
  lerp,
  easeOut,
  smoothstep,
  pulse,
  window01,
  parseHex,
  rgba,
  mixColor,
  lighten,
} from "../src/kit/ease.js";
import { hatchTileSize } from "../src/kit/hatch.js";
import { wrapLines } from "../src/kit/overlay.js";

/* ── 数值工具 ── */

test("clamp / lerp 在边界上不给惊喜", () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 1), 10);
  assert.equal(lerp(0, 10, 0.25), 2.5);
});

test("缓动曲线端点固定、单调不减", () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const v = easeOut(i / 10);
    assert.ok(v >= prev, `easeOut 在第 ${i} 步回退了`);
    prev = v;
  }
  // 前段快、后段慢：一半时间的进度要高于线性
  assert.ok(easeOut(0.5) > 0.5);
});

test("pulse 与 window01 的边界", () => {
  assert.equal(pulse(0), 0);
  assert.ok(Math.abs(pulse(0.5) - 1) < 1e-12);
  assert.ok(Math.abs(pulse(1)) < 1e-12);
  assert.equal(window01(0.5, 1, 1), 0);
  assert.equal(window01(1.5, 1, 1), 0.5);
  assert.equal(window01(2, 1, 1), 1);
  assert.equal(window01(3, 1, 1), 1);
});

/* ── 颜色 ── */

test("parseHex 同时认 hex 与 rgb()/rgba()", () => {
  assert.deepEqual(parseHex("#b3273a"), [179, 39, 58]);
  assert.deepEqual(parseHex("#fff"), [255, 255, 255]);
  assert.deepEqual(parseHex("rgb(18, 52, 86)"), [18, 52, 86]);
  assert.deepEqual(parseHex("rgba(18,52,86,0.5)"), [18, 52, 86]);
  // 解析不了的才退回白色，别静默给个错颜色
  assert.deepEqual(parseHex("nonsense"), [255, 255, 255]);
});

test("rgba 对已有 alpha 的字符串原样返回", () => {
  assert.equal(rgba("#ffffff", 0.5), "rgba(255, 255, 255, 0.5)");
  assert.equal(rgba("rgba(1,2,3,0.4)", 0.9), "rgba(1,2,3,0.4)");
});

test("mixColor / lighten 在 rgb() 输入上仍然正确（曾经把它刷成纯白）", () => {
  // mixColor 返回的是 cssColor 字符串，解析回来要是两个基色之间的灰
  assert.deepEqual(parseHex(mixColor("#000000", "#ffffff", 0.5)), [128, 128, 128]);
  // 关键回归：lighten 的返回值是 rgb() 字符串，再喂回 lighten 不能变白
  const once = lighten("#4ec489", 0.1);
  assert.match(once, /^rgb\(/);
  const twice = lighten(once, 0.2);
  const [r, g, b] = parseHex(twice);
  assert.ok(r < 200 && g < 240 && b < 220, `二次提亮后不应接近纯白，实际 ${twice}`);
  // 绿色的主通道仍应最大，说明色相没被吃掉
  assert.ok(g > r && g > b);
});

test("lighten 只会提亮，不会把通道弄出 0–255", () => {
  const [r1, g1, b1] = parseHex("#102030");
  const [r2, g2, b2] = parseHex(lighten("#102030", 0.5));
  assert.ok(r2 >= r1 && g2 >= g1 && b2 >= b1);
  for (const v of [r2, g2, b2]) assert.ok(v >= 0 && v <= 255);
});

/* ── 斜线纹样 ── */

test("hatchTileSize 与 devicePixelRatio 同比放大", () => {
  const a = hatchTileSize(4, 1);
  const b = hatchTileSize(4, 2);
  assert.equal(b, a * 2);
  assert.ok(a >= 4);
});

test("hatchTileSize 对极端周期仍给出正整数", () => {
  for (const period of [0.2, 1, 3.8, 40]) {
    for (const dpr of [1, 1.5, 2, 3]) {
      const t = hatchTileSize(period, dpr);
      assert.ok(Number.isInteger(t) && t >= 1, `period=${period} dpr=${dpr} → ${t}`);
    }
  }
});

/* ── 折行 ── */

test("wrapLines 按宽度切行，并在上限处停住", () => {
  // 每个字符宽 10px 的替身上下文
  const ctx = { measureText: (s) => ({ width: String(s).length * 10 }) };
  assert.deepEqual(wrapLines(ctx, "一二三四五", 30, 3), ["一二三", "四五"]);
  assert.deepEqual(wrapLines(ctx, "一二三四五六七八", 30, 2), ["一二三", "四五六"]);
  assert.deepEqual(wrapLines(ctx, "", 30, 2), []);
});

test("wrapLines 遇到超长单字也不死循环", () => {
  const ctx = { measureText: (s) => ({ width: String(s).length * 100 }) };
  const out = wrapLines(ctx, "一二三", 10, 2);
  assert.equal(out.length, 2);
  assert.equal(out[0], "一");
});
