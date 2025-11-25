const express = require('express');
const pool = require('../db/mysql');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// --- 輪播圖 CRUD ---
router.get('/carousel', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM carousel_images ORDER BY sort_order, id');
  res.json(rows);
});
router.post('/carousel', async (req, res) => {
  const { image_url, sort_order } = req.body;
  await pool.query('INSERT INTO carousel_images (image_url, sort_order) VALUES (?, ?)', [image_url, sort_order || 0]);
  res.json({ message: '新增成功' });
});
router.put('/carousel/:id', async (req, res) => {
  const { image_url, sort_order } = req.body;
  await pool.query('UPDATE carousel_images SET image_url=?, sort_order=? WHERE id=?', [image_url, sort_order || 0, req.params.id]);
  res.json({ message: '更新成功' });
});
router.delete('/carousel/:id', async (req, res) => {
  // 查出圖片路徑
  const [rows] = await pool.query('SELECT image_url FROM carousel_images WHERE id=?', [req.params.id]);
  if (rows.length) {
    const filePath = path.join(__dirname, '../../public', rows[0].image_url);
    fs.unlink(filePath, () => {}); // 忽略錯誤
  }
  await pool.query('DELETE FROM carousel_images WHERE id=?', [req.params.id]);
  res.json({ message: '刪除成功' });
});

// --- 關於我們 CRUD（單一內容）---
router.get('/about', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM about_content WHERE id=1');
  res.json(rows[0] || { content: '' });
});
router.post('/about', async (req, res) => {
  const { content } = req.body;
  await pool.query('INSERT INTO about_content (id, content) VALUES (1, ?) ON DUPLICATE KEY UPDATE content=?', [content, content]);
  res.json({ message: '儲存成功' });
});

// --- 關於我們多段內容（部落格） CRUD ---
router.get('/about/posts', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM about_posts ORDER BY created_at DESC');
  res.json(rows);
});
router.post('/about/posts', async (req, res) => {
  const { title, content, image_url } = req.body;
  await pool.query('INSERT INTO about_posts (title, content, image_url) VALUES (?, ?, ?)', [title, content, image_url]);
  res.json({ message: '新增成功' });
});
router.put('/about/posts/:id', async (req, res) => {
  const { title, content, image_url } = req.body;
  await pool.query('UPDATE about_posts SET title=?, content=?, image_url=? WHERE id=?', [title, content, image_url, req.params.id]);
  res.json({ message: '更新成功' });
});
router.delete('/about/posts/:id', async (req, res) => {
  // 查出圖片路徑
  const [rows] = await pool.query('SELECT image_url FROM about_posts WHERE id=?', [req.params.id]);
  if (rows.length && rows[0].image_url) {
    const filePath = path.join(__dirname, '../../public', rows[0].image_url);
    fs.unlink(filePath, () => {});
  }
  await pool.query('DELETE FROM about_posts WHERE id=?', [req.params.id]);
  res.json({ message: '刪除成功' });
});

// --- 照顧須知部落格 CRUD ---
router.get('/care', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM care_posts ORDER BY created_at DESC');
  res.json(rows);
});
router.post('/care', async (req, res) => {
  const { title, content } = req.body;
  await pool.query('INSERT INTO care_posts (title, content) VALUES (?, ?)', [title, content]);
  res.json({ message: '新增成功' });
});
router.put('/care/:id', async (req, res) => {
  const { title, content } = req.body;
  await pool.query('UPDATE care_posts SET title=?, content=? WHERE id=?', [title, content, req.params.id]);
  res.json({ message: '更新成功' });
});
router.delete('/care/:id', async (req, res) => {
  await pool.query('DELETE FROM care_posts WHERE id=?', [req.params.id]);
  res.json({ message: '刪除成功' });
});

module.exports = router; 