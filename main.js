const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = require('electron');
const path = require('path');
const Parser = require('rss-parser');

const parser = new Parser({ timeout: 15000 });

// RSS 源配置 - 中国媒体为主
const RSS_SOURCES = {
  '人民日报': {
    name: '人民日报',
    url: 'https://r.jina.ai/http://www.people.com.cn/rss/politics.xml',
    category: 'politics',
    weight: 95
  },
  '新华社': {
    name: '新华社',
    url: 'https://r.jina.ai/http://www.xinhuanet.com/politics/news_politics.xml',
    category: 'politics',
    weight: 93
  },
  '财新网': {
    name: '财新网',
    url: 'https://r.jina.ai/http://china.caixin.com/rss.xml',
    category: 'finance',
    weight: 88
  },
  '第一财经': {
    name: '第一财经',
    url: 'https://r.jina.ai/http://www.yicai.com/rss/news.xml',
    category: 'finance',
    weight: 85
  },
  '环球时报': {
    name: '环球时报',
    url: 'https://r.jina.ai/http://www.globaltimes.cn/rss.xml',
    category: 'politics',
    weight: 80
  },
  '澎湃新闻': {
    name: '澎湃新闻',
    url: 'https://r.jina.ai/http://www.thepaper.cn/rss.xml',
    category: 'politics',
    weight: 82
  },
  '华尔街见闻': {
    name: '华尔街见闻',
    url: 'https://r.jina.ai/http://wallstreetcn.com/rss.xml',
    category: 'finance',
    weight: 84
  },
  'BBC': {
    name: 'BBC',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'politics',
    weight: 88
  },
  'Reuters': {
    name: 'Reuters',
    url: 'https://r.jina.ai/http://feeds.reuters.com/reuters/businessNews',
    category: 'finance',
    weight: 90
  }
};

// 备用数据
const MOCK_NEWS = [
  {
    id: 'mock-1',
    title: '美联储暗示可能在下次会议暂停加息',
    summary: '美联储最新会议纪要显示，多数官员认为通胀压力正在缓解，可能考虑在下次会议上暂停加息步伐...',
    content: '美联储最新会议纪要显示，多数官员认为通胀压力正在缓解，可能考虑在下次会议上暂停加息步伐。这一信号被市场解读为鸽派转向，美股三大指数应声上涨。',
    source: '财新网',
    url: 'https://reuters.com/news/fed-pause',
    publishTime: new Date().toISOString(),
    category: 'finance',
    impact: 'high',
    goldWeight: 88,
    keywords: ['美联储', '加息', '通胀'],
    entities: ['美联储', '华尔街'],
    sentiment: 'positive',
    isBreaking: false
  },
  {
    id: 'mock-2',
    title: '黄金价格创历史新高，突破3100美元',
    summary: '受全球经济不确定性影响，黄金价格持续攀升，首次突破每盎司3100美元大关...',
    content: '国际金价周一创下历史新高，现货黄金价格上涨至每盎司3115美元，年内涨幅已超过20%。美联储降息预期、地缘政治紧张局势推动避险需求。',
    source: '第一财经',
    url: 'https://reuters.com/news/gold-record',
    publishTime: new Date(Date.now() - 1*60*60*1000).toISOString(),
    category: 'finance',
    impact: 'critical',
    goldWeight: 92,
    keywords: ['黄金', '贵金属', '避险资产'],
    entities: ['美联储'],
    sentiment: 'positive',
    isBreaking: true
  },
  {
    id: 'mock-3',
    title: '中东局势升级：多国关闭领空',
    summary: '随着地区冲突升级，多个中东国家宣布临时关闭领空，国际航班大面积取消...',
    content: '随着地区冲突升级，多个中东国家宣布临时关闭领空，国际航班大面积取消。国际油价突破每桶100美元，黄金价格上涨至3050美元。',
    source: '新华社',
    url: 'https://bbc.com/news/middle-east',
    publishTime: new Date(Date.now() - 2*60*60*1000).toISOString(),
    category: 'military',
    impact: 'critical',
    goldWeight: 94,
    keywords: ['中东', '冲突', '原油', '黄金'],
    entities: ['联合国'],
    sentiment: 'negative',
    isBreaking: true
  },
  {
    id: 'mock-4',
    title: '中国央行宣布降准0.5个百分点',
    summary: '中国人民银行宣布下调金融机构存款准备金率，释放长期资金约1万亿元...',
    content: '中国人民银行宣布下调金融机构存款准备金率0.5个百分点，释放长期资金约1万亿元。这是今年首次降准，旨在支持实体经济发展，降低融资成本。',
    source: '人民日报',
    url: 'https://caixin.com/news/rrr-cut',
    publishTime: new Date(Date.now() - 3*60*60*1000).toISOString(),
    category: 'finance',
    impact: 'high',
    goldWeight: 86,
    keywords: ['中国央行', '降准', 'A股'],
    entities: ['中国人民银行'],
    sentiment: 'positive',
    isBreaking: false
  },
  {
    id: 'mock-5',
    title: '比特币突破11万美元，加密货币市场创新高',
    summary: '比特币价格历史上首次突破11万美元大关，推动整个加密货币市场市值创新高...',
    content: '比特币价格突破11万美元，以太坊、Solana等主流加密货币跟随上涨。机构投资者持续流入，美国比特币ETF资金规模不断扩大。',
    source: '财新网',
    url: 'https://cnbc.com/news/bitcoin-110k',
    publishTime: new Date(Date.now() - 4*60*60*1000).toISOString(),
    category: 'finance',
    impact: 'high',
    goldWeight: 85,
    keywords: ['比特币', '加密货币', 'ETF'],
    entities: ['SEC'],
    sentiment: 'positive',
    isBreaking: false
  },
  {
    id: 'mock-6',
    title: 'OpenAI发布GPT-5，推理能力大幅提升',
    summary: 'OpenAI正式发布GPT-5模型，在数学推理和代码生成方面实现重大突破...',
    content: 'OpenAI正式发布GPT-5模型，在数学推理和代码生成方面实现重大突破。新模型在多项基准测试中超越人类专家水平。',
    source: '澎湃新闻',
    url: 'https://reuters.com/news/gpt5',
    publishTime: new Date(Date.now() - 5*60*60*1000).toISOString(),
    category: 'technology',
    impact: 'high',
    goldWeight: 82,
    keywords: ['OpenAI', 'GPT-5', 'AI'],
    entities: ['OpenAI', '微软'],
    sentiment: 'positive',
    isBreaking: true
  }
];

