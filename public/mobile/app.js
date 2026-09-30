var app = document.getElementById('app');
var toastEl = document.getElementById('toast');
var state = { token: localStorage.getItem('m_token'), user: JSON.parse(localStorage.getItem('m_user') || 'null'), page: 'home', params: {} };

function api(p, o) {
  o = o || {};
  var h = o.headers || {};
  if (state.token) h.Authorization = 'Bearer ' + state.token;
  if (!(o.body instanceof FormData) && o.body) h['Content-Type'] = 'application/json';
  return fetch('/api' + p, Object.assign({}, o, { headers: h })).then(function(r) {
    return r.json().catch(function() { return {}; }).then(function(d) {
      if (!r.ok) throw new Error(d.error || 'خطأ');
      return d;
    });
  });
}

function toast(m, err) {
  toastEl.textContent = m;
  toastEl.className = 'toast show' + (err ? ' error' : '');
  setTimeout(function() { toastEl.className = 'toast' + (err ? ' error' : ''); }, 2600);
}

function esc(s) { return String(s || '').replace(/[&<>\"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]; }); }
function canUser(p) { if (!state.user) return false; if (state.user.role === 'admin') return true; if (state.user.role === 'assistant') return (state.user.permissions || []).indexOf(p) !== -1; return false; }

function logout() { localStorage.removeItem('m_token'); localStorage.removeItem('m_user'); state.token = null; state.user = null; state.page = 'home'; render(); }
function go(p, params) { state.page = p; state.params = params || {}; render(); window.scrollTo(0, 0); }
function back() { var b = state.params.back || 'home'; state.page = b; state.params = {}; render(); }

var LOGO = '<svg viewBox="0 0 100 100" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="0.5" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><path d="M30 85 L30 40 Q30 15 50 15 Q70 15 70 40 L70 85 Z" fill="none" stroke="url(#lg)" stroke-width="5"/><line x1="50" y1="15" x2="50" y2="32" stroke="url(#lg)" stroke-width="3"/><ellipse cx="50" cy="48" rx="11" ry="14" fill="url(#lg)" opacity="0.9"/><path d="M50 40 Q55 47 53 53 Q51 57 50 58 Q49 57 47 53 Q45 47 50 40 Z" fill="#fbbf24"/><rect x="24" y="85" width="52" height="5" rx="2.5" fill="url(#lg)"/></svg>';

function render() { if (!state.token || !state.user) return renderLogin(); renderShell(); }

function renderLogin() {
  app.innerHTML = '<div class="login"><div class="logo-lg">' + LOGO + '</div><div class="brand-name">مشكاة المعرفة</div><div class="brand-en">MISHKAT AL-MAAREFA</div><form class="login-form" id="loginForm"><div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" required placeholder="you@example.com"></div><div class="field"><label>كلمة المرور</label><input type="password" name="password" required placeholder="••••••••"></div><button class="btn btn-p btn-f" type="submit">تسجيل الدخول</button></form></div>';
  document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) })
      .then(function(r) {
        state.token = r.token; state.user = r.user;
        localStorage.setItem('m_token', r.token);
        localStorage.setItem('m_user', JSON.stringify(r.user));
        toast('مرحبًا ' + r.user.name); render();
      }).catch(function(e) { toast(e.message, true); });
  };
}

var TABS_STUDENT = [
  { id: 'home', ico: '🏠', label: 'الرئيسية' },
  { id: 'lessons', ico: '📚', label: 'الدروس' },
  { id: 'quizzes', ico: '🧠', label: 'الاختبارات' },
  { id: 'files', ico: '📁', label: 'الملفات' },
  { id: 'more', ico: '☰', label: 'المزيد' }
];

var TABS_ADMIN = [
  { id: 'dashboard', ico: '📊', label: 'الرئيسية' },
  { id: 'lessons', ico: '📚', label: 'الدروس' },
  { id: 'students', ico: '👥', label: 'الطلاب' },
  { id: 'quizzes', ico: '🧠', label: 'الاختبارات' },
  { id: 'more', ico: '☰', label: 'المزيد' }
];

function renderShell() {
  var tabs = state.user.role === 'student' ? TABS_STUDENT : TABS_ADMIN;
  var pageInfo = getPageInfo(state.page);
  var showBack = pageInfo.back === true;
  var html = '<div class="shell">';
  html += '<div class="topbar"><div class="topbar-left">';
  html += showBack ? '<div class="top-icon" id="backBtn">←</div>' : '<div class="top-icon">' + (state.user.role === 'admin' ? '👑' : state.user.role === 'assistant' ? '🧑‍💼' : '🎓') + '</div>';
  html += '<div><div class="top-title">' + pageInfo.title + '</div><div class="top-sub">' + esc(state.user.name) + '</div></div></div>';
  html += '<div class="topbar-right">';
  if (state.user.role === 'student') {
    html += '<div class="top-icon bell" id="msgBtn">✉️<span class="bell-badge" id="msgBadge" style="display:none"></span></div>';
    html += '<div class="top-icon bell" id="notifBtn" style="margin-right:8px">🔔<span class="bell-badge" id="notifBadge" style="display:none"></span></div>';
  }
  html += '</div></div>';
  html += '<div class="content" id="content"></div>';
  html += renderBottomNav(tabs);
  html += '</div>';
  app.innerHTML = html;
  var bb = document.getElementById('backBtn');
  if (bb) bb.onclick = back;
  var nb = document.getElementById('notifBtn');
  if (nb) nb.onclick = function() { go('notifications', { back: 'home' }); };
  var mb = document.getElementById('msgBtn');
  if (mb) mb.onclick = function() { go('messages', { back: 'home' }); };
  document.querySelectorAll('.tab').forEach(function(t) {
    t.onclick = function() {
      var id = t.dataset.tab;
      if (id === 'home') state.page = state.user.role === 'student' ? 'home' : 'dashboard';
      else if (id === 'dashboard') state.page = 'dashboard';
      else state.page = id;
      state.params = {};
      render();
    };
  });
  renderPage();
  loadBadges();
}

function renderBottomNav(tabs) {
  var active = state.page;
  var map = { lessonView: 'lessons', lessonSubject: 'lessons', quizTake: 'quizzes', messages: 'more', notifications: 'more', certificates: 'more', reports: 'more', profile: 'more', myprogram: 'more', grades: 'more', points: 'more', analytics: 'more', assistants: 'more', settings: 'more', studentReport: 'students', adminPrograms: 'more', adminMessages: 'more', activities: 'more' };
  if (map[active]) active = map[active];
  var h = '<div class="bnav">';
  tabs.forEach(function(t) {
    h += '<div class="tab ' + (active === t.id ? 'active' : '') + '" data-tab="' + t.id + '"><span class="ico">' + t.ico + '</span><span class="lbl">' + t.label + '</span></div>';
  });
  h += '</div>';
  return h;
}

function getPageInfo(page) {
  var P = {
    home: { title: 'مشكاة المعرفة' },
    dashboard: { title: 'لوحة التحكم' },
    lessons: { title: 'الدروس' },
    lessonSubject: { title: 'الدروس', back: true },
    lessonView: { title: 'الدرس', back: true },
    quizzes: { title: 'الاختبارات' },
    quizTake: { title: 'الاختبار', back: true },
    files: { title: 'الملفات' },
    more: { title: 'المزيد' },
    messages: { title: 'الرسائل', back: true },
    notifications: { title: 'الإشعارات', back: true },
    certificates: { title: 'شهاداتي', back: true },
    reports: { title: 'تقدمي', back: true },
    profile: { title: 'حسابي', back: true },
    myprogram: { title: 'برنامجي', back: true },
    students: { title: 'الطلاب' },
    studentReport: { title: 'تقرير الطالب', back: true },
    grades: { title: 'الصفوف والمواد', back: true },
    points: { title: 'النقاط', back: true },
    results: { title: 'النتائج' },
    analytics: { title: 'التقارير', back: true },
    assistants: { title: 'المساعدون', back: true },
    settings: { title: 'الإعدادات', back: true },
    adminPrograms: { title: 'البرامج', back: true },
    adminMessages: { title: 'إرسال رسالة', back: true },
    activities: { title: 'السجل', back: true }
  };
  return P[page] || { title: 'مشكاة' };
}

function loadBadges() {
  if (state.user.role !== 'student') return;
  api('/notifications').then(function(r) {
    var b = document.getElementById('notifBadge');
    if (b) { if (r.unread > 0) { b.textContent = r.unread > 9 ? '9+' : r.unread; b.style.display = 'flex'; } else b.style.display = 'none'; }
  }).catch(function(){});
  api('/me/messages/unread-count').then(function(r) {
    var b = document.getElementById('msgBadge');
    if (b) { if (r.count > 0) { b.textContent = r.count > 9 ? '9+' : r.count; b.style.display = 'flex'; } else b.style.display = 'none'; }
  }).catch(function(){});
}

var PAGES = {};
function closeSheet() { document.getElementById('sheet').classList.remove('open'); }

