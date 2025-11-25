// 權限檢查
if (localStorage.getItem('isAdmin') !== 'true') {
  alert('僅限管理員進入');
  window.location.href = 'index.html';
}

// 分頁切換
const tabs = document.querySelectorAll('.admin-tabs button');
const sections = document.querySelectorAll('.admin-section');
tabs.forEach(btn => {
  btn.onclick = () => {
    tabs.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  };
});

// --- 輪播圖管理 ---
const carouselSection = document.getElementById('tab-carousel');
function loadCarousel() {
  fetch('/api/admin/carousel')
    .then(res => res.json())
    .then(data => {
      carouselSection.innerHTML = `
        <h3>首頁輪播圖</h3>
        <div style="color:#888;font-size:0.95em;margin-bottom:0.5em;">建議圖片尺寸：1600 x 500 px</div>
        <form id="carousel-add-form">
          圖片：<input type="file" id="carousel-image-file" accept="image/*" multiple required>
          <div id="carousel-previews" style="display:flex;gap:8px;"></div>
          排序：<input type="number" id="carousel-sort" value="0" style="width:60px;">
          <button type="submit">新增</button>
        </form>
        <table class="admin-table">
          <tr><th>圖片</th><th>排序</th><th>操作</th></tr>
          ${data.map(img => `
            <tr>
              <td><img src="${img.image_url}" style="max-width:120px;"></td>
              <td>${img.sort_order}</td>
              <td>
                <button onclick="deleteCarousel(${img.id})">刪除</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
      // 圖片預覽
      const fileInput = document.getElementById('carousel-image-file');
      const previews = document.getElementById('carousel-previews');
      fileInput.onchange = function() {
        previews.innerHTML = '';
        if (fileInput.files && fileInput.files.length) {
          Array.from(fileInput.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.style.height = '60px';
              img.style.width = 'auto';
              img.style.borderRadius = '4px';
              previews.appendChild(img);
            };
            reader.readAsDataURL(file);
          });
        }
      };
      document.getElementById('carousel-add-form').onsubmit = e => {
        e.preventDefault();
        const files = fileInput.files;
        if (!files.length) return alert('請選擇圖片');
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('images', f));
        fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        })
          .then(res => res.json())
          .then(result => {
            const sort = document.getElementById('carousel-sort').value;
            // 逐一新增到資料庫
            Promise.all(result.urls.map(url =>
              fetch('/api/admin/carousel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image_url: url,
                  sort_order: sort
                })
              })
            )).then(() => loadCarousel());
          });
      };
    });
}
window.deleteCarousel = function(id) {
  if (confirm('確定刪除？')) {
    fetch('/api/admin/carousel/' + id, { method: 'DELETE' }).then(() => loadCarousel());
  }
};
loadCarousel();

