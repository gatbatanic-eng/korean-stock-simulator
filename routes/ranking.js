const express = require('express');
const router = express.Router();
const db = require('../database');
const { getPriceMap } = require('./stocks');

const INITIAL_CAPITAL = 10000000;

async function calcAssets(user, priceMap) {
  const holdings = await db.getHoldings(user.id);
  let stockValue = 0;
  for (const h of holdings) {
    const price = priceMap[h.stock_symbol] ?? h.avg_buy_price;
    stockValue += price * h.quantity;
  }
  const total = user.cash_balance + stockValue;
  const returnRate = ((total - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  return { total, returnRate, stockValue };
}

// 전체 학생 랭킹 (수익률 기준)
router.get('/students', async (req, res) => {
  try {
    const users = (await db.getAllUsers()).filter(u => u.role !== 'teacher');
    const teams = await db.getTeams();
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
    const priceMap = getPriceMap();

    const ranked = (await Promise.all(
      users.map(async u => {
        const { total, returnRate, stockValue } = await calcAssets(u, priceMap);
        return {
          id: u.id,
          username: u.username,
          nickname: u.nickname || u.username,
          team_id: u.team_id,
          team_name: u.team_id ? (teamMap[u.team_id] || '미지정') : '미지정',
          total,
          returnRate,
          cash_balance: u.cash_balance,
          stockValue,
        };
      })
    ))
      .sort((a, b) => b.returnRate - a.returnRate)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 팀 랭킹 (팀원 평균 수익률 기준)
router.get('/teams', async (req, res) => {
  try {
    const users = (await db.getAllUsers()).filter(u => u.role !== 'teacher');
    const teams = await db.getTeams();
    const priceMap = getPriceMap();

    const teamStats = {};
    for (const team of teams) {
      teamStats[team.id] = { id: team.id, name: team.name, members: [], totalAssets: 0, avgReturnRate: 0 };
    }

    for (const u of users) {
      const { total, returnRate } = await calcAssets(u, priceMap);
      const tid = u.team_id;
      if (tid && teamStats[tid]) {
        teamStats[tid].members.push({ username: u.username, total, returnRate });
        teamStats[tid].totalAssets += total;
      }
    }

    const ranked = Object.values(teamStats)
      .map(t => {
        const avg = t.members.length > 0
          ? t.members.reduce((s, m) => s + m.returnRate, 0) / t.members.length
          : 0;
        return { ...t, avgReturnRate: avg, memberCount: t.members.length };
      })
      .sort((a, b) => b.avgReturnRate - a.avgReturnRate)
      .map((t, i) => ({ ...t, rank: i + 1 }));

    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