PAGES.home = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div><p>جاري التحميل…</p></div>';
  Promise.all([api('/me/progress').catch(function(){return {};}), api('/me/points').catch(function(){return {total:0};})]).then(function(r) {
    var p = r[0] || {}; var pt = r[1] || { total: 0 };
    var pct = p.totalLessons ? Math.round(p.completedLessons / p.totalLessons * 100) : 0;
    var h = '<div class="welcome"><div class="welcome-name">مرحبًا بك 👋</div><div class="welcome-title">' + esc(state.user.name) + '</div><div class="welcome-stats"><div class="welcome-stat">🏅 ' + pt.total + ' نقطة</div><div class="welcome-stat">📈 ' + pct + '% إنجاز</div></div></div>';
    h += '<div class="stats">';
    h += '<div class="stat"><span class="si">📚</span><div class="sv">' + (p.completedLessons || 0) + '/' + (p.totalLessons || 0) + '</div><div class="sl">دروس مكتملة</div></div>';
    h += '<div class="stat"><span class="si">🧠</span><div class="sv">' + (p.quizzesTaken || 0) + '</div><div class="sl">اختبارات</div></div>';
    h += '<div class="stat"><span class="si">🎯</span><div class="sv">' + (p.avgScore || 0) + '%</div><div class="sl">متوسط الدرجات</div></div>';
    h += '<div class="stat"><span class="si">🏆</span><div class="sv">' + pt.total + '</div><div class="sl">نقاطي</div></div>';
    h += '</div>';
    h += '<div class="item" data-go="lessons"><div class="item-ico">📚</div><div class="item-body"><div class="item-title">الدروس</div><div class="item-sub">تصفح دروسك</div></div><div class="item-arrow">←</div></div>';
    h += '<div class="item" data-go="myprogram"><div class="item-ico">📅</div><div class="item-body"><div class="item-title">برنامجي الدراسي</div></div><div class="item-arrow">←</div></div>';
    h += '<div class="item" data-go="certificates"><div class="item-ico">🏆</div><div class="item-body"><div class="item-title">شهاداتي</div></div><div class="item-arrow">←</div></div>';
    h += '<div class="item" data-go="reports"><div class="item-ico">📈</div><div class="item-body"><div class="item-title">تقاريري</div></div><div class="item-arrow">←</div></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-go]').forEach(function(x) { x.onclick = function() { go(x.dataset.go, { back: 'home' }); }; });
  });
};

PAGES.dashboard = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/stats').then(function(s) {
    var h = '<div class="welcome"><div class="welcome-name">لوحة التحكم</div><div class="welcome-title">' + esc(state.user.name) + '</div><div class="welcome-stats"><div class="welcome-stat">👥 ' + s.students + ' طالب</div><div class="welcome-stat">🎯 ' + s.avg + '%</div></div></div>';
    h += '<div class="stats">';
    h += '<div class="stat"><span class="si">👥</span><div class="sv">' + s.students + '</div><div class="sl">الطلاب</div></div>';
    h += '<div class="stat"><span class="si">📚</span><div class="sv">' + s.lessons + '</div><div class="sl">الدروس</div></div>';
    h += '<div class="stat"><span class="si">🧠</span><div class="sv">' + s.quizzes + '</div><div class="sl">الاختبارات</div></div>';
    h += '<div class="stat"><span class="si">🏆</span><div class="sv">' + s.submissions + '</div><div class="sl">تسليمات</div></div>';
    h += '</div>';
    el.innerHTML = h;
  }).catch(function(e) { el.innerHTML = '<div class="empty"><h3>' + esc(e.message) + '</h3></div>'; });
};

PAGES.lessons = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  var isA = canUser('lessons_add');
  if (isA) {
    api('/lessons').then(function(ls) {
      var h = '<div class="page-head"><div class="page-title">📚 الدروس</div><div class="page-sub">' + ls.length + ' درس</div></div>';
      h += '<button class="btn btn-p btn-f" id="newL" style="margin-bottom:14px">+ درس جديد</button>';
      h += '<div class="search"><span class="si">🔍</span><input type="text" id="sq" placeholder="ابحث..."><button class="cl" id="cq" style="display:none">×</button></div>';
      h += '<div id="res"></div>';
      el.innerHTML = h;
      function render(query) {
        query = (query || '').trim().toLowerCase();
        var filtered = ls;
        if (query) filtered = ls.filter(function(l) { return (l.title || '').toLowerCase().indexOf(query) !== -1 || (l.description || '').toLowerCase().indexOf(query) !== -1; });
        var r = document.getElementById('res');
        if (!filtered.length) { r.innerHTML = '<div class="empty"><div class="empty-ico">📚</div><h3>' + (query ? 'لا نتائج' : 'لا توجد دروس') + '</h3></div>'; return; }
        var hh = '';
        filtered.forEach(function(l) { hh += '<div class="item" data-id="' + l.id + '"><div class="item-ico">📖</div><div class="item-body"><div class="item-title">' + esc(l.title) + '</div><div class="item-sub">' + esc(l.description || '') + '</div></div><div class="item-arrow">←</div></div>'; });
        r.innerHTML = hh;
        r.querySelectorAll('[data-id]').forEach(function(x) { x.onclick = function() { openLessonModal(ls.find(function(l) { return String(l.id) === x.dataset.id; })); }; });
      }
      render('');
      var sq = document.getElementById('sq'); var cq = document.getElementById('cq');
      sq.addEventListener('input', function() { cq.style.display = sq.value ? 'block' : 'none'; render(sq.value); });
      cq.onclick = function() { sq.value = ''; cq.style.display = 'none'; render(''); sq.focus(); };
      document.getElementById('newL').onclick = function() { openLessonModal(null); };
    });
    return;
  }
  if (state.params.subjectId) {
    var sid = +state.params.subjectId;
    Promise.all([api('/lessons'), api('/me/subjects')]).then(function(r) {
      var all = r[0].filter(function(l) { return l.subject_id === sid; });
      var sub = r[1].find(function(s) { return s.id === sid; });
      var h = '<div class="page-head"><div class="page-title">📚 ' + esc(sub ? sub.name : '') + '</div><div class="page-sub">' + all.length + ' درس</div></div>';
      h += '<div class="search"><span class="si">🔍</span><input type="text" id="sq" placeholder="ابحث..."><button class="cl" id="cq" style="display:none">×</button></div><div id="res"></div>';
      el.innerHTML = h;
      function render(query) {
        query = (query || '').trim().toLowerCase();
        var filtered = all;
        if (query) filtered = all.filter(function(l) { return (l.title || '').toLowerCase().indexOf(query) !== -1; });
        var r = document.getElementById('res');
        if (!filtered.length) { r.innerHTML = '<div class="empty"><div class="empty-ico">📚</div><h3>' + (query ? 'لا نتائج' : 'لا توجد دروس') + '</h3></div>'; return; }
        var hh = '';
        filtered.forEach(function(l) { hh += '<div class="item" data-id="' + l.id + '"><div class="item-ico">' + (l.completed ? '✅' : '📖') + '</div><div class="item-body"><div class="item-title">' + esc(l.title) + '</div><div class="item-sub">' + esc(l.description || '') + '</div></div><div class="item-arrow">←</div></div>'; });
        r.innerHTML = hh;
        r.querySelectorAll('[data-id]').forEach(function(x) { x.onclick = function() { go('lessonView', { id: x.dataset.id, back: 'lessonSubject', subjectId: sid }); }; });
      }
      render('');
      var sq = document.getElementById('sq'); var cq = document.getElementById('cq');
      sq.addEventListener('input', function() { cq.style.display = sq.value ? 'block' : 'none'; render(sq.value); });
      cq.onclick = function() { sq.value = ''; cq.style.display = 'none'; render(''); sq.focus(); };
    });
    return;
  }
  Promise.all([api('/me/subjects'), api('/lessons')]).then(function(r) {
    var subjects = r[0], all = r[1];
    var h = '<div class="page-head"><div class="page-title">📚 الدروس</div><div class="page-sub">اختر المادة</div></div>';
    if (!subjects.length) h += '<div class="empty"><div class="empty-ico">📚</div><h3>لا توجد مواد</h3><p>تواصل مع الإدارة</p></div>';
    else {
      h += '<div class="grid2">';
      subjects.forEach(function(s) { var cnt = all.filter(function(l) { return l.subject_id === s.id; }).length; h += '<div class="gcard" data-sub="' + s.id + '"><span class="gi">📖</span><div class="gt">' + esc(s.name) + '</div><div class="gs">' + cnt + ' درس</div></div>'; });
      h += '</div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-sub]').forEach(function(x) { x.onclick = function() { go('lessonSubject', { subjectId: x.dataset.sub, back: 'lessons' }); }; });
  });
};

PAGES.lessonSubject = PAGES.lessons;