// 缓存
let cachedNews = [...MOCK_NEWS];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 关键词提取
function extractKeywords(text) {
  const map = {
    '黄金': ['黄金'], '白银': ['白银'], '原油': ['原油', '石油'],
    '美联储': ['美联储', 'Fed', '加息', '降息', '利率'],
    '比特币': ['比特币', 'BTC', '加密货币'],
    '伊朗': ['伊朗', '中东'], '美国': ['美国', '美股'],
    '中国': ['中国', 'A股'], '俄罗斯': ['俄罗斯', '俄乌'],
    '以色列': ['以色列', '巴勒斯坦'],
    '股市': ['股市', '股票', '指数'], '通胀': ['通胀', 'CPI'],
    '战争': ['战争', '冲突', '军事'], 'AI': ['AI', '人工智能'],
    '芯片': ['芯片', '半导体'], '关税': ['关税', '贸易'],
    'OPEC': ['OPEC'], '央行': ['央行', '降准']
  };
  const keywords = [];
  for (const [k, v] of Object.entries(map)) {
    if (v.some(w => text.includes(w))) keywords.push(k);
  }
  return [...new Set(keywords)].slice(0, 5);
}

// 提取实体
function extractEntities(text) {
  const patterns = [
    { name: '美联储', keywords: ['美联储', 'Federal Reserve', 'Fed'] },
    { name: '欧洲央行', keywords: ['欧洲央行', 'ECB'] },
    { name: '日本央行', keywords: ['日本央行', 'BOJ'] },
    { name: '中国央行', keywords: ['中国央行', '中国人民银行'] },
    { name: '联合国', keywords: ['联合国', 'UN'] },
    { name: 'OPEC', keywords: ['OPEC'] },
    { name: '北约', keywords: ['北约', 'NATO'] },
    { name: '华尔街', keywords: ['华尔街'] },
    { name: '道琼斯', keywords: ['道琼斯'] },
    { name: '纳斯达克', keywords: ['纳斯达克'] },
    { name: '标普500', keywords: ['标普'] },
    { name: 'SWIFT', keywords: ['SWIFT'] }
  ];
  const entities = [];
  for (const { name, keywords } of patterns) {
    if (keywords.some(k => text.includes(k))) entities.push(name);
  }
  return [...new Set(entities)].slice(0, 5);
}

