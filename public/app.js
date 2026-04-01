// ─── API 헬퍼 ───────────────────────────────────────────────────────────────
const API = {
  token: null,

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  async post(path, body) {
    const r = await fetch('/api' + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },

  async put(path, body) {
    const r = await fetch('/api' + path, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    return r.json();
  },

  async del(path) {
    const r = await fetch('/api' + path, { method: 'DELETE', headers: this.headers() });
    return r.json();
  },

  async get(path) {
    const r = await fetch('/api' + path, { headers: this.headers() });
    return r.json();
  }
};

// ─── 상태 ────────────────────────────────────────────────────────────────────
let state = {
  user: null,
  currentSymbol: null,
  currentName: null,
  currentPrice: 0,
  tradeType: 'buy',
  holdings: [],
  rankingTab: 'students',
};

// ─── 로컬스토리지 ─────────────────────────────────────────────────────────────
function saveAuth(token, username, cash, role) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  localStorage.setItem('cash', cash);
  localStorage.setItem('role', role || 'student');
}
function loadAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  if (token && username) {
    API.token = token;
    state.user = {
      username,
      cash_balance: parseFloat(localStorage.getItem('cash') || 0),
      role: localStorage.getItem('role') || 'student'
    };
    return true;
  }
  return false;
}
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('cash');
  localStorage.removeItem('role');
  API.token = null;
  state.user = null;
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────
function won(n) {
  return Math.round(n).toLocaleString('ko-KR') + '원';
}
function pct(n) {
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}
function priceClass(v) {
  if (v > 0) return 'rise';
  if (v < 0) return 'fall';
  return 'neutral';
}
function rankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank + '위';
}

let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ─── 인증 ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    if (tab === 'register') loadTeamsForRegister();
  });
});

// 선생님 계정 체크박스
document.getElementById('reg-is-teacher').addEventListener('change', function() {
  const teacherGroup = document.getElementById('teacher-code-group');
  const teamGroup = document.getElementById('team-select-group');
  teacherGroup.classList.toggle('hidden', !this.checked);
  teamGroup.classList.toggle('hidden', this.checked);
});

async function loadTeamsForRegister() {
  const teams = await API.get('/auth/teams');
  const select = document.getElementById('reg-team');
  select.innerHTML = '<option value="">팀 없음</option>';
  if (Array.isArray(teams)) {
    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
  }
}

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const data = await API.post('/auth/login', { username, password });
  if (data.error) {
    errEl.textContent = data.error;
    errEl.classList.remove('hidden');
    return;
  }
  API.token = data.token;
  state.user = { username: data.username, cash_balance: data.cash_balance, role: data.role || 'student' };
  saveAuth(data.token, data.username, data.cash_balance, data.role);
  enterApp();
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const isTeacher = document.getElementById('reg-is-teacher').checked;
  const teacher_code = isTeacher ? document.getElementById('reg-teacher-code').value.trim() : '';
  const team_id = isTeacher ? null : (document.getElementById('reg-team').value || null);
  const errEl = document.getElementById('register-error');
  errEl.classList.add('hidden');

  if (username.length < 3) {
    errEl.textContent = '아이디는 3자 이상이어야 합니다.';
    errEl.classList.remove('hidden');
    return;
  }
  const data = await API.post('/auth/register', { username, email, password, team_id, teacher_code });
  if (data.error) {
    errEl.textContent = data.error;
    errEl.classList.remove('hidden');
    return;
  }
  API.token = data.token;
  state.user = { username: data.username, cash_balance: data.cash_balance, role: data.role || 'student' };
  saveAuth(data.token, data.username, data.cash_balance, data.role);
  enterApp();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearAuth();
  location.reload();
});

// ─── 앱 진입 ─────────────────────────────────────────────────────────────────
function enterApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('navbar').classList.remove('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('nav-username').textContent = state.user.username + ' 님';
  updateNavBalance();

  // 선생님이면 관리자 버튼 표시
  if (state.user.role === 'teacher') {
    document.querySelector('.nav-btn-admin').classList.remove('hidden');
  }

  navigateTo('dashboard');
  loadPopularStocks();
}

function updateNavBalance() {
  document.getElementById('nav-balance').textContent = won(state.user.cash_balance);
}

