// 控制区的累计态：把 data/control.js 的「变化点」展开成「每一节之后的全图状态」。
//
// 纯计算，不碰 DOM、不碰 canvas —— tests/control.test.mjs 直接测这一层。
//
// 三条口径（来自 atlasanimation 那份工艺笔记）：
//   1. 翻色要成「波」，不是同时全亮；一波之内由近及远（从进攻方向内推才读作入侵）。
//   2. 被占领区用进攻方的纯色，不做半透明叠半透明（会得浑浊的第三色）。
//   3. 双方第一帧都在图上 —— 守方是底色，不必另画；攻方进来才上色。

import { CONTROL } from "../data/control.js";
import { FACTIONS } from "../data/units.js";

const FACTION_KEYS = new Set(Object.keys(FACTIONS));

/** 把 CONTROL 按节点序展开成逐节点的变化表，并在构建期做两处校验。 */
export function buildControlSteps(control = CONTROL, nodes) {
  const indexOf = new Map(nodes.map((n, i) => [n.id, i]));
  const byIndex = new Map();

  control.forEach((entry, k) => {
    const idx = indexOf.get(entry.node);
    if (idx === undefined) {
      throw new Error(`控制区引用了不存在的节点：${entry.node}（第 ${k + 1} 条）`);
    }
    const list = byIndex.get(idx) || [];
    for (const [province, faction] of Object.entries(entry.set)) {
      if (!FACTION_KEYS.has(faction)) {
        throw new Error(`控制区阵营未定义：${province} → ${faction}`);
      }
      list.push({ province, faction });
    }
    byIndex.set(idx, list);
  });

  // 逐节点累积。快照是 Map 的浅拷贝，145 节 × 33 省，成本可以忽略。
  const steps = [];
  let held = new Map();
  for (let i = 0; i < nodes.length; i += 1) {
    const raw = byIndex.get(i);
    let changes = null;
    if (raw) {
      const next = new Map(held);
      const list = [];
      for (const { province, faction } of raw) {
        const from = next.get(province) || "gov";
        if (from === faction) continue; // 重复声明，不算变化
        next.set(province, faction);
        list.push({ province, from, to: faction });
      }
      if (list.length) {
        held = next;
        changes = list;
      }
    }
    steps.push({ index: i, nodeId: nodes[i].id, changes, held });
  }
  return steps;
}

/** 第 index 节之后的控制态（Map<省名, 阵营>），缺省全是政府方面。 */
export function controlAt(steps, index) {
  if (!steps.length) return new Map();
  const i = Math.max(0, Math.min(steps.length - 1, index));
  return steps[i].held;
}

/**
 * 本节变化的先后次序：离本节战事越近的省越先翻，最多摊到停留进度的 0.6。
 * points 是 省名 → 投影坐标 的 Map（由渲染层注入一次），缺了也不报错，退回声明顺序。
 */
export function waveOrder(changes, node, points, step = 0.09) {
  if (!changes || !changes.length) return [];
  const center = node && node.at ? node.at : null;
  const dist = (province) => {
    if (!center || !points) return 0;
    const p = points.get(province);
    if (!p) return 0;
    return Math.hypot(p[0] - center[0], p[1] - center[1]);
  };
  return changes
    .map((c, i) => ({ ...c, d: dist(c.province), i }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((c, rank) => ({
      province: c.province,
      from: c.from,
      to: c.to,
      delay: Math.min(0.6, rank * step),
    }));
}

/** 某一波变化在本帧的显色强度（0–1），t 为停留进度。 */
export function waveAlpha(delay, t, span = 0.18) {
  if (!(t > delay)) return 0;
  return Math.min(1, (t - delay) / span);
}
