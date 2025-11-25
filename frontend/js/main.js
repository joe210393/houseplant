// Google/Facebook OAuth callback 自動登入
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) {
    localStorage.setItem('token', params.get('token'));
    localStorage.setItem('username', params.get('username'));
    window.location.href = 'index.html';
  }
})();
// API base URL
const API = '/api';

// 動態載入 header
fetch('header.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('site-header').innerHTML = html;
    updateAuthLinks(); // 重新綁定登入/登出顯示
  });

// --- 登入/登出狀態切換 ---
function updateAuthLinks() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const userInfo = document.getElementById('user-info');
  const adminLink = document.getElementById('admin-link');
  const userGear = document.getElementById('user-gear');
  if (loginLink && logoutLink) {
    if (token) {
      loginLink.style.display = 'none';
      if (document.getElementById('register-link')) document.getElementById('register-link').style.display = 'none';
      logoutLink.style.display = '';
      if (userInfo && username) {
        userInfo.textContent = `您好，${username}`;
      }
      if (userGear) {
        userGear.style.display = '';
        userGear.onclick = () => { window.location.href = 'user.html'; };
      }
      if (adminLink) {
        if (localStorage.getItem('isAdmin') === 'true') {
          adminLink.style.display = '';
        } else {
          adminLink.style.display = 'none';
        }
      }
    } else {
      loginLink.style.display = '';
      if (document.getElementById('register-link')) document.getElementById('register-link').style.display = '';
      logoutLink.style.display = 'none';
      if (userInfo) userInfo.textContent = '';
      if (userGear) userGear.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
    }
    logoutLink.onclick = () => {
      switchCartOnLogout();
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('isAdmin');
      if (userInfo) userInfo.textContent = '';
      if (userGear) userGear.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      window.location.href = 'index.html';
    };
  }
  updateCartCount();
}
document.addEventListener('DOMContentLoaded', updateAuthLinks);

// --- 首頁熱門商品 ---
if (document.getElementById('hot-products')) {
  fetch(`${API}/products`)
    .then(res => res.json())
    .then(products => {
      const hot = products.slice(0, 3); // 取前3個
      document.getElementById('hot-products').innerHTML = hot.map(p => `
        <div class="product-item">
          <img src="${p.image_url || 'https://placehold.co/180x120'}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <p>NT$${p.price}</p>
          <button onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image_url}', 1)">加入購物車</button>
        </div>
      `).join('');
    });
}
// --- 首頁新品上市 ---
if (document.getElementById('new-products')) {
  fetch(`${API}/products`)
    .then(res => res.json())
    .then(products => {
      document.getElementById('new-products').innerHTML = products.slice(-3).reverse().map(p => `
        <div class="product-card-outer">
          <div class="product-item" id="item-${p.id}">
            <img src="${p.image_url || 'https://placehold.co/180x120'}" alt="${p.name}">
            <h3>${p.name}</h3>
            <div class="product-desc" id="desc-${p.id}">${p.description ? p.description.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
            <button class="expand-btn" data-id="${p.id}" style="display:none;">展開</button>
          </div>
          <div class="product-action">
            <p class="product-price">NT$${p.price}</p>
            <button onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image_url}', 1)">加入購物車</button>
          </div>
        </div>
      `).join('');
      // 判斷描述是否超過兩行，顯示展開按鈕
      setTimeout(() => {
        document.querySelectorAll('#new-products .product-desc').forEach(desc => {
          if (desc.scrollHeight > desc.offsetHeight + 2) {
            const btn = desc.parentElement.querySelector('.expand-btn');
            if (btn) btn.style.display = '';
          }
        });
        document.querySelectorAll('#new-products .expand-btn').forEach(btn => {
          btn.onclick = function() {
            const desc = document.getElementById('desc-' + btn.dataset.id);
            const card = document.getElementById('item-' + btn.dataset.id);
            if (desc.classList.contains('expanded')) {
              desc.classList.remove('expanded');
              card.classList.remove('expanded');
              btn.textContent = '展開';
            } else {
              desc.classList.add('expanded');
              card.classList.add('expanded');
              btn.textContent = '收合';
            }
          };
        });
      }, 100);
    });
}