PAGES.lessonView = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/lessons/' + state.params.id).then(function(l) {
    var v = '';
    if (l.video_url) {
      if (l.video_url.indexOf('youtu') > -1) {
        var yid = l.video_url.split(/v=|be\//)[1].split(/[&?]/)[0];
        v = '<div class="video-box"><iframe src="https://www.youtube.com/embed/' + yid + '" allowfullscreen></iframe></div>';
      } else {
        v = '<div class="video-box"><video id="vid" src="' + esc(l.video_url) + '" controls preload="metadata"></video><div class="video-ctrl"><span class="video-lbl">⚡ السرعة:</span><div class="spd">';
        [0.5, 1, 1.25, 1.5, 2].forEach(function(s) { v += '<button class="spd-btn ' + (s === 1 ? 'active' : '') + '" data-s="' + s + '">' + s + 'x</button>'; });
        v += '</div></div></div>';
      }
    }
    var h = '<div class="page-head"><div class="page-title">' + esc(l.title) + '</div><div class="page-sub">' + esc(l.description || '') + '</div></div>' + v;
    if (l.content) h += '<div class="q-box" style="line-height:1.9;font-size:14px;color:#cbd5e1;white-space:pre-wrap;margin-bottom:14px">' + esc(l.content) + '</div>';
    if (l.file_path) h += '<a href="' + l.file_path + '" download class="btn btn-g btn-f" style="margin-bottom:10px">📎 تحميل المرفق</a>';
    h += '<button class="btn btn-p btn-f" id="done">' + (l.completed ? '✅ مكتمل' : '✓ تحديد كمكتمل') + '</button>';
    el.innerHTML = h;
    var vid = document.getElementById('vid');
    if (vid) el.querySelectorAll('.spd-btn').forEach(function(b) { b.onclick = function() { vid.playbackRate = parseFloat(b.dataset.s); el.querySelectorAll('.spd-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); }; });
    document.getElementById('done').onclick = function() { api('/lessons/' + l.id + '/complete', { method: 'POST' }).then(function() { toast('أحسنت! 🎉'); setTimeout(back, 700); }); };
  });
};

function openLessonModal(lesson) {
  var edit = !!lesson;
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var gOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    var inner = '<div class="field"><label>🏫 الصف</label><select id="lG"><option value="">-- اختر --</option>' + gOpts + '</select></div>';
    inner += '<div class="field"><label>📚 المادة</label><select id="lS"><option value="">-- اختر الصف --</option></select></div>';
    inner += '<div class="field"><label>العنوان</label><input id="lT" value="' + (edit ? esc(lesson.title) : '') + '"></div>';
    inner += '<div class="field"><label>الوصف</label><textarea id="lD" rows="2">' + (edit ? esc(lesson.description || '') : '') + '</textarea></div>';
    inner += '<div class="field"><label>🎬 رابط فيديو</label><input id="lV" value="' + (edit ? esc(lesson.video_url || '') : '') + '"></div>';
    inner += '<div class="field" style="background:rgba(99,102,241,.08);padding:12px;border-radius:12px"><label>📹 أو ارفع فيديو</label><input type="file" id="lVF" accept="video/*"></div>';
    inner += '<div class="field"><label>المحتوى</label><textarea id="lC" rows="4">' + (edit ? esc(lesson.content || '') : '') + '</textarea></div>';
    inner += '<div class="field"><label>الترتيب</label><input type="number" id="lO" value="' + (edit ? lesson.order_index || 0 : 0) + '"></div>';
    inner += '<div class="field"><label>📎 ملف PDF</label><input type="file" id="lF" accept=".pdf"></div>';
    inner += '<div class="flex" style="gap:10px;margin-top:16px">';
    if (edit) inner += '<button class="btn btn-d" id="lDel">🗑️ حذف</button>';
    inner += '<button class="btn btn-g" id="lCancel">إلغاء</button><button class="btn btn-p" id="lSave" style="flex:1">' + (edit ? '💾 حفظ' : '✅ إضافة') + '</button></div>';
    openSheet('<div class="sheet-h"></div><div class="sheet-t">' + (edit ? '✏️ تعديل درس' : '📚 درس جديد') + '</div>' + inner);
    var gS = document.getElementById('lG'), sS = document.getElementById('lS');
    function loadSubs() { var gid = gS.value; sS.innerHTML = '<option value="">-- اختر --</option>'; if (!gid) return; subjects.filter(function(s) { return s.grade_id === +gid; }).forEach(function(s) { sS.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); }
    gS.onchange = loadSubs;
    if (edit && lesson.subject_id) { var ms = subjects.find(function(s) { return s.id === lesson.subject_id; }); if (ms) { gS.value = ms.grade_id; loadSubs(); sS.value = ms.id; } }
    document.getElementById('lCancel').onclick = closeSheet;
    document.getElementById('lSave').onclick = function() {
      var fd = new FormData();
      fd.append('title', document.getElementById('lT').value);
      fd.append('description', document.getElementById('lD').value);
      fd.append('video_url', document.getElementById('lV').value);
      fd.append('content', document.getElementById('lC').value);
      fd.append('order_index', document.getElementById('lO').value || 0);
      fd.append('subject_id', sS.value || '');
      var vf = document.getElementById('lVF').files[0];
      var ff = document.getElementById('lF').files[0];
      if (vf) fd.append('video_file', vf);
      if (ff) fd.append('file', ff);
      var pr = edit ? api('/lessons/' + lesson.id, { method: 'PUT', body: fd }) : api('/lessons', { method: 'POST', body: fd });
      pr.then(function() { toast('تم ✅'); closeSheet(); render(); }).catch(function(e) { toast(e.message, true); });
    };
    if (edit) document.getElementById('lDel').onclick = function() { if (confirm('حذف الدرس؟')) api('/lessons/' + lesson.id, { method: 'DELETE' }).then(function() { toast('تم'); closeSheet(); render(); }); };
  });
}

PAGES.quizzes = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  var adm = canUser('quizzes_add');
  api('/quizzes').then(function(qs) {
    var h = '<div class="page-head"><div class="page-title">🧠 الاختبارات</div><div class="page-sub">' + qs.length + ' اختبار</div></div>';
    if (adm) h += '<button class="btn btn-p btn-f" id="newQ" style="margin-bottom:14px">+ اختبار جديد</button>';
    if (!qs.length) { h += '<div class="empty"><div class="empty-ico">🧠</div><h3>لا توجد اختبارات</h3></div>'; el.innerHTML = h; if (adm) document.getElementById('newQ').onclick = openQuizModal; return; }
    qs.forEach(function(q) {
      var badge = '';
      if (adm) badge = '<span class="badge b-purple">' + q.count + ' سؤال</span>';
      else if (q.passed) badge = '<span class="badge b-green">✓ مجتاز</span>';
      else if (q.attempted) badge = '<span class="badge b-red">🔒 تم</span>';
      else if (q.best != null) badge = '<span class="badge b-yellow">أفضل ' + Math.round(q.best) + '%</span>';
      h += '<div class="item" data-id="' + q.id + '"><div class="item-ico">🧠</div><div class="item-body"><div class="item-title">' + esc(q.title) + '</div><div class="item-sub">' + badge + '</div></div><div class="item-arrow">←</div></div>';
    });
    el.innerHTML = h;
    el.querySelectorAll('[data-id]').forEach(function(x) { x.onclick = function() { if (adm) viewQuizAdmin(x.dataset.id); else go('quizTake', { id: x.dataset.id, back: 'quizzes' }); }; });
    var nq = document.getElementById('newQ');
    if (nq) nq.onclick = openQuizModal;
  });
};

