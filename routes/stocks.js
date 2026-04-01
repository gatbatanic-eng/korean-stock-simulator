const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STOCKS_FILE = path.join(__dirname, '..', 'stocks_data.json');

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function naverCode(symbol) {
  return symbol.replace(/\.(KS|KQ)$/, '');
}
function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[,+]/g, ''));
  return isNaN(n) ? null : n;
}

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

const POPULAR_STOCKS = [
  // ── KOSPI 시가총액 상위 ──────────────────────────────────────────────────────
  { symbol: '005930.KS', name: '삼성전자' },
  { symbol: '000660.KS', name: 'SK하이닉스' },
  { symbol: '373220.KS', name: 'LG에너지솔루션' },
  { symbol: '207940.KS', name: '삼성바이오로직스' },
  { symbol: '005380.KS', name: '현대자동차' },
  { symbol: '068270.KS', name: '셀트리온' },
  { symbol: '000270.KS', name: '기아' },
  { symbol: '105560.KS', name: 'KB금융' },
  { symbol: '028260.KS', name: '삼성물산' },
  { symbol: '055550.KS', name: '신한지주' },
  { symbol: '035420.KS', name: 'NAVER' },
  { symbol: '006400.KS', name: '삼성SDI' },
  { symbol: '051910.KS', name: 'LG화학' },
  { symbol: '012330.KS', name: '현대모비스' },
  { symbol: '035720.KS', name: '카카오' },
  { symbol: '086790.KS', name: '하나금융지주' },
  { symbol: '032830.KS', name: '삼성생명' },
  { symbol: '003550.KS', name: 'LG' },
  { symbol: '096770.KS', name: 'SK이노베이션' },
  { symbol: '017670.KS', name: 'SK텔레콤' },
  { symbol: '005490.KS', name: 'POSCO홀딩스' },
  { symbol: '034730.KS', name: 'SK' },
  { symbol: '015760.KS', name: '한국전력' },
  { symbol: '066570.KS', name: 'LG전자' },
  { symbol: '316140.KS', name: '우리금융지주' },
  { symbol: '010130.KS', name: '고려아연' },
  { symbol: '033780.KS', name: 'KT&G' },
  { symbol: '000810.KS', name: '삼성화재' },
  { symbol: '034020.KS', name: '두산에너빌리티' },
  { symbol: '011070.KS', name: 'LG이노텍' },
  { symbol: '138040.KS', name: '메리츠금융지주' },
  { symbol: '003670.KS', name: '포스코퓨처엠' },
  { symbol: '009540.KS', name: '한국조선해양' },
  { symbol: '086280.KS', name: '현대글로비스' },
  { symbol: '024110.KS', name: 'IBK기업은행' },
  { symbol: '000720.KS', name: '현대건설' },
  { symbol: '051900.KS', name: 'LG생활건강' },
  { symbol: '012450.KS', name: '한화에어로스페이스' },
  { symbol: '028050.KS', name: '삼성엔지니어링' },
  { symbol: '128940.KS', name: '한미약품' },
  { symbol: '011170.KS', name: '롯데케미칼' },
  { symbol: '004020.KS', name: '현대제철' },
  { symbol: '003490.KS', name: '대한항공' },
  { symbol: '009150.KS', name: '삼성전기' },
  { symbol: '030200.KS', name: 'KT' },
  { symbol: '329180.KS', name: 'HD현대중공업' },
  { symbol: '251270.KS', name: '넷마블' },
  { symbol: '323410.KS', name: '카카오뱅크' },
  { symbol: '259960.KS', name: '크래프톤' },
  { symbol: '001450.KS', name: '현대해상' },
  { symbol: '005830.KS', name: 'DB손해보험' },
  { symbol: '267250.KS', name: 'HD현대' },
  { symbol: '010140.KS', name: '삼성중공업' },
  { symbol: '036460.KS', name: '한국가스공사' },
  { symbol: '009830.KS', name: '한화솔루션' },
  { symbol: '271560.KS', name: '오리온' },
  { symbol: '282330.KS', name: 'BGF리테일' },
  { symbol: '004170.KS', name: '신세계' },
  { symbol: '139480.KS', name: '이마트' },
  { symbol: '377300.KS', name: '카카오페이' },
  { symbol: '011200.KS', name: 'HMM' },
  { symbol: '241560.KS', name: '두산밥캣' },
  { symbol: '078930.KS', name: 'GS' },
  { symbol: '034220.KS', name: 'LG디스플레이' },
  { symbol: '161390.KS', name: '한국타이어앤테크놀로지' },
  { symbol: '307950.KS', name: '현대오토에버' },
  { symbol: '103140.KS', name: '풍산' },
  { symbol: '000100.KS', name: '유한양행' },
  { symbol: '016360.KS', name: '삼성증권' },
  { symbol: '006800.KS', name: '미래에셋증권' },
  { symbol: '005940.KS', name: 'NH투자증권' },
  { symbol: '071050.KS', name: '한국금융지주' },
  { symbol: '042660.KS', name: '한화오션' },
  { symbol: '001040.KS', name: 'CJ' },
  { symbol: '097950.KS', name: 'CJ제일제당' },
  { symbol: '267260.KS', name: 'HD현대일렉트릭' },
  { symbol: '006260.KS', name: 'LS' },
  { symbol: '004990.KS', name: '롯데지주' },
  { symbol: '011780.KS', name: '금호석유화학' },
  { symbol: '018260.KS', name: '삼성SDS' },
  { symbol: '402340.KS', name: 'SK스퀘어' },
  { symbol: '047050.KS', name: '포스코인터내셔널' },
  { symbol: '047040.KS', name: '대우건설' },
  { symbol: '006360.KS', name: 'GS건설' },
  { symbol: '010950.KS', name: 'S-Oil' },
  { symbol: '002380.KS', name: 'KCC' },
  { symbol: '000880.KS', name: '한화' },
  { symbol: '036570.KS', name: '엔씨소프트' },
  { symbol: '285130.KS', name: 'SK케미칼' },
  { symbol: '326030.KS', name: 'SK바이오팜' },
  { symbol: '383800.KS', name: 'LX홀딩스' },
  { symbol: '120110.KS', name: '코오롱인더스트리' },
  { symbol: '004800.KS', name: '효성' },
  { symbol: '029780.KS', name: '삼성카드' },
  { symbol: '012750.KS', name: '에스원' },
  { symbol: '010060.KS', name: 'OCI홀딩스' },
  { symbol: '021240.KS', name: '코웨이' },
  { symbol: '180640.KS', name: '한진칼' },
  { symbol: '017800.KS', name: '현대엘리베이터' },
  { symbol: '032640.KS', name: 'LG유플러스' },
  { symbol: '302440.KS', name: 'SK바이오사이언스' },
  { symbol: '383220.KS', name: 'F&F' },
  { symbol: '280360.KS', name: '롯데웰푸드' },
  { symbol: '088350.KS', name: '한화생명' },
  { symbol: '000150.KS', name: '두산' },
  { symbol: '030000.KS', name: '제일기획' },
  { symbol: '069960.KS', name: '현대백화점' },
  { symbol: '004370.KS', name: '농심' },
  { symbol: '010620.KS', name: '현대미포조선' },
  { symbol: '011790.KS', name: 'SKC' },
  { symbol: '204320.KS', name: '만도' },
  { symbol: '185750.KS', name: '종근당홀딩스' },
  { symbol: '001630.KS', name: '종근당' },
  { symbol: '161890.KS', name: '한국콜마' },
  { symbol: '007310.KS', name: '오뚜기' },
  { symbol: '000210.KS', name: 'DL' },
  { symbol: '294870.KS', name: 'HDC현대산업개발' },
  { symbol: '352820.KS', name: '하이브' },
  { symbol: '001740.KS', name: 'SK네트웍스' },
  { symbol: '010120.KS', name: 'LS ELECTRIC' },
  { symbol: '079550.KS', name: 'LIG넥스원' },
  { symbol: '272210.KS', name: '한화시스템' },
  { symbol: '008930.KS', name: '한미사이언스' },
  { symbol: '000080.KS', name: '하이트진로' },
  { symbol: '007070.KS', name: 'GS리테일' },
  { symbol: '014680.KS', name: '한솔케미칼' },
  { symbol: '004000.KS', name: '롯데정밀화학' },
  { symbol: '035250.KS', name: '강원랜드' },
  { symbol: '051600.KS', name: '한전KPS' },
  // ── KOSDAQ 시가총액 상위 ─────────────────────────────────────────────────────
  { symbol: '247540.KQ', name: '에코프로비엠' },
  { symbol: '086520.KQ', name: '에코프로' },
  { symbol: '028300.KQ', name: 'HLB' },
  { symbol: '196170.KQ', name: '알테오젠' },
  { symbol: '058470.KQ', name: '리노공업' },
  { symbol: '145020.KQ', name: '휴젤' },
  { symbol: '277810.KQ', name: '레인보우로보틱스' },
  { symbol: '214450.KQ', name: '파마리서치' },
  { symbol: '293490.KQ', name: '카카오게임즈' },
  { symbol: '263750.KQ', name: '펄어비스' },
  { symbol: '225570.KQ', name: '넥슨게임즈' },
  { symbol: '112040.KQ', name: '위메이드' },
  { symbol: '214150.KQ', name: '클래시스' },
  { symbol: '086900.KQ', name: '메디톡스' },
  { symbol: '257720.KQ', name: '실리콘투' },
  { symbol: '403870.KQ', name: 'HPSP' },
  { symbol: '240810.KQ', name: '원익IPS' },
  { symbol: '068760.KQ', name: '셀트리온제약' },
  { symbol: '253450.KQ', name: '스튜디오드래곤' },
  { symbol: '357780.KQ', name: '솔브레인' },
  { symbol: '237690.KQ', name: '에스티팜' },
  { symbol: '096530.KQ', name: '씨젠' },
  { symbol: '039030.KQ', name: '이오테크닉스' },
  { symbol: '022100.KQ', name: '포스코DX' },
  { symbol: '041510.KQ', name: 'SM엔터테인먼트' },
  { symbol: '035900.KQ', name: 'JYP Ent.' },
  { symbol: '122870.KQ', name: '와이지엔터테인먼트' },
  { symbol: '290650.KQ', name: '엘앤에프' },
  { symbol: '064760.KQ', name: '티씨케이' },
  { symbol: '009420.KQ', name: '한올바이오파마' },
  { symbol: '078600.KQ', name: '대주전자재료' },
  { symbol: '078340.KQ', name: '컴투스' },
  { symbol: '035760.KQ', name: 'CJ ENM' },
  { symbol: '042700.KQ', name: '한미반도체' },
  { symbol: '215200.KQ', name: '메가스터디교육' },
  { symbol: '137310.KQ', name: '에스디바이오센서' },
  { symbol: '012510.KQ', name: '더존비즈온' },
  { symbol: '053210.KQ', name: '스카이라이프' },
  { symbol: '067630.KQ', name: 'HLB생명과학' },
  { symbol: '335890.KQ', name: '비올' },
  { symbol: '131970.KQ', name: '두산테스나' },
  { symbol: '376300.KQ', name: '디어유' },
  { symbol: '287410.KQ', name: '제이시스메디칼' },
  { symbol: '032500.KQ', name: '케이엠더블유' },
  { symbol: '030530.KQ', name: '원익홀딩스' },
  { symbol: '389470.KQ', name: '인텔리안테크' },
  { symbol: '060280.KQ', name: '큐렉소' },
  { symbol: '067160.KQ', name: '아프리카TV' },
  { symbol: '095660.KQ', name: '네오위즈' },
  { symbol: '140860.KQ', name: '파크시스템스' },
  { symbol: '336570.KQ', name: '원텍' },
  { symbol: '043150.KQ', name: '바텍' },
  { symbol: '053300.KQ', name: '피에스케이' },
  { symbol: '041460.KQ', name: '원익큐엔씨' },
  { symbol: '376980.KQ', name: '덕산테코피아' },
  { symbol: '039560.KQ', name: 'NHN' },
  { symbol: '161700.KQ', name: '피엔티' },
  { symbol: '036830.KQ', name: '솔브레인홀딩스' },
  { symbol: '048260.KQ', name: '오스템임플란트' },
  { symbol: '950130.KQ', name: '엑세스바이오' },
  { symbol: '041920.KQ', name: '메가스터디' },
  { symbol: '080160.KQ', name: '메지온' },
  { symbol: '065660.KQ', name: '에스티큐브' },
  { symbol: '048910.KQ', name: '대원미디어' },
  { symbol: '204450.KQ', name: '파인솔루션' },
  { symbol: '089030.KQ', name: '테크윙' },
  { symbol: '066390.KQ', name: '코스맥스엔비티' },
  { symbol: '251600.KQ', name: '케어젠' },
  { symbol: '048080.KQ', name: '용평리조트' },
  { symbol: '219130.KQ', name: '타이거일렉' },
  { symbol: '060310.KQ', name: '3S' },
];

