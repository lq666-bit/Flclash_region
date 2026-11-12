// ============================================================
// FLClash 覆写脚本
// 地区自动测速 + 内嵌规则集 + 精确规则优先覆盖
// ============================================================

const TEST_URL = "https://www.gstatic.com/generate_204";
const INTERVAL = 300;
const TOLERANCE = 50;

// -------------------- 地区识别 --------------------

// words：中文名 / 英文全称 / emoji，直接匹配
// abbrs：2~3 个字母的缩写，前后不能紧挨英文字母，避免 Premium 被当成 IN、Bonus 被当成 US
const mk = (words, abbrs) =>
  new RegExp(`${words}|(?:^|[^A-Za-z])(?:${abbrs})(?![A-Za-z])`, "i");

const REGIONS = [
  ["香港", "🇭🇰", mk("香港|港|Hong\\s?Kong|🇭🇰", "HK")],
  ["台湾", "🇹🇼", mk("台湾|台|Taiwan|🇹🇼", "TW")],
  ["日本", "🇯🇵", mk("日本|Japan|东京|大阪|🇯🇵", "JP")],
  ["新加坡", "🇸🇬", mk("新加坡|狮城|Singapore|🇸🇬", "SG")],
  ["美国", "🇺🇸", mk("美国|United\\s?States|洛杉矶|圣何塞|西雅图|芝加哥|纽约|🇺🇸", "US|USA")],
  ["韩国", "🇰🇷", mk("韩国|韩|Korea|首尔|🇰🇷", "KR")],
  ["英国", "🇬🇧", mk("英国|United\\s?Kingdom|伦敦|🇬🇧", "UK|GB")],
  ["德国", "🇩🇪", mk("德国|Germany|法兰克福|🇩🇪", "DE")],
  ["法国", "🇫🇷", mk("法国|France|巴黎|🇫🇷", "FR")],
  ["加拿大", "🇨🇦", mk("加拿大|Canada|多伦多|温哥华|🇨🇦", "CA")],
  ["澳大利亚", "🇦🇺", mk("澳大利亚|澳洲|Australia|悉尼|🇦🇺", "AU")],
  ["俄罗斯", "🇷🇺", mk("俄罗斯|俄|Russia|🇷🇺", "RU")],
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

  "DOMAIN-KEYWORD,github",
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
  // 注意：必须排除脚本自己创建的全部-自动组，否则第二次运行会误判为"订阅自带"
  const subAutoCandidates = groups.filter(
    (g) => g.type === "url-test" && g.name !== GLOBAL_AUTO_NAME
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
  //    订阅没有自动选择组时，由脚本创建 GLOBAL_AUTO_NAME
  let airportTarget = subAuto ? subAuto.name : null;
  const scriptCreatedAuto = !subAuto;

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

  // 6. 订阅手动选择组增加入口
  //    - 地区选择入口（始终添加，放第一位）
  //    - 全部-自动入口（仅当订阅没有自动选择、由脚本创建了该组时添加，放在地区选择之后）
  for (const g of groups) {
    if (g.type !== "select" || g.name === pickName) continue;

    g.proxies = g.proxies || [];

    if (!g.proxies.includes(pickName)) {
      g.proxies.unshift(pickName);
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

  // 按优先级查找地区自动组，找不到就依次回退，最后回退到 🌍 地区选择
  const findAuto = (...regionList) => {
    for (const r of regionList) {
      const n = regionGroupNames.find((x) => x.endsWith(` ${r}-自动`));
      if (n) return n;
    }
    return null;
  };

  // 台湾规则集（回退：日本 → 新加坡 → 香港 → 地区选择）
  const taiwanTarget =
    findAuto("台湾", "日本", "新加坡", "香港") || pickName;

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

  // 美国规则集（回退：日本 → 新加坡 → 香港 → 台湾 → 地区选择）
  const usTarget =
    findAuto("美国", "日本", "新加坡", "香港", "台湾") || pickName;

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