// --- 關於我們多段內容管理 ---
const aboutSection = document.getElementById('tab-about');
function loadAboutPosts() {
  fetch('/api/admin/about/posts')
    .then(res => res.json())
    .then(data => {
      aboutSection.innerHTML = `
        <h3>關於我們內容管理</h3>
        <div style="color:#888;font-size:0.95em;margin-bottom:0.5em;">可新增多段內容與圖片，建議圖片寬度 800px 以上</div>
        <form id="about-add-form">
          標題：<input type="text" id="about-title" required><br>
          內容：<br><textarea id="about-content" rows="4" style="width:90%;" required></textarea><br>
          圖片：<input type="file" id="about-image-file" accept="image/*">
          <img id="about-preview" style="max-width:120px;display:none;vertical-align:middle;">
          <button type="submit">新增</button>
        </form>
        <table class="admin-table">
          <tr><th>標題</th><th>內容</th><th>圖片</th><th>建立時間</th><th>操作</th></tr>
          ${data.map(post => `
            <tr>
              <td>${post.title || ''}</td>
              <td style="max-width:300px;white-space:pre-line;">${post.content || ''}</td>
              <td>${post.image_url ? `<img src="${post.image_url}" style="max-width:80px;">` : ''}</td>
              <td>${post.created_at}</td>
              <td>
                <button onclick="editAboutPost(${post.id})">編輯</button>
                <button onclick="deleteAboutPost(${post.id})">刪除</button>
              </td>
            </tr>
          `).join('')}
        </table>
        <div id="about-edit-modal" style="display:none;"></div>
      `;
      // 圖片預覽
      const fileInput = document.getElementById('about-image-file');
      const preview = document.getElementById('about-preview');
      fileInput.onchange = function() {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          preview.style.display = 'none';
        }
      };
      document.getElementById('about-add-form').onsubmit = e => {
        e.preventDefault();
        const file = fileInput.files[0];
        const title = document.getElementById('about-title').value;
        const content = document.getElementById('about-content').value;
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          fetch('/api/admin/upload/single', {
            method: 'POST',
            body: formData
          })
            .then(res => res.json())
            .then(result => {
              fetch('/api/admin/about/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, image_url: result.url })
              }).then(() => loadAboutPosts());
            });
        } else {
          fetch('/api/admin/about/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, image_url: '' })
          }).then(() => loadAboutPosts());
        }
      };
    });
}
window.deleteAboutPost = function(id) {
  if (confirm('確定刪除？')) {
    fetch('/api/admin/about/posts/' + id, { method: 'DELETE' }).then(() => loadAboutPosts());
  }
};
window.editAboutPost = function(id) {
  fetch('/api/admin/about/posts')
    .then(res => res.json())
    .then(posts => {
      const post = posts.find(p => p.id === id);
      if (!post) return;
      const modal = document.getElementById('about-edit-modal');
      modal.style.display = 'block';
      modal.innerHTML = `
        <div style="background:#fff;padding:2em;border-radius:8px;max-width:400px;margin:2em auto;box-shadow:0 2px 12px rgba(0,0,0,0.1);position:relative;">
          <button onclick="document.getElementById('about-edit-modal').style.display='none'" style="position:absolute;top:8px;right:12px;font-size:1.5em;">&times;</button>
          <h4>編輯內容</h4>
          <form id="about-edit-form">
            標題：<input type="text" id="about-edit-title" value="${post.title || ''}" required><br>
            內容：<br><textarea id="about-edit-content" rows="4" style="width:90%;" required>${post.content || ''}</textarea><br>
            圖片：<input type="file" id="about-edit-image-file" accept="image/*">
            <img id="about-edit-preview" src="${post.image_url || ''}" style="max-width:120px;${post.image_url ? '' : 'display:none;'}vertical-align:middle;">
            <button type="submit">儲存</button>
          </form>
        </div>
      `;
      // 編輯預覽
      const fileInput = document.getElementById('about-edit-image-file');
      const preview = document.getElementById('about-edit-preview');
      fileInput.onchange = function() {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          preview.style.display = 'none';
        }
      };
      document.getElementById('about-edit-form').onsubmit = function(e) {
        e.preventDefault();
        const title = document.getElementById('about-edit-title').value;
        const content = document.getElementById('about-edit-content').value;
        const file = fileInput.files[0];
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          fetch('/api/admin/upload/single', {
            method: 'POST',
            body: formData
          })
            .then(res => res.json())
            .then(result => {
              fetch('/api/admin/about/posts/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, image_url: result.url })
              }).then(() => { modal.style.display = 'none'; loadAboutPosts(); });
            });
        } else {
          fetch('/api/admin/about/posts/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, image_url: post.image_url })
          }).then(() => { modal.style.display = 'none'; loadAboutPosts(); });
        }
      };
    });
};
loadAboutPosts();

// --- 照顧須知部落格管理 ---
const careSection = document.getElementById('tab-care');
function loadCare() {
  fetch('/api/admin/care')
    .then(res => res.json())
    .then(data => {
      careSection.innerHTML = `
        <h3>照顧須知部落格</h3>
        <form id="care-add-form">
          標題：<input type="text" id="care-title" required>
          <br>
          <textarea id="care-content" rows="4" style="width:90%;" required></textarea>
          <br>
          <button type="submit">新增</button>
        </form>
        <table class="admin-table">
          <tr><th>標題</th><th>內容</th><th>建立時間</th><th>操作</th></tr>
          ${data.map(post => `
            <tr>
              <td>${post.title}</td>
              <td style="max-width:300px;white-space:pre-line;">${post.content}</td>
              <td>${post.created_at}</td>
              <td>
                <button onclick="deleteCare(${post.id})">刪除</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
      document.getElementById('care-add-form').onsubmit = e => {
        e.preventDefault();
        fetch('/api/admin/care', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: document.getElementById('care-title').value,
            content: document.getElementById('care-content').value
          })
        }).then(() => loadCare());
      };
    });
}
window.deleteCare = function(id) {
  if (confirm('確定刪除？')) {
    fetch('/api/admin/care/' + id, { method: 'DELETE' }).then(() => loadCare());
  }
};
loadCare();