// ─── 파일 기반 데이터 스토어 ─────────────────────────────────────────────────
let stocksMemory = [];
let lastUpdatedAt = null;

function loadFromFile() {
  try {
    if (fs.existsSync(STOCKS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STOCKS_FILE, 'utf8'));
      if (Array.isArray(raw.stocks) && raw.stocks.length > 0) {
        stocksMemory = raw.stocks;
        lastUpdatedAt = raw.lastUpdated;
        console.log(`[stocks] 저장 데이터 로드: ${raw.stocks.length}개 종목 (갱신: ${raw.lastUpdated})`);
        return true;
      }
    }
  } catch (e) {
    console.warn('[stocks] 파일 로드 실패:', e.message);
  }
  stocksMemory = POPULAR_STOCKS.map(s => ({
    symbol: s.symbol, name: s.name,
    market: s.symbol.endsWith('.KQ') ? 'KOSDAQ' : 'KOSPI',
    price: null, change: null, changePercent: null,
    prevClose: null, high: null, low: null, volume: null,
  }));
  return false;
}

function saveToFile(stocks) {
  try {
    fs.writeFileSync(
      STOCKS_FILE,
      JSON.stringify({ lastUpdated: new Date().toISOString(), stocks }, null, 2),
      'utf8'
    );
    console.log(`[stocks] stocks_data.json 저장 완료 (${stocks.length}개)`);
  } catch (e) {
    console.error('[stocks] 파일 저장 실패:', e.message);
  }
}

