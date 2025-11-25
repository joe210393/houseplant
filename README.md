# 多肉植物商店 Succulent Shop

## 安裝與啟動

1. 安裝依賴

```bash
npm install
```

2. 設定 .env

請編輯 `succulent-shop/.env`，填入你的 MySQL、JWT、OAuth 與綠界參數：

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=你的帳號
DB_PASSWORD=你的密碼
DB_NAME=succulent_shop
JWT_SECRET=自訂密鑰
SESSION_SECRET=任意字串
GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
GOOGLE_CLIENT_SECRET=你的 Google OAuth Client Secret
FB_APP_ID=你的 Facebook App ID
FB_APP_SECRET=你的 Facebook App Secret
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
ECPAY_HASH_IV=EkRm7iFT261dpevs
ECPAY_RETURN_URL=https://your-domain.com/api/orders/ecpay/notify
ECPAY_CLIENT_BACK_URL=https://your-domain.com/success.html
ECPAY_GATEWAY=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
```

3. 初始化資料庫

- **方式一：直接使用 MySQL CLI**
  ```bash
  mysql -u 你的帳號 -p -e "CREATE DATABASE IF NOT EXISTS succulent_shop;"
  mysql -u 你的帳號 -p succulent_shop < database/schema.sql
  ```
- **方式二：使用專案提供的 migrate 指令（會讀取 .env 參數）**
  ```bash
  npm run migrate
  ```

4. 啟動伺服器

```bash
npm run dev
# 或
npm start
```

5. 前端存取

啟動後可用 `http://localhost:3000/index.html` 直接瀏覽整個網站。

> 若要讓前端 AJAX 能連線，請確保後端在 http://localhost:3000 運作，或在雲端部署時保持同一個網域。

---

## 部署到 Zeabur

1. 將此專案推到 GitHub（例如 `houseplant`）。
2. 在 Zeabur 新增專案並連結該 GitHub Repository。
3. Build Command：`npm install`
4. Start Command：`npm start`
5. 設定環境變數：`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FB_APP_ID`, `FB_APP_SECRET`, `ECPAY_MERCHANT_ID`, `ECPAY_HASH_KEY`, `ECPAY_HASH_IV`, `ECPAY_RETURN_URL`, `ECPAY_CLIENT_BACK_URL`, `ECPAY_GATEWAY`。
6. 將 `ECPAY_CLIENT_BACK_URL` 設為 `https://<你的域名>/success.html`，`ECPAY_RETURN_URL` 設為 `https://<你的域名>/api/orders/ecpay/notify`，付款完成即可回到網站並顯示「付款完成」畫面。
7. 匯入資料庫：在本機執行
   ```bash
   DB_HOST=hkg1.clusters.zeabur.com \
   DB_PORT=31500 \
   DB_USER=root \
   DB_PASSWORD=你的密碼 \
   DB_NAME=zeabur \
   npm run migrate
   ```
   （以上參數請改成 Zeabur MySQL 提供的實際值）

---

## 目錄結構

- backend/ Node.js + Express API
- frontend/ 靜態網頁
- database/schema.sql MySQL 資料表

---

## 功能

- 註冊、登入、登出
- 商品瀏覽、分類
- 購物車、結帳
- 訂單查詢

---

## 管理員功能（可擴充）
- 新增/編輯/刪除商品
- 查看所有訂單 