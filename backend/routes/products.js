const express = require('express');
const pool = require('../db/mysql');

const router = express.Router();

// 查詢所有分類
router.get('/categories', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY id');
  res.json(rows);
});
// 新增分類
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
  res.json({ message: '新增成功' });
});
// 刪除分類
router.delete('/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id=?', [req.params.id]);
  res.json({ message: '刪除成功' });
});
// 查詢商品（可依分類）
router.get('/', async (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM products';
  let params = [];
  if (category && category !== '全部') {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  const [products] = await pool.query(sql, params);
  res.json(products);
});

// 依分類查詢
router.get('/category/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE category = ?', [category]);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 取得單一商品
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (product.length === 0) return res.status(404).json({ message: '找不到商品' });
    res.json(product[0]);
  } catch (err) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 新增商品
router.post('/', async (req, res) => {
  const { name, description, price, category, image_url, stock, status } = req.body;
  await pool.query('INSERT INTO products (name, description, price, category, image_url, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, description, price, category, image_url, stock, status || '上架']);
  res.json({ message: '新增成功' });
});
// 編輯商品
router.put('/:id', async (req, res) => {
  const { name, description, price, category, image_url, stock, status } = req.body;
  await pool.query('UPDATE products SET name=?, description=?, price=?, category=?, image_url=?, stock=?, status=? WHERE id=?', [name, description, price, category, image_url, stock, status, req.params.id]);
  res.json({ message: '更新成功' });
});
// 刪除商品
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ message: '刪除成功' });
});
// 上架/下架
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE products SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: '狀態已更新' });
});

module.exports = router; 