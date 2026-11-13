// ============================================================
// FLClash 覆写脚本
// 地区自动测速 + 精确规则优先覆盖
// ============================================================

// ============================================================
// 规则类型说明（下面各规则列表里的写法）
//
// 1. DOMAIN         全匹配：域名必须完全一样才命中
//    例：DOMAIN,audio-ak-spotify-com.akamaized.net
//        只命中这一个域名，子域名不算
//
// 2. DOMAIN-SUFFIX  域名后缀匹配：命中该域名及它的所有子域名（最常用）
//    例：DOMAIN-SUFFIX,spotify.com
//        命中 spotify.com、open.spotify.com、api.spotify.com
//        不命中 myspotify.com
//
// 3. DOMAIN-KEYWORD 关键字匹配：域名里只要包含这个词就命中（范围最宽，慎用）
//    例：DOMAIN-KEYWORD,github
//        命中 github.com、raw.githubusercontent.com、github.io 等
//
// 另：IP-CIDR 按目标 IP 网段匹配（不看域名），no-resolve 表示不为匹配而解析域名
//    例：IP-CIDR,149.154.160.0/20,no-resolve
//
// 注意：
// - 每条规则必须写完整（类型,内容），只写裸域名会被脚本丢弃
// - 不支持 AND / OR / NOT 等组合规则（含多个逗号，会被切坏）
// ============================================================

const TEST_URL = "https://www.gstatic.com/generate_204";
const INTERVAL = 300;
const TOLERANCE = 50;

// -------------------- 地区识别 --------------------

// words：中文名 / 英文全称 / emoji，直接匹配
// abbrs：2~3 个字母的缩写，前后不能紧挨英文字母，避免 Premium 被当成 IN、Bonus 被当成 US
// singles：单个汉字（港、台、韩、俄），前后不能紧挨其他汉字，避免"平台"、"中转台"被当成台湾
const mk = (words, abbrs, singles = "") =>
  new RegExp(
    `${words}|(?:^|[^A-Za-z])(?:${abbrs})(?![A-Za-z])` +
      (singles
        ? `|(?:^|[^\\u4e00-\\u9fa5])(?:${singles})(?![\\u4e00-\\u9fa5])`
        : ""),
    "i"
  );

const REGIONS = [
  ["香港", "🇭🇰", mk("香港|Hong\\s?Kong|🇭🇰", "HK", "港")],
  ["台湾", "🇹🇼", mk("台湾|台北|新北|彰化|高雄|Taiwan|🇹🇼", "TW", "台")],
  ["日本", "🇯🇵", mk("日本|Japan|东京|大阪|🇯🇵", "JP")],
  ["新加坡", "🇸🇬", mk("新加坡|狮城|Singapore|🇸🇬", "SG")],
  ["美国", "🇺🇸", mk("美国|United\\s?States|洛杉矶|圣何塞|西雅图|芝加哥|纽约|🇺🇸", "US|USA")],
  ["韩国", "🇰🇷", mk("韩国|Korea|首尔|🇰🇷", "KR", "韩")],
  ["英国", "🇬🇧", mk("英国|United\\s?Kingdom|伦敦|🇬🇧", "UK|GB")],
  ["德国", "🇩🇪", mk("德国|Germany|法兰克福|🇩🇪", "DE")],
  ["法国", "🇫🇷", mk("法国|France|巴黎|🇫🇷", "FR")],
  ["加拿大", "🇨🇦", mk("加拿大|Canada|多伦多|温哥华|🇨🇦", "CA")],
  ["澳大利亚", "🇦🇺", mk("澳大利亚|澳洲|Australia|悉尼|🇦🇺", "AU")],
  ["俄罗斯", "🇷🇺", mk("俄罗斯|Russia|🇷🇺", "RU", "俄")],
  ["印度", "🇮🇳", mk("印度|India|孟买|🇮🇳", "IN")],
  ["土耳其", "🇹🇷", mk("土耳其|Turkey|Türkiye|🇹🇷", "TR")],
  ["阿根廷", "🇦🇷", mk("阿根廷|Argentina|🇦🇷", "AR")],
  ["巴西", "🇧🇷", mk("巴西|Brazil|🇧🇷", "BR")],
  ["荷兰", "🇳🇱", mk("荷兰|Netherlands|阿姆斯特丹|🇳🇱", "NL")],
  ["马来西亚", "🇲🇾", mk("马来西亚|马来|Malaysia|🇲🇾", "MY")],
  ["泰国", "🇹🇭", mk("泰国|Thailand|曼谷|🇹🇭", "TH")],
  ["越南", "🇻🇳", mk("越南|Vietnam|🇻🇳", "VN")],
  ["菲律宾", "🇵🇭", mk("菲律宾|Philippines|🇵🇭", "PH")],
  ["印度尼西亚", "🇮🇩", mk("印度尼西亚|印尼|Indonesia|🇮🇩", "ID")],
];

