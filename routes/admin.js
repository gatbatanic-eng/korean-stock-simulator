const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const { getPriceMap } = require('./stocks');

const INITIAL_CAPITAL = 10000000;

// 선생님 권한 확인 미들웨어
async function teacherOnly(req, res, next) {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ error: '선생님 계정만 접근 가능합니다.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

router.use(authMiddleware);
router.use(teacherOnly);

// ─── 팀 관리 ──────────────────────────────────────────────────────────────────
router.get('/teams', async (req, res) => {
  try {
    const teams = await db.getTeams();
    const users = (await db.getAllUsers()).filter(u => u.role !== 'teacher');
    const teamsWithCount = teams.map(t => ({
      ...t,
      memberCount: users.filter(u => u.team_id === t.id).length
    }));
    res.json(teamsWithCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/teams', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '팀 이름을 입력하세요.' });
  try {
    const result = await db.createTeam(name.trim());
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.delete('/teams/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const ok = await db.deleteTeam(id);
    if (!ok) return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
    res.json({ message: '팀이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ─── 학생 관리 ─────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = (await db.getAllUsers()).filter(u => u.role !== 'teacher');
    const teams = await db.getTeams();
    const priceMap = getPriceMap();
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

    const result = await Promise.all(users.map(async u => {
      const holdings = await db.getHoldings(u.id);
      let stockValue = 0;
      for (const h of holdings) {
        const price = priceMap[h.stock_symbol] ?? h.avg_buy_price;
        stockValue += price * h.quantity;
      }
      const total = u.cash_balance + stockValue;
      const returnRate = ((total - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        team_id: u.team_id,
        team_name: u.team_id ? (teamMap[u.team_id] || '미지정') : '미지정',
        total,
        returnRate,
        created_at: u.created_at,
      };
    }));

    res.json({ users: result, teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.put('/users/:id/team', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { team_id } = req.body;
  const tid = team_id ? parseInt(team_id) : null;

  try {
    if (tid !== null && !await db.findTeamById(tid)) {
      return res.status(400).json({ error: '존재하지 않는 팀입니다.' });
    }
    const ok = await db.updateUserTeam(userId, tid);
    if (!ok) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json({ message: '팀이 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
