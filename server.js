const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const B2 = require('backblaze-b2');

// ============ B2 SETUP ============
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY
});
let b2Authorized = false;

async function ensureB2Auth() {
  if (!b2Authorized) {
    await b2.authorize();
    b2Authorized = true;
  }
}

async function uploadToB2(buffer, fileName, mimeType) {
  try {
    await ensureB2Auth();
    const bucketId = process.env.B2_BUCKET_ID;
    const uploadUrlResp = await b2.getUploadUrl({ bucketId });
    const response = await b2.uploadFile({
      uploadUrl: uploadUrlResp.data.uploadUrl,
      uploadAuthToken: uploadUrlResp.data.authorizationToken,
      filename: fileName,
      data: buffer,
      mime: mimeType || 'application/octet-stream'
    });
    return { fileId: response.data.fileId, fileName: response.data.fileName };
  } catch (err) {
    b2Authorized = false;
    throw err;
  }
}

async function deleteFromB2ByName(fileName) {
  try {
    await ensureB2Auth();
    const list = await b2.listFileNames({
      bucketId: process.env.B2_BUCKET_ID,
      startFileName: fileName,
      maxFileCount: 1
    });
    const file = list.data.files.find(function(f) { return f.fileName === fileName; });
    if (file) {
      await b2.deleteFileVersion({ fileId: file.fileId, fileName: file.fileName });
    }
  } catch (err) {
    b2Authorized = false;
    console.warn('B2 delete warning:', err.message);
  }
}

async function uploadLocalToB2(localPath, originalName, mimeType) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(originalName);
  const b2Name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
  const result = await uploadToB2(buffer, b2Name, mimeType);
  try { fs.unlinkSync(localPath); } catch (e) {}
  return result.fileName;
}

async function downloadDBFromB2() {
  try {
    await ensureB2Auth();
    const bucketName = process.env.B2_BUCKET_NAME;
    const auth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: 'data/db.json',
      validDurationInSeconds: 3600
    });
    const url = 'https://f005.backblazeb2.com/file/' + bucketName + '/data/db.json?Authorization=' + auth.data.authorizationToken;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.log('B2 DB fetch failed:', e.message);
    return null;
  }
}

async function uploadDBToB2() {
  try {
    await ensureB2Auth();
    const bucketId = process.env.B2_BUCKET_ID;
    const uploadUrlResp = await b2.getUploadUrl({ bucketId });
    const data = Buffer.from(JSON.stringify(db, null, 2));
    await b2.uploadFile({
      uploadUrl: uploadUrlResp.data.uploadUrl,
      uploadAuthToken: uploadUrlResp.data.authorizationToken,
      filename: 'data/db.json',
      data: data,
      mime: 'application/json'
    });
  } catch (e) {
    console.log('B2 DB upload failed:', e.message);
  }
}
// ============ END B2 ============

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'mishkat-secret-key-2026-final';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/mobile', express.static('public/mobile'));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data')) fs.mkdirSync('data');

const DB_FILE = 'data/db.json';
let db = { users: [], lessons: [], progress: [], quizzes: [], submissions: [], notifications: [], grades: [], subjects: [], favorites: [], files: [], ratings: [], points: [], messages: [], seq: { users: 1, lessons: 1, progress: 1, quizzes: 1, submissions: 1, notifications: 1, grades: 1, subjects: 1, files: 1, points: 1, messages: 1, activities: 1, grade_programs: 1 } };

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) {}
  }
  ['users','lessons','progress','quizzes','submissions','notifications','grades','subjects','favorites','files','ratings','points','messages','activities','grade_programs'].forEach(function(k) { if (!db[k]) db[k] = []; });
  if (!db.seq) db.seq = {};
  ['users','lessons','progress','quizzes','submissions','notifications','grades','subjects','files','points','messages','activities','grade_programs'].forEach(function(k) { if (!db.seq[k]) db.seq[k] = 1; });
}

function saveDB() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) {}
  uploadDBToB2().catch(function(e) { console.log('B2 sync error:', e.message); });
}

function nextId(t) { if (!db.seq[t]) db.seq[t] = 1; return db.seq[t]++; }

function logActivity(action, target_type, target_name) {
  if (!db.activities) db.activities = [];
  if (!db.seq.activities) db.seq.activities = 1;
  db.activities.push({
    id: nextId('activities'),
    user_id: arguments[3] || null,
    user_name: arguments[4] || '',
    user_role: arguments[5] || '',
    action: action,
    target_type: target_type,
    target_name: target_name,
    created_at: new Date().toISOString()
  });
}

const storage = multer.diskStorage({
  destination: function(_, __, cb) { cb(null, 'uploads/'); },
  filename: function(_, f, cb) { cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(f.originalname)); }
});
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 1024 } });

function auth(req, res, next) {
  const t = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
  if (!t) return res.status(401).json({ error: 'غير مصرح' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { res.status(401).json({ error: 'جلسة منتهية' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'للمسؤول فقط' });
  next();
}

function hasPerm(perm) {
  return function(req, res, next) {
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'assistant') {
      var u = db.users.find(function(x) { return x.id === req.user.id; });
      if (u && u.permissions && u.permissions.indexOf(perm) !== -1) return next();
    }
    return res.status(403).json({ error: 'لا تملك صلاحية لهذا الإجراء' });
  };
}

function notifyStudents(type, title, message, link, targetGradeId) {
  if (!db.notifications) db.notifications = [];
  var students = db.users.filter(function(u) { return u.role === 'student'; });
  if (targetGradeId) students = students.filter(function(u) { return u.grade_id === targetGradeId; });
  students.forEach(function(st) {
    db.notifications.push({ id: nextId('notifications'), user_id: st.id, type: type, title: title, message: message, link: link || 'lessons', created_at: new Date().toISOString(), read_by: [] });
  });
}

// ============ LOG MIDDLEWARE ============
app.use(function(req, res, next) {
  if (req.method === 'GET') return next();
  var t = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
  if (!t) return next();
  var jwtUser;
  try { jwtUser = jwt.verify(t, JWT_SECRET); } catch(e) { return next(); }
  if (!jwtUser || (jwtUser.role !== 'assistant' && jwtUser.role !== 'admin')) return next();
  var path = req.path;
  if (path.indexOf('/api/') !== 0) return next();
  var actionMap = { POST: 'add', PUT: 'edit', DELETE: 'delete' };
  var action = actionMap[req.method];
  if (!action) return next();
  var targetType = '';
  var targetName = '';
  if (path.indexOf('/lessons') !== -1) { targetType = 'درس'; targetName = (req.body && req.body.title) || ''; }
  else if (path.indexOf('/students') !== -1) { targetType = 'طالب'; targetName = (req.body && req.body.name) || ''; }
  else if (path.indexOf('/files') !== -1) { targetType = 'ملف'; targetName = (req.body && req.body.title) || ''; }
  else if (path.indexOf('/quizzes') !== -1) { targetType = 'اختبار'; targetName = (req.body && req.body.title) || ''; }
  else if (path.indexOf('/grades') !== -1) { targetType = 'صف'; targetName = (req.body && req.body.name) || ''; }
  else if (path.indexOf('/subjects') !== -1) { targetType = 'مادة'; targetName = (req.body && req.body.name) || ''; }
  else if (path.indexOf('/assistants') !== -1) { targetType = 'مساعد'; targetName = (req.body && req.body.name) || ''; }
  else return next();
  res.on('finish', function() {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      var u = db.users.find(function(x) { return x.id === jwtUser.id; });
      if (u) {
        logActivity(action, targetType, targetName, u.id, u.name, u.role);
        saveDB();
      }
    }
  });
  next();
});

// ============ AUTH ============
app.post('/api/auth/login', function(req, res) {
  var u = db.users.find(function(x) { return x.email === req.body.email; });
  if (!u || !bcrypt.compareSync(req.body.password, u.password)) return res.status(401).json({ error: 'بيانات خاطئة' });
  var token = jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token: token, user: { id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions || [] } });
});

