(function () {
  'use strict';
  var TAG = 'my-points';
  var added = false;

  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('m_token') ||
           localStorage.getItem('authToken') || localStorage.getItem('jwt') || null;
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

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return iso; }
  }

  function medalFor(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank === 4) return '🏅';
    return null;
  }

  function rankLabel(rank) {
    if (rank === 1) return 'الأول على صفّك';
    if (rank === 2) return 'الثاني على صفّك';
    if (rank === 3) return 'الثالث على صفّك';
    if (rank === 4) return 'الرابع على صفّك';
    return null;
  }

  function showModal(data, rankData) {
    var old = document.getElementById('pts-modal');
    if (old) old.remove();

    var total = (data && data.total != null) ? data.total : 0;
    var ops = (data && data.operations) ? data.operations.slice(0, 20) : [];

    var medalHtml = '';
    if (rankData && rankData.rank) {
      var m = medalFor(rankData.rank);
      var lbl = rankLabel(rankData.rank);
      if (m) {
        medalHtml =
          '<div style="margin:14px 0 8px;padding:12px;background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(236,72,153,0.1));border-radius:14px;border:1px solid rgba(168,85,247,0.3);">' +
            '<div style="font-size:52px;line-height:1;">' + m + '</div>' +
            '<div style="font-size:13px;color:#ec4899;font-weight:900;margin-top:6px;">' + lbl + '</div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">من أصل ' + rankData.totalStudents + ' طالب</div>' +
          '</div>';
      }
    }

    var opsHtml = '';
    if (ops.length === 0) {
      opsHtml = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.4);font-size:13px;">لا توجد عمليات بعد</div>';
    } else {
      opsHtml = '<div style="max-height:260px;overflow-y:auto;margin-top:8px;">';
      ops.forEach(function (op) {
        var v = op.value || 0;
        var color = v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#94a3b8';
        var sign = v > 0 ? '+' : '';
        var reason = op.reason ? op.reason : 'بدون سبب';
        var date = fmtDate(op.created_at);
        opsHtml +=
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:6px;border:1px solid rgba(168,85,247,0.12);">' +
            '<div style="font-size:15px;font-weight:900;color:' + color + ';min-width:48px;text-align:center;">' + sign + v + '</div>' +
            '<div style="flex:1;text-align:right;">' +
              '<div style="font-size:13px;color:#fff;font-weight:600;">' + reason + '</div>' +
              '<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:3px;">🕐 ' + date + '</div>' +
            '</div>' +
          '</div>';
      });
      opsHtml += '</div>';
    }

    var bg = document.createElement('div');
    bg.id = 'pts-modal';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;';

    var box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(145deg,#1e1b4b,#1a1a2e);border:1px solid rgba(168,85,247,0.35);border-radius:24px;padding:24px 20px;max-width:400px;width:100%;text-align:center;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,0.85);font-family:Cairo,sans-serif;max-height:90vh;overflow-y:auto;';

    box.innerHTML =
      '<div style="font-size:56px;line-height:1;">🏅</div>' +
      '<div style="font-size:18px;font-weight:900;color:#a855f7;margin-top:6px;">نقاطي</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:12px;">مجموع النقاط</div>' +
      '<div style="font-size:62px;font-weight:900;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1;">' + total + '</div>' +
      medalHtml +
      '<div style="margin-top:16px;text-align:right;font-size:13px;font-weight:800;color:#a855f7;">📋 سجل النقاط (آخر 20):</div>' +
      opsHtml +
      '<button id="pts-close" style="margin-top:18px;width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;">حسناً</button>';

    bg.appendChild(box);
    document.body.appendChild(bg);

    document.getElementById('pts-close').onclick = function () { bg.remove(); };
    bg.onclick = function (e) { if (e.target === bg) bg.remove(); };
  }

  function openPoints() {
    showModal({ total: '...', operations: [] }, null);
    Promise.all([
      apiGet('/api/me/points').catch(function () { return { total: 0, operations: [] }; }),
      apiGet('/api/me/rank').catch(function () { return null; })
    ]).then(function (results) {
      showModal(results[0], results[1]);
    });
  }

  function closeDrawerIfOpen() {
    var sb = document.querySelector('.sidebar');
    if (sb && sb.classList.contains('open')) {
      sb.classList.remove('open');
      var ov = document.getElementById('pwaOverlay');
      if (ov) ov.style.display = 'none';
    }
  }

  function addNavItem() {
    if (added) return;
    if (!isStudent()) { added = true; return; }
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (sidebar.querySelector('[data-nav="' + TAG + '"]')) { added = true; return; }

    var item = document.createElement('div');
    item.className = 'nav-item';
    item.setAttribute('data-nav', TAG);
    item.innerHTML = '<span class="ico">🏅</span><span>نقاطي</span>';
    item.style.cursor = 'pointer';

    item.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPoints();
      closeDrawerIfOpen();
    }, true);

    var spacer = sidebar.querySelector('.nav-spacer');
    if (spacer) sidebar.insertBefore(item, spacer);
    else sidebar.appendChild(item);

    added = true;
  }

  function init() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      addNavItem();
      if (added || tries > 30) clearInterval(timer);
    }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