// ─── 개별 종목 시세 조회 ────────────────────────────���────────────────────────
async function fetchOneStock(code) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`;
    const { data } = await axios.get(url, { headers: NAVER_HEADERS, timeout: 12000 });
    const d = data?.datas?.[0] ?? data?.result?.areas?.[0]?.datas?.[0];
    if (d && (d.closePrice != null)) {
      return {
        price:         parseNum(d.closePrice),
        prevClose:     parseNum(d.previousClosePrice) ?? parseNum(d.basePrice),
        change:        parseNum(d.compareToPreviousClosePrice),
        changePercent: parseNum(d.fluctuationsRatio),
        high:          parseNum(d.highPrice),
        low:           parseNum(d.lowPrice),
        volume:        parseNum(d.accumulatedTradingVolume),
      };
    }
  } catch { /* 다음 소스로 */ }

  const url2 = `https://m.stock.naver.com/api/stock/${code}/basic`;
  const { data: d2 } = await axios.get(url2, { headers: NAVER_HEADERS, timeout: 12000 });
  if (!d2 || d2.closePrice == null) throw new Error(`no data: ${code}`);
  return {
    price:         parseNum(d2.closePrice),
    prevClose:     parseNum(d2.previousClosePrice),
    change:        parseNum(d2.compareToPreviousClosePrice),
    changePercent: parseNum(d2.fluctuationsRatio),
    high:          parseNum(d2.highPrice),
    low:           parseNum(d2.lowPrice),
    volume:        parseNum(d2.accumulatedTradingVolume),
  };
}

