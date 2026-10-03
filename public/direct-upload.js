/* ============================================================
   Direct Upload to Backblaze B2 via Presigned URLs
   - لا يحتاج CORS
   - لا يحتاج Authorization في المتصفح
   - يعمل مع أي حجم ملف
   ============================================================ */
(function () {
  'use strict';

  if (!window.fetch) return;

  var originalFetch = window.fetch.bind(window);
  var b2Uploading = false;

  function getToken() {
    return localStorage.getItem('token')
        || localStorage.getItem('m_token')
        || localStorage.getItem('authToken')
        || localStorage.getItem('jwt')
        || '';
  }

  function isFormData(body) {
    return body
        && typeof body.get === 'function'
        && typeof body.append === 'function';
  }

  // ✅ رفع الملف عبر presigned URL (PUT مع body خام)
  function uploadFileToB2(file, token) {
    return originalFetch('/api/b2/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ fileName: file.name })
    })
    .then(function (r) {
      if (!r.ok) throw new Error('فشل تجهيز الرفع (' + r.status + ')');
      return r.json();
    })
    .then(function (info) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        // ✅ PUT بدلاً من POST
        xhr.open('PUT', info.uploadUrl, true);
        // ✅ رأس واحد فقط: Content-Type
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(info.publicPath);
          } else {
            reject(new Error('فشل الرفع (' + xhr.status + ')'));
          }
        };
        xhr.onerror = function () {
          reject(new Error('خطأ شبكة أثناء الرفع'));
        };
        xhr.send(file);
      });
    });
  }

  function handleIntercept(url, init) {
    b2Uploading = true;
    var fd = init.body;
    var token = getToken();

    var videoFile = fd.get('video_file');
    var pdfFile = fd.get('file');

    var videoPromise = (videoFile && videoFile.size)
      ? uploadFileToB2(videoFile, token)
      : Promise.resolve(null);

    var pdfPromise = (pdfFile && pdfFile.size)
      ? uploadFileToB2(pdfFile, token)
      : Promise.resolve(null);

    return Promise.all([videoPromise, pdfPromise])
      .then(function (results) {
        var videoPath = results[0];
        var pdfPath = results[1];

        var payload = {
          title: fd.get('title') || '',
          description: fd.get('description') || '',
          content: fd.get('content') || '',
          order_index: parseInt(fd.get('order_index')) || 0,
          subject_id: fd.get('subject_id') || null,
          video_url: videoPath || fd.get('video_url') || '',
          file_path: pdfPath || null
        };

        var isEdit = /\/api\/lessons\/\d+$/.test(url);
        var jsonUrl = url + '/json';

        return originalFetch(jsonUrl, {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        });
      })
      .finally(function () {
        b2Uploading = false;
      });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string'
      ? input
      : (input && input.url ? input.url : '');

    if (!b2Uploading &&
        isFormData(init && init.body) &&
        url.indexOf('/api/lessons') !== -1) {

      var method = (init.method || 'GET').toUpperCase();
      if (method === 'POST' || method === 'PUT') {
        return handleIntercept(url, init);
      }
    }

    return originalFetch(input, init);
  };

  console.log('✅ Direct B2 upload active (presigned URLs)');
})();
