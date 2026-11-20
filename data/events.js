// 近代中国战事数据集（1840—1949）
// 每条 = 一个可在地图上落点的战事/事件。坐标取事件实际发生地（WGS84 经纬度）。
// scale: 1 = 局部战斗，2 = 战役，3 = 决定性会战/转折。
// arrows: 可选，行军/进攻/撤退路线，pts 为 [经度, 纬度] 途经点。
// kind: "advance" 进攻推进 / "naval" 海上行动 / "retreat" 撤退转移。

export const ERAS = [
  { id: "opium", name: "鸦片战争", from: 1840, to: 1842, foreign: true, blurb: "英军自珠江口北上，直抵南京城下。" },
  { id: "taiping", name: "太平天国", from: 1851, to: 1864, foreign: false, blurb: "从金田到天京，十四年席卷十八省。" },
  { id: "arrow", name: "第二次鸦片战争", from: 1856, to: 1860, foreign: true, blurb: "英法联军两度北上，圆明园焚毁。" },
  { id: "revolt", name: "捻军与回变", from: 1853, to: 1878, foreign: false, blurb: "中原、西北、云南的长期动荡。" },
  { id: "french", name: "中法战争", from: 1883, to: 1885, foreign: true, blurb: "马尾丧师，镇南关却打了个胜仗。" },
  { id: "jiawu", name: "甲午战争", from: 1894, to: 1895, foreign: true, blurb: "黄海、威海、马关，三十年洋务一战而尽。" },
  { id: "boxer", name: "八国联军", from: 1900, to: 1901, foreign: true, blurb: "廊坊、大沽、北京，辛丑一纸四亿五千万两。" },
  { id: "russo", name: "日俄战争", from: 1904, to: 1905, foreign: true, blurb: "两个帝国在中国东北开战，清政府宣布中立。" },
  { id: "xinhai", name: "辛亥革命", from: 1911, to: 1912, foreign: false, blurb: "武昌一枪，二百六十八年帝制终结。" },
  { id: "warlord", name: "军阀混战与北伐", from: 1913, to: 1928, foreign: false, blurb: "直皖、直奉、国民革命军北上。" },
  { id: "soviet", name: "土地革命", from: 1927, to: 1936, foreign: false, blurb: "从南昌到井冈山，从瑞金到陕北。" },
  { id: "anti", name: "抗日战争", from: 1931, to: 1945, foreign: true, blurb: "十四年，从沈阳到南京受降。" },
  { id: "liberation", name: "解放战争", from: 1945, to: 1949, foreign: false, blurb: "中原、辽沈、淮海、平津、渡江。" },
];

