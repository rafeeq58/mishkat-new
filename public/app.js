
var app = document.getElementById('app');
var toastEl = document.getElementById('toast');
var state = { token: localStorage.getItem('token'), user: JSON.parse(localStorage.getItem('user') || 'null'), view: 'login', params: {} };

function api(p, o) {
  o = o || {};
  var h = o.headers || {};
  if (state.token) h.Authorization = 'Bearer ' + state.token;
  if (!(o.body instanceof FormData) && o.body) h['Content-Type'] = 'application/json';
  return fetch('/api' + p, Object.assign({}, o, { headers: h })).then(function(r) {
    return r.json().catch(function() { return {}; }).then(function(d) {
      if (!r.ok) throw new Error(d.error || 'حدث خطأ');
      return d;
    });
  });
}
function toast(m, err) {
  toastEl.textContent = m;
  toastEl.className = 'toast show' + (err ? ' error' : '');
  setTimeout(function() { toastEl.className = 'toast' + (err ? ' error' : ''); }, 2600);
}
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); state.token = null; state.user = null; state.view = 'login'; render(); }
function go(v, p) { state.view = v; state.params = p || {}; render(); window.scrollTo(0, 0); }
function esc(s) { return String(s || '').replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function canUser(perm) { if (!state.user) return false; if (state.user.role === 'admin') return true; if (state.user.role === 'assistant') return (state.user.permissions || []).indexOf(perm) !== -1; return false; }

var LOGO_SVG = '<svg viewBox="0 0 100 100" class="brand-svg" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="0.5" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><path d="M30 85 L30 40 Q30 15 50 15 Q70 15 70 40 L70 85 Z" fill="none" stroke="url(#bgrad)" stroke-width="5" stroke-linejoin="round"/><line x1="50" y1="15" x2="50" y2="32" stroke="url(#bgrad)" stroke-width="3"/><ellipse cx="50" cy="48" rx="11" ry="14" fill="url(#bgrad)" opacity="0.9"/><path d="M50 40 Q55 47 53 53 Q51 57 50 58 Q49 57 47 53 Q45 47 50 40 Z" fill="#fbbf24"/><rect x="24" y="85" width="52" height="5" rx="2.5" fill="url(#bgrad)"/></svg>';

function render() { if (!state.token || !state.user) { state.view = 'login'; renderLogin(); } else { renderApp(); } }

function renderLogin() {
  app.innerHTML = '<div class="login-wrap"><div class="login-box"><div class="brand-modern">' + LOGO_SVG + '<div class="brand-labels"><span class="brand-ar">مشكاة المعرفة</span><span class="brand-en">MISHKAT AL-MAAREFA</span></div></div><div class="tagline">منصة التعلّم الذكية · تعلّم بلا حدود</div><form id="loginForm"><div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" required></div><div class="field"><label>كلمة المرور</label><input type="password" name="password" required></div><button class="btn btn-primary btn-block" type="submit">دخول المنصة</button></form></div></div>';
  document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) })
      .then(function(r) { state.token = r.token; state.user = r.user; localStorage.setItem('token', r.token); localStorage.setItem('user', JSON.stringify(r.user)); state.view = 'dashboard'; toast('مرحبًا ' + r.user.name); render(); })
      .catch(function(e) { toast(e.message, true); });
  };
}

var NAV = {
  admin: [{ id: 'dashboard', label: 'الرئيسية', ico: '📊' }, { id: 'grades', label: 'الصفوف والمواد', ico: '🏫' }, { id: 'lessons', label: 'الدروس', ico: '📚' }, { id: 'files', label: 'الملفات', ico: '📁' }, { id: 'quizzes', label: 'الاختبارات', ico: '🧠' }, { id: 'students', label: 'الطلاب', ico: '👥' }, { id: 'adminMessages', label: 'الرسائل', ico: '✉️' }, { id: 'adminPrograms', label: 'البرامج', ico: '📅' }, { id: 'points', label: 'النقاط', ico: '🏅' }, { id: 'assistants', label: 'مساعد المدير', ico: '🧑‍💼' }, { id: 'results', label: 'النتائج', ico: '🏆' }, { id: 'analytics', label: 'التقارير', ico: '📈' }, { id: 'activities', label: 'السجل', ico: '📜' }, { id: 'settings', label: 'الإعدادات', ico: '⚙️' }],
  assistant: [{ id: 'dashboard', label: 'الرئيسية', ico: '📊' }, { id: 'lessons', label: 'الدروس', ico: '📚' }, { id: 'files', label: 'الملفات', ico: '📁' }, { id: 'students', label: 'الطلاب', ico: '👥' }, { id: 'quizzes', label: 'الاختبارات', ico: '🧠' }],
  student: [{ id: 'dashboard', label: 'لوحتي', ico: '🏠' }, { id: 'myprogram', label: 'برنامجي', ico: '📅' }, { id: 'lessons', label: 'الدروس', ico: '📚' }, { id: 'files', label: 'الملفات', ico: '📁' }, { id: 'quizzes', label: 'الاختبارات', ico: '🧠' }, { id: 'progress', label: 'تقدمي', ico: '📈' }, { id: 'certificates', label: 'شهاداتي', ico: '🏆' }, { id: 'messages', label: 'الرسائل', ico: '✉️' }, { id: 'notifications', label: 'الإشعارات', ico: '🔔' }]
};

function renderApp() {
  var base = NAV[state.user.role] || [];
  var nav = base.filter(function(n) {
    if (state.user.role !== 'assistant') return true;
    var perms = state.user.permissions || [];
    if (n.id === 'dashboard') return true;
    if (n.id === 'lessons') return perms.indexOf('lessons_add') !== -1;
    if (n.id === 'files') return perms.indexOf('files_add') !== -1 || perms.indexOf('ratings_view') !== -1;
    if (n.id === 'students') return perms.indexOf('students_add') !== -1;
    if (n.id === 'quizzes') return perms.indexOf('quizzes_add') !== -1;
    return false;
  });

  var html = '<div class="layout"><aside class="sidebar"><div class="brand-modern">' + LOGO_SVG + '<div class="brand-labels"><span class="brand-ar">مشكاة المعرفة</span><span class="brand-en">MISHKAT AL-MAAREFA</span></div></div>';
  nav.forEach(function(n) {
    var active = state.view === n.id || (state.view === 'lessonView' && n.id === 'lessons') || (state.view === 'quizTake' && n.id === 'quizzes');
    html += '<div class="nav-item ' + (active ? 'active' : '') + '" data-nav="' + n.id + '"><span class="ico">' + n.ico + '</span><span>' + n.label + '</span></div>';
  });
  html += '<div class="nav-spacer"></div>';
  html += '<div class="nav-item" data-nav="logout"><span class="ico">🚪</span><span>خروج</span></div>';
  html += '</aside><main class="main" id="main"></main></div>';
  app.innerHTML = html;

  document.querySelectorAll('[data-nav]').forEach(function(el) {
    el.onclick = function() {
      var v = el.dataset.nav;
      if (v === 'logout') return logout();
      go(v);
    };
  });

  var m = document.getElementById('main');
  var views = { dashboard: viewDashboard, grades: viewGrades, lessons: viewLessons, files: viewFiles, quizzes: viewQuizzes, students: viewStudents, points: viewPoints, assistants: viewAssistants, results: viewResults, analytics: viewAnalytics, settings: viewSettings, activities: viewActivities, progress: viewProgress, certificates: viewCertificates, notifications: viewNotifications, myprogram: viewMyProgram, lessonView: viewLessonView, quizTake: viewQuizTake, messages: viewMessages, adminMessages: viewAdminMessages, adminPrograms: viewAdminPrograms };
  (views[state.view] || viewDashboard)(m);
}
function statCard(label, val) { return '<div class="card"><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div>'; }

function viewDashboard(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  if (state.user.role === 'admin' || state.user.role === 'assistant') {
    api('/admin/stats').then(function(s) {
      m.innerHTML = '<div class="page-head"><div><div class="page-title">لوحة التحكم</div><div class="page-sub">نظرة عامة</div></div></div><div class="grid grid-4">' + statCard('👥 الطلاب', s.students) + statCard('📚 الدروس', s.lessons) + statCard('🧠 الاختبارات', s.quizzes) + statCard('🏆 التقييمات', s.submissions) + '</div><div class="card" style="margin-top:24px"><div class="stat-label">متوسط أداء الطلاب</div><div class="stat-value" style="font-size:52px">' + s.avg + '%</div><div class="bar" style="margin-top:14px"><div style="width:' + s.avg + '%"></div></div></div>';
    }).catch(function(e) { m.innerHTML = '<div class="empty">خطأ: ' + esc(e.message) + '</div>'; });
  } else {
    api('/me/progress').then(function(p) {
      var pct = p.totalLessons ? Math.round(p.completedLessons / p.totalLessons * 100) : 0;
      m.innerHTML = '<div class="page-head"><div><div class="page-title">مرحبًا ' + esc(state.user.name) + ' 👋</div></div></div><div class="grid grid-3">' + statCard('📚 دروس أكملتها', p.completedLessons + ' / ' + p.totalLessons) + statCard('🧠 اختبارات خضتها', p.quizzesTaken) + statCard('🎯 متوسط درجاتي', p.avgScore + '%') + '</div><div class="card" style="margin-top:24px"><div class="stat-label">نسبة الإنجاز</div><div class="stat-value">' + pct + '%</div><div class="bar" style="margin-top:14px"><div style="width:' + pct + '%"></div></div></div>';
    });
  }
}

