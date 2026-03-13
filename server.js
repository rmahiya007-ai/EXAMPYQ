// ═══════════════════════════════════════════════
//  ExamPYQ — Backend Server (Node.js + Express)
//  SQLite database, JWT auth, file upload support
// ═══════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'exampyq_secret_change_in_production';

// ── MIDDLEWARE ──
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// ── DATABASE SETUP ──
const db = new Database('./exampyq.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📋',
    color TEXT DEFAULT '#1a56ff',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📋',
    description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    seo_content TEXT,
    conducting_body TEXT,
    frequency TEXT,
    stages TEXT,
    language TEXT DEFAULT 'Hindi & English',
    negative_marking TEXT,
    total_papers INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    featured INTEGER DEFAULT 0,
    badge TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS exam_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    questions INTEGER,
    marks INTEGER,
    duration TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    paper_type TEXT,
    shift TEXT,
    file_path TEXT,
    file_size TEXT,
    questions INTEGER,
    is_free INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    downloads INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── SEED DEFAULT ADMIN (admin / admin123) ──
const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'superadmin');
  console.log('✅ Default admin created: admin / admin123');
}

// ── SEED DEFAULT SETTINGS ──
const defaultSettings = {
  site_name: 'ExamPYQ',
  site_tagline: "India's #1 Free PYQ Platform",
  total_papers: '10000',
  total_downloads: '5000000',
  total_exams: '200',
  primary_color: '#1a56ff',
  accent_color: '#ff6b2b',
  footer_text: '© 2025 ExamPYQ. All rights reserved.',
  meta_description: 'Download free Previous Year Question Papers for Banking, SSC, Railway, UPSC and more.',
  google_analytics: '',
  allow_free_download: '1',
  watermark_text: 'ExamPYQ.com'
};
for (const [k, v] of Object.entries(defaultSettings)) {
  db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)').run(k, v);
}