function openQuizModal() {
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var gOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    var inner = '<div class="field"><label>العنوان</label><input id="qT"></div>';
    inner += '<div class="field"><label>الوصف</label><input id="qD"></div>';
    inner += '<div class="field"><label>🏫 الصف</label><select id="qG"><option value="">🌐 عام</option>' + gOpts + '</select></div>';
    inner += '<div class="field"><label>📚 المادة</label><select id="qS"><option value="">-- بدون --</option></select></div>';
    inner += '<div class="field"><label>⏱️ المدة (دقيقة)</label><input type="number" id="qTm" value="0" min="0"></div>';
    inner += '<div id="qW"></div>';
    inner += '<button class="btn btn-g btn-f" id="addQBtn" style="margin-bottom:10px">+ إضافة سؤال</button>';
    inner += '<div class="flex" style="gap:10px"><button class="btn btn-g" id="qC">إلغاء</button><button class="btn btn-p" id="qSave" style="flex:1">حفظ</button></div>';
    openSheet('<div class="sheet-h"></div><div class="sheet-t">🧠 اختبار جديد</div>' + inner);
    var gS = document.getElementById('qG'), sS = document.getElementById('qS');
    gS.onchange = function() { sS.innerHTML = '<option value="">-- بدون --</option>'; if (!gS.value) return; subjects.filter(function(s) { return s.grade_id === +gS.value; }).forEach(function(s) { sS.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); };
    var wrap = document.getElementById('qW');
    function addQ() {
      var i = wrap.children.length;
      var d = document.createElement('div');
      d.className = 'q-box';
      d.style.marginBottom = '12px';
      var hh = '<div class="flex" style="justify-content:space-between;margin-bottom:8px"><strong>سؤال ' + (i + 1) + '</strong><button type="button" class="btn btn-d btn-s rm">حذف</button></div><input class="qt" placeholder="السؤال" style="width:100%;padding:10px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:10px;color:#fff;font-family:inherit;margin-bottom:8px">';
      [0, 1, 2, 3].forEach(function(j) { hh += '<div class="flex" style="gap:8px;margin-bottom:6px"><input type="radio" name="c' + i + '" value="' + j + '" ' + (j === 0 ? 'checked' : '') + ' style="width:auto"><input class="op" placeholder="خيار ' + (j + 1) + '" style="flex:1;padding:8px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;color:#fff;font-family:inherit"></div>'; });
      d.innerHTML = hh;
      d.querySelector('.rm').onclick = function() { d.remove(); };
      wrap.appendChild(d);
    }
    addQ();
    document.getElementById('addQBtn').onclick = addQ;
    document.getElementById('qC').onclick = closeSheet;
    document.getElementById('qSave').onclick = function() {
      var questions = [];
      for (var i = 0; i < wrap.children.length; i++) {
        var opts = [];
        wrap.children[i].querySelectorAll('.op').forEach(function(o) { opts.push(o.value); });
        questions.push({ question: wrap.children[i].querySelector('.qt').value, options: opts, correct_index: parseInt(wrap.children[i].querySelector('input[name="c' + i + '"]:checked').value) });
      }
      api('/quizzes', { method: 'POST', body: JSON.stringify({ title: document.getElementById('qT').value, description: document.getElementById('qD').value, time_limit: parseInt(document.getElementById('qTm').value) || 0, grade_id: gS.value || null, subject_id: sS.value || null, questions: questions }) })
        .then(function() { toast('تم ✅'); closeSheet(); render(); }).catch(function(e) { toast(e.message, true); });
    };
  });
}

function viewQuizAdmin(id) {
  api('/quizzes/' + id).then(function(q) {
    var h = '<div class="sheet-h"></div><div class="sheet-t">' + esc(q.title) + '</div>';
    q.questions.forEach(function(x, i) {
      h += '<div class="q-box"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + '</div>';
      x.options.forEach(function(o, j) { h += '<div class="opt ' + (j === x.correct_index ? 'ok' : '') + '"><span>' + esc(o) + '</span></div>'; });
      h += '</div>';
    });
    h += '<button class="btn btn-g btn-f" onclick="closeSheet()">إغلاق</button>';
    openSheet(h);
  });
}

PAGES.quizTake = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/quizzes/' + state.params.id).then(function(q) {
    if (q.attempted) {
      el.innerHTML = '<div class="empty"><div class="empty-ico">🔒</div><h3>' + (q.passed ? 'لقد اجتزت هذا الاختبار' : 'لقد أديت هذا الاختبار مسبقًا') + '</h3><p>لا يمكن إعادته نهائيًا</p><button class="btn btn-p" style="margin-top:20px" onclick="back()">← العودة</button></div>';
      return;
    }
    var h = '<div class="page-head"><div class="page-title">' + esc(q.title) + '</div><div class="page-sub">' + q.questions.length + ' سؤال</div></div>';
    if (q.time_limit) h += '<div class="timer" id="tm">⏱️ <span id="tv">' + fmt(q.time_limit * 60) + '</span></div>';
    h += '<div id="qw"></div>';
    h += '<button class="btn btn-p btn-f" id="sub" style="margin-top:14px">إرسال الإجابات</button>';
    el.innerHTML = h;
    var answers = [];
    for (var i = 0; i < q.questions.length; i++) answers.push(null);
    var w = document.getElementById('qw');
    q.questions.forEach(function(x, i) {
      var qh = '<div class="q-box"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + '</div>';
      x.options.forEach(function(o, j) { qh += '<label class="opt" data-q="' + i + '" data-o="' + j + '"><input type="radio" name="q' + i + '" style="width:auto"><span>' + esc(o) + '</span></label>'; });
      qh += '</div>';
      var d = document.createElement('div');
      d.innerHTML = qh;
      w.appendChild(d);
    });
    el.querySelectorAll('.opt').forEach(function(o) { o.onclick = function() { answers[+o.dataset.q] = +o.dataset.o; el.querySelectorAll('.opt[data-q="' + o.dataset.q + '"]').forEach(function(x) { x.classList.remove('sel'); }); o.classList.add('sel'); }; });
    var timerInt = null, timeLeft = q.time_limit ? q.time_limit * 60 : 0;
    function doSub(auto) {
      if (timerInt) clearInterval(timerInt);
      if (!auto && answers.indexOf(null) !== -1) return toast('أجب على الكل', true);
      api('/quizzes/' + q.id + '/submit', { method: 'POST', body: JSON.stringify({ answers: answers }) })
        .then(function(r) { showResult(r, q.id, answers); })
        .catch(function(e) { toast(e.message, true); });
    }
    document.getElementById('sub').onclick = function() { doSub(false); };
    if (q.time_limit) {
      timerInt = setInterval(function() {
        timeLeft--;
        var tv = document.getElementById('tv');
        if (tv) tv.textContent = fmt(timeLeft);
        if (timeLeft <= 60) { var tm = document.getElementById('tm'); if (tm) tm.classList.add('warn'); }
        if (timeLeft <= 0) { clearInterval(timerInt); toast('انتهى الوقت!', true); doSub(true); }
      }, 1000);
    }
  });
};

function showResult(r, qid, ua) {
  var c = r.percentage >= 80 ? 'green' : r.percentage >= 50 ? 'cyan' : 'red';
  var msg = r.percentage >= 80 ? '🎉 ممتاز!' : r.percentage >= 50 ? '👍 جيد' : '💪 راجع';
  var h = '<div class="sheet-h"></div><div style="text-align:center;padding:20px 0"><div class="stat-value" style="font-size:64px">' + r.percentage + '%</div><p class="muted" style="margin-top:8px">' + r.score + ' من ' + r.total + '</p><span class="badge b-' + c + '">' + msg + '</span></div>';
  h += '<div style="text-align:right;max-height:40vh;overflow-y:auto;margin-top:14px"><h3 style="font-size:14px;margin-bottom:10px">📋 مراجعة الإجابات</h3>';
  api('/quizzes/' + qid + '/review').then(function(quiz) {
    quiz.questions.forEach(function(x, i) {
      var my = ua[i]; var isR = my === x.correct_index;
      h += '<div class="q-box" style="border-color:' + (isR ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)') + '"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + ' ' + (isR ? '✅' : '❌') + '</div>';
      x.options.forEach(function(o, j) { var cls = ''; if (j === x.correct_index) cls = 'ok'; else if (j === my) cls = 'bad'; h += '<div class="opt ' + cls + '"><span>' + esc(o) + '</span></div>'; });
      h += '</div>';
    });
    h += '</div><button class="btn btn-p btn-f" style="margin-top:14px" onclick="closeSheet();go(\'quizzes\')">حسنًا</button>';
    openSheet(h);
  });
}

