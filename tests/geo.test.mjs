import test from "node:test";
import assert from "node:assert/strict";

import {
  project,
  unproject,
  createView,
  createInsetView,
  toScreenX,
  toScreenY,
  toMapX,
  toMapY,
  lonLatToScreen,
  screenToLonLat,
  haversine,
} from "../src/geo.js";

const BBOX = [-0.4741, -0.3808, 0.4084, 0.4052];

test("project / unproject 互逆", () => {
  for (const [lon, lat] of [[105, 35], [116.4, 39.9], [121.5, 31.2], [87.6, 43.8], [104, 30]]) {
    const [x, y] = project(lon, lat);
    const [lon2, lat2] = unproject(x, y);
    assert.ok(Math.abs(lon2 - lon) < 1e-6, `经度不互逆：${lon} → ${lon2}`);
    assert.ok(Math.abs(lat2 - lat) < 1e-6, `纬度不互逆：${lat} → ${lat2}`);
  }
});

test("project 保持东西与南北方向", () => {
  const [xa] = project(100, 35);
  const [xb] = project(120, 35);
  assert.ok(xb > xa, "东边的经度应当投影到更大的 x");
  const [, ya] = project(105, 20);
  const [, yb] = project(105, 45);
  assert.ok(yb > ya, "北边的纬度应当投影到更大的 y");
});

test("createView：bbox 完整落在画布内，且长边贴满、整体居中", () => {
  const W = 800;
  const H = 600;
  const view = createView(BBOX, W, H);
  const [minX, minY, maxX, maxY] = BBOX;
  const left = toScreenX(view, minX);
  const right = toScreenX(view, maxX);
  const top = toScreenY(view, maxY);
  const bottom = toScreenY(view, minY);
  assert.ok(left >= -1e-6 && right <= W + 1e-6, "横向越出画布");
  assert.ok(top >= -1e-6 && bottom <= H + 1e-6, "纵向越出画布");
  // 等比缩放：不会拉伸变形，所以最多只有一条边贴满
  const fillsW = Math.abs(right - left - W) < 1e-6;
  const fillsH = Math.abs(bottom - top - H) < 1e-6;
  assert.ok(fillsW || fillsH, "既没贴满宽也没贴满高，缩放算错了");
  // 未贴满的方向必须居中
  if (!fillsW) assert.ok(Math.abs((left + right) / 2 - W / 2) < 1e-6, "横向未居中");
  if (!fillsH) assert.ok(Math.abs((top + bottom) / 2 - H / 2) < 1e-6, "纵向未居中");
});

test("toScreen / toMap 互逆", () => {
  const view = createView(BBOX, 800, 600);
  for (const [x, y] of [[0, 0], [0.1, -0.2], [-0.4, 0.3]]) {
    assert.ok(Math.abs(toMapX(view, toScreenX(view, x)) - x) < 1e-9);
    assert.ok(Math.abs(toMapY(view, toScreenY(view, y)) - y) < 1e-9);
  }
});

test("lonLatToScreen 与 screenToLonLat 互逆", () => {
  const view = createView(BBOX, 900, 700);
  for (const [lon, lat] of [[116.4, 39.9], [121.5, 31.2], [113.3, 23.1]]) {
    const [sx, sy] = lonLatToScreen(view, lon, lat);
    const [lon2, lat2] = screenToLonLat(view, sx, sy);
    assert.ok(Math.abs(lon2 - lon) < 1e-6);
    assert.ok(Math.abs(lat2 - lat) < 1e-6);
  }
});

test("createInsetView：只在空闲矩形内铺开，不钻到面板底下", () => {
  const inset = { left: 268, right: 304, top: 0, bottom: 92 };
  const view = createInsetView(BBOX, 1440, 900, inset, 1);
  assert.equal(view.freeW, 1440 - 268 - 304);
  assert.equal(view.freeH, 900 - 0 - 92);
  const [minX, minY, maxX, maxY] = BBOX;
  const left = toScreenX(view, minX);
  const right = toScreenX(view, maxX);
  const top = toScreenY(view, maxY);
  const bottom = toScreenY(view, minY);
  // 内容必须完整落在空闲区内（允许 0.5px 的取整误差）
  assert.ok(left >= inset.left - 0.5, `左边界 ${left} 侵入了左栏`);
  assert.ok(right <= 1440 - inset.right + 0.5, `右边界 ${right} 侵入了右栏`);
  assert.ok(top >= inset.top - 0.5, `上边界 ${top} 越界`);
  assert.ok(bottom <= 900 - inset.bottom + 0.5, `下边界 ${bottom} 侵入控制条`);
  // 至少有一边是贴满的——否则说明缩放算错了，白白浪费空间
  const fitsW = Math.abs(right - left - view.freeW) < 1;
  const fitsH = Math.abs(bottom - top - view.freeH) < 1;
  assert.ok(fitsW || fitsH, "内容既没占满宽度也没占满高度，缩放比例有问题");
});

test("createInsetView：内容居中于空闲区", () => {
  const inset = { left: 200, right: 200, top: 0, bottom: 100 };
  const view = createInsetView(BBOX, 1200, 800, inset, 1);
  const [minX, , maxX] = BBOX;
  const cx = (toScreenX(view, minX) + toScreenX(view, maxX)) / 2;
  const freeCx = 200 + (1200 - 200 - 200) / 2;
  assert.ok(Math.abs(cx - freeCx) < 1e-6, `水平中心 ${cx} 未对齐空闲区中心 ${freeCx}`);
});

test("createInsetView：缩放放大后内容变大但仍以空闲区为中心", () => {
  const inset = { left: 100, right: 100, top: 50, bottom: 50 };
  const a = createInsetView(BBOX, 1000, 700, inset, 1);
  const b = createInsetView(BBOX, 1000, 700, inset, 2);
  assert.ok(Math.abs(b.s - a.s * 2) < 1e-9, "zoom=2 时比例尺应当翻倍");
  const cx = (toScreenX(b, BBOX[0]) + toScreenX(b, BBOX[2])) / 2;
  const freeCx = 100 + (1000 - 200) / 2;
  assert.ok(Math.abs(cx - freeCx) < 1e-6);
});

test("createInsetView：极小视口不会算出 0 或负数尺寸", () => {
  const view = createInsetView(BBOX, 300, 200, { left: 260, right: 260, top: 0, bottom: 190 }, 1);
  assert.ok(view.freeW >= 80, `freeW 塌缩到 ${view.freeW}`);
  assert.ok(view.freeH >= 80, `freeH 塌缩到 ${view.freeH}`);
  assert.ok(Number.isFinite(view.s) && view.s > 0, "比例尺必须为正");
});

test("haversine 给出可信的距离", () => {
  // 北京—上海约 1067 km
  const d = haversine([116.4, 39.9], [121.47, 31.23]);
  assert.ok(d > 1000 && d < 1150, `京沪距离 ${d.toFixed(0)} km 不合理`);
  // 同一点距离为 0
  assert.ok(haversine([120, 30], [120, 30]) < 1e-9);
  // 对称
  assert.ok(Math.abs(haversine([100, 20], [130, 40]) - haversine([130, 40], [100, 20])) < 1e-9);
});
