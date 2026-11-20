# 锋线 · 近代中国战事地图 1840—1949

1840 到 1949 年间 158 条战事，编成 20 场战役、145 个关键节点，落到地图上。点播放，时间沿着战役的节点往前跳：每到一个节点，年份钉住，这一处的点位亮起、行军路线按箭头方向画出来，停一下再走下一节。

纯静态单页，零构建、零依赖、零外部请求——底图是本地自绘的 Canvas 矢量图，不拉在线瓦片，断网也能跑。

## 跑起来

```bash
cd war-map
python3 -m http.server 4322
# 打开 http://127.0.0.1:4322/
```

必须用 HTTP 打开，不能双击 `index.html`：模块脚本与 `fetch` 在 `file://` 下会被浏览器拦掉。

## 操作

| 动作 | 效果 |
| --- | --- |
| 播放 / 暂停 | 沿战役节点推进；每节按战事数停留 1.0–3.0 秒，节点之间的过渡是 0.4 秒的插值 |
| ◀ / ▶ | 跳到上一节 / 下一节（不播放） |
| 拖年表尺 | 跳到任意年份；此时离开节点模式，年份自由滚动，靠近下一节时会吸附回去 |
| 点时期索引 | 跳到该时期的第一节 |
| 点地图上的点 | 打开档案卡；只是「查看」，不会挪动此刻的时间轴位置 |
| 滚轮 | 缩放（1×–3.2×） |
| 空格 / ← → / Home | 播放暂停 / 前后一节 / 回到开头 |
| Esc | 关档案卡或关于弹层 |

停在最后一节再按播放，从头重看。窄屏（≤860px）下左栏折成顶部横条，战事流收进底部抽屉，由时间轴右侧的「战事流」按钮开合；≤430px 时「倍速」按钮收起（拖年表尺本来就能跳），播放时也不再自动弹档案卡——地图就那么大，弹出来正好压在刚亮起来的点上。

## 怎么读

- **节点**是这台戏的节拍。一场战役切成若干节点，每节挑几个关键地名（珠江口、虎门、吴淞、镇江…）。左栏第二行是「第几节 / 共几节」和这一节的名字，下面那条细杠是这一节的停留进度。
- **同一节可能有两三处战事**（比如「圆明园被焚、《北京条约》」）。地图上用淡虚线把它们串起来，只给落点那处挂名字，战事流里标注「同刻 2 处」。
- **点大小**表示规模：小点为局部战斗，中点为战役，大点为决定性会战或转折。**点的颜色**是所属时期的配色，左栏每行时期左边的小色点就是它——扫一眼就知道整张图此刻在讲哪一段。
- **实线**是陆上推进，**虚线**是海上行动，**点划线**是撤退转移。箭头只画当前时期最近几条，加上当前节点那几条——否则 1876 年横贯新疆的长箭头会一直挂到 1911 年的图上。
- **淡点**是尚未发生的战事，给一个空间上的预告，让任何年份的图都不空。
- 拖着年表尺停在两场战役之间时，栏里显示「间歇」并告诉你下一场在哪一年。

## 目录

```
war-map/
├── index.html          页面骨架
├── styles.css          全部样式（含断点与 prefers-reduced-motion 兜底）
├── src/
│   ├── geo.js          Albers 等积圆锥投影、视口变换、Haversine
│   ├── timeline.js     时间轴纯函数（revealedCount / eraAt / playbackSpeed）
│   ├── nodes.js        战役节点：展开、定位、停留时长、节点播放器（node / free 两模式）
│   ├── render.js       Canvas 2D 手绘：海、经纬网、邻国、省界、河流、箭头、战事点
│   └── app.js          装配层：尺寸、rAF 主循环、播放、战事流、档案卡、事件绑定
├── data/
│   ├── events.js       158 条战事 + 13 个时期
│   ├── campaigns.js    20 场战役 + 145 个节点（引用 events 的 id）
│   └── geo/
│       ├── basemap.json    运行时底图（93 KB，由构建脚本生成）
│       └── raw/            原始 GeoJSON
├── tools/build-geo.mjs 底图构建：投影 → Douglas–Peucker 抽稀 → 裁环 → 写 basemap.json
└── tests/              node --test，66 个用例
```

## 数据

### 一条战事（`data/events.js`）

```js
{
  id: "jw-1894-yalu",          // 时期前缀 + 年月 + 短名
  date: "1894-09-17",
  era: "jiawu",                 // 必须存在于 ERAS
  name: "黄海海战",
  place: "黄海大东沟",
  at: [123.0, 39.0],            // [经度, 纬度]
  scale: 3,                     // 1 局部战斗 / 2 战役 / 3 决定性会战
  result: "北洋水师损失五舰，退守威海卫",
  note: "……",
  arrows: [                     // 可选
    { kind: "naval", label: "北洋舰队", pts: [[121.6, 38.9], [123.0, 39.0]] },
  ],
}
```