// 订阅里的"信息节点"（剩余流量、到期时间等），不是真节点，要排除
// 只匹配典型写法，避免"高速流量不限"之类的真节点名被误删
const INFO_NODE =
  /剩余|已用|套餐|到期|距离下次|重置|过期|官网\s*[:：]|订阅\s*[:：]|流量\s*[:：]|(?:expire|traffic|reset)\s*[:：]/i;

const DNS_CONFIG = {
  enable: true,
  ipv6: false,
  "enhanced-mode": "fake-ip",
  "respect-rules": true,
  "default-nameserver": ["223.5.5.5", "119.29.29.29", "8.8.8.8"],
  nameserver: [
    "https://1.1.1.1/dns-query",
    "https://8.8.8.8/dns-query"
  ],
  "proxy-server-nameserver": ["https://223.5.5.5/dns-query"],
  "direct-nameserver": ["https://223.5.5.5/dns-query"],
};

const GLOBAL_AUTO_NAME = "♻️ 全部-自动";

// -------------------- APP 包名分流规则 --------------------
// key 是地区名，要和 RULE_SETS 里的 region 一致
// 只填写包名，不需要写 PROCESS-NAME，脚本会自动转换

const APP_PROCESS_RULES = {
  "美国": [
    "li.songe.gkd",
    "com.google.android.youtube",
    "com.instagram.android",
    "com.ss.android.ugc.trill",
    "com.openai.chatgpt",
  ],

  "台湾": [
    "org.telegram.messenger",
    "org.telegram.messenger.web",
    "org.thunderdog.challegram",
    "com.anthropic.claude",
    "ai.x.grok",
    "com.github.android",
    "com.twitter.android",
    "com.google.android.googlequicksearchbox",
    "com.google.android.apps.bard",
    "com.google.android.gm",
    "com.google.android.apps.maps",
    "com.android.vending",
    "com.google.android.apps.authenticator2",
  ],

  // 以后增加日本 APP：
  // "日本": [
  //   "com.example.app",
  // ],
};

// -------------------- 自动测速规则 --------------------
// 每条写完整规则：类型,内容（如 DOMAIN-SUFFIX,xxx.com / DOMAIN-KEYWORD,xxx / IP-CIDR,x.x.x.x/24,no-resolve）

const AUTO_RULES = [
  // ---- 指定 APP（走自动测速） ----
  "PROCESS-NAME,com.spotify.music",

  // ---- 机场（订阅/面板域名） ----
  "DOMAIN-SUFFIX,feiniaoyun.xyz",   // 机场：飞鸟云
  "DOMAIN-SUFFIX,happymao.cat",     // 机场：happymao
  "DOMAIN-SUFFIX,berrypass.de",     // 机场：BerryPass
  "DOMAIN-SUFFIX,laogou.biz",       // 机场：老狗
  "DOMAIN-SUFFIX,mitce.io",         // 机场：Mitce
  "DOMAIN-SUFFIX,51cg1.com",        // 机场域名
  "DOMAIN-SUFFIX,91cg1.com",        // 机场域名

  // ---- Spotify（音乐） ----
  "DOMAIN-SUFFIX,spotify.com",      // Spotify 主站/API
  "DOMAIN-SUFFIX,scdn.co",          // Spotify 音频/图片 CDN
  "DOMAIN-SUFFIX,spotifycdn.com",   // Spotify CDN
  "DOMAIN-SUFFIX,spotifycdn.net",   // Spotify CDN
  "DOMAIN-SUFFIX,spoti.fi",         // Spotify 分享短链
  "DOMAIN-SUFFIX,pscdn.co",         // Spotify 播客/图片 CDN
  "DOMAIN-SUFFIX,tospotify.com",    // Spotify 分享短链
  "DOMAIN-SUFFIX,spotify.design",   // Spotify 设计站
  "DOMAIN,audio-ak-spotify-com.akamaized.net", // Spotify 音频流（Akamai 节点）
];

