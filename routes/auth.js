const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'stock_simulator_secret_key_2024';
const TEACHER_CODE = 'TEACHER2024';

// 회원가입
router.post('/register', async (req, res) => {
  const { username, email, password, team_id, teacher_code } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }
  try {
    if (await db.findUserByUsername(username)) {
      return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    if (await db.findUserByEmail(email)) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    let role = 'student';
    if (teacher_code) {
      if (teacher_code !== TEACHER_CODE) {
        return res.status(400).json({ error: '선생님 코드가 올바르지 않습니다.' });
      }
      role = 'teacher';
    }

    let tid = null;
    if (role === 'student' && team_id) {
      tid = parseInt(team_id);
      if (!await db.findTeamById(tid)) {
        return res.status(400).json({ error: '존재하지 않는 팀입니다.' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = await db.createUser(username, email, password_hash, tid, role);
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username, cash_balance: 10000000, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  try {
    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, cash_balance: user.cash_balance, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 팀 목록 조회 (공개 - 회원가입 시 사용)
router.get('/teams', async (req, res) => {
  try {
    res.json(await db.getTeams());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 내 정보
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const { password_hash, ...safeUser } = user;
    if (!safeUser.nickname) safeUser.nickname = safeUser.username;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 닉네임 변경
router.put('/nickname', require('../middleware/auth'), async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.trim().length < 1) {
    return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  }
  if (nickname.trim().length > 20) {
    return res.status(400).json({ error: '닉네임은 20자 이하여야 합니다.' });
  }
  try {
    const result = await db.updateNickname(req.user.id, nickname.trim());
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