app.get('/api/auth/me', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === req.user.id; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions || [] });
});

// ============ GRADES ============
app.get('/api/grades', auth, function(req, res) { res.json(db.grades.slice()); });
app.post('/api/grades', auth, adminOnly, function(req, res) {
  if (!req.body.name) return res.status(400).json({ error: 'اسم الصف مطلوب' });
  var g = { id: nextId('grades'), name: req.body.name };
  db.grades.push(g); saveDB(); res.json(g);
});
app.delete('/api/grades/:id', auth, adminOnly, function(req, res) {
  var id = +req.params.id;
  db.grades = db.grades.filter(function(g) { return g.id !== id; });
  db.subjects = db.subjects.filter(function(s) { return s.grade_id !== id; });
  saveDB(); res.json({ ok: 1 });
});

// ============ SUBJECTS ============
app.get('/api/subjects', auth, function(req, res) {
  var list = db.subjects.slice();
  if (req.query.grade_id) list = list.filter(function(s) { return s.grade_id === +req.query.grade_id; });
  res.json(list);
});
app.post('/api/subjects', auth, adminOnly, function(req, res) {
  if (!req.body.name || !req.body.grade_id) return res.status(400).json({ error: 'الاسم والصف مطلوبان' });
  var sub = { id: nextId('subjects'), name: req.body.name, grade_id: +req.body.grade_id };
  db.subjects.push(sub); saveDB(); res.json(sub);
});
app.delete('/api/subjects/:id', auth, adminOnly, function(req, res) {
  db.subjects = db.subjects.filter(function(s) { return s.id !== +req.params.id; });
  saveDB(); res.json({ ok: 1 });
});

// ============ STUDENTS ============
app.get('/api/students', auth, hasPerm('students_add'), function(req, res) {
  var students = db.users.filter(function(u) { return u.role === 'student'; }).map(function(u) {
    var done = db.progress.filter(function(p) { return p.user_id === u.id && p.completed === 1; }).length;
    var subs = db.submissions.filter(function(s) { return s.user_id === u.id; });
    var avg = subs.length ? subs.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / subs.length : 0;
    var g = db.grades.find(function(x) { return x.id === u.grade_id; });
    return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', grade_id: u.grade_id || null, grade_name: g ? g.name : '—', school: u.school || '—', done: done, quizzes: subs.length, avg: avg, password_plain: u.password_plain || '' };
  });
  res.json(students);
});

