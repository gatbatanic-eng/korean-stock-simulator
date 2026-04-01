/**
 * 순수 JavaScript JSON 파일 기반 데이터베이스
 * Visual Studio 없이도 작동합니다.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

const DEFAULT = { users: [], holdings: [], transactions: [], teams: [] };

function load() {
  if (!fs.existsSync(DB_PATH)) return JSON.parse(JSON.stringify(DEFAULT));
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!data.teams) data.teams = [];
    return data;
  }
  catch { return JSON.parse(JSON.stringify(DEFAULT)); }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function atomicWrite(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

const db = {
  // ─── 사용자 ───────────────────────────────────────────────
  createUser(username, email, password_hash, team_id = null, role = 'student') {
    return atomicWrite(data => {
      const id = Date.now();
      data.users.push({
        id, username, email, password_hash,
        nickname: username,
        cash_balance: 10000000,
        team_id,
        role,
        created_at: new Date().toISOString()
      });
      return id;
    });
  },

  updateNickname(userId, nickname) {
    return atomicWrite(data => {
      const user = data.users.find(u => u.id === userId);
      if (!user) return { error: '사용자를 찾을 수 없습니다.' };
      user.nickname = nickname;
      return { nickname };
    });
  },

  findUserByUsername(username) {
    return load().users.find(u => u.username === username) || null;
  },

  findUserByEmail(email) {
    return load().users.find(u => u.email === email) || null;
  },

  findUserById(id) {
    return load().users.find(u => u.id === id) || null;
  },

  getAllUsers() {
    return load().users.map(({ password_hash, ...u }) => u);
  },

  updateUserTeam(userId, teamId) {
    return atomicWrite(data => {
      const user = data.users.find(u => u.id === userId);
      if (!user) return false;
      user.team_id = teamId;
      return true;
    });
  },

  // ─── 팀 ───────────────────────────────────────────────────
  createTeam(name) {
    return atomicWrite(data => {
      if (data.teams.find(t => t.name === name)) return { error: '이미 존재하는 팀 이름입니다.' };
      const id = Date.now();
      data.teams.push({ id, name, created_at: new Date().toISOString() });
      return { id, name };
    });
  },

  getTeams() {
    return load().teams;
  },

  findTeamById(id) {
    return load().teams.find(t => t.id === id) || null;
  },

  deleteTeam(id) {
    return atomicWrite(data => {
      const idx = data.teams.findIndex(t => t.id === id);
      if (idx < 0) return false;
      data.teams.splice(idx, 1);
      data.users.forEach(u => { if (u.team_id === id) u.team_id = null; });
      return true;
    });
  },

  // ─── 보유 종목 ─────────────────────────────────────────────
  getHoldings(user_id) {
    return load().holdings.filter(h => h.user_id === user_id && h.quantity > 0);
  },

  findHolding(user_id, stock_symbol) {
    return load().holdings.find(h => h.user_id === user_id && h.stock_symbol === stock_symbol) || null;
  },

  // ─── 매수 (원자적) ─────────────────────────────────────────
  executeBuy(user_id, symbol, name, quantity, price) {
    return atomicWrite(data => {
      const total = price * quantity;
      const user = data.users.find(u => u.id === user_id);
      if (!user) return { error: '사용자를 찾을 수 없습니다.' };
      if (user.cash_balance < total) {
        return { error: `잔액이 부족합니다. (필요: ${Math.round(total).toLocaleString()}원, 보유: ${Math.round(user.cash_balance).toLocaleString()}원)` };
      }

      user.cash_balance -= total;

      const idx = data.holdings.findIndex(h => h.user_id === user_id && h.stock_symbol === symbol);
      if (idx >= 0) {
        const h = data.holdings[idx];
        const newQty = h.quantity + quantity;
        h.avg_buy_price = (h.avg_buy_price * h.quantity + price * quantity) / newQty;
        h.quantity = newQty;
        h.stock_name = name;
      } else {
        data.holdings.push({ id: Date.now(), user_id, stock_symbol: symbol, stock_name: name, quantity, avg_buy_price: price });
      }

      data.transactions.push({
        id: Date.now() + Math.random(),
        user_id, stock_symbol: symbol, stock_name: name,
        type: 'buy', quantity, price, total_amount: total,
        created_at: new Date().toISOString()
      });

      return { cash_balance: user.cash_balance };
    });
  },

  // ─── 매도 (원자적) ─────────────────────────────────────────
  executeSell(user_id, symbol, name, quantity, price) {
    return atomicWrite(data => {
      const total = price * quantity;
      const user = data.users.find(u => u.id === user_id);
      if (!user) return { error: '사용자를 찾을 수 없습니다.' };

      const hIdx = data.holdings.findIndex(h => h.user_id === user_id && h.stock_symbol === symbol);
      if (hIdx < 0 || data.holdings[hIdx].quantity < quantity) {
        return { error: `보유 수량이 부족합니다. (보유: ${data.holdings[hIdx]?.quantity || 0}주)` };
      }

      user.cash_balance += total;
      const h = data.holdings[hIdx];
      h.quantity -= quantity;

      data.transactions.push({
        id: Date.now() + Math.random(),
        user_id, stock_symbol: symbol, stock_name: name,
        type: 'sell', quantity, price, total_amount: total,
        created_at: new Date().toISOString()
      });

      return { cash_balance: user.cash_balance };
    });
  },

  // ─── 거래 내역 ─────────────────────────────────────────────
  getTransactions(user_id, limit = 100) {
    return load().transactions
      .filter(t => t.user_id === user_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }
};

module.exports = db;
