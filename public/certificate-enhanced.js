/* ============================================================
   Enhanced Certificate Design - مشكاة المعرفة
   يحل مكان showCert الأصلية دون لمس app.js
   ============================================================ */
(function () {
  'use strict';

  var LOGO_SVG = '<svg viewBox="0 0 100 100" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="clg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4af37"/><stop offset="0.5" stop-color="#f0d97a"/><stop offset="1" stop-color="#d4af37"/></linearGradient></defs><path d="M30 85 L30 40 Q30 15 50 15 Q70 15 70 40 L70 85 Z" fill="none" stroke="url(#clg)" stroke-width="4" stroke-linejoin="round"/><line x1="50" y1="15" x2="50" y2="32" stroke="url(#clg)" stroke-width="2.5"/><ellipse cx="50" cy="48" rx="11" ry="14" fill="url(#clg)" opacity="0.9"/><path d="M50 40 Q55 47 53 53 Q51 57 50 58 Q49 57 47 53 Q45 47 50 40 Z" fill="#fbbf24"/><rect x="24" y="85" width="52" height="4" rx="2" fill="url(#clg)"/></svg>';

  function getStudentName() {
    if (window.state && window.state.user && window.state.user.name) return window.state.user.name;
    try {
      var u = JSON.parse(localStorage.getItem('m_user') || localStorage.getItem('user') || '{}');
      if (u.name) return u.name;
    } catch (e) {}
    return 'الطالب';
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return iso; }
  }

  function generateSerial(c) {
    var str = (c.quiz_title || '') + '|' + (c.date || '') + '|' + getStudentName();
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return 'MK-' + Math.abs(h).toString(36).toUpperCase().slice(0, 8).padStart(8, '0');
  }

  function getGrade(score) {
    if (score >= 95) return { label: 'بتقدير ممتاز', stars: 5 };
    if (score >= 85) return { label: 'بتقدير جيد جداً', stars: 4 };
    if (score >= 75) return { label: 'بتقدير جيد', stars: 3 };
    if (score >= 60) return { label: 'بتقدير مقبول', stars: 2 };
    return { label: 'باجتياز', stars: 1 };
  }

  function injectStyles() {
    if (document.getElementById('cert-enh-styles')) return;
    var s = document.createElement('style');
    s.id = 'cert-enh-styles';
    s.textContent = [
      '.cert-overlay{position:fixed;inset:0;background:rgba(10,8,20,0.92);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;direction:rtl;backdrop-filter:blur(10px);font-family:Cairo,system-ui,sans-serif;}',
      '.cert-wrap{position:relative;max-width:920px;width:100%;margin:auto;}',
      '.cert-actions{display:flex;gap:10px;justify-content:center;margin-bottom:14px;flex-wrap:wrap;}',
      '.cert-btn{padding:11px 22px;border-radius:12px;border:none;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;color:#fff;}',
      '.cert-btn:active{transform:scale(0.95);}',
      '.cert-btn-print{background:linear-gradient(135deg,#d4af37,#f0d97a);color:#1a1a2e;box-shadow:0 8px 22px rgba(212,175,55,0.4);}',
      '.cert-btn-close{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);}',
      '.cert-btn:hover{opacity:0.9;}',
      '.cert-paper{position:relative;background:linear-gradient(135deg,#fefdf8 0%,#fdf6e3 50%,#fefdf8 100%);border-radius:6px;padding:0;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,0.7),0 0 0 1px rgba(212,175,55,0.5);animation:certZoom .45s cubic-bezier(.4,0,.2,1);}',
      '@keyframes certZoom{from{transform:scale(.92);opacity:0;}to{transform:scale(1);opacity:1;}}',
      '.cert-inner{position:relative;padding:38px 32px 30px;background:radial-gradient(circle at top left,rgba(212,175,55,0.07) 0%,transparent 45%),radial-gradient(circle at bottom right,rgba(212,175,55,0.07) 0%,transparent 45%);border:2px solid #d4af37;border-radius:4px;margin:10px;}',
      '.cert-inner::before{content:"";position:absolute;inset:6px;border:1px solid rgba(212,175,55,0.5);border-radius:3px;pointer-events:none;}',
      '.cert-corner{position:absolute;width:70px;height:70px;pointer-events:none;opacity:.9;}',
      '.cert-corner svg{width:100%;height:100%;}',
      '.cert-corner.tl{top:0;left:0;}',
      '.cert-corner.tr{top:0;right:0;transform:scaleX(-1);}',
      '.cert-corner.bl{bottom:0;left:0;transform:scaleY(-1);}',
      '.cert-corner.br{bottom:0;right:0;transform:scale(-1,-1);}',
      '.cert-header{text-align:center;position:relative;z-index:2;}',
      '.cert-logo-wrap{width:64px;height:64px;margin:0 auto 8px;}',
      '.cert-brand{font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:1px;}',
      '.cert-brand-en{font-size:9px;color:#8b7a3e;letter-spacing:4px;margin-top:3px;}',
      '.cert-title{margin-top:14px;font-size:38px;font-weight:900;background:linear-gradient(135deg,#b8860b,#d4af37,#f0d97a,#d4af37);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px;line-height:1.1;}',
      '.cert-subtitle{font-size:11px;color:#8b7a3e;letter-spacing:6px;margin-top:4px;text-transform:uppercase;}',
      '.cert-ornament{display:flex;align-items:center;justify-content:center;gap:8px;margin:14px 0 10px;}',
      '.cert-ornament-line{height:1px;width:70px;background:linear-gradient(90deg,transparent,#d4af37,transparent);}',
      '.cert-ornament-diamond{color:#d4af37;font-size:14px;}',
      '.cert-body{text-align:center;font-size:15px;color:#4a4030;margin:8px 0;font-weight:600;}',
      '.cert-name{text-align:center;font-size:34px;font-weight:900;color:#1a1a2e;padding:6px 20px;display:inline-block;border-bottom:2px solid #d4af37;margin:6px auto 14px;line-height:1.2;position:relative;left:50%;transform:translateX(-50%);}',
      '.cert-quiz{text-align:center;font-size:20px;font-weight:800;color:#6c5ce7;margin:10px auto;padding:8px 18px;background:rgba(108,92,231,0.08);border-radius:12px;display:inline-block;position:relative;left:50%;transform:translateX(-50%);border:1px dashed rgba(108,92,231,0.3);}',
      '.cert-score-badge{margin:16px auto 8px;text-align:center;}',
      '.cert-score-value{display:inline-block;font-size:44px;font-weight:900;background:linear-gradient(135deg,#b8860b,#d4af37,#f0d97a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1;letter-spacing:-1px;}',
      '.cert-score-label{font-size:13px;color:#8b7a3e;font-weight:800;margin-top:4px;letter-spacing:1px;}',
      '.cert-stars{color:#d4af37;font-size:16px;letter-spacing:3px;margin-top:4px;}',
      '.cert-footer{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin-top:24px;padding-top:18px;border-top:1px solid rgba(212,175,55,0.4);}',
      '.cert-footer-item{text-align:center;}',
      '.cert-footer-label{font-size:10px;color:#8b7a3e;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;}',
      '.cert-footer-value{font-size:13px;color:#1a1a2e;font-weight:700;font-family:"Courier New",monospace;}',
      '.cert-seal{width:78px;height:78px;border-radius:50%;background:radial-gradient(circle,#f0d97a 0%,#d4af37 70%,#b8860b 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(212,175,55,0.5),inset 0 0 0 3px rgba(255,255,255,0.4),inset 0 0 0 6px rgba(139,122,62,0.3);position:relative;}',
      '.cert-seal-inner{font-size:32px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));}',
      '.cert-seal::after{content:"مُعتمدة";position:absolute;bottom:-16px;font-size:8px;color:#8b7a3e;letter-spacing:2px;font-weight:800;}',
      '.cert-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-22deg);font-size:120px;font-weight:900;color:rgba(212,175,55,0.045);pointer-events:none;letter-spacing:8px;white-space:nowrap;z-index:1;font-family:Cairo,sans-serif;}',
      '.cert-verified{position:absolute;top:14px;right:14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:9px;font-weight:900;padding:4px 10px;border-radius:20px;letter-spacing:1px;z-index:5;box-shadow:0 4px 12px rgba(16,185,129,0.4);}',
      '@media (max-width:600px){',
      '.cert-inner{padding:24px 16px 20px;}',
      '.cert-title{font-size:26px;}',
      '.cert-name{font-size:22px;padding:4px 12px;}',
      '.cert-quiz{font-size:15px;}',
      '.cert-score-value{font-size:32px;}',
      '.cert-brand{font-size:16px;}',
      '.cert-corner{width:44px;height:44px;}',
      '.cert-watermark{font-size:70px;}',
      '.cert-footer{grid-template-columns:1fr;gap:12px;}',
      '.cert-seal{width:60px;height:60px;margin:0 auto;}',
      '.cert-seal-inner{font-size:24px;}',
      '}',
      '@media print{',
      'body *{visibility:hidden !important;overflow:visible !important;}',
      '#cert-enh-modal,#cert-enh-modal *{visibility:visible !important;}',
      '#cert-enh-modal{position:absolute !important;inset:auto !important;top:0 !important;left:0 !important;width:100% !important;padding:0 !important;background:#fff !important;backdrop-filter:none !important;display:block !important;}',
      '.cert-actions{display:none !important;}',
      '.cert-wrap{max-width:100% !important;margin:0 !important;}',
      '.cert-paper{box-shadow:none !important;animation:none !important;page-break-inside:avoid;}',
      '@page{size:A4 landscape;margin:0.6cm;}',
      '.cert-inner{background:#fefdf8 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}',
      '.cert-title,.cert-score-value,.cert-name{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}',
      '.cert-seal{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function cornerSVG() {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg'+Math.random().toString(36).slice(2,7)+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4af37"/><stop offset="1" stop-color="#f0d97a"/></linearGradient></defs><path d="M2 2 L2 30 M2 2 L30 2" stroke="#d4af37" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M8 8 L8 22 M8 8 L22 8" stroke="#f0d97a" stroke-width="1.2" fill="none"/><circle cx="14" cy="14" r="3" fill="#d4af37"/><circle cx="14" cy="14" r="1.5" fill="#fdf8eb"/><path d="M20 20 Q28 22 22 28 Q16 30 20 20 Z" fill="#d4af37" opacity="0.8"/><path d="M22 22 Q30 24 24 30" stroke="#d4af37" stroke-width="1" fill="none"/></svg>';
  }

  function buildModal(c) {
    var studentName = getStudentName();
    var date = formatDate(c.date);
    var serial = generateSerial(c);
    var grade = getGrade(100);
    var stars = '★'.repeat(grade.stars) + '☆'.repeat(5 - grade.stars);

    return '' +
      '<div class="cert-actions">' +
        '<button class="cert-btn cert-btn-print" id="cert-enh-print">🖨️ طباعة الشهادة</button>' +
        '<button class="cert-btn cert-btn-close" id="cert-enh-close">✕ إغلاق</button>' +
      '</div>' +
      '<div class="cert-wrap">' +
        '<div class="cert-paper">' +
          '<div class="cert-verified">✓ شهادة موثّقة</div>' +
          '<div class="cert-inner">' +
            '<div class="cert-corner tl">' + cornerSVG() + '</div>' +
            '<div class="cert-corner tr">' + cornerSVG() + '</div>' +
            '<div class="cert-corner bl">' + cornerSVG() + '</div>' +
            '<div class="cert-corner br">' + cornerSVG() + '</div>' +
            '<div class="cert-watermark">MISHKAT</div>' +
            '<div class="cert-header">' +
              '<div class="cert-logo-wrap">' + LOGO_SVG + '</div>' +
              '<div class="cert-brand">مشكاة المعرفة</div>' +
              '<div class="cert-brand-en">MISHKAT AL-MAARIFA</div>' +
            '</div>' +
            '<div class="cert-title">شهادة إتمام</div>' +
            '<div class="cert-subtitle">CERTIFICATE OF COMPLETION</div>' +
            '<div class="cert-ornament">' +
              '<span class="cert-ornament-line"></span>' +
              '<span class="cert-ornament-diamond">❖</span>' +
              '<span class="cert-ornament-line"></span>' +
            '</div>' +
            '<div class="cert-body">تشهد منصة مشكاة المعرفة بأن الطالب</div>' +
            '<div class="cert-name">' + studentName + '</div>' +
            '<div class="cert-body">قد أتم بنجاح اختبار</div>' +
            '<div class="cert-quiz">« ' + (c.quiz_title || '') + ' »</div>' +
            '<div class="cert-score-badge">' +
              '<div class="cert-score-value">100%</div>' +
              '<div class="cert-score-label">' + grade.label + '</div>' +
              '<div class="cert-stars">' + stars + '</div>' +
            '</div>' +
            '<div class="cert-footer">' +
              '<div class="cert-footer-item">' +
                '<div class="cert-footer-label">تاريخ الإصدار</div>' +
                '<div class="cert-footer-value">' + date + '</div>' +
              '</div>' +
              '<div class="cert-seal">' +
                '<div class="cert-seal-inner">🏆</div>' +
              '</div>' +
              '<div class="cert-footer-item">' +
                '<div class="cert-footer-label">الرقم التسلسلي</div>' +
                '<div class="cert-footer-value">' + serial + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function showEnhanced(c) {
    injectStyles();
    var old = document.getElementById('cert-enh-modal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'cert-enh-modal';
    modal.className = 'cert-overlay';
    modal.innerHTML = buildModal(c);
    document.body.appendChild(modal);

    document.getElementById('cert-enh-close').onclick = function () { modal.remove(); };
    document.getElementById('cert-enh-print').onclick = function () { window.print(); };
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
    });
  }

  function waitAndOverride() {
    if (typeof window.showCert === 'function') {
      window.showCert = showEnhanced;
      window.showEnhancedCert = showEnhanced;
      console.log('✅ Enhanced certificate active');
    } else {
      setTimeout(waitAndOverride, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndOverride);
  } else {
    waitAndOverride();
  }
})();
