const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      cash_balance INTEGER NOT NULL DEFAULT 10000000,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_symbol TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      avg_buy_price INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, stock_symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_symbol TEXT NOT NULL,
      stock_name TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('[db] SQLite 스키마 초기화 완료');
}

// ─── 사용자 ────────────────────────────────────────────────────────────────
function createUser(username, email, password_hash, team_id = null, role = 'student') {
  const id = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, nickname, cash_balance, team_id, role, created_at)
     VALUES (?, ?, ?, ?, ?, 10000000, ?, ?, datetime('now'))`
  ).run(id, username, email, password_hash, username, team_id, role);
  return id;
}

function updateNickname(userId, nickname) {
  const r = db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, userId);
  if (r.changes === 0) return { error: '사용자를 찾을 수 없습니다.' };
  return { nickname };
}

function resetPassword(userId, passwordHash) {
  const r = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
  return r.changes > 0;
}

function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function getAllUsers() {
  return db.prepare(
    'SELECT id, username, email, nickname, cash_balance, team_id, role, created_at FROM users'
  ).all();
}

function updateUserTeam(userId, teamId) {
  const r = db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(teamId, userId);
  return r.changes > 0;
}

// ─── 팀 ───────────────────────────────────────────────────────────────────
function createTeam(name) {
  try {
    const id = Date.now();
    db.prepare(`INSERT INTO teams (id, name, created_at) VALUES (?, ?, datetime('now'))`).run(id, name);
    return { id, name };
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return { error: '이미 존재하는 팀 이름입니다.' };
    throw e;
  }
}

function getTeams() {
  return db.prepare('SELECT * FROM teams ORDER BY created_at').all();
}

function findTeamById(id) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id) || null;
}

function deleteTeam(id) {
  const r = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return r.changes > 0;
}

// ─── 보유 종목 ─────────────────────────────────────────────────────────────
function getHoldings(user_id) {
  return db.prepare('SELECT * FROM holdings WHERE user_id = ? AND quantity > 0').all(user_id);
}

function findHolding(user_id, stock_symbol) {
  return db.prepare(
    'SELECT * FROM holdings WHERE user_id = ? AND stock_symbol = ?'
  ).get(user_id, stock_symbol) || null;
}

// ─── 매수 (트랜잭션) ───────────────────────────────────────────────────────
function executeBuy(user_id, symbol, name, quantity, price) {
  const total = price * quantity;
  const run = db.transaction(() => {
    const user = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(user_id);
    if (!user) return { error: '사용자를 찾을 수 없습니다.' };
    if (user.cash_balance < total) {
      return {
        error: `잔액이 부족합니다. (필요: ${Math.round(total).toLocaleString()}원, 보유: ${Math.round(user.cash_balance).toLocaleString()}원)`
      };
    }

    db.prepare('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?').run(total, user_id);

    db.prepare(`
      INSERT INTO holdings (id, user_id, stock_symbol, stock_name, quantity, avg_buy_price)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, stock_symbol) DO UPDATE SET
        avg_buy_price = ROUND(
          (holdings.avg_buy_price * holdings.quantity + excluded.avg_buy_price * excluded.quantity)
          / CAST(holdings.quantity + excluded.quantity AS REAL)
        ),
        quantity   = holdings.quantity + excluded.quantity,
        stock_name = excluded.stock_name
    `).run(Date.now(), user_id, symbol, name, quantity, price);

    db.prepare(`
      INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
      VALUES (?, ?, ?, 'buy', ?, ?, ?, datetime('now'))
    `).run(user_id, symbol, name, quantity, price, total);

    const updated = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(user_id);
    return { cash_balance: updated.cash_balance };
  });
  return run();
}

// ─── 매도 (트랜잭션) ───────────────────────────────────────────────────────
function executeSell(user_id, symbol, name, quantity, price) {
  const total = price * quantity;
  const run = db.transaction(() => {
    const holding = db.prepare(
      'SELECT quantity FROM holdings WHERE user_id = ? AND stock_symbol = ?'
    ).get(user_id, symbol);

    if (!holding || holding.quantity < quantity) {
      return { error: `보유 수량이 부족합니다. (보유: ${holding?.quantity || 0}주)` };
    }

    db.prepare('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?').run(total, user_id);
    db.prepare(
      'UPDATE holdings SET quantity = quantity - ? WHERE user_id = ? AND stock_symbol = ?'
    ).run(quantity, user_id, symbol);
    db.prepare(`
      INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
      VALUES (?, ?, ?, 'sell', ?, ?, ?, datetime('now'))
    `).run(user_id, symbol, name, quantity, price, total);

    const updated = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(user_id);
    return { cash_balance: updated.cash_balance };
  });
  return run();
}

// ─── 거래 내역 ─────────────────────────────────────────────────────────────
function getTransactions(user_id, limit = 100) {
  return db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(user_id, limit);
}

module.exports = {
  createUser,
  updateNickname,
  resetPassword,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUserTeam,
  createTeam,
  getTeams,
  findTeamById,
  deleteTeam,
  getHoldings,
  findHolding,
  executeBuy,
  executeSell,
  getTransactions,
  initDb,
  db,
};