// -------------------- 台湾规则 --------------------

const TAIWAN_RULES = [
  // ---- 公共 DNS ----
  "DOMAIN,dns.google",                    // Google 公共 DNS 域名
  "IP-CIDR,8.8.8.8/32,no-resolve",        // Google 公共 DNS
  "IP-CIDR,8.8.4.4/32,no-resolve",        // Google 公共 DNS
  "IP-CIDR,1.1.1.1/32,no-resolve",        // Cloudflare 公共 DNS
  "IP-CIDR,1.0.0.1/32,no-resolve",        // Cloudflare 公共 DNS

  // ---- Google ----
  // 已移除 google.com.hk、googleapis.cn：这两个本来就是为国内优化的，走代理反而可能更慢
  "DOMAIN-SUFFIX,google.com",             // Google 搜索/主站
  "DOMAIN-SUFFIX,googleapis.com",         // Google API
  "DOMAIN-SUFFIX,gstatic.com",            // Google 静态资源
  "DOMAIN-SUFFIX,googleusercontent.com",  // Google 用户内容（头像、云端文件等）
  "DOMAIN-SUFFIX,gmail.com",              // Gmail 邮箱
  "DOMAIN-SUFFIX,googlemail.com",         // Gmail 旧域名
  "DOMAIN-SUFFIX,gvt1.com",               // Google 更新下载（Chrome 等）
  "DOMAIN-SUFFIX,gvt2.com",               // Google 更新下载
  "DOMAIN-SUFFIX,android.com",            // Android 官网
  "DOMAIN-SUFFIX,withgoogle.com",         // Google 产品介绍站

  // ---- Telegram ----
  "DOMAIN-SUFFIX,telegram.org",           // Telegram 官网
  "DOMAIN-SUFFIX,telegram.me",            // Telegram 链接
  "DOMAIN-SUFFIX,t.me",                   // Telegram 短链
  "DOMAIN-SUFFIX,telegra.ph",             // Telegraph 文章发布
  "DOMAIN-SUFFIX,telesco.pe",             // Telescope 视频
  "DOMAIN-SUFFIX,tdesktop.com",           // Telegram 桌面版
  "DOMAIN-SUFFIX,cdn-telegram.org",       // Telegram CDN
  "IP-CIDR,91.108.4.0/22,no-resolve",     // Telegram 服务器 IP 段
  "IP-CIDR,91.108.8.0/22,no-resolve",     // Telegram 服务器 IP 段
  "IP-CIDR,91.108.12.0/22,no-resolve",    // Telegram 服务器 IP 段
  "IP-CIDR,91.108.16.0/22,no-resolve",    // Telegram 服务器 IP 段
  "IP-CIDR,91.108.56.0/22,no-resolve",    // Telegram 服务器 IP 段
  "IP-CIDR,149.154.160.0/20,no-resolve",  // Telegram 服务器 IP 段
  "IP-CIDR6,2001:b28:f23d::/48,no-resolve", // Telegram IPv6 段
  "IP-CIDR6,2001:b28:f23f::/48,no-resolve", // Telegram IPv6 段
  "IP-CIDR6,2001:67c:4e8::/48,no-resolve",  // Telegram IPv6 段

  // ---- Anthropic / Claude ----
  "DOMAIN-SUFFIX,anthropic.com",          // Anthropic 官网/API
  "DOMAIN-SUFFIX,claude.ai",              // Claude 网页版
  "DOMAIN-SUFFIX,claude.com",             // Claude 官网
  "DOMAIN-SUFFIX,claudeusercontent.com",  // Claude 用户内容（制品等）

  // ---- xAI / Grok ----
  "DOMAIN-SUFFIX,grok.com",               // Grok 网页版
  "DOMAIN-SUFFIX,x.ai",                   // xAI 官网/API（含 api.x.ai、accounts.x.ai）

  // ---- Twitter / X ----
  // 已移除 abs.twimg.com：已被 twimg.com 的后缀匹配覆盖
  "DOMAIN-SUFFIX,twitter.com",            // Twitter
  "DOMAIN-SUFFIX,x.com",                  // X
  "DOMAIN-SUFFIX,t.co",                   // Twitter 短链
  "DOMAIN-SUFFIX,twimg.com",              // Twitter 图片/视频/静态资源
  "DOMAIN-SUFFIX,twittercdn.com",         // Twitter CDN
  "DOMAIN-SUFFIX,twitterstat.us",         // Twitter 状态页
  "DOMAIN-SUFFIX,pscp.tv",                // Periscope 直播
  "DOMAIN-SUFFIX,periscope.tv",           // Periscope 直播
  "DOMAIN-SUFFIX,ads-twitter.com",        // Twitter 广告

  // ---- GitHub ----
  "DOMAIN-SUFFIX,github.com",             // GitHub 主站
  "DOMAIN-SUFFIX,github.io",              // GitHub Pages 个人站点
  "DOMAIN-SUFFIX,github.dev",             // GitHub 在线编辑器
  "DOMAIN-SUFFIX,githubusercontent.com",  // GitHub 原始文件、头像、附件
  "DOMAIN-SUFFIX,githubassets.com",       // GitHub 静态资源
  "DOMAIN-SUFFIX,githubapp.com",          // GitHub 应用服务
  "DOMAIN-SUFFIX,ghcr.io",                // GitHub 容器镜像仓库
  "DOMAIN-SUFFIX,git.io",                 // GitHub 短链
];

