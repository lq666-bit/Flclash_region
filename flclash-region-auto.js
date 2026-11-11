// FlClash 覆写脚本：按地区自动分组，每个地区一个 url-test 自动选择组
// 自动选择时只在同地区节点之间测速/切换；没匹配到已知地区的节点按名称归入「其他」
// 规则不改动，仍然指向订阅自带的手动选择组；脚本只是在这些手动组里加一个「🌍 地区选择」入口
// 同时在脚本里直接写入 DNS 配置（请关闭 FlClash 里单独的 DNS 覆写）
// 用法：FlClash -> 配置 -> 对应配置 -> 脚本 -> 粘贴本脚本

const TEST_URL = "https://www.gstatic.com/generate_204";
const INTERVAL = 300;   // 测速间隔（秒），只用于脚本生成的地区组
const TOLERANCE = 50;   // 延迟差小于该值不切换，避免来回跳

// 已知地区：[显示名, 国旗, 匹配正则]
const REGIONS = [
  ["香港", "🇭🇰", /香港|港|HK|Hong\s?Kong|🇭🇰/i],
  ["台湾", "🇹🇼", /台湾|台|TW|Taiwan|🇹🇼/i],
  ["日本", "🇯🇵", /日本|JP|Japan|东京|大阪|🇯🇵/i],
  ["新加坡", "🇸🇬", /新加坡|狮城|SG|Singapore|🇸🇬/i],
  ["美国", "🇺🇸", /美国|US|USA|United\s?States|洛杉矶|圣何塞|西雅图|芝加哥|纽约|🇺🇸/i],
  ["韩国", "🇰🇷", /韩国|韩|KR|Korea|首尔|🇰🇷/i],
  ["英国", "🇬🇧", /英国|UK|GB|United\s?Kingdom|伦敦|🇬🇧/i],
  ["德国", "🇩🇪", /德国|DE|Germany|法兰克福|🇩🇪/i],
  ["法国", "🇫🇷", /法国|FR|France|巴黎|🇫🇷/i],
  ["加拿大", "🇨🇦", /加拿大|CA|Canada|多伦多|温哥华|🇨🇦/i],
  ["澳大利亚", "🇦🇺", /澳大利亚|澳洲|AU|Australia|悉尼|🇦🇺/i],
  ["俄罗斯", "🇷🇺", /俄罗斯|俄|RU|Russia|🇷🇺/i],
  ["印度", "🇮🇳", /印度|IN|India|孟买|🇮🇳/i],
  ["土耳其", "🇹🇷", /土耳其|TR|Turkey|Türkiye|🇹🇷/i],
  ["阿根廷", "🇦🇷", /阿根廷|AR|Argentina|🇦🇷/i],
  ["巴西", "🇧🇷", /巴西|BR|Brazil|🇧🇷/i],
  ["荷兰", "🇳🇱", /荷兰|NL|Netherlands|阿姆斯特丹|🇳🇱/i],
  ["马来西亚", "🇲🇾", /马来西亚|马来|MY|Malaysia|🇲🇾/i],
  ["泰国", "🇹🇭", /泰国|TH|Thailand|曼谷|🇹🇭/i],
  ["越南", "🇻🇳", /越南|VN|Vietnam|🇻🇳/i],
  ["菲律宾", "🇵🇭", /菲律宾|PH|Philippines|🇵🇭/i],
  ["印度尼西亚", "🇮🇩", /印度尼西亚|印尼|ID|Indonesia|🇮🇩/i],
];

// 非节点的信息条目（流量、到期、官网等）
const INFO_NODE = /剩余流量|套餐到期|到期时间|距离下次|官网|订阅|流量|重置|过期|expire|traffic/i;

// DNS 设置：对应 FlClash 里原来手动添加的 DNS
const DNS_CONFIG = {
  enable: true,
  ipv6: false,
  "enhanced-mode": "fake-ip",
  "default-nameserver": ["223.5.5.5", "119.29.29.29", "8.8.8.8"],
  "respect-rules":"cnm"
  nameserver: ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"],
  "proxy-server-nameserver": ["https://223.5.5.5/dns-query"], // 请改成你原来那 1 项的实际值
  "direct-nameserver": ["https://223.5.5.5/dns-query"],
};