// --- 商品管理 ---
const productsSection = document.getElementById('tab-products');
let productCategories = [];
function loadProductCategories(cb) {
  fetch('/api/products/categories')
    .then(res => res.json())
    .then(cats => {
      productCategories = cats.map(c => c.name);
      if (cb) cb();
    });
}
function loadProducts(selectedCategory = '全部') {
  fetch('/api/products' + (selectedCategory && selectedCategory !== '全部' ? '?category=' + encodeURIComponent(selectedCategory) : ''))
    .then(res => res.json())
    .then(data => {
      let catOptions = productCategories.map(c => `<option value="${c}">${c}</option>`).join('');
      productsSection.innerHTML = `
        <h3>商品管理</h3>
        <div style="margin-bottom:1em;">
          <label>分類：</label>
          <select id="product-category-filter">
            <option value="全部">全部</option>
            ${catOptions}
          </select>
          <input type="text" id="new-category-name" placeholder="新增分類..." style="margin-left:1em;width:120px;">
          <button id="add-category-btn">新增分類</button>
        </div>
        <form id="product-add-form">
          名稱：<input type="text" id="product-name" required>
          分類：<select id="product-category">
            ${catOptions}
          </select>
          價格：<input type="number" id="product-price" min="0" step="0.01" required style="width:80px;">
          庫存：<input type="number" id="product-stock" min="0" value="0" style="width:60px;">
          狀態：<select id="product-status"><option value="上架">上架</option><option value="下架">下架</option></select>
          圖片：<input type="file" id="product-image-file" accept="image/*">
          <img id="product-preview" style="max-width:80px;display:none;vertical-align:middle;">
          <br>描述：<br><textarea id="product-desc" rows="2" style="width:90%;"></textarea>
          <button type="submit">新增</button>
        </form>
        <table class="admin-table">
          <tr><th>圖片</th><th>名稱</th><th>分類</th><th>價格</th><th>庫存</th><th>狀態</th><th>操作</th></tr>
          ${data.map(p => `
            <tr>
              <td>${p.image_url ? `<img src="${p.image_url}" style="max-width:60px;">` : ''}</td>
              <td>${p.name}</td>
              <td>${p.category}</td>
              <td>NT$${p.price}</td>
              <td>${p.stock}</td>
              <td>
                <select onchange="updateProductStatus(${p.id}, this.value)">
                  <option value="上架"${p.status==='上架'?' selected':''}>上架</option>
                  <option value="下架"${p.status==='下架'?' selected':''}>下架</option>
                </select>
              </td>
              <td>
                <button onclick="editProduct(${p.id})">編輯</button>
                <button onclick="deleteProduct(${p.id})">刪除</button>
              </td>
            </tr>
          `).join('')}
        </table>
        <div id="product-edit-modal" style="display:none;"></div>
      `;
      // 分類下拉切換
      document.getElementById('product-category-filter').onchange = function() {
        loadProducts(this.value);
      };
      // 新增分類
      document.getElementById('add-category-btn').onclick = function() {
        const name = document.getElementById('new-category-name').value.trim();
        if (!name) return alert('請輸入分類名稱');
        fetch('/api/products/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        }).then(() => loadProductCategories(() => loadProducts(selectedCategory)));
      };
      // 圖片預覽
      const fileInput = document.getElementById('product-image-file');
      const preview = document.getElementById('product-preview');
      fileInput.onchange = function() {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          preview.style.display = 'none';
        }
      };
      document.getElementById('product-add-form').onsubmit = e => {
        e.preventDefault();
        const file = fileInput.files[0];
        const name = document.getElementById('product-name').value;
        const category = document.getElementById('product-category').value;
        const price = document.getElementById('product-price').value;
        const stock = document.getElementById('product-stock').value;
        const status = document.getElementById('product-status').value;
        const description = document.getElementById('product-desc').value;
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          fetch('/api/admin/upload/single', {
            method: 'POST',
            body: formData
          })
            .then(res => res.json())
            .then(result => {
              fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, category, price, stock, status, description, image_url: result.url })
              }).then(() => loadProducts(selectedCategory));
            });
        } else {
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, price, stock, status, description, image_url: '' })
          }).then(() => loadProducts(selectedCategory));
        }
      };
    });
}
window.deleteProduct = function(id) {
  if (confirm('確定刪除？')) {
    fetch('/api/products/' + id, { method: 'DELETE' }).then(() => loadProducts());
  }
};
window.updateProductStatus = function(id, status) {
  fetch('/api/products/' + id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(() => loadProducts());
};
window.editProduct = function(id) {
  fetch('/api/products')
    .then(res => res.json())
    .then(products => {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const modal = document.getElementById('product-edit-modal');
      modal.style.display = 'block';
      modal.innerHTML = `
        <div style="background:#fff;padding:2em;border-radius:8px;max-width:400px;margin:2em auto;box-shadow:0 2px 12px rgba(0,0,0,0.1);position:relative;">
          <button onclick="document.getElementById('product-edit-modal').style.display='none'" style="position:absolute;top:8px;right:12px;font-size:1.5em;">&times;</button>
          <h4>編輯商品</h4>
          <form id="product-edit-form">
            名稱：<input type="text" id="edit-product-name" value="${p.name}" required><br>
            分類：<select id="edit-product-category">
              <option value="植物"${p.category==='植物'?' selected':''}>多肉植物</option>
              <option value="盆栽"${p.category==='盆栽'?' selected':''}>盆栽</option>
              <option value="植物板"${p.category==='植物板'?' selected':''}>植物板</option>
            </select><br>
            價格：<input type="number" id="edit-product-price" min="0" step="0.01" value="${p.price}" required style="width:80px;"><br>
            庫存：<input type="number" id="edit-product-stock" min="0" value="${p.stock}" style="width:60px;"><br>
            狀態：<select id="edit-product-status"><option value="上架"${p.status==='上架'?' selected':''}>上架</option><option value="下架"${p.status==='下架'?' selected':''}>下架</option></select><br>
            圖片：<input type="file" id="edit-product-image-file" accept="image/*">
            <img id="edit-product-preview" src="${p.image_url || ''}" style="max-width:80px;${p.image_url ? '' : 'display:none;'}vertical-align:middle;"><br>
            描述：<br><textarea id="edit-product-desc" rows="2" style="width:90%;">${p.description || ''}</textarea><br>
            <button type="submit">儲存</button>
          </form>
        </div>
      `;
      // 編輯預覽
      const fileInput = document.getElementById('edit-product-image-file');
      const preview = document.getElementById('edit-product-preview');
      fileInput.onchange = function() {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          preview.style.display = 'none';
        }
      };
      document.getElementById('product-edit-form').onsubmit = function(e) {
        e.preventDefault();
        const name = document.getElementById('edit-product-name').value;
        const category = document.getElementById('edit-product-category').value;
        const price = document.getElementById('edit-product-price').value;
        const stock = document.getElementById('edit-product-stock').value;
        const status = document.getElementById('edit-product-status').value;
        const description = document.getElementById('edit-product-desc').value;
        const file = fileInput.files[0];
        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          fetch('/api/admin/upload/single', {
            method: 'POST',
            body: formData
          })
            .then(res => res.json())
            .then(result => {
              fetch('/api/products/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, category, price, stock, status, description, image_url: result.url })
              }).then(() => { modal.style.display = 'none'; loadProducts(); });
            });
        } else {
          fetch('/api/products/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, price, stock, status, description, image_url: p.image_url })
          }).then(() => { modal.style.display = 'none'; loadProducts(); });
        }
      };
    });
};
// 載入分類後載入商品
loadProductCategories(() => loadProducts('全部'));