// -------------------- 美国规则 --------------------

const US_RULES = [
  // ---- YouTube ----
  "DOMAIN-SUFFIX,youtube.com",            // YouTube 主站
  "DOMAIN-SUFFIX,youtu.be",               // YouTube 短链
  "DOMAIN-SUFFIX,youtube-nocookie.com",   // YouTube 免 Cookie 嵌入播放
  "DOMAIN-SUFFIX,googlevideo.com",        // YouTube 视频流
  "DOMAIN-SUFFIX,ytimg.com",              // YouTube 缩略图
  "DOMAIN-SUFFIX,ggpht.com",              // YouTube/Google 头像图片
  "DOMAIN-SUFFIX,yt.be",                  // YouTube 短链
  "DOMAIN-KEYWORD,youtubei",              // YouTube 内部 API

  // ---- 百科 / 社区 / 问答 / 图床 ----
  "DOMAIN-SUFFIX,wikipedia.org",          // 维基百科
  "DOMAIN-SUFFIX,wikimedia.org",          // 维基媒体（图片等）
  "DOMAIN-SUFFIX,reddit.com",             // Reddit 论坛
  "DOMAIN-SUFFIX,redd.it",                // Reddit 短链
  "DOMAIN-SUFFIX,redditmedia.com",        // Reddit 图片/视频
  "DOMAIN-SUFFIX,redditstatic.com",       // Reddit 静态资源
  "DOMAIN-SUFFIX,stackoverflow.com",      // Stack Overflow 技术问答
  "DOMAIN-SUFFIX,stackexchange.com",      // Stack Exchange 问答网络
  "DOMAIN-SUFFIX,imgur.com",              // Imgur 图床

  // ---- Instagram ----
  "DOMAIN-SUFFIX,instagram.com",          // Instagram 主站
  "DOMAIN-SUFFIX,cdninstagram.com",       // Instagram 图片/视频 CDN
  "DOMAIN-SUFFIX,instagr.am",             // Instagram 短链
  "DOMAIN-SUFFIX,ig.me",                  // Instagram 私信短链
  "DOMAIN-SUFFIX,fbcdn.net",              // Meta 图片/视频 CDN（Instagram、Facebook 共用）

  // ---- TikTok ----
  "DOMAIN-SUFFIX,tiktok.com",             // TikTok 主站
  "DOMAIN-SUFFIX,tiktokv.com",            // TikTok API
  "DOMAIN-SUFFIX,tiktokv.us",             // TikTok 美国版 API
  "DOMAIN-SUFFIX,tiktokcdn.com",          // TikTok CDN
  "DOMAIN-SUFFIX,tiktokcdn-us.com",       // TikTok 美国版 CDN
  "DOMAIN-SUFFIX,tiktokw.us",             // TikTok 美国版
  "DOMAIN-SUFFIX,byteoversea.com",        // 字节跳动海外服务
  "DOMAIN-SUFFIX,ibytedtos.com",          // 字节跳动海外对象存储
  "DOMAIN-SUFFIX,ibyteimg.com",           // 字节跳动海外图片
  "DOMAIN-SUFFIX,muscdn.com",             // musical.ly（TikTok 前身）CDN
  "DOMAIN-SUFFIX,musical.ly",             // musical.ly（TikTok 前身）

  "DOMAIN-SUFFIX,onlyfans.com",

  // ---- OpenAI / ChatGPT ----
  "DOMAIN-SUFFIX,openai.com",             // OpenAI 官网/API
  "DOMAIN-SUFFIX,chatgpt.com",            // ChatGPT
  "DOMAIN-SUFFIX,oaistatic.com",          // OpenAI 静态资源
  "DOMAIN-SUFFIX,oaiusercontent.com",     // OpenAI 用户内容
  "DOMAIN-SUFFIX,sora.com",               // Sora 视频生成

];