// 智能分类
function categorizeNews(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  const keywords = {
    politics: ['选举', '政府', '议会', '政策', '政党', '总统', '总理', '投票', '制裁', '外交'],
    finance: ['股票', '债券', '利率', '银行', '黄金', '白银', '比特币', '加密货币', 'ETF', '股市', '标普', '纳斯达克', '道琼斯'],
    military: ['军队', '导弹', '空袭', '军事', '战争', '冲突', '武器', '防御', '舰队', '轰炸', '袭击'],
    economy: ['GDP', '通胀', '就业', '贸易', '产业', '能源', '石油', '天然气', '关税', 'CPI'],
    diplomacy: ['外交', '谈判', '条约', '峰会', '访问', '关系', '制裁', '协议'],
    technology: ['AI', '人工智能', '科技', '芯片', '半导体', '互联网', '区块链', 'ChatGPT']
  };
  const scores = { politics: 0, finance: 0, military: 0, economy: 0, diplomacy: 0, technology: 0 };
  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (text.includes(word.toLowerCase())) scores[category]++;
    }
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// 情感分析
function analyzeSentiment(text) {
  const positive = ['上涨', '增长', '突破', '成功', '积极', '乐观', '利好', '强劲', '创新', '合作', '复苏', '反弹', '创新高'];
  const negative = ['下跌', '衰退', '危机', '冲突', '战争', '制裁', '紧张', '担忧', '风险', '威胁', '暴跌', '崩盘'];
  let pos = 0, neg = 0;
  for (const w of positive) if (text.includes(w)) pos++;
  for (const w of negative) if (text.includes(w)) neg++;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// 判断突发新闻
function isBreakingNews(title, category) {
  const breaking = ['突发', 'breaking', '紧急', 'urgent', '快讯', 'alert', '刚刚', '立即'];
  return breaking.some(k => title.toLowerCase().includes(k.toLowerCase())) || 
         ['military', 'politics'].includes(category);
}

// 计算含金量
function calculateGoldWeight(news, sourceWeight) {
  let score = sourceWeight * 0.25;
  score += Math.min(news.keywords.length * 10, 100) * 0.20;
  const categoryWeights = { finance: 1.0, politics: 0.9, military: 0.95, economy: 0.85, diplomacy: 0.8, technology: 0.75 };
  score += (categoryWeights[news.category] * 80) * 0.25;
  const hoursAgo = (Date.now() - new Date(news.publishTime).getTime()) / (1000 * 60 * 60);
  let timeliness = hoursAgo <= 1 ? 100 : hoursAgo <= 6 ? 90 : hoursAgo <= 24 ? 80 : 60;
  score += timeliness * 0.15;
  let global = news.isBreaking ? 90 : 70;
  if (news.entities.includes('联合国') || news.entities.includes('美联储')) global += 10;
  score += Math.min(global, 100) * 0.15;
  return Math.round(Math.min(score, 100));
}

// 解析RSS
async function parseRSS(sourceKey, config) {
  const newsItems = [];
  try {
    const feed = await parser.parseURL(config.url);
    if (!feed.items || feed.items.length === 0) return newsItems;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const item of feed.items.slice(0, 10)) {
      const pubDate = item.pubDate || item.isoDate;
      if (!pubDate) continue;
      const publishTime = new Date(pubDate);
      if (publishTime < oneDayAgo) continue;
      const id = `${sourceKey}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const title = item.title || '无标题';
      const content = item.contentSnippet || item.content || title;
      const keywords = extractKeywords(title + ' ' + content);
      const entities = extractEntities(title + ' ' + content);
      const category = categorizeNews(title, content);
      const sentiment = analyzeSentiment(title + ' ' + content);
      const isBreaking = isBreakingNews(title, category);
      const news = {
        id,
        title,
        summary: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
        content,
        source: config.name,
        url: item.link || '',
        publishTime: publishTime.toISOString(),
        category,
        impact: 'medium',
        goldWeight: 0,
        keywords,
        entities,
        sentiment,
        isBreaking
      };
      news.goldWeight = calculateGoldWeight(news, config.weight);
      if (news.goldWeight >= 90) news.impact = 'critical';
      else if (news.goldWeight >= 80) news.impact = 'high';
      else if (news.goldWeight >= 60) news.impact = 'medium';
      else news.impact = 'low';
      newsItems.push(news);
    }
  } catch (error) {
    console.error(`RSS解析失败 ${config.name}:`, error.message);
  }
  return newsItems;
}

// 获取新闻
async function getNews() {
  const now = Date.now();
  if (now - lastFetchTime > CACHE_DURATION || cachedNews.length === 0) {
    console.log('抓取新新闻...', new Date().toISOString());
    const results = await Promise.all(
      Object.entries(RSS_SOURCES).map(([key, config]) => parseRSS(key, config))
    );
    let allNews = results.flat();
    if (allNews.length === 0) {
      console.log('RSS抓取失败，使用备用数据');
      allNews = [...MOCK_NEWS];
    }
    const seen = new Set();
    allNews = allNews.filter(news => {
      if (seen.has(news.url)) return false;
      seen.add(news.url);
      return true;
    });
    allNews.sort((a, b) => b.goldWeight - a.goldWeight);
    cachedNews = allNews.slice(0, 50);
    lastFetchTime = now;
    console.log(`抓取完成: ${cachedNews.length} 条新闻`);
  }
  return cachedNews;
}

// 主窗口
let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 创建托盘
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    }},
    { label: '刷新新闻', click: async () => {
      lastFetchTime = 0;
      const news = await getNews();
      if (mainWindow) {
        mainWindow.webContents.send('news-updated', news);
      }
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      app.quit();
    }}
  ]);
  tray.setToolTip('NewsIntel - 新闻智能分析平台');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      createWindow();
    }
  });
}

// IPC 处理
ipcMain.handle('get-news', async () => {
  return await getNews();
});

ipcMain.handle('refresh-news', async () => {
  lastFetchTime = 0;
  return await getNews();
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// 自动更新定时器
let updateInterval;

function startAutoUpdate() {
  updateInterval = setInterval(async () => {
    console.log('自动更新新闻...');
    const news = await getNews();
    if (mainWindow) {
      mainWindow.webContents.send('news-updated', news);
    }
  }, 5 * 60 * 1000); // 5分钟
}

// 应用启动
app.whenReady().then(() => {
  createWindow();
  createTray();
  startAutoUpdate();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Windows/Linux: 关闭窗口不退出，保留托盘
  }
});

app.on('before-quit', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
