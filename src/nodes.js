// 战役节点：把 EVENTS 编成「战役 → 阶段节点」两级，并按时间排成一条播放序列。
//
// 设计要点：
// - 一个节点是同一阶段内的一组战事（多为 1—3 条），节点的时刻取组内**最后**一条的日期。
//   到达节点即表示整组都已发生，所以画面上这一组点会一起亮。
// - 节点按全局时间排序，战役只是分组与命名。捻军（1855—68）因此会自然穿插在
//   太平天国（1851—64）中间，不会为了保持分组把年代顺序打乱。
// - 播放按节点推进：停在节点上看清楚，再切到下一个节点；年份在节点之间做短促过渡，
//   停留期间钉在节点时刻，不撒谎说时间在连续流逝。

import { EVENTS, decimalYear } from "../data/events.js";
import { CAMPAIGNS } from "../data/campaigns.js";

const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

/**
 * 把战役定义展开成节点数组（已按时间排序）。
 * 数据不一致时直接抛错——宁可构建期炸掉，也不要运行时静默漏掉一条战事。
 */
export function buildNodes(campaigns = CAMPAIGNS, events = EVENTS) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const used = new Map();
  const nodes = [];

  for (const c of campaigns) {
    c.nodes.forEach((n, i) => {
      const evs = n.events.map((id) => {
        const e = byId.get(id);
        if (!e) throw new Error(`战役「${c.name}」的节点「${n.title}」引用了不存在的战事：${id}`);
        if (used.has(id)) throw new Error(`战事 ${id} 被两个节点重复引用：「${used.get(id)}」与「${n.title}」`);
        used.set(id, n.title);
        return e;
      });
      const last = evs[evs.length - 1];
      nodes.push({
        id: `${c.id}/${i + 1}`,
        campaignId: c.id,
        campaignName: c.name,
        campaignBlurb: c.blurb,
        era: c.era,
        title: n.title,
        index: i + 1,
        total: c.nodes.length,
        year: decimalYear(last.date),
        date: last.date,
        at: last.at,
        scale: Math.max(...evs.map((e) => e.scale)),
        events: evs,
      });
    });
  }

  const missing = events.filter((e) => !used.has(e.id)).map((e) => e.id);
  if (missing.length) throw new Error(`有战事没有编入任何节点：${missing.join(", ")}`);

  // 同刻的节点按战役定义顺序排，保证每次运行顺序一致
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  nodes.sort((a, b) => a.year - b.year || order.get(a.id) - order.get(b.id));
  nodes.forEach((n, i) => {
    n.seq = i;
  });
  return nodes;
}

export const NODES = buildNodes();