PAGES.files = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  var isA = state.user.role === 'admin' || state.user.role === 'assistant';
  api('/files').then(function(fs) {
    var h = '<div class="page-head"><div class="page-title">📁 الملفات</div><div class="page-sub">' + fs.length + ' ملف</div></div>';
    if (isA) h += '<button class="btn btn-p btn-f" id="newF" style="margin-bottom:14px">+ رفع ملف PDF</button>';
    if (!fs.length) { h += '<div class="empty"><div class="empty-ico">📁</div><h3>لا توجد ملفات</h3></div>'; el.innerHTML = h; return; }
    fs.forEach(function(f) {
      h += '<div class="q-box" style="margin-bottom:10px"><div style="font-weight:800;margin-bottom:6px">' + esc(f.title) + '</div>';
      if (f.grade_name) h += '<div class="badge b-purple" style="margin-bottom:8px">' + esc(f.grade_name) + '</div>';
      if (f.notes) h += '<div style="background:rgba(251,191,36,.08);border-right:3px solid #fbbf24;padding:8px 10px;border-radius:8px;font-size:12px;color:#fde68a;margin-bottom:10px">📝 ' + esc(f.notes) + '</div>';
      h += '<a href="' + f.file_path + '" target="_blank" download class="btn btn-p btn-s btn-f" style="text-decoration:none">⬇️ تحميل</a>';
      if (isA) h += '<button class="btn btn-d btn-s btn-f" data-delf="' + f.id + '" style="margin-top:6px">🗑️ حذف</button>';
      h += '</div>';
    });
    el.innerHTML = h;
    if (isA) {
      document.getElementById('newF').onclick = openFileModal;
      el.querySelectorAll('[data-delf]').forEach(function(b) { b.onclick = function() { if (confirm('حذف؟')) api('/files/' + b.dataset.delf, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    }
  });
};

function openFileModal() {
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var gOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    var inner = '<div class="field"><label>🏫 الصف (اختياري)</label><select id="fG"><option value="">🌐 عام</option>' + gOpts + '</select></div>';
    inner += '<div class="field"><label>📚 المادة</label><select id="fS"><option value="">-- بدون --</option></select></div>';
    inner += '<div class="field"><label>العنوان</label><input id="fT"></div>';
    inner += '<div class="field"><label>📝 ملاحظات</label><textarea id="fN" rows="2"></textarea></div>';
    inner += '<div class="field"><label>📄 الملف</label><input type="file" id="fFl" accept=".pdf"></div>';
    inner += '<div class="flex" style="gap:10px"><button class="btn btn-g" onclick="closeSheet()">إلغاء</button><button class="btn btn-p" id="fSave" style="flex:1">⬆️ رفع</button></div>';
    openSheet('<div class="sheet-h"></div><div class="sheet-t">📄 رفع ملف PDF</div>' + inner);
    var gS = document.getElementById('fG'), sS = document.getElementById('fS');
    gS.onchange = function() { sS.innerHTML = '<option value="">-- بدون --</option>'; if (!gS.value) return; subjects.filter(function(s) { return s.grade_id === +gS.value; }).forEach(function(s) { sS.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); };
    document.getElementById('fSave').onclick = function() {
      var f = document.getElementById('fFl').files[0];
      if (!f) return toast('اختر ملف', true);
      var fd = new FormData();
      fd.append('title', document.getElementById('fT').value || f.name);
      fd.append('notes', document.getElementById('fN').value);
      fd.append('grade_id', gS.value || '');
      fd.append('subject_id', sS.value || '');
      fd.append('pdf_file', f);
      api('/files', { method: 'POST', body: fd }).then(function() { toast('تم الرفع ✅'); closeSheet(); render(); }).catch(function(e) { toast(e.message, true); });
    };
  });
}

PAGES.more = function(el) {
  var u = state.user;
  var h = '<div class="q-box" style="text-align:center;padding:24px"><div style="font-size:56px">' + (u.role === 'admin' ? '👑' : u.role === 'assistant' ? '🧑‍💼' : '🎓') + '</div><div style="font-size:20px;font-weight:900;margin:6px 0">' + esc(u.name) + '</div><div class="muted" style="font-size:12px">' + esc(u.email) + '</div></div>';
  function item(ico, title, sub, action) { return '<div class="item" data-action="' + action + '"><div class="item-ico">' + ico + '</div><div class="item-body"><div class="item-title">' + title + '</div>' + (sub ? '<div class="item-sub">' + sub + '</div>' : '') + '</div><div class="item-arrow">←</div></div>'; }
  if (u.role === 'student') {
    h += item('📅', 'برنامجي الدراسي', '', 'myprogram');
    h += item('🏆', 'شهاداتي', '', 'certificates');
    h += item('📈', 'تقاريري', '', 'reports');
    h += item('✉️', 'الرسائل', '', 'messages');
    h += item('🔔', 'الإشعارات', '', 'notifications');
    h += item('👤', 'ملفي الشخصي', '', 'profile');
  } else {
    h += item('📁', 'الملفات', '', 'files');
    h += item('🏫', 'الصفوف والمواد', '', 'grades');
    h += item('🏅', 'النقاط', '', 'points');
    h += item('🏆', 'النتائج والإجابات', '', 'results');
    h += item('📈', 'التقارير البيانية', '', 'analytics');
    h += item('🧑‍💼', 'المساعدون', '', 'assistants');
    h += item('✉️', 'إرسال رسالة خاصة', '', 'adminMessages');
    h += item('📅', 'البرامج الدراسية', '', 'adminPrograms');
    h += item('📜', 'سجل النشاطات', '', 'activities');
    h += item('⚙️', 'الإعدادات', '', 'settings');
    h += item('👤', 'ملفي الشخصي', '', 'profile');
  }
  h += '<div class="item" data-action="logout" style="background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3)"><div class="item-ico" style="background:rgba(239,68,68,.15)">🚪</div><div class="item-body"><div class="item-title" style="color:#fca5a5">تسجيل الخروج</div></div></div>';
  el.innerHTML = h;
  el.querySelectorAll('[data-action]').forEach(function(x) {
    x.onclick = function() {
      var a = x.dataset.action;
      if (a === 'logout') { if (confirm('خروج؟')) logout(); }
      else go(a, { back: 'more' });
    };
  });
};

PAGES.myprogram = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/me/program').then(function(r) {
    if (!r.program || !r.program.trim()) { el.innerHTML = '<div class="empty"><div class="empty-ico">📅</div><h3>لم يُضف برنامجك بعد</h3></div>'; return; }
    el.innerHTML = '<div class="q-box" style="line-height:1.9;font-size:14px;white-space:pre-wrap">' + esc(r.program) + '</div>';
  });
};

PAGES.certificates = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/certificates').then(function(cs) {
    if (!cs.length) { el.innerHTML = '<div class="empty"><div class="empty-ico">🏆</div><h3>لا شهادات بعد</h3><p>احصل على 100% في اختبار</p></div>'; return; }
    var h = '<div class="page-head"><div class="page-title">🏆 شهاداتي</div><div class="page-sub">' + cs.length + '</div></div>';
    cs.forEach(function(c, i) { h += '<div class="q-box" style="text-align:center;cursor:pointer;margin-bottom:10px" data-cert="' + i + '"><div style="font-size:44px">🏆</div><div style="font-weight:800;margin:6px 0">' + esc(c.quiz_title) + '</div><span class="badge b-green">100%</span></div>'; });
    el.innerHTML = h;
    el.querySelectorAll('[data-cert]').forEach(function(x) { x.onclick = function() { showCert(cs[+x.dataset.cert]); }; });
  });
};

function showCert(c) {
  var date = new Date(c.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  var bd = document.createElement('div');
  bd.className = 'cert-bd';
  bd.innerHTML = '<div class="cert"><div class="cert-logo">' + LOGO + '</div><div class="cert-brand">مشكاة المعرفة</div><div class="cert-en">MISHKAT AL-MAAREFA</div><div class="cert-title">شهادة إتمام</div><div class="cert-body">يُشهد بأن الطالب</div><div class="cert-name">' + esc(state.user.name) + '</div><div class="cert-body">قد أتم بنجاح اختبار</div><div class="cert-quiz">« ' + esc(c.quiz_title) + ' »</div><div class="cert-score">100%</div><div class="cert-body" style="margin-top:14px">بتاريخ ' + date + '</div><button class="btn btn-p btn-f" style="margin-top:14px" onclick="window.print()">🖨️ طباعة</button><button class="btn btn-g btn-f" style="margin-top:8px" id="cc">إغلاق</button></div>';
  document.body.appendChild(bd);
  document.getElementById('cc').onclick = function() { bd.remove(); };
}

PAGES.reports = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/me/charts').then(function(d) {
    var o = d.overall;
    var pct = o.lessonsTotal ? Math.round(o.lessonsDone / o.lessonsTotal * 100) : 0;
    var h = '<div class="stats">';
    h += '<div class="stat"><span class="si">✅</span><div class="sv">' + pct + '%</div><div class="sl">إتمام المنهج</div></div>';
    h += '<div class="stat"><span class="si">🎯</span><div class="sv">' + o.avgScore + '%</div><div class="sl">متوسط الدرجات</div></div>';
    h += '<div class="stat"><span class="si">🧠</span><div class="sv">' + o.quizzesTaken + '</div><div class="sl">اختبارات</div></div>';
    h += '<div class="stat"><span class="si">📚</span><div class="sv">' + o.lessonsDone + '/' + o.lessonsTotal + '</div><div class="sl">دروس</div></div>';
    h += '</div>';
    if (d.progressBySubject && d.progressBySubject.length) {
      h += '<div class="page-head" style="margin-top:20px"><div class="page-title" style="font-size:18px">📚 التقدم حسب المواد</div></div>';
      d.progressBySubject.forEach(function(s) { var p = s.total ? Math.round(s.completed / s.total * 100) : 0; h += '<div class="q-box"><div class="flex" style="justify-content:space-between;font-size:13px;margin-bottom:6px"><strong>' + esc(s.subject) + '</strong><span class="muted">' + s.completed + '/' + s.total + '</span></div><div class="bar"><div style="width:' + p + '%"></div></div></div>'; });
    }
    el.innerHTML = h;
  }).catch(function(e) { el.innerHTML = '<div class="empty"><h3>' + esc(e.message) + '</h3></div>'; });
};