// ── SEED SAMPLE DATA ──
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (catCount === 0) {
  const cats = [
    ['Banking & Insurance','banking','🏦','#1a56ff',1],
    ['SSC / Railway','ssc','🚆','#ff6b2b',2],
    ['UPSC / State','upsc','🏛️','#7c3aed',3],
    ['Agriculture','agriculture','🌾','#0fa958',4],
    ['Defence','defence','⚔️','#dc2626',5],
    ['Teaching','teaching','📖','#f59e0b',6],
  ];
  const catStmt = db.prepare('INSERT INTO categories (name,slug,icon,color,sort_order) VALUES (?,?,?,?,?)');
  cats.forEach(c => catStmt.run(...c));

  const bankingId = db.prepare("SELECT id FROM categories WHERE slug='banking'").get().id;
  const sscId = db.prepare("SELECT id FROM categories WHERE slug='ssc'").get().id;
  const upscId = db.prepare("SELECT id FROM categories WHERE slug='upsc'").get().id;

  const exams = [
    [bankingId,'SBI PO','sbi-po','🏦','SBI Probationary Officer','SBI PO Previous Year Papers','SBI PO PYQ Download Free','SBI PO, SBI PO PYQ, SBI PO previous year papers','<p>SBI PO ek prestigious banking exam hai...</p>','State Bank of India','Annual','Pre + Mains + GD/PI','Hindi & English','0.25',28,120000,1,1,'NEW'],
    [bankingId,'SBI Clerk','sbi-clerk','🏦','SBI Junior Associate','SBI Clerk PYQ Download','SBI Clerk previous year papers free','SBI Clerk, SBI Clerk PYQ','<p>SBI Clerk exam...</p>','State Bank of India','Annual','Pre + Mains','Hindi & English','0.25',22,85000,1,0,null],
    [bankingId,'IBPS PO','ibps-po','🏛️','IBPS PO Exam Papers','IBPS PO PYQ Free Download','IBPS PO previous year papers','IBPS PO, IBPS PO PYQ','<p>IBPS PO exam...</p>','IBPS','Annual','Pre + Mains + Interview','Hindi & English','0.25',35,95000,1,1,'HOT'],
    [bankingId,'IBPS Clerk','ibps-clerk','🏛️','IBPS Clerk Papers','IBPS Clerk PYQ','IBPS Clerk papers','IBPS Clerk','<p>IBPS Clerk exam...</p>','IBPS','Annual','Pre + Mains','Hindi & English','0.25',30,70000,1,0,null],
    [bankingId,'RBI Grade B','rbi-grade-b','⚖️','RBI Grade B Papers','RBI Grade B PYQ','RBI Grade B papers','RBI Grade B','<p>RBI Grade B...</p>','RBI','Annual','Phase I + II + Interview','Hindi & English','0.25',12,45000,1,1,null],
    [sscId,'SSC CGL','ssc-cgl','📋','SSC CGL Papers','SSC CGL PYQ Download','SSC CGL previous year','SSC CGL, SSC CGL PYQ','<p>SSC CGL...</p>','SSC','Annual','Tier I + II + III','Hindi & English','0.5',40,200000,1,1,'HOT'],
    [sscId,'RRB NTPC','rrb-ntpc','🚆','RRB NTPC Papers','RRB NTPC PYQ','RRB NTPC papers','RRB NTPC','<p>RRB NTPC...</p>','RRB','As per notification','CBT 1 + CBT 2','Hindi & English','0.33',45,180000,1,1,'NEW'],
    [upscId,'UPSC CSE','upsc-cse','🏛️','UPSC CSE Papers','UPSC CSE PYQ','UPSC IAS previous year','UPSC CSE, IAS PYQ','<p>UPSC CSE...</p>','UPSC','Annual','Pre + Mains + Interview','English & Hindi',null,50,300000,1,1,'ELITE'],
  ];
  const examStmt = db.prepare(`INSERT INTO exams 
    (category_id,name,slug,icon,description,seo_title,seo_description,seo_keywords,seo_content,
     conducting_body,frequency,stages,language,negative_marking,total_papers,total_downloads,active,featured,badge) 
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  exams.forEach(e => examStmt.run(...e));

  // Sample papers for SBI PO
  const sbiId = db.prepare("SELECT id FROM exams WHERE slug='sbi-po'").get().id;
  const papers = [
    [sbiId,'SBI PO Prelims 2024 — Memory Based Paper',2024,'Prelims','Shift 1',null,'2.4 MB',100,1,1,0],
    [sbiId,'SBI PO Mains 2024 — Complete Paper with Solutions',2024,'Mains','—',null,'3.8 MB',155,1,1,0],
    [sbiId,'SBI PO Prelims 2023 — Shift 1 Paper',2023,'Prelims','Shift 1',null,'2.1 MB',100,1,1,0],
    [sbiId,'SBI PO Prelims 2023 — Shift 2 Paper',2023,'Prelims','Shift 2',null,'2.2 MB',100,1,1,0],
    [sbiId,'SBI PO Mains 2023 — Full Paper with Answer Key',2023,'Mains','—',null,'4.1 MB',155,0,1,0],
    [sbiId,'SBI PO Prelims 2022 — All Shifts Combined',2022,'Prelims','All',null,'3.2 MB',300,1,1,0],
    [sbiId,'SBI PO Mains 2022 — Paper + Solutions',2022,'Mains','—',null,'3.9 MB',155,0,1,0],
  ];
  const paperStmt = db.prepare('INSERT INTO papers (exam_id,title,year,paper_type,shift,file_path,file_size,questions,is_free,is_active,downloads) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  papers.forEach(p => paperStmt.run(...p));
}

// ════════════════════════════════
//  AUTH MIDDLEWARE
// ════════════════════════════════
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ════════════════════════════════
//  FILE UPLOAD CONFIG
// ════════════════════════════════
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ════════════════════════════════
//  PUBLIC API
// ════════════════════════════════

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY sort_order').all();
  res.json(cats);
});

// GET /api/exams?category=banking&featured=1
app.get('/api/exams', (req, res) => {
  let query = `SELECT e.*, c.name as category_name, c.slug as category_slug 
               FROM exams e JOIN categories c ON e.category_id=c.id WHERE e.active=1`;
  const params = [];
  if (req.query.category) { query += ' AND c.slug=?'; params.push(req.query.category); }
  if (req.query.featured) { query += ' AND e.featured=1'; }
  if (req.query.search) { query += ' AND e.name LIKE ?'; params.push(`%${req.query.search}%`); }
  query += ' ORDER BY e.sort_order, e.name';
  res.json(db.prepare(query).all(...params));
});

// GET /api/exams/:slug
app.get('/api/exams/:slug', (req, res) => {
  const exam = db.prepare(`SELECT e.*, c.name as category_name, c.slug as category_slug 
    FROM exams e JOIN categories c ON e.category_id=c.id WHERE e.slug=? AND e.active=1`).get(req.params.slug);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  exam.subjects = db.prepare('SELECT * FROM exam_subjects WHERE exam_id=? ORDER BY sort_order').all(exam.id);
  res.json(exam);
});

// GET /api/papers/:examSlug
app.get('/api/papers/:examSlug', (req, res) => {
  const exam = db.prepare('SELECT id FROM exams WHERE slug=?').get(req.params.examSlug);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  let query = 'SELECT * FROM papers WHERE exam_id=? AND is_active=1';
  const params = [exam.id];
  if (req.query.year) { query += ' AND year=?'; params.push(req.query.year); }
  if (req.query.type) { query += ' AND paper_type=?'; params.push(req.query.type); }
  query += ' ORDER BY year DESC, sort_order';
  res.json(db.prepare(query).all(...params));
});

// POST /api/papers/:id/download — increment counter
app.post('/api/papers/:id/download', (req, res) => {
  db.prepare('UPDATE papers SET downloads=downloads+1 WHERE id=?').run(req.params.id);
  const paper = db.prepare('SELECT * FROM papers WHERE id=?').get(req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });
  if (!paper.is_free) return res.status(403).json({ error: 'Premium paper', premium: true });
  res.json({ success: true, file_path: paper.file_path, title: paper.title });
});

// GET /api/settings/public
app.get('/api/settings/public', (req, res) => {
  const rows = db.prepare('SELECT * FROM site_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

// GET /api/stats (public homepage stats)
app.get('/api/stats', (req, res) => {
  const settings = {};
  db.prepare('SELECT * FROM site_settings').all().forEach(r => settings[r.key] = r.value);
  res.json({
    total_papers: settings.total_papers || db.prepare('SELECT COUNT(*) as c FROM papers').get().c,
    total_downloads: settings.total_downloads || '0',
    total_exams: settings.total_exams || db.prepare('SELECT COUNT(*) as c FROM exams').get().c,
    total_categories: db.prepare('SELECT COUNT(*) as c FROM categories WHERE active=1').get().c,
  });
});

// ════════════════════════════════
//  ADMIN AUTH
// ════════════════════════════════

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
});

// POST /api/admin/change-password
app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
  if (!bcrypt.compareSync(current_password, admin.password))
    return res.status(400).json({ error: 'Current password wrong' });
  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password=? WHERE id=?').run(hashed, req.admin.id);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — CATEGORIES CRUD
// ════════════════════════════════

app.get('/api/admin/categories', authMiddleware, (req, res) => {
  const cats = db.prepare(`SELECT c.*, COUNT(e.id) as exam_count 
    FROM categories c LEFT JOIN exams e ON e.category_id=c.id 
    GROUP BY c.id ORDER BY c.sort_order`).all();
  res.json(cats);
});

app.post('/api/admin/categories', authMiddleware, (req, res) => {
  const { name, slug, icon, color, sort_order } = req.body;
  const slug_final = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  try {
    const result = db.prepare('INSERT INTO categories (name,slug,icon,color,sort_order) VALUES (?,?,?,?,?)').run(name, slug_final, icon||'📋', color||'#1a56ff', sort_order||0);
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/categories/:id', authMiddleware, (req, res) => {
  const { name, slug, icon, color, sort_order, active } = req.body;
  db.prepare('UPDATE categories SET name=?,slug=?,icon=?,color=?,sort_order=?,active=? WHERE id=?')
    .run(name, slug, icon, color, sort_order, active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/categories/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — EXAMS CRUD
// ════════════════════════════════

app.get('/api/admin/exams', authMiddleware, (req, res) => {
  let q = `SELECT e.*, c.name as category_name FROM exams e JOIN categories c ON e.category_id=c.id`;
  const params = [];
  if (req.query.category) { q += ' WHERE c.slug=?'; params.push(req.query.category); }
  q += ' ORDER BY e.category_id, e.sort_order, e.name';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/admin/exams', authMiddleware, (req, res) => {
  const f = req.body;
  const slug = f.slug || f.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  try {
    const r = db.prepare(`INSERT INTO exams 
      (category_id,name,slug,icon,description,seo_title,seo_description,seo_keywords,seo_content,
       conducting_body,frequency,stages,language,negative_marking,active,featured,badge,sort_order) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      f.category_id, f.name, slug, f.icon||'📋', f.description, f.seo_title, f.seo_description,
      f.seo_keywords, f.seo_content, f.conducting_body, f.frequency, f.stages,
      f.language||'Hindi & English', f.negative_marking, f.active??1, f.featured??0, f.badge||null, f.sort_order||0);
    // Insert subjects
    if (f.subjects?.length) {
      const ss = db.prepare('INSERT INTO exam_subjects (exam_id,subject_name,questions,marks,duration,sort_order) VALUES (?,?,?,?,?,?)');
      f.subjects.forEach((s,i) => ss.run(r.lastInsertRowid, s.subject_name, s.questions, s.marks, s.duration, i));
    }
    res.json({ id: r.lastInsertRowid, success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/exams/:id', authMiddleware, (req, res) => {
  const f = req.body;
  db.prepare(`UPDATE exams SET category_id=?,name=?,slug=?,icon=?,description=?,
    seo_title=?,seo_description=?,seo_keywords=?,seo_content=?,conducting_body=?,
    frequency=?,stages=?,language=?,negative_marking=?,active=?,featured=?,badge=?,sort_order=? WHERE id=?`).run(
    f.category_id, f.name, f.slug, f.icon, f.description, f.seo_title, f.seo_description,
    f.seo_keywords, f.seo_content, f.conducting_body, f.frequency, f.stages,
    f.language, f.negative_marking, f.active, f.featured, f.badge, f.sort_order, req.params.id);
  if (f.subjects) {
    db.prepare('DELETE FROM exam_subjects WHERE exam_id=?').run(req.params.id);
    const ss = db.prepare('INSERT INTO exam_subjects (exam_id,subject_name,questions,marks,duration,sort_order) VALUES (?,?,?,?,?,?)');
    f.subjects.forEach((s,i) => ss.run(req.params.id, s.subject_name, s.questions, s.marks, s.duration, i));
  }
  res.json({ success: true });
});

app.delete('/api/admin/exams/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM exams WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — PAPERS CRUD + UPLOAD
// ════════════════════════════════

app.get('/api/admin/papers', authMiddleware, (req, res) => {
  let q = `SELECT p.*, e.name as exam_name, e.slug as exam_slug 
           FROM papers p JOIN exams e ON p.exam_id=e.id`;
  const params = [];
  if (req.query.exam_id) { q += ' WHERE p.exam_id=?'; params.push(req.query.exam_id); }
  q += ' ORDER BY p.year DESC, p.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

app.post('/api/admin/papers', authMiddleware, upload.single('pdf'), (req, res) => {
  const f = req.body;
  const file_path = req.file ? `/uploads/${req.file.filename}` : f.file_path || null;
  const file_size = req.file ? `${(req.file.size / 1024 / 1024).toFixed(1)} MB` : f.file_size || null;
  try {
    const r = db.prepare(`INSERT INTO papers 
      (exam_id,title,year,paper_type,shift,file_path,file_size,questions,is_free,is_active,sort_order) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      f.exam_id, f.title, f.year, f.paper_type, f.shift||null, file_path, file_size,
      f.questions||null, f.is_free??1, f.is_active??1, f.sort_order||0);
    // Update exam paper count
    db.prepare('UPDATE exams SET total_papers=(SELECT COUNT(*) FROM papers WHERE exam_id=?) WHERE id=?').run(f.exam_id, f.exam_id);
    res.json({ id: r.lastInsertRowid, success: true, file_path });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/papers/:id', authMiddleware, upload.single('pdf'), (req, res) => {
  const f = req.body;
  const paper = db.prepare('SELECT * FROM papers WHERE id=?').get(req.params.id);
  const file_path = req.file ? `/uploads/${req.file.filename}` : f.file_path || paper.file_path;
  const file_size = req.file ? `${(req.file.size / 1024 / 1024).toFixed(1)} MB` : f.file_size || paper.file_size;
  db.prepare(`UPDATE papers SET exam_id=?,title=?,year=?,paper_type=?,shift=?,
    file_path=?,file_size=?,questions=?,is_free=?,is_active=?,sort_order=? WHERE id=?`).run(
    f.exam_id, f.title, f.year, f.paper_type, f.shift, file_path, file_size,
    f.questions, f.is_free, f.is_active, f.sort_order, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/papers/:id', authMiddleware, (req, res) => {
  const paper = db.prepare('SELECT * FROM papers WHERE id=?').get(req.params.id);
  if (paper?.file_path) {
    const fp = path.join(__dirname, paper.file_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prepare('DELETE FROM papers WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — SITE SETTINGS
// ════════════════════════════════

app.get('/api/admin/settings', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM site_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(req.body)) stmt.run(k, v);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — DASHBOARD STATS
// ════════════════════════════════

app.get('/api/admin/dashboard', authMiddleware, (req, res) => {
  res.json({
    total_categories: db.prepare('SELECT COUNT(*) as c FROM categories').get().c,
    total_exams: db.prepare('SELECT COUNT(*) as c FROM exams').get().c,
    total_papers: db.prepare('SELECT COUNT(*) as c FROM papers').get().c,
    total_downloads: db.prepare('SELECT SUM(downloads) as c FROM papers').get().c || 0,
    free_papers: db.prepare('SELECT COUNT(*) as c FROM papers WHERE is_free=1').get().c,
    premium_papers: db.prepare('SELECT COUNT(*) as c FROM papers WHERE is_free=0').get().c,
    active_exams: db.prepare('SELECT COUNT(*) as c FROM exams WHERE active=1').get().c,
    featured_exams: db.prepare('SELECT COUNT(*) as c FROM exams WHERE featured=1').get().c,
    recent_papers: db.prepare(`SELECT p.*, e.name as exam_name FROM papers p 
      JOIN exams e ON p.exam_id=e.id ORDER BY p.created_at DESC LIMIT 5`).all(),
    top_downloads: db.prepare(`SELECT p.*, e.name as exam_name FROM papers p 
      JOIN exams e ON p.exam_id=e.id ORDER BY p.downloads DESC LIMIT 5`).all(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ExamPYQ Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:5500/admin.html`);
  console.log(`🔑 Login: admin / admin123\n`);
});
