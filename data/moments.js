// 几个不能只用「一个点 + 一行字」交代的节点。
//
// 参考片对这类时刻换了一整套画法：南京用上千个光点堆成一片，
// 每个光点代表一千人；受降用金色光点把整张图点亮。
// 这里只登记「哪一节、用哪种画法、配什么字」，怎么画在 src/cinema.js。

/** kind: "massacre" 光点云 | "surrender" 金色光复 */
export const MOMENTS = [
  {
    node: "aj-2/5",
    kind: "massacre",
    title: "南京大屠杀",
    sub: "1937.12.13 起，六周",
    kicker: "遇难同胞 30 万以上",
    note: "每一个光点，代表五百人",
    at: [118.78, 32.06],
    dots: 600,
  },
  {
    node: "aj-4/4",
    kind: "surrender",
    title: "南京受降",
    sub: "1945.09.09　南京中央军校",
    kicker: "光复城市 41 / 41",
    note: "十四年，从沈阳到南京",
    at: [118.78, 32.06],
  },
];

const BY_NODE = new Map(MOMENTS.map((m) => [m.node, m]));

/** 取这一节的特写；没有就返回 null */
export function momentOf(nodeId) {
  return BY_NODE.get(nodeId) || null;
}

export function momentNodes() {
  return MOMENTS.map((m) => m.node);
}
