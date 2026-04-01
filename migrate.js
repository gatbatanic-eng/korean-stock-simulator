/**
 * data.json → PostgreSQL 마이그레이션 스크립트
 * 실행: node migrate.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pg = require('pg');

pg.types.setTypeParser(20, val => (val == null ? null : parseInt(val, 10)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('[migrate] data.json 없음 — 건너뜀');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const users = data.users || [];
  const holdings = data.holdings || [];
  const transactions = data.transactions || [];
  const teams = data.teams || [];

  console.log(`[migrate] users: ${users.length}, holdings: ${holdings.length}, transactions: ${transactions.length}, teams: ${teams.length}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 팀
    for (const t of teams) {
      await client.query(
        `INSERT INTO teams (id, name, created_at) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.created_at || new Date().toISOString()]
      );
    }
    console.log(`[migrate] teams 완료`);

    // 사용자 (role 필드가 없으면 username으로 추론)
    for (const u of users) {
      const role = u.role || (u.username.toLowerCase().includes('teacher') ? 'teacher' : 'student');
      const nickname = u.nickname || u.username;
      const team_id = u.team_id || null;
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, nickname, cash_balance, team_id, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, u.email, u.password_hash, nickname, u.cash_balance, team_id, role, u.created_at]
      );
    }
    console.log(`[migrate] users 완료`);

    // 보유 종목
    for (const h of holdings) {
      await client.query(
        `INSERT INTO holdings (id, user_id, stock_symbol, stock_name, quantity, avg_buy_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, stock_symbol) DO NOTHING`,
        [h.id, h.user_id, h.stock_symbol, h.stock_name, h.quantity, h.avg_buy_price]
      );
    }
    console.log(`[migrate] holdings 완료`);

    // 거래 내역 (id가 float일 수 있어 BIGSERIAL 시퀀스 사용)
    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [t.user_id, t.stock_symbol, t.stock_name, t.type, t.quantity, t.price, t.total_amount, t.created_at]
      );
    }
    console.log(`[migrate] transactions 완료`);

    await client.query('COMMIT');
    console.log('[migrate] ✅ 마이그레이션 완료');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[migrate] ❌ 실패:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
