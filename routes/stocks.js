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
  // ── 추가 KOSPI (시가총액 상위) ───────────────────────────────────────
  { symbol: '005935.KS', name: '삼성전자우' },
  { symbol: '298040.KS', name: '효성중공업' },
  { symbol: '064350.KS', name: '현대로템' },
  { symbol: '047810.KS', name: '한국항공우주' },
  { symbol: '278470.KS', name: '에이피알' },
  { symbol: '039490.KS', name: '키움증권' },
  { symbol: '003230.KS', name: '삼양식품' },
  { symbol: '005387.KS', name: '현대차2우B' },
  { symbol: '443060.KS', name: 'HD현대마린솔루션' },
  { symbol: '090430.KS', name: '아모레퍼시픽' },
  { symbol: '007660.KS', name: '이수페타시스' },
  { symbol: '267270.KS', name: 'HD건설기계' },
  { symbol: '052690.KS', name: '한전기술' },
  { symbol: '175330.KS', name: 'JB금융지주' },
  { symbol: '064400.KS', name: 'LG씨엔에스' },
  { symbol: '138930.KS', name: 'BNK금융지주' },
  { symbol: '005385.KS', name: '현대차우' },
  { symbol: '001440.KS', name: '대한전선' },
  { symbol: '454910.KS', name: '두산로보틱스' },
  { symbol: '088980.KS', name: '맥쿼리인프라' },
  { symbol: '450080.KS', name: '에코프로머티' },
  { symbol: '353200.KS', name: '대덕전자' },
  { symbol: '062040.KS', name: '산일전기' },
  { symbol: '018880.KS', name: '한온시스템' },
  { symbol: '489790.KS', name: '한화비전' },
  { symbol: '082740.KS', name: '한화엔진' },
  { symbol: '000990.KS', name: 'DB하이텍' },
  { symbol: '031210.KS', name: '서울보증보험' },
  { symbol: '111770.KS', name: '영원무역' },
  { symbol: '103590.KS', name: '일진전기' },
  { symbol: '439260.KS', name: '대한조선' },
  { symbol: '001720.KS', name: '신영증권' },
  { symbol: '023530.KS', name: '롯데쇼핑' },
  { symbol: '009970.KS', name: '영원무역홀딩스' },
  { symbol: '085620.KS', name: '미래에셋생명' },
  { symbol: '457190.KS', name: '이수스페셜티케미컬' },
  { symbol: '026960.KS', name: '동서' },
  { symbol: '139130.KS', name: 'iM금융지주' },
  { symbol: '375500.KS', name: 'DL이앤씨' },
  { symbol: '112610.KS', name: '씨에스윈드' },
  { symbol: '028670.KS', name: '팬오션' },
  { symbol: '005850.KS', name: '에스엘' },
  { symbol: '001430.KS', name: '세아베스틸지주' },
  { symbol: '000120.KS', name: 'CJ대한통운' },
  { symbol: '279570.KS', name: '케이뱅크' },
  { symbol: '071970.KS', name: 'HD현대마린엔진' },
  { symbol: '007340.KS', name: 'DN오토모티브' },
  { symbol: '018670.KS', name: 'SK가스' },
  { symbol: '003690.KS', name: '코리안리' },
  { symbol: '336260.KS', name: '두산퓨얼셀' },
  { symbol: '000240.KS', name: '한국앤컴퍼니' },
  // ── 추가 KOSDAQ (시가총액 상위) ──────────────────────────────────────
  { symbol: '000250.KQ', name: '삼천당제약' },
  { symbol: '298380.KQ', name: '에이비엘바이오' },
  { symbol: '950160.KQ', name: '코오롱티슈진' },
  { symbol: '141080.KQ', name: '리가켐바이오' },
  { symbol: '087010.KQ', name: '펩트론' },
  { symbol: '310210.KQ', name: '보로노이' },
  { symbol: '095340.KQ', name: 'ISC' },
  { symbol: '226950.KQ', name: '올릭스' },
  { symbol: '108490.KQ', name: '로보티즈' },
  { symbol: '032820.KQ', name: '우리기술' },
  { symbol: '043260.KQ', name: '성호전자' },
  { symbol: '347850.KQ', name: '디앤디파마텍' },
  { symbol: '476830.KQ', name: '알지노믹스' },
  { symbol: '083650.KQ', name: '비에이치아이' },
  { symbol: '036930.KQ', name: '주성엔지니어링' },
  { symbol: '319400.KQ', name: '현대무벡스' },
  { symbol: '084370.KQ', name: '유진테크' },
  { symbol: '178320.KQ', name: '서진시스템' },
  { symbol: '440110.KQ', name: '파두' },
  { symbol: '058610.KQ', name: '에스피지' },
  { symbol: '218410.KQ', name: 'RFHIC' },
  { symbol: '005290.KQ', name: '동진쎄미켐' },
  { symbol: '347700.KQ', name: '스피어' },
  { symbol: '031980.KQ', name: '피에스케이홀딩스' },
  { symbol: '376900.KQ', name: '로킷헬스케어' },
  { symbol: '039200.KQ', name: '오스코텍' },
  { symbol: '067310.KQ', name: '하나마이크론' },
  { symbol: '222800.KQ', name: '심텍' },
  { symbol: '099320.KQ', name: '쎄트렉아이' },
  { symbol: '475830.KQ', name: '오름테라퓨틱' },
  { symbol: '098460.KQ', name: '고영' },
  { symbol: '101490.KQ', name: '에스앤에스텍' },
  { symbol: '085660.KQ', name: '차바이오텍' },
  { symbol: '491000.KQ', name: '리브스메드' },
  { symbol: '082920.KQ', name: '비츠로셀' },
  { symbol: '038500.KQ', name: '삼표시멘트' },
  { symbol: '323280.KQ', name: '태성' },
  { symbol: '003380.KQ', name: '하림지주' },
  { symbol: '060370.KQ', name: 'LS마린솔루션' },
  { symbol: '065350.KQ', name: '신성델타테크' },
  { symbol: '100790.KQ', name: '미래에셋벤처투자' },
  { symbol: '232140.KQ', name: '와이씨' },
  { symbol: '445680.KQ', name: '큐리옥스바이오시스템즈' },
  { symbol: '437730.KQ', name: '삼현' },
  { symbol: '115180.KQ', name: '큐리언트' },
  { symbol: '082270.KQ', name: '젬백스' },
  { symbol: '010170.KQ', name: '대한광통신' },
  { symbol: '195940.KQ', name: 'HK이노엔' },
  { symbol: '417200.KQ', name: 'LS머트리얼즈' },
  { symbol: '086450.KQ', name: '동국제약' },
  { symbol: '048410.KQ', name: '현대바이오' },
  { symbol: '131290.KQ', name: '티에스이' },
  { symbol: '127120.KQ', name: '제이에스링크' },
  { symbol: '080220.KQ', name: '제주반도체' },
  { symbol: '281740.KQ', name: '레이크머티리얼즈' },
  { symbol: '090710.KQ', name: '휴림로봇' },
  { symbol: '397030.KQ', name: '에이프릴바이오' },
  { symbol: '466100.KQ', name: '클로봇' },
  { symbol: '213420.KQ', name: '덕산네오룩스' },
  { symbol: '166090.KQ', name: '하나머티리얼즈' },
  { symbol: '388210.KQ', name: '씨엠티엑스' },
  { symbol: '174900.KQ', name: '앱클론' },
  { symbol: '183300.KQ', name: '코미코' },
  { symbol: '095610.KQ', name: '테스' },
  { symbol: '456160.KQ', name: '지투지바이오' },
  { symbol: '124500.KQ', name: '아이티센글로벌' },
  { symbol: '027360.KQ', name: '아주IB투자' },
  { symbol: '007390.KQ', name: '네이처셀' },
  { symbol: '160190.KQ', name: '하이젠알앤엠' },
  { symbol: '420770.KQ', name: '기가비스' },
  { symbol: '388720.KQ', name: '유일로보틱스' },
  { symbol: '295310.KQ', name: '에이치브이엠' },
  { symbol: '036540.KQ', name: 'SFA반도체' },
  { symbol: '089970.KQ', name: '브이엠' },
  { symbol: '328130.KQ', name: '루닛' },
  { symbol: '044490.KQ', name: '태웅' },
  { symbol: '476060.KQ', name: '온코닉테라퓨틱스' },
  { symbol: '056190.KQ', name: '에스에프에이' },
  { symbol: '056080.KQ', name: '유진로봇' },
  { symbol: '222080.KQ', name: '씨아이에스' },
  { symbol: '014620.KQ', name: '성광벤드' },
  { symbol: '161580.KQ', name: '필옵틱스' },
  { symbol: '204270.KQ', name: '제이앤티씨' },
  { symbol: '050890.KQ', name: '쏠리드' },
  { symbol: '023160.KQ', name: '태광' },
  { symbol: '032190.KQ', name: '다우데이타' },
  { symbol: '078160.KQ', name: '메디포스트' },
  { symbol: '171090.KQ', name: '선익시스템' },
  { symbol: '348370.KQ', name: '엔켐' },
  { symbol: '006730.KQ', name: '서부T&D' },
  { symbol: '241710.KQ', name: '코스메카코리아' },
  { symbol: '493280.KQ', name: '아이엠바이오로직스' },
  { symbol: '074600.KQ', name: '원익QnC' },
  { symbol: '358570.KQ', name: '지아이이노베이션' },
  { symbol: '036810.KQ', name: '에프에스티' },
  { symbol: '372320.KQ', name: '큐로셀' },
  { symbol: '126340.KQ', name: '비나텍' },
  { symbol: '490470.KQ', name: '세미파이브' },
  { symbol: '052400.KQ', name: '코나아이' },
  { symbol: '084110.KQ', name: '휴온스글로벌' },
  { symbol: '348340.KQ', name: '뉴로메카' },
  { symbol: '121600.KQ', name: '나노신소재' },
  { symbol: '102940.KQ', name: '코오롱생명과학' },
  { symbol: '468530.KQ', name: '프로티나' },
  { symbol: '425420.KQ', name: '티에프이' },
  { symbol: '475960.KQ', name: '토모큐브' },
  { symbol: '033100.KQ', name: '제룡전기' },
  { symbol: '009520.KQ', name: '포스코엠텍' },
  { symbol: '033500.KQ', name: '동성화인텍' },
  { symbol: '365340.KQ', name: '성일하이텍' },
  { symbol: '024850.KQ', name: 'HLB이노베이션' },
  { symbol: '486990.KQ', name: '노타' },
  { symbol: '368770.KQ', name: '파이버프로' },
  { symbol: '356860.KQ', name: '티엘비' },
  { symbol: '102710.KQ', name: '이엔에프테크놀로지' },
  { symbol: '214430.KQ', name: '아이쓰리시스템' },
  { symbol: '015750.KQ', name: '성우하이텍' },
  { symbol: '399720.KQ', name: '가온칩스' },
  { symbol: '348210.KQ', name: '넥스틴' },
  { symbol: '253590.KQ', name: '네오셈' },
  { symbol: '200710.KQ', name: '에이디테크놀로지' },
  { symbol: '094170.KQ', name: '동운아나텍' },
  { symbol: '053800.KQ', name: '안랩' },
  { symbol: '448900.KQ', name: '한국피아이엠' },
  { symbol: '187660.KQ', name: '페니트리움바이오' },
  { symbol: '025980.KQ', name: '아난티' },
  { symbol: '060250.KQ', name: 'NHN KCP' },
  { symbol: '460930.KQ', name: '현대힘스' },
  { symbol: '424870.KQ', name: '이뮨온시아' },
  { symbol: '042000.KQ', name: '카페24' },
  { symbol: '041960.KQ', name: '코미팜' },
  { symbol: '383310.KQ', name: '에코프로에이치엔' },
  { symbol: '287840.KQ', name: '인투셀' },
  { symbol: '458870.KQ', name: '씨어스테크놀로지' },
  { symbol: '053610.KQ', name: '프로텍' },
  { symbol: '278280.KQ', name: '천보' },
  { symbol: '272290.KQ', name: '이녹스첨단소재' },
  { symbol: '389650.KQ', name: '넥스트바이오메디컬' },
  { symbol: '327260.KQ', name: 'RF머트리얼즈' },
  { symbol: '252990.KQ', name: '샘씨엔에스' },
  { symbol: '211050.KQ', name: '인카금융서비스' },
  { symbol: '251970.KQ', name: '펌텍코리아' },
  { symbol: '090360.KQ', name: '로보스타' },
  { symbol: '045100.KQ', name: '한양이엔지' },
  { symbol: '099190.KQ', name: '아이센스' },
  { symbol: '025320.KQ', name: '시노펙스' },
  { symbol: '025900.KQ', name: '동화기업' },
  { symbol: '047920.KQ', name: 'HLB제약' },
  { symbol: '376270.KQ', name: 'HEM파마' },
  { symbol: '046890.KQ', name: '서울반도체' },
  { symbol: '488900.KQ', name: '비츠로넥스텍' },
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