// --- 首頁圖片輪播 ---
if (document.getElementById('carousel')) {
  fetch('/api/admin/carousel')
    .then(res => res.json())
    .then(images => {
      if (!images.length) {
        document.getElementById('carousel').innerHTML = '<div style="text-align:center;color:#aaa;line-height:320px;">尚無輪播圖片</div>';
        return;
      }
      const carousel = document.getElementById('carousel');
      carousel.innerHTML = `
        <button class="carousel-arrow" id="carousel-left">&#8592;</button>
        <button class="carousel-arrow" id="carousel-right">&#8594;</button>
        ${images.map((img, i) => `<img src="${img.image_url}" class="carousel-img${i===0?' active':''}" style="" alt="輪播圖${i+1}" data-idx="${i}">`).join('')}
        <div class="carousel-dots">
          ${images.map((_, i) => `<button class="carousel-dot${i===0?' active':''}" data-idx="${i}"></button>`).join('')}
        </div>
      `;
      let idx = 0;
      const imgs = carousel.querySelectorAll('.carousel-img');
      const dots = carousel.querySelectorAll('.carousel-dot');
      function show(n) {
        imgs.forEach((img, i) => img.classList.toggle('active', i===n));
        dots.forEach((dot, i) => dot.classList.toggle('active', i===n));
        idx = n;
      }
      document.getElementById('carousel-left').onclick = () => show((idx-1+imgs.length)%imgs.length);
      document.getElementById('carousel-right').onclick = () => show((idx+1)%imgs.length);
      dots.forEach((dot, i) => dot.onclick = () => show(i));
      // 自動輪播
      setInterval(() => show((idx+1)%imgs.length), 5000);
      // 點擊圖片放大
      const modal = document.getElementById('carousel-modal');
      const modalImg = document.getElementById('carousel-modal-img');
      const modalClose = document.getElementById('carousel-modal-close');
      imgs.forEach(img => {
        img.style.cursor = 'zoom-in';
        img.onclick = () => {
          modalImg.src = img.src;
          modal.classList.add('active');
        };
      });
      modalClose.onclick = () => modal.classList.remove('active');
      modal.onclick = e => {
        if (e.target === modal) modal.classList.remove('active');
      };
    });
}

// --- 首頁照護須知 ---
if (document.getElementById('care-index-list')) {
  fetch('/api/admin/care')
    .then(res => res.json())
    .then(posts => {
      const list = document.getElementById('care-index-list');
      if (!posts.length) {
        list.innerHTML = '<p style="color:#888;">尚無內容</p>';
        return;
      }
      list.innerHTML = posts.slice(0, 3).map(post => `
        <div class="about-card">
          <h3>${post.title || ''}</h3>
          <div class="about-content" style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${post.content || ''}</div>
        </div>
      `).join('');
    });
}

// --- 商品頁 ---
if (document.getElementById('product-list')) {
  const url = new URL(window.location.href);
  const category = url.searchParams.get('category');
  const select = document.getElementById('category-select');
  if (select) {
    select.value = category || '';
    select.onchange = () => {
      window.location.href = select.value ? `products.html?category=${select.value}` : 'products.html';
    };
  }
  let apiUrl = `${API}/products`;
  if (category) apiUrl = `${API}/products?category=${category}`;
  fetch(apiUrl)
    .then(res => res.json())
    .then(products => {
      document.getElementById('product-list').innerHTML = products.map(p => `
        <div class="product-card-outer">
          <div class="product-item">
            <img src="${p.image_url || 'https://placehold.co/180x120'}" alt="${p.name}">
            <h3>${p.name}</h3>
            <div class="product-desc" id="desc-${p.id}">${p.description ? p.description.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>
            <button class="expand-btn" data-id="${p.id}" style="display:none;">展開</button>
          </div>
          <div class="product-action">
            <p class="product-price">NT$${p.price}</p>
            <button onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image_url}', 1)">加入購物車</button>
          </div>
        </div>
      `).join('');
      // 判斷描述是否超過兩行，顯示展開按鈕
      setTimeout(() => {
        document.querySelectorAll('.product-desc').forEach(desc => {
          if (desc.scrollHeight > desc.offsetHeight + 2) {
            const btn = desc.parentElement.querySelector('.expand-btn');
            if (btn) btn.style.display = '';
          }
        });
        document.querySelectorAll('.expand-btn').forEach(btn => {
          btn.onclick = function() {
            const desc = document.getElementById('desc-' + btn.dataset.id);
            const card = btn.closest('.product-item');
            if (desc.classList.contains('expanded')) {
              desc.classList.remove('expanded');
              card.classList.remove('expanded');
              btn.textContent = '展開';
            } else {
              desc.classList.add('expanded');
              card.classList.add('expanded');
              btn.textContent = '收合';
            }
          };
        });
      }, 100);
    });
}