app.post('/api/students', auth, hasPerm('students_add'), function(req, res) {
  if (!req.body.name || !req.body.email || !req.body.password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  if (!req.body.grade_id) return res.status(400).json({ error: 'الصف مطلوب' });
  if (db.users.find(function(u) { return u.email === req.body.email; })) return res.status(400).json({ error: 'البريد مستخدم' });
  var u = { id: nextId('users'), name: req.body.name, email: req.body.email, phone: req.body.phone || '', grade_id: +req.body.grade_id, school: req.body.school || 'دراسة حرة', password: bcrypt.hashSync(req.body.password, 10), password_plain: req.body.password, role: 'student' };
  db.users.push(u); saveDB(); res.json({ id: u.id });
});

app.put('/api/students/:id', auth, hasPerm('students_add'), function(req, res) {
  var u = db.users.find(function(x) { return x.id === +req.params.id && x.role === 'student'; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  if (req.body.name) u.name = req.body.name;
  if (req.body.email) u.email = req.body.email;
  if (req.body.phone !== undefined) u.phone = req.body.phone;
  if (req.body.grade_id) u.grade_id = +req.body.grade_id;
  if (req.body.school) u.school = req.body.school;
  if (req.body.password && req.body.password.length >= 6) { u.password = bcrypt.hashSync(req.body.password, 10); u.password_plain = req.body.password; }
  saveDB(); res.json({ ok: 1 });
});

app.delete('/api/students/:id', auth, hasPerm('students_add'), function(req, res) {
  var id = +req.params.id;
  db.users = db.users.filter(function(u) { return !(u.id === id && u.role === 'student'); });
  db.progress = db.progress.filter(function(p) { return p.user_id !== id; });
  db.submissions = db.submissions.filter(function(s) { return s.user_id !== id; });
  db.points = db.points.filter(function(p) { return p.user_id !== id; });
  saveDB(); res.json({ ok: 1 });
});

// ============ LESSONS ============
app.get('/api/lessons', auth, function(req, res) {
  var ls = db.lessons.slice().sort(function(a,b) { return (a.order_index - b.order_index) || (a.id - b.id); });
  if (req.user.role === 'admin') return res.json(ls);
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  if (me && me.grade_id) {
    var mySubs = db.subjects.filter(function(x) { return x.grade_id === me.grade_id; }).map(function(x) { return x.id; });
    ls = ls.filter(function(l) { return !l.subject_id || mySubs.indexOf(l.subject_id) !== -1; });
  }
  res.json(ls.map(function(l) {
    var p = db.progress.find(function(x) { return x.user_id === req.user.id && x.lesson_id === l.id; });
    return Object.assign({}, l, { completed: p ? p.completed === 1 : false });
  }));
});

app.get('/api/lessons/:id', auth, function(req, res) {
  var l = db.lessons.find(function(x) { return x.id === +req.params.id; });
  if (!l) return res.status(404).json({ error: 'غير موجود' });
  if (req.user.role === 'student') {
    if (!db.progress.find(function(p) { return p.user_id === req.user.id && p.lesson_id === l.id; })) {
      db.progress.push({ id: nextId('progress'), user_id: req.user.id, lesson_id: l.id, completed: 0 });
      saveDB();
    }
  }
  res.json(l);
});

app.post('/api/lessons', auth, hasPerm('lessons_add'), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async function(req, res) {
  try {
    var vf = req.files && req.files.video_file ? req.files.video_file[0] : null;
    var af = req.files && req.files.file ? req.files.file[0] : null;
    var videoUrl = req.body.video_url || '';
    var filePath = null;
    if (vf) {
      var vName = await uploadLocalToB2(vf.path, vf.originalname, vf.mimetype);
      videoUrl = '/b2/' + vName;
    }
    if (af) {
      var fName = await uploadLocalToB2(af.path, af.originalname, af.mimetype);
      filePath = '/b2/' + fName;
    }
    var l = {
      id: nextId('lessons'),
      title: req.body.title,
      description: req.body.description || '',
      content: req.body.content || '',
      video_url: videoUrl,
      file_path: filePath,
      subject_id: req.body.subject_id ? +req.body.subject_id : null,
      order_index: +req.body.order_index || 0
    };
    db.lessons.push(l);
    var gid = null;
    if (l.subject_id) {
      var sub = db.subjects.find(function(x) { return x.id === l.subject_id; });
      if (sub) gid = sub.grade_id;
    }
    try { notifyStudents('lesson_new', 'درس جديد', 'تم إضافة درس: ' + l.title, 'lessons', gid); } catch (e) {}
    saveDB(); res.json(l);
  } catch (err) {
    console.error('Lesson upload error:', err);
    res.status(500).json({ error: 'فشل الرفع: ' + err.message });
  }
});

app.put('/api/lessons/:id', auth, hasPerm('lessons_add'), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async function(req, res) {
  try {
    var l = db.lessons.find(function(x) { return x.id === +req.params.id; });
    if (!l) return res.status(404).json({ error: 'غير موجود' });
    var vf = req.files && req.files.video_file ? req.files.video_file[0] : null;
    var af = req.files && req.files.file ? req.files.file[0] : null;
    l.title = req.body.title;
    l.description = req.body.description || '';
    l.content = req.body.content || '';
    if (vf) {
      var vName = await uploadLocalToB2(vf.path, vf.originalname, vf.mimetype);
      l.video_url = '/b2/' + vName;
    } else if (req.body.video_url !== undefined) {
      l.video_url = req.body.video_url;
    }
    if (af) {
      var fName = await uploadLocalToB2(af.path, af.originalname, af.mimetype);
      l.file_path = '/b2/' + fName;
    }
    if (req.body.subject_id) l.subject_id = +req.body.subject_id;
    l.order_index = +req.body.order_index || 0;
    saveDB(); res.json(l);
  } catch (err) {
    console.error('Lesson update error:', err);
    res.status(500).json({ error: 'فشل التحديث: ' + err.message });
  }
});

app.delete('/api/lessons/:id', auth, hasPerm('lessons_add'), function(req, res) {
  var id = +req.params.id;
  db.lessons = db.lessons.filter(function(l) { return l.id !== id; });
  db.progress = db.progress.filter(function(p) { return p.lesson_id !== id; });
  saveDB(); res.json({ ok: 1 });
});

app.post('/api/lessons/:id/complete', auth, function(req, res) {
  var lid = +req.params.id;
  var p = db.progress.find(function(x) { return x.user_id === req.user.id && x.lesson_id === lid; });
  if (p) p.completed = 1;
  else db.progress.push({ id: nextId('progress'), user_id: req.user.id, lesson_id: lid, completed: 1 });
  saveDB(); res.json({ ok: 1 });
});

// ============ FILES ============
app.get('/api/files', auth, function(req, res) {
  var list = db.files.slice().sort(function(a,b) { return b.id - a.id; });
  if (req.user.role === 'admin') {
    return res.json(list.map(function(f) {
      var g = db.grades.find(function(x) { return x.id === f.grade_id; });
      var sub = db.subjects.find(function(x) { return x.id === f.subject_id; });
      var rates = db.ratings.filter(function(r) { return r.file_id === f.id; });
      var cnt = rates.length;
      var avg = cnt ? rates.reduce(function(a,b) { return a + b.stars; }, 0) / cnt : 0;
      return Object.assign({}, f, { grade_name: g ? g.name : null, subject_name: sub ? sub.name : null, ratings_count: cnt, avg_rating: +avg.toFixed(2) });
    }));
  }
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  var myGrade = me ? me.grade_id : null;
  var visible = list.filter(function(f) { return !f.grade_id || f.grade_id === myGrade; });
  res.json(visible.map(function(f) {
    var g = db.grades.find(function(x) { return x.id === f.grade_id; });
    var sub = db.subjects.find(function(x) { return x.id === f.subject_id; });
    var myRate = db.ratings.find(function(r) { return r.file_id === f.id && r.user_id === req.user.id; });
    return Object.assign({}, f, { grade_name: g ? g.name : null, subject_name: sub ? sub.name : null, my_rating: myRate ? myRate.stars : 0 });
  }));
});

app.post('/api/files', auth, hasPerm('files_add'), upload.single('pdf_file'), async function(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'الملف مطلوب' });
    var isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().slice(-4) === '.pdf';
    if (!isPdf) { try { fs.unlinkSync(req.file.path); } catch (e) {} return res.status(400).json({ error: 'PDF فقط' }); }
    var b2Name = await uploadLocalToB2(req.file.path, req.file.originalname, req.file.mimetype);
    var f = { id: nextId('files'), title: req.body.title || 'ملف', notes: req.body.notes || '', file_path: '/b2/' + b2Name, original_name: req.file.originalname, grade_id: req.body.grade_id ? +req.body.grade_id : null, subject_id: req.body.subject_id ? +req.body.subject_id : null, created_at: new Date().toISOString() };
    db.files.push(f); saveDB(); res.json(f);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'فشل الرفع: ' + err.message });
  }
});