// ─── 동시성 제한 헬퍼 ────────────────────────────────────────────────────────
async function withConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ─── 크롤링 메인 함수 ─────────────────────────────────────────────────────────
async function crawlAllStocks() {
  console.log('\n[stocks] ── 크롤링 시작 ──────────────────────────────');
  const prevMap = Object.fromEntries(stocksMemory.map(s => [s.symbol, s]));
  let success = 0, fail = 0;

  const tasks = POPULAR_STOCKS.map(s => async () => {
    const code = naverCode(s.symbol);
    const market = s.symbol.endsWith('.KQ') ? 'KOSDAQ' : 'KOSPI';
    try {
      const q = await fetchOneStock(code);
      success++;
      return { symbol: s.symbol, name: s.name, market, ...q };
    } catch {
      fail++;
      const prev = prevMap[s.symbol];
      return prev
        ? { ...prev }
        : { symbol: s.symbol, name: s.name, market, price: null, change: null, changePercent: null, prevClose: null, high: null, low: null, volume: null };
    }
  });

  const results = await withConcurrency(tasks, 5);
  console.log(`[stocks] 크롤링 완료: 성공 ${success}개 / 실패 ${fail}개`);

  if (success > 0) {
    stocksMemory = results;
    lastUpdatedAt = new Date().toISOString();
    saveToFile(results);
  } else {
    console.warn('[stocks] 전체 실패 — 기존 데이터 유지');
  }
}

