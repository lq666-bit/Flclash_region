
// ============================================================
// FLClash 覆写脚本
// 地区自动测速 + 内嵌规则集 + 精确规则优先覆盖
// ============================================================

const TEST_URL = "https://www.gstatic.com/generate_204";
const INTERVAL = 300;
const TOLERANCE = 50;

// -------------------- 地区识别 --------------------

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

const INFO_NODE = /剩余流量|套餐到期|到期时间|距离下次|官网|订阅|流量|重置|过期|expire|traffic/i;

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

// -------------------- 机场规则 --------------------

const AIRPORT_DOMAINS = [
  "feiniaoyun.xyz",
  "happymao.cat",
  "berrypass.de",
  "laogou.biz",
  "mitce.io",
  "51cg1.com",
  "91cg1.com",
];

// -------------------- 台湾规则 --------------------

const TAIWAN_RULES = [
  "DOMAIN,dns.google",
  "IP-CIDR,8.8.8.8/32,no-resolve",
  "IP-CIDR,8.8.4.4/32,no-resolve",
  "IP-CIDR,1.1.1.1/32,no-resolve",
  "IP-CIDR,1.0.0.1/32,no-resolve",

  "DOMAIN-SUFFIX,google.com",
  "DOMAIN-SUFFIX,googleapis.com",
  "DOMAIN-SUFFIX,gstatic.com",
  "DOMAIN-SUFFIX,googleusercontent.com",
  "DOMAIN-SUFFIX,gmail.com",
  "DOMAIN-SUFFIX,googlemail.com",
  "DOMAIN-SUFFIX,gvt1.com",
  "DOMAIN-SUFFIX,gvt2.com",
  "DOMAIN-SUFFIX,android.com",
  "DOMAIN-SUFFIX,withgoogle.com",
  "DOMAIN-SUFFIX,google.com.hk",
  "DOMAIN-SUFFIX,googleapis.cn",

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

  "DOMAIN-SUFFIX,openai.com",
  "DOMAIN-SUFFIX,chatgpt.com",
  "DOMAIN-SUFFIX,oaistatic.com",
  "DOMAIN-SUFFIX,oaiusercontent.com",
  "DOMAIN-SUFFIX,sora.com",

  "DOMAIN-SUFFIX,anthropic.com",
  "DOMAIN-SUFFIX,claude.ai",
  "DOMAIN-SUFFIX,claude.com",
  "DOMAIN-SUFFIX,claudeusercontent.com",

  "DOMAIN-SUFFIX,twitter.com",
  "DOMAIN-SUFFIX,x.com",
  "DOMAIN-SUFFIX,t.co",
  "DOMAIN-SUFFIX,twimg.com",
  "DOMAIN-SUFFIX,twittercdn.com",
  "DOMAIN-SUFFIX,twitterstat.us",
  "DOMAIN-SUFFIX,abs.twimg.com",
  "DOMAIN-SUFFIX,pscp.tv",
  "DOMAIN-SUFFIX,periscope.tv",
  "DOMAIN-SUFFIX,ads-twitter.com",
];

// -------------------- 美国规则 --------------------