function viewGrades(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0], subjects = r[1];
    var html = '<div class="page-head"><div><div class="page-title">🏫 الصفوف والمواد</div></div><button class="btn btn-primary" id="addG">+ إضافة صف</button></div>';
    if (!grades.length) html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🏫</div><h3>لا توجد صفوف</h3></div>';
    else {
      html += '<div class="grid grid-2">';
      grades.forEach(function(g) {
        var subs = subjects.filter(function(s) { return s.grade_id === g.id; });
        html += '<div class="card"><div class="flex" style="justify-content:space-between;margin-bottom:14px"><h3>📚 ' + esc(g.name) + '</h3><div class="flex"><button class="btn btn-ghost btn-sm" data-addsub="' + g.id + '">+ مادة</button><button class="btn btn-danger btn-sm" data-delg="' + g.id + '">حذف</button></div></div>';
        if (!subs.length) html += '<p class="muted">لا توجد مواد</p>';
        else { html += '<div style="display:flex;flex-direction:column;gap:8px">'; subs.forEach(function(s) { html += '<div class="flex" style="justify-content:space-between;padding:10px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid var(--border)"><span>' + esc(s.name) + '</span><button class="btn btn-danger btn-sm" data-dels="' + s.id + '">×</button></div>'; }); html += '</div>'; }
        html += '</div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
    var addG = document.getElementById('addG');
    if (addG) addG.onclick = function() { var name = prompt('اسم الصف:'); if (name) api('/grades', { method: 'POST', body: JSON.stringify({ name: name }) }).then(function() { toast('تم ✅'); render(); }); };
    m.querySelectorAll('[data-addsub]').forEach(function(b) { b.onclick = function() { var name = prompt('اسم المادة:'); if (name) api('/subjects', { method: 'POST', body: JSON.stringify({ name: name, grade_id: b.dataset.addsub }) }).then(function() { toast('تم ✅'); render(); }); }; });
    m.querySelectorAll('[data-delg]').forEach(function(b) { b.onclick = function() { if (confirm('حذف الصف؟')) api('/grades/' + b.dataset.delg, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    m.querySelectorAll('[data-dels]').forEach(function(b) { b.onclick = function() { if (confirm('حذف المادة؟')) api('/subjects/' + b.dataset.dels, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
  });
}

function viewLessons(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  var adm = canUser('lessons_add');

  if (adm) {
    api('/lessons').then(function(ls) {
      var html = '<div class="page-head"><div><div class="page-title">📚 الدروس</div><div class="page-sub">' + ls.length + ' درس</div></div><button class="btn btn-primary" id="newLesson">+ درس جديد</button></div>';
      html += '<div class="search-box"><span class="search-ico">🔍</span><input type="text" id="lesSearch" placeholder="ابحث بعنوان الدرس..." autocomplete="off"><button class="clear-btn" id="lesClear" style="display:none">×</button></div>';
      html += '<div id="lesResults"></div>';
      m.innerHTML = html;

      function renderList(query) {
        query = (query || '').trim().toLowerCase();
        var filtered = ls;
        if (query) filtered = ls.filter(function(l) {
          return (l.title || '').toLowerCase().indexOf(query) !== -1 || (l.description || '').toLowerCase().indexOf(query) !== -1;
        });
        var target = document.getElementById('lesResults');
        if (!filtered.length) { target.innerHTML = '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🔍</div><h3>' + (query ? 'لا توجد نتائج' : 'لا توجد دروس') + '</h3></div>'; return; }
        var h = '<div class="grid grid-3">';
        filtered.forEach(function(l) {
          h += '<div class="card lesson-card" data-id="' + l.id + '"><div class="flex" style="justify-content:space-between"><span class="badge badge-purple">درس #' + (l.order_index || l.id) + '</span></div><h3>' + esc(l.title) + '</h3><p>' + esc(l.description || '') + '</p><div class="lesson-meta"><span>' + (l.video_url ? '🎬 فيديو ' : '') + (l.file_path ? '📎 مرفق' : '') + '</span><span>انقر للتعديل</span></div></div>';
        });
        h += '</div>';
        target.innerHTML = h;
        target.querySelectorAll('.lesson-card').forEach(function(el) {
          el.onclick = function() { openLessonModal(ls.find(function(l) { return String(l.id) === el.dataset.id; })); };
        });
      }
      renderList('');
      var si = document.getElementById('lesSearch'), cb = document.getElementById('lesClear');
      si.addEventListener('input', function() { cb.style.display = si.value ? 'block' : 'none'; renderList(si.value); });
      cb.onclick = function() { si.value = ''; cb.style.display = 'none'; renderList(''); si.focus(); };
      var nb = document.getElementById('newLesson');
      if (nb) nb.onclick = function() { openLessonModal(null); };
    });
    return;
  }

  // ============ الطالب ============
  if (state.params.subjectId) {
    var sid = +state.params.subjectId;
    Promise.all([api('/lessons'), api('/me/subjects')]).then(function(r) {
      var allLessons = r[0].filter(function(l) { return l.subject_id === sid; });
      var subject = r[1].find(function(sub) { return sub.id === sid; });
      var html = '<button class="btn btn-ghost btn-sm" id="backSub" style="margin-bottom:18px">← رجوع للمواد</button>';
      html += '<div class="page-head"><div><div class="page-title">📚 ' + esc(subject ? subject.name : '') + '</div><div class="page-sub">' + allLessons.length + ' درس</div></div></div>';
      html += '<div class="search-box"><span class="search-ico">🔍</span><input type="text" id="lesSearch" placeholder="ابحث بعنوان الدرس..." autocomplete="off"><button class="clear-btn" id="lesClear" style="display:none">×</button></div>';
      html += '<div id="lesResults"></div>';
      m.innerHTML = html;

      function renderList(query) {
        query = (query || '').trim().toLowerCase();
        var filtered = allLessons;
        if (query) filtered = allLessons.filter(function(l) {
          return (l.title || '').toLowerCase().indexOf(query) !== -1 || (l.description || '').toLowerCase().indexOf(query) !== -1;
        });
        var target = document.getElementById('lesResults');
        if (!filtered.length) { target.innerHTML = '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🔍</div><h3>' + (query ? 'لا توجد نتائج' : 'لا توجد دروس في هذه المادة') + '</h3></div>'; return; }
        var h = '<div class="grid grid-3">';
        filtered.forEach(function(l) {
          h += '<div class="card lesson-card" data-id="' + l.id + '"><div class="flex" style="justify-content:space-between"><span class="badge badge-purple">درس #' + (l.order_index || l.id) + '</span>' + (l.completed ? '<span class="badge badge-green">✓ مكتمل</span>' : '') + '</div><h3>' + esc(l.title) + '</h3><p>' + esc(l.description || '') + '</p><div class="lesson-meta"><span>' + (l.video_url ? '🎬 فيديو ' : '') + (l.file_path ? '📎 مرفق' : '') + '</span><span>انقر للفتح</span></div></div>';
        });
        h += '</div>';
        target.innerHTML = h;
        target.querySelectorAll('.lesson-card').forEach(function(el) {
          el.onclick = function() { go('lessonView', { id: el.dataset.id }); };
        });
      }
      renderList('');
      var si = document.getElementById('lesSearch'), cb = document.getElementById('lesClear');
      si.addEventListener('input', function() { cb.style.display = si.value ? 'block' : 'none'; renderList(si.value); });
      cb.onclick = function() { si.value = ''; cb.style.display = 'none'; renderList(''); si.focus(); };
      document.getElementById('backSub').onclick = function() { go('lessons'); };
    });
    return;
  }

  // الطالب — عرض المواد
  Promise.all([api('/me/subjects'), api('/lessons')]).then(function(r) {
    var subjects = r[0], allLessons = r[1];
    var html = '<div class="page-head"><div><div class="page-title">📚 الدروس</div><div class="page-sub">اختر المادة</div></div></div>';
    if (!subjects.length) {
      html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">📚</div><h3>لا توجد مواد لصفك بعد</h3><p class="muted">تواصل مع الإدارة</p></div>';
    } else {
      html += '<div class="grid grid-3">';
      subjects.forEach(function(sub) {
        var count = allLessons.filter(function(l) { return l.subject_id === sub.id; }).length;
        html += '<div class="card lesson-card" data-subject="' + sub.id + '" style="cursor:pointer;text-align:center;padding:30px 20px"><div style="font-size:64px;margin-bottom:14px">📖</div><h3 style="font-size:22px;font-weight:900;margin-bottom:8px">' + esc(sub.name) + '</h3><div class="badge badge-purple">' + count + ' درس</div></div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
    m.querySelectorAll('[data-subject]').forEach(function(el) {
      el.onclick = function() { go('lessons', { subjectId: el.dataset.subject }); };
    });
  });
}

function openLessonModal(lesson) {
  var edit = !!lesson;
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var gradeOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    mod.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">' + (edit ? '✏️ تعديل درس' : '📚 درس جديد') + '</div><button class="close-x">×</button></div><form id="lessonForm"><div class="flex" style="gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:200px"><label>🏫 الصف</label><select id="lGrade" required><option value="">-- اختر --</option>' + gradeOpts + '</select></div><div class="field" style="flex:1;min-width:200px"><label>📚 المادة</label><select id="lSubject" required><option value="">-- اختر الصف --</option></select></div></div><div class="field"><label>العنوان</label><input name="title" required value="' + esc(lesson && lesson.title || '') + '"></div><div class="field"><label>وصف</label><input name="description" value="' + esc(lesson && lesson.description || '') + '"></div><div class="field"><label>🎬 رابط فيديو (YouTube/MP4)</label><input name="video_url" value="' + esc(lesson && lesson.video_url || '') + '"></div><div class="field" style="background:rgba(99,102,241,.08);padding:14px;border-radius:12px"><label>📹 أو ارفع فيديو (MP4)</label><input type="file" name="video_file" accept="video/*"><div style="font-size:12px;color:#94a3b8;margin-top:6px">💡 إذا رفعت فيديو، يتغلب على الرابط</div></div><div class="field"><label>المحتوى</label><textarea name="content" rows="5">' + esc(lesson && lesson.content || '') + '</textarea></div><div class="flex" style="gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:200px"><label>الترتيب</label><input type="number" name="order_index" value="' + (lesson && lesson.order_index || 0) + '"></div><div class="field" style="flex:1;min-width:200px"><label>📎 ملف PDF</label><input type="file" name="file" accept=".pdf"></div></div><div class="flex" style="justify-content:space-between;margin-top:20px">' + (edit ? '<button type="button" class="btn btn-danger" id="delLesson">حذف</button>' : '<span></span>') + '<div class="flex"><button type="button" class="btn btn-ghost close-x">إلغاء</button><button class="btn btn-primary" type="submit">' + (edit ? 'حفظ' : 'إضافة') + '</button></div></div></form></div>';
    document.body.appendChild(mod);
    var gSel = document.getElementById('lGrade'), sSel = document.getElementById('lSubject');
    function loadSubjects() { var gid = gSel.value; sSel.innerHTML = '<option value="">-- اختر المادة --</option>'; if (!gid) return; subjects.filter(function(s) { return s.grade_id === +gid; }).forEach(function(s) { sSel.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); }
    gSel.onchange = loadSubjects;
    if (edit && lesson.subject_id) { var ms = subjects.find(function(s) { return s.id === lesson.subject_id; }); if (ms) { gSel.value = ms.grade_id; loadSubjects(); sSel.value = ms.id; } }
    mod.querySelectorAll('.close-x').forEach(function(b) { b.onclick = function() { mod.remove(); }; });
    document.getElementById('lessonForm').onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      fd.append('subject_id', sSel.value || '');
      var pr = edit ? api('/lessons/' + lesson.id, { method: 'PUT', body: fd }) : api('/lessons', { method: 'POST', body: fd });
      pr.then(function() { toast('تم ✅'); mod.remove(); render(); }).catch(function(err) { toast(err.message, true); });
    };
    var del = document.getElementById('delLesson');
    if (del) del.onclick = function() { if (confirm('حذف؟')) api('/lessons/' + lesson.id, { method: 'DELETE' }).then(function() { toast('تم'); mod.remove(); render(); }); };
  });
}

function viewLessonView(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/lessons/' + state.params.id).then(function(l) {
    var videoHtml = '';
    if (l.video_url) {
      if (l.video_url.indexOf('youtu') > -1) {
        var yid = l.video_url.split(/v=|be\//)[1].split(/[&?]/)[0];
        videoHtml = '<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/' + yid + '" allowfullscreen></iframe></div>';
      } else {
        videoHtml = '<div class="video-wrapper"><video id="lessonVideo" src="' + esc(l.video_url) + '" controls preload="metadata"></video><div class="video-controls"><span class="video-label">⚡ السرعة:</span><div class="speed-btns"><button class="speed-btn" data-speed="0.5">0.5x</button><button class="speed-btn active" data-speed="1">1x</button><button class="speed-btn" data-speed="1.25">1.25x</button><button class="speed-btn" data-speed="1.5">1.5x</button><button class="speed-btn" data-speed="2">2x</button></div></div></div>';
      }
    }
    m.innerHTML = '<button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:18px">← رجوع</button><div class="card"><div class="page-title">' + esc(l.title) + '</div><div class="page-sub">' + esc(l.description || '') + '</div>' + (videoHtml ? '<div style="margin-top:20px">' + videoHtml + '</div>' : '') + (l.content ? '<div class="lesson-content">' + esc(l.content) + '</div>' : '') + (l.file_path ? '<div style="margin-top:20px"><a class="btn btn-ghost" href="' + l.file_path + '" download>📎 تحميل المرفق</a></div>' : '') + '<div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)"><button class="btn btn-primary" id="markDone">✓ تحديد كمكتمل</button></div></div>';
    document.getElementById('back').onclick = function() { go('lessons'); };
    var video = document.getElementById('lessonVideo');
    if (video) {
      m.querySelectorAll('.speed-btn').forEach(function(b) {
        b.onclick = function() { video.playbackRate = parseFloat(b.dataset.speed); m.querySelectorAll('.speed-btn').forEach(function(x) { x.classList.remove('active'); }); b.classList.add('active'); };
      });
    }
    document.getElementById('markDone').onclick = function() { api('/lessons/' + l.id + '/complete', { method: 'POST' }).then(function() { toast('أحسنت! 🎉'); go('lessons'); }); };
  }).catch(function(e) { m.innerHTML = '<div class="empty">خطأ: ' + esc(e.message) + '</div>'; });
}

function viewFiles(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  var canManage = canUser('files_add');
  var canRate = canUser('ratings_view') || state.user.role === 'admin';
  api('/files').then(function(files) {
    var html = '<div class="page-head"><div><div class="page-title">📁 الملفات</div><div class="page-sub">' + files.length + ' ملف</div></div>';
    if (canManage) html += '<button class="btn btn-primary" id="addFile">+ رفع ملف PDF</button>';
    html += '</div>';
    if (!files.length) html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">📁</div><h3>لا توجد ملفات</h3></div>';
    else {
      html += '<div class="grid grid-3">';
      files.forEach(function(f) {
        html += '<div class="card"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><span class="badge badge-purple">📄 PDF</span>' + (f.grade_name ? '<span class="badge badge-cyan">' + esc(f.grade_name) + '</span>' : '<span class="badge badge-green">🌐 عام</span>') + '</div><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">' + esc(f.title) + '</h3>';
        if (f.notes) html += '<div style="background:rgba(251,191,36,.08);border-right:3px solid #fbbf24;padding:8px 12px;border-radius:8px;font-size:13px;color:#fde68a;margin-bottom:12px">📝 ' + esc(f.notes) + '</div>';
        if (canRate) { var sw = f.avg_rating ? renderStars(f.avg_rating) : '<span class="muted" style="font-size:12px">لا تقييمات</span>'; html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px dashed rgba(255,255,255,.1);font-size:13px"><span class="muted">تقييم:</span>' + sw + '<span class="badge badge-cyan" style="margin-right:auto">' + f.ratings_count + '</span></div>'; }
        html += '<div style="display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap"><a class="btn btn-primary btn-sm" href="' + f.file_path + '" target="_blank" download>⬇️ تحميل</a>';
        if (canManage) { html += '<button class="btn btn-ghost btn-sm" data-edit="' + f.id + '">✏️</button><button class="btn btn-danger btn-sm" data-del="' + f.id + '">🗑️</button>'; }
        if (canRate) html += '<button class="btn btn-ghost btn-sm" data-rates="' + f.id + '">👁️</button>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
    if (canManage) {
      var ab = document.getElementById('addFile');
      if (ab) ab.onclick = function() { openFileModal(null); };
      m.querySelectorAll('[data-edit]').forEach(function(b) { b.onclick = function() { openFileModal(files.find(function(x) { return String(x.id) === b.dataset.edit; })); }; });
      m.querySelectorAll('[data-del]').forEach(function(b) { b.onclick = function() { if (confirm('حذف؟')) api('/files/' + b.dataset.del, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    }
    if (canRate) {
      m.querySelectorAll('[data-rates]').forEach(function(b) { b.onclick = function() { showFileRatings(b.dataset.rates, files.find(function(x) { return String(x.id) === b.dataset.rates; })); }; });
    }
  });
}

function renderStars(avg) { var full = Math.round(avg); var s = ''; for (var i = 0; i < 3; i++) s += (i < full ? '⭐' : '☆'); return '<span style="font-size:14px">' + s + '</span>'; }

function openFileModal(file) {
  var isEdit = !!file;
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    mod.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">' + (isEdit ? '✏️ تعديل' : '📄 رفع ملف') + '</div><button class="close-x">×</button></div><form id="fileForm"><div class="field"><label>🏫 الصف (اختياري)</label><select id="fGrade"><option value="">🌐 عام</option>' + grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('') + '</select></div><div class="field"><label>📚 المادة</label><select id="fSubject"><option value="">-- بدون --</option></select></div><div class="field"><label>العنوان</label><input name="title" required value="' + esc(file && file.title || '') + '"></div><div class="field"><label>📝 ملاحظات</label><textarea name="notes" rows="3">' + esc(file && file.notes || '') + '</textarea></div><div class="field"><label>' + (isEdit ? '🔄 استبدال' : '📄 ملف PDF') + '</label><input type="file" name="pdf_file" accept=".pdf,application/pdf"' + (isEdit ? '' : ' required') + '></div><div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn btn-ghost close-x">إلغاء</button><button class="btn btn-primary" type="submit">' + (isEdit ? 'حفظ' : 'رفع') + '</button></div></form></div>';
    document.body.appendChild(mod);
    var gSel = document.getElementById('fGrade'), sSel = document.getElementById('fSubject');
    function loadSubs() { sSel.innerHTML = '<option value="">-- بدون --</option>'; var gid = gSel.value; if (!gid) return; subjects.filter(function(s) { return s.grade_id === +gid; }).forEach(function(s) { sSel.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); }
    gSel.onchange = loadSubs;
    if (isEdit && file.grade_id) { gSel.value = file.grade_id; loadSubs(); if (file.subject_id) sSel.value = file.subject_id; }
    mod.querySelectorAll('.close-x').forEach(function(b) { b.onclick = function() { mod.remove(); }; });
    document.getElementById('fileForm').onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      fd.append('grade_id', gSel.value || '');
      fd.append('subject_id', sSel.value || '');
      var pr = isEdit ? api('/files/' + file.id, { method: 'PUT', body: fd }) : api('/files', { method: 'POST', body: fd });
      pr.then(function() { toast('تم ✅'); mod.remove(); render(); }).catch(function(err) { toast(err.message, true); });
    };
  });
}

function showFileRatings(fileId, file) {
  api('/admin/files/' + fileId + '/ratings').then(function(rows) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var html = '<div class="modal"><div class="modal-head"><div class="modal-title">⭐ ' + esc(file.title) + '</div><button class="close-x">×</button></div>';
    if (!rows.length) html += '<div class="empty">لا تقييمات</div>';
    else {
      var sum = rows.reduce(function(a, b) { return a + b.stars; }, 0);
      var avg = (sum / rows.length).toFixed(2);
      html += '<div class="card" style="text-align:center;margin-bottom:16px"><div class="stat-value">' + avg + ' / 3</div><div style="font-size:24px">' + renderStars(+avg) + '</div></div><table class="table"><thead><tr><th>الطالب</th><th>التقييم</th></tr></thead><tbody>';
      rows.forEach(function(r) { html += '<tr><td>' + esc(r.student_name) + '</td><td>' + renderStars(r.stars) + '</td></tr>'; });
      html += '</tbody></table>';
    }
    html += '</div>';
    mod.innerHTML = html;
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  });
}

function viewQuizzes(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  var adm = canUser('quizzes_add');
  api('/quizzes').then(function(qs) {
    var html = '<div class="page-head"><div><div class="page-title">🧠 الاختبارات</div><div class="page-sub">' + qs.length + '</div></div>';
    if (adm) html += '<button class="btn btn-primary" id="newQuiz">+ اختبار</button>';
    html += '</div>';
    if (!qs.length) html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🧠</div><h3>لا توجد اختبارات</h3></div>';
    else {
      html += '<div class="grid grid-3">';
      qs.forEach(function(q) {
        html += '<div class="card"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><span class="badge badge-cyan">🧠 اختبار</span>' + (adm ? '<span class="badge badge-purple">' + q.count + ' سؤال</span>' : (q.passed ? '<span class="badge badge-green">✓ مجتاز</span>' : (q.attempted ? '<span class="badge badge-red">🔒 تم</span>' : ''))) + '</div><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">' + esc(q.title) + '</h3><p class="muted" style="font-size:13px;margin-bottom:14px">' + esc(q.description || '') + '</p><div class="flex"><button class="btn btn-primary btn-sm" data-s="' + q.id + '">' + (adm ? 'عرض' : (q.attempted ? '🔒 تم' : 'ابدأ')) + '</button>' + (adm ? '<button class="btn btn-danger btn-sm" data-d="' + q.id + '">حذف</button>' : '') + '</div></div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
    m.querySelectorAll('[data-s]').forEach(function(b) { b.onclick = function() { adm ? viewQuizAdmin(b.dataset.s) : go('quizTake', { id: b.dataset.s }); }; });
    m.querySelectorAll('[data-d]').forEach(function(b) { b.onclick = function() { if (confirm('حذف؟')) api('/quizzes/' + b.dataset.d, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
    var nq = document.getElementById('newQuiz');
    if (nq) nq.onclick = openQuizModal;
  });
}

function openQuizModal() {
  Promise.all([api('/grades'), api('/subjects')]).then(function(r) {
    var grades = r[0] || [], subjects = r[1] || [];
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    mod.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">🧠 اختبار جديد</div><button class="close-x">×</button></div><form id="quizForm"><div class="field"><label>العنوان</label><input name="title" required></div><div class="field"><label>الوصف</label><input name="description"></div><div class="flex" style="gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:200px"><label>🏫 الصف</label><select id="qzGrade"><option value="">🌐 عام</option>' + grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('') + '</select></div><div class="field" style="flex:1;min-width:200px"><label>📚 المادة</label><select id="qzSubject"><option value="">-- بدون --</option></select></div></div><div class="field"><label>⏱️ المدة (دقيقة)</label><input type="number" id="qTime" name="qTime" value="0" min="0"></div><div class="field"><label>📋 المتطلبات</label><textarea id="qReqs" name="qReqs" rows="3"></textarea></div><div id="questionsWrap"></div><button type="button" class="btn btn-ghost btn-sm" id="addQ">+ سؤال</button><div class="flex" style="justify-content:flex-end;margin-top:20px"><button type="button" class="btn btn-ghost close-x">إلغاء</button><button class="btn btn-primary" type="submit">حفظ</button></div></form></div>';
    document.body.appendChild(mod);
    var gSel = document.getElementById('qzGrade'), sSel = document.getElementById('qzSubject');
    gSel.onchange = function() { sSel.innerHTML = '<option value="">-- بدون --</option>'; var gid = gSel.value; if (!gid) return; subjects.filter(function(s) { return s.grade_id === +gid; }).forEach(function(s) { sSel.innerHTML += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }); };
    var wrap = document.getElementById('questionsWrap');
    function addQ() {
      var i = wrap.children.length;
      var d = document.createElement('div');
      d.className = 'q-block';
      d.style.marginTop = '14px';
      var h = '<div class="flex" style="justify-content:space-between;margin-bottom:10px"><strong>سؤال ' + (i + 1) + '</strong><button type="button" class="btn btn-danger btn-sm rm">حذف</button></div><input class="qt" placeholder="السؤال" required style="margin-bottom:10px"><div>';
      [0, 1, 2, 3].forEach(function(j) { h += '<div class="flex" style="margin-bottom:8px"><input type="radio" name="c' + i + '" value="' + j + '" ' + (j === 0 ? 'checked' : '') + ' style="width:auto"><input class="op" placeholder="خيار ' + (j + 1) + '" required style="flex:1"></div>'; });
      h += '</div>';
      d.innerHTML = h;
      d.querySelector('.rm').onclick = function() { d.remove(); };
      wrap.appendChild(d);
    }
    addQ();
    document.getElementById('addQ').onclick = addQ;
    mod.querySelectorAll('.close-x').forEach(function(b) { b.onclick = function() { mod.remove(); }; });
    document.getElementById('quizForm').onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var questions = [];
      for (var i = 0; i < wrap.children.length; i++) {
        var opts = [];
        wrap.children[i].querySelectorAll('.op').forEach(function(o) { opts.push(o.value); });
        questions.push({ question: wrap.children[i].querySelector('.qt').value, options: opts, correct_index: parseInt(wrap.children[i].querySelector('input[name="c' + i + '"]:checked').value) });
      }
      var reqs = fd.get('qReqs').split('\n').map(function(x) { return x.trim(); }).filter(function(x) { return x; });
      api('/quizzes', { method: 'POST', body: JSON.stringify({ title: fd.get('title'), description: fd.get('description'), time_limit: parseInt(fd.get('qTime')) || 0, requirements: reqs, grade_id: gSel.value || null, subject_id: sSel.value || null, questions: questions }) })
        .then(function() { toast('تم ✅'); mod.remove(); render(); }).catch(function(err) { toast(err.message, true); });
    };
  });
}

function viewQuizAdmin(id) {
  api('/quizzes/' + id).then(function(q) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var html = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">' + esc(q.title) + '</div><button class="close-x">×</button></div>';
    q.questions.forEach(function(x, i) {
      html += '<div class="q-block"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + '</div>';
      x.options.forEach(function(o, j) { html += '<div class="opt ' + (j === x.correct_index ? 'selected' : '') + '"><span>' + esc(o) + '</span>' + (j === x.correct_index ? '<span class="badge badge-green" style="margin-right:auto">✓</span>' : '') + '</div>'; });
      html += '</div>';
    });
    html += '</div>';
    mod.innerHTML = html;
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  });
}

function viewQuizTake(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/quizzes/' + state.params.id).then(function(q) {
    if (q.passed) { m.innerHTML = '<div class="card" style="text-align:center;padding:60px 20px;max-width:520px;margin:40px auto"><div style="font-size:80px;margin-bottom:16px">✅</div><h3>لقد اجتزت هذا الاختبار</h3><button class="btn btn-primary" id="bk" style="margin-top:24px">← العودة</button></div>'; document.getElementById('bk').onclick = function() { go('quizzes'); }; return; }
    var reqs = q.requirements || [];
    if (reqs.length) showReqsModal(q, reqs, function() { startQuiz(m, q); });
    else startQuiz(m, q);
  });
}

function showReqsModal(q, reqs, onStart) {
  var mod = document.createElement('div');
  mod.className = 'modal-backdrop';
  var html = '<div class="modal"><div class="modal-head"><div class="modal-title">📋 المتطلبات</div></div><div class="page-sub" style="margin-bottom:16px">' + esc(q.title) + '</div><div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.3);border-radius:14px;padding:18px;margin-bottom:18px"><ul style="padding-right:20px;line-height:2">';
  reqs.forEach(function(r) { html += '<li>' + esc(r) + '</li>'; });
  html += '</ul></div><label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.3);border-radius:12px;margin-bottom:18px"><input type="checkbox" id="reqReady" style="width:auto;accent-color:#10b981;transform:scale(1.4)"><span style="font-weight:700">أنا جاهز ✅</span></label><div class="flex" style="justify-content:flex-end"><button class="btn btn-ghost" id="reqCancel">إلغاء</button><button class="btn btn-primary" id="reqStart" disabled style="opacity:.5">ابدأ</button></div></div>';
  mod.innerHTML = html;
  document.body.appendChild(mod);
  var chk = document.getElementById('reqReady'), btn = document.getElementById('reqStart');
  chk.onchange = function() { btn.disabled = !chk.checked; btn.style.opacity = chk.checked ? '1' : '.5'; };
  document.getElementById('reqCancel').onclick = function() { mod.remove(); go('quizzes'); };
  btn.onclick = function() { mod.remove(); onStart(); };
}

function startQuiz(m, q) {
  var answers = [];
  for (var i = 0; i < q.questions.length; i++) answers.push(null);
  var timeLeft = q.time_limit ? q.time_limit * 60 : 0;
  var timerInterval = null;
  function fmt(s) { if (s < 0) s = 0; var mm = Math.floor(s / 60), ss = s % 60; return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss; }
  var html = '<div class="page-head"><div><div class="page-title">' + esc(q.title) + '</div><div class="page-sub">' + q.questions.length + ' سؤال</div></div>' + (q.time_limit ? '<div class="quiz-timer" id="timer">⏱️ <span id="tval">' + fmt(timeLeft) + '</span></div>' : '') + '</div>';
  q.questions.forEach(function(x, i) {
    html += '<div class="q-block"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + '</div>';
    x.options.forEach(function(o, j) { html += '<label class="opt" data-q="' + i + '" data-o="' + j + '"><input type="radio" name="q' + i + '"><span>' + esc(o) + '</span></label>'; });
    html += '</div>';
  });
  html += '<button class="btn btn-primary btn-block" id="sub" style="margin-top:20px">إرسال</button>';
  m.innerHTML = html;
  m.querySelectorAll('.opt').forEach(function(o) { o.onclick = function() { answers[parseInt(o.dataset.q)] = parseInt(o.dataset.o); m.querySelectorAll('.opt[data-q="' + o.dataset.q + '"]').forEach(function(x) { x.classList.remove('selected'); }); o.classList.add('selected'); }; });
  function doSubmit(auto) {
    if (timerInterval) clearInterval(timerInterval);
    if (!auto && answers.indexOf(null) !== -1) return toast('أجب على الكل', true);
    api('/quizzes/' + q.id + '/submit', { method: 'POST', body: JSON.stringify({ answers: answers }) }).then(function(r) { showResult(r, q.id, answers); }).catch(function(err) { toast(err.message, true); });
  }
  document.getElementById('sub').onclick = function() { doSubmit(false); };
  if (q.time_limit) { timerInterval = setInterval(function() { timeLeft--; var el = document.getElementById('tval'); if (el) el.textContent = fmt(timeLeft); if (timeLeft <= 0) { clearInterval(timerInterval); toast('انتهى الوقت!', true); doSubmit(true); } }, 1000); }
}

function showResult(r, quizId, userAnswers) {
  var mod = document.createElement('div');
  mod.className = 'modal-backdrop';
  var c = r.percentage >= 80 ? 'green' : r.percentage >= 50 ? 'cyan' : 'red';
  var msg = r.percentage >= 80 ? '🎉 ممتاز!' : r.percentage >= 50 ? '👍 جيد' : '💪 راجع';
  mod.innerHTML = '<div class="modal modal-lg" style="text-align:center"><div class="modal-title">نتيجتك</div><div class="stat-value" style="font-size:72px;margin:20px 0">' + r.percentage + '%</div><p class="muted">' + r.score + ' من ' + r.total + '</p><span class="badge badge-' + c + '">' + msg + '</span><div id="reviewBox" style="margin-top:24px;text-align:right"></div><button class="btn btn-primary btn-block" style="margin-top:24px" id="ok">حسنًا</button></div>';
  document.body.appendChild(mod);
  api('/quizzes/' + quizId + '/review').then(function(quiz) {
    var html = '<h3 style="margin-bottom:14px;text-align:center">📋 مراجعة</h3>';
    quiz.questions.forEach(function(x, i) {
      var myAns = userAnswers[i];
      var isRight = myAns === x.correct_index;
      html += '<div class="q-block" style="border-color:' + (isRight ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)') + '"><div class="q-text">' + (i + 1) + '. ' + esc(x.question) + ' ' + (isRight ? '✅' : '❌') + '</div>';
      x.options.forEach(function(o, j) { var cls = ''; if (j === x.correct_index) cls = 'correct'; else if (j === myAns) cls = 'wrong'; html += '<div class="opt ' + cls + '"><span>' + esc(o) + '</span></div>'; });
      html += '</div>';
    });
    var box = document.getElementById('reviewBox');
    if (box) box.innerHTML = html;
  });
  document.getElementById('ok').onclick = function() { mod.remove(); go('quizzes'); };
}

function viewStudents(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  var adm = canUser('students_add');
  api('/students').then(function(s) {
    var html = '<div class="page-head"><div><div class="page-title">👥 الطلاب</div><div class="page-sub">' + s.length + ' طالب</div></div>';
    if (adm) html += '<button class="btn btn-primary" id="addStu">+ إضافة طالب</button>';
    html += '</div>';
    html += '<div class="search-box"><span class="search-ico">🔍</span><input type="text" id="stuSearch" placeholder="ابحث بالاسم، البريد، أو الهاتف..." autocomplete="off"><button class="clear-btn" id="stuClear" style="display:none">×</button></div>';
    html += '<div id="stuResults"></div>';
    m.innerHTML = html;

    function renderList(query) {
      query = (query || '').trim().toLowerCase();
      var filtered = s;
      if (query) {
        filtered = s.filter(function(x) {
          return (x.name || '').toLowerCase().indexOf(query) !== -1 ||
                 (x.email || '').toLowerCase().indexOf(query) !== -1 ||
                 (x.phone || '').toLowerCase().indexOf(query) !== -1 ||
                 (x.grade_name || '').toLowerCase().indexOf(query) !== -1;
        });
      }
      var target = document.getElementById('stuResults');
      if (!filtered.length) {
        target.innerHTML = '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🔍</div><h3>' + (query ? 'لا توجد نتائج' : 'لا يوجد طلاب') + '</h3>' + (query ? '<p class="muted">جرّب كلمة بحث أخرى</p>' : '') + '</div>';
        return;
      }
      var h = '<div class="grid grid-2">';
      filtered.forEach(function(x) {
        var phone = (x.phone || '').replace(/[^0-9]/g, '');
        h += '<div class="card">';
        h += '<div class="flex" style="justify-content:space-between;margin-bottom:12px"><div><h3 style="font-size:18px;font-weight:900">' + esc(x.name) + '</h3><div class="badge badge-purple" style="margin-top:6px">' + esc(x.grade_name) + '</div></div><div style="font-size:36px">🎓</div></div>';
        h += '<div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:rgba(0,0,0,.2);border-radius:10px;font-size:13px">';
        h += '<div class="flex" style="justify-content:space-between"><span class="muted">📧 البريد:</span><span style="direction:ltr;font-size:12px">' + esc(x.email) + '</span></div>';
        h += '<div class="flex" style="justify-content:space-between"><span class="muted">🔑 كلمة المرور:</span><span style="direction:ltr;font-family:monospace;background:rgba(99,102,241,.15);padding:2px 8px;border-radius:6px">' + (x.password_plain ? esc(x.password_plain) : '••••••') + '</span></div>';
        h += '<div class="flex" style="justify-content:space-between"><span class="muted">📱 الهاتف:</span><span style="direction:ltr;font-size:12px">' + (x.phone || '—') + '</span></div>';
        h += '<div class="flex" style="justify-content:space-between"><span class="muted">🏫 المدرسة:</span><span>' + esc(x.school || '—') + '</span></div>';
        h += '</div>';
        h += '<div class="flex" style="gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)"><div class="badge badge-cyan">📚 ' + x.done + ' درس</div><div class="badge badge-green">🎯 ' + Math.round(x.avg || 0) + '%</div><div class="badge badge-purple">🧠 ' + x.quizzes + '</div></div>';
        h += '<div class="flex" style="gap:6px;margin-top:10px">';
        if (phone) h += '<a href="https://wa.me/' + phone + '" target="_blank" class="btn btn-sm" style="flex:1;background:rgba(37,211,102,.2);color:#6ee7b7;text-decoration:none;border:1px solid rgba(37,211,102,.3)">💬 واتساب</a>';
        if (adm) {
          h += '<button class="btn btn-primary btn-sm" data-edit="' + x.id + '" style="flex:1">✏️ تعديل</button>';
          h += '<button class="btn btn-ghost btn-sm" data-rep="' + x.id + '" style="flex:1">📊</button>';
        }
        h += '</div></div>';
      });
      h += '</div>';
      target.innerHTML = h;
      target.querySelectorAll('[data-edit]').forEach(function(el) { el.onclick = function() { openEditStudentModal(s.find(function(x) { return String(x.id) === el.dataset.edit; })); }; });
      target.querySelectorAll('[data-rep]').forEach(function(el) { el.onclick = function() { showStudentReport(el.dataset.rep, s.find(function(x) { return String(x.id) === el.dataset.rep; })); }; });
    }

    renderList('');

    var searchInput = document.getElementById('stuSearch');
    var clearBtn = document.getElementById('stuClear');
    searchInput.addEventListener('input', function() {
      var v = searchInput.value;
      clearBtn.style.display = v ? 'block' : 'none';
      renderList(v);
    });
    clearBtn.onclick = function() {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      renderList('');
      searchInput.focus();
    };

    if (adm) {
      var as = document.getElementById('addStu');
      if (as) as.onclick = openStudentModal;
    }
  });
}

function openEditStudentModal(stu) {
  if (!stu) return;
  api('/grades').then(function(grades) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var gOpts = grades.map(function(g) { return '<option value="' + g.id + '"' + (stu.grade_id === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('');
    mod.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">✏️ تعديل بيانات ' + esc(stu.name) + '</div><button class="close-x">×</button></div>' +
      '<form id="editStudentForm">' +
      '<div class="grid grid-2" style="gap:12px"><div class="field"><label>الاسم</label><input name="name" required value="' + esc(stu.name) + '"></div><div class="field"><label>البريد</label><input type="email" name="email" required value="' + esc(stu.email) + '"></div></div>' +
      '<div class="grid grid-2" style="gap:12px"><div class="field"><label>📱 الهاتف</label><input type="tel" name="phone" value="' + esc(stu.phone || '') + '"></div><div class="field"><label>🏫 الصف</label><select name="grade_id" required><option value="">-- اختر --</option>' + gOpts + '</select></div></div>' +
      '<div class="grid grid-2" style="gap:12px"><div class="field"><label>🔑 كلمة المرور الحالية</label><input name="password_old" value="' + esc(stu.password_plain || '') + '" readonly style="background:rgba(99,102,241,.1);cursor:not-allowed"></div><div class="field"><label>🔒 كلمة جديدة (اختياري)</label><input name="password" placeholder="اتركها فارغة"></div></div>' +
      '<div class="field"><label>🎓 نوع الدراسة</label><div style="display:flex;gap:10px;margin-top:6px">' +
        '<label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:12px;cursor:pointer"><input type="radio" name="school_type" value="school" ' + (stu.school && stu.school !== 'دراسة حرة' ? 'checked' : '') + ' style="width:auto"> 🏫 مدرسة</label>' +
        '<label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:12px;cursor:pointer"><input type="radio" name="school_type" value="free" ' + (!stu.school || stu.school === 'دراسة حرة' ? 'checked' : '') + ' style="width:auto"> 📚 حرة</label>' +
      '</div></div>' +
      '<div class="field" id="editSchoolNameWrap" style="display:' + (stu.school && stu.school !== 'دراسة حرة' ? 'block' : 'none') + '"><label>اسم المدرسة</label><input name="school_name" value="' + esc(stu.school && stu.school !== 'دراسة حرة' ? stu.school : '') + '"></div>' +
      '<div class="flex" style="justify-content:space-between;margin-top:20px"><button type="button" class="btn btn-danger" id="delStuBtn">🗑️ حذف</button><div class="flex"><button type="button" class="btn btn-ghost close-x">إلغاء</button><button class="btn btn-primary" type="submit">💾 حفظ</button></div></div></form></div>';
    document.body.appendChild(mod);
    mod.querySelectorAll('input[name="school_type"]').forEach(function(r) {
      r.onchange = function() { document.getElementById('editSchoolNameWrap').style.display = r.value === 'school' ? 'block' : 'none'; };
    });
    mod.querySelectorAll('.close-x').forEach(function(b) { b.onclick = function() { mod.remove(); }; });
    document.getElementById('editStudentForm').onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var st = mod.querySelector('input[name="school_type"]:checked').value;
      var school = st === 'school' ? (fd.get('school_name') || '') : 'دراسة حرة';
      var payload = { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), grade_id: fd.get('grade_id'), school: school };
      if (fd.get('password') && fd.get('password').length >= 6) payload.password = fd.get('password');
      api('/students/' + stu.id, { method: 'PUT', body: JSON.stringify(payload) })
        .then(function() { toast('تم حفظ التعديلات ✅'); mod.remove(); render(); })
        .catch(function(err) { toast(err.message, true); });
    };
    document.getElementById('delStuBtn').onclick = function() {
      if (confirm('حذف الطالب نهائيًا؟')) api('/students/' + stu.id, { method: 'DELETE' }).then(function() { toast('تم'); mod.remove(); render(); });
    };
  });
}

function openStudentModal() {
  api('/grades').then(function(grades) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var gradeOpts = grades.map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('');
    mod.innerHTML = '<div class="modal"><div class="modal-head"><div class="modal-title">+ إضافة طالب</div><button class="close-x">×</button></div><form id="studentForm"><div class="field"><label>الاسم</label><input name="name" required></div><div class="field"><label>البريد</label><input type="email" name="email" required></div><div class="field"><label>📱 الهاتف</label><input type="tel" name="phone" required></div><div class="field"><label>🏫 الصف</label><select name="grade_id" required><option value="">-- اختر --</option>' + gradeOpts + '</select></div><div class="field"><label>كلمة المرور</label><input type="password" name="password" required minlength="6"></div><button class="btn btn-primary btn-block" type="submit">إنشاء</button></form></div>';
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
    document.getElementById('studentForm').onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      api('/students', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), grade_id: fd.get('grade_id'), password: fd.get('password'), school: 'دراسة حرة' }) })
        .then(function() { toast('تم ✅'); mod.remove(); render(); }).catch(function(err) { toast(err.message, true); });
    };
  });
}

function showStudentReport(id, stu) {
  api('/admin/students/' + id + '/full-report').then(function(r) {
    var s = r.stats;
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var html = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">📊 ' + esc(stu.name) + '</div><button class="close-x">×</button></div><div class="grid grid-4" style="margin-bottom:18px">' + statCard('متوسط', s.avgScore + '%') + statCard('دروس', s.completedLessons + '/' + s.totalLessons) + statCard('اختبارات', s.passedQuizzes + '/' + s.totalQuizzes) + statCard('شهادات', s.certificates) + '</div></div>';
    mod.innerHTML = html;
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  });
}

function viewPoints(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/admin/points').then(function(list) {
    var html = '<div class="page-head"><div><div class="page-title">🏅 النقاط</div><div class="page-sub">' + list.length + ' طالب</div></div></div>';
    if (!list.length) html += '<div class="card" style="text-align:center;padding:60px 20px"><h3>لا يوجد طلاب</h3></div>';
    else {
      html += '<div class="card" style="padding:0;overflow-x:auto"><table class="table"><thead><tr><th>#</th><th>الاسم</th><th>النقاط</th><th>العمليات</th><th></th></tr></thead><tbody>';
      var medals = ['🥇', '🥈', '🥉'];
      list.forEach(function(u, i) {
        var c = u.total > 0 ? '#10b981' : u.total < 0 ? '#ef4444' : '#94a3b8';
        html += '<tr><td>' + (i < 3 ? medals[i] : (i + 1)) + '</td><td><strong>' + esc(u.name) + '</strong></td><td><span style="font-size:18px;font-weight:900;color:' + c + '">' + u.total + '</span></td><td><span class="badge badge-cyan">' + u.operations + '</span></td><td class="flex" style="gap:6px"><button class="btn btn-primary btn-sm" data-add="' + u.id + '">➕</button><button class="btn btn-ghost btn-sm" data-view="' + u.id + '">📜</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    m.innerHTML = html;
    m.querySelectorAll('[data-add]').forEach(function(b) { b.onclick = function() { addPointsDialog(list.find(function(x) { return String(x.id) === b.dataset.add; })); }; });
    m.querySelectorAll('[data-view]').forEach(function(b) { b.onclick = function() { viewPointsLog(list.find(function(x) { return String(x.id) === b.dataset.view; })); }; });
  });
}

function addPointsDialog(stu) {
  var mod = document.createElement('div');
  mod.className = 'modal-backdrop';
  mod.innerHTML = '<div class="modal"><div class="modal-head"><div class="modal-title">🏅 ' + esc(stu.name) + '</div><button class="close-x">×</button></div><div class="field"><label>القيمة</label><input type="number" id="ptVal"></div><div class="field"><label>السبب</label><input id="ptReason"></div><button class="btn btn-primary btn-block" id="ptSave">✅</button></div>';
  document.body.appendChild(mod);
  mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  document.getElementById('ptSave').onclick = function() {
    var val = parseInt(document.getElementById('ptVal').value);
    if (!val) return toast('ادخل قيمة', true);
    api('/admin/points', { method: 'POST', body: JSON.stringify({ student_id: stu.id, value: val, reason: document.getElementById('ptReason').value }) })
      .then(function() { toast('تم ✅'); mod.remove(); render(); }).catch(function(e) { toast(e.message, true); });
  };
}

function viewPointsLog(stu) {
  api('/admin/points/' + stu.id).then(function(r) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var html = '<div class="modal"><div class="modal-head"><div class="modal-title">📜 ' + esc(stu.name) + '</div><button class="close-x">×</button></div>';
    if (!r.operations.length) html += '<div class="empty">لا توجد عمليات</div>';
    else r.operations.forEach(function(op) { var c = op.value > 0 ? '#10b981' : '#ef4444'; html += '<div style="padding:10px;background:rgba(255,255,255,.03);border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between"><div><div style="font-size:13px">' + esc(op.reason || '—') + '</div><div style="font-size:11px;color:#64748b">' + new Date(op.created_at).toLocaleString('ar-EG') + '</div></div><div style="font-weight:900;color:' + c + '">' + (op.value > 0 ? '+' : '') + op.value + '</div></div>'; });
    html += '</div>';
    mod.innerHTML = html;
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  });
}

function viewAssistants(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/assistants').then(function(list) {
    var html = '<div class="page-head"><div><div class="page-title">🧑‍💼 مساعد المدير</div><div class="page-sub">' + list.length + '</div></div><button class="btn btn-primary" id="addAsst">+ مساعد</button></div>';
    if (!list.length) html += '<div class="card" style="text-align:center;padding:60px 20px"><h3>لا يوجد مساعدون</h3></div>';
    else {
      html += '<div class="grid grid-2">';
      list.forEach(function(u) {
        html += '<div class="card"><div class="flex" style="justify-content:space-between;margin-bottom:10px"><div><h3>' + esc(u.name) + '</h3><div class="muted" style="font-size:12px">' + esc(u.email) + '</div></div><div class="flex" style="gap:6px"><button class="btn btn-ghost btn-sm" data-edit-asst="' + u.id + '">✏️</button><button class="btn btn-danger btn-sm" data-del="' + u.id + '">🗑️</button></div></div>';
        if (u.permissions && u.permissions.length) { html += '<div class="flex" style="flex-wrap:wrap;gap:4px">'; u.permissions.forEach(function(p) { html += '<span class="badge badge-green" style="font-size:10px">' + p + '</span>'; }); html += '</div>'; }
        html += '</div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
    document.getElementById('addAsst').onclick = openAssistantModal;
    /* __EDIT_ASST_BIND__ */
    document.querySelectorAll('[data-edit-asst]').forEach(function(b) {
      b.onclick = function() { openAssistantModal(list.find(function(x) { return String(x.id) === b.dataset.editAsst; })); };
    });
    m.querySelectorAll('[data-del]').forEach(function(b) { b.onclick = function() { if (confirm('حذف؟')) api('/assistants/' + b.dataset.del, { method: 'DELETE' }).then(function() { toast('تم'); render(); }); }; });
  });
}

function openAssistantModal(user) {
  var isEdit = !!user;
  var permsList = [
    { key: 'lessons_add', label: '📚 إضافة/تعديل/حذف الدروس' },
    { key: 'files_add', label: '📁 إضافة/تعديل/حذف الملفات' },
    { key: 'students_add', label: '👥 إضافة/حذف الطلاب' },
    { key: 'quizzes_add', label: '🧠 إضافة/حذف الاختبارات' },
    { key: 'ratings_view', label: '⭐ الاطلاع على التقييمات' },
    { key: 'program_edit', label: '📅 تعديل برامج الطلاب' },
    { key: 'answers_view', label: '📋 عرض إجابات الطلاب' }
  ];
  var userPerms = isEdit ? (user.permissions || []) : [];
  var mod = document.createElement('div');
  mod.className = 'modal-backdrop';
  mod.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><div><div class="modal-title">' + (isEdit ? '✏️ تعديل المساعد: ' + esc(user.name) : '🧑‍💼 مساعد جديد') + '</div><div class="muted" style="font-size:12px">' + (isEdit ? 'عدّل البيانات أو الصلاحيات' : 'حدد الصلاحيات المطلوبة') + '</div></div><button class="close-x">×</button></div>' +
    '<form id="asstForm">' +
    '<div class="grid grid-2" style="gap:12px">' +
      '<div class="field"><label>الاسم</label><input name="name" required value="' + esc(isEdit ? user.name : '') + '"></div>' +
      '<div class="field"><label>البريد</label><input type="email" name="email" required value="' + esc(isEdit ? user.email : '') + '"></div>' +
    '</div>' +
    '<div class="field"><label>' + (isEdit ? '🔒 كلمة مرور جديدة (اتركها فارغة للإبقاء على القديمة)' : 'كلمة المرور') + '</label><input type="password" name="password" ' + (isEdit ? 'placeholder="اتركها فارغة"' : 'required minlength="6"') + '></div>' +
    '<div class="field"><label style="font-weight:800;color:#a5b4fc">⚙️ الصلاحيات:</label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px">' +
    permsList.map(function(p) {
      var checked = userPerms.indexOf(p.key) !== -1 ? 'checked' : '';
      return '<label style="display:flex;gap:10px;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);border-radius:10px;cursor:pointer"><input type="checkbox" name="perm" value="' + p.key + '" ' + checked + ' style="width:auto;accent-color:#10b981;transform:scale(1.2)"><span style="font-weight:600">' + p.label + '</span></label>';
    }).join('') +
    '</div></div>' +
    '<div class="flex" style="justify-content:flex-end;gap:10px;margin-top:20px">' +
      '<button type="button" class="btn btn-ghost close-x">إلغاء</button>' +
      '<button class="btn btn-primary" type="submit">' + (isEdit ? '💾 حفظ التعديلات' : '✅ إنشاء الحساب') + '</button>' +
    '</div></form></div>';
  document.body.appendChild(mod);
  mod.querySelectorAll('.close-x').forEach(function(b) { b.onclick = function() { mod.remove(); }; });
  document.getElementById('asstForm').onsubmit = function(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var perms = [];
    mod.querySelectorAll('input[name="perm"]:checked').forEach(function(c) { perms.push(c.value); });
    var payload = { name: fd.get('name'), email: fd.get('email'), permissions: perms };
    if (fd.get('password') && fd.get('password').length >= 6) payload.password = fd.get('password');
    var pr = isEdit
      ? api('/assistants/' + user.id, { method: 'PUT', body: JSON.stringify(payload) })
      : api('/assistants', { method: 'POST', body: JSON.stringify(payload) });
    pr.then(function() { toast(isEdit ? 'تم الحفظ ✅' : 'تم الإنشاء ✅'); mod.remove(); render(); })
      .catch(function(err) { toast(err.message, true); });
  };
}

function viewResults(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/admin/results').then(function(r) {
    var html = '<div class="page-head"><div><div class="page-title">🏆 النتائج</div><div class="page-sub">' + r.length + '</div></div></div><div class="card" style="padding:0;overflow-x:auto"><table class="table"><thead><tr><th>الطالب</th><th>الاختبار</th><th>الدرجة</th><th>النسبة</th><th>إجراءات</th></tr></thead><tbody>';
    if (!r.length) html += '<tr><td colspan="5" class="empty">لا نتائج</td></tr>';
    r.forEach(function(x) {
      var p = Math.round(x.score / x.total * 100);
      var b = p >= 80 ? 'green' : p >= 50 ? 'cyan' : 'red';
      html += '<tr><td><strong>' + esc(x.student_name) + '</strong></td><td>' + esc(x.quiz_title) + '</td><td>' + x.score + '/' + x.total + '</td><td><span class="badge badge-' + b + '">' + p + '%</span></td><td><button class="btn btn-primary btn-sm" data-sub="' + x.id + '">📋</button></td></tr>';
    });
    html += '</tbody></table></div>';
    m.innerHTML = html;
    m.querySelectorAll('[data-sub]').forEach(function(b) { b.onclick = function() { showSubmissionDetail(b.dataset.sub); }; });
  });
}

function showSubmissionDetail(id) {
  api('/admin/submissions/' + id + '/detail').then(function(r) {
    var mod = document.createElement('div');
    mod.className = 'modal-backdrop';
    var pct = Math.round(r.submission.score / r.submission.total * 100);
    var html = '<div class="modal modal-lg"><div class="modal-head"><div class="modal-title">📋 ' + esc(r.student.name) + '</div><button class="close-x">×</button></div><div style="text-align:center;margin-bottom:18px"><div class="stat-value">' + pct + '%</div></div>';
    r.questions.forEach(function(q, i) {
      var bc = q.is_correct ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)';
      html += '<div class="q-block" style="border-color:' + bc + '"><div class="q-text">' + (i + 1) + '. ' + esc(q.question) + ' ' + (q.is_correct ? '✅' : '❌') + '</div>';
      q.options.forEach(function(o, j) { var cls = ''; if (j === q.correct_index) cls = 'correct'; else if (j === q.student_index) cls = 'wrong'; html += '<div class="opt ' + cls + '"><span>' + esc(o) + '</span></div>'; });
      html += '</div>';
    });
    html += '</div>';
    mod.innerHTML = html;
    document.body.appendChild(mod);
    mod.querySelector('.close-x').onclick = function() { mod.remove(); };
  });
}

function viewAnalytics(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/admin/analytics').then(function(d) {
    var t = d.totals;
    var html = '<div class="page-head"><div><div class="page-title">📈 التقارير البيانية</div><div class="page-sub">تحليل شامل لأداء المنصة</div></div></div>';
    html += '<div class="grid grid-4">' + statCard('👥 الطلاب', t.students) + statCard('✅ إنجازات', t.lessonsCompleted + '/' + t.totalLessons) + statCard('🧠 تسليمات', t.quizSubmissions) + statCard('🎯 متوسط', t.avgScore + '%') + '</div>';
    if (d.grades && d.grades.length) {
      html += '<div class="card" style="margin-top:24px"><h3 style="margin-bottom:18px">🏫 التقدم حسب الصف</h3>';
      var maxC = Math.max.apply(null, d.grades.map(function(g) { return g.completions; })) || 1;
      d.grades.forEach(function(g) {
        var p = Math.round(g.completions / maxC * 100);
        html += '<div style="margin-bottom:14px"><div class="flex" style="justify-content:space-between;margin-bottom:6px"><strong>' + esc(g.name) + '</strong><span class="muted">' + g.students + ' طالب · ' + g.completions + ' إنجاز · ' + g.avg + '%</span></div><div class="bar"><div style="width:' + p + '%"></div></div></div>';
      });
      html += '</div>';
    }
    if (d.topStudents && d.topStudents.length) {
      html += '<div class="card" style="margin-top:24px"><h3 style="margin-bottom:18px">🏆 أفضل 5 طلاب</h3>';
      var medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      d.topStudents.forEach(function(s, i) {
        var color = s.avg >= 80 ? '#10b981' : s.avg >= 50 ? '#fbbf24' : '#ef4444';
        html += '<div class="flex" style="align-items:center;gap:14px;padding:12px;background:rgba(255,255,255,.03);border-radius:12px;margin-bottom:8px">';
        html += '<div style="font-size:26px">' + medals[i] + '</div>';
        html += '<div style="flex:1"><div style="font-weight:800">' + esc(s.name) + '</div><div class="muted" style="font-size:11px">' + s.completed + ' درس · ' + s.quizzes + ' اختبار</div></div>';
        html += '<div style="min-width:120px;height:8px;background:rgba(255,255,255,.05);border-radius:100px;overflow:hidden"><div style="width:' + s.avg + '%;height:100%;background:' + color + '"></div></div>';
        html += '<div style="font-size:20px;font-weight:900;color:' + color + ';min-width:60px;text-align:center">' + s.avg + '%</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
  }).catch(function(e) { m.innerHTML = '<div class="empty">خطأ: ' + esc(e.message) + '</div>'; });
}

function viewSettings(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/settings').then(function(s) {
    m.innerHTML = '<div class="page-head"><div><div class="page-title">⚙️ الإعدادات</div></div></div><div class="grid grid-2"><div class="card"><h3 style="margin-bottom:16px">👤 بيانات الحساب</h3><div class="field"><label>الاسم</label><input id="sName" value="' + esc(s.name) + '"></div><div class="field"><label>البريد</label><input id="sEmail" type="email" value="' + esc(s.email) + '"></div><button class="btn btn-primary btn-block" id="saveSettings">حفظ</button></div><div class="card"><h3 style="margin-bottom:16px">🔒 كلمة المرور</h3><div class="field"><label>الحالية</label><input type="password" id="curPass"></div><div class="field"><label>الجديدة</label><input type="password" id="newPass"></div><div class="field"><label>التأكيد</label><input type="password" id="confPass"></div><button class="btn btn-primary btn-block" id="changePass">تغيير</button></div></div>';
    document.getElementById('saveSettings').onclick = function() { api('/settings', { method: 'POST', body: JSON.stringify({ name: document.getElementById('sName').value, email: document.getElementById('sEmail').value }) }).then(function() { toast('تم ✅'); state.user.name = document.getElementById('sName').value; localStorage.setItem('user', JSON.stringify(state.user)); render(); }).catch(function(e) { toast(e.message, true); }); };
    document.getElementById('changePass').onclick = function() { var c = document.getElementById('curPass').value, n = document.getElementById('newPass').value, f = document.getElementById('confPass').value; if (n !== f) return toast('غير متطابقتين', true); api('/change-password', { method: 'POST', body: JSON.stringify({ current: c, newpass: n }) }).then(function() { toast('تم ✅'); }).catch(function(e) { toast(e.message, true); }); };
  });
}

function viewProgress(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/me/charts').then(function(d) {
    var o = d.overall;
    var pct = o.lessonsTotal ? Math.round(o.lessonsDone / o.lessonsTotal * 100) : 0;
    var html = '<div class="page-head"><div><div class="page-title">📈 تقدمي</div><div class="page-sub">تحليل أدائك</div></div></div>';
    html += '<div class="grid grid-4">' + statCard('✅ إتمام المنهج', pct + '%') + statCard('🎯 متوسط الدرجات', o.avgScore + '%') + statCard('🧠 اختبارات', o.quizzesTaken) + statCard('📚 دروس', o.lessonsDone + '/' + o.lessonsTotal) + '</div>';
    if (d.myScores && d.myScores.length) {
      html += '<div class="card" style="margin-top:24px"><h3 style="margin-bottom:18px">📈 تطور درجاتي</h3>' + renderLineChart(d.myScores) + '</div>';
    }
    if (d.progressBySubject && d.progressBySubject.length) {
      html += '<div class="card" style="margin-top:24px"><h3 style="margin-bottom:18px">📚 تقدمي في المواد</h3>';
      d.progressBySubject.forEach(function(sub) {
        var p = sub.total ? Math.round(sub.completed / sub.total * 100) : 0;
        html += '<div style="margin-bottom:16px"><div class="flex" style="justify-content:space-between;margin-bottom:6px"><strong>' + esc(sub.subject) + '</strong><span class="muted">' + sub.completed + '/' + sub.total + ' · ' + p + '%</span></div><div class="bar"><div style="width:' + p + '%"></div></div></div>';
      });
      html += '</div>';
    }
    m.innerHTML = html;
  }).catch(function(e) { m.innerHTML = '<div class="empty">خطأ: ' + esc(e.message) + '</div>'; });
}

function viewCertificates(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/certificates').then(function(certs) {
    if (!certs.length) { m.innerHTML = '<div class="page-head"><div><div class="page-title">🏆 شهاداتي</div></div></div><div class="card" style="text-align:center;padding:60px 20px"><h3>لا شهادات بعد</h3></div>'; return; }
    var html = '<div class="page-head"><div><div class="page-title">🏆 شهاداتي</div><div class="page-sub">' + certs.length + '</div></div></div><div class="grid grid-3">';
    certs.forEach(function(c, i) { html += '<div class="card" style="text-align:center;cursor:pointer" data-cert="' + i + '"><div style="font-size:44px">🏆</div><div style="font-weight:800;margin:6px 0">' + esc(c.quiz_title) + '</div><span class="badge badge-green">100%</span></div>'; });
    html += '</div>';
    m.innerHTML = html;
    m.querySelectorAll('[data-cert]').forEach(function(el) { el.onclick = function() { showCertificate(certs[+el.dataset.cert]); }; });
  });
}

function showCertificate(cert) {
  var mod = document.createElement('div');
  mod.className = 'cert-backdrop';
  mod.innerHTML = '<div class="cert-modal"><div class="cert-paper"><div class="cert-logo">' + LOGO_SVG + '</div><div class="cert-brand-ar">مشكاة المعرفة</div><div class="cert-title">شهادة إتمام</div><div class="cert-body">يُشهد بأن الطالب</div><div class="cert-name">' + esc(state.user.name) + '</div><div class="cert-body">قد أتم بنجاح اختبار</div><div class="cert-quiz">« ' + esc(cert.quiz_title) + ' »</div><div class="cert-score">100%</div></div></div>';
  document.body.appendChild(mod);
  mod.onclick = function(e) { if (e.target === mod) mod.remove(); };
}

function viewNotifications(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/notifications').then(function(r) {
    var list = r.notifications || [];
    var html = '<div class="page-head"><div><div class="page-title">🔔 الإشعارات</div><div class="page-sub">' + list.length + ' · ' + r.unread + ' غير مقروء</div></div>';
    if (list.length) {
      html += '<div class="flex"><button class="btn btn-ghost btn-sm" id="markAll">✅ الكل مقروء</button><button class="btn btn-danger btn-sm" id="clearAll">🗑️ حذف الكل</button></div>';
    }
    html += '</div>';
    if (!list.length) {
      html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">🔕</div><h3>لا توجد إشعارات</h3></div>';
    } else {
      list.forEach(function(n) {
        var ico = n.type && n.type.indexOf('lesson') > -1 ? '📚' : n.type && n.type.indexOf('quiz') > -1 ? '🧠' : n.type && n.type.indexOf('file') > -1 ? '📁' : '🔔';
        html += '<div class="notif-card ' + (n.read ? '' : 'unread') + '" data-id="' + n.id + '" data-link="' + (n.link || '') + '" style="position:relative">';
        html += '<div class="notif-ico">' + ico + '</div>';
        html += '<div class="notif-body" style="padding-left:40px"><div class="notif-title">' + esc(n.title) + '</div><div class="notif-msg">' + esc(n.message) + '</div><div class="notif-date">🕐 ' + new Date(n.created_at).toLocaleString('ar-EG') + '</div></div>';
        html += '<button class="notif-del-btn" data-del-notif="' + n.id + '" title="حذف" style="position:absolute;top:12px;left:12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#fca5a5;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px">🗑️</button>';
        html += '</div>';
      });
    }
    m.innerHTML = html;

    var ma = document.getElementById('markAll');
    if (ma) ma.onclick = function() { api('/notifications/read-all', { method: 'POST' }).then(function() { toast('تم'); render(); }); };
    var ca = document.getElementById('clearAll');
    if (ca) ca.onclick = function() { if (confirm('حذف كل الإشعارات؟')) api('/notifications/clear-all', { method: 'DELETE' }).then(function() { toast('تم الحذف'); render(); }); };

    m.querySelectorAll('[data-del-notif]').forEach(function(b) {
      b.onclick = function(e) {
        e.stopPropagation();
        api('/notifications/' + b.dataset.delNotif, { method: 'DELETE' }).then(function() { toast('تم الحذف'); render(); }).catch(function(e) { toast(e.message, true); });
      };
    });
    m.querySelectorAll('.notif-card').forEach(function(c) {
      c.onclick = function(e) {
        if (e.target.hasAttribute('data-del-notif')) return;
        api('/notifications/' + c.dataset.id + '/read', { method: 'POST' }).then(function() {
          if (c.dataset.link) go(c.dataset.link);
          else render();
        });
      };
    });
  });
}

