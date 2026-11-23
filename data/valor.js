// 「意义」层：同样是打赢或打输，值得被单独标出来的那几处。
//
// events.js 记的是「发生了什么」，这里记的是「该怎么被看见」。
// 参考片用金色标胜仗与根据地、白色火苗标殉国将领——语义不在事件本身，
// 而在读者该记住什么。所以这一层是编辑判断，和 units.js 同性质。
//
// 三类：
//   victory  打赢了，或者守得超出预期 —— 金色星
//   martyr   主将殉国 —— 白色火苗
//   base     成片的控制区（敌后根据地） —— 金色括号

/**
 * 单点标记：id → { kind, who?, note? }
 * who 只用于 martyr，写在火苗旁边。
 */
export const VALOR = {
  // ── 殉国将领 ──
  "op-1841-humen": { kind: "martyr", who: "关天培" },
  "op-1841-dinghai2": { kind: "martyr", who: "葛云飞、王锡朋、郑国鸿" },
  "op-1842-wusong": { kind: "martyr", who: "陈化成" },
  "jw-1894-pyongyang": { kind: "martyr", who: "左宝贵" },
  "jw-1894-yalu": { kind: "martyr", who: "邓世昌" },
  "jw-1895-liugong": { kind: "martyr", who: "丁汝昌" },
  "bx-1900-tianjin": { kind: "martyr", who: "聂士成" },
  "aj-1937-lugou": { kind: "martyr", who: "佟麟阁、赵登禹" },
  "aj-1937-xinkou": { kind: "martyr", who: "郝梦龄" },
  "aj-1940-zaoyang": { kind: "martyr", who: "张自忠" },
  "aj-1942-toungoo": { kind: "martyr", who: "戴安澜" },

  // ── 胜仗 ──
  "op-1841-sanyuanli": { kind: "victory" },
  "fr-1885-zhennanguan": { kind: "victory", note: "镇南关大捷" },
  "fr-1885-zhenhai": { kind: "victory", note: "镇海拒敌" },
  "aj-1931-jiangqiao": { kind: "victory", note: "江桥抗战" },
  "aj-1933-xifengkou": { kind: "victory", note: "喜峰口" },
  "aj-1937-pingxing": { kind: "victory", note: "平型关" },
  "aj-1938-taierzhuang": { kind: "victory", note: "台儿庄" },
  "aj-1939-changsha": { kind: "victory", note: "长沙" },
  "aj-1940-baituan": { kind: "victory", note: "百团大战" },
  "aj-1942-yenangyaung": { kind: "victory", note: "仁安羌" },
  "aj-1943-changde": { kind: "victory", note: "常德" },
  "aj-1944-hengyang": { kind: "victory", note: "衡阳" },
};

/**
 * 成片区域：敌后抗日根据地。
 * provinces 用底图里的近代省名；year 区间决定什么时候出现在图上。
 * 画成上括号压在这些省的上沿，不填色——填色会和占领区的斜线打架。
 */
export const BASES = [
  { name: "陕甘宁", from: 1937, to: 1945, provinces: ["陕西", "甘肃", "宁夏"] },
  { name: "晋察冀", from: 1938, to: 1945, provinces: ["山西", "河北", "绥远"] },
  { name: "晋冀鲁豫", from: 1939, to: 1945, provinces: ["山西", "河北", "山东", "河南"] },
  { name: "山东", from: 1939, to: 1945, provinces: ["山东"] },
  { name: "华中", from: 1941, to: 1945, provinces: ["江苏", "安徽"] },
];

/** 取某条战事的意义标记，没有则 null */
export function valorOf(id) {
  return VALOR[id] || null;
}

/** 某一年活跃的根据地 */
export function basesAt(year) {
  return BASES.filter((b) => year >= b.from && year <= b.to);
}

/** 全部被标出来的战事 id，供测试核对 */
export function valorIds() {
  return Object.keys(VALOR);
}