app.put('/api/files/:id', auth, hasPerm('files_add'), upload.single('pdf_file'), async function(req, res) {
  try {
    var f = db.files.find(function(x) { return x.id === +req.params.id; });
    if (!f) return res.status(404).json({ error: 'غير موجود' });
    if (req.body.title !== undefined) f.title = req.body.title;
    if (req.body.notes !== undefined) f.notes = req.body.notes;
    if (req.body.grade_id !== undefined) f.grade_id = req.body.grade_id ? +req.body.grade_id : null;
    if (req.body.subject_id !== undefined) f.subject_id = req.body.subject_id ? +req.body.subject_id : null;
    if (req.file) {
      if (f.file_path && f.file_path.indexOf('/b2/') === 0) {
        var oldName = f.file_path.replace('/b2/', '');
        await deleteFromB2ByName(oldName);
      }
      var b2Name = await uploadLocalToB2(req.file.path, req.file.originalname, req.file.mimetype);
      f.file_path = '/b2/' + b2Name;
    }
    saveDB(); res.json(f);
  } catch (err) {
    console.error('File update error:', err);
    res.status(500).json({ error: 'فشل التحديث: ' + err.message });
  }
});

app.delete('/api/files/:id', auth, hasPerm('files_add'), async function(req, res) {
  var f = db.files.find(function(x) { return x.id === +req.params.id; });
  if (f && f.file_path && f.file_path.indexOf('/b2/') === 0) {
    try { await deleteFromB2ByName(f.file_path.replace('/b2/', '')); } catch (e) {}
  }
  db.files = db.files.filter(function(x) { return x.id !== +req.params.id; });
  db.ratings = db.ratings.filter(function(r) { return r.file_id !== +req.params.id; });
  saveDB(); res.json({ ok: 1 });
});

app.post('/api/files/:id/rate', auth, function(req, res) {
  if (req.user.role === 'admin') return res.status(403).json({ error: 'الطلاب فقط' });
  var stars = +req.body.stars;
  if (stars < 1 || stars > 3) return res.status(400).json({ error: 'من 1 إلى 3' });
  var existing = db.ratings.find(function(r) { return r.file_id === +req.params.id && r.user_id === req.user.id; });
  if (existing) existing.stars = stars;
  else db.ratings.push({ file_id: +req.params.id, user_id: req.user.id, stars: stars });
  saveDB(); res.json({ ok: 1 });
});

app.get('/api/admin/files/:id/ratings', auth, hasPerm('ratings_view'), function(req, res) {
  var rows = db.ratings.filter(function(r) { return r.file_id === +req.params.id; }).map(function(r) {
    var u = db.users.find(function(x) { return x.id === r.user_id; });
    return { stars: r.stars, student_name: u ? u.name : '—', student_email: u ? u.email : '' };
  });
  res.json(rows);
});

// ============ QUIZZES ============
app.get('/api/quizzes', auth, function(req, res) {
  if (req.user.role === 'admin') {
    return res.json(db.quizzes.map(function(q) {
      var g = db.grades.find(function(x) { return x.id === q.grade_id; });
      var s = db.subjects.find(function(x) { return x.id === q.subject_id; });
      return { id: q.id, title: q.title, description: q.description, count: q.questions.length, time_limit: q.time_limit || 0, requirements: q.requirements || [], grade_id: q.grade_id || null, subject_id: q.subject_id || null, grade_name: g ? g.name : null, subject_name: s ? s.name : null };
    }));
  }
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  var myGrade = me ? me.grade_id : null;
  var visible = db.quizzes.filter(function(q) { return !q.grade_id || q.grade_id === myGrade; });
  res.json(visible.map(function(q) {
    var subs = db.submissions.filter(function(s) { return s.user_id === req.user.id && s.quiz_id === q.id; });
    var best = subs.length ? Math.max.apply(null, subs.map(function(s) { return s.score / s.total * 100; })) : null;
    var passed = best !== null && best >= 50;
    return { id: q.id, title: q.title, description: q.description, best: best, time_limit: q.time_limit || 0, requirements: q.requirements || [], passed: passed, attempted: subs.length > 0 };
  }));
});

app.get('/api/quizzes/:id', auth, function(req, res) {
  var q = db.quizzes.find(function(x) { return x.id === +req.params.id; });
  if (!q) return res.status(404).json({ error: 'غير موجود' });
  if (req.user.role === 'admin') return res.json(q);
  var subs = db.submissions.filter(function(s) { return s.user_id === req.user.id && s.quiz_id === q.id; });
  var passed = subs.some(function(s) { return s.score / s.total >= 0.5; });
  res.json({ id: q.id, title: q.title, description: q.description, time_limit: q.time_limit || 0, requirements: q.requirements || [], passed: passed, attempted: subs.length > 0, questions: q.questions.map(function(x) { return { id: x.id, question: x.question, options: x.options }; }) });
});

app.post('/api/quizzes', auth, hasPerm('quizzes_add'), function(req, res) {
  var b = req.body;
  if (!b.title || !Array.isArray(b.questions) || !b.questions.length) return res.status(400).json({ error: 'العنوان والأسئلة مطلوبة' });
  var q = { id: nextId('quizzes'), title: b.title, description: b.description || '', time_limit: b.time_limit ? +b.time_limit : 0, requirements: b.requirements || [], grade_id: b.grade_id ? +b.grade_id : null, subject_id: b.subject_id ? +b.subject_id : null, questions: b.questions.map(function(x, i) { return { id: i + 1, question: x.question, options: x.options, correct_index: x.correct_index }; }) };
  db.quizzes.push(q); saveDB();
  if (q.grade_id) { try { notifyStudents('quiz_new', 'اختبار جديد', 'تم إضافة اختبار: ' + q.title, 'quizzes', q.grade_id); } catch (e) {} }
  res.json({ id: q.id });
});

app.delete('/api/quizzes/:id', auth, hasPerm('quizzes_add'), function(req, res) {
  db.quizzes = db.quizzes.filter(function(q) { return q.id !== +req.params.id; });
  db.submissions = db.submissions.filter(function(s) { return s.quiz_id !== +req.params.id; });
  saveDB(); res.json({ ok: 1 });
});

app.post('/api/quizzes/:id/submit', auth, function(req, res) {
  var q = db.quizzes.find(function(x) { return x.id === +req.params.id; });
  if (!q) return res.status(404).json({ error: 'غير موجود' });
  var prev = db.submissions.filter(function(s) { return s.user_id === req.user.id && s.quiz_id === q.id; });
  if (prev.length > 0) return res.status(400).json({ error: 'لقد أديت هذا الاختبار مسبقًا ولا يمكن إعادته' });
  var answers = req.body.answers || [];
  var score = 0;
  q.questions.forEach(function(x, i) { if (answers[i] === x.correct_index) score++; });
  db.submissions.push({ id: nextId('submissions'), user_id: req.user.id, quiz_id: q.id, score: score, total: q.questions.length, answers: answers, submitted_at: new Date().toISOString() });
  saveDB();
  res.json({ score: score, total: q.questions.length, percentage: Math.round(score / q.questions.length * 100) });
});