PAGES.profile = function(el) {
  var u = state.user;
  var h = '<div class="q-box" style="text-align:center;padding:24px"><div style="font-size:56px">👤</div><div style="font-size:20px;font-weight:900;margin:6px 0">' + esc(u.name) + '</div><div class="muted" style="font-size:12px">' + esc(u.email) + '</div></div>';
  h += '<div class="item" id="chPwd"><div class="item-ico">🔒</div><div class="item-body"><div class="item-title">تغيير كلمة المرور</div></div><div class="item-arrow">←</div></div>';
  el.innerHTML = h;
  document.getElementById('chPwd').onclick = function() {
    var inner = '<div class="field"><label>الحالية</label><input type="password" id="c1"></div><div class="field"><label>الجديدة</label><input type="password" id="c2"></div><div class="field"><label>التأكيد</label><input type="password" id="c3"></div><button class="btn btn-p btn-f" id="svP" style="margin-top:14px">حفظ</button><button class="btn btn-g btn-f" style="margin-top:8px" onclick="closeSheet()">إلغاء</button>';
    openSheet('<div class="sheet-h"></div><div class="sheet-t">🔒 تغيير كلمة المرور</div>' + inner);
    document.getElementById('svP').onclick = function() {
      var n = document.getElementById('c2').value, f = document.getElementById('c3').value;
      if (n !== f) return toast('غير متطابقتين', true);
      if (n.length < 6) return toast('قصيرة', true);
      api('/change-password', { method: 'POST', body: JSON.stringify({ current: document.getElementById('c1').value, newpass: n }) })
        .then(function() { toast('تم ✅'); closeSheet(); }).catch(function(e) { toast(e.message, true); });
    };
  };
};

PAGES.notifications = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/notifications').then(function(r) {
    var list = r.notifications || [];
    if (!list.length) { el.innerHTML = '<div class="empty"><div class="empty-ico">🔕</div><h3>لا توجد إشعارات</h3></div>'; return; }
    var h = '<div class="flex" style="gap:8px;margin-bottom:14px"><button class="btn btn-g btn-s" id="ma" style="flex:1">✅ الكل مقروء</button><button class="btn btn-d btn-s" id="ca" style="flex:1">🗑️ حذف الكل</button></div>';
    list.forEach(function(n) {
      var ico = n.type && n.type.indexOf('lesson') > -1 ? '📚' : n.type && n.type.indexOf('quiz') > -1 ? '🧠' : n.type && n.type.indexOf('file') > -1 ? '📁' : '🔔';
      h += '<div class="notif ' + (n.read ? '' : 'unread') + '" data-id="' + n.id + '" data-link="' + (n.link || '') + '"><div class="notif-ico">' + ico + '</div><div class="notif-body"><div class="notif-title">' + esc(n.title) + '</div><div class="notif-msg">' + esc(n.message) + '</div><div class="notif-date">🕐 ' + new Date(n.created_at).toLocaleString('ar-EG') + '</div></div><button class="notif-del" data-nd="' + n.id + '">🗑️</button></div>';
    });
    el.innerHTML = h;
    document.getElementById('ma').onclick = function() { api('/notifications/read-all', { method: 'POST' }).then(function() { toast('تم'); render(); }); };
    document.getElementById('ca').onclick = function() { if (confirm('حذف الكل؟')) api('/notifications/clear-all', { method: 'DELETE' }).then(function() { toast('تم'); render(); }); };
    el.querySelectorAll('[data-nd]').forEach(function(b) { b.onclick = function(e) { e.stopPropagation(); api('/notifications/' + b.dataset.nd, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    el.querySelectorAll('.notif').forEach(function(c) {
      c.onclick = function(e) {
        if (e.target.hasAttribute('data-nd')) return;
        api('/notifications/' + c.dataset.id + '/read', { method: 'POST' }).then(function() { if (c.dataset.link) go(c.dataset.link, { back: 'home' }); else render(); });
      };
    });
  });
};

PAGES.messages = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/me/messages').then(function(r) {
    var list = r.messages || [];
    if (!list.length) { el.innerHTML = '<div class="empty"><div class="empty-ico">✉️</div><h3>لا توجد رسائل</h3></div>'; return; }
    var h = '<div class="page-head"><div class="page-title">✉️ رسائلي</div></div>';
    list.forEach(function(m) {
      var ico = m.type === 'video' ? '🎥' : m.type === 'pdf' ? '📄' : m.type === 'link' ? '🔗' : '💬';
      h += '<div class="q-box" style="border-color:' + (m.read ? 'var(--border)' : 'rgba(99,102,241,.5)') + '"><div class="flex" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:22px">' + ico + '</span>' + (m.read ? '' : '<span class="badge b-cyan">جديد</span>') + '</div>';
      if (m.content) h += '<div style="font-size:14px;line-height:1.7;white-space:pre-wrap;margin-bottom:10px">' + esc(m.content) + '</div>';
      if (m.file_path && m.type === 'video') h += '<video src="' + m.file_path + '" controls style="width:100%;border-radius:10px;margin-bottom:10px"></video>';
      if (m.file_path && m.type === 'pdf') h += '<a href="' + m.file_path + '" class="btn btn-p btn-s btn-f" target="_blank" download style="text-decoration:none;margin-bottom:10px">📥 تحميل الملف</a>';
      h += '<div class="muted" style="font-size:11px">🕐 ' + new Date(m.created_at).toLocaleString('ar-EG') + '</div></div>';
    });
    el.innerHTML = h;
    list.forEach(function(m) { if (!m.read) api('/me/messages/' + m.id + '/read', { method: 'POST' }).catch(function(){}); });
  });
};

PAGES.students = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/students').then(function(s) {
    var h = '<div class="page-head"><div class="page-title">👥 الطلاب</div><div class="page-sub">' + s.length + ' طالب</div></div>';
    h += '<div class="search"><span class="si">🔍</span><input id="sq" placeholder="ابحث..."></div><div id="res"></div>';
    el.innerHTML = h;
    function render(query) {
      query = (query || '').trim().toLowerCase();
      var f = s; if (query) f = s.filter(function(x) { return (x.name || '').toLowerCase().indexOf(query) !== -1 || (x.email || '').toLowerCase().indexOf(query) !== -1 || (x.phone || '').toLowerCase().indexOf(query) !== -1; });
      var r = document.getElementById('res');
      if (!f.length) { r.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div><h3>لا نتائج</h3></div>'; return; }
      var hh = '';
      f.forEach(function(x) {
        hh += '<div class="q-box" style="margin-bottom:10px"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><div><div style="font-size:16px;font-weight:900">' + esc(x.name) + '</div><div class="muted" style="font-size:11px;direction:ltr;margin-top:3px">' + esc(x.email) + '</div></div><span class="badge b-purple">' + esc(x.grade_name) + '</span></div>';
        hh += '<div class="flex" style="gap:6px"><span class="badge b-cyan">📚 ' + (x.done || 0) + '</span><span class="badge b-green">🎯 ' + Math.round(x.avg || 0) + '%</span></div>';
        hh += '<div class="flex" style="gap:6px;margin-top:10px">';
        var ph = (x.phone || '').replace(/[^0-9]/g, '');
        if (ph) hh += '<a href="https://wa.me/' + ph + '" target="_blank" class="btn btn-s" style="flex:1;background:rgba(37,211,102,.2);color:#6ee7b7;text-decoration:none;border:1px solid rgba(37,211,102,.3)">💬 واتساب</a>';
        hh += '<button class="btn btn-g btn-s" data-rep="' + x.id + '" style="flex:1">📊 التقرير</button>';
        hh += '</div></div>';
      });
      r.innerHTML = hh;
      r.querySelectorAll('[data-rep]').forEach(function(b) { b.onclick = function() { go('studentReport', { id: b.dataset.rep, back: 'students' }); }; });
    }
    render('');
    document.getElementById('sq').addEventListener('input', function() { render(this.value); });
  });
};

PAGES.studentReport = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/students/' + state.params.id + '/full-report').then(function(r) {
    var s = r.stats;
    var h = '<div class="page-head"><div class="page-title">📊 ' + esc(r.student.name) + '</div><div class="page-sub">' + esc(r.student.email) + '</div></div>';
    h += '<div class="stats">';
    h += '<div class="stat"><span class="si">🎯</span><div class="sv">' + s.avgScore + '%</div><div class="sl">المتوسط</div></div>';
    h += '<div class="stat"><span class="si">📚</span><div class="sv">' + s.completedLessons + '/' + s.totalLessons + '</div><div class="sl">دروس</div></div>';
    h += '<div class="stat"><span class="si">🧠</span><div class="sv">' + s.passedQuizzes + '/' + s.totalQuizzes + '</div><div class="sl">اختبارات ناجحة</div></div>';
    h += '<div class="stat"><span class="si">🏆</span><div class="sv">' + s.certificates + '</div><div class="sl">شهادات</div></div>';
    h += '</div>';
    el.innerHTML = h;
  });
};