// ─── 시장 지표 (KOSPI·KOSDAQ·달러/원·WTI) ─────────────────────────────────────
let indicatorsCache = null;
const INDICATORS_TTL = 5 * 60 * 1000;

async function fetchNaverIndex(code) {
  for (const url of [
    `https://polling.finance.naver.com/api/realtime/domestic/index/${code}`,
    `https://m.stock.naver.com/api/index/${code}/basic`,
  ]) {
    try {
      const { data } = await axios.get(url, { headers: NAVER_HEADERS, timeout: 8000 });
      const d = data?.datas?.[0] ?? data?.result?.areas?.[0]?.datas?.[0] ?? data;
      const value     = parseNum(d?.closePrice);
      const change    = parseNum(d?.compareToPreviousClosePrice);
      const changePct = parseNum(d?.fluctuationsRatio);
      if (value != null) return { value, change: change ?? 0, changePct: changePct ?? 0 };
    } catch { /* 다음 URL */ }
  }
  return null;
}

async function fetchYahoo(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;
    const value    = meta.regularMarketPrice;
    const prev     = meta.chartPreviousClose ?? 0;
    const change   = prev ? value - prev : 0;
    const changePct = prev ? (change / prev) * 100 : 0;
    return { value, change, changePct };
  } catch { return null; }
}