app.get('/api/quizzes/:id/review', auth, function(req, res) {
  var q = db.quizzes.find(function(x) { return x.id === +req.params.id; });
  if (!q) return res.status(404).json({ error: 'غير موجود' });
  res.json({ id: q.id, title: q.title, questions: q.questions });
});

// ============ POINTS ============
app.get('/api/admin/points', auth, adminOnly, function(req, res) {
  var students = db.users.filter(function(u) { return u.role === 'student'; }).map(function(u) {
    var total = db.points.filter(function(p) { return p.user_id === u.id; }).reduce(function(a,b) { return a + b.value; }, 0);
    var ops = db.points.filter(function(p) { return p.user_id === u.id; }).length;
    return { id: u.id, name: u.name, email: u.email, total: total, operations: ops };
  }).sort(function(a,b) { return b.total - a.total; });
  res.json(students);
});

app.get('/api/admin/points/:id', auth, adminOnly, function(req, res) {
  var u = db.users.find(function(x) { return x.id === +req.params.id && x.role === 'student'; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  var ops = db.points.filter(function(p) { return p.user_id === u.id; }).sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  var total = ops.reduce(function(a,b) { return a + b.value; }, 0);
  res.json({ student: { id: u.id, name: u.name }, total: total, operations: ops });
});

app.post('/api/admin/points', auth, adminOnly, function(req, res) {
  var sid = +req.body.student_id;
  var val = +req.body.value;
  if (!sid || !val) return res.status(400).json({ error: 'الطالب والقيمة مطلوبة' });
  var op = { id: nextId('points'), user_id: sid, value: val, reason: req.body.reason || '', created_at: new Date().toISOString(), created_by: req.user.name };
  db.points.push(op); saveDB(); res.json({ ok: 1, op: op });
});

app.delete('/api/admin/points/:id', auth, adminOnly, function(req, res) {
  db.points = db.points.filter(function(p) { return p.id !== +req.params.id; });
  saveDB(); res.json({ ok: 1 });
});

app.get('/api/me/points', auth, function(req, res) {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'للطلاب فقط' });
  var ops = db.points.filter(function(p) { return p.user_id === req.user.id; }).sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  var total = ops.reduce(function(a,b) { return a + b.value; }, 0);
  res.json({ total: total, operations: ops });
});

// ============ MESSAGES ============
app.get('/api/admin/messages/:studentId', auth, adminOnly, function(req, res) {
  var sid = +req.params.studentId;
  var msgs = db.messages.filter(function(m) { return m.to_student_id === sid; }).sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  var u = db.users.find(function(x) { return x.id === sid; });
  res.json({ student: u ? { id: u.id, name: u.name, email: u.email } : null, messages: msgs });
});

app.post('/api/admin/messages', auth, adminOnly, upload.single('msg_file'), async function(req, res) {
  try {
    var toId = +req.body.student_id;
    if (!toId) return res.status(400).json({ error: 'اختر الطالب' });
    var u = db.users.find(function(x) { return x.id === toId && x.role === 'student'; });
    if (!u) return res.status(404).json({ error: 'الطالب غير موجود' });
    var type = req.body.type || 'text';
    var content = req.body.content || '';
    var file_path = null, file_name = '';
    if (req.file) {
      if (type === 'pdf' && req.file.mimetype !== 'application/pdf' && req.file.originalname.toLowerCase().slice(-4) !== '.pdf') {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'PDF فقط' });
      }
      if (type === 'video' && (req.file.mimetype || '').indexOf('video') !== 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'فيديو فقط' });
      }
      var b2Name = await uploadLocalToB2(req.file.path, req.file.originalname, req.file.mimetype);
      file_path = '/b2/' + b2Name;
      file_name = req.file.originalname;
    }
    var msg = { id: nextId('messages'), to_student_id: toId, from_admin: req.user.name || 'الإدارة', type: type, content: content, file_path: file_path, file_name: file_name, created_at: new Date().toISOString(), read: false };
    db.messages.push(msg); saveDB(); res.json(msg);
  } catch (err) {
    console.error('Message upload error:', err);
    res.status(500).json({ error: 'فشل الإرسال: ' + err.message });
  }
});

app.delete('/api/admin/messages/:id', auth, adminOnly, async function(req, res) {
  var m = db.messages.find(function(x) { return x.id === +req.params.id; });
  if (m && m.file_path && m.file_path.indexOf('/b2/') === 0) {
    try { await deleteFromB2ByName(m.file_path.replace('/b2/', '')); } catch (e) {}
  }
  db.messages = db.messages.filter(function(x) { return x.id !== +req.params.id; });
  saveDB(); res.json({ ok: 1 });
});

app.get('/api/me/messages', auth, function(req, res) {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'للطلاب فقط' });
  var list = db.messages.filter(function(m) { return m.to_student_id === req.user.id; }).sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  res.json({ messages: list, unread: list.filter(function(m) { return !m.read; }).length });
});

app.post('/api/me/messages/:id/read', auth, function(req, res) {
  var m = db.messages.find(function(x) { return x.id === +req.params.id && x.to_student_id === req.user.id; });
  if (m) { m.read = true; saveDB(); }
  res.json({ ok: 1 });
});

app.get('/api/me/messages/unread-count', auth, function(req, res) {
  if (req.user.role !== 'student') return res.json({ count: 0 });
  var c = db.messages.filter(function(m) { return m.to_student_id === req.user.id && !m.read; }).length;
  res.json({ count: c });
});

// ============ NOTIFICATIONS ============
app.get('/api/notifications', auth, function(req, res) {
  var list = db.notifications.filter(function(n) { return !n.user_id || n.user_id === req.user.id; }).sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  var mine = list.map(function(n) { return { id: n.id, type: n.type, title: n.title, message: n.message, link: n.link, created_at: n.created_at, read: (n.read_by || []).indexOf(req.user.id) !== -1 }; });
  res.json({ notifications: mine, unread: mine.filter(function(n) { return !n.read; }).length });
});

app.post('/api/notifications/:id/read', auth, function(req, res) {
  var n = db.notifications.find(function(x) { return x.id === +req.params.id; });
  if (n) { if (!n.read_by) n.read_by = []; if (n.read_by.indexOf(req.user.id) === -1) n.read_by.push(req.user.id); saveDB(); }
  res.json({ ok: 1 });
});

app.post('/api/notifications/read-all', auth, function(req, res) {
  db.notifications.forEach(function(n) { if (!n.read_by) n.read_by = []; if (n.read_by.indexOf(req.user.id) === -1) n.read_by.push(req.user.id); });
  saveDB(); res.json({ ok: 1 });
});