PAGES.grades = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0], subs = r[1];
    var h = '<div class="page-head"><div class="page-title">🏫 الصفوف والمواد</div></div>';
    h += '<button class="btn btn-p btn-f" id="addG" style="margin-bottom:14px">+ إضافة صف</button>';
    grades.forEach(function(g) {
      h += '<div class="q-box"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><strong style="font-size:15px">📚 ' + esc(g.name) + '</strong><div class="flex" style="gap:6px"><button class="btn btn-g btn-s" data-addsub="' + g.id + '">+ مادة</button><button class="btn btn-d btn-s" data-delg="' + g.id + '">🗑️</button></div></div>';
      var ss = subs.filter(function(x) { return x.grade_id === g.id; });
      if (ss.length) { h += '<div class="flex" style="flex-wrap:wrap;gap:6px">'; ss.forEach(function(x) { h += '<span class="badge b-purple">' + esc(x.name) + ' <span data-dels="' + x.id + '" style="cursor:pointer;margin-right:6px">×</span></span>'; }); h += '</div>'; }
      else h += '<div class="muted" style="font-size:12px">لا توجد مواد</div>';
      h += '</div>';
    });
    el.innerHTML = h;
    document.getElementById('addG').onclick = function() { var n = prompt('اسم الصف:'); if (n) api('/grades', { method: 'POST', body: JSON.stringify({ name: n }) }).then(function() { toast('تم ✅'); render(); }); };
    el.querySelectorAll('[data-addsub]').forEach(function(b) { b.onclick = function() { var n = prompt('اسم المادة:'); if (n) api('/subjects', { method: 'POST', body: JSON.stringify({ name: n, grade_id: b.dataset.addsub }) }).then(function() { toast('تم ✅'); render(); }); }; });
    el.querySelectorAll('[data-delg]').forEach(function(b) { b.onclick = function() { if (confirm('حذف الصف؟')) api('/grades/' + b.dataset.delg, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    el.querySelectorAll('[data-dels]').forEach(function(b) { b.onclick = function() { if (confirm('حذف المادة؟')) api('/subjects/' + b.dataset.dels, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
  });
};

PAGES.points = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/points').then(function(list) {
    var h = '<div class="page-head"><div class="page-title">🏅 النقاط</div></div>';
    if (!list.length) h += '<div class="empty"><div class="empty-ico">🏅</div><h3>لا يوجد طلاب</h3></div>';
    var medals = ['🥇', '🥈', '🥉'];
    list.forEach(function(u, i) {
      var c = u.total > 0 ? '#10b981' : u.total < 0 ? '#ef4444' : '#94a3b8';
      h += '<div class="q-box" style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="font-size:18px;font-weight:900;color:#94a3b8">' + (i < 3 ? medals[i] : '#' + (i + 1)) + '</div><div style="flex:1"><div style="font-weight:800;font-size:14px">' + esc(u.name) + '</div><div class="muted" style="font-size:11px">' + u.operations + ' عملية</div></div><div style="font-size:22px;font-weight:900;color:' + c + '">' + u.total + '</div><button class="btn btn-p btn-s" data-addp="' + u.id + '" data-n="' + esc(u.name) + '">➕</button></div>';
    });
    el.innerHTML = h;
    el.querySelectorAll('[data-addp]').forEach(function(b) { b.onclick = function() { openAddPoints(b.dataset.addp, b.dataset.n); }; });
  });
};

function openAddPoints(sid, name) {
  var inner = '<div class="field"><label>القيمة (+/-)</label><input type="number" id="pv" placeholder="10 أو -5"></div><div class="field"><label>السبب</label><input id="pr"></div><button class="btn btn-p btn-f" id="pSave" style="margin-top:10px">✅ إضافة</button><button class="btn btn-g btn-f" style="margin-top:8px" onclick="closeSheet()">إلغاء</button>';
  openSheet('<div class="sheet-h"></div><div class="sheet-t">🏅 نقاط ' + esc(name) + '</div>' + inner);
  document.getElementById('pSave').onclick = function() {
    var v = parseInt(document.getElementById('pv').value);
    if (!v) return toast('ادخل قيمة', true);
    api('/admin/points', { method: 'POST', body: JSON.stringify({ student_id: sid, value: v, reason: document.getElementById('pr').value || '' }) })
      .then(function() { toast('تم ✅'); closeSheet(); render(); }).catch(function(e) { toast(e.message, true); });
  };
}

PAGES.results = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/results').then(function(r) {
    var h = '<div class="page-head"><div class="page-title">🏆 النتائج</div><div class="page-sub">' + r.length + ' تسليم</div></div>';
    if (!r.length) h += '<div class="empty"><div class="empty-ico">🏆</div><h3>لا نتائج</h3></div>';
    r.forEach(function(x) {
      var p = Math.round(x.score / x.total * 100);
      var c = p >= 80 ? 'green' : p >= 50 ? 'cyan' : 'red';
      h += '<div class="q-box" style="margin-bottom:10px"><div style="font-weight:800">' + esc(x.student_name) + '</div><div class="muted" style="font-size:12px;margin:4px 0">' + esc(x.quiz_title) + '</div><div class="flex" style="justify-content:space-between;margin-top:8px"><span class="badge b-' + c + '">' + p + '%</span><span class="muted" style="font-size:11px">' + x.score + '/' + x.total + '</span></div></div>';
    });
    el.innerHTML = h;
  });
};

PAGES.analytics = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/analytics').then(function(d) {
    var t = d.totals;
    var h = '<div class="stats">';
    h += '<div class="stat"><span class="si">👥</span><div class="sv">' + t.students + '</div><div class="sl">الطلاب</div></div>';
    h += '<div class="stat"><span class="si">✅</span><div class="sv">' + t.lessonsCompleted + '/' + t.totalLessons + '</div><div class="sl">إنجازات</div></div>';
    h += '<div class="stat"><span class="si">🧠</span><div class="sv">' + t.quizSubmissions + '</div><div class="sl">تسليمات</div></div>';
    h += '<div class="stat"><span class="si">🎯</span><div class="sv">' + t.avgScore + '%</div><div class="sl">متوسط</div></div>';
    h += '</div>';
    if (d.grades && d.grades.length) {
      h += '<div class="page-head" style="margin-top:20px"><div class="page-title" style="font-size:18px">🏫 التقدم حسب الصف</div></div>';
      d.grades.forEach(function(g) { var p = g.students ? Math.round(g.completions / Math.max(1, g.students) * 100) : 0; h += '<div class="q-box"><div class="flex" style="justify-content:space-between;font-size:13px;margin-bottom:6px"><strong>' + esc(g.name) + '</strong><span class="muted">' + g.students + ' · ' + g.avg + '%</span></div><div class="bar"><div style="width:' + Math.min(p, 100) + '%"></div></div></div>'; });
    }
    if (d.topStudents && d.topStudents.length) {
      h += '<div class="page-head" style="margin-top:20px"><div class="page-title" style="font-size:18px">🏆 أفضل الطلاب</div></div>';
      var medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      d.topStudents.forEach(function(s, i) { h += '<div class="q-box" style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="font-size:24px">' + medals[i] + '</div><div style="flex:1"><div style="font-weight:800">' + esc(s.name) + '</div><div class="muted" style="font-size:11px">' + s.completed + ' درس · ' + s.quizzes + ' اختبار</div></div><div style="font-size:20px;font-weight:900;color:#a855f7">' + s.avg + '%</div></div>'; });
    }
    el.innerHTML = h;
  }).catch(function(e) { el.innerHTML = '<div class="empty"><h3>' + esc(e.message) + '</h3></div>'; });
};