function viewMyProgram(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/me/program').then(function(r) {
    var html = '<div class="page-head"><div><div class="page-title">📅 برنامجي</div><div class="page-sub">' + (r.from_grade ? 'برنامج صفك' : 'برنامجك') + '</div></div>';
    if ((r.program && r.program.trim()) || r.file_path) html += '<button class="btn btn-primary" id="printProg">🖨️ طباعة</button>';
    html += '</div>';
    if ((!r.program || !r.program.trim()) && !r.file_path) {
      html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">📅</div><h3>لم يُضف برنامجك بعد</h3><p class="muted">سيظهر برنامجك هنا بعد نشره من الإدارة</p></div>';
    } else {
      if (r.file_path) html += '<div class="card" style="margin-bottom:16px"><h3 style="margin-bottom:10px">📄 ملف البرنامج (PDF)</h3><div class="flex"><a href="' + r.file_path + '" target="_blank" class="btn btn-primary">👁️ عرض الملف</a><a href="' + r.file_path + '" download class="btn btn-ghost">⬇️ تحميل</a></div></div>';
      if (r.program && r.program.trim()) html += '<div class="card lesson-content">' + esc(r.program) + '</div>';
    }
    m.innerHTML = html;
    var pp = document.getElementById('printProg');
    if (pp) pp.onclick = function() { window.print(); };
  });
}
function viewMessages(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/me/messages').then(function(r) {
    var list = r.messages || [];
    if (!list.length) {
      m.innerHTML = '<div class="page-head"><div><div class="page-title">✉️ رسائلي</div></div></div><div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">✉️</div><h3>لا توجد رسائل</h3><p class="muted">ستظهر هنا رسائل الإدارة الخاصة بك</p></div>';
      return;
    }
    var html = '<div class="page-head"><div><div class="page-title">✉️ رسائلي</div><div class="page-sub">' + list.length + ' رسالة</div></div></div>';
    list.forEach(function(msg) {
      var ico = msg.type === 'video' ? '🎥' : msg.type === 'pdf' ? '📄' : msg.type === 'link' ? '🔗' : '💬';
      html += '<div class="card" style="margin-bottom:12px;border-color:' + (msg.read ? 'var(--border)' : 'rgba(99,102,241,.5)') + '">';
      html += '<div class="flex" style="justify-content:space-between;margin-bottom:10px"><span style="font-size:24px">' + ico + '</span>' + (msg.read ? '' : '<span class="badge badge-cyan">جديد</span>') + '</div>';
      if (msg.content) html += '<div style="font-size:14px;line-height:1.8;white-space:pre-wrap;word-break:break-word;margin-bottom:12px">' + esc(msg.content) + '</div>';
      html += '<div class="muted" style="font-size:11px;margin-bottom:10px">🕐 ' + new Date(msg.created_at).toLocaleString('ar-EG') + '</div>';
      if (msg.file_path && msg.type === 'video') html += '<video src="' + msg.file_path + '" controls style="width:100%;border-radius:10px"></video>';
      if (msg.file_path && msg.type === 'pdf') html += '<a href="' + msg.file_path + '" target="_blank" class="btn btn-primary btn-sm" download>📥 تحميل الملف</a>';
      html += '</div>';
    });
    m.innerHTML = html;
    list.forEach(function(msg) {
      if (!msg.read) api('/me/messages/' + msg.id + '/read', { method: 'POST' }).catch(function(){});
    });
  });
}

