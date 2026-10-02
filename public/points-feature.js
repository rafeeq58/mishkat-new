(function () {
  'use strict';
  var TAG = 'my-points';
  var added = false;

  function getToken() {
    return localStorage.getItem('token') ||
           localStorage.getItem('m_token') ||
           localStorage.getItem('authToken') ||
           localStorage.getItem('jwt') || null;
  }

  function apiGet(path) {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return fetch(path, { headers: h }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function isStudent() {
    var adminItems = document.querySelectorAll(
      '.nav-item[data-nav="students"],' +
      '.nav-item[data-nav="assistants"],' +
      '.nav-item[data-nav="adminMessages"],' +
      '.nav-item[data-nav="analytics"]'
    );
    return adminItems.length === 0;
  }

  function showModal(data) {
    var old = document.getElementById('pts-modal');
    if (old) old.remove();

    var total = 0;
    if (data) {
      total = data.total != null ? data.total :
              (data.points != null ? data.points : 0);
    }

    var bg = document.createElement('div');
    bg.id = 'pts-modal';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl;';

    var box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(145deg,#1e1b4b,#1a1a2e);border:1px solid rgba(168,85,247,0.35);border-radius:24px;padding:32px 24px;max-width:380px;width:100%;text-align:center;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,0.85);font-family:Cairo,sans-serif;';
    box.innerHTML =
      '<div style="font-size:60px;margin-bottom:10px;">🏅</div>' +
      '<div style="font-size:18px;font-weight:900;color:#a855f7;margin-bottom:4px;">نقاطي</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:22px;">مجموع النقاط</div>' +
      '<div style="font-size:68px;font-weight:900;color:#ec4899;line-height:1;">' + total + '</div>' +
      '<button id="pts-close" style="margin-top:26px;width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-size:15px;font-weight:700;cursor:pointer;">حسناً</button>';

    bg.appendChild(box);
    document.body.appendChild(bg);

    document.getElementById('pts-close').onclick = function () { bg.remove(); };
    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
  }

  function openPoints() {
    showModal({ total: '...' });
    var eps = ['/api/me/points', '/me/points', '/api/student/points'];
    var i = 0;
    function next() {
      if (i >= eps.length) { showModal({ total: '0' }); return; }
      apiGet(eps[i++]).then(function (d) { showModal(d); }).catch(next);
    }
    next();
  }

  function closeDrawer() {
    var sb = document.querySelector('.sidebar');
    if (sb && sb.classList.contains('open')) {
      sb.classList.remove('open');
      var ov = document.getElementById('pwaOverlay');
      if (ov) ov.style.display = 'none';
    }
  }

  function addItem() {
    if (added || !isStudent()) { added = true; return; }
    var sb = document.querySelector('.sidebar');
    if (!sb) return;
    if (sb.querySelector('[data-nav="' + TAG + '"]')) { added = true; return; }

    var it = document.createElement('div');
    it.className = 'nav-item';
    it.setAttribute('data-nav', TAG);
    it.innerHTML = '<span class="ico">🏅</span><span>نقاطي</span>';
    it.style.cursor = 'pointer';
    it.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      openPoints(); closeDrawer();
    }, true);

    var sp = sb.querySelector('.nav-spacer');
    if (sp) sb.insertBefore(it, sp);
    else sb.appendChild(it);
    added = true;
  }

  function init() {
    var n = 0;
    var t = setInterval(function () {
      n++; addItem();
      if (added || n > 30) clearInterval(t);
    }, 600);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
