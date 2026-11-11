// ============================================================
// FLClash 覆写脚本
// 地区自动测速 + GitHub 远程规则集
// ============================================================

const TEST_URL = "https://www.gstatic.com/generate_204";
const INTERVAL = 300;
const TOLERANCE = 50;

const REPO_RAW = "https://raw.githubusercontent.com/lq666-bit/Flclash_region/main";
const PROVIDER_INTERVAL = 86400;

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

const matchRegion = (name) => {
  for (const [region, flag, re] of REGIONS) {
    if (re.test(name)) return { region, flag };
  }
  return { region: "其他", flag: "🌐" };
};

const main = (config) => {
  // 0. DNS 配置：保留原脚本行为
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
    if (!buckets.has(region)) buckets.set(region, { flag, names: [] });
    buckets.get(region).names.push(p.name);
  }

  const groups = config["proxy-groups"] || [];
  const regionGroupNames = [];
  const order = [...REGIONS.map((r) => r[0]), "其他"];
  const regions = [...buckets.keys()].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  // 2. 找订阅自带自动测速组
  const subAutoCandidates = groups.filter((g) => g.type === "url-test");
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
      group = { name: groupName, type: "url-test" };
      groups.push(group);
    }

    group.type = "url-test";
    group.proxies = [...names];
    group.url = TEST_URL;
    group.interval = INTERVAL;
    group.tolerance = TOLERANCE;
    group.lazy = true;
  }

  // 4. 机场使用订阅自动测速组；没有则建立全节点自动组
  let airportTarget = subAuto ? subAuto.name : null;
  if (!airportTarget) {
    airportTarget = GLOBAL_AUTO_NAME;
    let group = groups.find((g) => g.name === GLOBAL_AUTO_NAME);
    if (!group) {
      group = { name: GLOBAL_AUTO_NAME, type: "url-test" };
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
    pickGroup = { name: pickName, type: "select" };
    groups.unshift(pickGroup);
  }
  pickGroup.type = "select";
  pickGroup.proxies = [...regionGroupNames, "DIRECT"];

  // 6. 订阅手动选择组增加地区选择入口
  for (const g of groups) {
    if (g.type !== "select" || g.name === pickName) continue;
    g.proxies = g.proxies || [];
    if (!g.proxies.includes(pickName)) g.proxies.unshift(pickName);
  }

  // 7. 订阅自动类组开启懒测速
  for (const g of groups) {
    if (!["url-test", "fallback", "load-balance"].includes(g.type)) continue;
    if (regionGroupNames.includes(g.name) || g.name === GLOBAL_AUTO_NAME) continue;
    g.lazy = true;
  }

  // 8. 注册 GitHub 远程规则集
  const ruleProviders = { ...(config["rule-providers"] || {}) };

  ruleProviders["__flclash_script_airport"] = {
    type: "http",
    behavior: "classical",
    format: "yaml",
    url: `${REPO_RAW}/rules/airport.yaml`,
    path: "./rule_providers/flclash_script_airport.yaml",
    interval: PROVIDER_INTERVAL,
  };

  const taiwanTarget = regionGroupNames.find((n) => n.endsWith(" 台湾-自动"));
  if (taiwanTarget) {
    ruleProviders["__flclash_script_taiwan"] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      url: `${REPO_RAW}/rules/taiwan.yaml`,
      path: "./rule_providers/flclash_script_taiwan.yaml",
      interval: PROVIDER_INTERVAL,
    };
  }

  const usTarget = regionGroupNames.find((n) => n.endsWith(" 美国-自动"));
  if (usTarget) {
    ruleProviders["__flclash_script_us"] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      url: `${REPO_RAW}/rules/us.yaml`,
      path: "./rule_providers/flclash_script_us.yaml",
      interval: PROVIDER_INTERVAL,
    };
  }

  config["rule-providers"] = ruleProviders;

  // 9. 规则集引用置于订阅原规则之前，保证脚本规则优先匹配
  const customRuleEntries = [
    `RULE-SET,__flclash_script_airport,${airportTarget}`,
  ];
  if (taiwanTarget) {
    customRuleEntries.push(`RULE-SET,__flclash_script_taiwan,${taiwanTarget}`);
  }
  if (usTarget) {
    customRuleEntries.push(`RULE-SET,__flclash_script_us,${usTarget}`);
  }

  // 避免重复插入本脚本自己的 RULE-SET 引用
  const ownProviderNames = new Set([
    "__flclash_script_airport",
    "__flclash_script_taiwan",
    "__flclash_script_us",
  ]);
  const originalRules = (config.rules || []).filter((rule) => {
    if (typeof rule !== "string") return true;
    if (!rule.startsWith("RULE-SET,")) return true;
    const providerName = rule.split(",")[1];
    return !ownProviderNames.has(providerName);
  });

  config.rules = [...customRuleEntries, ...originalRules];

  // 10. 写回策略组
  config["proxy-groups"] = groups;
  return config;
};