function viewAdminMessages(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/students').then(function(students) {
    if (!students || !students.length) {
      m.innerHTML = '<div class="page-head"><div><div class="page-title">✉️ إرسال رسالة</div></div></div><div class="card" style="text-align:center;padding:60px 20px"><h3>لا يوجد طلاب</h3></div>';
      return;
    }
    var html = '<div class="page-head"><div><div class="page-title">✉️ إرسال رسالة</div><div class="page-sub">' + students.length + ' طالب</div></div></div>';
    html += '<div class="card" style="max-width:700px">';
    html += '<div class="field"><label>الطالب</label><select id="msgStudent"><option value="">-- اختر --</option>';
    students.forEach(function(s) { html += '<option value="' + s.id + '">' + esc(s.name) + ' (' + esc(s.grade_name) + ')</option>'; });
    html += '</select></div>';
    html += '<div class="field"><label>النوع</label><select id="msgType"><option value="text">💬 نص</option><option value="link">🔗 رابط</option><option value="pdf">📄 PDF</option><option value="video">🎥 فيديو</option></select></div>';
    html += '<div class="field"><label>النص / الوصف</label><textarea id="msgContent" rows="3"></textarea></div>';
    html += '<div class="field" id="msgLinkWrap" style="display:none"><label>الرابط</label><input id="msgLink"></div>';
    html += '<div class="field" id="msgFileWrap" style="display:none"><label>الملف</label><input type="file" id="msgFile"></div>';
    html += '<button class="btn btn-primary btn-block" id="sendMsgBtn">📤 إرسال</button>';
    html += '</div>';
    m.innerHTML = html;

    document.getElementById('msgType').onchange = function() {
      var t = this.value;
      document.getElementById('msgLinkWrap').style.display = t === 'link' ? 'block' : 'none';
      document.getElementById('msgFileWrap').style.display = (t === 'pdf' || t === 'video') ? 'block' : 'none';
    };

    document.getElementById('sendMsgBtn').onclick = function() {
      var sid = document.getElementById('msgStudent').value;
      var type = document.getElementById('msgType').value;
      var content = document.getElementById('msgContent').value;
      var link = document.getElementById('msgLink').value;
      var fileInput = document.getElementById('msgFile');
      if (!sid) return toast('اختر الطالب', true);
      if (type === 'text' && !content.trim()) return toast('اكتب النص', true);
      if (type === 'link' && !link.trim()) return toast('الصق الرابط', true);
      if ((type === 'pdf' || type === 'video') && !fileInput.files.length) return toast('اختر الملف', true);
      var fd = new FormData();
      fd.append('student_id', sid);
      fd.append('type', type);
      fd.append('content', type === 'link' ? (content ? content + ' | ' : '') + link : content);
      if (fileInput.files[0]) fd.append('msg_file', fileInput.files[0]);
      api('/admin/messages', { method: 'POST', body: fd })
        .then(function() {
          toast('تم الإرسال ✅');
          document.getElementById('msgContent').value = '';
          document.getElementById('msgLink').value = '';
          fileInput.value = '';
        })
        .catch(function(e) { toast(e.message, true); });
    };
  });
}

