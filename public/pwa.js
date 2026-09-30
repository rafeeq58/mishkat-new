/* ============================================================
   PWA Loader - مشكاة المعرفة
   ملف مستقل - لا يعدل app.js
   ============================================================ */
(function () {
  'use strict';

  // 1) تفعيل وضع الجوال
  function enableMobileMode() {
    if (window.innerWidth <= 900) {
      document.body.classList.add('pwa-mobile');
    } else {
      document.body.classList.remove('pwa-mobile');
    }
  }

  // 2) إنشاء زر القائمة
  function createMenuButton() {
    if (document.getElementById('pwaMenuBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'pwaMenuBtn';
    btn.innerHTML = '☰';
    btn.setAttribute('aria-label', 'القائمة');
    document.body.appendChild(btn);

    var ov = document.createElement('div');
    ov.id = 'pwaOverlay';
    document.body.appendChild(ov);

    function getSidebar() {
      return document.querySelector('.sidebar, .side-bar, aside, .nav-side');
    }

    btn.addEventListener('click', function () {
      var sb = getSidebar();
      if (!sb) return;
      sb.classList.toggle('open');
      ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
    });

    ov.addEventListener('click', function () {
      var sb = getSidebar();
      if (sb) sb.classList.remove('open');
      ov.style.display = 'none';
    });
  }

  // 3) تسجيل Service Worker
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function (r) { console.log('✅ PWA ready:', r.scope); })
        .catch(function (e) { console.warn('⚠️ PWA SW:', e); });
    });
  }

  // 4) مراقبة تغيير حجم الشاشة
  function watchResize() {
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(enableMobileMode, 200);
    });
  }

  // التهيئة
  function init() {
    enableMobileMode();
    createMenuButton();
    watchResize();
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