app.delete('/api/notifications/clear-all', auth, function(req, res) {
  db.notifications = db.notifications.filter(function(n) { return n.user_id && n.user_id !== req.user.id; });
  saveDB(); res.json({ ok: 1 });
});

// ============ ASSISTANTS ============
app.get('/api/assistants', auth, adminOnly, function(req, res) {
  res.json(db.users.filter(function(u) { return u.role === 'assistant'; }).map(function(u) { return { id: u.id, name: u.name, email: u.email, permissions: u.permissions || [] }; }));
});

app.post('/api/assistants', auth, adminOnly, function(req, res) {
  if (!req.body.name || !req.body.email || !req.body.password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  if (db.users.find(function(u) { return u.email === req.body.email; })) return res.status(400).json({ error: 'البريد مستخدم' });
  var u = { id: nextId('users'), name: req.body.name, email: req.body.email, password: bcrypt.hashSync(req.body.password, 10), role: 'assistant', permissions: req.body.permissions || [] };
  db.users.push(u); saveDB(); res.json({ id: u.id });
});

app.put('/api/assistants/:id', auth, adminOnly, function(req, res) {
  var u = db.users.find(function(x) { return x.id === +req.params.id && x.role === 'assistant'; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  if (req.body.name) u.name = req.body.name;
  if (req.body.email) u.email = req.body.email;
  if (Array.isArray(req.body.permissions)) u.permissions = req.body.permissions;
  if (req.body.password && req.body.password.length >= 6) { u.password = bcrypt.hashSync(req.body.password, 10); u.password_plain = req.body.password; }
  saveDB(); res.json({ ok: 1 });
});

app.delete('/api/assistants/:id', auth, adminOnly, function(req, res) {
  db.users = db.users.filter(function(u) { return !(u.id === +req.params.id && u.role === 'assistant'); });
  saveDB(); res.json({ ok: 1 });
});

// ============ PROGRAMS ============
app.get('/api/students/:id/program', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === +req.params.id; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  if (req.user.role !== 'admin' && req.user.id !== +req.params.id) return res.status(403).json({ error: 'غير مصرح' });
  res.json({ program: u.program || '' });
});

app.post('/api/students/:id/program', auth, adminOnly, function(req, res) {
  var u = db.users.find(function(x) { return x.id === +req.params.id; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  u.program = req.body.program || '';
  db.notifications.push({ id: nextId('notifications'), user_id: u.id, type: 'program_update', title: 'تحديث برنامجك', message: 'تم تحديث برنامجك الدراسي', link: 'myprogram', created_at: new Date().toISOString(), read_by: [] });
  saveDB(); res.json({ ok: 1 });
});

app.post('/api/admin/programs', auth, adminOnly, upload.single('program_file'), async function(req, res) {
  try {
    var target = req.body.target_type;
    var content = req.body.content || '';
    var file_path = null;
    if (req.file) {
      var b2Name = await uploadLocalToB2(req.file.path, req.file.originalname, req.file.mimetype);
      file_path = '/b2/' + b2Name;
    }
    if (target === 'student') {
      var sid = +req.body.student_id;
      if (!sid) return res.status(400).json({ error: 'اختر الطالب' });
      var u = db.users.find(function(x) { return x.id === sid && x.role === 'student'; });
      if (!u) return res.status(404).json({ error: 'غير موجود' });
      u.program = content;
      if (file_path) u.program_file = file_path;
      db.notifications.push({ id: nextId('notifications'), user_id: u.id, type: 'program_update', title: 'تحديث برنامجك', message: 'تم تحديث برنامجك الدراسي', link: 'myprogram', created_at: new Date().toISOString(), read_by: [] });
      saveDB();
      return res.json({ ok: 1 });
    }
    if (target === 'grade') {
      var gid = +req.body.grade_id;
      if (!gid) return res.status(400).json({ error: 'اختر الصف' });
      if (!db.grade_programs) db.grade_programs = [];
      var ex = db.grade_programs.find(function(g) { return g.grade_id === gid; });
      if (ex) {
        ex.content = content;
        if (file_path) ex.file_path = file_path;
        ex.updated_at = new Date().toISOString();
      } else {
        if (!db.seq.grade_programs) db.seq.grade_programs = 1;
        db.grade_programs.push({ id: nextId('grade_programs'), grade_id: gid, content: content, file_path: file_path, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      var sts = db.users.filter(function(u) { return u.role === 'student' && u.grade_id === gid; });
      sts.forEach(function(st) {
        db.notifications.push({ id: nextId('notifications'), user_id: st.id, type: 'program_update', title: 'تحديث برنامج صفك', message: 'تم تحديث البرنامج الدراسي لصفك', link: 'myprogram', created_at: new Date().toISOString(), read_by: [] });
      });
      saveDB();
      return res.json({ ok: 1 });
    }
    res.status(400).json({ error: 'اختر نوع الإرسال' });
  } catch (err) {
    console.error('Program upload error:', err);
    res.status(500).json({ error: 'فشل الرفع: ' + err.message });
  }
});

// ============ SETTINGS ============
app.get('/api/settings', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === req.user.id; });
  res.json({ name: u.name, email: u.email });
});

app.post('/api/settings', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === req.user.id; });
  if (req.body.name) u.name = req.body.name;
  if (req.body.email) u.email = req.body.email;
  saveDB(); res.json({ ok: 1 });
});

app.post('/api/change-password', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === req.user.id; });
  if (!bcrypt.compareSync(req.body.current, u.password)) return res.status(400).json({ error: 'كلمة المرور الحالية خاطئة' });
  if (!req.body.newpass || req.body.newpass.length < 6) return res.status(400).json({ error: 'كلمة المرور قصيرة' });
  u.password = bcrypt.hashSync(req.body.newpass, 10);
  saveDB(); res.json({ ok: 1 });
});

// ============ ADMIN STATS ============
app.get('/api/admin/stats', auth, function(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'assistant') return res.status(403).json({ error: 'ممنوع' });
  res.json({
    students: db.users.filter(function(u) { return u.role === 'student'; }).length,
    lessons: db.lessons.length,
    quizzes: db.quizzes.length,
    submissions: db.submissions.length,
    avg: db.submissions.length ? Math.round(db.submissions.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / db.submissions.length) : 0
  });
});

app.get('/api/admin/results', auth, function(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'assistant') return res.status(403).json({ error: 'ممنوع' });
  var rows = db.submissions.map(function(s) {
    var u = db.users.find(function(x) { return x.id === s.user_id; });
    var q = db.quizzes.find(function(x) { return x.id === s.quiz_id; });
    return { id: s.id, score: s.score, total: s.total, submitted_at: s.submitted_at, student_name: u ? u.name : '—', quiz_title: q ? q.title : '—' };
  });
  rows.sort(function(a,b) { return new Date(b.submitted_at) - new Date(a.submitted_at); });
  res.json(rows);
});