function viewAdminPrograms(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  Promise.all([api('/students'), api('/grades')]).then(function(r) {
    var students = r[0] || [];
    var grades = r[1] || [];
    var html = '<div class="page-head"><div><div class="page-title">📅 البرامج الدراسية</div><div class="page-sub">أرسل برنامجًا لطالب محدد أو لصف كامل</div></div></div>';
    html += '<div class="card" style="max-width:800px">';
    html += '<h3 style="margin-bottom:16px">📤 إرسال / تحديث برنامج</h3>';
    html += '<div class="field"><label>إرسال إلى</label><div style="display:flex;gap:10px;margin-top:6px">';
    html += '<label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:12px;cursor:pointer"><input type="radio" name="target_type" value="student" checked style="width:auto"> 👤 طالب محدد</label>';
    html += '<label style="flex:1;padding:12px;background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.25);border-radius:12px;cursor:pointer"><input type="radio" name="target_type" value="grade" style="width:auto"> 🏫 صف كامل</label>';
    html += '</div></div>';
    html += '<div class="field" id="studentWrap"><label>الطالب</label><select id="progStudent"><option value="">-- اختر الطالب --</option>';
    students.forEach(function(s) { html += '<option value="' + s.id + '">' + esc(s.name) + ' (' + esc(s.grade_name) + ')</option>'; });
    html += '</select></div>';
    html += '<div class="field" id="gradeWrap" style="display:none"><label>الصف</label><select id="progGrade"><option value="">-- اختر الصف --</option>';
    grades.forEach(function(g) { html += '<option value="' + g.id + '">' + esc(g.name) + '</option>'; });
    html += '</select></div>';
    html += '<div class="field"><label>📝 محتوى البرنامج (نصي)</label><textarea id="progContent" rows="8" placeholder="اكتب البرنامج الأسبوعي..."></textarea></div>';
    html += '<div class="field" style="background:rgba(99,102,241,.08);padding:14px;border-radius:12px;border:1px solid rgba(99,102,241,.3)"><label>📄 أو ارفع ملف PDF (اختياري)</label><input type="file" id="progFile" accept=".pdf,application/pdf"><div style="font-size:12px;color:#94a3b8;margin-top:6px">💡 يمكن رفع PDF + كتابة نص معًا</div></div>';
    html += '<button class="btn btn-primary btn-block" id="saveProgBtn">💾 حفظ وإرسال</button>';
    html += '</div>';
    m.innerHTML = html;
    m.querySelectorAll('input[name="target_type"]').forEach(function(r) {
      r.onchange = function() {
        document.getElementById('studentWrap').style.display = r.value === 'student' ? 'block' : 'none';
        document.getElementById('gradeWrap').style.display = r.value === 'grade' ? 'block' : 'none';
      };
    });
    document.getElementById('saveProgBtn').onclick = function() {
      var target = m.querySelector('input[name="target_type"]:checked').value;
      var content = document.getElementById('progContent').value;
      var fileInput = document.getElementById('progFile');
      if (target === 'student' && !document.getElementById('progStudent').value) return toast('اختر الطالب', true);
      if (target === 'grade' && !document.getElementById('progGrade').value) return toast('اختر الصف', true);
      if (!content.trim() && !fileInput.files.length) return toast('اكتب نصًا أو ارفع PDF', true);
      var fd = new FormData();
      fd.append('target_type', target);
      if (target === 'student') fd.append('student_id', document.getElementById('progStudent').value);
      else fd.append('grade_id', document.getElementById('progGrade').value);
      fd.append('content', content);
      if (fileInput.files[0]) fd.append('program_file', fileInput.files[0]);
      api('/admin/programs', { method: 'POST', body: fd })
        .then(function() {
          toast('تم الإرسال ✅');
          document.getElementById('progContent').value = '';
          fileInput.value = '';
        })
        .catch(function(e) { toast(e.message, true); });
    };
  });
}