// ─── 네비게이션 ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');

  if (page === 'dashboard') loadDashboard();
  else if (page === 'history') loadHistory();
  else if (page === 'stocks') loadStocksList();
  else if (page === 'ranking') loadRanking();
  else if (page === 'admin') loadAdminPanel();
}

// ─── 대시보드 ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const [portfolio, user] = await Promise.all([
    API.get('/portfolio'),
    API.get('/auth/me')
  ]);
  if (portfolio.error || user.error) return;

  state.user.cash_balance = user.cash_balance;
  updateNavBalance();
  saveAuth(API.token, state.user.username, user.cash_balance, state.user.role);

  state.holdings = portfolio.holdings;

  let stockValue = 0;
  const holdingsWithPrice = [];

  if (portfolio.holdings.length > 0) {
    const priceResults = await Promise.allSettled(
      portfolio.holdings.map(h => API.get(`/stocks/quote/${encodeURIComponent(h.stock_symbol)}`))
    );
    for (let i = 0; i < portfolio.holdings.length; i++) {
      const h = portfolio.holdings[i];
      const pr = priceResults[i];
      const currentPrice = pr.status === 'fulfilled' && !pr.value.error ? pr.value.price : h.avg_buy_price;
      const eval_ = currentPrice * h.quantity;
      const pnl = eval_ - h.avg_buy_price * h.quantity;
      const pnlPct = (pnl / (h.avg_buy_price * h.quantity)) * 100;
      stockValue += eval_;
      holdingsWithPrice.push({ ...h, currentPrice, eval_, pnl, pnlPct });
    }
  }

  const total = user.cash_balance + stockValue;
  const initCapital = 10000000;
  const totalReturn = ((total - initCapital) / initCapital) * 100;

  document.getElementById('dash-cash').textContent = won(user.cash_balance);
  document.getElementById('dash-stock-value').textContent = won(stockValue);
  document.getElementById('dash-total').textContent = won(total);

  const retEl = document.getElementById('dash-return');
  retEl.textContent = pct(totalReturn);
  retEl.className = 'card-value ' + priceClass(totalReturn);

  renderHoldings(holdingsWithPrice);
}