app.get('/api/admin/students/:id/full-report', auth, function(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'assistant') return res.status(403).json({ error: 'ممنوع' });
  var id = +req.params.id;
  var u = db.users.find(function(x) { return x.id === id && x.role === 'student'; });
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  var g = db.grades.find(function(x) { return x.id === u.grade_id; });
  var mySubs = db.submissions.filter(function(s) { return s.user_id === id; });
  var mySubjects = db.subjects.filter(function(sub) { return sub.grade_id === u.grade_id; });
  var mySubjectIds = mySubjects.map(function(x) { return x.id; });
  var visibleLessons = db.lessons.filter(function(l) { return l.subject_id && mySubjectIds.indexOf(l.subject_id) !== -1; });
  var lessonsDetail = visibleLessons.map(function(l) {
    var p = db.progress.find(function(x) { return x.user_id === id && x.lesson_id === l.id; });
    return { id: l.id, title: l.title, completed: p ? p.completed === 1 : false };
  });
  var completedLessons = lessonsDetail.filter(function(l) { return l.completed; }).length;
  var avgScore = mySubs.length ? Math.round(mySubs.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / mySubs.length) : 0;
  var visibleQuizzes = db.quizzes.filter(function(q) { return !q.grade_id || q.grade_id === u.grade_id; });
  var quizzesDetail = visibleQuizzes.map(function(q) {
    var subs = mySubs.filter(function(s) { return s.quiz_id === q.id; });
    var best = subs.length ? Math.max.apply(null, subs.map(function(s) { return s.score / s.total * 100; })) : null;
    return { id: q.id, title: q.title, attempts: subs.length, best: best !== null ? Math.round(best) : null, passed: best !== null && best >= 50 };
  });
  res.json({
    student: { id: u.id, name: u.name, email: u.email, phone: u.phone || '', grade_name: g ? g.name : '—', program: u.program || '' },
    stats: { completedLessons: completedLessons, totalLessons: visibleLessons.length, avgScore: avgScore, quizzesTaken: mySubs.length, passedQuizzes: quizzesDetail.filter(function(q) { return q.passed; }).length, totalQuizzes: visibleQuizzes.length, certificates: mySubs.filter(function(s) { return s.score === s.total; }).length },
    quizzesDetail: quizzesDetail,
    lessonsDetail: lessonsDetail
  });
});

app.get('/api/admin/submissions/:id/detail', auth, function(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'assistant') return res.status(403).json({ error: 'ممنوع' });
  var sub = db.submissions.find(function(x) { return x.id === +req.params.id; });
  if (!sub) return res.status(404).json({ error: 'غير موجود' });
  var q = db.quizzes.find(function(x) { return x.id === sub.quiz_id; });
  var u = db.users.find(function(x) { return x.id === sub.user_id; });
  var answers = sub.answers || [];
  var detail = q.questions.map(function(qq, i) {
    var myAns = answers[i];
    return { question: qq.question, options: qq.options, correct_index: qq.correct_index, student_index: myAns !== undefined ? myAns : null, is_correct: myAns === qq.correct_index };
  });
  res.json({ submission: { id: sub.id, score: sub.score, total: sub.total, submitted_at: sub.submitted_at }, student: { name: u.name, email: u.email }, quiz: { title: q.title }, questions: detail });
});

app.get('/api/admin/analytics', auth, function(req, res) {
  if (req.user.role !== 'admin' && req.user.role !== 'assistant') return res.status(403).json({ error: 'ممنوع' });
  var grades = db.grades.map(function(g) {
    var students = db.users.filter(function(u) { return u.role === 'student' && u.grade_id === g.id; });
    var completions = 0;
    students.forEach(function(st) { completions += db.progress.filter(function(p) { return p.user_id === st.id && p.completed === 1; }).length; });
    var subCount = 0, sumPct = 0;
    students.forEach(function(st) {
      var subs = db.submissions.filter(function(s) { return s.user_id === st.id; });
      subCount += subs.length;
      subs.forEach(function(s) { sumPct += (s.score / s.total * 100); });
    });
    return { name: g.name, students: students.length, completions: completions, avg: subCount ? Math.round(sumPct / subCount) : 0 };
  });
  var topStudents = db.users.filter(function(u) { return u.role === 'student'; }).map(function(u) {
    var subs = db.submissions.filter(function(s) { return s.user_id === u.id; });
    var avg = subs.length ? subs.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / subs.length : 0;
    var completed = db.progress.filter(function(p) { return p.user_id === u.id && p.completed === 1; }).length;
    return { id: u.id, name: u.name, avg: Math.round(avg), completed: completed, quizzes: subs.length };
  }).sort(function(a,b) { return b.avg - a.avg; }).slice(0, 5);
  res.json({ grades: grades, topStudents: topStudents, totals: { students: db.users.filter(function(u) { return u.role === 'student'; }).length, lessonsCompleted: db.progress.filter(function(p) { return p.completed === 1; }).length, totalLessons: db.lessons.length, quizSubmissions: db.submissions.length, avgScore: db.submissions.length ? Math.round(db.submissions.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / db.submissions.length) : 0 } });
});

// ============ ME CHARTS ============
app.get('/api/me/charts', auth, function(req, res) {
  if (req.user.role === 'admin' || req.user.role === 'assistant') return res.status(403).json({ error: 'للطلاب فقط' });
  var mySubs = db.submissions.filter(function(s) { return s.user_id === req.user.id; });
  mySubs.sort(function(a,b) { return new Date(a.submitted_at) - new Date(b.submitted_at); });
  var myScores = mySubs.slice(-10).map(function(s) {
    var q = db.quizzes.find(function(x) { return x.id === s.quiz_id; });
    return { quiz: q ? q.title : '—', score: Math.round(s.score / s.total * 100), date: s.submitted_at.slice(0, 10) };
  });
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  var myGrade = me ? me.grade_id : null;
  var mySubjects = db.subjects.filter(function(sub) { return sub.grade_id === myGrade; });
  var progressBySubject = mySubjects.map(function(sub) {
    var lessons = db.lessons.filter(function(l) { return l.subject_id === sub.id; });
    var done = lessons.filter(function(l) { return db.progress.find(function(p) { return p.user_id === req.user.id && p.lesson_id === l.id && p.completed === 1; }); }).length;
    return { subject: sub.name, completed: done, total: lessons.length };
  });
  var totalLessons = 0;
  var subjectIds = mySubjects.map(function(x) { return x.id; });
  db.lessons.forEach(function(l) { if (!l.subject_id || subjectIds.indexOf(l.subject_id) !== -1) totalLessons++; });
  var completedLessons = db.progress.filter(function(p) { return p.user_id === req.user.id && p.completed === 1; }).length;
  res.json({ myScores: myScores, progressBySubject: progressBySubject, overall: { lessonsDone: completedLessons, lessonsTotal: totalLessons, avgScore: mySubs.length ? Math.round(mySubs.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / mySubs.length) : 0, quizzesTaken: mySubs.length } });
});