const US_RULES = [
  "DOMAIN-SUFFIX,youtube.com",
  "DOMAIN-SUFFIX,youtu.be",
  "DOMAIN-SUFFIX,youtube-nocookie.com",
  "DOMAIN-SUFFIX,googlevideo.com",
  "DOMAIN-SUFFIX,ytimg.com",
  "DOMAIN-SUFFIX,ggpht.com",
  "DOMAIN-SUFFIX,yt.be",
  "DOMAIN-KEYWORD,youtubei",

  "DOMAIN-SUFFIX,wikipedia.org",
  "DOMAIN-SUFFIX,wikimedia.org",
  "DOMAIN-SUFFIX,reddit.com",
  "DOMAIN-SUFFIX,redd.it",
  "DOMAIN-SUFFIX,redditmedia.com",
  "DOMAIN-SUFFIX,redditstatic.com",
  "DOMAIN-SUFFIX,stackoverflow.com",
  "DOMAIN-SUFFIX,stackexchange.com",
  "DOMAIN-SUFFIX,imgur.com",

  "DOMAIN-KEYWORD,github",
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
  const existing = new Set(groups.map((g) => g.name));
  const regionGroupNames = [];

  const order = [...REGIONS.map((r) => r[0]), "其他"];

  const regions = [...buckets.keys()].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  // 2. 找订阅自带自动测速组
  const subAutoCandidates = groups.filter(
    (g) => g.type === "url-test"
  );

  const subAuto =
    subAutoCandidates.find((g) => /自动|auto/i.test(g.name)) ||
    subAutoCandidates[0];

  // 3. 创建或更新地区自动测速组
  for (const region of regions) {
    const { flag, names } = buckets.get(region);
    const groupName = `${flag} ${region}-自动`;

    regionGroupNames.push(groupName);

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

    existing.add(groupName);
  }

  // 4. 机场使用全节点自动测速组
  let airportTarget = subAuto ? subAuto.name : null;

  if (!airportTarget) {
    airportTarget = GLOBAL_AUTO_NAME;

    let group = groups.find(
      (g) => g.name === GLOBAL_AUTO_NAME
    );

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

    existing.add(GLOBAL_AUTO_NAME);
  }

  // 5. 地区选择组
  const pickName = "🌍 地区选择";

  let pickGroup = groups.find(
    (g) => g.name === pickName
  );

  if (!pickGroup) {
    pickGroup = {
      name: pickName,
      type: "select",
    };
    groups.unshift(pickGroup);
  }

  pickGroup.type = "select";
  pickGroup.proxies = [...regionGroupNames, "DIRECT"];

  // 6. 订阅手动选择组增加地区选择入口
  for (const g of groups) {
    if (g.type !== "select" || g.name === pickName) continue;

    g.proxies = g.proxies || [];

    if (!g.proxies.includes(pickName)) {
      g.proxies.unshift(pickName);
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
  // 8. 创建内嵌规则集
  // ==========================================================

  const ruleProviders = {
    ...(config["rule-providers"] || {}),
  };

  const providerRules = [];
  const ruleSetEntries = [];

  // 机场规则集
  const airportPayload = uniqueRules(
    AIRPORT_DOMAINS.map(
      (d) => `DOMAIN-SUFFIX,${d}`
    )
  );

  const airportProvider = "__flclash_script_airport";

  ruleProviders[airportProvider] = {
    type: "inline",
    behavior: "classical",
    payload: airportPayload,
  };

  providerRules.push(...airportPayload);

  ruleSetEntries.push(
    `RULE-SET,${airportProvider},${airportTarget}`
  );

  // 台湾规则集
  const taiwanTarget = regionGroupNames.find(
    (n) => n.endsWith(" 台湾-自动")
  );

  if (taiwanTarget) {
    const payload = uniqueRules(TAIWAN_RULES);
    const provider = "__flclash_script_taiwan";

    ruleProviders[provider] = {
      type: "inline",
      behavior: "classical",
      payload,
    };

    providerRules.push(...payload);

    ruleSetEntries.push(
      `RULE-SET,${provider},${taiwanTarget}`
    );
  }

  // 美国规则集
  const usTarget = regionGroupNames.find(
    (n) => n.endsWith(" 美国-自动")
  );

  if (usTarget) {
    const payload = uniqueRules(US_RULES);
    const provider = "__flclash_script_us";

    ruleProviders[provider] = {
      type: "inline",
      behavior: "classical",
      payload,
    };

    providerRules.push(...payload);

    ruleSetEntries.push(
      `RULE-SET,${provider},${usTarget}`
    );
  }

  config["rule-providers"] = ruleProviders;

  // ==========================================================
  // 9. 精确去重：脚本规则优先
  // ==========================================================

  const scriptKeys = new Set(
    providerRules.map(getRuleKey).filter(Boolean)
  );

  const originalRules = config.rules || [];

  // 只删除匹配类型和匹配内容都相同的订阅规则
  // 其他规则全部保留
  const filteredRules = originalRules.filter((rule) => {
    const key = getRuleKey(rule);

    if (!key) return true;

    return !scriptKeys.has(key);
  });

  // 规则集引用放在订阅原有规则之前
  config.rules = [
    ...ruleSetEntries,
    ...filteredRules,
  ];

  // 10. 写回策略组
  config["proxy-groups"] = groups;

  return config;
};
