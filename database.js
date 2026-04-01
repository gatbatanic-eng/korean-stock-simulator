const { Pool } = require('pg');

// bigint를 JS Number로 파싱 (Date.now() 기반 ID는 안전한 정수 범위 내)
const pg = require('pg');
pg.types.setTypeParser(20, val => (val == null ? null : parseInt(val, 10)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id BIGINT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname VARCHAR(100),
      cash_balance BIGINT NOT NULL DEFAULT 10000000,
      team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_symbol VARCHAR(20) NOT NULL,
      stock_name VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      avg_buy_price BIGINT NOT NULL DEFAULT 0,
      UNIQUE(user_id, stock_symbol)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_symbol VARCHAR(20) NOT NULL,
      stock_name VARCHAR(100) NOT NULL,
      type VARCHAR(10) NOT NULL,
      quantity INTEGER NOT NULL,
      price BIGINT NOT NULL,
      total_amount BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[db] PostgreSQL 스키마 초기화 완료');
}

const db = {
  // ─── 사용자 ────────────────────────────────────────────────────────────────
  async createUser(username, email, password_hash, team_id = null, role = 'student') {
    const id = Date.now();
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, nickname, cash_balance, team_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 10000000, $6, $7, NOW())`,
      [id, username, email, password_hash, username, team_id, role]
    );
    return id;
  },

  async updateNickname(userId, nickname) {
    const r = await pool.query(
      'UPDATE users SET nickname = $1 WHERE id = $2 RETURNING nickname',
      [nickname, userId]
    );
    if (r.rowCount === 0) return { error: '사용자를 찾을 수 없습니다.' };
    return { nickname };
  },

  async findUserByUsername(username) {
    const r = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return r.rows[0] || null;
  },

  async findUserByEmail(email) {
    const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows[0] || null;
  },

  async findUserById(id) {
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async getAllUsers() {
    const r = await pool.query(
      'SELECT id, username, email, nickname, cash_balance, team_id, role, created_at FROM users'
    );
    return r.rows;
  },

  async updateUserTeam(userId, teamId) {
    const r = await pool.query(
      'UPDATE users SET team_id = $1 WHERE id = $2',
      [teamId, userId]
    );
    return r.rowCount > 0;
  },

  // ─── 팀 ───────────────────────────────────────────────────────────────────
  async createTeam(name) {
    try {
      const id = Date.now();
      await pool.query(
        'INSERT INTO teams (id, name, created_at) VALUES ($1, $2, NOW())',
        [id, name]
      );
      return { id, name };
    } catch (e) {
      if (e.code === '23505') return { error: '이미 존재하는 팀 이름입니다.' };
      throw e;
    }
  },

  async getTeams() {
    const r = await pool.query('SELECT * FROM teams ORDER BY created_at');
    return r.rows;
  },

  async findTeamById(id) {
    const r = await pool.query('SELECT * FROM teams WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async deleteTeam(id) {
    const r = await pool.query('DELETE FROM teams WHERE id = $1', [id]);
    return r.rowCount > 0;
  },

  // ─── 보유 종목 ─────────────────────────────────────────────────────────────
  async getHoldings(user_id) {
    const r = await pool.query(
      'SELECT * FROM holdings WHERE user_id = $1 AND quantity > 0',
      [user_id]
    );
    return r.rows;
  },

  async findHolding(user_id, stock_symbol) {
    const r = await pool.query(
      'SELECT * FROM holdings WHERE user_id = $1 AND stock_symbol = $2',
      [user_id, stock_symbol]
    );
    return r.rows[0] || null;
  },

  // ─── 매수 (트랜잭션) ───────────────────────────────────────────────────────
  async executeBuy(user_id, symbol, name, quantity, price) {
    const total = price * quantity;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userR = await client.query(
        'SELECT cash_balance FROM users WHERE id = $1 FOR UPDATE',
        [user_id]
      );
      if (userR.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: '사용자를 찾을 수 없습니다.' };
      }

      const cashBalance = userR.rows[0].cash_balance;
      if (cashBalance < total) {
        await client.query('ROLLBACK');
        return {
          error: `잔액이 부족합니다. (필요: ${Math.round(total).toLocaleString()}원, 보유: ${Math.round(cashBalance).toLocaleString()}원)`
        };
      }

      await client.query(
        'UPDATE users SET cash_balance = cash_balance - $1 WHERE id = $2',
        [total, user_id]
      );

      await client.query(
        `INSERT INTO holdings (id, user_id, stock_symbol, stock_name, quantity, avg_buy_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, stock_symbol) DO UPDATE SET
           avg_buy_price = ROUND(
             (holdings.avg_buy_price::NUMERIC * holdings.quantity + EXCLUDED.avg_buy_price::NUMERIC * EXCLUDED.quantity)
             / (holdings.quantity + EXCLUDED.quantity)
           ),
           quantity    = holdings.quantity + EXCLUDED.quantity,
           stock_name  = EXCLUDED.stock_name`,
        [Date.now(), user_id, symbol, name, quantity, price]
      );

      await client.query(
        `INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
         VALUES ($1, $2, $3, 'buy', $4, $5, $6, NOW())`,
        [user_id, symbol, name, quantity, price, total]
      );

      await client.query('COMMIT');

      const newBalR = await pool.query('SELECT cash_balance FROM users WHERE id = $1', [user_id]);
      return { cash_balance: newBalR.rows[0].cash_balance };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // ─── 매도 (트랜잭션) ───────────────────────────────────────────────────────
  async executeSell(user_id, symbol, name, quantity, price) {
    const total = price * quantity;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const holdR = await client.query(
        'SELECT quantity FROM holdings WHERE user_id = $1 AND stock_symbol = $2 FOR UPDATE',
        [user_id, symbol]
      );

      if (holdR.rows.length === 0 || holdR.rows[0].quantity < quantity) {
        await client.query('ROLLBACK');
        return { error: `보유 수량이 부족합니다. (보유: ${holdR.rows[0]?.quantity || 0}주)` };
      }

      await client.query(
        'UPDATE users SET cash_balance = cash_balance + $1 WHERE id = $2',
        [total, user_id]
      );
      await client.query(
        'UPDATE holdings SET quantity = quantity - $1 WHERE user_id = $2 AND stock_symbol = $3',
        [quantity, user_id, symbol]
      );
      await client.query(
        `INSERT INTO transactions (user_id, stock_symbol, stock_name, type, quantity, price, total_amount, created_at)
         VALUES ($1, $2, $3, 'sell', $4, $5, $6, NOW())`,
        [user_id, symbol, name, quantity, price, total]
      );

      await client.query('COMMIT');

      const newBalR = await pool.query('SELECT cash_balance FROM users WHERE id = $1', [user_id]);
      return { cash_balance: newBalR.rows[0].cash_balance };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // ─── 거래 내역 ─────────────────────────────────────────────────────────────
  async getTransactions(user_id, limit = 100) {
    const r = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [user_id, limit]
    );
    return r.rows;
  },
};

module.exports = { ...db, initDb, pool };
