/* ============================================================
   DealKhoj Admin Panel — admin.js
   Handles: Auth, Navigation, Dashboard, Products CRUD,
            Categories, Stores, Settings
   Security: All writes go through Supabase RLS policies.
             Admin role checked server-side via is_admin().
   ============================================================ */

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // 1. SUPABASE CLIENT
  // ────────────────────────────────────────────────────────────
  let supabase;
  try {
    if (
      typeof window.supabase === 'undefined' ||
      typeof SUPABASE_URL === 'undefined' ||
      SUPABASE_URL.includes('YOUR_PROJECT_ID')
    ) {
      showConfigError();
      throw new Error('Supabase not configured');
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
  } catch (e) {
    console.error('[Admin] Supabase init:', e.message);
  }

  // ────────────────────────────────────────────────────────────
  // 2. STATE
  // ────────────────────────────────────────────────────────────
  let currentUser   = null;
  let allProducts   = [];
  let allCategories = [];
  let allStores     = [];
  let currentPage   = 'dashboard';
  let editingProductId = null;

  // Products table state
  const PER_PAGE = 15;
  let productPage = 1;
  let filteredProducts = [];

  // ────────────────────────────────────────────────────────────
  // 3. DOM REFS
  // ────────────────────────────────────────────────────────────
  const loginScreen  = document.getElementById('login-screen');
  const adminShell   = document.getElementById('admin-shell');
  const loginForm    = document.getElementById('login-form');
  const loginErrEl   = document.getElementById('login-error');
  const loginBtn     = document.getElementById('login-btn');
  const sidebar      = document.getElementById('sidebar');
  const sidebarOvl   = document.getElementById('sidebar-overlay');
  const menuToggle   = document.getElementById('menu-toggle');
  const breadcrumb   = document.getElementById('breadcrumb-current');
  const logoutBtn    = document.getElementById('logout-btn');
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');
  const adminEmailEl = document.getElementById('admin-email-display');
  const adminAvatar  = document.getElementById('admin-avatar');
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmDesc  = document.getElementById('confirm-desc');
  const confirmIcon  = document.getElementById('confirm-icon');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

  // ────────────────────────────────────────────────────────────
  // 4. BOOT — Check existing session
  // ────────────────────────────────────────────────────────────
  async function boot() {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await onAuthSuccess(session.user);
    } else {
      showLogin();
    }

    // Listen for auth state changes (logout / token refresh)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await onAuthSuccess(session.user);
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        showLogin();
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // 5. AUTHENTICATION
  // ────────────────────────────────────────────────────────────
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showLoginError('Email aur password dono zaroori hain.');
      return;
    }

    setLoginLoading(true);
    hideLoginError();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify admin role server-side
      const { data: roleCheck, error: roleErr } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roleErr || !roleCheck) {
        await supabase.auth.signOut();
        throw new Error('ACCESS_DENIED');
      }

      await onAuthSuccess(data.user);
    } catch (err) {
      const msg = translateAuthError(err.message);
      showLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  });

  async function onAuthSuccess(user) {
    currentUser = user;
    showAdminShell();
    updateAdminUI(user);
    await loadInitialData();
    navigateTo('dashboard');
  }

  function translateAuthError(msg) {
    if (!msg) return 'Login fail hua. Dobara try karein.';
    const m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('email not confirmed'))
      return '❌ Email ya password galat hai.';
    if (m.includes('access_denied') || m.includes('admin_roles'))
      return '🚫 Aapke paas admin access nahi hai. Sahi account use karein.';
    if (m.includes('too many requests') || m.includes('rate limit'))
      return '⏳ Bahut zyada attempts. Thodi der baad try karein.';
    if (m.includes('network') || m.includes('fetch'))
      return '🌐 Network error. Internet connection check karein.';
    return '❌ ' + msg;
  }

  function setLoginLoading(loading) {
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? 'Signing in…' : 'Sign In';
  }

  function showLoginError(msg) {
    loginErrEl.textContent = msg;
    loginErrEl.classList.remove('hidden');
    loginErrEl.focus();
  }

  function hideLoginError() {
    loginErrEl.classList.add('hidden');
    loginErrEl.textContent = '';
  }

  function showLogin() {
    loginScreen.classList.remove('hidden');
    adminShell.classList.add('hidden');
    document.getElementById('login-email')?.focus();
  }

  function showAdminShell() {
    loginScreen.classList.add('hidden');
    adminShell.classList.remove('hidden');
  }

  function updateAdminUI(user) {
    if (!user) return;
    const email = user.email || '';
    if (adminEmailEl) adminEmailEl.textContent = email;
    if (adminAvatar)  adminAvatar.textContent  = email.charAt(0).toUpperCase();
    const settingsEmail = document.getElementById('settings-email');
    if (settingsEmail) settingsEmail.textContent = email;
    const settingsUrl = document.getElementById('settings-url');
    if (settingsUrl && typeof SUPABASE_URL !== 'undefined') settingsUrl.textContent = SUPABASE_URL;
  }

  // Logout
  async function doLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
    showToast('Aap logout ho gaye. 👋', 'info');
  }

  logoutBtn?.addEventListener('click', doLogout);
  settingsLogoutBtn?.addEventListener('click', doLogout);

  // ────────────────────────────────────────────────────────────
  // 6. NAVIGATION
  // ────────────────────────────────────────────────────────────
  const PAGE_TITLES = {
    dashboard:   'Dashboard',
    products:    'All Products',
    'add-product': 'Add Product',
    categories:  'Categories',
    stores:      'Stores & Links',
    settings:    'Settings',
  };

  function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const el = document.getElementById(`page-${page}`);
    if (!el) return;
    el.classList.add('active');
    currentPage = page;

    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(b => {
      const active = b.dataset.page === page;
      b.classList.toggle('active', active);
      b.setAttribute('aria-current', active ? 'page' : 'false');
    });

    // Breadcrumb
    if (breadcrumb) breadcrumb.textContent = PAGE_TITLES[page] || page;

    // Close mobile sidebar
    closeMobileSidebar();

    // Page-specific load
    switch (page) {
      case 'dashboard':   loadDashboard(); break;
      case 'products':    loadProductsTable(); break;
      case 'add-product': initProductForm(null); break;
      case 'categories':  loadCategories(); break;
      case 'stores':      loadStores(); break;
      case 'settings':    break; // static
    }

    window.scrollTo({ top: 0 });
  }

  // Nav item clicks (sidebar + inline buttons)
  document.addEventListener('click', e => {
    const navEl = e.target.closest('[data-page]');
    if (!navEl) return;
    const page = navEl.dataset.page;
    if (page) navigateTo(page);
  });

  // Mobile sidebar
  menuToggle?.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    sidebarOvl.classList.toggle('show', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
  });

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarOvl.classList.remove('show');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  sidebarOvl?.addEventListener('click', closeMobileSidebar);

  // ────────────────────────────────────────────────────────────
  // 7. INITIAL DATA LOAD
  // ────────────────────────────────────────────────────────────
  async function loadInitialData() {
    try {
      const [catRes, storeRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('stores').select('*').order('name'),
      ]);
      if (!catRes.error)   allCategories = catRes.data || [];
      if (!storeRes.error) allStores     = storeRes.data || [];

      populateCategoryDropdown('p-category');
      populateCategoryDropdown('products-filter-category', true);
    } catch (e) {
      console.error('[Admin] loadInitialData:', e.message);
    }
  }

  function populateCategoryDropdown(id, withAllOption = false) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = withAllOption
      ? '<option value="">All Categories</option>'
      : '<option value="">— Select Category —</option>';
    allCategories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ────────────────────────────────────────────────────────────
  // 8. DASHBOARD
  // ────────────────────────────────────────────────────────────
  async function loadDashboard() {
    try {
      // Stats
      const [prodRes, catRes, storeRes] = await Promise.all([
        supabase.from('products').select('id, is_published, is_featured'),
        supabase.from('categories').select('id').eq('is_active', true),
        supabase.from('stores').select('id').eq('is_active', true),
      ]);

      const prods    = prodRes.data || [];
      const total    = prods.length;
      const published = prods.filter(p => p.is_published).length;
      const drafts   = total - published;
      const featured = prods.filter(p => p.is_featured).length;

      setText('stat-total',      total);
      setText('stat-published',  published);
      setText('stat-drafts',     drafts);
      setText('stat-categories', (catRes.data || []).length);
      setText('stat-stores',     (storeRes.data || []).length);
      setText('stat-featured',   featured);

      // Recent products
      const { data: recent } = await supabase
        .from('products')
        .select('id, name, price, currency, image_url, is_published, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      renderRecentProducts(recent || []);
    } catch (e) {
      console.error('[Admin] Dashboard load:', e.message);
    }
  }

  function renderRecentProducts(items) {
    const el = document.getElementById('recent-products-list');
    if (!el) return;
    if (items.length === 0) {
      el.innerHTML = '<div class="table-empty"><div class="icon">📦</div>Abhi koi product nahi. Add karein!</div>';
      return;
    }
    const symbol = '₹';
    el.innerHTML = items.map(p => `
      <div class="recent-item">
        <img class="recent-img" src="${sanitizeUrl(p.image_url) || ''}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'" loading="lazy" />
        <div class="recent-info">
          <div class="recent-name">${escapeHtml(p.name)}</div>
          <div class="recent-meta">${formatDate(p.created_at)} · ${p.is_published ? '<span style="color:var(--clr-success)">Published</span>' : '<span style="color:var(--clr-warning)">Draft</span>'}</div>
        </div>
        <div class="recent-price">${symbol}${formatPrice(p.price)}</div>
      </div>`).join('');
  }

  // ────────────────────────────────────────────────────────────
  // 9. PRODUCTS TABLE
  // ────────────────────────────────────────────────────────────
  async function loadProductsTable() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty"><div class="spinner spinner-lg" style="margin:0 auto"></div></td></tr>';

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`id, name, slug, price, original_price, currency, image_url,
                 is_published, is_featured, stock_status, created_at,
                 categories(id, name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allProducts = data || [];
      productPage = 1;
      applyProductFilters();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">⚠️ ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function applyProductFilters() {
    const search    = document.getElementById('products-search')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('products-filter-category')?.value || '';
    const status    = document.getElementById('products-filter-status')?.value || '';
    const sort      = document.getElementById('products-sort')?.value || 'newest';

    filteredProducts = allProducts.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search);
      const matchCat    = !catFilter || (p.categories && p.categories.id === catFilter);
      const matchStatus = !status ||
        (status === 'published' && p.is_published) ||
        (status === 'draft' && !p.is_published);
      return matchSearch && matchCat && matchStatus;
    });

    // Sort
    switch (sort) {
      case 'newest':    filteredProducts.sort((a,b) => new Date(b.created_at)-new Date(a.created_at)); break;
      case 'oldest':    filteredProducts.sort((a,b) => new Date(a.created_at)-new Date(b.created_at)); break;
      case 'price_asc': filteredProducts.sort((a,b) => a.price - b.price); break;
      case 'price_desc':filteredProducts.sort((a,b) => b.price - a.price); break;
      case 'name_asc':  filteredProducts.sort((a,b) => a.name.localeCompare(b.name)); break;
    }

    const count = document.getElementById('products-count');
    if (count) count.textContent = `${filteredProducts.length} product${filteredProducts.length!==1?'s':''}`;

    renderProductsPage();
    renderPagination();
  }

  function renderProductsPage() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    const start = (productPage - 1) * PER_PAGE;
    const page  = filteredProducts.slice(start, start + PER_PAGE);

    if (page.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="icon">🔍</div>Koi product nahi mila.</td></tr>`;
      return;
    }

    tbody.innerHTML = page.map(p => {
      const stockMap = { in_stock:'badge-in-stock', out_of_stock:'badge-out-stock', limited:'badge-draft' };
      const stockLabel = { in_stock:'In Stock', out_of_stock:'Out of Stock', limited:'Limited' };
      const imgSrc = sanitizeUrl(p.image_url) || '';
      const discount = p.original_price && p.original_price > p.price
        ? Math.round((1 - p.price / p.original_price) * 100) : 0;

      return `<tr>
        <td><img class="td-product-img" src="${imgSrc}" alt="" onerror="this.style.opacity='.3'" loading="lazy" /></td>
        <td class="td-product-name">
          <span class="name-text" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          <span class="cat-badge">${p.categories ? escapeHtml(p.categories.name) : '—'}</span>
        </td>
        <td>
          <strong>₹${formatPrice(p.price)}</strong>
          ${discount > 0 ? `<br><span style="font-size:.7rem;color:var(--clr-success)">-${discount}% off</span>` : ''}
        </td>
        <td>${p.categories ? escapeHtml(p.categories.name) : '<span class="text-muted">—</span>'}</td>
        <td>
          <span class="badge ${p.is_published ? 'badge-published' : 'badge-draft'}">
            ${p.is_published ? '✅ Published' : '📋 Draft'}
          </span>
          ${p.is_featured ? '<br><span class="badge badge-featured" style="margin-top:.2rem;">⭐ Featured</span>' : ''}
        </td>
        <td><span class="badge ${stockMap[p.stock_status]||'badge-in-stock'}">${stockLabel[p.stock_status]||'In Stock'}</span></td>
        <td style="white-space:nowrap;font-size:.78rem;color:var(--clr-muted);">${formatDate(p.created_at)}</td>
        <td>
          <div class="table-actions">
            <button class="act-btn edit"     data-action="edit-product"    data-id="${p.id}" title="Edit">✏️</button>
            <button class="act-btn ${p.is_published?'unpublish':'publish'}"
              data-action="${p.is_published?'unpublish':'publish'}-product" data-id="${p.id}"
              title="${p.is_published?'Unpublish':'Publish'}">
              ${p.is_published ? '📤' : '📢'}
            </button>
            <button class="act-btn delete"   data-action="delete-product"  data-id="${p.id}" data-name="${escapeHtml(p.name)}" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function renderPagination() {
    const el = document.getElementById('products-pagination');
    if (!el) return;
    const totalPages = Math.ceil(filteredProducts.length / PER_PAGE);
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    let html = `<button class="page-btn" data-ppage="prev" ${productPage===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - productPage) > 1) {
        if (i === 3 || i === totalPages - 2) html += `<span class="page-info">…</span>`;
        continue;
      }
      html += `<button class="page-btn ${i===productPage?'active':''}" data-ppage="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" data-ppage="next" ${productPage===totalPages?'disabled':''}>›</button>`;
    html += `<span class="page-info">Page ${productPage} of ${totalPages}</span>`;
    el.innerHTML = html;
  }

  // Products table event delegation
  document.getElementById('products-tbody')?.addEventListener('click', handleProductTableAction);
  document.getElementById('products-pagination')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-ppage]');
    if (!btn || btn.disabled) return;
    const val = btn.dataset.ppage;
    const total = Math.ceil(filteredProducts.length / PER_PAGE);
    if (val === 'prev') productPage = Math.max(1, productPage - 1);
    else if (val === 'next') productPage = Math.min(total, productPage + 1);
    else productPage = parseInt(val, 10);
    renderProductsPage();
    renderPagination();
  });

  // Toolbar filters
  ['products-search','products-filter-category','products-filter-status','products-sort'].forEach(id => {
    let timer;
    document.getElementById(id)?.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { productPage = 1; applyProductFilters(); }, 200);
    });
    document.getElementById(id)?.addEventListener('change', () => { productPage = 1; applyProductFilters(); });
  });

  async function handleProductTableAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, name } = btn.dataset;

    switch (action) {
      case 'edit-product':
        navigateTo('add-product');
        await loadProductForEdit(id);
        break;
      case 'publish-product':
        await togglePublish(id, true);
        break;
      case 'unpublish-product':
        await togglePublish(id, false);
        break;
      case 'delete-product':
        confirmDialog({
          icon: '🗑️',
          title: 'Delete Product?',
          desc: `"${name}" permanently delete ho jayega. Yeh undo nahi ho sakta.`,
          okLabel: 'Haan, Delete Karo',
          okClass: 'btn-danger',
          onOk: () => deleteProduct(id),
        });
        break;
    }
  }

  async function togglePublish(id, publish) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_published: publish })
        .eq('id', id);
      if (error) throw error;
      showToast(`Product ${publish ? 'publish' : 'unpublish'} ho gaya! ✅`, 'success');
      await loadProductsTable();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }

  async function deleteProduct(id) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      showToast('Product delete ho gaya! 🗑️', 'success');
      await loadProductsTable();
    } catch (e) {
      showToast('Delete failed: ' + e.message, 'error');
    }
  }

  // ────────────────────────────────────────────────────────────
  // 10. PRODUCT FORM (Add + Edit)
  // ────────────────────────────────────────────────────────────
  function initProductForm(product) {
    editingProductId = product ? product.id : null;
    const title = document.getElementById('product-form-title');
    const sub   = document.getElementById('product-form-sub');
    if (title) title.textContent = product ? 'Edit Product' : 'Add New Product';
    if (sub)   sub.textContent   = product ? `Editing: ${product.name}` : 'Fill in the details below and save.';

    document.getElementById('product-form')?.reset();
    document.getElementById('product-id').value = product ? product.id : '';
    hideFormAlert();

    // Auto-slug from name
    const nameInput = document.getElementById('p-name');
    const slugInput = document.getElementById('p-slug');
    nameInput?.addEventListener('input', () => {
      if (!editingProductId) {
        slugInput.value = toSlug(nameInput.value);
      }
    });

    // Image preview
    const imgInput = document.getElementById('p-image-url');
    imgInput?.addEventListener('input', () => updateImagePreview(imgInput.value));

    // Populate dropdowns
    populateCategoryDropdown('p-category');
    renderAffiliateLinksForm([]);

    if (product) {
      // Fill existing values
      setVal('p-name',           product.name || '');
      setVal('p-slug',           product.slug || '');
      setVal('p-description',    product.description || '');
      setVal('p-category',       product.category_id || '');
      setVal('p-price',          product.price || '');
      setVal('p-original-price', product.original_price || '');
      setVal('p-currency',       product.currency || 'INR');
      setVal('p-badge',          product.badge || '');
      setVal('p-image-url',      product.image_url || '');
      setVal('p-image-alt',      product.image_alt || '');
      setVal('p-stock-status',   product.stock_status || 'in_stock');
      setChecked('p-is-published', product.is_published);
      setChecked('p-is-featured',  product.is_featured);
      updateImagePreview(product.image_url);
    } else {
      setChecked('p-is-published', false);
      setChecked('p-is-featured',  false);
      updateImagePreview('');
    }

    // Load existing affiliate links if editing
    if (product) {
      loadAffiliateLinksForProduct(product.id);
    } else {
      renderAffiliateLinksForm([]);
    }
  }

  async function loadProductForEdit(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      initProductForm(data);
    } catch (e) {
      showToast('Product load nahi hua: ' + e.message, 'error');
    }
  }

  async function loadAffiliateLinksForProduct(productId) {
    try {
      const { data, error } = await supabase
        .from('product_affiliate_links')
        .select('store_id, affiliate_url, display_price, is_active')
        .eq('product_id', productId);
      if (error) throw error;
      renderAffiliateLinksForm(data || []);
    } catch (e) {
      console.warn('[Admin] Affiliate links load:', e.message);
      renderAffiliateLinksForm([]);
    }
  }

  function renderAffiliateLinksForm(existingLinks) {
    const container = document.getElementById('affiliate-links-container');
    if (!container) return;

    if (allStores.length === 0) {
      container.innerHTML = '<p class="text-muted text-sm">Pehle stores add karein (Stores & Links page).</p>';
      return;
    }

    const activeStores = allStores.filter(s => s.is_active);
    container.innerHTML = activeStores.map(store => {
      const existing = existingLinks.find(l => l.store_id === store.id);
      const url = existing ? escapeHtml(existing.affiliate_url || '') : '';
      return `
        <div class="affiliate-link-row">
          <div class="affiliate-store-name">${escapeHtml(store.name)}</div>
          <div class="affiliate-link-input">
            <input
              type="url"
              class="form-input affiliate-url-input"
              data-store-id="${store.id}"
              placeholder="https://amzn.to/your-affiliate-link"
              value="${url}"
              aria-label="${escapeHtml(store.name)} affiliate URL"
            />
            <span class="form-hint">${store.name} affiliate link (optional)</span>
          </div>
        </div>`;
    }).join('');
  }

  // Product form submit
  document.getElementById('product-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await saveProduct(true);
  });

  document.getElementById('save-draft-btn')?.addEventListener('click', async () => {
    setChecked('p-is-published', false);
    await saveProduct(false);
  });

  document.getElementById('cancel-product-btn')?.addEventListener('click', () => navigateTo('products'));
  document.getElementById('cancel-product-btn2')?.addEventListener('click', () => navigateTo('products'));

  async function saveProduct(publish) {
    hideFormAlert();
    if (!validateProductForm()) return;

    // Override publish toggle if caller specifies
    if (publish === false) {
      setChecked('p-is-published', false);
    }

    const saveBtn = document.getElementById('save-product-btn');
    saveBtn.disabled = true;
    const origText = saveBtn.textContent;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
      const payload = {
        name:           getVal('p-name').trim(),
        slug:           getVal('p-slug').trim(),
        description:    getVal('p-description').trim() || null,
        category_id:    getVal('p-category') || null,
        price:          parseFloat(getVal('p-price')),
        original_price: parseFloat(getVal('p-original-price')) || null,
        currency:       getVal('p-currency') || 'INR',
        image_url:      sanitizeUrl(getVal('p-image-url')) || null,
        image_alt:      getVal('p-image-alt').trim() || null,
        badge:          getVal('p-badge') || null,
        stock_status:   getVal('p-stock-status') || 'in_stock',
        is_published:   document.getElementById('p-is-published').checked,
        is_featured:    document.getElementById('p-is-featured').checked,
      };

      let productId = editingProductId;

      if (productId) {
        // Update
        const { error } = await supabase.from('products').update(payload).eq('id', productId);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
        editingProductId = productId;
        document.getElementById('product-id').value = productId;
      }

      // Save affiliate links
      await saveAffiliateLinks(productId);

      showFormAlert('success', `✅ Product ${editingProductId ? 'update' : 'add'} ho gaya!`);
      showToast(`Product "${payload.name.substring(0,30)}" save ho gaya! ✅`, 'success');

    } catch (e) {
      const userMsg = translateDbError(e.message);
      showFormAlert('error', `❌ ${userMsg}`);
      showToast('Save failed: ' + userMsg, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  }

  async function saveAffiliateLinks(productId) {
    const inputs = document.querySelectorAll('.affiliate-url-input');
    const toUpsert = [];
    const toDelete = [];

    inputs.forEach(input => {
      const storeId = input.dataset.storeId;
      const url     = input.value.trim();
      if (url && sanitizeUrl(url)) {
        toUpsert.push({ product_id: productId, store_id: storeId, affiliate_url: url, is_active: true });
      } else if (!url) {
        toDelete.push(storeId);
      }
    });

    // Delete cleared links
    if (toDelete.length > 0) {
      await supabase
        .from('product_affiliate_links')
        .delete()
        .eq('product_id', productId)
        .in('store_id', toDelete);
    }

    // Upsert active links
    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('product_affiliate_links')
        .upsert(toUpsert, { onConflict: 'product_id,store_id' });
      if (error) throw error;
    }
  }

  function validateProductForm() {
    let valid = true;

    const nameVal = getVal('p-name').trim();
    if (!nameVal) {
      setFieldError('p-name', 'p-name-err', 'Product name zaroori hai.');
      valid = false;
    } else clearFieldError('p-name', 'p-name-err');

    const slugVal = getVal('p-slug').trim();
    if (!slugVal || !/^[a-z0-9-]+$/.test(slugVal)) {
      setFieldError('p-slug', 'p-slug-err', 'Slug sirf lowercase letters, numbers, aur hyphens hone chahiye.');
      valid = false;
    } else clearFieldError('p-slug', 'p-slug-err');

    const price = parseFloat(getVal('p-price'));
    if (isNaN(price) || price < 0) {
      setFieldError('p-price', 'p-price-err', 'Valid price daalo (0 ya usse zyada).');
      valid = false;
    } else clearFieldError('p-price', 'p-price-err');

    const imgUrl = getVal('p-image-url').trim();
    if (imgUrl && !sanitizeUrl(imgUrl)) {
      setFieldError('p-image-url', 'p-image-url-err', 'Image URL valid nahi hai (https:// se shuru hona chahiye).');
      valid = false;
    } else clearFieldError('p-image-url', 'p-image-url-err');

    // Validate affiliate URLs
    document.querySelectorAll('.affiliate-url-input').forEach(input => {
      const url = input.value.trim();
      if (url && !sanitizeUrl(url)) {
        input.classList.add('has-error');
        valid = false;
      } else {
        input.classList.remove('has-error');
      }
    });

    return valid;
  }

  // ────────────────────────────────────────────────────────────
  // 11. CATEGORIES
  // ────────────────────────────────────────────────────────────
  async function loadCategories() {
    const listEl = document.getElementById('categories-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="page-loading"><div class="spinner"></div> Loading…</div>';

    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      allCategories = data || [];
      renderCategoriesGrid();
      populateCategoryDropdown('p-category');
      populateCategoryDropdown('products-filter-category', true);
    } catch (e) {
      listEl.innerHTML = `<div class="alert alert-danger">⚠️ ${escapeHtml(e.message)}</div>`;
    }
  }

  function renderCategoriesGrid() {
    const listEl = document.getElementById('categories-list');
    if (!listEl) return;
    if (allCategories.length === 0) {
      listEl.innerHTML = '<div class="table-empty"><div class="icon">🏷️</div>Koi category nahi. Add karein!</div>';
      return;
    }
    listEl.innerHTML = allCategories.map(c => `
      <div class="item-card">
        <div class="item-card-icon">🏷️</div>
        <div class="item-card-info">
          <div class="item-card-name">${escapeHtml(c.name)}</div>
          <div class="item-card-slug">${escapeHtml(c.slug)}</div>
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-xs" data-cat-action="edit" data-cat-id="${c.id}">✏️ Edit</button>
            <button class="btn btn-danger btn-xs" data-cat-action="delete" data-cat-id="${c.id}" data-cat-name="${escapeHtml(c.name)}">🗑️</button>
            <span class="badge ${c.is_active ? 'badge-published' : 'badge-draft'}">${c.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>`).join('');
  }

  document.getElementById('add-category-btn')?.addEventListener('click', () => {
    const wrap = document.getElementById('cat-form-wrap');
    wrap?.classList.toggle('hidden');
    if (!wrap?.classList.contains('hidden')) {
      clearCatForm();
      document.getElementById('cat-name')?.focus();
    }
  });

  document.getElementById('cancel-cat-btn')?.addEventListener('click', () => {
    document.getElementById('cat-form-wrap')?.classList.add('hidden');
  });

  document.getElementById('save-cat-btn')?.addEventListener('click', saveCategory);

  document.getElementById('categories-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-cat-action]');
    if (!btn) return;
    const { catAction, catId, catName } = btn.dataset;
    if (catAction === 'edit') editCategory(catId);
    if (catAction === 'delete') {
      confirmDialog({
        icon: '🗑️', title: 'Delete Category?',
        desc: `"${catName}" delete ho jayegi. Products uncategorized ho jayenge.`,
        okLabel: 'Delete Karo', okClass: 'btn-danger',
        onOk: () => deleteCategory(catId),
      });
    }
  });

  async function saveCategory() {
    const id    = document.getElementById('cat-id').value;
    const name  = document.getElementById('cat-name').value.trim();
    const slug  = document.getElementById('cat-slug').value.trim();
    const img   = document.getElementById('cat-image').value.trim();
    const active = document.getElementById('cat-active').checked;

    if (!name || !slug) { showAlert('cat-form-alert','danger','Name aur Slug zaroori hain.'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { showAlert('cat-form-alert','danger','Slug mein sirf lowercase, numbers, hyphens allowed hain.'); return; }

    const payload = { name, slug, is_active: active, image_url: sanitizeUrl(img) || null };
    try {
      if (id) {
        const { error } = await supabase.from('categories').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
      showToast('Category save ho gayi! ✅', 'success');
      document.getElementById('cat-form-wrap')?.classList.add('hidden');
      await loadCategories();
    } catch (e) {
      showAlert('cat-form-alert', 'danger', translateDbError(e.message));
    }
  }

  function editCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('cat-id').value     = cat.id;
    document.getElementById('cat-name').value   = cat.name;
    document.getElementById('cat-slug').value   = cat.slug;
    document.getElementById('cat-image').value  = cat.image_url || '';
    document.getElementById('cat-active').checked = cat.is_active;
    document.getElementById('cat-form-wrap')?.classList.remove('hidden');
    document.getElementById('cat-name')?.focus();
  }

  function clearCatForm() {
    document.getElementById('cat-id').value    = '';
    document.getElementById('cat-name').value  = '';
    document.getElementById('cat-slug').value  = '';
    document.getElementById('cat-image').value = '';
    document.getElementById('cat-active').checked = true;
  }

  async function deleteCategory(id) {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      showToast('Category delete ho gayi! 🗑️', 'success');
      await loadCategories();
    } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
  }

  // Auto-slug for category name
  document.getElementById('cat-name')?.addEventListener('input', e => {
    const slugEl = document.getElementById('cat-slug');
    if (!document.getElementById('cat-id').value) {
      slugEl.value = toSlug(e.target.value);
    }
  });

  // ────────────────────────────────────────────────────────────
  // 12. STORES
  // ────────────────────────────────────────────────────────────
  async function loadStores() {
    const listEl = document.getElementById('stores-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="page-loading"><div class="spinner"></div> Loading…</div>';

    try {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      if (error) throw error;
      allStores = data || [];
      renderStoresGrid();
    } catch (e) {
      listEl.innerHTML = `<div class="alert alert-danger">⚠️ ${escapeHtml(e.message)}</div>`;
    }
  }

  function renderStoresGrid() {
    const listEl = document.getElementById('stores-list');
    if (!listEl) return;
    if (allStores.length === 0) {
      listEl.innerHTML = '<div class="table-empty"><div class="icon">🏪</div>Koi store nahi. Add karein!</div>';
      return;
    }
    listEl.innerHTML = allStores.map(s => `
      <div class="item-card">
        <div class="item-card-icon">🏪</div>
        <div class="item-card-info">
          <div class="item-card-name">${escapeHtml(s.name)}</div>
          <div class="item-card-slug">${escapeHtml(s.slug)}</div>
          ${s.website_url ? `<div style="font-size:.7rem;color:var(--clr-muted);margin-top:.2rem;">${escapeHtml(s.website_url)}</div>` : ''}
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-xs" data-store-action="edit" data-store-id="${s.id}">✏️ Edit</button>
            <button class="btn btn-danger btn-xs" data-store-action="delete" data-store-id="${s.id}" data-store-name="${escapeHtml(s.name)}">🗑️</button>
            <span class="badge ${s.is_active ? 'badge-published' : 'badge-draft'}">${s.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>`).join('');
  }

  document.getElementById('add-store-btn')?.addEventListener('click', () => {
    const wrap = document.getElementById('store-form-wrap');
    wrap?.classList.toggle('hidden');
    if (!wrap?.classList.contains('hidden')) {
      clearStoreForm();
      document.getElementById('store-name')?.focus();
    }
  });

  document.getElementById('cancel-store-btn')?.addEventListener('click', () => {
    document.getElementById('store-form-wrap')?.classList.add('hidden');
  });

  document.getElementById('save-store-btn')?.addEventListener('click', saveStore);

  document.getElementById('stores-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-store-action]');
    if (!btn) return;
    const { storeAction, storeId, storeName } = btn.dataset;
    if (storeAction === 'edit') editStore(storeId);
    if (storeAction === 'delete') {
      confirmDialog({
        icon: '🗑️', title: 'Delete Store?',
        desc: `"${storeName}" delete ho jayega. Isse jude sare affiliate links bhi delete ho jayenge.`,
        okLabel: 'Delete Karo', okClass: 'btn-danger',
        onOk: () => deleteStore(storeId),
      });
    }
  });

  async function saveStore() {
    const id      = document.getElementById('store-id').value;
    const name    = document.getElementById('store-name').value.trim();
    const slug    = document.getElementById('store-slug').value.trim();
    const website = document.getElementById('store-website').value.trim();
    const logo    = document.getElementById('store-logo').value.trim();
    const active  = document.getElementById('store-active').checked;

    if (!name || !slug) { showAlert('store-form-alert','danger','Name aur Slug zaroori hain.'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { showAlert('store-form-alert','danger','Slug mein sirf lowercase, numbers, hyphens allowed.'); return; }

    const payload = { name, slug, is_active: active, website_url: sanitizeUrl(website)||null, logo_url: sanitizeUrl(logo)||null };
    try {
      if (id) {
        const { error } = await supabase.from('stores').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stores').insert(payload);
        if (error) throw error;
      }
      showToast('Store save ho gaya! ✅', 'success');
      document.getElementById('store-form-wrap')?.classList.add('hidden');
      await loadStores();
    } catch (e) {
      showAlert('store-form-alert', 'danger', translateDbError(e.message));
    }
  }

  function editStore(id) {
    const s = allStores.find(x => x.id === id);
    if (!s) return;
    document.getElementById('store-id').value      = s.id;
    document.getElementById('store-name').value    = s.name;
    document.getElementById('store-slug').value    = s.slug;
    document.getElementById('store-website').value = s.website_url || '';
    document.getElementById('store-logo').value    = s.logo_url || '';
    document.getElementById('store-active').checked = s.is_active;
    document.getElementById('store-form-wrap')?.classList.remove('hidden');
    document.getElementById('store-name')?.focus();
  }

  function clearStoreForm() {
    ['store-id','store-name','store-slug','store-website','store-logo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('store-active').checked = true;
  }

  async function deleteStore(id) {
    try {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
      showToast('Store delete ho gaya! 🗑️', 'success');
      await loadStores();
    } catch (e) { showToast('Delete failed: ' + e.message, 'error'); }
  }

  document.getElementById('store-name')?.addEventListener('input', e => {
    const slugEl = document.getElementById('store-slug');
    if (!document.getElementById('store-id').value) {
      slugEl.value = toSlug(e.target.value);
    }
  });

  // ────────────────────────────────────────────────────────────
  // 13. CONFIRM DIALOG
  // ────────────────────────────────────────────────────────────
  let _confirmCallback = null;

  function confirmDialog({ icon, title, desc, okLabel='Delete', okClass='btn-danger', onOk }) {
    confirmIcon.textContent  = icon || '⚠️';
    confirmTitle.textContent = title;
    confirmDesc.textContent  = desc;
    confirmOkBtn.textContent = okLabel;
    confirmOkBtn.className   = `btn ${okClass}`;
    _confirmCallback = onOk;
    confirmOverlay.classList.add('open');
    confirmOverlay.removeAttribute('aria-hidden');
    confirmCancelBtn.focus();
  }

  function closeConfirm() {
    confirmOverlay.classList.remove('open');
    confirmOverlay.setAttribute('aria-hidden','true');
    _confirmCallback = null;
  }

  confirmCancelBtn?.addEventListener('click', closeConfirm);
  confirmOkBtn?.addEventListener('click', () => {
    if (_confirmCallback) _confirmCallback();
    closeConfirm();
  });
  confirmOverlay?.addEventListener('click', e => { if (e.target===confirmOverlay) closeConfirm(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeConfirm(); });

  // ────────────────────────────────────────────────────────────
  // 14. UTILITIES
  // ────────────────────────────────────────────────────────────
  function showToast(msg, type='info', duration=3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.setAttribute('role','alert');
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    t.innerHTML = `<span>${icons[type]||''}</span><span>${escapeHtml(msg)}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, duration);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const u = new URL(url.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return url.trim();
    } catch { return null; }
  }

  function formatPrice(n) {
    if (n===null||n===undefined) return '—';
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:2 });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }

  function toSlug(str) {
    return str.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
  }

  function getVal(id) { return document.getElementById(id)?.value || ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
  function setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  function setFieldError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('has-error');
    const err = document.getElementById(errId);
    if (err) { err.textContent = msg; err.classList.remove('hidden'); }
  }

  function clearFieldError(inputId, errId) {
    document.getElementById(inputId)?.classList.remove('has-error');
    const err = document.getElementById(errId);
    if (err) { err.textContent = ''; err.classList.add('hidden'); }
  }

  function showFormAlert(type, msg) {
    const el = document.getElementById('product-form-alert');
    if (!el) return;
    const cls = type === 'success' ? 'alert-success' : 'alert-danger';
    el.className = `alert ${cls}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function hideFormAlert() {
    const el = document.getElementById('product-form-alert');
    if (el) { el.classList.add('hidden'); el.className = 'hidden'; }
  }

  function showAlert(elId, type, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    const cls = { success:'alert-success', danger:'alert-danger', warning:'alert-warning', info:'alert-info' };
    el.className = `alert ${cls[type]||'alert-info'}`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function updateImagePreview(url) {
    const wrap = document.getElementById('image-preview-wrap');
    if (!wrap) return;
    const safe = sanitizeUrl(url);
    if (safe) {
      wrap.innerHTML = `<img src="${safe}" alt="Preview" onerror="this.parentElement.innerHTML='<div class=image-preview-placeholder>Image load nahi hui. URL check karein.</div>'" />`;
    } else {
      wrap.innerHTML = '<div class="image-preview-placeholder">Image preview appears here</div>';
    }
  }

  function translateDbError(msg) {
    if (!msg) return 'Unknown error';
    if (msg.includes('duplicate') || msg.includes('unique'))
      return 'Yeh record already exist karta hai (duplicate slug/name).';
    if (msg.includes('violates foreign key'))
      return 'Referenced category/store exist nahi karta.';
    if (msg.includes('violates check constraint') && msg.includes('price'))
      return 'Price negative nahi ho sakta.';
    if (msg.includes('row-level security') || msg.includes('not authorized'))
      return 'Aapke paas yeh action karne ki permission nahi hai.';
    if (msg.includes('network') || msg.includes('fetch'))
      return 'Network error. Connection check karein.';
    return msg;
  }

  function showConfigError() {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;color:#f0f0f0;padding:2rem;">
        <div style="max-width:500px;text-align:center;">
          <div style="font-size:3rem;margin-bottom:1rem;">⚙️</div>
          <h1 style="font-size:1.4rem;font-weight:800;margin-bottom:.75rem;color:#a3e635;">Supabase Configure Nahi Hua</h1>
          <p style="color:#888;line-height:1.7;">
            <code>supabase-config.js</code> file mein apna Supabase Project URL aur Anon Key daalo.<br><br>
            Details ke liye <strong>README-ADMIN-HINGLISH.md</strong> dekhein.
          </p>
        </div>
      </div>`;
  }

  // ────────────────────────────────────────────────────────────
  // BOOT
  // ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

