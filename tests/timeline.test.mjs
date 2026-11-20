import test from "node:test";
import assert from "node:assert/strict";

import {
  yearOf,
  sortByYear,
  revealedCount,
  revealedAt,
  nextStop,
  prevStop,
  eraAt,
  eraInfo,
  formatYear,
  localDensity,
  playbackSpeed,
  stepYear,
  createPlayer,
  densityByYear,
} from "../src/timeline.js";
import { ERAS, EVENTS, decimalYear, TIMELINE } from "../data/events.js";

const SORTED = sortByYear(EVENTS);

test("sortByYear 按小数年升序，且不修改入参", () => {
  const input = EVENTS.slice(0, 12).reverse();
  const snapshot = input.map((e) => e.id);
  const out = sortByYear(input);
  assert.deepEqual(input.map((e) => e.id), snapshot, "入参被就地排序了");
  for (let i = 1; i < out.length; i++) {
    assert.ok(yearOf(out[i - 1]) <= yearOf(out[i]), `${out[i - 1].id} 排在 ${out[i].id} 之后`);
  }
});

test("revealedCount 与线性扫描结果一致（抽查每个战事年份前后）", () => {
  const probe = (year) => EVENTS.filter((e) => yearOf(e) <= year).length;
  const years = [1839, 1840, 1842, 1860, 1894.5, 1900, 1931, 1937.7, 1945, 1949, 1960];
  for (const y of years) {
    assert.equal(revealedCount(SORTED, y), probe(y), `年份 ${y} 计数不一致`);
  }
});

test("revealedCount 边界：早于全部、等于首条、等于末条", () => {
  assert.equal(revealedCount(SORTED, 1800), 0);
  assert.equal(revealedCount(SORTED, yearOf(SORTED[0])), 1);
  assert.equal(revealedCount(SORTED, yearOf(SORTED.at(-1))), SORTED.length);
  assert.equal(revealedCount(SORTED, 9999), SORTED.length);
});

test("revealedAt 是 revealedCount 的前缀切片", () => {
  const y = 1900;
  const at = revealedAt(SORTED, y);
  assert.equal(at.length, revealedCount(SORTED, y));
  assert.deepEqual(at.map((e) => e.id), SORTED.slice(0, at.length).map((e) => e.id));
});

test("nextStop / prevStop 跳过同年重复日期", () => {
  const y = yearOf(SORTED[0]);
  const nxt = nextStop(SORTED, y);
  assert.ok(nxt === null || nxt > y);
  assert.equal(prevStop(SORTED, y), null, "首条之前不该有前站");
  assert.equal(nextStop(SORTED, TIMELINE.to + 5), null);
  assert.equal(prevStop(SORTED, TIMELINE.to + 5), yearOf(SORTED.at(-1)));
});

test("nextStop 与 prevStop 互为邻站", () => {
  for (const e of SORTED.slice(0, 40)) {
    const y = yearOf(e);
    const n = nextStop(SORTED, y - 1e-6);
    assert.ok(n === null || n >= y, "nextStop 回退了");
    const p = prevStop(SORTED, y + 1e-6);
    assert.ok(p === null || p <= y, "prevStop 超前了");
  }
});

test("eraAt 在重叠期取开始更晚的那个", () => {
  // 土地革命 1927–36 与抗战 1931–45 交叉
  assert.equal(eraAt(ERAS, 1931).id, "anti");
  assert.equal(eraAt(ERAS, 1937).id, "anti");
  // 交叉之前仍是土地革命
  assert.equal(eraAt(ERAS, 1928).id, "soviet");
});

test("eraAt 落在空档年时给最近的时期，绝不返回 null", () => {
  for (let y = TIMELINE.from; y <= TIMELINE.to; y++) {
    const era = eraAt(ERAS, y);
    assert.ok(era && era.id, `年份 ${y} 没有对应时期`);
  }
});

test("eraInfo.inside 在空档年为 false，在有战事的时期为 true", () => {
  assert.equal(eraInfo(ERAS, 1845).inside, false, "1845 是鸦片战争之后的空档");
  assert.equal(eraInfo(ERAS, 1841).inside, true);
  assert.equal(eraInfo(ERAS, 1937).inside, true);
  const info = eraInfo(ERAS, 1845);
  assert.ok(info.next, "空档年必须给得出下一个时期，界面要拿它做提示");
  assert.ok(info.next.from > 1845);
});

test("formatYear 覆盖整年边界", () => {
  assert.deepEqual(formatYear(1840), { year: 1840, month: 1, label: "1840年1月" });
  assert.equal(formatYear(1840.999999).month, 12);
  assert.equal(formatYear(1840.999999).year, 1840);
  assert.equal(formatYear(1841.0).year, 1841);
  assert.equal(formatYear(1841.0).month, 1);
});