// --- 商品分類清單（products.html）---
if (document.getElementById('products-category-list')) {
  fetch('/api/products/categories')
    .then(res => res.json())
    .then(cats => {
      const list = document.getElementById('products-category-list');
      list.innerHTML = `<li><a href="products.html">全部</a></li>` +
        cats.map(c => `<li><a href="products.html?category=${encodeURIComponent(c.name)}">${c.name}</a></li>`).join('');
      // 高亮目前分類
      const url = new URL(window.location.href);
      const current = url.searchParams.get('category');
      Array.from(list.querySelectorAll('a')).forEach(a => {
        if ((current && a.textContent === current) || (!current && a.textContent === '全部')) {
          a.style.fontWeight = 'bold';
          a.style.background = '#e8f5e9';
          a.style.borderRadius = '6px';
        }
      });
    });
}

// --- 首頁商品分類（index.html）---
if (document.getElementById('index-category-list')) {
  fetch('/api/products/categories')
    .then(res => res.json())
    .then(cats => {
      const list = document.getElementById('index-category-list');
      list.innerHTML = cats.map(c => `<li><a href="products.html?category=${encodeURIComponent(c.name)}">${c.name}</a></li>`).join('');
    });
}

// --- 首頁關於我們（index.html）---
if (document.getElementById('about-content')) {
  fetch('/api/admin/about/posts')
    .then(res => res.json())
    .then(posts => {
      if (posts.length > 0) {
        const post = posts[0];
        document.getElementById('about-content').innerHTML = `
          <h3>${post.title ? post.title : ''}</h3>
          <div class="about-content">${post.content ? post.content.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') : ''}</div>
          ${post.image_url ? `<img src="${post.image_url}" alt="${post.title || ''}" style="max-width:180px;margin-top:1em;">` : ''}
        `;
      } else {
        document.getElementById('about-content').innerHTML = '<p>尚無關於我們資料</p>';
      }
    });
}

// --- 購物車邏輯 ---
function getCartKey() {
  const username = localStorage.getItem('username');
  return username ? `cart_${username}` : 'cart_guest';
}
function getCart() {
  return JSON.parse(localStorage.getItem(getCartKey()) || '[]');
}
function setCart(cart) {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
}
// 登入時自動切換購物車
function switchCartOnLogin() {
  const username = localStorage.getItem('username');
  if (!username) return;
  // 如果 guest 購物車有東西，第一次登入時自動搬移
  const guestCart = localStorage.getItem('cart_guest');
  const userCart = localStorage.getItem(`cart_${username}`);
  if (guestCart && !userCart) {
    localStorage.setItem(`cart_${username}`, guestCart);
    localStorage.removeItem('cart_guest');
  }
}
// 登出時自動切換購物車
function switchCartOnLogout() {
  // 不做搬移，僅切換 key
}
function addToCart(id, name, price, image_url, quantity) {
  let cart = getCart();
  const idx = cart.findIndex(i => i.product_id === id);
  if (idx > -1) {
    cart[idx].quantity += quantity;
  } else {
    cart.push({ product_id: id, name, price, image_url, quantity });
  }
  setCart(cart);
  updateCartCount();
  alert('已加入購物車');
}
window.addToCart = addToCart;