/** 某年份落在哪个节点上（返回下标；早于首节点返回 0，晚于末节点返回末位） */
export function nodeIndexAtYear(nodes, year) {
  let lo = 0;
  let hi = nodes.length - 1;
  if (hi < 0) return -1;
  if (year <= nodes[0].year) return 0;
  if (year >= nodes[hi].year) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (nodes[mid].year <= year) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** 严格晚于该年份的第一个节点下标；没有则 -1 */
export function nextNodeIndex(nodes, year, eps = 1e-9) {
  const i = nodeIndexAtYear(nodes, year);
  if (i < 0) return -1;
  if (nodes[i].year > year + eps) return i;
  return i + 1 < nodes.length ? i + 1 : -1;
}

/** 严格早于该年份的最后一个节点下标；没有则 -1 */
export function prevNodeIndex(nodes, year, eps = 1e-9) {
  const i = nodeIndexAtYear(nodes, year);
  if (i < 0) return -1;
  if (nodes[i].year < year - eps) return i;
  return i - 1 >= 0 ? i - 1 : -1;
}

/** 节点停留时长（秒）：战事多、规模大的节点多看一会儿 */
export function nodeDwell(node, opts = {}) {
  const { base = 1.15, perEvent = 0.4, big = 0.35, min = 1.0, max = 3.0 } = opts;
  let d = base + (node.events.length - 1) * perEvent;
  if (node.scale >= 3) d += big;
  return Math.min(max, Math.max(min, d));
}

/** 节点之间的年份过渡时长（秒） */
export const TRAVEL_SEC = 0.42;

const easeOut = (t) => 1 - (1 - t) ** 2;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * 节点播放器。
 *
 * 两种模式：
 * - `node`：钉在节点上。停留期年份不动，过渡期在相邻两节点间插值。播放走这个模式。
 * - `free`：年份就是用户拖到的那一格。拖动年表尺走这个模式，否则指针会「粘」在节点上。
 *
 * 从 free 起播时，先吸附到当前年份所在（或之后）的节点，再开始走。
 */
export function createNodePlayer({ nodes, from, to, index = 0, dwellOpts } = {}) {
  let mode = "node";
  let i = Math.max(0, Math.min(nodes.length - 1, index));
  let phase = "dwell"; // dwell | travel
  let t = 0; // 当前阶段已过的秒数
  let playing = false;
  let freeYear = nodes[i] ? nodes[i].year : from;
  let fromYear = freeYear;
  const fresh = new Map();

  const nodeAt = (k) => nodes[Math.max(0, Math.min(nodes.length - 1, k))];
  const dwellOf = (n) => nodeDwell(n, dwellOpts);

  function markFresh(n, stamp) {
    if (stamp == null) return;
    for (const e of n.events) fresh.set(e.id, stamp);
  }

  const api = {
    get mode() {
      return mode;
    },
    get index() {
      return i;
    },
    get node() {
      return nodeAt(i);
    },
    get playing() {
      return playing;
    },
    get atEnd() {
      return i >= nodes.length - 1 && phase === "dwell" && t >= dwellOf(nodeAt(i)) - 1e-9;
    },
    /** 当前年份：free 模式原样返回，node 模式在过渡期插值 */
    get year() {
      if (mode === "free") return freeYear;
      const n = nodeAt(i);
      if (phase !== "travel") return n.year;
      const k = easeOut(clamp01(t / TRAVEL_SEC));
      return fromYear + (n.year - fromYear) * k;
    },
    /** 当前节点已停留的比例 0→1，供界面画进度 */
    get dwellProgress() {
      if (mode === "free" || phase !== "dwell") return 0;
      return clamp01(t / dwellOf(nodeAt(i)));
    },

    play(stamp) {
      if (api.atEnd) {
        api.seekNode(0, stamp);
      }
      if (mode === "free") {
        // 从自由年份起播：吸附到「当前年份之后」的第一个节点，别倒回去
        const k = nextNodeIndex(nodes, freeYear);
        api.seekNode(k < 0 ? nodes.length - 1 : k, stamp);
      }
      playing = true;
    },
    pause() {
      playing = false;
    },
    toggle(stamp) {
      if (playing) api.pause();
      else api.play(stamp);
    },

    /** 跳到第 k 个节点（瞬时到位，不走过场） */
    seekNode(k, stamp) {
      i = Math.max(0, Math.min(nodes.length - 1, k));
      mode = "node";
      phase = "dwell";
      t = 0;
      freeYear = nodeAt(i).year;
      markFresh(nodeAt(i), stamp);
    },

    /** 拖动年表尺：年份自由，节点下标跟着推 */
    seekFree(year, stamp) {
      const y = Math.max(from, Math.min(to, year));
      const forward = y > freeYear;
      mode = "free";
      freeYear = y;
      i = nodeIndexAtYear(nodes, y);
      phase = "dwell";
      t = 0;
      if (forward && stamp != null) {
        // 向前拖：途中跨过的节点都算「刚发生」，但只保留最近三个，免得满屏涟漪
        for (let k = Math.max(0, i - 2); k <= i; k++) markFresh(nodeAt(k), stamp);
      } else {
        fresh.clear();
      }
    },

    /** 推进一帧；返回本帧新点亮的节点（通常 0 或 1 个） */
    tick(dtSec, stamp) {
      if (!playing) return [];
      if (mode === "free") api.play(stamp);
      let born = [];
      t += Math.min(dtSec, 0.1);

      if (phase === "travel") {
        if (t >= TRAVEL_SEC) {
          t -= TRAVEL_SEC;
          phase = "dwell";
          born.push(nodeAt(i));
        }
      }
      if (phase === "dwell" && t >= dwellOf(nodeAt(i))) {
        if (i >= nodes.length - 1) {
          t = dwellOf(nodeAt(i));
          playing = false;
        } else {
          t = 0;
          fromYear = nodeAt(i).year;
          i += 1;
          phase = "travel";
          // 过渡一开始就点亮：年份扫到哪儿，哪儿就起涟漪；等落地才点亮会显得滞后
          markFresh(nodeAt(i), stamp);
        }
      }
      return born;
    },

    /** 某条战事的「刚出现」进度 0→1；不在动画窗口内返回 1 */
    freshness(id, stamp, ms = 1600) {
      const t0 = fresh.get(id);
      if (t0 == null) return 1;
      const p = (stamp - t0) / ms;
      return p >= 1 ? 1 : Math.max(0, p);
    },
  };

  return api;
}