test("localDensity 与逐年统计一致", () => {
  const d = localDensity(SORTED, 1937, 1);
  const manual = EVENTS.filter((e) => yearOf(e) >= 1936 && yearOf(e) <= 1938).length / 2;
  assert.equal(d, manual);
});

test("playbackSpeed：空档年快进、密集年放慢、永远为正", () => {
  const gap = playbackSpeed(SORTED, 1845);
  assert.ok(gap > 1.8, `空档年应当快进，实际 ${gap}`);
  const busy = playbackSpeed(SORTED, 1937);
  assert.ok(busy < gap, "战事密集的年份必须比空档年慢");
  for (let y = TIMELINE.from; y <= TIMELINE.to; y += 0.5) {
    const s = playbackSpeed(SORTED, y);
    assert.ok(Number.isFinite(s) && s > 0, `年份 ${y} 速度异常：${s}`);
  }
});

test("stepYear 不越过终点", () => {
  assert.equal(stepYear(SORTED, TIMELINE.to - 0.01, 100, TIMELINE.to), TIMELINE.to);
  assert.ok(stepYear(SORTED, 1900, 0.016, TIMELINE.to) > 1900);
});

test("createPlayer：播放推进年份并在终点自动停", () => {
  const p = createPlayer({ sorted: SORTED, from: 1840, to: 1846 });
  assert.equal(p.year, 1840);
  assert.equal(p.playing, false);
  p.play();
  assert.equal(p.playing, true);
  for (let i = 0; i < 4000 && p.playing; i++) p.tick(0.05, i * 50);
  assert.ok(p.year > 1840, "播放期间年份没有推进");
  assert.equal(p.playing, false, "到达终点后没有停止");
  assert.equal(p.atEnd, true);
});

test("createPlayer：tick 返回本帧新出现的战事，且不重复上报", () => {
  const p = createPlayer({ sorted: SORTED, from: 1840, to: 1843 });
  p.play();
  const seen = new Set();
  let stamp = 0;
  for (let i = 0; i < 4000 && p.playing; i++) {
    const born = p.tick(0.05, (stamp += 50));
    for (const e of born) {
      assert.ok(!seen.has(e.id), `${e.id} 被重复上报`);
      seen.add(e.id);
    }
  }
  assert.ok(seen.size > 0, "三年里一条战事都没触发");
  assert.equal(seen.size, revealedCount(SORTED, p.year));
});

test("createPlayer：向前 seek 补报跨过的战事，向后 seek 清空动画", () => {
  const p = createPlayer({ sorted: SORTED, from: 1840, to: 1950 });
  p.seek(1900, 1000);
  const jumped = revealedCount(SORTED, 1900);
  assert.ok(jumped > 0);
  assert.ok(p.freshness(SORTED[0].id, 1000) < 1, "跨过的战事没有被标记为「刚出现」");
  p.seek(1841, 2000);
  assert.equal(p.freshness(SORTED[0].id, 2000), 1, "向后跳后应当清掉动画");
});

test("createPlayer：seek 会被夹在区间内，play 在终点从头开始", () => {
  const p = createPlayer({ sorted: SORTED, from: 1840, to: 1950 });
  p.seek(1700, 0);
  assert.equal(p.year, 1840);
  p.seek(2100, 0);
  assert.equal(p.year, 1950);
  p.play();
  assert.equal(p.year, 1840, "在终点按播放应当回到开头");
  assert.equal(p.playing, true);
});

test("freshness 在动画窗口内递增，窗口外为 1", () => {
  const p = createPlayer({ sorted: SORTED, from: 1840, to: 1850 });
  p.seek(1846, 0);
  const id = SORTED[0].id;
  assert.equal(p.freshness(id, 0), 0);
  assert.ok(p.freshness(id, 700) > 0 && p.freshness(id, 700) < 1);
  assert.equal(p.freshness(id, 999999), 1);
});

test("densityByYear 长度与总条数正确", () => {
  const bars = densityByYear(EVENTS, TIMELINE.from, TIMELINE.to);
  assert.equal(bars.length, TIMELINE.to - TIMELINE.from);
  assert.equal(
    bars.reduce((a, b) => a + b, 0),
    EVENTS.length,
    "有战事落在年表尺范围之外",
  );
});

test("decimalYear 单调且与日期一致", () => {
  assert.equal(decimalYear("1840-01-01"), 1840);
  assert.ok(decimalYear("1840-07-01") > 1840.4 && decimalYear("1840-07-01") < 1840.6);
  assert.ok(decimalYear("1949-10-01") < 1950);
  const dates = EVENTS.map((e) => e.date).sort();
  for (let i = 1; i < dates.length; i++) {
    assert.ok(decimalYear(dates[i - 1]) <= decimalYear(dates[i]), `${dates[i - 1]} 晚于 ${dates[i]}`);
  }
});
