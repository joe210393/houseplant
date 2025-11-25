const express = require('express');
const cors = require('cors');
require('dotenv').config();

const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const uploadRouter = require('./routes/upload');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const pool = require('./db/mysql');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 讓前端靜態檔案可由 http://localhost:3000/ 直接存取
app.use(express.static('frontend'));
app.use('/uploads', express.static('public/uploads'));

app.use(session({ secret: process.env.SESSION_SECRET || 'succulent_secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // TODO: 查/建 user，產生 JWT
  done(null, profile);
}));

// Facebook OAuth
passport.use(new FacebookStrategy({
  clientID: process.env.FB_APP_ID || 'FB_APP_ID',
  clientSecret: process.env.FB_APP_SECRET || 'FB_APP_SECRET',
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
  // TODO: 查/建 user，產生 JWT
  done(null, profile);
}));

// Google 登入
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), async (req, res) => {
  const profile = req.user;
  const email = profile.emails[0].value;
  const username = profile.displayName || email.split('@')[0];
  // 查有沒有這個 user
  let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  let user;
  if (users.length === 0) {
    // 沒有就自動註冊
    const [result] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, '']);
    user = { id: result.insertId, username, email };
  } else {
    user = users[0];
  }
  // 產生 JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.username === 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  // 導回前端，帶 token
  res.redirect(`/login.html?token=${token}&username=${encodeURIComponent(user.username)}`);
});

// Facebook 登入
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login.html' }), (req, res) => {
  // TODO: 產生 JWT，導回前端
  res.redirect('/login.html?oauth=facebook');
});

app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/upload', uploadRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 