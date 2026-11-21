// 单位符号表：每条战事「由谁、以何种兵种执行」。
//
// 这是编辑判断，不是史料原文。定的是「这一条战事在地图上该画成什么符号」：
//   faction = 这一条的主角（发起方/承受方里视觉上更该被看到的那一方）
//   arm     = 兵种或事件类型
// 会战类（淞沪、武汉、长沙…）记为中国方面，因为它们是抗战叙事里的防守标志；
// 「某城陷落」类记进攻方，因为符号要跟着箭头走。
// 改这里不影响任何史实字段，只改画法；tests/units.test.mjs 会校验每条战事都有符号。

export const FACTIONS = {
  gov: { name: "中国政府军", short: "政府", color: "#dcb45e" },
  rev: { name: "起义与革命武装", short: "革命", color: "#4ec489" },
  jp: { name: "日本", short: "日", color: "#d24a3a" },
  west: { name: "西方列强", short: "列强", color: "#57a3c0" },
  ru: { name: "俄国", short: "俄", color: "#9077bb" },
};

export const ARMS = {
  inf: "步兵",
  cav: "骑兵",
  nav: "舰队",
  fort: "炮台要塞",
  pol: "政治事件",
};

// [faction, arm]
export const UNITS = {
  // ── 鸦片战争 1840–1842 ──
  "op-1840-lin": ["west", "nav"],
  "op-1840-dinghai": ["west", "nav"],
  "op-1840-dagu": ["west", "nav"],
  "op-1841-shajiao": ["west", "inf"],
  "op-1841-hk": ["west", "nav"],
  "op-1841-humen": ["west", "nav"],
  "op-1841-sanyuanli": ["rev", "inf"],
  "op-1841-xiamen": ["west", "nav"],
  "op-1841-dinghai2": ["west", "inf"],
  "op-1841-zhenhai": ["west", "nav"],
  "op-1842-wusong": ["west", "nav"],
  "op-1842-zhenjiang": ["west", "inf"],
  "op-1842-nanjing": ["west", "pol"],

  // ── 太平天国 1851–1864 ──
  "tp-1851-jintian": ["rev", "inf"],
  "tp-1851-yongan": ["rev", "pol"],
  "tp-1852-quanzhou": ["rev", "inf"],
  "tp-1852-changsha": ["rev", "inf"],
  "tp-1853-wuchang": ["rev", "inf"],
  "tp-1853-tianjing": ["rev", "pol"],
  "tp-1853-north": ["rev", "cav"],
  "tp-1853-west": ["rev", "nav"],
  "tp-1855-hukou": ["rev", "nav"],
  "tp-1856-tianjing": ["rev", "pol"],
  "tp-1860-jiangnan": ["rev", "inf"],
  "tp-1861-anqing": ["gov", "inf"],
  "tp-1861-hangzhou": ["rev", "inf"],
  "tp-1862-cixi": ["gov", "inf"],
  "tp-1863-suzhou": ["rev", "pol"],
  "tp-1864-tianjing": ["gov", "inf"],

  // ── 第二次鸦片战争 1856–1860 ──
  "ar-1856-canton": ["west", "nav"],
  "ar-1857-guangzhou": ["west", "nav"],
  "ar-1858-dagu": ["west", "nav"],
  "ar-1858-tianjin": ["west", "pol"],
  "ar-1859-dagu": ["gov", "fort"],
  "ar-1860-dagu": ["west", "nav"],
  "ar-1860-baliqiao": ["gov", "cav"],
  "ar-1860-yuanming": ["west", "inf"],
  "ar-1860-beijing": ["west", "pol"],

  // ── 捻军与回变 1853–1878 ──
  "rv-1855-zhuihe": ["rev", "cav"],
  "rv-1865-gaolou": ["rev", "cav"],
  "rv-1868-tuha": ["rev", "cav"],
  "rv-1856-dali": ["rev", "inf"],
  "rv-1869-jinjibao": ["gov", "inf"],
  "rv-1873-suzhou": ["gov", "inf"],
  "rv-1876-urumqi": ["gov", "cav"],

  // ── 中法战争 1883–1885 ──
  "fr-1883-sontay": ["west", "inf"],
  "fr-1884-bacninh": ["west", "inf"],
  "fr-1884-mawai": ["west", "nav"],
  "fr-1884-keelung": ["west", "nav"],
  "fr-1884-tamsui": ["gov", "fort"],
  "fr-1885-zhenhai": ["gov", "fort"],
  "fr-1885-zhennanguan": ["gov", "fort"],
  "fr-1885-langson": ["gov", "inf"],
  "fr-1885-tianjin": ["west", "pol"],

  // ── 甲午战争 1894–1895 ──
  "jw-1894-fengdao": ["jp", "nav"],
  "jw-1894-seonghwan": ["jp", "inf"],
  "jw-1894-pyongyang": ["jp", "inf"],
  "jw-1894-yalu": ["jp", "nav"],
  "jw-1894-yalu2": ["jp", "inf"],
  "jw-1894-jinzhou": ["jp", "inf"],
  "jw-1894-lvshun": ["jp", "inf"],
  "jw-1895-weihai": ["jp", "nav"],
  "jw-1895-liugong": ["jp", "nav"],
  "jw-1895-penghu": ["jp", "nav"],
  "jw-1895-maguan": ["jp", "pol"],

  // ── 八国联军 1900–1901 ──
  "bx-1900-langfang": ["west", "inf"],
  "bx-1900-dagu": ["west", "nav"],
  "bx-1900-nieshi": ["gov", "inf"],
  "bx-1900-tianjin": ["west", "inf"],
  "bx-1900-beijing": ["west", "inf"],
  "bx-1900-manchuria": ["ru", "inf"],
  "bx-1901-xinchou": ["west", "pol"],

  // ── 日俄战争 1904–1905 ──
  "rj-1904-portarthur": ["jp", "nav"],
  "rj-1904-yalu": ["jp", "inf"],
  "rj-1904-liaoyang": ["jp", "inf"],
  "rj-1904-shahe": ["ru", "inf"],
  "rj-1904-hill203": ["jp", "inf"],
  "rj-1905-portarthur": ["ru", "fort"],
  "rj-1905-mukden": ["jp", "inf"],
  "rj-1905-tsushima": ["jp", "nav"],

  // ── 辛亥革命 1911–1912 ──
  "xh-1911-huanghuagang": ["rev", "inf"],
  "xh-1911-chengdu": ["rev", "pol"],
  "xh-1911-wuchang": ["rev", "inf"],
  "xh-1911-changsha": ["rev", "pol"],
  "xh-1911-xian": ["rev", "pol"],
  "xh-1911-taiyuan": ["rev", "pol"],
  "xh-1911-shanghai": ["rev", "pol"],
  "xh-1911-hanyang": ["gov", "inf"],
  "xh-1911-nanjing": ["rev", "inf"],
  "xh-1912-tuiwei": ["rev", "pol"],

  // ── 军阀混战与北伐 1913–1928 ──
  "wl-1913-hukou": ["rev", "inf"],
  "wl-1916-luzhou": ["rev", "inf"],
  "wl-1917-zhangxun": ["gov", "pol"],
  "wl-1920-zhuan": ["gov", "inf"],
  "wl-1922-zhifeng": ["gov", "inf"],
  "wl-1924-zhifeng": ["gov", "inf"],
  "wl-1926-shi": ["rev", "pol"],
  "wl-1926-tingsi": ["rev", "inf"],
  "wl-1926-wuchang": ["rev", "inf"],
  "wl-1926-nanchang": ["rev", "inf"],
  "wl-1927-nanjing": ["rev", "inf"],
  "wl-1928-jinan": ["jp", "inf"],
  "wl-1928-huanggutun": ["jp", "pol"],
  "wl-1928-yizhi": ["gov", "pol"],

  // ── 土地革命 1927–1936 ──
  "sv-1927-nanchang": ["rev", "inf"],
  "sv-1927-qiushou": ["rev", "inf"],
  "sv-1927-guangzhou": ["rev", "inf"],
  "sv-1928-jinggang": ["rev", "pol"],
  "sv-1930-longgang": ["rev", "inf"],
  "sv-1931-second": ["rev", "inf"],
  "sv-1934-changzheng": ["rev", "inf"],
  "sv-1934-xiangjiang": ["rev", "inf"],
  "sv-1935-zunyi": ["rev", "pol"],
  "sv-1935-luding": ["rev", "inf"],
  "sv-1935-maogong": ["rev", "pol"],
  "sv-1935-wuqi": ["rev", "inf"],
  "sv-1936-huining": ["rev", "pol"],

  // ── 抗日战争 1931–1945 ──
  "aj-1931-mukden": ["jp", "inf"],
  "aj-1931-jiangqiao": ["gov", "inf"],
  "aj-1932-shanghai": ["gov", "inf"],
  "aj-1932-manchukuo": ["jp", "pol"],
  "aj-1933-xifengkou": ["gov", "cav"],
  "aj-1936-xian": ["gov", "pol"],
  "aj-1937-lugou": ["jp", "inf"],
  "aj-1937-songhu": ["gov", "inf"],
  "aj-1937-pingxing": ["rev", "inf"],
  "aj-1937-xinkou": ["gov", "inf"],
  "aj-1937-nanjing": ["jp", "inf"],
  "aj-1938-taierzhuang": ["gov", "inf"],
  "aj-1938-wuhan": ["gov", "inf"],
  "aj-1938-guangzhou": ["jp", "nav"],
  "aj-1939-changsha": ["gov", "inf"],
  "aj-1940-zaoyang": ["gov", "inf"],
  "aj-1940-baituan": ["rev", "inf"],
  "aj-1941-hongkong": ["jp", "inf"],
  "aj-1942-toungoo": ["gov", "inf"],
  "aj-1942-yenangyaung": ["gov", "inf"],
  "aj-1943-changde": ["gov", "inf"],
  "aj-1944-hengyang": ["gov", "inf"],
  "aj-1944-guilin": ["jp", "inf"],
  "aj-1945-surrender": ["jp", "pol"],
  "aj-1945-nanjing": ["gov", "pol"],

  // ── 解放战争 1945–1949 ──
  "lb-1945-chongqing": ["gov", "pol"],
  "lb-1946-zhongyuan": ["rev", "inf"],
  "lb-1947-yanan": ["rev", "pol"],
  "lb-1947-menglianggu": ["rev", "inf"],
  "lb-1947-dabie": ["rev", "inf"],
  "lb-1948-liaoshen": ["rev", "inf"],
  "lb-1948-huaihai": ["rev", "inf"],
  "lb-1948-pingjin": ["rev", "inf"],
  "lb-1949-tianjin": ["rev", "inf"],
  "lb-1949-beiping": ["rev", "pol"],
  "lb-1949-dujiang": ["rev", "nav"],
  "lb-1949-shanghai": ["rev", "inf"],
  "lb-1949-kaiguo": ["rev", "pol"],
  "lb-1949-guangzhou": ["rev", "inf"],
  "lb-1949-chongqing": ["rev", "inf"],
  "lb-1949-chengdu": ["rev", "inf"],
};

/** 某条战事的符号；没登记时退回中性圆点，不抛错。 */
export function unitOf(id) {
  const u = UNITS[id];
  if (!u) return null;
  const [faction, arm] = u;
  return { faction, arm, color: FACTIONS[faction]?.color || "#9aa8b2", label: `${FACTIONS[faction]?.name || faction} · ${ARMS[arm] || arm}` };
}