export const EVENTS = [
  // ───────────────────────── 鸦片战争 1840–1842 ─────────────────────────
  {
    id: "op-1840-lin", date: "1840-06-21", era: "opium", name: "英舰队抵珠江口", place: "广东珠江口",
    at: [113.55, 22.15], scale: 2, result: "英军封锁珠江口",
    note: "义律率舰船四十余艘抵粤，见虎门设防严密，转而北上。",
  },
  {
    id: "op-1840-dinghai", date: "1840-07-05", era: "opium", name: "定海之战", place: "浙江定海",
    at: [122.10, 30.02], scale: 2, result: "定海陷落",
    note: "英军攻占定海，知县姚怀祥投水死。此为英军在华占的第一座城池。",
    arrows: [{ kind: "naval", label: "英舰队北上", pts: [[113.55, 22.15], [117.0, 24.5], [121.5, 28.0], [122.10, 30.02]] }],
  },
  {
    id: "op-1840-dagu", date: "1840-08-11", era: "opium", name: "英舰抵大沽口", place: "直隶大沽口",
    at: [117.70, 38.98], scale: 2, result: "清廷允议和，琦善赴粤",
    note: "英军抵白河口投书，直逼京畿。道光帝态度逆转，林则徐被革职。",
    arrows: [{ kind: "naval", label: "北上白河", pts: [[122.10, 30.02], [121.8, 34.5], [119.5, 38.2], [117.70, 38.98]] }],
  },
  {
    id: "op-1841-shajiao", date: "1841-01-07", era: "opium", name: "沙角大角之战", place: "广东虎门",
    at: [113.62, 22.78], scale: 2, result: "虎门第一重门户失守",
    note: "英军攻陷沙角、大角炮台，守将陈连升父子战死。",
  },
  {
    id: "op-1841-hk", date: "1841-01-26", era: "opium", name: "英军占领香港", place: "广东香港",
    at: [114.17, 22.28], scale: 2, result: "英军升旗占岛",
    note: "义律单方面宣布《穿鼻草约》，英军在香港岛登陆升旗。",
  },
  {
    id: "op-1841-humen", date: "1841-02-26", era: "opium", name: "虎门之战", place: "广东虎门",
    at: [113.60, 22.80], scale: 3, result: "虎门失守，关天培殉国",
    note: "英军攻横档、永安诸炮台，水师提督关天培力战而死，虎门要塞尽失。",
  },
  {
    id: "op-1841-sanyuanli", date: "1841-05-30", era: "opium", name: "三元里抗英", place: "广东广州",
    at: [113.24, 23.16], scale: 1, result: "乡民围困英军于牛栏岗",
    note: "《广州和约》后英军四出劫掠，三元里百余乡民众起而围击。",
  },
  {
    id: "op-1841-xiamen", date: "1841-08-26", era: "opium", name: "厦门之战", place: "福建厦门",
    at: [118.08, 24.48], scale: 2, result: "厦门失守",
    note: "英军攻鼓浪屿与厦门本岛，金门镇总兵江继芸战死。",
  },
  {
    id: "op-1841-dinghai2", date: "1841-10-01", era: "opium", name: "定海再陷", place: "浙江定海",
    at: [122.10, 30.02], scale: 3, result: "葛云飞、王锡朋、郑国鸿殉国",
    note: "三总兵分守晓峰岭、竹山门，血战六昼夜，全部阵亡。",
  },
  {
    id: "op-1841-zhenhai", date: "1841-10-10", era: "opium", name: "镇海之战", place: "浙江镇海",
    at: [121.72, 29.95], scale: 2, result: "镇海失守，裕谦自尽",
    note: "两江总督裕谦投泮池死。宁波旋亦不守。",
  },
  {
    id: "op-1842-wusong", date: "1842-06-16", era: "opium", name: "吴淞之战", place: "江苏吴淞",
    at: [121.50, 31.40], scale: 3, result: "吴淞失守，陈化成战死",
    note: "江南提督陈化成守西炮台，中弹殉国。英军溯江而上。",
    arrows: [{ kind: "naval", label: "溯长江而上", pts: [[121.50, 31.40], [120.5, 32.0], [119.45, 32.20]] }],
  },
  {
    id: "op-1842-zhenjiang", date: "1842-07-21", era: "opium", name: "镇江之战", place: "江苏镇江",
    at: [119.45, 32.20], scale: 3, result: "镇江城破",
    note: "副都统海龄率八旗兵巷战，城破自焚。英军伤亡为整场战争最重的一次。",
  },
  {
    id: "op-1842-nanjing", date: "1842-08-29", era: "opium", name: "《南京条约》签订", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "割香港、开五口、赔款两千一百万银元",
    note: "耆英、伊里布登英舰皋华丽号签字，中国近代第一个不平等条约。",
  },

  // ───────────────────────── 太平天国 1851–1864 ─────────────────────────
  {
    id: "tp-1851-jintian", date: "1851-01-11", era: "taiping", name: "金田起义", place: "广西桂平",
    at: [110.08, 23.40], scale: 2, result: "拜上帝会起事，建号太平天国",
    note: "洪秀全三十八岁生日当天在金田村誓师，队伍约两万人。",
  },
  {
    id: "tp-1851-yongan", date: "1851-09-25", era: "taiping", name: "永安建制", place: "广西永安",
    at: [110.52, 24.20], scale: 2, result: "分封五王",
    note: "克永安州后封杨秀清东王、萧朝贵西王、冯云山南王、韦昌辉北王、石达开翼王。",
  },
  {
    id: "tp-1852-quanzhou", date: "1852-06-03", era: "taiping", name: "全州之战", place: "广西全州",
    at: [111.07, 25.93], scale: 2, result: "南王冯云山中炮身亡",
    note: "太平军破全州后入湖南，冯云山于蓑衣渡遭伏击死。",
  },
  {
    id: "tp-1852-changsha", date: "1852-09-11", era: "taiping", name: "长沙之战", place: "湖南长沙",
    at: [112.98, 28.20], scale: 2, result: "西王萧朝贵中炮身亡",
    note: "围城八十余日不克，萧朝贵阵亡。太平军转而北上岳州。",
  },
  {
    id: "tp-1853-wuchang", date: "1853-01-12", era: "taiping", name: "攻克武昌", place: "湖北武昌",
    at: [114.30, 30.55], scale: 3, result: "湖北巡抚常大淳死，太平军增至五十万",
    note: "掘地道轰塌城墙入城，这是太平军攻下的第一座省城。",
    arrows: [{ kind: "advance", label: "顺江东下", pts: [[114.30, 30.55], [116.00, 29.70], [117.05, 30.53], [118.78, 32.06]] }],
  },
  {
    id: "tp-1853-tianjing", date: "1853-03-19", era: "taiping", name: "定都天京", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "改南京为天京，建都",
    note: "自武昌东下，一月之内连下九江、安庆、芜湖，十日破南京。",
  },
  {
    id: "tp-1853-north", date: "1853-05-08", era: "taiping", name: "北伐", place: "江苏扬州",
    at: [119.42, 32.39], scale: 3, result: "林凤祥、李开芳率两万人北上",
    note: "孤军深入，经安徽、河南、山西直入直隶，最远抵天津静海，终至全军覆没。",
    arrows: [{ kind: "advance", label: "北伐路线", pts: [[119.42, 32.39], [115.65, 34.41], [112.95, 35.09], [114.5, 37.6], [116.90, 38.90]] }],
  },
  {
    id: "tp-1853-west", date: "1853-06-03", era: "taiping", name: "西征", place: "安徽安庆",
    at: [117.05, 30.53], scale: 2, result: "胡以晃、赖汉英西上",
    note: "西征军沿江西进，两度攻入湖北，与湘军反复争夺安庆、九江、武昌。",
    arrows: [{ kind: "advance", label: "西征", pts: [[118.78, 32.06], [117.05, 30.53], [116.00, 29.70], [114.30, 30.55]] }],
  },
  {
    id: "tp-1855-hukou", date: "1855-01-29", era: "taiping", name: "湖口之战", place: "江西湖口",
    at: [116.22, 29.73], scale: 3, result: "湘军水师被截为两段，大败",
    note: "石达开诱敌深入，以火筏封湖口，曾国藩座船被俘，投水获救。",
  },
  {
    id: "tp-1856-tianjing", date: "1856-09-02", era: "taiping", name: "天京事变", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "杨秀清、韦昌辉先后被杀，石达开出走",
    note: "东王府两万余人被屠。太平天国由盛转衰的转折点。",
  },
  {
    id: "tp-1860-jiangnan", date: "1860-05-06", era: "taiping", name: "二破江南大营", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "清军江南大营溃散",
    note: "李秀成、陈玉成合击，张国樑败死丹阳，天京围解。",
  },
  {
    id: "tp-1861-anqing", date: "1861-09-05", era: "taiping", name: "安庆陷落", place: "安徽安庆",
    at: [117.05, 30.53], scale: 3, result: "守军万余人战死，天京上游屏障尽失",
    note: "湘军围城一年余，以地道破城。陈玉成退守庐州，次年被俘就义。",
  },
  {
    id: "tp-1861-hangzhou", date: "1861-12-29", era: "taiping", name: "再克杭州", place: "浙江杭州",
    at: [120.16, 30.27], scale: 2, result: "李秀成占杭州",
    note: "第二次攻破杭州，浙江巡抚王有龄自尽。",
  },
  {
    id: "tp-1862-cixi", date: "1862-09-21", era: "taiping", name: "慈溪之战", place: "浙江慈溪",
    at: [121.27, 30.17], scale: 2, result: "常胜军统领华尔中弹身亡",
    note: "华尔率常胜军攻慈溪，中弹后次日死。这支洋枪队此后由戈登接统。",
  },
  {
    id: "tp-1863-suzhou", date: "1863-12-04", era: "taiping", name: "苏州杀降", place: "江苏苏州",
    at: [120.62, 31.30], scale: 2, result: "郜永宽等八王被杀",
    note: "李鸿章诱降后处决降将，戈登愤而持枪寻李。",
  },
  {
    id: "tp-1864-tianjing", date: "1864-07-19", era: "taiping", name: "天京陷落", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "城破，太平天国亡",
    note: "曾国荃掘地道轰塌城墙，湘军入城。洪秀全已于此前病故。",
  },

  // ─────────────────────── 第二次鸦片战争 1856–1860 ───────────────────────
  {
    id: "ar-1856-canton", date: "1856-10-23", era: "arrow", name: "亚罗号事件", place: "广东广州",
    at: [113.26, 23.13], scale: 1, result: "英军攻占广州内河炮台",
    note: "一艘中国船挂英国旗被查，成为第二次鸦片战争的导火索。",
  },
  {
    id: "ar-1857-guangzhou", date: "1857-12-29", era: "arrow", name: "英法联军陷广州", place: "广东广州",
    at: [113.26, 23.13], scale: 3, result: "叶名琛被俘，送加尔各答",
    note: "联军五日破城，两广总督叶名琛坐衙不战，被掳后客死印度。",
  },
  {
    id: "ar-1858-dagu", date: "1858-05-20", era: "arrow", name: "第一次大沽口之战", place: "直隶大沽口",
    at: [117.70, 38.98], scale: 3, result: "炮台失守，联军直抵天津",
    note: "英法联军北上，两小时内摧毁大沽四座炮台。",
    arrows: [{ kind: "naval", label: "联军北上", pts: [[113.26, 23.13], [120.0, 29.0], [121.8, 34.0], [118.5, 38.0], [117.70, 38.98]] }],
  },
  {
    id: "ar-1858-tianjin", date: "1858-06-26", era: "arrow", name: "《天津条约》", place: "直隶天津",
    at: [117.20, 39.13], scale: 2, result: "增开十口通商，赔款六百万两",
    note: "公使驻京、内河通商、传教自由诸款，清廷最不能接受的是公使驻京。",
  },
  {
    id: "ar-1859-dagu", date: "1859-06-25", era: "arrow", name: "第二次大沽口之战", place: "直隶大沽口",
    at: [117.70, 38.98], scale: 3, result: "清军获胜，联军退走",
    note: "僧格林沁设伏，击沉击伤联军舰艇十余艘，这是晚清少有的一场胜仗。",
  },
  {
    id: "ar-1860-dagu", date: "1860-08-21", era: "arrow", name: "大沽口失守", place: "直隶大沽口",
    at: [117.70, 38.98], scale: 2, result: "联军登陆，天津旋陷",
    note: "联军两万余人自北塘登陆，绕击大沽后路。",
  },
  {
    id: "ar-1860-baliqiao", date: "1860-09-21", era: "arrow", name: "八里桥之战", place: "直隶通州",
    at: [116.63, 39.90], scale: 3, result: "僧格林沁马队崩溃，北京门户洞开",
    note: "三万蒙古马队冲击联军阵线，在米涅步枪与火炮下伤亡过半。",
    arrows: [{ kind: "advance", label: "进军北京", pts: [[117.20, 39.13], [116.63, 39.90], [116.40, 39.90]] }],
  },
  {
    id: "ar-1860-yuanming", date: "1860-10-06", era: "arrow", name: "圆明园被焚", place: "直隶北京",
    at: [116.30, 40.01], scale: 3, result: "三山五园付之一炬",
    note: "英法联军劫掠圆明园，十余日后纵火，大火三日不熄。",
  },
  {
    id: "ar-1860-beijing", date: "1860-10-24", era: "arrow", name: "《北京条约》", place: "直隶北京",
    at: [116.40, 39.90], scale: 3, result: "割九龙司，增开天津为商埠",
    note: "确认《天津条约》，并割让九龙半岛南端。",
  },

  // ──────────────────────── 捻军与回变 1853–1878 ────────────────────────
  {
    id: "rv-1855-zhuihe", date: "1855-08-01", era: "revolt", name: "雉河集会盟", place: "安徽亳州",
    at: [116.22, 33.51], scale: 2, result: "捻军五旗合为一股",
    note: "张乐行被推为盟主，捻军自此成建制，以骑兵流动作战见长。",
  },
  {
    id: "rv-1865-gaolou", date: "1865-05-18", era: "revolt", name: "高楼寨之战", place: "山东菏泽",
    at: [115.48, 35.23], scale: 3, result: "僧格林沁战死",
    note: "捻军诱敌深入，全歼其马队。清廷倚为长城的蒙古亲王殒命麦田。",
  },
  {
    id: "rv-1868-tuha", date: "1868-08-16", era: "revolt", name: "徒骇河败亡", place: "山东茌平",
    at: [116.30, 36.80], scale: 2, result: "西捻军覆灭",
    note: "张宗禹被围于徒骇河畔，投水不知所终。捻军主力至此尽。",
  },
  {
    id: "rv-1856-dali", date: "1856-09-01", era: "revolt", name: "杜文秀据大理", place: "云南大理",
    at: [100.23, 25.60], scale: 2, result: "云南回民政权建立",
    note: "大理政权延续十八年，最盛时控制云南过半州县。",
  },
  {
    id: "rv-1869-jinjibao", date: "1869-11-01", era: "revolt", name: "金积堡之战", place: "甘肃灵州",
    at: [106.20, 37.99], scale: 3, result: "马化龙降后被处死",
    note: "左宗棠围堡近两年，以壕沟锁困。此役后陕甘局势逆转。",
  },
  {
    id: "rv-1873-suzhou", date: "1873-11-01", era: "revolt", name: "肃州克复", place: "甘肃肃州",
    at: [98.49, 39.73], scale: 2, result: "甘肃全境平定",
    note: "左宗棠用兵五年，肃州既下，西征新疆的门户打开。",
  },
  {
    id: "rv-1876-urumqi", date: "1876-11-06", era: "revolt", name: "收复乌鲁木齐", place: "新疆迪化",
    at: [87.62, 43.82], scale: 3, result: "古牧地、乌鲁木齐相继克复",
    note: "左宗棠\"缓进急战\"，一年内收复北疆。",
    arrows: [{ kind: "advance", label: "西征", pts: [[98.49, 39.73], [93.5, 42.0], [87.62, 43.82]] }],
  },

  // ───────────────────────── 中法战争 1883–1885 ─────────────────────────
  {
    id: "fr-1883-sontay", date: "1883-12-16", era: "french", name: "山西之战", place: "越南山西",
    at: [105.50, 21.15], scale: 2, result: "黑旗军退守，山西失陷",
    note: "法军攻越南山西，刘永福黑旗军与清军协同防守失利。",
  },
  {
    id: "fr-1884-bacninh", date: "1884-03-12", era: "french", name: "北宁之战", place: "越南北宁",
    at: [106.05, 21.18], scale: 2, result: "清军溃退，北宁失守",
    note: "广西巡抚徐延旭部不战而溃，清廷震动，主战派抬头。",
  },
  {
    id: "fr-1884-mawai", date: "1884-08-23", era: "french", name: "马尾海战", place: "福建马尾",
    at: [119.45, 26.00], scale: 3, result: "福建水师全军覆没",
    note: "半小时内十一艘舰艇被击沉，船政学堂与马尾船厂俱毁。",
  },
  {
    id: "fr-1884-keelung", date: "1884-10-01", era: "french", name: "基隆之战", place: "台湾基隆",
    at: [121.74, 25.13], scale: 2, result: "法军占领基隆煤矿",
    note: "孤拔转攻台湾，刘铭传弃基隆守沪尾。",
  },
  {
    id: "fr-1884-tamsui", date: "1884-10-08", era: "french", name: "沪尾之战", place: "台湾淡水",
    at: [121.44, 25.17], scale: 3, result: "法军登陆受挫",
    note: "法军六百人登陆被围，伤亡过半。台湾战局由此僵持。",
  },
  {
    id: "fr-1885-zhenhai", date: "1885-03-01", era: "french", name: "镇海之战", place: "浙江镇海",
    at: [121.72, 29.95], scale: 2, result: "孤拔舰队受阻，孤拔病死",
    note: "招宝山炮台击中法舰，舰队司令孤拔后死于澎湖。",
  },
  {
    id: "fr-1885-zhennanguan", date: "1885-03-24", era: "french", name: "镇南关大捷", place: "广西镇南关",
    at: [106.72, 22.05], scale: 3, result: "法军溃退，尼格里重伤",
    note: "冯子材率萃军筑长墙死守，年近七旬持矛跃出墙外，全军随之。",
    arrows: [{ kind: "advance", label: "乘胜追击", pts: [[106.72, 22.05], [106.75, 21.85]] }],
  },
  {
    id: "fr-1885-langson", date: "1885-03-29", era: "french", name: "克复谅山", place: "越南谅山",
    at: [106.75, 21.85], scale: 2, result: "法军退出谅山",
    note: "镇南关之后连克文渊、谅山，巴黎内阁因此倒台。",
  },
  {
    id: "fr-1885-tianjin", date: "1885-06-09", era: "french", name: "《中法新约》", place: "直隶天津",
    at: [117.20, 39.13], scale: 2, result: "不败而败，越南归法",
    note: "李鸿章签约，承认法国对越南的保护权，西南门户洞开。",
  },

  // ───────────────────────── 甲午战争 1894–1895 ─────────────────────────
  {
    id: "jw-1894-fengdao", date: "1894-07-25", era: "jiawu", name: "丰岛海战", place: "朝鲜丰岛",
    at: [126.00, 37.10], scale: 2, result: "高升号被击沉，千余清军溺亡",
    note: "日舰不宣而战，运兵船高升号被击沉，战争由此开始。",
  },
  {
    id: "jw-1894-seonghwan", date: "1894-07-29", era: "jiawu", name: "成欢之战", place: "朝鲜成欢",
    at: [126.90, 36.90], scale: 2, result: "清军败退平壤",
    note: "聂士成部在成欢驿阻击失利，退守平壤。",
  },
  {
    id: "jw-1894-pyongyang", date: "1894-09-15", era: "jiawu", name: "平壤之战", place: "朝鲜平壤",
    at: [125.75, 39.03], scale: 3, result: "清军溃退，左宝贵战死",
    note: "总兵左宝贵登玄武门督战，中炮身亡。主帅叶志超竖白旗弃城夜逃。",
  },
  {
    id: "jw-1894-yalu", date: "1894-09-17", era: "jiawu", name: "黄海海战", place: "黄海大东沟",
    at: [123.50, 39.30], scale: 3, result: "北洋舰队五舰沉没",
    note: "丁汝昌受伤，致远舰管带邓世昌下令撞敌，中雷沉没，全舰殉国。",
  },
  {
    id: "jw-1894-yalu2", date: "1894-10-24", era: "jiawu", name: "鸭绿江防线崩溃", place: "安东鸭绿江",
    at: [124.40, 40.00], scale: 2, result: "日军渡江，辽东门户洞开",
    note: "三万清军沿江布防，一夜之间全线后撤。",
    arrows: [{ kind: "advance", label: "日军渡江", pts: [[124.40, 40.00], [123.5, 40.5], [121.72, 39.10]] }],
  },
  {
    id: "jw-1894-jinzhou", date: "1894-11-06", era: "jiawu", name: "金州陷落", place: "奉天金州",
    at: [121.72, 39.10], scale: 2, result: "旅顺后路被切断",
    note: "日军自花园口登陆，攻金州、大连湾，旅顺成孤城。",
  },
  {
    id: "jw-1894-lvshun", date: "1894-11-21", era: "jiawu", name: "旅顺陷落", place: "奉天旅顺",
    at: [121.25, 38.85], scale: 3, result: "旅顺大屠杀",
    note: "日军入城四日，屠杀居民约两万人。",
  },
  {
    id: "jw-1895-weihai", date: "1895-01-20", era: "jiawu", name: "威海卫之战", place: "山东威海卫",
    at: [122.10, 37.50], scale: 3, result: "北洋舰队困守刘公岛",
    note: "日军自荣成湾登陆，抄袭威海卫后路，海陆合围。",
  },
  {
    id: "jw-1895-liugong", date: "1895-02-12", era: "jiawu", name: "北洋水师覆没", place: "山东刘公岛",
    at: [122.18, 37.50], scale: 3, result: "丁汝昌自尽，舰队降",
    note: "定远自沉，镇远被俘。三十余年洋务经营，至此归零。",
  },
  {
    id: "jw-1895-penghu", date: "1895-03-23", era: "jiawu", name: "澎湖陷落", place: "台湾澎湖",
    at: [119.57, 23.57], scale: 2, result: "日军占澎湖，威胁台湾",
    note: "日军攻占澎湖列岛，为割台做准备。",
  },
  {
    id: "jw-1895-maguan", date: "1895-04-17", era: "jiawu", name: "《马关条约》", place: "日本马关",
    at: [130.94, 33.95], scale: 3, result: "割台湾、赔两亿两",
    note: "李鸿章遇刺后仍签字。赔款相当于清廷三年财政收入。",
  },

  // ───────────────────────── 八国联军 1900–1901 ─────────────────────────
  {
    id: "bx-1900-langfang", date: "1900-06-10", era: "boxer", name: "西摩尔联军受阻", place: "直隶廊坊",
    at: [116.70, 39.50], scale: 2, result: "联军退回天津",
    note: "两千余联军自天津乘火车北上，铁路被拆，困于廊坊一带。",
  },
  {
    id: "bx-1900-dagu", date: "1900-06-17", era: "boxer", name: "大沽口炮台失守", place: "直隶大沽口",
    at: [117.70, 38.98], scale: 3, result: "联军自海口登陆",
    note: "联军攻占四座炮台，天津门户洞开。",
    arrows: [{ kind: "advance", label: "向天津", pts: [[117.70, 38.98], [117.20, 39.13]] }],
  },
  {
    id: "bx-1900-nieshi", date: "1900-07-09", era: "boxer", name: "聂士成殉国", place: "直隶天津",
    at: [117.20, 39.05], scale: 2, result: "八里台之战，聂士成阵亡",
    note: "直隶提督聂士成腹破肠出仍督战，中炮死。",
  },
  {
    id: "bx-1900-tianjin", date: "1900-07-14", era: "boxer", name: "天津陷落", place: "直隶天津",
    at: [117.20, 39.13], scale: 3, result: "联军占天津，设都统衙门",
    note: "城墙被炮火轰塌，城内遭连日劫掠。",
  },
  {
    id: "bx-1900-beijing", date: "1900-08-14", era: "boxer", name: "北京陷落", place: "直隶北京",
    at: [116.40, 39.90], scale: 3, result: "慈禧挟光绪西逃",
    note: "联军自广渠门、东便门攻入，城内分区占领。",
    arrows: [{ kind: "advance", label: "进军北京", pts: [[117.20, 39.13], [116.70, 39.60], [116.40, 39.90]] }],
  },
  {
    id: "bx-1900-manchuria", date: "1900-07-16", era: "boxer", name: "俄军入侵东北", place: "黑龙江瑷珲",
    at: [127.50, 50.25], scale: 3, result: "江东六十四屯惨案，东北全境被占",
    note: "俄军十七万分六路入东北，制造海兰泡与江东六十四屯惨案。",
  },
  {
    id: "bx-1901-xinchou", date: "1901-09-07", era: "boxer", name: "《辛丑条约》", place: "直隶北京",
    at: [116.40, 39.90], scale: 3, result: "赔款四亿五千万两，分三十九年",
    note: "本息合计约九亿八千万两，以关税盐税抵押，列强驻兵北京至山海关沿线。",
  },

  // ───────────────────────── 日俄战争 1904–1905 ─────────────────────────
  {
    id: "rj-1904-portarthur", date: "1904-02-08", era: "russo", name: "旅顺口夜袭", place: "奉天旅顺",
    at: [121.25, 38.85], scale: 3, result: "日舰偷袭俄太平洋舰队",
    note: "战争在中国领土上爆发，清政府宣布\"局外中立\"，划辽河以东为战区。",
  },
  {
    id: "rj-1904-yalu", date: "1904-05-01", era: "russo", name: "鸭绿江会战", place: "安东鸭绿江",
    at: [124.40, 40.00], scale: 2, result: "日军渡江成功",
    note: "第一军强渡鸭绿江，俄军退守辽阳。",
  },
  {
    id: "rj-1904-liaoyang", date: "1904-08-24", era: "russo", name: "辽阳会战", place: "奉天辽阳",
    at: [123.17, 41.27], scale: 3, result: "俄军退守奉天",
    note: "双方投入约三十万人，日军伤亡两万余，俄军退却。",
  },
  {
    id: "rj-1904-shahe", date: "1904-10-09", era: "russo", name: "沙河会战", place: "奉天沙河",
    at: [123.40, 41.40], scale: 2, result: "战线胶着于沙河",
    note: "日军攻势顿挫，两军掘壕对峙，进入消耗阶段。",
  },
  {
    id: "rj-1904-hill203", date: "1904-12-05", era: "russo", name: "203高地争夺", place: "奉天旅顺",
    at: [121.20, 38.80], scale: 3, result: "日军夺高地，旅顺舰队覆灭",
    note: "乃木希典强攻数月，伤亡逾万，最终以炮火自高地俯击港内舰队。",
  },
  {
    id: "rj-1905-portarthur", date: "1905-01-02", era: "russo", name: "旅顺俄军投降", place: "奉天旅顺",
    at: [121.25, 38.85], scale: 2, result: "俄军三万余人就俘",
    note: "要塞司令斯特塞尔投降，太平洋舰队主力尽失。",
  },
  {
    id: "rj-1905-mukden", date: "1905-03-10", era: "russo", name: "奉天会战", place: "奉天",
    at: [123.43, 41.80], scale: 3, result: "俄军全线北撤",
    note: "双方投入逾六十万，是当时规模最大的陆战。俄军退守四平街。",
  },
  {
    id: "rj-1905-tsushima", date: "1905-05-27", era: "russo", name: "对马海战", place: "对马海峡",
    at: [129.30, 34.50], scale: 3, result: "俄波罗的海舰队覆没",
    note: "东乡平八郎以T字战法截击，俄舰三十八艘中仅三艘抵达海参崴。",
  },

  // ───────────────────────── 辛亥革命 1911–1912 ─────────────────────────
  {
    id: "xh-1911-huanghuagang", date: "1911-04-27", era: "xinhai", name: "黄花岗起义", place: "广东广州",
    at: [113.28, 23.14], scale: 2, result: "七十二烈士葬于黄花岗",
    note: "黄兴率敢死队攻两广总督署，孤军奋战一夜而败。",
  },
  {
    id: "xh-1911-chengdu", date: "1911-09-07", era: "xinhai", name: "成都血案", place: "四川成都",
    at: [104.07, 30.67], scale: 2, result: "保路运动激化，四川独立",
    note: "总督赵尔丰枪杀请愿民众，全川起事，清廷调鄂军入川。",
  },
  {
    id: "xh-1911-wuchang", date: "1911-10-10", era: "xinhai", name: "武昌起义", place: "湖北武昌",
    at: [114.30, 30.55], scale: 3, result: "湖北军政府成立",
    note: "工程营士兵熊秉坤打响第一枪，一夜之间占领武昌城。",
    arrows: [{ kind: "advance", label: "各省响应", pts: [[114.30, 30.55], [112.98, 28.20], [115.90, 28.68], [118.78, 32.06]] }],
  },
  {
    id: "xh-1911-changsha", date: "1911-10-22", era: "xinhai", name: "长沙光复", place: "湖南长沙",
    at: [112.98, 28.20], scale: 2, result: "湖南独立",
    note: "焦达峰、陈作新率新军起事，十日之内湖南、陕西相继独立。",
  },
  {
    id: "xh-1911-xian", date: "1911-10-22", era: "xinhai", name: "西安光复", place: "陕西西安",
    at: [108.94, 34.26], scale: 2, result: "陕西独立",
    note: "新军与哥老会起事，满城被攻破，陕甘局势失控。",
  },
  {
    id: "xh-1911-taiyuan", date: "1911-10-29", era: "xinhai", name: "太原光复", place: "山西太原",
    at: [112.55, 37.87], scale: 2, result: "山西独立，阎锡山为都督",
    note: "新军第八十五标起事，巡抚陆钟琦被杀。",
  },
  {
    id: "xh-1911-shanghai", date: "1911-11-03", era: "xinhai", name: "上海光复", place: "江苏上海",
    at: [121.47, 31.23], scale: 2, result: "陈其美为沪军都督",
    note: "商团与敢死队攻江南制造局，上海光复后成为革命财政中枢。",
  },
  {
    id: "xh-1911-hanyang", date: "1911-11-27", era: "xinhai", name: "汉阳失守", place: "湖北汉阳",
    at: [114.25, 30.55], scale: 2, result: "革命军退守武昌",
    note: "黄兴督战月余，汉阳失陷，革命军转入守势。",
  },
  {
    id: "xh-1911-nanjing", date: "1911-12-02", era: "xinhai", name: "南京光复", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "江浙联军克南京",
    note: "天堡城一战定局，南京成为临时政府所在地。",
  },
  {
    id: "xh-1912-tuiwei", date: "1912-02-12", era: "xinhai", name: "清帝退位", place: "直隶北京",
    at: [116.40, 39.90], scale: 3, result: "宣统帝溥仪退位，帝制终结",
    note: "隆裕太后颁诏，二百六十八年清祚告终。",
  },

  // ─────────────────── 军阀混战与北伐 1913–1928 ───────────────────
  {
    id: "wl-1913-hukou", date: "1913-07-12", era: "warlord", name: "二次革命", place: "江西湖口",
    at: [116.22, 29.73], scale: 2, result: "讨袁军起，两月而败",
    note: "李烈钧在湖口宣布独立，南京、安徽、广东相继响应，旋被北洋军击破。",
  },
  {
    id: "wl-1916-luzhou", date: "1916-02-06", era: "warlord", name: "护国战争", place: "四川纳溪",
    at: [105.37, 28.77], scale: 2, result: "川南拉锯，袁世凯取消帝制",
    note: "护国军在泸州、纳溪一带与北洋军激战月余，南方各省相继独立。",
  },
  {
    id: "wl-1917-zhangxun", date: "1917-07-01", era: "warlord", name: "张勋复辟", place: "直隶北京",
    at: [116.40, 39.90], scale: 1, result: "十二天而败",
    note: "辫子军入京拥溥仪复位，段祺瑞马厂誓师讨逆，复辟旋即瓦解。",
  },
  {
    id: "wl-1920-zhuan", date: "1920-07-14", era: "warlord", name: "直皖战争", place: "直隶涿州",
    at: [115.97, 39.48], scale: 2, result: "皖系败，段祺瑞下野",
    note: "直系与皖系在京畿交战五日，奉系入关助直，皖系边防军瓦解。",
  },
  {
    id: "wl-1922-zhifeng", date: "1922-04-29", era: "warlord", name: "第一次直奉战争", place: "直隶山海关",
    at: [119.75, 40.01], scale: 3, result: "奉军退回关外",
    note: "两军在山海关、长辛店一线激战，奉系败退，张作霖宣布东北自治。",
  },
  {
    id: "wl-1924-zhifeng", date: "1924-09-15", era: "warlord", name: "第二次直奉战争", place: "直隶九门口",
    at: [119.72, 40.10], scale: 3, result: "冯玉祥倒戈，直系崩溃",
    note: "山海关、九门口鏖战，冯玉祥回师北京发动政变，吴佩孚南逃。",
  },
  {
    id: "wl-1926-shi", date: "1926-07-09", era: "warlord", name: "广州誓师北伐", place: "广东广州",
    at: [113.26, 23.13], scale: 3, result: "国民革命军八个军北上",
    note: "蒋介石任总司令，兵力约十万，对手是吴佩孚、孙传芳、张作霖三方七十万。",
    arrows: [{ kind: "advance", label: "北伐路线", pts: [[113.26, 23.13], [112.98, 28.20], [114.08, 29.90], [114.30, 30.55], [115.90, 28.68], [118.78, 32.06]] }],
  },
  {
    id: "wl-1926-tingsi", date: "1926-08-26", era: "warlord", name: "汀泗桥、贺胜桥", place: "湖北咸宁",
    at: [114.08, 29.90], scale: 3, result: "叶挺独立团突破，武汉门户洞开",
    note: "两桥皆为险要，吴佩孚亲临督战。独立团以白刃冲锋夺桥。",
  },
  {
    id: "wl-1926-wuchang", date: "1926-09-06", era: "warlord", name: "攻克武昌", place: "湖北武昌",
    at: [114.30, 30.55], scale: 3, result: "围城四十日，武昌陷",
    note: "以地道爆破攻城，守军万余人被俘。",
  },
  {
    id: "wl-1926-nanchang", date: "1926-11-08", era: "warlord", name: "南昌克复", place: "江西南昌",
    at: [115.90, 28.68], scale: 2, result: "孙传芳主力被歼",
    note: "南昌三得三失，最终以攻坚破城。",
  },
  {
    id: "wl-1927-nanjing", date: "1927-03-24", era: "warlord", name: "南京克复", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "国民政府定都南京",
    note: "北伐军自浙江、安徽合击，南京城破。",
  },
  {
    id: "wl-1928-jinan", date: "1928-05-03", era: "warlord", name: "济南惨案", place: "山东济南",
    at: [117.00, 36.67], scale: 2, result: "日军阻北伐军北上，交涉员蔡公时被杀",
    note: "日军以护侨为名出兵，屠杀中国军民数千人。北伐军绕道渡河北上。",
  },
  {
    id: "wl-1928-huanggutun", date: "1928-06-04", era: "warlord", name: "皇姑屯事件", place: "奉天皇姑屯",
    at: [123.40, 41.80], scale: 2, result: "张作霖被炸身亡",
    note: "关东军预埋炸药于铁桥下，张作霖重伤次日死。",
  },
  {
    id: "wl-1928-yizhi", date: "1928-12-29", era: "warlord", name: "东北易帜", place: "奉天",
    at: [123.43, 41.80], scale: 3, result: "张学良宣布服从南京政府",
    note: "五色旗降下，青天白日旗升起，形式上的统一完成。",
  },

  // ───────────────────────── 土地革命 1927–1936 ─────────────────────────
  {
    id: "sv-1927-nanchang", date: "1927-08-01", era: "soviet", name: "南昌起义", place: "江西南昌",
    at: [115.90, 28.68], scale: 3, result: "起义部队南下潮汕",
    note: "凌晨二时举事，四小时内解决城内守军，随后按计划南下。",
    arrows: [{ kind: "advance", label: "南下", pts: [[115.90, 28.68], [115.0, 25.8], [116.7, 23.6]] }],
  },
  {
    id: "sv-1927-qiushou", date: "1927-09-09", era: "soviet", name: "秋收起义", place: "湖南长沙",
    at: [113.00, 28.20], scale: 2, result: "进攻长沙受挫，转兵井冈山",
    note: "三路进攻均失利，毛泽东在文家市决定放弃攻打长沙，向罗霄山脉转移。",
    arrows: [{ kind: "advance", label: "转兵井冈山", pts: [[113.00, 28.20], [113.9, 27.4], [114.17, 26.57]] }],
  },
  {
    id: "sv-1927-guangzhou", date: "1927-12-11", era: "soviet", name: "广州起义", place: "广东广州",
    at: [113.26, 23.13], scale: 2, result: "三日而败",
    note: "起义军占领广州大部，在张发奎部反扑下撤退，伤亡惨重。",
  },
  {
    id: "sv-1928-jinggang", date: "1928-04-28", era: "soviet", name: "井冈山会师", place: "江西宁冈",
    at: [114.17, 26.57], scale: 2, result: "红四军成立",
    note: "朱德、陈毅率南昌起义余部上山，与毛泽东部会合，合编为第四军。",
  },
  {
    id: "sv-1930-longgang", date: "1930-12-30", era: "soviet", name: "第一次反围剿", place: "江西永丰龙冈",
    at: [115.70, 27.10], scale: 2, result: "歼敌近万，活捉张辉瓒",
    note: "\"诱敌深入\"，在龙冈设伏全歼第十八师师部及两个旅。",
  },
  {
    id: "sv-1931-second", date: "1931-05-16", era: "soviet", name: "第二次反围剿", place: "江西富田",
    at: [115.40, 26.90], scale: 2, result: "十五日横扫七百里",
    note: "自富田打起，由西向东连打五仗，歼敌三万余人。",
  },
  {
    id: "sv-1934-changzheng", date: "1934-10-17", era: "soviet", name: "长征出发", place: "江西瑞金",
    at: [116.03, 25.88], scale: 3, result: "中央红军八万六千人西进",
    note: "于都河上架浮桥夜渡，队伍带上了印钞机与X光机。",
    arrows: [{ kind: "retreat", label: "西进", pts: [[116.03, 25.88], [113.5, 25.3], [110.67, 25.60]] }],
  },
  {
    id: "sv-1934-xiangjiang", date: "1934-11-27", era: "soviet", name: "湘江战役", place: "广西兴安",
    at: [110.67, 25.60], scale: 3, result: "红军由八万六千人减至三万",
    note: "为掩护中央纵队渡江，红三十四师全师覆没。此役后全军要求改变指挥。",
  },
  {
    id: "sv-1935-zunyi", date: "1935-01-15", era: "soviet", name: "遵义会议", place: "贵州遵义",
    at: [106.93, 27.70], scale: 3, result: "确立新的军事指挥",
    note: "会议开了三天，会后四渡赤水，摆脱四十万追兵。",
    arrows: [{ kind: "advance", label: "四渡赤水", pts: [[106.93, 27.70], [105.70, 28.58], [106.93, 27.70], [104.5, 27.3], [102.20, 26.40]] }],
  },
  {
    id: "sv-1935-luding", date: "1935-05-29", era: "soviet", name: "飞夺泸定桥", place: "四川泸定",
    at: [102.23, 29.91], scale: 3, result: "二十二勇士攀铁索夺桥",
    note: "一昼夜奔袭二百四十里，桥板已拆，只剩十三根铁索。",
  },
  {
    id: "sv-1935-maogong", date: "1935-06-12", era: "soviet", name: "懋功会师", place: "四川懋功",
    at: [102.36, 31.00], scale: 2, result: "红一、四方面军会合",
    note: "翻越夹金山后与四方面军会师，随后在北上方向上产生分歧。",
  },
  {
    id: "sv-1935-wuqi", date: "1935-10-19", era: "soviet", name: "到达吴起镇", place: "陕西吴起",
    at: [108.18, 36.93], scale: 3, result: "中央红军长征结束",
    note: "翻越六盘山后进入陕北，行程二万五千里，历时一年。",
  },
  {
    id: "sv-1936-huining", date: "1936-10-09", era: "soviet", name: "会宁会师", place: "甘肃会宁",
    at: [105.05, 35.70], scale: 3, result: "三大主力会师",
    note: "红一、二、四方面军在会宁、将台堡会合，长征全部结束。",
  },

  // ───────────────────────── 抗日战争 1931–1945 ─────────────────────────
  {
    id: "aj-1931-mukden", date: "1931-09-18", era: "anti", name: "九一八事变", place: "奉天",
    at: [123.43, 41.80], scale: 3, result: "东北军不抵抗，沈阳陷落",
    note: "关东军自爆南满铁路柳条湖段反诬中国军队，当夜进攻北大营。",
    arrows: [{ kind: "advance", label: "日军侵占东北", pts: [[123.43, 41.80], [125.32, 43.90], [126.63, 45.75], [123.60, 46.70]] }],
  },
  {
    id: "aj-1931-jiangqiao", date: "1931-11-04", era: "anti", name: "江桥抗战", place: "黑龙江泰来",
    at: [123.60, 46.70], scale: 2, result: "马占山部阻击半月",
    note: "嫩江桥一役，是九一八后中国军队第一次有组织的抵抗。",
  },
  {
    id: "aj-1932-shanghai", date: "1932-01-28", era: "anti", name: "一·二八淞沪抗战", place: "江苏上海",
    at: [121.47, 31.23], scale: 3, result: "十九路军苦战三十三日",
    note: "庙行一战歼敌三千，日军三易主帅。",
  },
  {
    id: "aj-1932-manchukuo", date: "1932-03-01", era: "anti", name: "伪满洲国成立", place: "吉林长春",
    at: [125.32, 43.90], scale: 2, result: "溥仪就任执政",
    note: "东北三省沦为日本殖民地，国联调查团报告未能阻止。",
  },
  {
    id: "aj-1933-xifengkou", date: "1933-03-09", era: "anti", name: "喜峰口抗战", place: "河北喜峰口",
    at: [118.30, 40.40], scale: 2, result: "二十九军大刀队夜袭得手",
    note: "长城各口鏖战，二十九军以大刀近战，歼敌数百。",
  },
  {
    id: "aj-1936-xian", date: "1936-12-12", era: "anti", name: "西安事变", place: "陕西西安",
    at: [108.94, 34.26], scale: 3, result: "张学良、杨虎城兵谏，促成合作抗日",
    note: "蒋介石被扣于华清池，两周后和平解决，十年内战基本结束。",
  },
  {
    id: "aj-1937-lugou", date: "1937-07-07", era: "anti", name: "卢沟桥事变", place: "河北宛平",
    at: [116.22, 39.85], scale: 3, result: "全面抗战爆发",
    note: "日军以士兵失踪为借口要求入宛平搜查，被拒后炮轰县城。",
    arrows: [{ kind: "advance", label: "日军南下", pts: [[116.22, 39.85], [116.40, 39.90], [117.20, 39.13], [117.00, 36.67]] }],
  },
  {
    id: "aj-1937-songhu", date: "1937-08-13", era: "anti", name: "淞沪会战", place: "江苏上海",
    at: [121.47, 31.23], scale: 3, result: "三个月血战，日军伤亡逾四万",
    note: "中国投入约七十个师七十余万人，日均伤亡近三千。宝山姚子青营全营殉国。",
  },
  {
    id: "aj-1937-pingxing", date: "1937-09-25", era: "anti", name: "平型关伏击", place: "山西灵丘",
    at: [113.90, 39.30], scale: 2, result: "歼日军千余人",
    note: "八路军一一五师在乔沟设伏，击毁汽车百余辆，是全国抗战首个大捷。",
  },
  {
    id: "aj-1937-xinkou", date: "1937-10-13", era: "anti", name: "忻口会战", place: "山西忻州",
    at: [112.70, 38.70], scale: 3, result: "鏖战二十三日，军长郝梦龄阵亡",
    note: "忻口为太原门户，第九军军长郝梦龄中弹殉国，是抗战中牺牲的第一位军长。",
  },
  {
    id: "aj-1937-nanjing", date: "1937-12-13", era: "anti", name: "南京陷落", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "南京大屠杀，三十万以上同胞遇难",
    note: "城破后六周内，日军在南京及周边大规模屠杀、强奸、劫掠。",
    arrows: [{ kind: "advance", label: "日军西进", pts: [[121.47, 31.23], [119.9, 31.7], [118.78, 32.06]] }],
  },
  {
    id: "aj-1938-taierzhuang", date: "1938-03-24", era: "anti", name: "台儿庄大捷", place: "山东峄县",
    at: [117.73, 34.56], scale: 3, result: "歼敌万余人",
    note: "巷战半月，守军与敌逐屋争夺。此役为正面战场首次大捷。",
  },
  {
    id: "aj-1938-wuhan", date: "1938-06-12", era: "anti", name: "武汉会战", place: "湖北武汉",
    at: [114.30, 30.55], scale: 3, result: "鏖战四月余，武汉弃守",
    note: "双方投入逾百万。万家岭一役几乎全歼日军第一〇六师团。",
  },
  {
    id: "aj-1938-guangzhou", date: "1938-10-21", era: "anti", name: "广州陷落", place: "广东广州",
    at: [113.26, 23.13], scale: 2, result: "华南门户失守，粤汉路被切断",
    note: "日军自大亚湾登陆，十日之内轻取广州。",
  },
  {
    id: "aj-1939-changsha", date: "1939-09-14", era: "anti", name: "第一次长沙会战", place: "湖南长沙",
    at: [112.98, 28.20], scale: 3, result: "日军退回原阵地",
    note: "薛岳以\"天炉战法\"节节抵抗、诱敌深入，日军补给不继后撤。",
  },
  {
    id: "aj-1940-zaoyang", date: "1940-05-16", era: "anti", name: "枣宜会战", place: "湖北宜城",
    at: [112.26, 31.72], scale: 3, result: "张自忠殉国",
    note: "集团军总司令张自忠亲率两千人渡襄河督战，中弹阵亡，为抗战中牺牲的最高将领。",
  },
  {
    id: "aj-1940-baituan", date: "1940-08-20", era: "anti", name: "百团大战", place: "山西阳泉",
    at: [113.58, 37.86], scale: 3, result: "破袭正太路，参战一百零五个团",
    note: "八路军在华北全线破路、拔点，三个月作战一千八百余次。",
  },
  {
    id: "aj-1941-hongkong", date: "1941-12-08", era: "anti", name: "香港沦陷", place: "广东香港",
    at: [114.17, 22.28], scale: 2, result: "十八日而陷",
    note: "日军自深圳河南下，英军投降，香港进入三年零八个月的日占时期。",
  },
  {
    id: "aj-1942-toungoo", date: "1942-03-20", era: "anti", name: "同古保卫战", place: "缅甸同古",
    at: [96.43, 18.93], scale: 2, result: "戴安澜部坚守十二日",
    note: "中国远征军入缅首战，第二百师以寡敌众，掩护英军撤退。",
    arrows: [{ kind: "advance", label: "远征军入缅", pts: [[98.49, 24.0], [97.5, 21.5], [96.43, 18.93]] }],
  },
  {
    id: "aj-1942-yenangyaung", date: "1942-04-19", era: "anti", name: "仁安羌解围", place: "缅甸仁安羌",
    at: [94.90, 20.50], scale: 2, result: "救出英军七千余人",
    note: "新三十八师一一三团以一团之力击退日军，解英缅军之围。",
  },
  {
    id: "aj-1943-changde", date: "1943-11-02", era: "anti", name: "常德会战", place: "湖南常德",
    at: [111.70, 29.03], scale: 3, result: "守城十六日，余程万部几近覆没",
    note: "五十七师八千余人守城，城破时仅余三百。",
  },
  {
    id: "aj-1944-hengyang", date: "1944-06-23", era: "anti", name: "衡阳保卫战", place: "湖南衡阳",
    at: [112.60, 26.90], scale: 3, result: "坚守四十七日",
    note: "方先觉第十军一万七千人对抗十万日军，为抗战中守城时间最长的一役。",
  },
  {
    id: "aj-1944-guilin", date: "1944-11-10", era: "anti", name: "桂林柳州失守", place: "广西桂林",
    at: [110.29, 25.27], scale: 2, result: "豫湘桂溃败，西南震动",
    note: "日军打通大陆交通线，八个月间国民党军失地千里。",
  },
  {
    id: "aj-1945-surrender", date: "1945-08-15", era: "anti", name: "日本宣布投降", place: "四川重庆",
    at: [106.55, 29.56], scale: 3, result: "十四年抗战结束",
    note: "裕仁广播《终战诏书》。重庆全城彻夜爆竹。",
  },
  {
    id: "aj-1945-nanjing", date: "1945-09-09", era: "anti", name: "南京受降", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "冈村宁次在投降书上签字",
    note: "受降仪式在中央军校礼堂举行，历时十五分钟。",
  },

  // ───────────────────────── 解放战争 1945–1949 ─────────────────────────
  {
    id: "lb-1945-chongqing", date: "1945-08-29", era: "liberation", name: "重庆谈判", place: "四川重庆",
    at: [106.55, 29.56], scale: 2, result: "《双十协定》签订",
    note: "毛泽东赴渝四十三天，军队与政权问题终未谈拢。",
  },
  {
    id: "lb-1946-zhongyuan", date: "1946-06-26", era: "liberation", name: "中原突围", place: "湖北宣化店",
    at: [114.30, 30.60], scale: 3, result: "六万人分路突围",
    note: "全面内战由此开始。皮定均旅向东佯动，主力向西越平汉路。",
  },
  {
    id: "lb-1947-yanan", date: "1947-03-19", era: "liberation", name: "延安撤守", place: "陕西延安",
    at: [109.49, 36.60], scale: 3, result: "中共中央主动撤离",
    note: "胡宗南二十余万人进攻陕北，解放军以两万余人周旋，四十五天后三战三捷。",
  },
  {
    id: "lb-1947-menglianggu", date: "1947-05-16", era: "liberation", name: "孟良崮战役", place: "山东蒙阴",
    at: [118.10, 35.55], scale: 3, result: "整编七十四师覆灭，张灵甫毙命",
    note: "在敌重兵集团中割歼其精锐，三天全歼三万二千人。",
  },
  {
    id: "lb-1947-dabie", date: "1947-08-27", era: "liberation", name: "挺进大别山", place: "河南光山",
    at: [115.50, 31.00], scale: 3, result: "刘邓大军直插长江北岸",
    note: "千里跃进，放弃后方，把战争引向国统区腹地。",
    arrows: [{ kind: "advance", label: "千里跃进", pts: [[113.5, 35.3], [114.5, 33.0], [115.50, 31.00]] }],
  },
  {
    id: "lb-1948-liaoshen", date: "1948-09-12", era: "liberation", name: "辽沈战役", place: "辽宁锦州",
    at: [121.13, 41.10], scale: 3, result: "歼敌四十七万，东北全境解放",
    note: "先打锦州\"关门打狗\"，塔山阻击六昼夜，长春守军起义。",
    arrows: [{ kind: "advance", label: "攻克锦州", pts: [[123.4, 42.0], [122.0, 41.6], [121.13, 41.10]] }],
  },
  {
    id: "lb-1948-huaihai", date: "1948-11-06", era: "liberation", name: "淮海战役", place: "江苏徐州",
    at: [117.20, 34.26], scale: 3, result: "歼敌五十五万五千",
    note: "碾庄围黄百韬、双堆集围黄维、陈官庄围杜聿明，六十万对八十万。",
  },
  {
    id: "lb-1948-pingjin", date: "1948-11-29", era: "liberation", name: "平津战役", place: "河北新保安",
    at: [115.40, 40.40], scale: 3, result: "傅作义部被分割于北平、天津、张家口",
    note: "先打两头、后取中间，新保安歼三十五军，张家口守军被围。",
  },
  {
    id: "lb-1949-tianjin", date: "1949-01-15", era: "liberation", name: "天津攻坚", place: "天津",
    at: [117.20, 39.13], scale: 3, result: "二十九小时破城",
    note: "东西对进、拦腰斩断，全歼守军十三万。",
  },
  {
    id: "lb-1949-beiping", date: "1949-01-31", era: "liberation", name: "北平和平解放", place: "北平",
    at: [116.40, 39.90], scale: 3, result: "傅作义接受改编",
    note: "二十余万守军开出城外听候改编，古都完整保全。",
  },
  {
    id: "lb-1949-dujiang", date: "1949-04-21", era: "liberation", name: "渡江战役", place: "江苏南京",
    at: [118.78, 32.06], scale: 3, result: "百万雄师过大江，南京解放",
    note: "西起湖口、东至江阴，千余里战线同时渡江。四月二十三日入南京。",
    arrows: [{ kind: "advance", label: "渡江", pts: [[117.05, 30.55], [119.5, 32.0], [121.47, 31.23]] }],
  },
  {
    id: "lb-1949-shanghai", date: "1949-05-27", era: "liberation", name: "上海解放", place: "江苏上海",
    at: [121.47, 31.23], scale: 3, result: "十六日战役，市区主要建筑保全",
    note: "为保护城市，禁用重炮，以步兵逐街攻坚。",
  },
  {
    id: "lb-1949-kaiguo", date: "1949-10-01", era: "liberation", name: "开国大典", place: "北平",
    at: [116.40, 39.90], scale: 3, result: "中华人民共和国成立",
    note: "下午三时，天安门城楼。此时西南、华南仍在作战。",
  },
  {
    id: "lb-1949-guangzhou", date: "1949-10-14", era: "liberation", name: "广州解放", place: "广东广州",
    at: [113.26, 23.13], scale: 2, result: "余汉谋部弃城而走",
    note: "广东战役历时三十四天，歼敌六万余人。",
  },
  {
    id: "lb-1949-chongqing", date: "1949-11-30", era: "liberation", name: "重庆解放", place: "四川重庆",
    at: [106.55, 29.56], scale: 2, result: "西南战役展开",
    note: "蒋介石于前一日飞离重庆，白公馆、渣滓洞在城破前发生大屠杀。",
  },
  {
    id: "lb-1949-chengdu", date: "1949-12-27", era: "liberation", name: "成都解放", place: "四川成都",
    at: [104.07, 30.67], scale: 3, result: "大陆最后一场大规模战役结束",
    note: "胡宗南部在川西被围，起义与投降者众。成都战役收官。",
  },
];

/** 由日期字符串取小数年，用于时间轴插值与排序 */
export function decimalYear(date) {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  const t = Date.UTC(y, m - 1, d);
  return y + (t - start) / (end - start);
}

export const TIMELINE = { from: 1840, to: 1950 };