// -------------------- 规则集清单 --------------------
// 每个规则集：
//   id        内部名，不要重复
//   region    对应的地区名，用来取 APP_PROCESS_RULES 里的包名（没有 APP 规则可不写）
//   rules     规则列表
//   fallback  出口地区的优先顺序：排前面的地区没有节点时，依次往后找；全都没有则走 🌍 地区选择
//   useAuto   设为 true 表示出口走"自动测速组"（订阅自带的全节点自动组，没有则用 ♻️ 全部-自动），
//             此时不需要 fallback
//
// 顺序即优先级（从上到下匹配，命中即停）：
// - 所有 PROCESS-NAME（APP 包名）规则无论在哪个规则集，都会被提到全局最前面，
//   其内部顺序按规则集顺序；之后才是各规则集的域名/IP 规则。
// - 自动测速放最前面（机场、Spotify）。
// - 美国必须在台湾前面，否则 youtubei.googleapis.com 会先被台湾的 googleapis.com 抢走。
// 想新增规则集：写好一份规则常量，再在这里加一行即可。
const RULE_SETS = [
  { id: "auto", rules: AUTO_RULES, useAuto: true },
  { id: "us", region: "美国", rules: US_RULES, fallback: ["美国", "日本", "新加坡", "香港", "台湾"] },
  { id: "taiwan", region: "台湾", rules: TAIWAN_RULES, fallback: ["台湾", "日本", "新加坡", "香港"] },
];

// -------------------- 工具函数 --------------------

const matchRegion = (name) => {
  for (const [region, flag, re] of REGIONS) {
    if (re.test(name)) return { region, flag };
  }
  return { region: "其他", flag: "🌐" };
};

// 只比较规则类型和匹配内容，不比较出口和 no-resolve
const getRuleKey = (rule) => {
  if (typeof rule !== "string") return null;

  const parts = rule.split(",");
  if (parts.length < 2) return null;

  const type = parts[0].trim().toUpperCase();
  const value = parts[1].trim().toLowerCase();

  if (!type || !value) return null;

  return `${type},${value}`;
};

