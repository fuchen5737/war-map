// 时间轴逻辑：纯函数，不碰 DOM，可在 node 里直接测。
// 一切以「小数年」为单位——1894-07-25 记作 1894.5616，方便连续插值。

import { decimalYear } from "../data/events.js";

export const yearOf = (event) => decimalYear(event.date);

/** 按时间排序的副本；同年内按 id 稳定排序，保证每次运行顺序一致 */
export function sortByYear(events) {
  return events
    .map((e) => ({ e, y: yearOf(e) }))
    .sort((a, b) => a.y - b.y || a.e.id.localeCompare(b.e.id))
    .map((x) => x.e);
}

/** 已发生的战事条数（二分：sorted 必须已按年排序） */
export function revealedCount(sorted, year) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (yearOf(sorted[mid]) <= year) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function revealedAt(sorted, year) {
  return sorted.slice(0, revealedCount(sorted, year));
}

/** 下一个战事的时间点；没有则返回 null */
export function nextStop(sorted, year, eps = 1e-9) {
  for (const e of sorted) {
    const y = yearOf(e);
    if (y > year + eps) return y;
  }
  return null;
}

export function prevStop(sorted, year, eps = 1e-9) {
  let found = null;
  for (const e of sorted) {
    const y = yearOf(e);
    if (y < year - eps) found = y;
    else break;
  }
  return found;
}

/**
 * 某年落在哪个时期。
 * 时期之间会重叠（土地革命 1927—36 与抗战 1931—45 交叉），
 * 重叠处取「开始得更晚」的那个——1931 年该是抗战，不是土地革命。
 * 落在缝隙里则取最近的那个。
 */
export function eraAt(eras, year) {
  let inside = null;
  let best = null;
  let bestGap = Infinity;
  for (const era of eras) {
    if (year >= era.from && year <= era.to + 1) {
      if (!inside || era.from > inside.from) inside = era;
      continue;
    }
    const gap = year < era.from ? era.from - year : year - era.to;
    if (gap < bestGap) {
      bestGap = gap;
      best = era;
    }
  }
  return inside || best;
}

/**
 * 时期 + 是否正处在其中。
 * 战事之间本就有空档年（1843—50、1886—93、1896—99……），
 * 这些年份不该硬套上一个相邻时期的名字，交给界面说「空档」。
 */
export function eraInfo(eras, year) {
  const era = eraAt(eras, year);
  const inside = !!era && year >= era.from && year <= era.to + 1;
  const next = eras.find((e) => e.from > year) || null;
  const prev = [...eras].reverse().find((e) => e.to < year) || null;
  return { era, inside, next, prev };
}

/** 小数年 → 年、月与中文标签 */
export function formatYear(y) {
  const year = Math.floor(y);
  const frac = Math.max(0, Math.min(0.999999, y - year));
  const month = Math.min(12, Math.floor(frac * 12) + 1);
  return { year, month, label: `${year}年${month}月` };
}

/** 以 year 为中心、正负 halfWindow 年内的战事密度（场/年） */
export function localDensity(sorted, year, halfWindow = 2) {
  const hi = revealedCount(sorted, year + halfWindow);
  const lo = revealedCount(sorted, year - halfWindow);
  return (hi - lo) / (2 * halfWindow);
}

/**
 * 播放速度（年/秒）。战事密集的年份自动放慢，空白年份快进——
 * 免得 1937 年一年之内三十条战报糊成一片，也免得 1843—1850 干等。
 */
export function playbackSpeed(sorted, year, opts = {}) {
  const {
    baseYearsPerSec = 1.8,
    targetEventsPerSec = 0.8,
    minScale = 0.28,
    maxScale = 2.6,
    gapYearsPerSec = 7,
    halfWindow = 2,
  } = opts;
  const density = localDensity(sorted, year, halfWindow);
  // 空档年没有战事可看，直接快进过去；有战事的年份按密度反比放慢
  if (density <= 0) return gapYearsPerSec;
  const wanted = targetEventsPerSec / density;
  const lo = baseYearsPerSec * minScale;
  const hi = baseYearsPerSec * maxScale;
  return Math.min(hi, Math.max(lo, wanted));
}

/** 前进 dt 秒后的新年份（不越过终点） */
export function stepYear(sorted, year, dtSec, to, opts) {
  const next = year + playbackSpeed(sorted, year, opts) * dtSec;
  return Math.min(to, next);
}

/**
 * 播放状态机。app 每帧喂 dt，它负责推进年份并在跨越战事时给出「刚发生」的 id 列表。
 */
export function createPlayer({ sorted, from, to, year = from }) {
  let current = year;
  let playing = false;
  const fresh = new Map(); // id -> 首次出现的真实时间戳（ms）

  const api = {
    get year() {
      return current;
    },
    get playing() {
      return playing;
    },
    get atEnd() {
      return current >= to - 1e-9;
    },
    play() {
      if (api.atEnd) current = from;
      playing = true;
    },
    pause() {
      playing = false;
    },
    toggle() {
      if (playing) api.pause();
      else api.play();
    },
    seek(y, stamp) {
      const next = Math.max(from, Math.min(to, y));
      const before = revealedCount(sorted, current);
      const after = revealedCount(sorted, next);
      // 向前跳：跨越的战事算「刚发生」；向后跳：全部当作已存在，不重放动画
      if (after > before && stamp != null) {
        for (let i = before; i < after; i++) fresh.set(sorted[i].id, stamp);
      }
      if (next < current) fresh.clear();
      current = next;
    },
    /** 推进一帧，返回本帧新出现的战事 */
    tick(dtSec, stamp) {
      if (!playing) return [];
      const before = revealedCount(sorted, current);
      const next = stepYear(sorted, current, Math.min(dtSec, 0.1), to, undefined);
      current = next;
      const after = revealedCount(sorted, current);
      const born = [];
      for (let i = before; i < after; i++) {
        fresh.set(sorted[i].id, stamp);
        born.push(sorted[i]);
      }
      if (current >= to - 1e-9) playing = false;
      return born;
    },
    /** 某条战事的「刚出现」进度 0→1；不在动画窗口内返回 1 */
    freshness(id, stamp, ms = 1400) {
      const t0 = fresh.get(id);
      if (t0 == null) return 1;
      const p = (stamp - t0) / ms;
      return p >= 1 ? 1 : Math.max(0, p);
    },
  };
  return api;
}

/** 每年战事条数，用于底部年表尺的密度柱 */
export function densityByYear(events, from, to) {
  const bars = new Array(to - from).fill(0);
  for (const e of events) {
    const i = Math.floor(yearOf(e)) - from;
    if (i >= 0 && i < bars.length) bars[i] += 1;
  }
  return bars;
}