PAGES.assistants = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/assistants').then(function(list) {
    var h = '<div class="page-head"><div class="page-title">🧑‍💼 المساعدون</div></div>';
    h += '<button class="btn btn-p btn-f" id="addA" style="margin-bottom:14px">+ مساعد جديد</button>';
    if (!list.length) h += '<div class="empty"><div class="empty-ico">🧑‍💼</div><h3>لا مساعدون</h3></div>';
    list.forEach(function(u) {
      h += '<div class="q-box" style="margin-bottom:10px"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><div><div style="font-weight:800">' + esc(u.name) + '</div><div class="muted" style="font-size:11px;direction:ltr;margin-top:3px">' + esc(u.email) + '</div></div><button class="btn btn-d btn-s" data-dela="' + u.id + '">🗑️</button></div>';
      if (u.permissions && u.permissions.length) { h += '<div class="flex" style="flex-wrap:wrap;gap:4px">'; u.permissions.forEach(function(p) { h += '<span class="badge b-green" style="font-size:10px">' + p + '</span>'; }); h += '</div>'; }
      h += '</div>';
    });
    el.innerHTML = h;
    document.getElementById('addA').onclick = openAssistant;
    el.querySelectorAll('[data-dela]').forEach(function(b) { b.onclick = function() { if (confirm('حذف؟')) api('/assistants/' + b.dataset.dela, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
  });
};

function openAssistant() {
  var permsList = [{ key: 'lessons_add', label: '📚 الدروس' }, { key: 'files_add', label: '📁 الملفات' }, { key: 'students_add', label: '👥 الطلاب' }, { key: 'quizzes_add', label: '🧠 الاختبارات' }, { key: 'ratings_view', label: '⭐ التقييمات' }, { key: 'program_edit', label: '📅 تعديل البرامج' }];
  var phtml = permsList.map(function(p) { return '<label style="display:flex;gap:10px;padding:10px;background:rgba(255,255,255,.03);border-radius:10px;margin-bottom:6px"><input type="checkbox" class="pc" value="' + p.key + '" style="width:auto"><span>' + p.label + '</span></label>'; }).join('');
  var inner = '<div class="field"><label>الاسم</label><input id="aN"></div><div class="field"><label>البريد</label><input type="email" id="aE"></div><div class="field"><label>كلمة المرور</label><input type="password" id="aP"></div><div class="field"><label>الصلاحيات</label>' + phtml + '</div><div class="flex" style="gap:10px;margin-top:14px"><button class="btn btn-g" onclick="closeSheet()">إلغاء</button><button class="btn btn-p" id="aSave" style="flex:1">إنشاء</button></div>';
  openSheet('<div class="sheet-h"></div><div class="sheet-t">🧑‍💼 مساعد جديد</div>' + inner);
  document.getElementById('aSave').onclick = function() {
    var perms = [];
    document.getElementById('sheet').querySelectorAll('.pc:checked').forEach(function(c) { perms.push(c.value); });
    api('/assistants', { method: 'POST', body: JSON.stringify({ name: document.getElementById('aN').value, email: document.getElementById('aE').value, password: document.getElementById('aP').value, permissions: perms }) })
      .then(function() { toast('تم ✅'); closeSheet(); render(); }).catch(function(e) { toast(e.message, true); });
  };
}

PAGES.settings = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/settings').then(function(s) {
    el.innerHTML = '<div class="q-box"><div class="field"><label>الاسم</label><input id="sn" value="' + esc(s.name) + '"></div><div class="field"><label>البريد</label><input id="se" type="email" value="' + esc(s.email) + '"></div><button class="btn btn-p btn-f" id="svs">💾 حفظ</button></div><div class="q-box" style="margin-top:14px"><div class="sheet-t" style="font-size:16px">🔒 كلمة المرور</div><div class="field"><label>الحالية</label><input type="password" id="p1"></div><div class="field"><label>الجديدة</label><input type="password" id="p2"></div><button class="btn btn-p btn-f" id="svp">🔒 تغيير</button></div>';
    document.getElementById('svs').onclick = function() { api('/settings', { method: 'POST', body: JSON.stringify({ name: document.getElementById('sn').value, email: document.getElementById('se').value }) }).then(function() { toast('تم ✅'); state.user.name = document.getElementById('sn').value; localStorage.setItem('m_user', JSON.stringify(state.user)); render(); }).catch(function(e) { toast(e.message, true); }); };
    document.getElementById('svp').onclick = function() { var n = document.getElementById('p2').value; if (n.length < 6) return toast('قصيرة', true); api('/change-password', { method: 'POST', body: JSON.stringify({ current: document.getElementById('p1').value, newpass: n }) }).then(function() { toast('تم ✅'); }).catch(function(e) { toast(e.message, true); }); };
  });
};

PAGES.adminMessages = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/students').then(function(students) {
    if (!students.length) { el.innerHTML = '<div class="empty"><h3>لا يوجد طلاب</h3></div>'; return; }
    var opts = students.map(function(s) { return '<option value="' + s.id + '">' + esc(s.name) + ' (' + esc(s.grade_name) + ')</option>'; }).join('');
    var h = '<div class="q-box"><div class="field"><label>الطالب</label><select id="ms"><option value="">-- اختر --</option>' + opts + '</select></div><div class="field"><label>النوع</label><select id="mt"><option value="text">💬 نص</option><option value="link">🔗 رابط</option><option value="pdf">📄 PDF</option><option value="video">🎥 فيديو</option></select></div><div class="field"><label>النص/الوصف</label><textarea id="mc" rows="3"></textarea></div><div class="field" id="lw" style="display:none"><label>الرابط</label><input id="ml"></div><div class="field" id="fw" style="display:none"><label>الملف</label><input type="file" id="mf"></div><button class="btn btn-p btn-f" id="sendM">📤 إرسال</button></div>';
    el.innerHTML = h;
    document.getElementById('mt').onchange = function() { var t = this.value; document.getElementById('lw').style.display = t === 'link' ? 'block' : 'none'; document.getElementById('fw').style.display = (t === 'pdf' || t === 'video') ? 'block' : 'none'; };
    document.getElementById('sendM').onclick = function() {
      var sid = document.getElementById('ms').value;
      var t = document.getElementById('mt').value;
      var c = document.getElementById('mc').value;
      var l = document.getElementById('ml').value;
      var f = document.getElementById('mf');
      if (!sid) return toast('اختر الطالب', true);
      if (t === 'text' && !c.trim()) return toast('اكتب نص', true);
      if (t === 'link' && !l.trim()) return toast('الصق الرابط', true);
      if ((t === 'pdf' || t === 'video') && !f.files.length) return toast('اختر ملف', true);
      var fd = new FormData();
      fd.append('student_id', sid); fd.append('type', t);
      fd.append('content', t === 'link' ? (c ? c + '\n' : '') + l : c);
      if (f.files[0]) fd.append('msg_file', f.files[0]);
      api('/admin/messages', { method: 'POST', body: fd }).then(function() { toast('تم الإرسال ✅'); document.getElementById('mc').value = ''; document.getElementById('ml').value = ''; f.value = ''; }).catch(function(e) { toast(e.message, true); });
    };
  });
};

PAGES.adminPrograms = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  Promise.all([api('/students'), api('/grades')]).then(function(r) {
    var students = r[0], grades = r[1];
    var stOpts = students.map(function(s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
    var grOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    var h = '<div class="q-box"><div class="field"><label>الهدف</label><div style="display:flex;gap:10px;margin-top:6px"><label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:10px"><input type="radio" name="tt" value="student" checked> 👤 طالب</label><label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:10px"><input type="radio" name="tt" value="grade"> 🏫 صف</label></div></div><div class="field" id="sw"><label>الطالب</label><select id="ps"><option value="">-- اختر --</option>' + stOpts + '</select></div><div class="field" id="gw" style="display:none"><label>الصف</label><select id="pg"><option value="">-- اختر --</option>' + grOpts + '</select></div><div class="field"><label>المحتوى</label><textarea id="pc" rows="6"></textarea></div><div class="field" style="background:rgba(99,102,241,.08);padding:12px;border-radius:12px"><label>📄 أو ارفع PDF</label><input type="file" id="pf" accept=".pdf"></div><button class="btn btn-p btn-f" id="pSave">💾 حفظ وإرسال</button></div>';
    el.innerHTML = h;
    el.querySelectorAll('input[name="tt"]').forEach(function(r) { r.onchange = function() { document.getElementById('sw').style.display = r.value === 'student' ? 'block' : 'none'; document.getElementById('gw').style.display = r.value === 'grade' ? 'block' : 'none'; }; });
    document.getElementById('pSave').onclick = function() {
      var t = el.querySelector('input[name="tt"]:checked').value;
      var c = document.getElementById('pc').value;
      var f = document.getElementById('pf');
      if (t === 'student' && !document.getElementById('ps').value) return toast('اختر الطالب', true);
      if (t === 'grade' && !document.getElementById('pg').value) return toast('اختر الصف', true);
      if (!c.trim() && !f.files.length) return toast('اكتب أو ارفع', true);
      var fd = new FormData();
      fd.append('target_type', t);
      if (t === 'student') fd.append('student_id', document.getElementById('ps').value);
      else fd.append('grade_id', document.getElementById('pg').value);
      fd.append('content', c);
      if (f.files[0]) fd.append('program_file', f.files[0]);
      api('/admin/programs', { method: 'POST', body: fd }).then(function() { toast('تم ✅'); document.getElementById('pc').value = ''; f.value = ''; }).catch(function(e) { toast(e.message, true); });
    };
  });
};

PAGES.activities = function(el) {
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api('/admin/activities').then(function(list) {
    var h = '<div class="page-head"><div class="page-title">📜 سجل النشاطات</div><div class="page-sub">' + list.length + ' عملية</div></div>';
    if (!list.length) h += '<div class="empty"><div class="empty-ico">📜</div><h3>لا توجد نشاطات</h3></div>';
    list.slice(0, 100).forEach(function(a) {
      var ac = a.action === 'add' ? '➕' : a.action === 'edit' ? '✏️' : '🗑️';
      var bc = a.action === 'add' ? 'green' : a.action === 'edit' ? 'yellow' : 'red';
      h += '<div class="q-box" style="margin-bottom:10px"><div class="flex" style="justify-content:space-between;margin-bottom:8px"><div><strong>' + esc(a.user_name) + '</strong><div class="muted" style="font-size:11px;margin-top:2px">' + (a.user_role === 'admin' ? '👑 المدير' : '🧑‍💼 مساعد') + '</div></div><span class="badge b-' + bc + '">' + ac + ' ' + a.action + '</span></div><div style="font-size:13px">' + esc(a.target_type) + (a.target_name ? ' · ' + esc(a.target_name) : '') + '</div><div class="muted" style="font-size:11px;margin-top:6px">🕐 ' + new Date(a.created_at).toLocaleString('ar-EG') + '</div></div>';
    });
    el.innerHTML = h;
  }).catch(function(e) { el.innerHTML = '<div class="empty"><h3>' + esc(e.message) + '</h3></div>'; });
};

function renderPage() {
  var el = document.getElementById('content');
  if (!el) return;
  var fn = PAGES[state.page] || PAGES.home;
  fn(el);
}

render();