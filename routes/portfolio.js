const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 포트폴리오 조회
router.get('/', (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const holdings = db.getHoldings(req.user.id);
  res.json({ cash_balance: user.cash_balance, holdings });
});

// 거래 내역
router.get('/transactions', (req, res) => {
  const transactions = db.getTransactions(req.user.id);
  res.json(transactions);
});

// 매수
router.post('/buy', (req, res) => {
  const { symbol, name, quantity, price } = req.body;
  if (!symbol || !name || !quantity || !price || quantity <= 0 || price <= 0) {
    return res.status(400).json({ error: '올바른 값을 입력하세요.' });
  }
  const result = db.executeBuy(req.user.id, symbol, name, Math.floor(quantity), price);
  if (result.error) return res.status(400).json(result);
  res.json({ message: `${name} ${quantity}주를 매수했습니다.`, cash_balance: result.cash_balance });
});

// 매도
router.post('/sell', (req, res) => {
  const { symbol, name, quantity, price } = req.body;
  if (!symbol || !name || !quantity || !price || quantity <= 0 || price <= 0) {
    return res.status(400).json({ error: '올바른 값을 입력하세요.' });
  }
  const result = db.executeSell(req.user.id, symbol, name, Math.floor(quantity), price);
  if (result.error) return res.status(400).json(result);
  res.json({ message: `${name} ${quantity}주를 매도했습니다.`, cash_balance: result.cash_balance });
});

module.exports = router;