// --- 訂單查詢 ---
const ordersSection = document.getElementById('tab-orders');
function loadOrders() {
  fetch('/api/orders/all')
    .then(res => res.json())
    .then(data => {
      ordersSection.innerHTML = `
        <h3>訂單查詢</h3>
        <table class="admin-table">
          <tr><th>訂單ID</th><th>用戶ID</th><th>總價</th><th>建立時間</th><th>狀態</th><th>操作</th></tr>
          ${data.map(o => `
            <tr>
              <td>${o.id}</td>
              <td>${o.user_id}</td>
              <td>NT$${o.total_price}</td>
              <td>${o.created_at}</td>
              <td>
                <select onchange="updateOrderStatus(${o.id}, this.value)">
                  <option value="處理中"${o.status==='處理中'?' selected':''}>處理中</option>
                  <option value="已出貨"${o.status==='已出貨'?' selected':''}>已出貨</option>
                  <option value="已取消"${o.status==='已取消'?' selected':''}>已取消</option>
                </select>
              </td>
              <td><button onclick="toggleOrderDetail(${o.id})" id="order-detail-btn-${o.id}">展開</button></td>
            </tr>
            <tr id="order-detail-${o.id}" style="display:none;background:#f9fbe7;">
              <td colspan="6" style="text-align:left;">
                <div><b>收件人：</b>${o.name || ''}</div>
                <div><b>電話：</b>${o.tel || ''} <b>手機：</b>${o.mobile || ''}</div>
                <div><b>付款方式：</b>${o.pay_method || ''} <b>送貨方式：</b>${o.ship_method || ''}</div>
                <div><b>地址：</b>${o.address || ''}</div>
                <div><b>超商：</b>${o.store_type || ''} <b>門市：</b>${o.store_name || ''}</div>
                <div style="margin-top:0.5em;"><b>商品明細：</b>
                  <ul style="margin:0;padding-left:1.5em;">
                    ${(o.items||[]).map(item => `<li>${item.name} x ${item.quantity}（NT$${item.price}）</li>`).join('')}
                  </ul>
                </div>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    });
}
window.toggleOrderDetail = function(id) {
  const row = document.getElementById('order-detail-' + id);
  const btn = document.getElementById('order-detail-btn-' + id);
  if (row.style.display === 'none') {
    row.style.display = '';
    btn.textContent = '收合';
  } else {
    row.style.display = 'none';
    btn.textContent = '展開';
  }
};
window.updateOrderStatus = function(id, status) {
  fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(() => loadOrders());
};
loadOrders(); 