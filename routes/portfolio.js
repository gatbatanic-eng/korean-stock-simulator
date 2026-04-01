const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 포트폴리오 조회
router.get('/', async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const holdings = await db.getHoldings(req.user.id);
    res.json({ cash_balance: user.cash_balance, holdings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 거래 내역
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await db.getTransactions(req.user.id);
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 매수
router.post('/buy', async (req, res) => {
  const { symbol, name, quantity, price } = req.body;
  if (!symbol || !name || !quantity || !price || quantity <= 0 || price <= 0) {
    return res.status(400).json({ error: '올바른 값을 입력하세요.' });
  }
  try {
    const result = await db.executeBuy(req.user.id, symbol, name, Math.floor(quantity), price);
    if (result.error) return res.status(400).json(result);
    res.json({ message: `${name} ${quantity}주를 매수했습니다.`, cash_balance: result.cash_balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 매도
router.post('/sell', async (req, res) => {
  const { symbol, name, quantity, price } = req.body;
  if (!symbol || !name || !quantity || !price || quantity <= 0 || price <= 0) {
    return res.status(400).json({ error: '올바른 값을 입력하세요.' });
  }
  try {
    const result = await db.executeSell(req.user.id, symbol, name, Math.floor(quantity), price);
    if (result.error) return res.status(400).json(result);
    res.json({ message: `${name} ${quantity}주를 매도했습니다.`, cash_balance: result.cash_balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