// 모듈 로드 시 즉시 파일에서 읽기
loadFromFile();

// ─── 라우트 ───────────────────────────────────────────────────────��──────────
router.get('/all', (req, res) => {
  res.json({ stocks: stocksMemory, lastUpdated: lastUpdatedAt });
});

router.get('/popular', (req, res) => {
  res.json(stocksMemory.filter(s => s.market === 'KOSPI').slice(0, 20));
});

router.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: '검색어를 입력하세요.' });

  const matches = stocksMemory.filter(
    s => s.name.includes(q) || naverCode(s.symbol).includes(q)
  );
  if (matches.length > 0) return res.json(matches.slice(0, 10));

  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,index`;
    const { data } = await axios.get(url, { headers: NAVER_HEADERS, timeout: 6000 });
    const results = (data.items?.[0] || [])
      .filter(item => item[1] && /^\d{6}$/.test(item[1]))
      .map(item => ({
        symbol: item[1] + (String(item[2]) === '2' ? '.KQ' : '.KS'),
        name: item[0],
        market: String(item[2]) === '2' ? 'KOSDAQ' : 'KOSPI',
        price: null, change: null, changePercent: null,
      }));
    return res.json(results.slice(0, 10));
  } catch {
    return res.json([]);
  }
});

router.get('/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol;

  const cached = stocksMemory.find(s => s.symbol === symbol);
  if (cached && cached.price != null) return res.json(cached);

  try {
    const code = naverCode(symbol);
    const q = await fetchOneStock(code);
    const name = POPULAR_STOCKS.find(s => s.symbol === symbol)?.name || symbol;
    return res.json({ symbol, name, ...q });
  } catch (err) {
    if (cached) return res.json(cached);
    return res.status(404).json({ error: '시세 조회 실패: ' + err.message });
  }
});

// ─── 랭킹용 가격맵 ───────────────────────────────────────────────────────────
function getPriceMap() {
  const map = {};
  stocksMemory.forEach(s => { if (s.price != null) map[s.symbol] = s.price; });
  return map;
}

module.exports = { router, crawlAllStocks, getPriceMap };
