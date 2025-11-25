const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/mysql');
const crypto = require('crypto');

const router = express.Router();
const ECPAY_CONFIG = {
  merchantId: process.env.ECPAY_MERCHANT_ID || '3002607',
  hashKey: process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6',
  hashIV: process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs',
  returnURL: process.env.ECPAY_RETURN_URL || 'https://your-server.com/api/ecpay/notify',
  clientBackURL: process.env.ECPAY_CLIENT_BACK_URL || 'http://localhost:3000/success.html',
  gateway: process.env.ECPAY_GATEWAY || 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
};

// JWT 驗證 middleware
function authJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '未授權' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token 無效' });
  }
}

function genECPayCheckMacValue(params, hashKey, hashIV) {
  // 1. 依文件排序、組字串
  const keys = Object.keys(params).sort();
  let raw = `HashKey=${hashKey}`;
  keys.forEach(k => raw += `&${k}=${params[k]}`);
  raw += `&HashIV=${hashIV}`;
  // 2. url encode
  raw = encodeURIComponent(raw).toLowerCase();
  // 3. 特殊字元替換
  raw = raw.replace(/%20/g, '+')
           .replace(/%21/g, '!')
           .replace(/%28/g, '(')
           .replace(/%29/g, ')')
           .replace(/%2a/g, '*');
  // 4. sha256
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

// 綠界金流串接
function getECPayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${hh}:${mm}:${ss}`;
}
router.post('/ecpay', async (req, res) => {
  const { total_price, name } = req.body;
  const params = {
    MerchantID: ECPAY_CONFIG.merchantId,
    MerchantTradeNo: 'Test' + Date.now(),
    MerchantTradeDate: getECPayDate(),
    PaymentType: 'aio',
    TotalAmount: total_price,
    TradeDesc: '多肉植物購物',
    ItemName: name || '多肉植物',
    ReturnURL: ECPAY_CONFIG.returnURL,
    ChoosePayment: 'ALL',
    EncryptType: 1,
    ClientBackURL: ECPAY_CONFIG.clientBackURL
  };
  params.CheckMacValue = genECPayCheckMacValue(params, ECPAY_CONFIG.hashKey, ECPAY_CONFIG.hashIV);
  // 回傳 form 給前端自動送出
  res.send(`
    <form id="ecpay" method="POST" action="${ECPAY_CONFIG.gateway}">
      ${Object.entries(params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('')}
    </form>
    <script>document.getElementById('ecpay').submit();</script>
  `);
});

// 下單（需驗證）
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '未授權' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const { items, total_price, tel, mobile, name, pay_method, ship_method, address, store_type, store_name } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: '訂單內容錯誤' });
    // 建立訂單
    const [orderResult] = await pool.query(
      'INSERT INTO orders (user_id, total_price, tel, mobile, name, pay_method, ship_method, address, store_type, store_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [decoded.id, total_price, tel, mobile, name, pay_method, ship_method, address, store_type, store_name]
    );
    const orderId = orderResult.insertId;
    // 建立訂單明細
    for (const item of items) {
      await pool.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
      // 扣庫存
      await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    // 不再回傳 syspay 參數，信用卡只回傳下單成功
    res.json({ message: '下單成功', order_id: orderId });
  } catch (err) {
    res.status(401).json({ message: 'Token 無效' });
  }
});

// 取得所有訂單（管理員用，含商品明細與客戶資訊）
router.get('/all', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    for (const order of orders) {
      const [items] = await pool.query('SELECT oi.*, p.name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 取得使用者訂單（含商品明細）
router.get('/', authJWT, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: '未登入' });
  // 查詢訂單
  const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  // 查詢每筆訂單的商品
  for (const order of orders) {
    const [items] = await pool.query('SELECT oi.*, p.name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
    order.items = items;
  }
  res.json(orders);
});

// 取消訂單
router.patch('/:id/cancel', authJWT, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: '未登入' });
  const orderId = req.params.id;
  // 僅允許取消自己的訂單，且狀態必須不是已取消
  const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, user.id]);
  if (!orders.length) return res.status(404).json({ message: '訂單不存在' });
  if (orders[0].status === '已取消') return res.status(400).json({ message: '訂單已取消' });
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['已取消', orderId]);
  res.json({ message: '訂單已取消' });
});

// 管理員更改訂單狀態
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  if (!['處理中','已出貨','已取消'].includes(status)) return res.status(400).json({ message: '狀態錯誤' });
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  res.json({ message: '狀態已更新' });
});

// 綠界付款完成通知 (server to server)
router.post('/ecpay/notify', async (req, res) => {
  // 綠界會用 x-www-form-urlencoded 傳送
  const { MerchantTradeNo, RtnCode, TradeNo, PaymentDate, TradeAmt } = req.body;
  // 你可以根據 MerchantTradeNo 找訂單，並更新狀態
  if (RtnCode == 1) { // 付款成功
    // 這裡假設 MerchantTradeNo = 'Test' + orderId
    const orderId = MerchantTradeNo.replace('Test', '');
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['已付款', orderId]);
  }
  // 綠界規定要回傳字串 '1|OK'
  res.send('1|OK');
});

module.exports = router; 