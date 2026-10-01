/* ============================================================
   PWA2 - Logic - مشكاة المعرفة
   ملف إصلاح - لا يحذف pwa.js الأصلي
   ============================================================ */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth <= 900; }

  function createHeader() {
    if (document.getElementById('pwaHeader')) return;
    var html =
      '<header id="pwaHeader">' +
        '<button class="ph-btn" id="phMenu">☰</button>' +
        '<div class="ph-brand">' +
          '<span class="ph-brand-ar">مشكاة المعرفة</span>' +
          '<span class="ph-brand-en">MISHKAT AL-MAARIFA</span>' +
        '</div>' +
        '<button class="ph-btn" id="phUser">🎓</button>' +
      '</header>';
    document.body.insertAdjacentHTML('afterbegin', html);
    document.getElementById('phMenu').onclick = openDrawer;
    document.getElementById('phUser').onclick = function () {
      var t = document.querySelector('.nav-item[data-nav="settings"]');
      if (t) t.click(); else openDrawer();
    };
  }

  function createBottomNav() {
    if (document.getElementById('pwaNav')) return;
    var tabs = [
      { id: 'dashboard', ico: '🏠', label: 'الرئيسية' },
      { id: 'lessons',   ico: '📚', label: 'الدروس' },
      { id: 'quizzes',   ico: '🧠', label: 'الاختبارات' },
      { id: 'files',     ico: '📁', label: 'الملفات' },
      { id: 'more',      ico: '☰', label: 'المزيد' }
    ];
    var html = '<nav id="pwaNav">';
    tabs.forEach(function (t) {
      html += '<button class="pn-item" data-nav="' + t.id + '">' +
        '<span class="pn-ico">' + t.ico + '</span>' +
        '<span class="pn-lbl">' + t.label + '</span>' +
      '</button>';
    });
    html += '</nav>';
    document.body.insertAdjacentHTML('beforeend', html);

    document.querySelectorAll('.pn-item').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.dataset.nav;
        if (id === 'more') { openDrawer(); return; }
        var target = document.querySelector('.sidebar .nav-item[data-nav="' + id + '"]');
        if (target) target.click();
        setActive(id);
      };
    });
  }

  function setActive(id) {
    document.querySelectorAll('.pn-item').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === id);
    });
  }

  function createOverlay() {
    if (document.getElementById('pwaOverlay')) return;
    document.body.insertAdjacentHTML('beforeend', '<div id="pwaOverlay"></div>');
    document.getElementById('pwaOverlay').onclick = closeDrawer;
  }

  function openDrawer() {
    var sb = document.querySelector('.sidebar');
    var ov = document.getElementById('pwaOverlay');
    if (sb) sb.classList.add('open');
    if (ov) ov.style.display = 'block';
  }
  function closeDrawer() {
    var sb = document.querySelector('.sidebar');
    var ov = document.getElementById('pwaOverlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.style.display = 'none';
  }

  // عند النقر على أي عنصر في الـ sidebar → أغلق الدُرج
  document.addEventListener('click', function (e) {
    var item = e.target.closest && e.target.closest('.sidebar .nav-item');
    if (!item) return;
    if (!isMobile()) return;
    var nav = item.dataset.nav;
    setTimeout(function () {
      closeDrawer();
      if (nav && nav !== 'logout') setActive(nav);
    }, 80);
  });

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js').catch(function () {});
    });
  }

  function init() {
    if (isMobile()) {
      document.body.classList.add('pwa-mobile');
      createHeader();
      createOverlay();
      createBottomNav();
      setActive('dashboard');
    } else {
      document.body.classList.remove('pwa-mobile');
    }
    registerSW();
  }

  window.addEventListener('resize', function () {
    clearTimeout(window.__pwaT2);
    window.__pwaT2 = setTimeout(init, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