// ============ CERTIFICATES ============
app.get('/api/certificates', auth, function(req, res) {
  var mySubs = db.submissions.filter(function(s) { return s.user_id === req.user.id && s.score === s.total; });
  res.json(mySubs.map(function(sub) {
    var q = db.quizzes.find(function(x) { return x.id === sub.quiz_id; });
    return { quiz_title: q ? q.title : '—', date: sub.submitted_at };
  }));
});

// ============ ME SUBJECTS ============
app.get('/api/me/subjects', auth, function(req, res) {
  if (req.user.role !== 'student') return res.json([]);
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  if (!me || !me.grade_id) return res.json([]);
  res.json(db.subjects.filter(function(sub) { return sub.grade_id === me.grade_id; }));
});

app.get('/api/me/progress', auth, function(req, res) {
  var me = db.users.find(function(u) { return u.id === req.user.id; });
  var myGrade = me ? me.grade_id : null;
  var mySubjects = db.subjects.filter(function(sub) { return sub.grade_id === myGrade; });
  var subjectIds = mySubjects.map(function(x) { return x.id; });
  var totalLessons = 0;
  db.lessons.forEach(function(l) { if (!l.subject_id || subjectIds.indexOf(l.subject_id) !== -1) totalLessons++; });
  var completedLessons = db.progress.filter(function(p) { return p.user_id === req.user.id && p.completed === 1; }).length;
  var mySubs = db.submissions.filter(function(s) { return s.user_id === req.user.id; });
  res.json({ totalLessons: totalLessons, completedLessons: completedLessons, quizzesTaken: mySubs.length, avgScore: mySubs.length ? Math.round(mySubs.reduce(function(a,b) { return a + (b.score / b.total * 100); }, 0) / mySubs.length) : 0 });
});

// ============ FAVORITES ============
app.get('/api/favorites', auth, function(req, res) {
  res.json(db.favorites.filter(function(f) { return f.user_id === req.user.id; }).map(function(f) { return f.lesson_id; }));
});

app.post('/api/favorites/:lessonId', auth, function(req, res) {
  var lid = +req.params.lessonId;
  var idx = db.favorites.findIndex(function(f) { return f.user_id === req.user.id && f.lesson_id === lid; });
  if (idx === -1) db.favorites.push({ user_id: req.user.id, lesson_id: lid });
  else db.favorites.splice(idx, 1);
  saveDB(); res.json({ ok: 1 });
});

// ============ ME PROGRAM ============
app.get('/api/me/program', auth, function(req, res) {
  var u = db.users.find(function(x) { return x.id === req.user.id; });
  if (!u) return res.json({ program: '', file_path: null });
  if (u.program && u.program.trim()) return res.json({ program: u.program, file_path: u.program_file || null });
  if (u.grade_id) {
    var gp = (db.grade_programs || []).find(function(g) { return g.grade_id === u.grade_id; });
    if (gp) return res.json({ program: gp.content, file_path: gp.file_path || null, from_grade: true });
  }
  res.json({ program: '', file_path: null });
});

// ============ ACTIVITIES ============
app.get('/api/admin/activities', auth, adminOnly, function(req, res) {
  var list = (db.activities || []).slice().sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  res.json(list.slice(0, 200));
});

app.delete('/api/admin/activities/clear', auth, adminOnly, function(req, res) {
  db.activities = [];
  saveDB();
  res.json({ ok: 1 });
});

// ============ B2 FILE SERVING ============
app.get('/b2/*', async function(req, res) {
  try {
    const fileName = req.params[0];
    await ensureB2Auth();
    const bucketName = process.env.B2_BUCKET_NAME;
    const auth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: fileName,
      validDurationInSeconds: 604800
    });
    const url = 'https://f005.backblazeb2.com/file/' + bucketName + '/' + encodeURIComponent(fileName) + '?Authorization=' + auth.data.authorizationToken;
    res.redirect(url);
  } catch (err) {
    console.error('B2 download error:', err);
    res.status(500).json({ error: 'فشل تحميل الملف' });
  }
});

// ============ DIRECT UPLOAD API ============
app.post('/api/b2/upload-url', auth, hasPerm('lessons_add'), async function(req, res) {
  try {
    await ensureB2Auth();
    const fileName = req.body.fileName || ('file-' + Date.now());
    const ext = path.extname(fileName);
    const b2Name = 'uploads/' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    const bucketId = process.env.B2_BUCKET_ID;
    const uploadUrlResp = await b2.getUploadUrl({ bucketId });
    res.json({
      uploadUrl: uploadUrlResp.data.uploadUrl,
      authToken: uploadUrlResp.data.authorizationToken,
      b2Name: b2Name,
      publicPath: '/b2/' + b2Name
    });
  } catch (err) {
    console.error('B2 upload-url error:', err);
    res.status(500).json({ error: 'فشل تجهيز الرفع: ' + err.message });
  }
});

// ============ SPA FALLBACK ============
app.get('*', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// ============ START SERVER ============
(async function() {
  var b2db = await downloadDBFromB2();
  if (b2db && b2db.seq) {
    db = b2db;
    ['users','lessons','progress','quizzes','submissions','notifications','grades','subjects','favorites','files','ratings','points','messages','activities','grade_programs'].forEach(function(k) { if (!db[k]) db[k] = []; });
    if (!db.seq) db.seq = {};
    ['users','lessons','progress','quizzes','submissions','notifications','grades','subjects','files','points','messages','activities','grade_programs'].forEach(function(k) { if (!db.seq[k]) db.seq[k] = 1; });
    console.log('✅ DB loaded from B2 (' + (db.users ? db.users.length : 0) + ' users)');
  } else {
    loadDB();
    console.log('⚠️ B2 DB not found — using local DB');
  }
  if (!db.users.find(function(u) { return u.role === 'admin'; })) {
    db.users.push({ id: nextId('users'), name: 'المدير', email: 'admin@edu.com', password: bcrypt.hashSync('admin123', 10), role: 'admin' });
    saveDB();
    console.log('Admin created: admin@edu.com / admin123');
  }
  app.listen(PORT, function() { console.log('Server ready: http://localhost:' + PORT); });
})();
