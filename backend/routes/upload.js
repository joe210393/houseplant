const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, basename + '-' + unique + ext);
  }
});

const upload = multer({ storage });

// 多檔上傳
router.post('/', upload.array('images', 10), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ message: '未選擇檔案' });
  const urls = req.files.map(f => '/uploads/' + f.filename);
  res.json({ urls });
});

// 單檔上傳（相容舊用法）
router.post('/single', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '未選擇檔案' });
  const url = '/uploads/' + req.file.filename;
  res.json({ url });
});

// 刪除檔案
router.delete('/', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: '缺少 url' });
  const filePath = path.join(__dirname, '../../public', url);
  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ message: '檔案刪除失敗' });
    res.json({ message: '檔案已刪除' });
  });
});

module.exports = router; 