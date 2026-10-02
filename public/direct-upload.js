/* ============================================================
   Direct Upload to Backblaze B2
   يستبدل رفع الفيديوهات الكبيرة ليتخطى Render
   ============================================================ */
(function () {
  'use strict';

  window.pwaDirectUpload = function (file, onProgress) {
    return new Promise(function (resolve, reject) {
      var token = localStorage.getItem('token')
               || localStorage.getItem('m_token')
               || localStorage.getItem('authToken')
               || localStorage.getItem('jwt');

      if (!token) return reject(new Error('غير مسجل دخول'));

      // 1) اطلب إذن الرفع من السيرفر
      fetch('/api/b2/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ fileName: file.name })
      })
      .then(function (r) {
        if (!r.ok) throw new Error('فشل الحصول على إذن الرفع');
        return r.json();
      })
      .then(function (info) {
        // 2) ارفع الملف مباشرة إلى B2
        return new Promise(function (res, rej) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', info.uploadUrl, true);
          xhr.setRequestHeader('Authorization', info.authToken);
          xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(info.b2Name));
          xhr.setRequestHeader('Content-Type', file.type || 'b2/x-auto');
          xhr.setRequestHeader('X-Bz-Content-Sha1', 'do_not_verify');

          if (xhr.upload && onProgress) {
            xhr.upload.onprogress = function (e) {
              if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
              }
            };
          }

          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              res(info.publicPath);
            } else {
              rej(new Error('فشل الرفع إلى B2: ' + xhr.status));
            }
          };
          xhr.onerror = function () { rej(new Error('خطأ شبكة أثناء الرفع')); };
          xhr.send(file);
        });
      })
      .then(resolve)
      .catch(reject);
    });
  };
})();