// 去除规则集内部重复项
const uniqueRules = (rules) => {
  const seen = new Set();

  return rules.filter((rule) => {
    const key = getRuleKey(rule);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// 给规则补上出口：no-resolve 必须放在出口后面
// "DOMAIN-SUFFIX,a.com"           -> "DOMAIN-SUFFIX,a.com,出口"
// "IP-CIDR,1.1.1.1/32,no-resolve" -> "IP-CIDR,1.1.1.1/32,出口,no-resolve"
const withTarget = (rule, target) => {
  const parts = rule.split(",").map((s) => s.trim());
  const last = parts[parts.length - 1];

  if (parts.length > 2 && last.toLowerCase() === "no-resolve") {
    parts.splice(parts.length - 1, 0, target);
  } else {
    parts.push(target);
  }

  return parts.join(",");
};

// -------------------- 主程序 --------------------

const main = (config) => {
  // 0. DNS 配置
  config.dns = {
    ...(config.dns || {}),
    ...DNS_CONFIG,
  };

  const proxies = (config.proxies || []).filter(
    (p) => p && p.name && !INFO_NODE.test(p.name)
  );

  if (proxies.length === 0) return config;

  // 1. 节点地区分类
  const buckets = new Map();

  for (const p of proxies) {
    const { region, flag } = matchRegion(p.name);

    if (!buckets.has(region)) {
      buckets.set(region, { flag, names: [] });
    }

    buckets.get(region).names.push(p.name);
  }

  const groups = config["proxy-groups"] || [];
  const regionGroupNames = [];
  const regionGroupMap = new Map(); // 地区名 -> 地区自动组名

  const order = [...REGIONS.map((r) => r[0]), "其他"];

  const regions = [...buckets.keys()].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  // 2. 找订阅自带的"全节点"自动测速组
  //    只认覆盖了绝大多数节点的 url-test 组，避免误选到单个地区的自动组
  //    （比如订阅自带的"香港自动"，否则机场和 Spotify 会只走香港）
  //    排除：脚本自己的全部-自动、脚本会创建/覆盖的地区自动组
  const proxyNameSet = new Set(proxies.map((p) => p.name));

  const scriptGroupNames = new Set([
    GLOBAL_AUTO_NAME,
    ...[...buckets.entries()].map(
      ([region, { flag }]) => `${flag} ${region}-自动`
    ),
  ]);

  // 一个组实际包含多少个有效节点
  const coverage = (g) => {
    if (!Array.isArray(g.proxies) || g.proxies.length === 0) {
      // 用 use 引用外部订阅且没有 filter，视为包含全部节点
      return g.use && !g.filter ? proxies.length : 0;
    }
    return g.proxies.filter((n) => proxyNameSet.has(n)).length;
  };

  const FULL_COVERAGE = 0.8; // 至少覆盖 80% 的节点才算"全节点"组

  const subAutoCandidates = groups
    .filter((g) => g.type === "url-test" && !scriptGroupNames.has(g.name))
    .map((g) => ({ g, n: coverage(g), named: /自动|auto/i.test(g.name) }))
    .filter((x) => x.n >= proxies.length * FULL_COVERAGE)
    .sort((x, y) => y.n - x.n || Number(y.named) - Number(x.named));

  const subAuto = subAutoCandidates.length ? subAutoCandidates[0].g : null;

  // 3. 创建或更新地区自动测速组
  for (const region of regions) {
    const { flag, names } = buckets.get(region);
    const groupName = `${flag} ${region}-自动`;

    regionGroupNames.push(groupName);
    regionGroupMap.set(region, groupName);

    let group = groups.find((g) => g.name === groupName);

    if (!group) {
      group = {
        name: groupName,
        type: "url-test",
      };
      groups.push(group);
    }

    // 每次订阅更新都同步最新节点
    group.type = "url-test";
    group.proxies = [...names];
    group.url = TEST_URL;
    group.interval = INTERVAL;
    group.tolerance = TOLERANCE;
    group.lazy = true;
  }

  // 4. 机场使用全节点自动测速组
  //    订阅没有自动选择组时，由脚本创建 GLOBAL_AUTO_NAME
  let airportTarget = subAuto ? subAuto.name : null;
  const scriptCreatedAuto = !subAuto;

  if (!airportTarget) {
    airportTarget = GLOBAL_AUTO_NAME;

    let group = groups.find((g) => g.name === GLOBAL_AUTO_NAME);

    if (!group) {
      group = {
        name: GLOBAL_AUTO_NAME,
        type: "url-test",
      };
      groups.push(group);
    }

    group.type = "url-test";
    group.proxies = proxies.map((p) => p.name);
    group.url = TEST_URL;
    group.interval = INTERVAL;
    group.tolerance = TOLERANCE;
    group.lazy = true;
  }

  // 5. 地区选择组
  const pickName = "🌍 地区选择";

  let pickGroup = groups.find((g) => g.name === pickName);

  if (!pickGroup) {
    pickGroup = {
      name: pickName,
      type: "select",
    };
    groups.unshift(pickGroup);
  }

  pickGroup.type = "select";
  pickGroup.proxies = [...regionGroupNames, "DIRECT"];

  // 6. 订阅手动选择组增加入口
  //    select 组默认选中的是第一项，所以入口不能插在第一位，否则会改掉订阅原来的默认选择
  //    - 地区选择入口：放在第二位（原有第一项保持不变）
  //    - 全部-自动入口（仅当订阅没有全节点自动组、由脚本创建了该组时添加）：放在地区选择之后
  for (const g of groups) {
    if (g.type !== "select" || g.name === pickName) continue;

    g.proxies = g.proxies || [];

    if (!g.proxies.includes(pickName)) {
      g.proxies.splice(Math.min(1, g.proxies.length), 0, pickName);
    }

    if (scriptCreatedAuto && !g.proxies.includes(GLOBAL_AUTO_NAME)) {
      const idx = g.proxies.indexOf(pickName);
      g.proxies.splice(idx + 1, 0, GLOBAL_AUTO_NAME);
    }
  }

  // 7. 订阅自动类组开启懒测速
  for (const g of groups) {
    if (!["url-test", "fallback", "load-balance"].includes(g.type)) {
      continue;
    }

    if (regionGroupNames.includes(g.name)) continue;
    if (g.name === GLOBAL_AUTO_NAME) continue;

    g.lazy = true;
  }

  // ==========================================================
  // 8. 生成脚本规则（直接展开成普通规则，不依赖 inline rule-provider，
  //    旧版内核也能用）
  // ==========================================================

  // 按优先级查找地区自动组，找不到就依次回退
  const findAuto = (...regionList) => {
    for (const r of regionList) {
      const n = regionGroupMap.get(r);
      if (n) return n;
    }
    return null;
  };

  const processScriptRules = []; // 所有 PROCESS-NAME 规则（全局最优先）
  const domainScriptRules = [];  // 其余域名/IP 规则
  const scriptKeys = new Set();  // 用于和订阅规则去重

  for (const { region, rules, fallback = [], useAuto } of RULE_SETS) {
    const target = useAuto ? airportTarget : findAuto(...fallback) || pickName;

    // APP 包名自动转换成 PROCESS-NAME 规则
    const processRules = ((region && APP_PROCESS_RULES[region]) || []).map(
      (name) => `PROCESS-NAME,${name}`
    );

    const payload = uniqueRules([...processRules, ...rules]);

    for (const rule of payload) {
      const key = getRuleKey(rule);

      // 跨规则集也去重：先出现的优先（和"顺序即优先级"一致）
      if (scriptKeys.has(key)) continue;
      scriptKeys.add(key);

      const full = withTarget(rule, target);

      if (key.startsWith("PROCESS-NAME,")) {
        processScriptRules.push(full);
      } else {
        domainScriptRules.push(full);
      }
    }
  }

  // 包名规则全局优先，其次才是各规则集的域名/IP 规则
  const scriptRules = [...processScriptRules, ...domainScriptRules];

  // ==========================================================
  // 9. 精确去重：脚本规则优先
  // ==========================================================

  const originalRules = config.rules || [];

  // 只删除匹配类型和匹配内容都相同的订阅规则
  // 其他规则全部保留
  const filteredRules = originalRules.filter((rule) => {
    const key = getRuleKey(rule);

    if (!key) return true;

    return !scriptKeys.has(key);
  });

  // 脚本规则放在订阅原有规则之前
  config.rules = [...scriptRules, ...filteredRules];

  // 10. 写回策略组
  config["proxy-groups"] = groups;

  return config;
};