function renderHoldings(holdings) {
  const container = document.getElementById('holdings-container');
  if (holdings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div>보유 종목이 없습니다. 주식 거래 탭에서 매수해보세요!</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="holdings-table">
      <thead>
        <tr>
          <th>종목</th><th>보유 수량</th><th>평균 단가</th><th>현재가</th><th>평가금액</th><th>손익</th><th>수익률</th>
        </tr>
      </thead>
      <tbody>
        ${holdings.map(h => `
          <tr>
            <td><div class="stock-name-cell"><div class="name">${h.stock_name}</div><div class="symbol">${h.stock_symbol}</div></div></td>
            <td>${h.quantity.toLocaleString()}주</td>
            <td>${Math.round(h.avg_buy_price).toLocaleString()}원</td>
            <td>${Math.round(h.currentPrice).toLocaleString()}원</td>
            <td>${Math.round(h.eval_).toLocaleString()}원</td>
            <td class="${priceClass(h.pnl)}">${h.pnl >= 0 ? '+' : ''}${Math.round(h.pnl).toLocaleString()}원</td>
            <td class="${priceClass(h.pnlPct)}">${pct(h.pnlPct)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

document.getElementById('refresh-portfolio').addEventListener('click', loadDashboard);

// ─── 주식 거래 ────────────────────────────────────────────────────────────────
async function loadPopularStocks() {
  const data = await API.get('/stocks/popular');
  const container = document.getElementById('popular-stocks');
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="loading">인기 종목 조회 실패</div>';
    return;
  }
  container.innerHTML = data.map(s => `
    <div class="popular-item" data-symbol="${s.symbol}" data-name="${s.name}">
      <div class="pop-name">${s.name}</div>
      <div class="pop-price ${priceClass(s.change)}">${s.price ? s.price.toLocaleString() + '원' : '-'}</div>
      <div class="pop-change ${priceClass(s.changePercent)}">${s.changePercent !== undefined ? pct(s.changePercent) : '-'}</div>
    </div>
  `).join('');

  document.querySelectorAll('.popular-item').forEach(item => {
    item.addEventListener('click', () => selectStock(item.dataset.symbol, item.dataset.name));
  });
}

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('stock-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const q = document.getElementById('stock-search-input').value.trim();
  if (!q) return;
  const results = document.getElementById('search-results');
  results.innerHTML = '<div style="padding:12px;color:#888">검색 중...</div>';
  results.classList.remove('hidden');

  const data = await API.get(`/stocks/search?q=${encodeURIComponent(q)}`);
  if (!Array.isArray(data) || data.length === 0) {
    results.innerHTML = '<div style="padding:12px;color:#888">검색 결과가 없습니다.</div>';
    return;
  }
  results.innerHTML = data.map(s => `
    <div class="search-result-item" data-symbol="${s.symbol}" data-name="${s.name}">
      <div><div class="result-name">${s.name}</div></div>
      <div class="result-symbol">${s.symbol}</div>
    </div>
  `).join('');

  results.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      results.classList.add('hidden');
      document.getElementById('stock-search-input').value = '';
      selectStock(item.dataset.symbol, item.dataset.name);
    });
  });
}

async function selectStock(symbol, name) {
  navigateTo('trade');
  const quoteCard = document.getElementById('quote-card');
  quoteCard.classList.remove('hidden');
  document.getElementById('q-name').textContent = name;
  document.getElementById('q-symbol').textContent = symbol;
  document.getElementById('q-price').textContent = '조회 중...';
  document.getElementById('q-change').textContent = '';

  const data = await API.get(`/stocks/quote/${encodeURIComponent(symbol)}`);
  if (data.error) {
    showToast('시세 조회 실패: ' + data.error, 'error');
    return;
  }

  state.currentSymbol = symbol;
  state.currentName = data.name || name;
  state.currentPrice = data.price;

  const priceEl = document.getElementById('q-price');
  priceEl.textContent = data.price.toLocaleString() + '원';
  priceEl.className = 'quote-price ' + priceClass(data.change);

  const changeEl = document.getElementById('q-change');
  const sign = data.change >= 0 ? '+' : '';
  changeEl.textContent = `${sign}${Math.round(data.change).toLocaleString()}원 (${pct(data.changePercent)})`;
  changeEl.className = 'quote-change ' + priceClass(data.change);

  document.getElementById('q-prev').textContent = data.prevClose ? data.prevClose.toLocaleString() + '원' : '-';
  document.getElementById('q-high').textContent = data.high ? data.high.toLocaleString() + '원' : '-';
  document.getElementById('q-low').textContent = data.low ? data.low.toLocaleString() + '원' : '-';
  document.getElementById('q-vol').textContent = data.volume ? data.volume.toLocaleString() + '주' : '-';

  updateTradeTotal();
  updateHoldingInfo();
}

document.querySelectorAll('.trade-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    state.tradeType = btn.dataset.type;
    document.querySelectorAll('.trade-tab').forEach(b => {
      b.classList.remove('active', 'buy-active', 'sell-active');
    });
    btn.classList.add('active', state.tradeType === 'buy' ? 'buy-active' : 'sell-active');

    const submitBtn = document.getElementById('trade-submit-btn');
    submitBtn.textContent = state.tradeType === 'buy' ? '매수하기' : '매도하기';
    submitBtn.className = 'btn-primary btn-full ' + (state.tradeType === 'buy' ? 'btn-buy' : 'btn-sell');

    updateHoldingInfo();
  });
});
document.querySelector('.trade-tab[data-type="buy"]').classList.add('buy-active');

document.querySelectorAll('.qty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById('trade-qty');
    const newVal = Math.max(1, parseInt(input.value || 1) + parseInt(btn.dataset.delta));
    input.value = newVal;
    updateTradeTotal();
  });
});
document.getElementById('trade-qty').addEventListener('input', updateTradeTotal);

function updateTradeTotal() {
  const qty = parseInt(document.getElementById('trade-qty').value) || 0;
  const price = state.currentPrice;
  document.getElementById('trade-price-display').textContent = price ? price.toLocaleString() + '원' : '-';
  document.getElementById('trade-total').textContent = price && qty ? won(price * qty) : '-';
}

function updateHoldingInfo() {
  const h = state.holdings.find(x => x.stock_symbol === state.currentSymbol);
  document.getElementById('trade-holding-qty').textContent = h ? h.quantity + '주' : '0주';
}

document.getElementById('trade-submit-btn').addEventListener('click', async () => {
  const errEl = document.getElementById('trade-error');
  errEl.classList.add('hidden');

  if (!state.currentSymbol) return;
  const qty = parseInt(document.getElementById('trade-qty').value);
  if (!qty || qty <= 0) {
    errEl.textContent = '수량을 입력하세요.';
    errEl.classList.remove('hidden');
    return;
  }

  const quote = await API.get(`/stocks/quote/${encodeURIComponent(state.currentSymbol)}`);
  if (quote.error) {
    errEl.textContent = '시세 조회 실패: ' + quote.error;
    errEl.classList.remove('hidden');
    return;
  }
  const price = quote.price;
  state.currentPrice = price;
  updateTradeTotal();

  const endpoint = state.tradeType === 'buy' ? '/portfolio/buy' : '/portfolio/sell';
  const result = await API.post(endpoint, {
    symbol: state.currentSymbol,
    name: state.currentName,
    quantity: qty,
    price,
  });

  if (result.error) {
    errEl.textContent = result.error;
    errEl.classList.remove('hidden');
    return;
  }

  state.user.cash_balance = result.cash_balance;
  updateNavBalance();
  saveAuth(API.token, state.user.username, result.cash_balance, state.user.role);

  await refreshHoldings();
  updateHoldingInfo();

  document.getElementById('trade-qty').value = 1;
  updateTradeTotal();
  showToast(result.message, 'success');
});

async function refreshHoldings() {
  const data = await API.get('/portfolio');
  if (!data.error) state.holdings = data.holdings;
}

// ─── 거래 내역 ────────────────────────────────────────────────────────────────
async function loadHistory() {
  const container = document.getElementById('transactions-container');
  container.innerHTML = '<div class="loading">로딩 중...</div>';
  const data = await API.get('/portfolio/transactions');
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div>거래 내역이 없습니다.</div></div>`;
    return;
  }
  container.innerHTML = `
    <table class="tx-table">
      <thead><tr><th>일시</th><th>종류</th><th>종목</th><th>수량</th><th>체결가</th><th>거래금액</th></tr></thead>
      <tbody>
        ${data.map(t => `
          <tr>
            <td>${formatDate(t.created_at)}</td>
            <td><span class="badge badge-${t.type}">${t.type === 'buy' ? '매수' : '매도'}</span></td>
            <td><strong>${t.stock_name}</strong><br><small style="color:#888">${t.stock_symbol}</small></td>
            <td>${t.quantity.toLocaleString()}주</td>
            <td>${Math.round(t.price).toLocaleString()}원</td>
            <td>${Math.round(t.total_amount).toLocaleString()}원</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── 종목 목록 ─────────────────────────────────────────────────────────────────
let stocksData = null;
let stocksLastUpdated = null;
let stocksMarket = 'KOSPI';

async function loadStocksList() {
  const container = document.getElementById('stocks-table-container');
  if (!stocksData) {
    container.innerHTML = '<div class="loading">종목 데이터 불러오는 중...</div>';
    const res = await API.get('/stocks/all');
    if (!res || !Array.isArray(res.stocks)) {
      container.innerHTML = '<div class="loading">데이터를 불러오지 못했습니다.</div>';
      return;
    }
    stocksData = res.stocks;
    stocksLastUpdated = res.lastUpdated;
  }
  renderStocksTable();
}

function renderStocksTable() {
  const query = document.getElementById('stocks-search').value.trim().toLowerCase();
  const filtered = stocksData.filter(s => {
    if (s.market !== stocksMarket) return false;
    if (query && !s.name.toLowerCase().includes(query) && !s.symbol.toLowerCase().includes(query)) return false;
    return true;
  });

  const container = document.getElementById('stocks-table-container');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>검색 결과가 없습니다.</p></div>';
    return;
  }

  const rows = filtered.map((s, i) => {
    const code = s.symbol.replace(/\.(KS|KQ)$/, '');
    const priceStr = s.price != null ? s.price.toLocaleString('ko-KR') + '원' : '-';
    const chg = s.change;
    const changeStr = chg != null ? (chg >= 0 ? '+' : '') + Math.round(chg).toLocaleString('ko-KR') + '원' : '-';
    const pctStr = s.changePercent != null ? (s.changePercent >= 0 ? '+' : '') + s.changePercent.toFixed(2) + '%' : '-';
    const cls = chg == null ? 'neutral' : chg > 0 ? 'rise' : chg < 0 ? 'fall' : 'neutral';
    return `<tr class="stock-row" data-symbol="${s.symbol}" data-name="${s.name}">
      <td>${i + 1}</td>
      <td><div class="stock-row-name">${s.name}</div><div class="stock-row-symbol">${code}</div></td>
      <td class="${cls}">${priceStr}</td>
      <td class="${cls}">${changeStr}</td>
      <td class="${cls}">${pctStr}</td>
      <td><button class="btn-primary btn-trade-row">거래</button></td>
    </tr>`;
  }).join('');

  container.innerHTML = `<table class="stocks-table">
    <thead><tr><th>#</th><th>종목명</th><th>현재가</th><th>전일대비</th><th>등락률</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  container.querySelectorAll('.stock-row').forEach(row => {
    row.querySelector('.btn-trade-row').addEventListener('click', e => {
      e.stopPropagation();
      selectStock(row.dataset.symbol, row.dataset.name);
      navigateTo('trade');
    });
    row.addEventListener('click', () => {
      selectStock(row.dataset.symbol, row.dataset.name);
      navigateTo('trade');
    });
  });
}

document.querySelectorAll('.market-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.market-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    stocksMarket = btn.dataset.market;
    if (stocksData) renderStocksTable();
  });
});

document.getElementById('stocks-search').addEventListener('input', () => {
  if (stocksData) renderStocksTable();
});

// ─── 랭킹 ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.ranking-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    state.rankingTab = btn.dataset.rtab;
    document.querySelectorAll('.ranking-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ranking-students').classList.toggle('hidden', state.rankingTab !== 'students');
    document.getElementById('ranking-teams').classList.toggle('hidden', state.rankingTab !== 'teams');
    if (state.rankingTab === 'students') loadStudentRanking();
    else loadTeamRanking();
  });
});

document.getElementById('refresh-ranking').addEventListener('click', loadStudentRanking);
document.getElementById('refresh-team-ranking').addEventListener('click', loadTeamRanking);

async function loadRanking() {
  if (state.rankingTab === 'students') loadStudentRanking();
  else loadTeamRanking();
}

async function loadStudentRanking() {
  const container = document.getElementById('student-ranking-container');
  container.innerHTML = '<div class="loading">조회 중...</div>';
  const data = await API.get('/ranking/students');
  if (!Array.isArray(data)) {
    container.innerHTML = '<div class="loading">랭킹 조회 실패</div>';
    return;
  }
  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div>아직 등록된 학생이 없습니다.</div></div>';
    return;
  }
  const myName = state.user.username;
  container.innerHTML = `
    <table class="ranking-table">
      <thead><tr><th>순위</th><th>닉네임</th><th>팀</th><th>총 자산</th><th>수익률</th></tr></thead>
      <tbody>
        ${data.map(u => `
          <tr class="${u.username === myName ? 'my-row' : ''}">
            <td class="rank-cell">${rankMedal(u.rank)}</td>
            <td><strong>${u.username}</strong>${u.username === myName ? ' <span class="me-badge">나</span>' : ''}</td>
            <td>${u.team_name}</td>
            <td>${won(u.total)}</td>
            <td class="${priceClass(u.returnRate)}">${pct(u.returnRate)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

async function loadTeamRanking() {
  const container = document.getElementById('team-ranking-container');
  container.innerHTML = '<div class="loading">조회 중...</div>';
  const data = await API.get('/ranking/teams');
  if (!Array.isArray(data)) {
    container.innerHTML = '<div class="loading">팀 랭킹 조회 실패</div>';
    return;
  }
  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏫</div><div>아직 등록된 팀이 없습니다.</div></div>';
    return;
  }
  container.innerHTML = `
    <table class="ranking-table">
      <thead><tr><th>순위</th><th>팀명</th><th>인원</th><th>평균 수익률</th><th>팀원</th></tr></thead>
      <tbody>
        ${data.map(t => `
          <tr>
            <td class="rank-cell">${rankMedal(t.rank)}</td>
            <td><strong>${t.name}</strong></td>
            <td>${t.memberCount}명</td>
            <td class="${priceClass(t.avgReturnRate)}">${pct(t.avgReturnRate)}</td>
            <td style="font-size:0.85em;color:#666">${t.members.map(m => m.username).join(', ') || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ─── 관리자 패널 (선생님 전용) ────────────────────────────────────────────────
let adminTeams = [];

async function loadAdminPanel() {
  if (state.user.role !== 'teacher') {
    navigateTo('dashboard');
    return;
  }
  await Promise.all([loadAdminTeams(), loadAdminUsers()]);
}

async function loadAdminTeams() {
  const data = await API.get('/admin/teams');
  const container = document.getElementById('admin-teams-container');
  if (!Array.isArray(data)) {
    container.innerHTML = '<div class="loading">조회 실패</div>';
    return;
  }
  adminTeams = data;
  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px">아직 팀이 없습니다. 위에서 팀을 만들어보세요.</div>';
    return;
  }
  container.innerHTML = `
    <table class="holdings-table">
      <thead><tr><th>팀명</th><th>인원</th><th>생성일</th><th></th></tr></thead>
      <tbody>
        ${data.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.memberCount}명</td>
            <td style="font-size:0.85em;color:#888">${formatDate(t.created_at)}</td>
            <td><button class="btn-danger btn-sm" data-team-id="${t.id}" data-team-name="${t.name}">삭제</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tid = parseInt(btn.dataset.teamId);
      const name = btn.dataset.teamName;
      if (!confirm(`"${name}" 팀을 삭제하시겠습니까? 소속 학생들의 팀이 해제됩니다.`)) return;
      const result = await API.del(`/admin/teams/${tid}`);
      if (result.error) { showToast(result.error, 'error'); return; }
      showToast('팀이 삭제되었습니다.', 'success');
      await Promise.all([loadAdminTeams(), loadAdminUsers()]);
    });
  });
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-container');
  const data = await API.get('/admin/users');
  if (!data || !Array.isArray(data.users)) {
    container.innerHTML = '<div class="loading">조회 실패</div>';
    return;
  }
  const { users, teams } = data;
  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px">등록된 학생이 없습니다.</div>';
    return;
  }
  const teamOptions = ['<option value="">팀 없음</option>',
    ...teams.map(t => `<option value="${t.id}">${t.name}</option>`)
  ].join('');

  container.innerHTML = `
    <table class="holdings-table">
      <thead><tr><th>닉네임</th><th>이메일</th><th>현재 팀</th><th>총 자산</th><th>수익률</th><th>팀 변경</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td><strong>${u.username}</strong></td>
            <td style="font-size:0.85em;color:#888">${u.email}</td>
            <td>${u.team_name}</td>
            <td>${won(u.total)}</td>
            <td class="${priceClass(u.returnRate)}">${pct(u.returnRate)}</td>
            <td>
              <select class="team-change-select" data-user-id="${u.id}">
                ${teamOptions.replace(`value="${u.team_id || ''}"`, `value="${u.team_id || ''}" selected`)}
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  container.querySelectorAll('.team-change-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const userId = parseInt(sel.dataset.userId);
      const team_id = sel.value || null;
      const result = await API.put(`/admin/users/${userId}/team`, { team_id });
      if (result.error) { showToast(result.error, 'error'); return; }
      showToast('팀이 변경되었습니다.', 'success');
      loadAdminUsers();
    });
  });
}

document.getElementById('create-team-btn').addEventListener('click', async () => {
  const input = document.getElementById('new-team-name');
  const name = input.value.trim();
  if (!name) { showToast('팀 이름을 입력하세요.', 'error'); return; }
  const result = await API.post('/admin/teams', { name });
  if (result.error) { showToast(result.error, 'error'); return; }
  input.value = '';
  showToast(`"${name}" 팀이 생성되었습니다.`, 'success');
  await Promise.all([loadAdminTeams(), loadAdminUsers()]);
});

document.getElementById('refresh-admin').addEventListener('click', () => {
  loadAdminTeams();
  loadAdminUsers();
});

// ─── 초기화 ───────────────────────────────────────────────────────────────────
if (loadAuth()) {
  enterApp();
  refreshHoldings();
}
