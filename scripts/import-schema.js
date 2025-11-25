const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const {
    DB_HOST,
    DB_PORT = 3306,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('請先設定 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME 環境變數');
  }

  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((stmt) => stmt.trim())
    .filter(Boolean)
    .filter((stmt) => !/^--/.test(stmt));

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: false,
  });

  console.log(`連線成功，開始匯入 ${statements.length} 筆 SQL...`);
  let executed = 0;
  for (const stmt of statements) {
    if (/^CREATE DATABASE/i.test(stmt) || /^USE /i.test(stmt)) {
      console.log(`Skip: ${stmt.split('\n')[0]}`);
      continue;
    }
    await connection.query(stmt);
    executed += 1;
  }
  await connection.end();
  console.log(`匯入完成，共執行 ${executed} 筆 SQL。`);
}

main().catch((err) => {
  console.error('匯入失敗：', err.message);
  process.exit(1);
});

