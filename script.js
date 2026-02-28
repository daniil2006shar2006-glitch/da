(function () {
  'use strict';

  const STORAGE_VOLUNTEERS = 'ldpr_volunteers';
  const STORAGE_EVENTS = 'ldpr_events';
  const STORAGE_USERS = 'ldpr_users';
  const STORAGE_CURRENT_USER = 'ldpr_current_user';
  const STORAGE_APPLICATIONS = 'ldpr_applications';
  const STORAGE_THEME = 'ldpr_theme';
  const STORAGE_EVENT_PARTICIPATIONS = 'ldpr_event_participations';
  const STORAGE_LAST_ADMIN_SECTION = 'ldpr_last_admin_section';
  const STORAGE_LAST_VOLUNTEER_SECTION = 'ldpr_last_volunteer_section';

  var DB_BACKUP_KEYS = [STORAGE_VOLUNTEERS, STORAGE_EVENTS, STORAGE_USERS, STORAGE_APPLICATIONS, STORAGE_THEME, STORAGE_EVENT_PARTICIPATIONS];

  var ldprCache = { users: [], volunteers: [], events: [], applications: [], event_participations: [] };
  var ldprSupabase = null;

  function mapRowFromDb(row) {
    if (!row) return row;
    var r = {};
    for (var k in row) {
      var key = k.replace(/_([a-z])/g, function(_, c) { return c.toUpperCase(); });
      r[key] = row[k];
    }
    return r;
  }
  function mapRowToDb(obj) {
    if (!obj) return obj;
    var r = {};
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var key = k.replace(/[A-Z]/g, function(c) { return '_' + c.toLowerCase(); }).replace(/^_/, '');
      r[key] = obj[k];
    }
    return r;
  }
  function loadFromLocalStorage() {
    try {
      ldprCache.users = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
      ldprCache.volunteers = JSON.parse(localStorage.getItem(STORAGE_VOLUNTEERS) || '[]');
      ldprCache.events = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]');
      ldprCache.applications = JSON.parse(localStorage.getItem(STORAGE_APPLICATIONS) || '[]');
      ldprCache.event_participations = JSON.parse(localStorage.getItem(STORAGE_EVENT_PARTICIPATIONS) || '[]');
    } catch (e) { console.warn('loadFromLocalStorage', e); }
  }
  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(ldprCache.users));
      localStorage.setItem(STORAGE_VOLUNTEERS, JSON.stringify(ldprCache.volunteers));
      localStorage.setItem(STORAGE_EVENTS, JSON.stringify(ldprCache.events));
      localStorage.setItem(STORAGE_APPLICATIONS, JSON.stringify(ldprCache.applications));
      localStorage.setItem(STORAGE_EVENT_PARTICIPATIONS, JSON.stringify(ldprCache.event_participations));
    } catch (e) { console.warn('saveToLocalStorage', e); }
  }
  async function loadFromSupabase() {
    var config = window.ldprSupabaseConfig;
    if (!config || !config.url || !config.anonKey) return false;
    if (typeof window.supabase === 'undefined') return false;
    try {
      ldprSupabase = window.supabase.createClient(config.url, config.anonKey);
      var tables = ['users', 'volunteers', 'events', 'applications', 'event_participations'];
      var keys = ['users', 'volunteers', 'events', 'applications', 'event_participations'];
      for (var i = 0; i < tables.length; i++) {
        var res = await ldprSupabase.from(tables[i]).select('*');
        var rows = (res.data || []).map(mapRowFromDb);
        ldprCache[keys[i]] = Array.isArray(rows) ? rows : [];
      }
      return true;
    } catch (e) {
      console.warn('loadFromSupabase', e);
      return false;
    }
  }
  function syncToSupabase(table, list) {
    if (!ldprSupabase || !list) return;
    var rows = list.map(mapRowToDb);
    ldprSupabase.from(table).upsert(rows, { onConflict: 'id' }).then(function() {}, function(err) { console.warn('syncToSupabase', table, err); });
  }

  loadFromLocalStorage();

  function exportDatabase() {
    var data = {};
    DB_BACKUP_KEYS.forEach(function(k) { data[k] = localStorage.getItem(k); });
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ldpr_database_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importDatabase(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var data = JSON.parse(reader.result);
        if (typeof data !== 'object' || data === null) throw new Error('Неверный формат');
        DB_BACKUP_KEYS.forEach(function(k) {
          if (data.hasOwnProperty(k) && data[k] != null) localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
        });
        alert('База данных восстановлена. Страница будет перезагружена.');
        location.reload();
      } catch (e) {
        alert('Ошибка при загрузке файла: ' + (e.message || 'неверный формат'));
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  document.getElementById('db-export-btn')?.addEventListener('click', exportDatabase);
  document.getElementById('db-import-input')?.addEventListener('change', function() {
    var file = this.files && this.files[0];
    importDatabase(file);
    this.value = '';
  });

  function getEventParticipations() {
    return Array.isArray(ldprCache.event_participations) ? ldprCache.event_participations : [];
  }

  function setEventParticipations(list) {
    ldprCache.event_participations = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_EVENT_PARTICIPATIONS, JSON.stringify(ldprCache.event_participations)); } catch (e) {}
    syncToSupabase('event_participations', ldprCache.event_participations);
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_THEME, theme); } catch (e) {}
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  document.querySelectorAll('.theme-toggle').forEach(function(btn) {
    btn.addEventListener('click', toggleTheme);
  });

  function getUsers() {
    return Array.isArray(ldprCache.users) ? ldprCache.users : [];
  }

  function setUsers(list) {
    ldprCache.users = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_USERS, JSON.stringify(ldprCache.users)); } catch (e) {}
    syncToSupabase('users', ldprCache.users);
  }

  function ensureSuperadmin() {
    const users = getUsers();
    const hasSuperadmin = users.some(u => (u.login || u.email) === 'admin@ldpr.ru');
    if (!hasSuperadmin) {
      users.push({
        id: 'superadmin',
        name: 'Шарапов Даниил Сергеевич',
        login: 'admin@ldpr.ru',
        email: 'admin@ldpr.ru',
        password: '24680988',
        role: 'superadmin',
        createdAt: new Date().toISOString()
      });
      setUsers(users);
    }
  }
  function ensureSuperadminSync() {
    var users = getUsers();
    var hasSuperadmin = users.some(function(u) { return (u.login || u.email) === 'admin@ldpr.ru'; });
    if (!hasSuperadmin) {
      users.push({
        id: 'superadmin',
        name: 'Шарапов Даниил Сергеевич',
        login: 'admin@ldpr.ru',
        email: 'admin@ldpr.ru',
        password: '24680988',
        role: 'superadmin',
        createdAt: new Date().toISOString()
      });
      setUsers(users);
    }
  }

  function removeSpecificAdminOnce() {
    var users = getUsers();
    var email = 'daniil2006shar2006@gmail.com';
    var filtered = users.filter(function(u) {
      if (u.role !== 'admin') return true;
      if ((u.email || u.login || '').toLowerCase() === email.toLowerCase()) return false;
      return true;
    });
    if (filtered.length < users.length) setUsers(filtered);
  }

  function getCurrentUser() {
    try {
      const data = sessionStorage.getItem(STORAGE_CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      sessionStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_CURRENT_USER);
    }
  }

  function getApplications() {
    return Array.isArray(ldprCache.applications) ? ldprCache.applications : [];
  }

  function setApplications(list) {
    ldprCache.applications = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_APPLICATIONS, JSON.stringify(ldprCache.applications)); } catch (e) {}
    syncToSupabase('applications', ldprCache.applications);
  }

  function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('volunteer-app-container').classList.add('hidden');
    const ap = document.getElementById('admin-pending-container');
    if (ap) ap.classList.add('hidden');
  }

  function showAdminApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('volunteer-app-container').classList.add('hidden');
    const ap = document.getElementById('admin-pending-container');
    if (ap) ap.classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    const user = getCurrentUser();
    const isSuperadmin = user && user.role === 'superadmin';
    document.querySelectorAll('.nav-link-superadmin').forEach(el => {
      el.style.display = isSuperadmin ? '' : 'none';
    });
    document.querySelectorAll('.section-superadmin').forEach(el => {
      el.style.display = isSuperadmin ? '' : 'none';
    });
    const savedSection = sessionStorage.getItem(STORAGE_LAST_ADMIN_SECTION);
    var hash = location.hash || (savedSection && document.querySelector(savedSection) ? savedSection : null) || '#dashboard';
    hash = hash === '#admin-requests' ? '#administrators' : hash === '#applications' ? '#volunteers' : hash === '#event-participations' ? '#events' : hash;
    if (!document.querySelector(hash)) hash = '#dashboard';
    if (hash && !location.hash) location.hash = hash;
    if (document.querySelector(hash)) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelector(hash).classList.add('active');
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === hash);
      });
    }
    if (hash === '#volunteers') {
      if (typeof renderVolunteers === 'function') renderVolunteers();
      if (typeof renderApplications === 'function') renderApplications();
    }
    if (hash === '#administrators') {
      if (typeof renderAdministrators === 'function') renderAdministrators();
      if (typeof renderAdminRequests === 'function') renderAdminRequests();
    }
    if (hash === '#events') {
      if (typeof renderEvents === 'function') renderEvents();
      if (typeof renderEventParticipationsPage === 'function') renderEventParticipationsPage();
    }
    if (typeof updateDashboard === 'function') updateDashboard();
    updateHeaderAvatar();
  }

  function showVolunteerApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('volunteer-app-container').classList.remove('hidden');
    const ap = document.getElementById('admin-pending-container');
    if (ap) ap.classList.add('hidden');
    if (typeof renderVolunteerBlock === 'function') renderVolunteerBlock();
    var savedSection = sessionStorage.getItem(STORAGE_LAST_VOLUNTEER_SECTION);
    updateHeaderAvatar();
    if (typeof renderVolunteerEventsList === 'function') renderVolunteerEventsList();
    if (savedSection === 'volunteer-events' && document.getElementById('volunteer-events') && document.getElementById('volunteer-nav').style.display !== 'none') {
      document.querySelectorAll('.volunteer-section').forEach(function(s) {
        s.style.display = s.id === 'volunteer-events' ? 'block' : 'none';
      });
      document.querySelectorAll('.volunteer-nav-link').forEach(function(l) {
        l.classList.toggle('active', l.getAttribute('href') === '#volunteer-events');
      });
      if (typeof renderVolunteerEventsList === 'function') renderVolunteerEventsList();
    }
  }

  function showAdminPendingScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('volunteer-app-container').classList.add('hidden');
    document.getElementById('admin-pending-container').classList.remove('hidden');
    updateHeaderAvatar();
  }

  function showApp() {
    const user = getCurrentUser();
    if (!user) {
      showAuthScreen();
      return;
    }
    if (user.role === 'admin_pending') {
      showAdminPendingScreen();
    } else if (user.role === 'volunteer') {
      showVolunteerApp();
    } else {
      showAdminApp();
    }
  }

  // --- Вкладки Вход / Регистрация ---
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('form-' + tabName).classList.add('active');
      document.getElementById('login-error').textContent = '';
      document.getElementById('register-error').textContent = '';
    });
  });

  // --- Форма входа ---
  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const login = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const users = getUsers();
    const user = users.find(u => (u.login || u.email) === login && u.password === password);
    if (!user) {
      errEl.textContent = 'Неверный email или пароль.';
      return;
    }
    errEl.textContent = '';
    setCurrentUser({ id: user.id, login: user.login || user.email, name: user.name, role: user.role || 'volunteer' });
    showApp();
    updateHeaderAvatar();
  });

  // --- Форма регистрации ---
  function imageFileToBase64(file, maxSize) {
    maxSize = maxSize || 128;
    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        if (w > h) { canvas.width = maxSize; canvas.height = Math.round(maxSize * h / w); } else { canvas.height = maxSize; canvas.width = Math.round(maxSize * w / h); }
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Не удалось загрузить изображение')); };
      img.src = url;
    });
  }

  document.getElementById('register-avatar').addEventListener('change', function() {
    var preview = document.getElementById('register-avatar-preview');
    preview.innerHTML = '';
    var file = this.files[0];
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Превью';
      img.className = 'avatar-preview-img';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    const name = document.getElementById('register-name').value.trim();
    const login = document.getElementById('register-email').value.trim();
    const phone = (document.getElementById('register-phone') || {}).value.trim();
    if (phone && !isPhoneValid(phone)) {
      errEl.textContent = 'Введите номер телефона: не менее 11 цифр (например +79991234567).';
      return;
    }
    const password = document.getElementById('register-password').value;
    const password2 = document.getElementById('register-password2').value;
    if (password !== password2) {
      errEl.textContent = 'Пароли не совпадают.';
      return;
    }
    if (password.length < 4) {
      errEl.textContent = 'Пароль должен быть не менее 4 символов.';
      return;
    }
    const users = getUsers();
    if (users.some(u => (u.login || u.email) === login)) {
      errEl.textContent = 'Пользователь с такой почтой уже зарегистрирован.';
      return;
    }
    const roleRaw = (document.getElementById('register-role') || {}).value || 'volunteer';
    const userId = 'u_' + Date.now();
    const role = roleRaw === 'admin' ? 'admin_pending' : roleRaw;
    const avatarInput = document.getElementById('register-avatar');
    const avatarFile = avatarInput && avatarInput.files && avatarInput.files[0];

    function finishRegister(avatarData) {
      const newUser = {
        id: userId,
        name: name || login,
        login: login,
        password: password,
        role: role,
        createdAt: new Date().toISOString()
      };
      if (phone) newUser.phone = phone;
      if (avatarData) newUser.avatar = avatarData;
      users.push(newUser);
      setUsers(users);
      errEl.textContent = '';
      setCurrentUser({ id: userId, login: login, name: name || login, role: role });
      showApp();
      updateHeaderAvatar();
    }

    if (avatarFile && avatarFile.type.match(/^image\//)) {
      imageFileToBase64(avatarFile, 128).then(function(avatarData) {
        finishRegister(avatarData);
      }).catch(function() {
        finishRegister(null);
      });
    } else {
      finishRegister(null);
    }
  });

  function updateHeaderAvatar() {
    var user = getCurrentUser();
    var avatarData = null;
    if (user && user.id) {
      var users = getUsers();
      var fullUser = users.find(function(u) { return u.id === user.id; });
      if (fullUser && fullUser.avatar) avatarData = fullUser.avatar;
    }
    var ids = ['header-avatar-admin', 'header-avatar-volunteer', 'header-avatar-admin-pending'];
    ids.forEach(function(id) {
      var wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.innerHTML = '';
      if (avatarData) {
        var img = document.createElement('img');
        img.src = avatarData;
        img.alt = 'Аватар';
        img.className = 'header-avatar-img';
        wrap.appendChild(img);
      } else if (user && user.name) {
        var letter = document.createElement('span');
        letter.className = 'header-avatar-letter';
        letter.textContent = (user.name.charAt(0) || user.login.charAt(0) || '?').toUpperCase();
        wrap.appendChild(letter);
      }
    });
  }

  // --- Выход ---
  function doLogout() {
    setCurrentUser(null);
    showAuthScreen();
    document.getElementById('login-password').value = '';
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = '';
  }
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-logout-volunteer').addEventListener('click', doLogout);
  document.getElementById('btn-logout-admin-pending').addEventListener('click', doLogout);

  async function initApp() {
    try {
      var fromSupabase = await loadFromSupabase();
      if (fromSupabase) saveToLocalStorage();
      ensureSuperadminSync();
      removeSpecificAdminOnce();
      if (getCurrentUser()) showApp(); else showAuthScreen();
    } catch (e) {
      console.warn('initApp', e);
      ensureSuperadminSync();
      if (getCurrentUser()) showApp(); else showAuthScreen();
    }
  }
  initApp();

  function getVolunteers() {
    return Array.isArray(ldprCache.volunteers) ? ldprCache.volunteers : [];
  }

  function setVolunteers(list) {
    ldprCache.volunteers = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_VOLUNTEERS, JSON.stringify(ldprCache.volunteers)); } catch (e) {}
    syncToSupabase('volunteers', ldprCache.volunteers);
  }

  function getEvents() {
    return Array.isArray(ldprCache.events) ? ldprCache.events : [];
  }

  function setEvents(list) {
    ldprCache.events = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_EVENTS, JSON.stringify(ldprCache.events)); } catch (e) {}
    syncToSupabase('events', ldprCache.events);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatPhoneInput(value) {
    var digits = (value || '').replace(/\D/g, '');
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    return digits.length ? '+7' + digits.slice(1) : '';
  }

  function isPhoneValid(phone) {
    var digits = (phone || '').replace(/\D/g, '');
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    return digits.length >= 11;
  }

  function bindPhoneInput(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('maxlength', '12');
    el.addEventListener('input', function() {
      var start = this.selectionStart;
      var formatted = formatPhoneInput(this.value);
      this.value = formatted;
      var newStart = Math.min(start, formatted.length);
      this.setSelectionRange(newStart, newStart);
    });
    el.addEventListener('paste', function(e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData('text');
      this.value = formatPhoneInput(this.value + pasted);
    });
  }

  // --- Навигация ---
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-link');

  function showSection(id) {
    const target = document.querySelector(id);
    if (!target) return;
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === id);
    });
    target.classList.add('active');
    try { sessionStorage.setItem(STORAGE_LAST_ADMIN_SECTION, id); } catch (e) {}
    if (id === '#volunteers') {
      if (typeof renderVolunteers === 'function') renderVolunteers();
      if (typeof renderApplications === 'function') renderApplications();
    }
    if (id === '#administrators') {
      if (typeof renderAdministrators === 'function') renderAdministrators();
      if (typeof renderAdminRequests === 'function') renderAdminRequests();
    }
    if (id === '#events') {
      if (typeof renderEvents === 'function') renderEvents();
      if (typeof renderEventParticipationsPage === 'function') renderEventParticipationsPage();
    }
    if (id === '#reports' && typeof renderReports === 'function') renderReports();
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      var href = link.getAttribute('href');
      location.hash = href;
      showSection(href);
    });
  });

  function mapSectionId(id) {
    return id === '#admin-requests' ? '#administrators' : id === '#applications' ? '#volunteers' : id === '#event-participations' ? '#events' : id;
  }
  var sectionId = location.hash || sessionStorage.getItem(STORAGE_LAST_ADMIN_SECTION) || '#dashboard';
  sectionId = mapSectionId(sectionId);
  if (!document.querySelector(sectionId)) sectionId = '#dashboard';
  location.hash = sectionId;
  showSection(sectionId);

  window.addEventListener('hashchange', () => {
    if (location.hash) showSection(location.hash);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    var volunteerContainer = document.getElementById('volunteer-app-container');
    var eventsSection = document.getElementById('volunteer-events');
    if (volunteerContainer && !volunteerContainer.classList.contains('hidden') && eventsSection && eventsSection.style.display === 'block') {
      if (typeof renderVolunteerEventsList === 'function') renderVolunteerEventsList();
    }
  });

  // --- Модальные окна ---
  function openModal(id) {
    const modal = document.getElementById('modal-' + id);
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById('modal-' + id);
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-modal');
      if (id === 'volunteer') {
        document.getElementById('modal-volunteer-title').textContent = 'Добавить волонтёра';
        document.getElementById('form-volunteer').reset();
        document.getElementById('volunteer-id').value = '';
      }
      if (id === 'event') {
        document.getElementById('modal-event-title').textContent = 'Добавить мероприятие';
        document.getElementById('form-event').reset();
        document.getElementById('event-id').value = '';
        var prev = document.getElementById('event-image-preview');
        if (prev) prev.innerHTML = '';
        eventRemoveImage = false;
      }
      openModal(id);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.modal.is-open').forEach(m => {
        const id = m.id.replace('modal-', '');
        closeModal(id);
      });
    });
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
        const id = modal.id.replace('modal-', '');
        closeModal(id);
      }
    });
  });

  // --- Профиль ---
  var profileRemoveAvatar = false;

  function openProfileModal() {
    var user = getCurrentUser();
    if (!user) return;
    var users = getUsers();
    var full = users.find(function(u) { return u.id === user.id; });
    if (!full) return;
    document.getElementById('profile-name').value = full.name || '';
    document.getElementById('profile-email').value = full.login || full.email || '';
    document.getElementById('profile-phone').value = formatPhoneInput(full.phone || '');
    document.getElementById('profile-password-new').value = '';
    document.getElementById('profile-password-confirm').value = '';
    document.getElementById('profile-avatar').value = '';
    profileRemoveAvatar = false;
    var preview = document.getElementById('profile-avatar-preview');
    preview.innerHTML = '';
    if (full.avatar) {
      var img = document.createElement('img');
      img.src = full.avatar;
      img.alt = 'Текущий аватар';
      img.className = 'avatar-preview-img';
      preview.appendChild(img);
    }
    openModal('profile');
  }

  document.getElementById('header-avatar-admin').addEventListener('click', openProfileModal);
  document.getElementById('header-avatar-volunteer').addEventListener('click', openProfileModal);
  document.getElementById('header-avatar-admin-pending').addEventListener('click', openProfileModal);
  [].forEach.call(document.querySelectorAll('.header-avatar-btn'), function(el) {
    el.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfileModal(); } });
  });

  document.getElementById('profile-avatar').addEventListener('change', function() {
    profileRemoveAvatar = false;
    var preview = document.getElementById('profile-avatar-preview');
    preview.innerHTML = '';
    var file = this.files[0];
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Новый аватар';
      img.className = 'avatar-preview-img';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('profile-avatar-remove').addEventListener('click', function() {
    profileRemoveAvatar = true;
    document.getElementById('profile-avatar').value = '';
    document.getElementById('profile-avatar-preview').innerHTML = '';
  });

  function syncVolunteerRecordFromProfile(currentUserId, oldEmail, email, name, phone) {
    var volunteers = getVolunteers();
    var changed = false;
    volunteers.forEach(function(v) {
      var matchByUser = currentUserId && v.userId === currentUserId;
      var matchByEmail = oldEmail && (v.email || '').toLowerCase() === oldEmail.toLowerCase();
      if (matchByUser || matchByEmail) {
        if (currentUserId) v.userId = currentUserId;
        v.email = email || v.email;
        v.name = name || v.name;
        v.phone = phone !== undefined && phone !== null ? phone : v.phone;
        changed = true;
      }
    });
    if (changed) setVolunteers(volunteers);
  }

  document.getElementById('form-profile').addEventListener('submit', function(e) {
    e.preventDefault();
    var user = getCurrentUser();
    if (!user) return;
    var name = document.getElementById('profile-name').value.trim();
    var email = document.getElementById('profile-email').value.trim();
    var phone = (document.getElementById('profile-phone') || {}).value.trim();
    if (phone && !isPhoneValid(phone)) {
      alert('Введите номер телефона: не менее 11 цифр (например +79991234567).');
      return;
    }
    var newPass = document.getElementById('profile-password-new').value;
    var confirmPass = document.getElementById('profile-password-confirm').value;
    if (newPass && newPass !== confirmPass) {
      alert('Пароли не совпадают.');
      return;
    }
    var users = getUsers();
    var idx = users.findIndex(function(u) { return u.id === user.id; });
    if (idx === -1) return;
    var otherWithEmail = users.some(function(u, i) { return i !== idx && (u.login || u.email) === email; });
    if (otherWithEmail) {
      alert('Пользователь с таким email уже зарегистрирован.');
      return;
    }
    var oldEmail = users[idx].login || users[idx].email;
    users[idx].name = name || users[idx].name;
    users[idx].login = email;
    users[idx].phone = phone || null;
    if (newPass) users[idx].password = newPass;
    if (profileRemoveAvatar) users[idx].avatar = null;
    var avatarFile = document.getElementById('profile-avatar').files[0];
    function afterProfileSave() {
      setUsers(users);
      setCurrentUser({ id: user.id, login: email, name: name || user.name, role: user.role });
      syncVolunteerRecordFromProfile(user.id, oldEmail, email, name, phone);
      updateHeaderAvatar();
      closeModal('profile');
    }
    if (avatarFile && avatarFile.type.match(/^image\//)) {
      imageFileToBase64(avatarFile, 128).then(function(avatarData) {
        users[idx].avatar = avatarData;
        afterProfileSave();
      }).catch(function() {
        afterProfileSave();
      });
    } else {
      afterProfileSave();
    }
  });

  // --- Волонтёры ---
  function renderVolunteers() {
    const list = getVolunteers();
    const search = (document.getElementById('volunteer-search') || {}).value || '';
    const direction = (document.getElementById('volunteer-filter') || {}).value || '';
    const q = search.toLowerCase().trim();

    let filtered = list.filter(v => {
      const matchSearch = !q ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q));
      const matchDir = !direction || (v.direction === direction);
      return matchSearch && matchDir;
    });

    const tbody = document.getElementById('volunteers-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Нет волонтёров. Добавьте первого.</td></tr>';
      return;
    }

    const users = getUsers();
    function findUserForVolunteer(v) {
      if (v.userId) {
        const byId = users.find(u => u.id === v.userId);
        if (byId) return byId;
      }
      return users.find(u => (u.login || u.email || '').toLowerCase() === (v.email || '').toLowerCase());
    }
    function getVolunteerAvatarHtml(v) {
      const user = findUserForVolunteer(v);
      const name = (user && (user.name || user.login || user.email)) || v.name || '';
      const letter = (name ? name.charAt(0) : (v.email ? v.email.charAt(0) : '?')).toUpperCase();
      if (user && user.avatar) {
        return '<div class="volunteer-table-avatar"><img src="' + user.avatar + '" alt="" class="volunteer-table-avatar-img"></div>';
      }
      return '<div class="volunteer-table-avatar volunteer-table-avatar-letter">' + escapeHtml(letter) + '</div>';
    }
    function displayVolunteerField(v, field) {
      const user = findUserForVolunteer(v);
      if (field === 'name') return (user && user.name) || v.name || '—';
      if (field === 'phone') return (user && user.phone) || v.phone || '—';
      if (field === 'email') return (user && (user.login || user.email)) || v.email || '—';
      return '—';
    }

    tbody.innerHTML = filtered.map(v => `
      <tr>
        <td class="col-avatar">${getVolunteerAvatarHtml(v)}</td>
        <td>${escapeHtml(displayVolunteerField(v, 'name'))}</td>
        <td>${escapeHtml(displayVolunteerField(v, 'phone'))}</td>
        <td>${escapeHtml(displayVolunteerField(v, 'email'))}</td>
        <td>${escapeHtml(v.direction || '—')}</td>
        <td>${formatDate(v.registeredAt || v.createdAt)}</td>
        <td class="actions">
          <button type="button" class="btn btn-danger btn-sm" data-delete-volunteer="${v.id}">Удалить</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-delete-volunteer]').forEach(btn => {
      btn.addEventListener('click', () => deleteVolunteer(btn.getAttribute('data-delete-volunteer')));
    });
  }

  function editVolunteer(id) {
    const list = getVolunteers();
    const v = list.find(x => x.id === id);
    if (!v) return;
    const users = getUsers();
    const user = v.userId ? users.find(u => u.id === v.userId) : users.find(u => (u.login || u.email || '').toLowerCase() === (v.email || '').toLowerCase());
    document.getElementById('modal-volunteer-title').textContent = 'Редактировать волонтёра';
    document.getElementById('volunteer-id').value = v.id;
    document.getElementById('volunteer-name').value = (user && user.name) || v.name || '';
    document.getElementById('volunteer-phone').value = formatPhoneInput((user && user.phone) || v.phone || '');
    document.getElementById('volunteer-email').value = (user && (user.login || user.email)) || v.email || '';
    document.getElementById('volunteer-direction').value = v.direction || '';
    document.getElementById('volunteer-notes').value = v.notes || '';
    openModal('volunteer');
  }

  function deleteVolunteer(id) {
    if (!confirm('Удалить этого волонтёра? Его аккаунт и все записи на мероприятия будут удалены.')) return;
    const volunteers = getVolunteers();
    const v = volunteers.find(x => x.id === id);
    if (!v) return;
    const users = getUsers();
    const userToDelete = v.userId ? users.find(u => u.id === v.userId) : users.find(u => (u.login || u.email || '').toLowerCase() === (v.email || '').toLowerCase());
    if (userToDelete && userToDelete.role !== 'superadmin' && (userToDelete.login || userToDelete.email) !== 'admin@ldpr.ru') {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      const participations = getEventParticipations().filter(p => p.userId !== userToDelete.id && (p.userLogin || '').toLowerCase() !== (userToDelete.login || userToDelete.email || '').toLowerCase());
      setEventParticipations(participations);
      const current = getCurrentUser();
      if (current && current.id === userToDelete.id) {
        setCurrentUser(null);
        showAuthScreen();
      }
    }
    setVolunteers(volunteers.filter(v => v.id !== id));
    renderVolunteers();
    updateDashboard();
    if (typeof renderEvents === 'function') renderEvents();
    if (typeof renderEventParticipationsPage === 'function') renderEventParticipationsPage();
  }

  document.getElementById('form-volunteer')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = getVolunteers();
    const id = document.getElementById('volunteer-id').value;
    const name = document.getElementById('volunteer-name').value.trim();
    const phone = document.getElementById('volunteer-phone').value.trim();
    if (!phone || !isPhoneValid(phone)) {
      alert('Введите номер телефона: не менее 11 цифр (например +79991234567).');
      return;
    }
    const email = document.getElementById('volunteer-email').value.trim();
    const direction = document.getElementById('volunteer-direction').value;
    const notes = document.getElementById('volunteer-notes').value.trim();

    if (id) {
      const idx = list.findIndex(v => v.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name, phone, email, direction, notes };
      }
    } else {
      var users = getUsers();
      var linkedUser = users.find(function(u) { return (u.login || u.email || '').toLowerCase() === (email || '').toLowerCase(); });
      list.push({
        id: 'v_' + Date.now(),
        userId: linkedUser ? linkedUser.id : null,
        name,
        phone,
        email,
        direction,
        notes,
        registeredAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      });
    }
    setVolunteers(list);
    closeModal('volunteer');
    renderVolunteers();
    updateDashboard();
  });

  document.getElementById('volunteer-search')?.addEventListener('input', renderVolunteers);
  document.getElementById('volunteer-filter')?.addEventListener('change', renderVolunteers);

  // --- Мероприятия ---
  function renderEvents() {
    const list = getEvents();
    const search = (document.getElementById('event-search') || {}).value || '';
    const q = search.toLowerCase().trim();

    let filtered = list.filter(ev => {
      return !q ||
        (ev.name && ev.name.toLowerCase().includes(q)) ||
        (ev.place && ev.place.toLowerCase().includes(q));
    });

    const container = document.getElementById('events-container');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Нет мероприятий. Добавьте первое.</p></div>';
      return;
    }

    const participations = getEventParticipations();
    container.innerHTML = filtered.map(ev => {
      const eventParts = participations.filter(p => p.eventId === ev.id);
      const partsHtml = eventParts.length === 0
        ? '<p class="event-participations-empty">Нет заявок на участие</p>'
        : `
          <ul class="event-participations-list">
            ${eventParts.map(p => `
              <li class="event-participation-item event-participation-${p.status}">
                <span class="part-name">${escapeHtml(p.userName || p.userLogin || '—')}</span>
                <span class="part-status event-status ${p.status === 'pending' ? 'planned' : p.status === 'accepted' ? 'completed' : 'cancelled'}">${p.status === 'pending' ? 'На рассмотрении' : p.status === 'accepted' ? 'Принят' : 'Отклонён'}</span>
                ${p.status === 'pending' ? `
                  <button type="button" class="btn btn-primary btn-sm" data-accept-part="${p.id}">Принять</button>
                  <button type="button" class="btn btn-danger btn-sm" data-reject-part="${p.id}">Отклонить</button>
                ` : ''}
              </li>
            `).join('')}
          </ul>
        `;
      return `
      <div class="event-card">
        ${ev.image ? `<div class="event-card-image-wrap"><img src="${ev.image}" alt="" class="event-card-image"></div>` : ''}
        <h3>${escapeHtml(ev.name || 'Без названия')}</h3>
        <div class="event-meta">${formatDateTime(ev.date)} ${ev.place ? ' · ' + escapeHtml(ev.place) : ''}</div>
        ${ev.description ? `<div class="event-description">${escapeHtml(ev.description)}</div>` : ''}
        <div class="event-participations">
          <h4 class="event-participations-title">Заявки на участие (${eventParts.length})</h4>
          ${partsHtml}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary btn-sm" data-edit-event="${ev.id}">Изменить</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-event="${ev.id}">Удалить</button>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('[data-edit-event]').forEach(btn => {
      btn.addEventListener('click', () => editEvent(btn.getAttribute('data-edit-event')));
    });
    container.querySelectorAll('[data-delete-event]').forEach(btn => {
      btn.addEventListener('click', () => deleteEvent(btn.getAttribute('data-delete-event')));
    });
    container.querySelectorAll('[data-accept-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-accept-part');
        const list = getEventParticipations();
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) { list[idx] = { ...list[idx], status: 'accepted' }; setEventParticipations(list); renderEvents(); }
      });
    });
    container.querySelectorAll('[data-reject-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject-part');
        const list = getEventParticipations();
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) { list[idx] = { ...list[idx], status: 'rejected' }; setEventParticipations(list); renderEvents(); }
      });
    });
  }

  var eventRemoveImage = false;

  function editEvent(id) {
    const list = getEvents();
    const ev = list.find(x => x.id === id);
    if (!ev) return;
    eventRemoveImage = false;
    document.getElementById('modal-event-title').textContent = 'Редактировать мероприятие';
    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-name').value = ev.name || '';
    let dateVal = '';
    if (ev.date) {
      const d = new Date(ev.date);
      dateVal = d.toISOString().slice(0, 16);
    }
    document.getElementById('event-date').value = dateVal;
    document.getElementById('event-place').value = ev.place || '';
    document.getElementById('event-description').value = ev.description || '';
    var prev = document.getElementById('event-image-preview');
    if (prev) {
      prev.innerHTML = '';
      if (ev.image && !eventRemoveImage) {
        var img = document.createElement('img');
        img.src = ev.image;
        img.alt = 'Фото мероприятия';
        img.className = 'event-image-preview-img';
        prev.appendChild(img);
      }
    }
    document.getElementById('event-image').value = '';
    openModal('event');
  }

  function deleteEvent(id) {
    if (!confirm('Удалить это мероприятие?')) return;
    const list = getEvents().filter(ev => ev.id !== id);
    setEvents(list);
    const parts = getEventParticipations().filter(p => p.eventId !== id);
    setEventParticipations(parts);
    renderEvents();
    updateDashboard();
  }

  document.getElementById('event-image')?.addEventListener('change', function() {
    eventRemoveImage = false;
    var preview = document.getElementById('event-image-preview');
    if (!preview) return;
    preview.innerHTML = '';
    var file = this.files[0];
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.createElement('img');
      img.src = e.target.result;
      img.alt = 'Новое фото';
      img.className = 'event-image-preview-img';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('event-image-remove')?.addEventListener('click', function() {
    eventRemoveImage = true;
    document.getElementById('event-image').value = '';
    var preview = document.getElementById('event-image-preview');
    if (preview) preview.innerHTML = '';
  });

  document.getElementById('form-event')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = getEvents();
    const id = document.getElementById('event-id').value;
    const name = document.getElementById('event-name').value.trim();
    const date = document.getElementById('event-date').value;
    const place = document.getElementById('event-place').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const imageInput = document.getElementById('event-image');
    const imageFile = imageInput && imageInput.files && imageInput.files[0];

    function saveEvent(imageData) {
      if (id) {
        const idx = list.findIndex(ev => ev.id === id);
        if (idx !== -1) {
          var newImage = eventRemoveImage ? null : (imageData !== undefined ? imageData : list[idx].image);
          list[idx] = { ...list[idx], name, date, place, description, image: newImage };
        }
      } else {
        list.push({
          id: 'e_' + Date.now(),
          name,
          date: date ? new Date(date).toISOString() : null,
          place,
          status: 'planned',
          description,
          image: imageData || null,
          createdAt: new Date().toISOString()
        });
      }
      setEvents(list);
      closeModal('event');
      renderEvents();
      updateDashboard();
    }

    if (imageFile && imageFile.type.match(/^image\//)) {
      imageFileToBase64(imageFile, 480).then(function(imageData) {
        saveEvent(imageData);
      }).catch(function() {
        saveEvent(null);
      });
    } else {
      saveEvent(id ? (eventRemoveImage ? null : undefined) : null);
    }
  });

  document.getElementById('event-search')?.addEventListener('input', renderEvents);

  // --- Заявки на участие в мероприятиях (страница для админа) ---
  function renderEventParticipationsPage() {
    const tbody = document.getElementById('event-participations-tbody');
    if (!tbody) return;
    const participations = getEventParticipations();
    const events = getEvents();
    const statusLabels = { pending: 'На рассмотрении', accepted: 'Принято', rejected: 'Отклонено' };
    const statusClass = { pending: 'planned', accepted: 'completed', rejected: 'cancelled' };

    if (participations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет заявок на участие в мероприятиях.</td></tr>';
      return;
    }

    tbody.innerHTML = participations.map(p => {
      const ev = events.find(e => e.id === p.eventId);
      const eventName = ev ? (ev.name || 'Без названия') : '—';
      return `
        <tr>
          <td>${escapeHtml(eventName)}</td>
          <td>${escapeHtml(p.userName || p.userLogin || '—')}</td>
          <td>${formatDate(p.createdAt)}</td>
          <td><span class="event-status ${statusClass[p.status] || 'planned'}">${statusLabels[p.status] || p.status}</span></td>
          <td class="actions">
            ${p.status === 'pending' ? `
              <button type="button" class="btn btn-primary btn-sm" data-accept-part-page="${p.id}">Принять</button>
              <button type="button" class="btn btn-danger btn-sm" data-reject-part-page="${p.id}">Отклонить</button>
            ` : '—'}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-accept-part-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-accept-part-page');
        const list = getEventParticipations();
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], status: 'accepted' };
          setEventParticipations(list);
          renderEventParticipationsPage();
          renderEvents();
        }
      });
    });
    tbody.querySelectorAll('[data-reject-part-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject-part-page');
        const list = getEventParticipations();
        const idx = list.findIndex(p => p.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], status: 'rejected' };
          setEventParticipations(list);
          renderEventParticipationsPage();
          renderEvents();
        }
      });
    });
  }

  // --- Кабинет волонтёра: форма заявки и статус ---
  function renderVolunteerBlock() {
    const block = document.getElementById('volunteer-application-block');
    if (!block) return;
    const user = getCurrentUser();
    if (!user) return;
    const applications = getApplications();
    const myApplication = applications.find(a => a.userId === user.id || a.userLogin === user.login);
    const statusLabels = { pending: 'На рассмотрении', accepted: 'Принято', rejected: 'Отклонено' };
    const statusClass = { pending: 'planned', accepted: 'completed', rejected: 'cancelled' };

    const volunteerNav = document.getElementById('volunteer-nav');
    if (!myApplication || myApplication.status === 'rejected') {
      var homeTitle = document.querySelector('#volunteer-home .section-title');
      if (homeTitle) homeTitle.textContent = 'Заявка на вступление в волонтёры ЛДПР';
      if (volunteerNav) volunteerNav.style.display = 'none';
      document.getElementById('volunteer-home')?.classList.remove('active');
      document.getElementById('volunteer-events')?.style.setProperty('display', 'none');
      document.getElementById('volunteer-home')?.style.setProperty('display', 'block');
      block.innerHTML = `
        <div class="application-form-card">
          <p class="application-intro">Заполните форму, чтобы подать заявку на вступление в волонтёры ЛДПР. После проверки администратор примет или отклонит заявку.</p>
          <form id="form-application" class="form">
            <div class="form-row">
              <label class="label" for="app-name">ФИО *</label>
              <input type="text" id="app-name" class="input" value="${escapeHtml(user.name || '')}" required>
            </div>
            <div class="form-row">
              <label class="label" for="app-phone">Телефон *</label>
              <input type="tel" id="app-phone" class="input" required minlength="12" placeholder="+79991234567" maxlength="12" inputmode="numeric" title="Не менее 11 цифр, например +79991234567">
            </div>
            <div class="form-row">
              <label class="label" for="app-email">Email *</label>
              <input type="email" id="app-email" class="input" value="${escapeHtml(user.login || '')}" required>
            </div>
            <div class="form-row">
              <label class="label" for="app-direction">Направление деятельности</label>
              <select id="app-direction" class="select">
                <option value="агитация">Агитация</option>
                <option value="раздача">Раздача материалов</option>
                <option value="мероприятия">Организация мероприятий</option>
                <option value="соцсети">Соцсети</option>
                <option value="другое">Другое</option>
              </select>
            </div>
            <div class="form-row">
              <label class="label" for="app-message">Почему хотите стать волонтёром?</label>
              <textarea id="app-message" class="input textarea" rows="4" placeholder="Кратко опишите мотивацию"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Подать заявку</button>
          </form>
        </div>
      `;
      var appPhoneEl = document.getElementById('app-phone');
      if (appPhoneEl) {
        var fullUser = getUsers().find(function(u) { return u.id === user.id; });
        if (fullUser && fullUser.phone) appPhoneEl.value = formatPhoneInput(fullUser.phone);
      }
      bindPhoneInput('app-phone');
      document.getElementById('form-application').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('app-name').value.trim();
        const phone = document.getElementById('app-phone').value.trim();
        if (!phone || !isPhoneValid(phone)) {
          alert('Введите номер телефона: не менее 11 цифр (например +79991234567).');
          return;
        }
        const email = document.getElementById('app-email').value.trim();
        const direction = document.getElementById('app-direction').value;
        const message = document.getElementById('app-message').value.trim();
        const list = getApplications();
        list.push({
          id: 'a_' + Date.now(),
          userId: user.id,
          userLogin: user.login,
          name,
          phone,
          email,
          direction,
          message,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        setApplications(list);
        renderVolunteerBlock();
      });
    } else if (myApplication.status === 'accepted') {
      if (volunteerNav) volunteerNav.style.display = 'flex';
      var homeTitle = document.querySelector('#volunteer-home .section-title');
      if (homeTitle) homeTitle.textContent = 'О партии ЛДПР';
      block.innerHTML = `
        <div class="party-info-blocks">
          <div class="party-info-block">
            <h3 class="party-block-title">О партии</h3>
            <p class="party-block-text">Либерально-демократическая партия России (ЛДПР) — одна из крупнейших политических партий страны. Партия ведёт активную общественную и законодательную работу.</p>
          </div>
          <div class="party-info-block">
            <h3 class="party-block-title">Наши ценности</h3>
            <p class="party-block-text">Отстаивание интересов граждан, социальная справедливость, укрепление государственности и защита традиционных ценностей.</p>
          </div>
          <div class="party-info-block">
            <h3 class="party-block-title">Направления работы</h3>
            <p class="party-block-text">Законодательная деятельность, региональное развитие, молодёжная политика, социальная защита и поддержка граждан.</p>
          </div>
          <div class="party-info-block">
            <h3 class="party-block-title">Волонтёрам</h3>
            <p class="party-block-text">Участвуйте в мероприятиях партии: перейдите во вкладку <strong>«Мероприятия»</strong>, подайте заявку на участие — после одобрения вы сможете принять в них участие.</p>
          </div>
        </div>
      `;
      renderVolunteerEventsList();
      bindVolunteerNav();
    } else {
      var homeTitleEl = document.querySelector('#volunteer-home .section-title');
      if (homeTitleEl) homeTitleEl.textContent = 'Заявка на вступление в волонтёры ЛДПР';
      if (volunteerNav) volunteerNav.style.display = 'none';
      block.innerHTML = `
        <div class="application-status-card application-status-${myApplication.status}">
          <h2 class="application-status-title">Статус вашей заявки</h2>
          <p class="application-status-badge ${statusClass[myApplication.status] || 'planned'}">${statusLabels[myApplication.status] || myApplication.status}</p>
          <p class="application-status-date">Дата подачи: ${formatDate(myApplication.createdAt)}</p>
          ${myApplication.status === 'rejected' ? '<p class="application-status-note">Вы можете подать заявку повторно, заполнив форму ниже.</p>' : ''}
        </div>
      `;
    }
  }

  function bindVolunteerNav() {
    document.querySelectorAll('.volunteer-nav-link').forEach(link => {
      link.removeEventListener('click', volunteerNavClick);
      link.addEventListener('click', volunteerNavClick);
    });
  }

  function volunteerNavClick(e) {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    const sectionId = href.replace('#', '');
    try { sessionStorage.setItem(STORAGE_LAST_VOLUNTEER_SECTION, sectionId); } catch (err) {}
    document.querySelectorAll('.volunteer-section').forEach(s => {
      s.style.display = s.id === sectionId ? 'block' : 'none';
    });
    document.querySelectorAll('.volunteer-nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === href);
    });
    if (sectionId === 'volunteer-events') renderVolunteerEventsList();
  }

  function renderVolunteerEventsList() {
    const container = document.getElementById('volunteer-events-list');
    if (!container) return;
    const user = getCurrentUser();
    if (!user) return;
    const events = getEvents().filter(ev => (ev.status || 'planned') === 'planned');
    const participations = getEventParticipations();
    const statusLabels = { pending: 'На рассмотрении', accepted: 'Вы приняты', rejected: 'Отклонено' };
    const statusClass = { pending: 'planned', accepted: 'completed', rejected: 'cancelled' };

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Нет запланированных мероприятий.</p></div>';
      return;
    }

    container.innerHTML = events.map(ev => {
      const myPart = participations.find(p => p.eventId === ev.id && (p.userId === user.id || p.userLogin === user.login));
      let actionHtml = '';
      if (!myPart || myPart.status === 'rejected') {
        actionHtml = `<button type="button" class="btn btn-primary btn-sm" data-apply-event="${ev.id}">Подать заявку на участие</button>`;
      } else {
        actionHtml = `<span class="event-status ${statusClass[myPart.status]}">${statusLabels[myPart.status]}</span>`;
      }
      return `
        <div class="event-card volunteer-event-card">
          ${ev.image ? `<div class="event-card-image-wrap"><img src="${ev.image}" alt="" class="event-card-image"></div>` : ''}
          <h3>${escapeHtml(ev.name || 'Без названия')}</h3>
          <div class="event-meta">${formatDateTime(ev.date)} ${ev.place ? ' · ' + escapeHtml(ev.place) : ''}</div>
          ${ev.description ? `<div class="event-description">${escapeHtml(ev.description)}</div>` : ''}
          <div class="volunteer-event-action">${actionHtml}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-apply-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-apply-event');
        const list = getEventParticipations();
        if (list.some(p => p.eventId === eventId && (p.userId === user.id || p.userLogin === user.login) && p.status === 'pending')) return;
        list.push({
          id: 'p_' + Date.now(),
          eventId,
          userId: user.id,
          userLogin: user.login,
          userName: user.name || user.login,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        setEventParticipations(list);
        renderVolunteerEventsList();
      });
    });
  }

  // --- Заявки волонтёров (для администратора) ---
  function renderApplications() {
    const list = getApplications();
    const filtered = list.filter(a => a.status !== 'accepted');
    const tbody = document.getElementById('applications-tbody');
    if (!tbody) return;
    const statusLabels = { pending: 'На рассмотрении', accepted: 'Принято', rejected: 'Отклонено' };
    const statusClass = { pending: 'planned', accepted: 'completed', rejected: 'cancelled' };

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Нет заявок.</td></tr>';
      return;
    }
    const users = getUsers();
    function getApplicationAvatarHtml(app) {
      const user = app.userId ? users.find(u => u.id === app.userId) : users.find(u => (u.login || u.email || '').toLowerCase() === (app.email || app.userLogin || '').toLowerCase());
      const name = (user && (user.name || user.login || user.email)) || app.name || '';
      const letter = (name ? name.charAt(0) : (app.email || app.userLogin ? (app.email || app.userLogin).charAt(0) : '?')).toUpperCase();
      if (user && user.avatar) {
        return '<div class="volunteer-table-avatar"><img src="' + user.avatar + '" alt="" class="volunteer-table-avatar-img"></div>';
      }
      return '<div class="volunteer-table-avatar volunteer-table-avatar-letter">' + escapeHtml(letter) + '</div>';
    }
    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td class="col-avatar">${getApplicationAvatarHtml(a)}</td>
        <td>${escapeHtml(a.name || '—')}</td>
        <td>${escapeHtml(a.phone || '—')}</td>
        <td>${escapeHtml(a.email || '—')}</td>
        <td>${escapeHtml(a.direction || '—')}</td>
        <td>${formatDate(a.createdAt)}</td>
        <td><span class="event-status ${statusClass[a.status] || 'planned'}">${statusLabels[a.status] || a.status}</span></td>
        <td class="actions">
          ${a.status === 'pending' ? `
            <button type="button" class="btn btn-primary btn-sm" data-accept-application="${a.id}">Принять</button>
            <button type="button" class="btn btn-danger btn-sm" data-reject-application="${a.id}">Отклонить</button>
          ` : '—'}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-accept-application]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-accept-application');
        const apps = getApplications();
        const app = apps.find(x => x.id === id);
        if (!app || app.status !== 'pending') return;
        const idx = apps.findIndex(x => x.id === id);
        apps[idx] = { ...apps[idx], status: 'accepted' };
        setApplications(apps);
        const volunteers = getVolunteers();
        if (!volunteers.some(v => v.email === app.email && v.phone === app.phone)) {
          volunteers.push({
            id: 'v_' + Date.now(),
            userId: app.userId || null,
            name: app.name,
            phone: app.phone,
            email: app.email,
            direction: app.direction || '',
            notes: 'Принят из заявки. ' + (app.message || ''),
            registeredAt: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString()
          });
          setVolunteers(volunteers);
        }
        renderApplications();
        if (typeof renderVolunteers === 'function') renderVolunteers();
        updateDashboard();
      });
    });
    tbody.querySelectorAll('[data-reject-application]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject-application');
        if (!confirm('Отклонить эту заявку?')) return;
        const apps = getApplications();
        const idx = apps.findIndex(x => x.id === id);
        if (idx === -1) return;
        apps[idx] = { ...apps[idx], status: 'rejected' };
        setApplications(apps);
        renderApplications();
      });
    });
  }

  // --- Заявки на аккаунты администраторов (только для главного админа) ---
  function renderAdminRequests() {
    const tbody = document.getElementById('admin-requests-tbody');
    if (!tbody) return;
    const users = getUsers().filter(u => u.role === 'admin_pending');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Нет заявок на создание аккаунтов администраторов.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name || '—')}</td>
        <td>${escapeHtml(u.login || u.email || '—')}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="actions">
          <button type="button" class="btn btn-primary btn-sm" data-approve-admin="${u.id}">Принять</button>
          <button type="button" class="btn btn-danger btn-sm" data-reject-admin="${u.id}">Отклонить</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-approve-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-approve-admin');
        const list = getUsers();
        const idx = list.findIndex(x => x.id === id);
        if (idx === -1) return;
        list[idx] = { ...list[idx], role: 'admin' };
        setUsers(list);
        renderAdminRequests();
      });
    });
    tbody.querySelectorAll('[data-reject-admin]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reject-admin');
        if (!confirm('Отклонить заявку? Пользователь станет волонтёром.')) return;
        const list = getUsers();
        const idx = list.findIndex(x => x.id === id);
        if (idx === -1) return;
        list[idx] = { ...list[idx], role: 'volunteer' };
        setUsers(list);
        renderAdminRequests();
      });
    });
  }

  // --- Администраторы (только для главного админа) ---
  function renderAdministrators() {
    const tbody = document.getElementById('administrators-tbody');
    if (!tbody) return;
    const admins = getUsers().filter(u => u.role === 'admin' || u.role === 'superadmin');
    const roleLabels = { superadmin: 'Главный администратор', admin: 'Администратор' };
    const canDelete = (u) => u.role !== 'superadmin' && (u.login || u.email || '') !== 'admin@ldpr.ru';
    if (admins.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет администраторов.</td></tr>';
      return;
    }
    tbody.innerHTML = admins.map(u => `
      <tr>
        <td>${escapeHtml(u.name || '—')}</td>
        <td>${escapeHtml(u.login || u.email || '—')}</td>
        <td>${escapeHtml(roleLabels[u.role] || u.role)}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="actions">
          ${canDelete(u) ? `<button type="button" class="btn btn-danger btn-sm" data-delete-admin="${escapeHtml(u.id)}">Удалить</button>` : '—'}
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('administrators-tbody')?.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest('[data-delete-admin]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-delete-admin');
    var list = getUsers();
    var user = list.find(function(x) { return x.id === id; });
    if (!user) return;
    if (!confirm('Удалить администратора ' + (user.name || user.login || user.email) + '? Его аккаунт будет удалён из системы.')) return;
    var current = getCurrentUser();
    var newList = list.filter(function(x) { return x.id !== id; });
    setUsers(newList);
    if (current && current.id === id) {
      try { sessionStorage.removeItem(STORAGE_CURRENT_USER); } catch (err) {}
      showAuthScreen();
    } else {
      if (typeof renderAdministrators === 'function') renderAdministrators();
    }
  });

  // --- Отчёты ---
  function renderReports() {
    var volunteersTbody = document.getElementById('reports-volunteers-tbody');
    var participationsTbody = document.getElementById('reports-participations-tbody');
    if (!volunteersTbody || !participationsTbody) return;
    var volunteers = getVolunteers();
    var events = getEvents();
    var participations = getEventParticipations();
    var statusLabels = { pending: 'На рассмотрении', accepted: 'Принято', rejected: 'Отклонено' };

    if (volunteers.length === 0) {
      volunteersTbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет данных.</td></tr>';
    } else {
      volunteersTbody.innerHTML = volunteers.map(function(v) {
        var name = (v.name || '').trim() || '—';
        var phone = (v.phone || '').trim() || '—';
        var email = (v.email || '').trim() || '—';
        var direction = (v.direction || '').trim() || '—';
        var date = formatDate(v.registeredAt || v.createdAt);
        return '<tr><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(phone) + '</td><td>' + escapeHtml(email) + '</td><td>' + escapeHtml(direction) + '</td><td>' + date + '</td></tr>';
      }).join('');
    }

    if (participations.length === 0) {
      participationsTbody.innerHTML = '<tr><td colspan="4" class="empty-state">Нет данных.</td></tr>';
    } else {
      participationsTbody.innerHTML = participations.map(function(p) {
        var ev = events.find(function(e) { return e.id === p.eventId; });
        var evName = ev ? (ev.name || '—') : '—';
        var userName = (p.userName || p.userLogin || p.userEmail || '—');
        var date = formatDate(p.createdAt);
        var status = statusLabels[p.status] || p.status || '—';
        return '<tr><td>' + escapeHtml(evName) + '</td><td>' + escapeHtml(userName) + '</td><td>' + date + '</td><td>' + escapeHtml(status) + '</td></tr>';
      }).join('');
    }
  }

  function exportReportsToPdf() {
    var content = document.getElementById('reports-content');
    if (!content) return;
    var win = window.open('', '_blank');
    var printStyles = 'body{background:#fff;color:#000;padding:20px;font-family:Montserrat,sans-serif;} table{width:100%;border-collapse:collapse;margin-bottom:24px;} th,td{border:1px solid #333;padding:8px;text-align:left;} th{background:#1565c0;color:#fff;} .report-block-title{font-size:1.2rem;margin:0 0 8px;} .report-block{margin-bottom:28px;}';
    win.document.write('<html><head><meta charset="utf-8"><title>Отчёты</title><style>' + printStyles + '</style></head><body>' + content.innerHTML + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); win.close(); }, 400);
  }

  function exportReportsToExcel() {
    var volunteers = getVolunteers();
    var events = getEvents();
    var participations = getEventParticipations();
    var statusLabels = { pending: 'На рассмотрении', accepted: 'Принято', rejected: 'Отклонено' };
    var BOM = '\uFEFF';
    var sep = ';';
    var csvVol = BOM + 'ФИО;Телефон;Email;Направление;Дата регистрации\r\n';
    volunteers.forEach(function(v) {
      var name = (v.name || '').replace(/;/g, ',');
      var phone = (v.phone || '').replace(/;/g, ',');
      var email = (v.email || '').replace(/;/g, ',');
      var direction = (v.direction || '').replace(/;/g, ',');
      var date = formatDate(v.registeredAt || v.createdAt);
      csvVol += name + sep + phone + sep + email + sep + direction + sep + date + '\r\n';
    });
    var csvPart = BOM + 'Мероприятие;Волонтёр;Дата заявки;Статус\r\n';
    participations.forEach(function(p) {
      var ev = events.find(function(e) { return e.id === p.eventId; });
      var evName = (ev ? ev.name : '').replace(/;/g, ',');
      var userName = (p.userName || p.userLogin || p.userEmail || '').replace(/;/g, ',');
      var date = formatDate(p.createdAt);
      var status = (statusLabels[p.status] || p.status || '').replace(/;/g, ',');
      csvPart += evName + sep + userName + sep + date + sep + status + '\r\n';
    });
    function downloadCsv(filename, csv) {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    downloadCsv('volunteers.csv', csvVol);
    setTimeout(function() { downloadCsv('participations.csv', csvPart); }, 200);
  }

  document.getElementById('reports-export-pdf')?.addEventListener('click', function() {
    if (typeof exportReportsToPdf === 'function') exportReportsToPdf();
  });
  document.getElementById('reports-export-excel')?.addEventListener('click', function() {
    if (typeof exportReportsToExcel === 'function') exportReportsToExcel();
  });

  // --- Дашборд ---
  function getLast6Months() {
    var months = [];
    var d = new Date();
    for (var i = 5; i >= 0; i--) {
      var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({
        key: m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'),
        label: m.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
      });
    }
    return months;
  }

  function renderDashboardChart(mode) {
    var container = document.getElementById('dashboard-chart');
    if (!container) return;
    mode = mode || (document.querySelector('.dashboard-chart-tab.active') || {}).getAttribute('data-dashboard-chart') || 'volunteers';

    var months = getLast6Months();
    var maxVal = 1;
    var data = [];

    if (mode === 'volunteers') {
      var volunteers = getVolunteers();
      var byMonth = {};
      months.forEach(function(m) { byMonth[m.key] = 0; });
      volunteers.forEach(function(v) {
        var dateStr = v.createdAt || v.registeredAt;
        if (!dateStr) return;
        var d = new Date(dateStr);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (byMonth[key] !== undefined) byMonth[key]++;
      });
      data = months.map(function(m) { return byMonth[m.key] || 0; });
    } else {
      var participations = getEventParticipations().filter(function(p) { return p.status === 'accepted'; });
      var byMonth = {};
      months.forEach(function(m) { byMonth[m.key] = 0; });
      participations.forEach(function(p) {
        var dateStr = p.createdAt;
        if (!dateStr) return;
        var d = new Date(dateStr);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (byMonth[key] !== undefined) byMonth[key]++;
      });
      data = months.map(function(m) { return byMonth[m.key] || 0; });
    }

    maxVal = Math.max(1, Math.max.apply(null, data));

    container.innerHTML = months.map(function(m, i) {
      var val = data[i];
      var pct = maxVal ? Math.round((val / maxVal) * 100) : 0;
      return '<div class="dashboard-chart-row">' +
        '<span class="dashboard-chart-label">' + m.label + '</span>' +
        '<div class="dashboard-chart-bar-wrap">' +
          '<div class="dashboard-chart-bar ' + (mode === 'volunteers' ? 'dashboard-chart-bar-volunteers' : 'dashboard-chart-bar-participations') + '" style="width:' + pct + '%"></div>' +
          '<span class="dashboard-chart-value">' + val + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updateDashboard() {
    const volunteers = getVolunteers();
    const events = getEvents();
    const now = new Date();
    const upcoming = events.filter(ev => ev.status === 'planned' && ev.date && new Date(ev.date) >= now);

    const statV = document.getElementById('stat-volunteers');
    const statE = document.getElementById('stat-events');
    const statU = document.getElementById('stat-upcoming');
    if (statV) statV.textContent = volunteers.length;
    if (statE) statE.textContent = events.length;
    if (statU) statU.textContent = upcoming.length;

    if (typeof renderDashboardChart === 'function') renderDashboardChart();
  }

  document.querySelectorAll('.dashboard-chart-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.dashboard-chart-tab').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      renderDashboardChart(this.getAttribute('data-dashboard-chart'));
    });
  });

  function escapeHtml(str) {
    if (str == null) return '—';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Инициализация
  bindPhoneInput('register-phone');
  bindPhoneInput('profile-phone');
  bindPhoneInput('volunteer-phone');
  renderVolunteers();
  renderEvents();
  updateDashboard();
})();
