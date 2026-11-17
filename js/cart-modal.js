/**
 * Multi-Brand E-Commerce & Interactive Product Modal Engine
 * Supports:
 * - General Tools® (27 Products)
 * - Stanley® (1,639 Products)
 * - DeWalt® (286 Products)
 * 
 * Handles:
 * 1. Persistent LocalStorage Shopping Cart (Multi-currency USD & INR)
 * 2. Interactive Slide-Over Cart Drawer
 * 3. Rich Product Specification & Features Modal Popup
 * 4. Toast Notifications & Header Counter Sync
 */

(function () {
  // --- Cart State Management ---
  const CART_STORAGE_KEY = 'gt_shopping_cart_v1';

  function getAllProducts() {
    return [
      ...(window.STANLEY_PRODUCTS || []),
      ...(window.DEWALT_PRODUCTS || [])
    ];
  }

  function getProductById(productId) {
    const pId = Number(productId);
    return getAllProducts().find(p => p.id === pId);
  }

  function getCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      updateCartBadge();
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  function addToCart(productId, qty = 1) {
    const product = getProductById(productId);
    if (!product) return;

    let cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      cart[existingIndex].qty += Number(qty);
    } else {
      cart.push({
        id: product.id,
        brand: product.brand || 'General Tools',
        name: product.name,
        model: product.model,
        price: product.price,
        currency: product.currency || 'USD',
        image: product.image,
        qty: Number(qty)
      });
    }

    saveCart(cart);
    showCartToast(product.name, qty, product.brand);
    renderCartDrawer();
  }

  function updateCartQuantity(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === Number(productId));
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== Number(productId));
    }

    saveCart(cart);
    renderCartDrawer();
  }

  function removeCartItem(productId) {
    let cart = getCart().filter(i => i.id !== Number(productId));
    saveCart(cart);
    renderCartDrawer();
  }

  function clearCart() {
    saveCart([]);
    renderCartDrawer();
  }

  function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.qty, 0);
  }

  function formatItemPrice(item) {
    return `${item.qty} ${item.qty === 1 ? 'Unit' : 'Units'}`;
  }

  function getCartTotalFormatted() {
    const count = getCartCount();
    return `${count} ${count === 1 ? 'Unit' : 'Units'}`;
  }

  function updateCartBadge() {
    const count = getCartCount();
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  }

  // --- Toast Notification ---
  function showCartToast(productName, qty = 1, brand = '') {
    let toast = document.getElementById('gt-cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gt-cart-toast';
      toast.className = 'fixed bottom-6 right-6 z-[9999] max-w-md w-full sm:w-auto backdrop-blur-2xl bg-[#090d14]/95 border border-brand-yellow/40 text-white p-4 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-24 opacity-0 flex items-center justify-between gap-4 pointer-events-auto';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brand-yellow/20 text-brand-yellow flex items-center justify-center shrink-0 border border-brand-yellow/30">
          <i data-lucide="file-text" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="text-[11px] font-black text-brand-yellow uppercase tracking-wider">Added to Quote (${qty})${brand ? ' &bull; ' + brand : ''}</div>
          <div class="text-xs font-bold text-slate-100 line-clamp-1">${productName}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="window.openCartDrawer()" class="bg-brand-yellow hover:bg-brand-yellowHover text-black text-xs font-black uppercase px-3.5 py-1.5 rounded-full transition shadow-sm whitespace-nowrap">
          View Quote
        </button>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto hide
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
  }

  // --- Cart Drawer Injection & Handling ---
  function injectCartDrawer() {
    if (document.getElementById('gt-cart-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'gt-cart-drawer';
    drawer.className = 'fixed inset-0 z-[9990] hidden';
    drawer.innerHTML = `
      <!-- Backdrop -->
      <div id="cart-drawer-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-0" onclick="window.closeCartDrawer()"></div>
      
      <!-- Slide-over Panel -->
      <div id="cart-drawer-panel" class="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white text-slate-900 shadow-2xl flex flex-col justify-between transform translate-x-full transition-transform duration-300 ease-in-out z-10 border-l border-slate-200">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 border border-brand-yellow/40 text-black flex items-center justify-center shadow-sm">
              <i data-lucide="file-text" class="w-5 h-5 text-amber-500"></i>
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-950 uppercase tracking-tight">Your Quote Request</h2>
              <p class="text-xs text-slate-500 font-medium" id="cart-item-count-text">0 items selected</p>
            </div>
          </div>
          <button onclick="window.closeCartDrawer()" class="p-2 rounded-full hover:bg-slate-200/60 text-slate-500 hover:text-slate-900 transition" aria-label="Close quote request">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Items Container -->
        <div class="p-6 flex-1 overflow-y-auto space-y-4" id="cart-items-container">
          <!-- Dynamically populated -->
        </div>

        <!-- Footer / Checkout Area -->
        <div class="p-6 border-t border-slate-200/90 bg-slate-50/80 backdrop-blur-md space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-600 font-bold uppercase tracking-wider text-xs">Total Items in Quote</span>
            <span class="text-lg font-black text-slate-950" id="cart-subtotal-price">0 Units</span>
          </div>
          
          <div class="text-[11px] text-slate-500 leading-normal bg-amber-50/60 border border-brand-yellow/30 p-2.5 rounded-xl flex items-start gap-2">
            <i data-lucide="info" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <span>Commercial wholesale discounts, GST invoicing, & delivery lead-times are confirmed upon quote review.</span>
          </div>

          <div class="space-y-2">
            <button onclick="window.proceedToCheckout()" class="w-full bg-brand-yellow hover:bg-brand-yellowHover text-black font-black uppercase tracking-wider py-4 rounded-full text-xs transition shadow-glow-yellow flex items-center justify-center gap-2 active:scale-95">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span>Request Commercial Quote</span>
            </button>
            <div class="flex items-center justify-between text-xs pt-1">
              <button onclick="window.clearCart()" class="text-slate-400 hover:text-red-600 transition font-bold uppercase tracking-wider text-[10px]">
                Clear Quote Request
              </button>
              <button onclick="window.closeCartDrawer()" class="text-slate-600 hover:text-slate-900 transition font-bold uppercase tracking-wider text-[10px]">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(drawer);
  }

  function renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    const countText = document.getElementById('cart-item-count-text');
    const subtotalText = document.getElementById('cart-subtotal-price');
    if (!container) return;

    const cart = getCart();
    const count = getCartCount();

    countText.textContent = `${count} ${count === 1 ? 'item' : 'items'} selected for quote`;
    subtotalText.textContent = `${count} ${count === 1 ? 'Unit' : 'Units'}`;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="text-center py-16">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <i data-lucide="file-text" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-black text-slate-900 uppercase tracking-tight mb-1">Your Quote List is Empty</h3>
          <p class="text-xs text-slate-500 max-w-xs mx-auto mb-6">Explore the Stanley and DeWalt catalogs to add precision tools and hardware to your quote request.</p>
          <a href="products.html" onclick="window.closeCartDrawer()" class="inline-flex items-center gap-2 bg-brand-yellow hover:bg-brand-yellowHover text-black font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-full transition shadow-sm">
            <span>Browse Products</span>
          </a>
        </div>
      `;
    } else {
      container.innerHTML = cart.map(item => `
        <div class="flex items-center gap-4 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:border-slate-300 transition">
          <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-contain bg-slate-50 rounded-xl p-1 border border-slate-100 shrink-0">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-[10px] font-black uppercase tracking-wider bg-brand-yellow/20 text-black px-2 py-0.5 rounded-full">
                #${item.model || item.id}
              </span>
              ${item.brand ? `<span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">${item.brand}</span>` : ''}
            </div>
            <h4 class="text-xs font-bold text-slate-900 truncate leading-snug" title="${item.name}">${item.name}</h4>
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Quantity: ${item.qty} ${item.qty === 1 ? 'Unit' : 'Units'}</div>
          </div>
          
          <div class="flex flex-col items-end gap-2">
            <button onclick="window.removeCartItem(${item.id})" class="text-slate-400 hover:text-red-600 transition p-1" title="Remove item">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button onclick="window.updateCartQuantity(${item.id}, -1)" class="px-2 py-0.5 text-xs font-black hover:bg-slate-200 transition">-</button>
              <span class="px-2 text-xs font-bold text-slate-900">${item.qty}</span>
              <button onclick="window.updateCartQuantity(${item.id}, 1)" class="px-2 py-0.5 text-xs font-black hover:bg-slate-200 transition">+</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (window.lucide) lucide.createIcons();
  }

  function openCartDrawer() {
    injectCartDrawer();
    renderCartDrawer();
    const drawer = document.getElementById('gt-cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    const panel = document.getElementById('cart-drawer-panel');

    drawer.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      panel.classList.remove('translate-x-full');
      panel.classList.add('translate-x-0');
    });
    document.body.classList.add('overflow-hidden');
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('gt-cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    const panel = document.getElementById('cart-drawer-panel');
    if (!drawer) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');

    setTimeout(() => {
      drawer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 300);
  }

  function proceedToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
      alert('Your quote list is currently empty.');
      return;
    }
    const summary = cart.map(i => `${i.qty}x ${i.name} (${i.brand} #${i.model || i.id})`).join('; ');
    window.location.href = `contact.html?order=${encodeURIComponent(summary)}`;
  }

  // --- Product Modal Popup ---
  function injectProductModal() {
    if (document.getElementById('gt-product-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'gt-product-modal';
    modal.className = 'fixed inset-0 z-[9995] hidden';
    modal.innerHTML = `
      <!-- Backdrop with heavy frosted glass -->
      <div id="product-modal-backdrop" class="absolute inset-0 bg-[#090d14]/75 backdrop-blur-xl transition-opacity opacity-0" onclick="window.closeProductModal()"></div>

      <!-- Modal Container -->
      <div class="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div id="product-modal-panel" class="relative w-full max-w-4xl bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-200/90 overflow-hidden transform scale-95 opacity-0 transition-all duration-300 ease-out text-slate-900 my-8">
          
          <!-- Close Button -->
          <button onclick="window.closeProductModal()" class="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-sm active:scale-95" aria-label="Close modal">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>

          <!-- Content Body -->
          <div id="product-modal-content" class="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] overflow-y-auto">
            <!-- Dynamically injected -->
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function openProductModal(productId) {
    injectProductModal();
    const product = getProductById(productId);
    if (!product) return;

    const warrantyDisplay = product.brand === 'DeWalt'
      ? '3-Year Limited Commercial Warranty'
      : (product.brand === 'Stanley' ? 'Lifetime / Limited Commercial Warranty' : '1-Year Limited Warranty');

    const brandNote = product.brand === 'General Tools'
      ? 'Authentic General Tools®'
      : (product.brand === 'Stanley' ? 'Authentic Stanley® Hardware' : 'Authentic DeWalt® Guaranteed Tough');

    const content = document.getElementById('product-modal-content');
    content.innerHTML = `
      <!-- Left Column: Image & Badges (5 cols) -->
      <div class="md:col-span-5 bg-slate-50 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
        <div>
          <div class="flex items-center gap-2 mb-4">
            <span class="bg-brand-yellow text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              Part: ${product.model || product.id}
            </span>
            <span class="bg-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              ${product.category || 'Tools'}
            </span>
          </div>

          <!-- Product Image Container -->
          <div class="rounded-2xl overflow-hidden bg-white border border-slate-200/80 p-4 shadow-sm relative group aspect-square flex items-center justify-center">
            <img src="${product.image}" alt="${product.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500">
            <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <i data-lucide="shield-check" class="w-3 h-3 text-brand-yellow"></i>
              <span>${brandNote}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold uppercase tracking-wider text-[10px]">Brand</span>
            <span class="font-black text-slate-900">${product.brand}&reg;</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-bold uppercase tracking-wider text-[10px]">Availability</span>
            <span class="font-bold text-emerald-600 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ${product.status || 'In Stock &bull; Authorized Supply'}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-bold uppercase tracking-wider text-[10px]">Warranty</span>
            <span class="font-semibold text-slate-800">${warrantyDisplay}</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Specs, Features & Add To Quote (7 cols) -->
      <div class="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight leading-snug mb-2">
            ${product.name}
          </h2>

          <div class="flex flex-wrap items-center gap-2 mb-5">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-brand-yellow/40 text-black font-black text-[11px] uppercase tracking-wider shadow-xs">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Commercial B2B Supply</span>
            </span>
            <span class="text-xs text-slate-500 font-medium">Wholesale pricing, volume discounts & lead-time confirmed upon quotation request</span>
          </div>

          <!-- Tabs or Sections: Features & Technical Specs -->
          <div class="space-y-5">
            
            <!-- Features Block -->
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-amber-500"></i>
                <span>Key Product Features / Contents</span>
              </h3>
              <ul class="space-y-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed max-h-48 overflow-y-auto pr-2">
                ${(product.features || []).map(f => `
                  <li class="flex items-start gap-2">
                    <span class="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>${f.replace(/^[•\s-]+/, '')}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <!-- Technical Specifications Block -->
            <div>
              <h3 class="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <i data-lucide="sliders" class="w-4 h-4 text-amber-500"></i>
                <span>Technical Specifications</span>
              </h3>
              <div class="bg-slate-50 rounded-2xl border border-slate-200/90 overflow-hidden text-xs max-h-56 overflow-y-auto">
                ${(product.specifications || []).map((s, idx) => `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:px-3.5 sm:py-2 ${idx !== product.specifications.length - 1 ? 'border-b border-slate-200/60' : ''} ${idx % 2 === 1 ? 'bg-white/60' : ''}">
                    <span class="font-bold text-slate-600 uppercase tracking-wider text-[10px] sm:w-2/5">${s.label}</span>
                    <span class="text-slate-900 font-medium sm:w-3/5 text-right sm:text-left">${s.value}</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        </div>

        <!-- Purchase & Add to Quote Controls -->
        <div class="pt-5 border-t border-slate-200/90 flex flex-col sm:flex-row items-center gap-3">
          <div class="flex items-center border border-slate-300 rounded-full bg-slate-50 p-1 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
            <button onclick="window.decrementModalQty()" class="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center transition active:scale-90">-</button>
            <input type="number" id="modal-qty-input" value="1" min="1" max="99" class="w-12 text-center text-sm font-black bg-transparent focus:outline-none" readonly>
            <button onclick="window.incrementModalQty()" class="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center transition active:scale-90">+</button>
          </div>

          <button onclick="window.addModalItemToCart(${product.id})" class="flex-1 w-full bg-brand-yellow hover:bg-brand-yellowHover text-black font-black uppercase tracking-wider py-3.5 px-6 rounded-full text-xs sm:text-sm transition-all duration-300 shadow-glow-yellow flex items-center justify-center gap-2 active:scale-95 leading-none">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Add to Quote</span>
          </button>

          <a href="contact.html?part=${encodeURIComponent(product.model)}&name=${encodeURIComponent(product.name)}&brand=${encodeURIComponent(product.brand)}" class="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold uppercase tracking-wider py-3.5 px-5 rounded-full text-xs transition flex items-center justify-center gap-1.5 active:scale-95 leading-none whitespace-nowrap">
            <i data-lucide="mail" class="w-4 h-4"></i>
            <span>Inquire</span>
          </a>
        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('gt-product-modal');
    const backdrop = document.getElementById('product-modal-backdrop');
    const panel = document.getElementById('product-modal-panel');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      panel.classList.remove('scale-95', 'opacity-0');
      panel.classList.add('scale-100', 'opacity-100');
    });
    document.body.classList.add('overflow-hidden');
  }

  function closeProductModal() {
    const modal = document.getElementById('gt-product-modal');
    const backdrop = document.getElementById('product-modal-backdrop');
    const panel = document.getElementById('product-modal-panel');
    if (!modal) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 250);
  }

  function incrementModalQty() {
    const input = document.getElementById('modal-qty-input');
    if (input) input.value = Math.min(99, Number(input.value || 1) + 1);
  }

  function decrementModalQty() {
    const input = document.getElementById('modal-qty-input');
    if (input) input.value = Math.max(1, Number(input.value || 1) - 1);
  }

  function addModalItemToCart(productId) {
    const input = document.getElementById('modal-qty-input');
    const qty = input ? Number(input.value || 1) : 1;
    addToCart(productId, qty);
    closeProductModal();
  }

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCartDrawer();
    }
  });

  // Export functions to global scope
  window.getAllProducts = getAllProducts;
  window.getProductById = getProductById;
  window.addToCart = addToCart;
  window.updateCartQuantity = updateCartQuantity;
  window.removeCartItem = removeCartItem;
  window.clearCart = clearCart;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.openProductModal = openProductModal;
  window.closeProductModal = closeProductModal;
  window.incrementModalQty = incrementModalQty;
  window.decrementModalQty = decrementModalQty;
  window.addModalItemToCart = addModalItemToCart;
  window.proceedToCheckout = proceedToCheckout;

  // Initialize badge on script load
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    injectCartDrawer();
    injectProductModal();

    // Support deep linking to open a specific product modal or cart
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const addParam = urlParams.get('add');
      const modalParam = urlParams.get('modal') || urlParams.get('product');

      if (addParam) {
        setTimeout(() => {
          addToCart(Number(addParam), 1);
          if (urlParams.get('cart') === 'open') {
            openCartDrawer();
          }
        }, 150);
      } else if (modalParam) {
        setTimeout(() => openProductModal(Number(modalParam)), 150);
      } else if (urlParams.get('cart') === 'open') {
        setTimeout(() => openCartDrawer(), 150);
      }
    } catch (e) {
      // ignore
    }
  });
})();