// --- 購物車頁 ---
if (document.getElementById('cart-list')) {
  renderCart();
  document.getElementById('checkout-btn').onclick = () => {
    window.location.href = 'checkout.html';
  };
}
function renderCart() {
  const cart = getCart();
  const list = document.getElementById('cart-list');
  const total = document.getElementById('cart-total');
  if (!cart.length) {
    list.innerHTML = '<p>購物車是空的</p>';
    total.innerHTML = '';
    document.getElementById('cart-left').style.display = 'none';
    document.getElementById('cart-right').style.display = 'none';
    return;
  }
  list.innerHTML = cart.map((item, idx) => `
    <div class="product-item" style="min-width:200px;max-width:200px;flex:0 0 200px;display:flex;flex-direction:column;align-items:center;">
      <img src="${item.image_url || 'https://placehold.co/180x120'}" alt="${item.name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:0.5em;">
      <h3>${item.name}</h3>
      <p>NT$${item.price}</p>
      <input type="number" min="1" value="${item.quantity}" onchange="updateCartQty(${idx}, this.value)">
      <button onclick="removeCartItem(${idx})">移除</button>
    </div>
  `).join('');
  total.innerHTML = `<h3>總計：NT$${cart.reduce((sum, i) => sum + i.price * i.quantity, 0)}</h3>`;
  // 箭頭顯示控制
  const cartList = document.getElementById('cart-list');
  const leftBtn = document.getElementById('cart-left');
  const rightBtn = document.getElementById('cart-right');
  function updateArrows() {
    if (cartList.scrollLeft > 0) {
      leftBtn.style.display = '';
    } else {
      leftBtn.style.display = 'none';
    }
    if (cartList.scrollWidth - cartList.clientWidth - cartList.scrollLeft > 10) {
      rightBtn.style.display = '';
    } else {
      rightBtn.style.display = 'none';
    }
  }
  updateArrows();
  cartList.onscroll = updateArrows;
  leftBtn.onclick = () => {
    cartList.scrollBy({ left: -210, behavior: 'smooth' });
  };
  rightBtn.onclick = () => {
    cartList.scrollBy({ left: 210, behavior: 'smooth' });
  };
}
window.updateCartQty = function(idx, qty) {
  let cart = getCart();
  cart[idx].quantity = parseInt(qty);
  setCart(cart);
  renderCart();
  updateCartCount();
};
window.removeCartItem = function(idx) {
  let cart = getCart();
  cart.splice(idx, 1);
  setCart(cart);
  renderCart();
  updateCartCount();
};