async function fetchMarketIndicators() {
  if (indicatorsCache && (Date.now() - indicatorsCache.ts) < INDICATORS_TTL) {
    return indicatorsCache.data;
  }
  const [kospi, kosdaq, usdkrw, wti] = await Promise.allSettled([
    fetchNaverIndex('KOSPI'),
    fetchNaverIndex('KOSDAQ'),
    fetchYahoo('USDKRW=X'),
    fetchYahoo('CL=F'),
  ]);
  const result = {
    kospi:     kospi.status  === 'fulfilled' ? kospi.value  : null,
    kosdaq:    kosdaq.status === 'fulfilled' ? kosdaq.value : null,
    usdkrw:    usdkrw.status === 'fulfilled' ? usdkrw.value : null,
    wti:       wti.status    === 'fulfilled' ? wti.value    : null,
    fetchedAt: new Date().toISOString(),
  };
  indicatorsCache = { data: result, ts: Date.now() };
  return result;
}

router.get('/market-indicators', async (req, res) => {
  try {
    const data = await fetchMarketIndicators();
    res.json(data);
  } catch (err) {
    console.error('[market-indicators]', err.message);
    res.status(500).json({ error: '지표 조회 실패' });
  }
});

module.exports = { router, crawlAllStocks, getPriceMap };
