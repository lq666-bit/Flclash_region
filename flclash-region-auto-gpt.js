
// FLClash 订阅覆写脚本
// 地区自动测速 + GitHub 远程规则集
// 适用于 FLClash 0.9.3
// 入口：const main = (config) => { ... return config; }

const main = (config) => {
  const TEST_URL = "https://www.gstatic.com/generate_204";
  const INTERVAL = 300;
  const TOLERANCE = 50;

  const REPO_RAW =
    "https://raw.githubusercontent.com/lq666-bit/Flclash_region/main";

  const PROVIDER_INTERVAL = 86400;

  // 地区节点识别规则
  // 使用完整地区名称或独立英文缩写，减少误匹配
  const REGIONS = [
    { name: "香港", pattern: /香港|Hong\s?Kong|(?:^|[^A-Za-z])HK(?:$|[^A-Za-z])|🇭🇰/i },
    { name: "台湾", pattern: /台湾|台灣|Taiwan|(?:^|[^A-Za-z])TW(?:$|[^A-Za-z])|🇹🇼/i },
    { name: "日本", pattern: /日本|Japan|(?:^|[^A-Za-z])JP(?:$|[^A-Za-z])|🇯🇵/i },
    { name: "新加坡", pattern: /新加坡|Singapore|(?:^|[^A-Za-z])SG(?:$|[^A-Za-z])|🇸🇬/i },
    { name: "美国", pattern: /美国|美國|United States|USA|(?:^|[^A-Za-z])US(?:$|[^A-Za-z])|🇺🇸/i },
    { name: "韩国", pattern: /韩国|韓國|South Korea|Korea|(?:^|[^A-Za-z])KR(?:$|[^A-Za-z])|🇰🇷/i },
    { name: "英国", pattern: /英国|英國|United Kingdom|(?:^|[^A-Za-z])UK(?:$|[^A-Za-z])|🇬🇧/i },
    { name: "德国", pattern: /德国|德國|Germany|(?:^|[^A-Za-z])DE(?:$|[^A-Za-z])|🇩🇪/i },
    { name: "法国", pattern: /法国|法國|France|(?:^|[^A-Za-z])FR(?:$|[^A-Za-z])|🇫🇷/i },
    { name: "加拿大", pattern: /加拿大|Canada|(?:^|[^A-Za-z])CA(?:$|[^A-Za-z])|🇨🇦/i },
    { name: "澳大利亚", pattern: /澳大利亚|澳洲|Australia|(?:^|[^A-Za-z])AU(?:$|[^A-Za-z])|🇦🇺/i },
    { name: "俄罗斯", pattern: /俄罗斯|俄羅斯|Russia|(?:^|[^A-Za-z])RU(?:$|[^A-Za-z])|🇷🇺/i },
    { name: "印度", pattern: /印度|India|(?:^|[^A-Za-z])IN(?:$|[^A-Za-z])|🇮🇳/i },
    { name: "土耳其", pattern: /土耳其|Turkey|Türkiye|(?:^|[^A-Za-z])TR(?:$|[^A-Za-z])|🇹🇷/i },
    { name: "阿根廷", pattern: /阿根廷|Argentina|(?:^|[^A-Za-z])AR(?:$|[^A-Za-z])|🇦🇷/i },
    { name: "巴西", pattern: /巴西|Brazil|(?:^|[^A-Za-z])BR(?:$|[^A-Za-z])|🇧🇷/i },
    { name: "荷兰", pattern: /荷兰|荷蘭|Netherlands|(?:^|[^A-Za-z])NL(?:$|[^A-Za-z])|🇳🇱/i },
    { name: "马来西亚", pattern: /马来西亚|馬來西亞|Malaysia|(?:^|[^A-Za-z])MY(?:$|[^A-Za-z])|🇲🇾/i },
    { name: "泰国", pattern: /泰国|泰國|Thailand|(?:^|[^A-Za-z])TH(?:$|[^A-Za-z])|🇹🇭/i },
    { name: "越南", pattern: /越南|Vietnam|(?:^|[^A-Za-z])VN(?:$|[^A-Za-z])|🇻🇳/i },
    { name: "菲律宾", pattern: /菲律宾|菲律賓|Philippines|(?:^|[^A-Za-z])PH(?:$|[^A-Za-z])|🇵🇭/i },
    { name: "印尼", pattern: /印尼|印度尼西亚|Indonesia|(?:^|[^A-Za-z])ID(?:$|[^A-Za-z])|🇮🇩/i }
  ];

  // 排除流量、到期时间、官网等非代理节点
  const INFO_NODE =
    /剩余流量|距离下次|套餐到期|到期时间|官网|公告|重置流量|过期时间/i;

  const DNS_CONFIG = {
    enable: true,
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "respect-rules": true,
    "default-nameserver": [
      "223.5.5.5",
      "119.29.29.29",
      "8.8.8.8"
    ],
    nameserver: [
      "https://1.1.1.1/dns-query",
      "https://8.8.8.8/dns-query"
    ],
    "proxy-server-nameserver": [
      "https://223.5.5.5/dns-query"
    ],
    "direct-nameserver": [
      "https://223.5.5.5/dns-query"
    ]
  };

  const GLOBAL_AUTO_NAME = "♻️ 全部-自动";
  const REGION_SELECT_NAME = "🌍 地区选择";

  // 初始化配置
  config.proxies = Array.isArray(config.proxies) ? config.proxies : [];
  config["proxy-groups"] = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"]
    : [];
  config.rules = Array.isArray(config.rules) ? config.rules : [];
  config["rule-providers"] = config["rule-providers"] || {};

  // 保留原 DNS 中未被本脚本指定的字段
  config.dns = {
    ...(config.dns || {}),
    ...DNS_CONFIG
  };

  // 过滤信息节点
  config.proxies = config.proxies.filter(
    node => node && node.name && !INFO_NODE.test(node.name)
  );

  const proxyNames = config.proxies.map(node => node.name);

  // 根据节点名称识别地区
  const regionNodes = {};

  REGIONS.forEach(region => {
    regionNodes[region.name] = proxyNames.filter(name =>
      region.pattern.test(name)
    );
  });

  // 创建或更新策略组
  const upsertGroup = group => {
    const groups = config["proxy-groups"];
    const index = groups.findIndex(item => item.name === group.name);

    if (index >= 0) {
      groups[index] = {
        ...groups[index],
        ...group
      };
    } else {
      groups.push(group);
    }
  };

  // 找到订阅原有的自动测速组
  const originalAutoGroup = config["proxy-groups"].find(group =>
    group.type === "url-test" &&
    !group.name.includes("全部-自动") &&
    /自动|auto/i.test(group.name)
  );

  // 创建或更新全部节点自动测速组
  upsertGroup({
    name: GLOBAL_AUTO_NAME,
    type: "url-test",
    proxies: proxyNames,
    url: TEST_URL,
    interval: INTERVAL,
    tolerance: TOLERANCE,
    lazy: true
  });

  // 创建地区自动测速组
  const regionGroupNames = [];

  REGIONS.forEach(region => {
    const nodes = regionNodes[region.name];

    if (!nodes || nodes.length === 0) return;

    const groupName = `♻️ ${region.name}-自动测速`;

    upsertGroup({
      name: groupName,
      type: "url-test",
      proxies: nodes,
      url: TEST_URL,
      interval: INTERVAL,
      tolerance: TOLERANCE,
      lazy: true
    });

    regionGroupNames.push(groupName);
  });

  // 机场规则的目标：优先使用订阅原有自动组
  const airportTarget = originalAutoGroup
    ? originalAutoGroup.name
    : GLOBAL_AUTO_NAME;

  // 创建地区选择组
  upsertGroup({
    name: REGION_SELECT_NAME,
    type: "select",
    proxies: [
      ...regionGroupNames,
      GLOBAL_AUTO_NAME,
      "DIRECT"
    ]
  });

  // 让其他 select 组可以选择地区策略组
  config["proxy-groups"].forEach(group => {
    if (
      group.type === "select" &&
      group.name !== REGION_SELECT_NAME &&
      !group.proxies.includes(REGION_SELECT_NAME)
    ) {
      group.proxies.unshift(REGION_SELECT_NAME);
    }

    if (
      ["url-test", "fallback", "load-balance"].includes(group.type)
    ) {
      group.lazy = true;
    }
  });

  // 注册 GitHub 远程 YAML 规则集
  const addRemoteProvider = (name, fileName) => {
    config["rule-providers"][name] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      url: `${REPO_RAW}/rules/${fileName}`,
      path: `./rule_providers/${name}.yaml`,
      interval: PROVIDER_INTERVAL
    };
  };

  // 机场规则始终注册
  addRemoteProvider(
    "__flclash_script_airport",
    "airport.yaml"
  );

  // 台湾规则：有台湾节点时才注册
  const taiwanGroup = "♻️ 台湾-自动测速";
  if (regionNodes["台湾"].length > 0) {
    addRemoteProvider(
      "__flclash_script_taiwan",
      "taiwan.yaml"
    );
  }

  // 美国规则：有美国节点时才注册
  const usGroup = "♻️ 美国-自动测速";
  if (regionNodes["美国"].length > 0) {
    addRemoteProvider(
      "__flclash_script_us",
      "us.yaml"
    );
  }

  // 删除本脚本上一次插入的规则引用，避免重复
  const managedProviders = [
    "__flclash_script_airport",
    "__flclash_script_taiwan",
    "__flclash_script_us"
  ];

  config.rules = config.rules.filter(rule => {
    if (typeof rule !== "string") return true;

    return !managedProviders.some(name =>
      rule.startsWith(`RULE-SET,${name},`)
    );
  });

  // 自定义远程规则优先于订阅原有规则
  const customRules = [
    `RULE-SET,__flclash_script_airport,${airportTarget}`
  ];

  if (regionNodes["台湾"].length > 0) {
    customRules.push(
      `RULE-SET,__flclash_script_taiwan,${taiwanGroup}`
    );
  }

  if (regionNodes["美国"].length > 0) {
    customRules.push(
      `RULE-SET,__flclash_script_us,${usGroup}`
    );
  }

  config.rules = [
    ...customRules,
    ...config.rules
  ];

  return config;
};