// --- 結帳頁 ---
if (document.getElementById('checkout-list')) {
  const cart = getCart();
  const list = document.getElementById('checkout-list');
  const total = document.getElementById('checkout-total');
  const leftBtn = document.getElementById('checkout-left');
  const rightBtn = document.getElementById('checkout-right');
  if (!cart.length) {
    list.innerHTML = '<p>購物車是空的</p>';
    total.innerHTML = '';
    leftBtn.style.display = 'none';
    rightBtn.style.display = 'none';
    document.getElementById('submit-order-btn').disabled = true;
  } else {
    list.innerHTML = cart.map(item => `
      <div class="product-item" style="min-width:200px;max-width:200px;flex:0 0 200px;display:flex;flex-direction:column;align-items:center;">
        <img src="${item.image_url || 'https://placehold.co/180x120'}" alt="${item.name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:0.5em;">
        <h3>${item.name}</h3>
        <p>NT$${item.price} x ${item.quantity}</p>
      </div>
    `).join('');
    total.innerHTML = `<h3>總計：NT$${cart.reduce((sum, i) => sum + i.price * i.quantity, 0)}</h3>`;
    // 箭頭顯示控制
    function updateArrows() {
      if (list.scrollLeft > 0) {
        leftBtn.style.display = '';
      } else {
        leftBtn.style.display = 'none';
      }
      if (list.scrollWidth - list.clientWidth - list.scrollLeft > 10) {
        rightBtn.style.display = '';
      } else {
        rightBtn.style.display = 'none';
      }
    }
    updateArrows();
    list.onscroll = updateArrows;
    leftBtn.onclick = () => {
      list.scrollBy({ left: -210, behavior: 'smooth' });
    };
    rightBtn.onclick = () => {
      list.scrollBy({ left: 210, behavior: 'smooth' });
    };
    document.getElementById('submit-order-btn').disabled = false;
  }
}
// --- 結帳表單互動 ---
if (document.getElementById('checkout-form')) {
  const addressBlock = document.getElementById('address-block');
  const storeBlock = document.getElementById('store-block');
  const payRadios = document.querySelectorAll('input[name="pay-method"]');
  function updatePayOptions(ship) {
    payRadios.forEach(radio => {
      if (ship === '宅配') {
        if (radio.value === '信用卡' || radio.value === '匯款') {
          radio.parentElement.style.display = '';
        } else {
          radio.parentElement.style.display = 'none';
          radio.checked = false;
        }
      } else if (ship === '超商自取') {
        if (radio.value === '信用卡' || radio.value === '超商取貨付款') {
          radio.parentElement.style.display = '';
        } else {
          radio.parentElement.style.display = 'none';
          radio.checked = false;
        }
      } else {
        radio.parentElement.style.display = '';
      }
    });
  }
  document.querySelectorAll('input[name="ship-method"]').forEach(radio => {
    radio.onchange = function() {
      if (this.value === '宅配') {
        addressBlock.style.display = '';
        storeBlock.style.display = 'none';
      } else if (this.value === '超商自取') {
        addressBlock.style.display = 'none';
        storeBlock.style.display = '';
      }
      updatePayOptions(this.value);
    };
  });
  // 頁面載入時初始化付款選項
  updatePayOptions(document.querySelector('input[name="ship-method"]:checked')?.value);
}
function submitOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  if (!token) {
    alert('請先登入');
    window.location.href = 'login.html';
    return;
  }
  const cart = getCart();
  const total_price = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tel = document.getElementById('order-tel').value.trim();
  const mobile = document.getElementById('order-mobile').value.trim();
  const name = document.getElementById('order-name').value.trim();
  if (!tel && !mobile) {
    alert('電話或手機請至少填寫一項');
    return;
  }
  const pay_method = document.querySelector('input[name="pay-method"]:checked')?.value;
  const ship_method = document.querySelector('input[name="ship-method"]:checked')?.value;
  const address = document.getElementById('order-address')?.value || '';
  const store_type = document.getElementById('store-type')?.value || '';
  const store_name = document.getElementById('store-name')?.value || '';
  fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
      total_price, tel, mobile, name, pay_method, ship_method, address, store_type, store_name
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message === '下單成功') {
        setCart([]);
        updateCartCount();
        // 移除 syspay 相關流程，信用卡只走綠界
        if (pay_method === '信用卡' || pay_method === '綠界') {
          fetch('/api/orders/ecpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_price, name })
          })
          .then(res => res.text())
          .then(html => {
            console.log('ecpay html:', html);
            if (!html.includes('<form')) {
              alert('綠界回傳內容異常：' + html);
            }
            // 用 DOM 插入並手動 submit
            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.innerHTML = '';
            document.body.appendChild(div);
            const form = document.getElementById('ecpay');
            if (form) form.submit();
          });
          return;
        }
        if (pay_method === '超商取貨付款') {
          window.location.href = 'success.html';
        } else {
          window.location.href = 'success.html';
        }
      } else {
        alert(data.message || '下單失敗');
      }
    });
}
if (document.getElementById('checkout-form')) {
  document.getElementById('checkout-form').onsubmit = submitOrder;
}

// --- 登入 ---
if (document.getElementById('login-form')) {
  document.getElementById('login-form').onsubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
          if (data.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
          } else {
            localStorage.removeItem('isAdmin');
          }
          window.location.href = 'index.html';
        } else {
          document.getElementById('login-message').innerText = data.message || '登入失敗';
        }
      });
  };
}

// --- 註冊頁自動登入 ---
if (document.getElementById('register-form')) {
  document.getElementById('register-form').onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
          window.location.href = 'index.html';
        } else {
          document.getElementById('register-message').innerText = data.message || '註冊失敗';
        }
      });
  };
}

