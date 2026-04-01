/**
 * data.json → PostgreSQL 마이그레이션
 * - users 테이블에 이미 데이터가 있으면 자동으로 건너뜀 (중복 실행 안전)
 * - 직접 실행: node migrate.js
 */
const { pool } = require('./database');

// 기존 data.json의 데이터
const SEED_TEAMS = [];

const SEED_USERS = [
  {
    id: 1774859546883,
    username: 'student1',
    email: 'student1@test.com',
    password_hash: '$2a$10$Gea.UuH9zFuUi60NxwjGWeujmcPF/zs9Qr3rcX3Ni.5s/HRdn/oIq',
    nickname: 'student1',
    cash_balance: 10000000,
    team_id: null,
    role: 'student',
    created_at: '2026-03-30T08:32:26.883Z',
  },
  {
    id: 1774859771343,
    username: 'seungeon',
    email: 'zorbaaa333@gmail.com',
    password_hash: '$2a$10$88FWPkSm0f9uZ3SlTLl23.0YLXtEkxBLGlzQQeocPLO3nfK7Yd7sy',
    nickname: 'seungeon',
    cash_balance: 8796150,
    team_id: null,
    role: 'student',
    created_at: '2026-03-30T08:36:11.343Z',
  },
  {
    id: 1775001968539,
    username: 'testteacher',
    email: 't@t.com',
    password_hash: '$2a$10$Fh/lsZNlz7uN59Yfqtxj..n20XpUUSSIawUe3.Gvx5rByvNVLR8um',
    nickname: 'testteacher',
    cash_balance: 10000000,
    team_id: null,
    role: 'teacher',
    created_at: '2026-04-01T00:06:08.539Z',
  },
  {
    id: 1775002019119,
    username: 'teacher1',
    email: 'teacher@test.com',
    password_hash: '$2a$10$NT1WtZtqrQTLYfqUXEIISuuYD6kcLW.ILVz7AKMIVy60nI65C1GuG',
    nickname: 'teacher1',
    cash_balance: 10000000,
    team_id: null,
    role: 'teacher',
    created_at: '2026-04-01T00:06:59.119Z',
  },
  {
    id: 1775002389568,
    username: 'teacher99',
    email: 't99@t.com',
    password_hash: '$2a$10$ScH19pk34X8zrgthOwTZ4O2h9E3bOZFZtC.ZAr0o4AlnAn3LdKgHW',
    nickname: 'teacher99',
    cash_balance: 10000000,
    team_id: null,
    role: 'teacher',
    created_at: '2026-04-01T00:13:09.568Z',
  },
];

const SEED_HOLDINGS = [
  { id: 1774859962997, user_id: 1774859771343, stock_symbol: '051910.KS', stock_name: 'LG화학',    quantity: 1, avg_buy_price: 322000 },
  { id: 1774860075882, user_id: 1774859771343, stock_symbol: '000660.KS', stock_name: 'SK하이닉스', quantity: 1, avg_buy_price: 873000 },
  { id: 1774860085163, user_id: 1774859771343, stock_symbol: '005930.KS', stock_name: '삼성전자',   quantity: 0, avg_buy_price: 176300 },
];

const SEED_TRANSACTIONS = [
  { user_id: 1774859771343, stock_symbol: '051910.KS', stock_name: 'LG화학',    type: 'buy',  quantity: 1, price: 322000, total_amount: 322000, created_at: '2026-03-30T08:39:22.997Z' },
  { user_id: 1774859771343, stock_symbol: '000660.KS', stock_name: 'SK하이닉스', type: 'buy',  quantity: 1, price: 873000, total_amount: 873000, created_at: '2026-03-30T08:41:15.882Z' },
  { user_id: 1774859771343, stock_symbol: '005930.KS', stock_name: '삼성전자',   type: 'buy',  quantity: 1, price: 176300, total_amount: 176300, created_at: '2026-03-30T08:41:25.163Z' },
  { user_id: 1774859771343, stock_symbol: '005930.KS', stock_name: '삼성전자',   type: 'sell', quantity: 1, price: 167450, total_amount: 167450, created_at: '2026-03-31T06:36:58.066Z' },
];

async function runMigration() {
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('[migrate] DB에 이미 데이터 있음 — 건너뜀');
    return;
  }

  console.log('[migrate] 시작: users 5, holdings 3, transactions 4, teams 0');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const t of SEED_TEAMS) {
      await client.query(
        `INSERT INTO teams (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.created_at]
      );
    }

    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, nickname, cash_balance, team_id, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, u.email, u.password_hash, u.nickname, u.cash_balance, u.team_id, u.role, u.created_at]
      );
    }

    for (const h of SEED_HOLDINGS) {
      await client.query(
        `INSERT INTO holdings (id, user_id, stock_symbol, stock_name, quantity, avg_buy_price)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, stock_symbol) DO NOTHING`,
        [h.id, h.user_id, h.stock_symbol, h.stock_name, h.quantity, h.avg_buy_price]
      );
    }

    for (const t of SEED_TRANSACTIONS) {
      await client.query(
        `INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [t.user_id, t.stock_symbol, t.stock_name, t.type, t.quantity, t.price, t.total_amount, t.created_at]
      );
    }

    await client.query('COMMIT');
    console.log('[migrate] ✅ 마이그레이션 완료');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[migrate] ❌ 실패:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { runMigration };

// 직접 실행 시
if (require.main === module) {
  runMigration()
    .then(() => pool.end())
    .catch(err => { console.error(err); process.exit(1); });
}
