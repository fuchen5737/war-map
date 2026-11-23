// 抗战期间沦陷城市表。
// 口径：只收「有明确陷落日期、且在片中够得着」的省会与要地，共 41 座——
// 与片尾「光复城市 41/41」对得上。日期取该城被日军攻占之日（不是战役起止日）。

export const CITIES = [
  { name: "沈阳", at: [123.43, 41.80], fall: "1931-09-19" },
  { name: "长春", at: [125.32, 43.90], fall: "1931-09-19" },
  { name: "吉林", at: [126.55, 43.84], fall: "1931-09-21" },
  { name: "齐齐哈尔", at: [123.92, 47.35], fall: "1931-11-19" },
  { name: "锦州", at: [121.13, 41.10], fall: "1932-01-03" },
  { name: "哈尔滨", at: [126.53, 45.80], fall: "1932-02-05" },
  { name: "承德", at: [117.96, 40.95], fall: "1933-03-04" },
  { name: "北平", at: [116.40, 39.90], fall: "1937-07-29" },
  { name: "天津", at: [117.20, 39.13], fall: "1937-07-30" },
  { name: "张家口", at: [114.89, 40.77], fall: "1937-08-27" },
  { name: "大同", at: [113.30, 40.08], fall: "1937-09-13" },
  { name: "保定", at: [115.48, 38.87], fall: "1937-09-24" },
  { name: "石家庄", at: [114.51, 38.04], fall: "1937-10-10" },
  { name: "归绥", at: [111.75, 40.84], fall: "1937-10-14" },
  { name: "太原", at: [112.55, 37.87], fall: "1937-11-08" },
  { name: "上海", at: [121.47, 31.23], fall: "1937-11-12" },
  { name: "苏州", at: [120.62, 31.30], fall: "1937-11-19" },
  { name: "无锡", at: [120.30, 31.57], fall: "1937-11-25" },
  { name: "南京", at: [118.80, 32.06], fall: "1937-12-13" },
  { name: "杭州", at: [120.16, 30.27], fall: "1937-12-24" },
  { name: "济南", at: [117.00, 36.65], fall: "1937-12-27" },
  { name: "青岛", at: [120.38, 36.07], fall: "1938-01-10" },
  { name: "徐州", at: [117.28, 34.26], fall: "1938-05-19" },
  { name: "开封", at: [114.31, 34.80], fall: "1938-06-06" },
  { name: "安庆", at: [117.05, 30.53], fall: "1938-06-12" },
  { name: "九江", at: [116.00, 29.71], fall: "1938-07-26" },
  { name: "广州", at: [113.26, 23.13], fall: "1938-10-21" },
  { name: "武汉", at: [114.30, 30.59], fall: "1938-10-26" },
  { name: "岳阳", at: [113.13, 29.36], fall: "1938-11-11" },
  { name: "海口", at: [110.33, 20.03], fall: "1939-02-10" },
  { name: "南昌", at: [115.89, 28.68], fall: "1939-03-27" },
  { name: "宜昌", at: [111.29, 30.69], fall: "1940-06-12" },
  { name: "腾冲", at: [98.49, 25.02], fall: "1942-05-10" },
  { name: "郑州", at: [113.63, 34.75], fall: "1944-04-24" },
  { name: "洛阳", at: [112.45, 34.62], fall: "1944-05-25" },
  { name: "长沙", at: [112.94, 28.23], fall: "1944-06-19" },
  { name: "衡阳", at: [112.57, 26.89], fall: "1944-08-08" },
  { name: "桂林", at: [110.29, 25.27], fall: "1944-11-10" },
  { name: "柳州", at: [109.41, 24.33], fall: "1944-11-11" },
  { name: "南宁", at: [108.37, 22.82], fall: "1944-11-24" },
  { name: "独山", at: [107.55, 25.83], fall: "1944-12-02" },
];

const DAY = 86400000;
const stamp = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };

export const CITY_FALL = CITIES.map((c) => ({ ...c, at: stamp(c.fall) }));

/** 截至某日（毫秒时间戳）已沦陷的城市，按日期先后排 */
export function fallenBy(t) {
  return CITY_FALL.filter((c) => c.at <= t).sort((a, b) => a.at - b.at);
}

/** 刚刚沦陷（回溯 days 天内）的城市 */
export function fallenWithin(t, days = 45) {
  const from = t - days * DAY;
  return CITY_FALL.filter((c) => c.at <= t && c.at > from);
}

export function fallLabel(c) {
  const [, m, d] = c.fall.split("-");
  return `${Number(m)}.${Number(d)}`;
}

/** decimalYear → 时间戳（中日历按 365.25 天粗算，够用来卡日期） */
export function yearToStamp(year) {
  return Date.UTC(1931, 0, 1) + (year - 1931) * 365.25 * DAY;
}

export function stampToDecimal(t) {
  return 1931 + (t - Date.UTC(1931, 0, 1)) / (365.25 * DAY);
}