// --- Header 分類下拉 ---
if (document.getElementById('header-category-select')) {
  fetch('/api/products/categories')
    .then(res => res.json())
    .then(cats => {
      const select = document.getElementById('header-category-select');
      select.innerHTML = '<option value="">選擇分類</option>' + cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
      select.onchange = function() {
        if (this.value) {
          window.location.href = `products.html?category=${encodeURIComponent(this.value)}`;
        }
      };
    });
}
// --- Header 商品分類下拉選單 ---
// (移除這一段，統一用 setupHeaderCategoryMenu)
// --- Header 分類下拉選單（滑鼠移上展開）---
function setupHeaderCategoryMenu() {
  const menu = document.getElementById('header-category-menu');
  if (!menu) { console.log('找不到 header-category-menu'); return; }
  fetch('/api/products/categories')
    .then(res => res.json())
    .then(cats => {
      console.log('載入分類', cats);
      if (cats.length > 0) {
        menu.innerHTML = cats.map(c => `<li><a href="products.html?category=${encodeURIComponent(c.name)}">${c.name}</a></li>`).join('');
      } else {
        menu.innerHTML = '<li style="color:#888;padding:0.7em 1.5em;">尚無分類</li>';
      }
    });
}
// header 載入後強制呼叫
if (document.getElementById('site-header')) {
  const observer = new MutationObserver(() => {
    if (document.getElementById('header-category-menu')) {
      setupHeaderCategoryMenu();
      setTimeout(setupHeaderCategoryMenu, 200); // 再呼叫一次確保載入
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('site-header'), { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', setupHeaderCategoryMenu);
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = count;
}
// 在 header 載入後、登入/登出、加購物車時都要呼叫
function updateAuthLinks() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const userInfo = document.getElementById('user-info');
  const adminLink = document.getElementById('admin-link');
  const userGear = document.getElementById('user-gear');
  if (loginLink && logoutLink) {
    if (token) {
      loginLink.style.display = 'none';
      if (document.getElementById('register-link')) document.getElementById('register-link').style.display = 'none';
      logoutLink.style.display = '';
      if (userInfo && username) {
        userInfo.textContent = `您好，${username}`;
      }
      if (userGear) {
        userGear.style.display = '';
        userGear.onclick = () => { window.location.href = 'user.html'; };
      }
      if (adminLink) {
        if (localStorage.getItem('isAdmin') === 'true') {
          adminLink.style.display = '';
        } else {
          adminLink.style.display = 'none';
        }
      }
    } else {
      loginLink.style.display = '';
      if (document.getElementById('register-link')) document.getElementById('register-link').style.display = '';
      logoutLink.style.display = 'none';
      if (userInfo) userInfo.textContent = '';
      if (userGear) userGear.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
    }
    logoutLink.onclick = () => {
      switchCartOnLogout();
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('isAdmin');
      if (userInfo) userInfo.textContent = '';
      if (userGear) userGear.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      window.location.href = 'index.html';
    };
  }
  updateCartCount();
}
// 加入購物車時也要更新
function addToCart(id, name, price, image_url, quantity) {
  let cart = getCart();
  const idx = cart.findIndex(i => i.product_id === id);
  if (idx > -1) {
    cart[idx].quantity += quantity;
  } else {
    cart.push({ product_id: id, name, price, image_url, quantity });
  }
  setCart(cart);
  updateCartCount();
  alert('已加入購物車');
}
window.addEventListener('DOMContentLoaded', updateCartCount);

document.addEventListener('DOMContentLoaded', function() {
  // 載入 header
  if (document.getElementById('site-header')) {
    fetch('header.html')
      .then(res => res.text())
      .then(html => {
        document.getElementById('site-header').innerHTML = html;
        updateAuthLinks(); // header 載入後立即更新登入資訊
      });
  }
  // 載入 footer
  if (document.getElementById('site-footer')) {
    fetch('footer.html')
      .then(res => res.text())
      .then(html => { document.getElementById('site-footer').innerHTML = html; });
  }
}); 