13 个时期：鸦片战争 13 条、太平天国 16、第二次鸦片战争 9、捻军与回变 7、中法战争 9、甲午战争 11、八国联军 7、日俄战争 8、辛亥革命 10、军阀混战与北伐 14、土地革命 13、抗日战争 25、解放战争 16。时期允许重叠（如太平天国与捻军回变同期），`eraAt` 取「开始得更晚」的那个。

### 一场战役（`data/campaigns.js`）

```js
{
  id: "jw-1",
  name: "甲午战争",
  era: "jiawu",
  blurb: "……",                 // 左栏那一行简介
  nodes: [
    { title: "丰岛海战", events: ["jw-1894-fengdao"] },
    { title: "平壤之战", events: ["jw-1894-pyongyang"] },
    // …
  ],
}
```

节点的时刻取组内最后一条战事的日期；节点的规模取组内最大的 `scale`。`src/nodes.js` 的 `buildNodes()` 会把战役展开成 145 个节点，并做三件事的硬校验——重复引用同一条战事、引用不存在的 id、有战事没被编进任何节点，都会直接抛错（错误信息带 id）。同刻的节点按战役定义顺序稳定排序。

### 加一条战事

1. 在 `data/events.js` 的 `EVENTS` 里加一项，`era` 用已有的时期 id；
2. 在 `data/campaigns.js` 里把它塞进某场战役的某个 `nodes[].events`——不塞的话 `buildNodes()` 会抛「有战事没有编入任何节点」；
3. 跑测试：

```bash
node --test tests/*.test.mjs
```

`tests/data.test.mjs` 校验字段类型、id 唯一、日期在 1840–1950 内、`era` 存在、坐标与箭头端点投影后都落在底图 bbox 内、时期裂缝不超过 10 年；`tests/nodes.test.mjs` 校验节点覆盖完整与播放器语义。

## 重建底图

原始数据在 `data/geo/raw/`：

- `china-provinces.json` — 阿里 DataV 全国省级面（33 个省级单元）
- `world.geo.json` — 世界国界（取邻国与国界轮廓）
- `rivers.geojson` — Natural Earth 50m 河流

```bash
node tools/build-geo.mjs     # 或 npm run build:geo
```

脚本用 `src/geo.js` 的同一套投影，所以底图和战事点位永远对齐。抽稀容差在文件头：`TOL_CN = 0.0009`、`TOL_WORLD = 0.0035`、`TOL_RIVER = 0.0012`；视域 `LON = [72,148]`、`LAT = [-2,56]`；bbox 最终以国界轮廓外扩 8.5%–14% 为基准。省名在 `CN_NAME` 表里做了民国化映射（北平、绥远、陕西…），邻国在 `WORLD_KEEP` 白名单里只留 24 个，并给了中文名（俄国、暹罗、荷属东印度…）。

## 测试

```bash
node --test tests/*.test.mjs     # 66 passed
```

- `tests/nodes.test.mjs` — 每条战事恰好属于一个节点、节点时间单调、取组内末条时刻、三种数据错误会抛、同刻稳定排序；`nodeIndexAtYear` 二分与线性扫描一致；`next/prevNodeIndex` 严格跨越；停留时长夹取；播放器逐节点推进、过渡期年份在两节之间、`tick` 不重复上报、末节点自停、终点再播放回卷、`seekNode`/`seekFree` 语义、拖年表尺后起播不倒退
- `tests/timeline.test.mjs` — 二分查找与线性扫描一致、邻站互逆、重叠时期取值、播放速度在空档年与密集年的方向、freshness 窗口
- `tests/data.test.mjs` — 战事数据完整性与底图结构（省 ≥30、邻国 ≥15、河 ≥8、省名已民国化、basemap < 200 KB）
- `tests/geo.test.mjs` — 投影互逆、`createView` 等比缩放与居中、`createInsetView` 的空闲区贴合、Haversine 京沪距离

## 部署到 GitHub Pages

站点是纯静态的，把 `war-map/` 目录内容推到仓库根（或 `docs/`），在仓库 Settings → Pages 里选对应目录即可。没有构建步骤，不需要 Actions。

`data/geo/raw/` 有 1.6 MB，只在重建底图时用到。只想发布站点可以不带它：

```bash
rsync -a --exclude 'data/geo/raw' war-map/ /path/to/pages-repo/
```

## 边界说明

底图是现代省界与国界的简化几何，只用于定位，不表示任何历史时期的疆域主张。地名尽量采用当时的称法（北平、绥远、荷属东印度），但省界本身无法还原到民国时期。坐标取自事件实际发生地，部分古地名按今地换算，存在数公里级误差。战役的节点切分与命名是编辑判断，不同史著分段不一，这里取的是便于在地图上讲清楚的那一种。

## 素材来源

- 省界：[阿里云 DataV.GeoAtlas](https://geo.datav.aliyun.com/)（100000_full）
- 国界：[johan/world.geo.json](https://github.com/johan/world.geo.json)
- 河流：[Natural Earth](https://www.naturalearthdata.com/) 50m physical rivers

投影为 Albers 等积圆锥（`lon0 = 105°`、`lat0 = 35°`、`lat1 = 25°`、`lat2 = 47°`）。