// 自定义分流：[地区显示名, 规则列表]。规则会放在整份规则的最前面，优先级最高
// 只有对应地区的组存在（该地区有节点）时才会加入，避免指向不存在的组
const CUSTOM_RULES = [
  ["台湾", [
    // DNS 服务器固定出口（避免被订阅自带规则抢先命中）
    "DOMAIN,dns.google",
    "IP-CIDR,8.8.8.8/32,no-resolve",
    "IP-CIDR,8.8.4.4/32,no-resolve",
    "IP-CIDR,1.1.1.1/32,no-resolve",
    "IP-CIDR,1.0.0.1/32,no-resolve",
    // Telegram
    "DOMAIN-SUFFIX,telegram.org",
    "DOMAIN-SUFFIX,telegram.me",
    "DOMAIN-SUFFIX,t.me",
    "DOMAIN-SUFFIX,telegra.ph",
    "DOMAIN-SUFFIX,telesco.pe",
    "DOMAIN-SUFFIX,tdesktop.com",
    "DOMAIN-SUFFIX,cdn-telegram.org",
    "IP-CIDR,91.108.4.0/22,no-resolve",
    "IP-CIDR,91.108.8.0/22,no-resolve",
    "IP-CIDR,91.108.12.0/22,no-resolve",
    "IP-CIDR,91.108.16.0/22,no-resolve",
    "IP-CIDR,91.108.56.0/22,no-resolve",
    "IP-CIDR,149.154.160.0/20,no-resolve",
    "IP-CIDR6,2001:b28:f23d::/48,no-resolve",
    "IP-CIDR6,2001:b28:f23f::/48,no-resolve",
    "IP-CIDR6,2001:67c:4e8::/48,no-resolve",
  ]],
  ["美国", [
    // OpenAI / ChatGPT
    "DOMAIN-SUFFIX,openai.com",
    "DOMAIN-SUFFIX,chatgpt.com",
    "DOMAIN-SUFFIX,oaistatic.com",
    "DOMAIN-SUFFIX,oaiusercontent.com",
    "DOMAIN-SUFFIX,sora.com",
    // Claude / Anthropic
    "DOMAIN-SUFFIX,anthropic.com",
    "DOMAIN-SUFFIX,claude.ai",
    "DOMAIN-SUFFIX,claude.com",
    "DOMAIN-SUFFIX,claudeusercontent.com",
    // YouTube
    "DOMAIN-SUFFIX,youtube.com",
    "DOMAIN-SUFFIX,youtu.be",
    "DOMAIN-SUFFIX,youtube-nocookie.com",
    "DOMAIN-SUFFIX,googlevideo.com",
    "DOMAIN-SUFFIX,ytimg.com",
    "DOMAIN-SUFFIX,ggpht.com",
    "DOMAIN-SUFFIX,yt.be",
    "DOMAIN-KEYWORD,youtubei",
    // 不怎么需要登录的网站
    "DOMAIN-SUFFIX,wikipedia.org",
    "DOMAIN-SUFFIX,wikimedia.org",
    "DOMAIN-SUFFIX,reddit.com",
    "DOMAIN-SUFFIX,redd.it",
    "DOMAIN-SUFFIX,redditmedia.com",
    "DOMAIN-SUFFIX,redditstatic.com",
    "DOMAIN-SUFFIX,stackoverflow.com",
    "DOMAIN-SUFFIX,stackexchange.com",
    "DOMAIN-SUFFIX,imgur.com",
  ]],
];

const matchRegion = (name) => {
  for (const [region, flag, re] of REGIONS) {
    if (re.test(name)) return { region, flag };
  }
  return { region: "其他", flag: "🌐" };
};

const main = (config) => {
  // 0. 写入 DNS 配置（放在最前面，即使后面没有节点也会生效）
  config.dns = { ...(config.dns || {}), ...DNS_CONFIG };

  const proxies = (config.proxies || []).filter((p) => p && p.name && !INFO_NODE.test(p.name));
  if (proxies.length === 0) return config;

  // 1. 按地区归类
  const buckets = new Map(); // 显示名 -> { flag, names: [] }
  for (const p of proxies) {
    const { region, flag } = matchRegion(p.name);
    if (!buckets.has(region)) buckets.set(region, { flag, names: [] });
    buckets.get(region).names.push(p.name);
  }

  // 2. 每个地区生成一个 url-test 组（只要有节点就生成，不论地区）
  const groups = config["proxy-groups"] || [];
  const existing = new Set(groups.map((g) => g.name));
  const regionGroupNames = [];

  // 已知地区按表顺序，其余放最后
  const order = [...REGIONS.map((r) => r[0]), "其他"];
  const regions = [...buckets.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  for (const region of regions) {
    const { flag, names } = buckets.get(region);
    const groupName = `${flag} ${region}-自动`;
    regionGroupNames.push(groupName);
    if (existing.has(groupName)) continue;
    groups.push({
      name: groupName,
      type: "url-test",
      proxies: names,
      url: TEST_URL,
      interval: INTERVAL,
      tolerance: TOLERANCE,
      lazy: true,
    });
    existing.add(groupName);
  }

  // 3. 「地区选择」手动组：里面只有各地区自动组和 DIRECT
  //    不包含订阅自带的手动组，避免循环引用
  const pickName = "🌍 地区选择";
  if (!existing.has(pickName)) {
    groups.unshift({
      name: pickName,
      type: "select",
      proxies: [...regionGroupNames, "DIRECT"],
    });
    existing.add(pickName);
  }

  // 4. 规则不动。在订阅自带的所有手动选择组（select）最前面加上「地区选择」：
  //    在订阅的手动组里选「🌍 地区选择」，流量就转给它，并在同地区内自动跳转；
  //    选别的节点则和原来完全一样
  for (const g of groups) {
    if (g.type !== "select" || g.name === pickName) continue;
    g.proxies = g.proxies || [];
    if (!g.proxies.includes(pickName)) g.proxies.unshift(pickName);
  }

  // 5. 订阅自带的自动类组（url-test / fallback / load-balance）设为懒测速：
  //    没被选中、没流量经过时不测速，省流量。只改 lazy，不动它们原来的测速间隔
  for (const g of groups) {
    if (!["url-test", "fallback", "load-balance"].includes(g.type)) continue;
    if (regionGroupNames.includes(g.name)) continue; // 我生成的组不在这里处理
    g.lazy = true;
  }

  // 6. 自定义分流规则：放在所有规则最前面
  const customRules = [];
  for (const [region, list] of CUSTOM_RULES) {
    const target = regionGroupNames.find((n) => n.endsWith(` ${region}-自动`));
    if (!target) continue;
    for (const r of list) {
      // 规则末尾是 no-resolve 时，目标要插在它前面
      customRules.push(r.endsWith(",no-resolve")
        ? r.replace(/,no-resolve$/, `,${target},no-resolve`)
        : `${r},${target}`);
    }
  }
  if (customRules.length > 0) {
    config.rules = [...customRules, ...(config.rules || [])];
  }

  config["proxy-groups"] = groups;
  return config;
};