function viewActivities(m) {
  m.innerHTML = '<div class="empty">جاري التحميل…</div>';
  api('/admin/activities').then(function(list) {
    var html = '<div class="page-head"><div><div class="page-title">📜 سجل النشاطات</div><div class="page-sub">' + list.length + ' عملية</div></div>';
    if (list.length) html += '<button class="btn btn-danger" id="clearLog">🗑️ مسح السجل</button>';
    html += '</div>';
    if (!list.length) {
      html += '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:80px;margin-bottom:16px">📜</div><h3>لا توجد نشاطات</h3><p class="muted">ستظهر هنا كل عمليات المساعدين</p></div>';
    } else {
      html += '<div class="card" style="padding:0;overflow-x:auto"><table class="table"><thead><tr><th>من</th><th>العملية</th><th>النوع</th><th>التفاصيل</th><th>التاريخ</th></tr></thead><tbody>';
      list.forEach(function(act) {
        var actionText = act.action === 'add' ? '➕ إضافة' : act.action === 'edit' ? '✏️ تعديل' : '🗑️ حذف';
        var actionColor = act.action === 'add' ? 'green' : act.action === 'edit' ? 'yellow' : 'red';
        var roleText = act.user_role === 'admin' ? '👑 المدير' : '🧑‍💼 مساعد';
        html += '<tr>';
        html += '<td><strong>' + esc(act.user_name) + '</strong><div class="muted" style="font-size:11px">' + roleText + '</div></td>';
        html += '<td><span class="badge badge-' + actionColor + '">' + actionText + '</span></td>';
        html += '<td>' + esc(act.target_type) + '</td>';
        html += '<td>' + esc(act.target_name || '—') + '</td>';
        html += '<td class="muted" style="font-size:12px">' + new Date(act.created_at).toLocaleString('ar-EG') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }
    m.innerHTML = html;
    var cl = document.getElementById('clearLog');
    if (cl) cl.onclick = function() {
      if (confirm('مسح كل السجل؟')) api('/admin/activities/clear', { method: 'DELETE' }).then(function() { toast('تم المسح'); render(); });
    };
  });
}

function renderLineChart(scores) {
  if (!scores || !scores.length) return '<div class="empty">لا توجد بيانات</div>';
  var W = 700, H = 220, P = 40;
  var n = scores.length;
  var stepX = n > 1 ? (W - 2 * P) / (n - 1) : 0;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">';
  svg += '<defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7" stop-opacity=".5"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></linearGradient></defs>';
  for (var g = 0; g <= 4; g++) {
    var y = P + (g * (H - 2 * P) / 4);
    svg += '<line x1="' + P + '" y1="' + y + '" x2="' + (W - P) + '" y2="' + y + '" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 3"/>';
    svg += '<text x="' + (P - 8) + '" y="' + (y + 4) + '" fill="#64748b" font-size="11" text-anchor="end">' + (100 - g * 25) + '</text>';
  }
  var pts = scores.map(function(s, i) {
    return { x: P + i * stepX, y: H - P - (s.score / 100) * (H - 2 * P), v: s.score };
  });
  if (pts.length > 1) {
    var area = 'M' + pts[0].x + ' ' + (H - P) + ' ';
    pts.forEach(function(p) { area += 'L' + p.x + ' ' + p.y + ' '; });
    area += 'L' + pts[pts.length - 1].x + ' ' + (H - P) + ' Z';
    svg += '<path d="' + area + '" fill="url(#lg1)"/>';
    var line = pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y; }).join(' ');
    svg += '<path d="' + line + '" fill="none" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>';
  }
  pts.forEach(function(p) {
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="#0a0a18" stroke="#ec4899" stroke-width="3"/>';
    svg += '<text x="' + p.x + '" y="' + (p.y - 10) + '" fill="#fbbf24" font-size="11" font-weight="900" text-anchor="middle">' + p.v + '%</text>';
  });
  svg += '</svg>';
  return svg;
}

render();
