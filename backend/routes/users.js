const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/mysql');

const router = express.Router();

// 註冊
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: '缺少欄位' });
  try {
    const [user] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (user.length > 0) return res.status(409).json({ message: '帳號或信箱已存在' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash]);
    res.json({ message: '註冊成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: '缺少欄位' });
  try {
    // 支援 email 或 username 登入
    const [user] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
    if (user.length === 0) return res.status(401).json({ message: '帳號不存在' });
    const valid = await bcrypt.compare(password, user[0].password);
    if (!valid) return res.status(401).json({ message: '密碼錯誤' });
    // 判斷是否 admin
    const isAdmin = (user[0].username === 'admin' && (user[0].email === 'admin' || user[0].username === 'admin'));
    const token = jwt.sign(
      { id: user[0].id, username: user[0].username, isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, username: user[0].username, isAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 取得使用者訂單（需驗證）
router.get('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '未授權' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ?', [decoded.id]);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token 無效' });
  }
});

module.exports = router; 