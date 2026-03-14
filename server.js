// ═══════════════════════════════════════════════
//  ExamPYQ — Backend Server (Node.js + Express)
//  PostgreSQL database, JWT auth, file upload
// ═══════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'exampyq_secret_change_in_production';

// ── MIDDLEWARE ──
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// ── POSTGRESQL CONNECTION ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

// ── DATABASE SETUP ──
async function setupDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '📋',
      color TEXT DEFAULT '#1a56ff',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS exam_subjects (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL,
      subject_name TEXT NOT NULL,
      questions INTEGER,
      marks INTEGER,
      duration TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS papers (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed admin
  const adminRes = await query('SELECT id FROM admins WHERE username = $1', ['admin']);
  if (adminRes.rows.length === 0) {
    const hashed = bcrypt.hashSync('admin123', 10);
    await query('INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)', ['admin', hashed, 'superadmin']);
    console.log('✅ Default admin created: admin / admin123');
  }

  // Seed settings
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
    await query('INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  // Seed categories
  const catRes = await query('SELECT COUNT(*) as c FROM categories');
  if (parseInt(catRes.rows[0].c) === 0) {
    const cats = [
      ['Banking & Insurance','banking','🏦','#1a56ff',1],
      ['SSC / Railway','ssc','🚆','#ff6b2b',2],
      ['UPSC / State','upsc','🏛️','#7c3aed',3],
      ['Agriculture','agriculture','🌾','#0fa958',4],
      ['Defence','defence','⚔️','#dc2626',5],
      ['Teaching','teaching','📖','#f59e0b',6],
    ];
    for (const c of cats) {
      await query('INSERT INTO categories (name,slug,icon,color,sort_order) VALUES ($1,$2,$3,$4,$5)', c);
    }

    const bankingRes = await query("SELECT id FROM categories WHERE slug='banking'");
    const sscRes = await query("SELECT id FROM categories WHERE slug='ssc'");
    const upscRes = await query("SELECT id FROM categories WHERE slug='upsc'");
    const bankingId = bankingRes.rows[0].id;
    const sscId = sscRes.rows[0].id;
    const upscId = upscRes.rows[0].id;

    const exams = [
      [bankingId,'SBI PO','sbi-po','🏦','SBI Probationary Officer','SBI PO Previous Year Papers','SBI PO PYQ Download Free','SBI PO, SBI PO PYQ','<p>SBI PO ek prestigious banking exam hai. Previous year papers se preparation boost karein.</p>','State Bank of India','Annual','Pre + Mains + GD/PI','Hindi & English','0.25',1,1,'NEW'],
      [bankingId,'SBI Clerk','sbi-clerk','🏦','SBI Junior Associate','SBI Clerk PYQ','SBI Clerk papers','SBI Clerk','<p>SBI Clerk exam ke papers.</p>','State Bank of India','Annual','Pre + Mains','Hindi & English','0.25',1,0,null],
      [bankingId,'IBPS PO','ibps-po','🏛️','IBPS PO Exam','IBPS PO PYQ Free','IBPS PO papers','IBPS PO','<p>IBPS PO papers.</p>','IBPS','Annual','Pre + Mains + Interview','Hindi & English','0.25',1,1,'HOT'],
      [bankingId,'IBPS Clerk','ibps-clerk','🏛️','IBPS Clerk','IBPS Clerk PYQ','IBPS Clerk papers','IBPS Clerk','<p>IBPS Clerk papers.</p>','IBPS','Annual','Pre + Mains','Hindi & English','0.25',1,0,null],
      [bankingId,'RBI Grade B','rbi-grade-b','⚖️','RBI Grade B','RBI Grade B PYQ','RBI Grade B papers','RBI Grade B','<p>RBI Grade B papers.</p>','RBI','Annual','Phase I + II + Interview','Hindi & English','0.25',1,1,null],
      [sscId,'SSC CGL','ssc-cgl','📋','SSC CGL Papers','SSC CGL PYQ','SSC CGL papers','SSC CGL','<p>SSC CGL papers.</p>','SSC','Annual','Tier I + II + III','Hindi & English','0.5',1,1,'HOT'],
      [sscId,'RRB NTPC','rrb-ntpc','🚆','RRB NTPC Papers','RRB NTPC PYQ','RRB NTPC papers','RRB NTPC','<p>RRB NTPC papers.</p>','RRB','As per notification','CBT 1 + CBT 2','Hindi & English','0.33',1,1,'NEW'],
      [upscId,'UPSC CSE','upsc-cse','🏛️','UPSC CSE Papers','UPSC CSE PYQ','UPSC IAS papers','UPSC CSE','<p>UPSC CSE papers.</p>','UPSC','Annual','Pre + Mains + Interview','English & Hindi',null,1,1,'ELITE'],
    ];

    for (const e of exams) {
      await query(`INSERT INTO exams 
        (category_id,name,slug,icon,description,seo_title,seo_description,seo_keywords,seo_content,
         conducting_body,frequency,stages,language,negative_marking,active,featured,badge) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, e);
    }

    // Sample papers for SBI PO
    const sbiRes = await query("SELECT id FROM exams WHERE slug='sbi-po'");
    const sbiId = sbiRes.rows[0].id;
    const papers = [
      [sbiId,'SBI PO Prelims 2024 — Memory Based Paper',2024,'Prelims','Shift 1','2.4 MB',100,1],
      [sbiId,'SBI PO Mains 2024 — Complete Paper with Solutions',2024,'Mains','—','3.8 MB',155,1],
      [sbiId,'SBI PO Prelims 2023 — Shift 1 Paper',2023,'Prelims','Shift 1','2.1 MB',100,1],
      [sbiId,'SBI PO Prelims 2023 — Shift 2 Paper',2023,'Prelims','Shift 2','2.2 MB',100,1],
      [sbiId,'SBI PO Mains 2023 — Full Paper with Answer Key',2023,'Mains','—','4.1 MB',155,0],
    ];
    for (const p of papers) {
      await query('INSERT INTO papers (exam_id,title,year,paper_type,shift,file_size,questions,is_free) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', p);
    }
    console.log('✅ Sample data seeded!');
  }

  console.log('✅ Database ready!');
}

// ── FILE UPLOAD ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── AUTH MIDDLEWARE ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ════════════════════════════════
//  PUBLIC API
// ════════════════════════════════

app.get('/api/categories', async (req, res) => {
  const r = await query('SELECT * FROM categories WHERE active=1 ORDER BY sort_order');
  res.json(r.rows);
});

app.get('/api/exams', async (req, res) => {
  let q = `SELECT e.*, c.name as category_name, c.slug as category_slug 
           FROM exams e JOIN categories c ON e.category_id=c.id WHERE e.active=1`;
  const params = [];
  if (req.query.category) { q += ' AND c.slug=$1'; params.push(req.query.category); }
  if (req.query.featured) { q += ` AND e.featured=1`; }
  if (req.query.search) { q += ` AND e.name ILIKE $${params.length+1}`; params.push(`%${req.query.search}%`); }
  q += ' ORDER BY e.sort_order, e.name';
  const r = await query(q, params);
  res.json(r.rows);
});

app.get('/api/exams/:slug', async (req, res) => {
  const r = await query(`SELECT e.*, c.name as category_name, c.slug as category_slug 
    FROM exams e JOIN categories c ON e.category_id=c.id WHERE e.slug=$1 AND e.active=1`, [req.params.slug]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  const exam = r.rows[0];
  const subj = await query('SELECT * FROM exam_subjects WHERE exam_id=$1 ORDER BY sort_order', [exam.id]);
  exam.subjects = subj.rows;
  res.json(exam);
});

app.get('/api/papers/:examSlug', async (req, res) => {
  const examRes = await query('SELECT id FROM exams WHERE slug=$1', [req.params.examSlug]);
  if (!examRes.rows.length) return res.status(404).json({ error: 'Not found' });
  let q = 'SELECT * FROM papers WHERE exam_id=$1 AND is_active=1';
  const params = [examRes.rows[0].id];
  if (req.query.year) { q += ' AND year=$2'; params.push(req.query.year); }
  q += ' ORDER BY year DESC, sort_order';
  const r = await query(q, params);
  res.json(r.rows);
});

app.post('/api/papers/:id/download', async (req, res) => {
  await query('UPDATE papers SET downloads=downloads+1 WHERE id=$1', [req.params.id]);
  const r = await query('SELECT * FROM papers WHERE id=$1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
  const paper = r.rows[0];
  if (!paper.is_free) return res.status(403).json({ error: 'Premium', premium: true });
  res.json({ success: true, file_path: paper.file_path, title: paper.title });
});

app.get('/api/stats', async (req, res) => {
  const r = await query('SELECT * FROM site_settings');
  const s = {};
  r.rows.forEach(row => s[row.key] = row.value);
  const catCount = await query('SELECT COUNT(*) as c FROM categories WHERE active=1');
  res.json({
    total_papers: s.total_papers || '0',
    total_downloads: s.total_downloads || '0',
    total_exams: s.total_exams || '0',
    total_categories: catCount.rows[0].c,
  });
});

app.get('/api/settings/public', async (req, res) => {
  const r = await query('SELECT * FROM site_settings');
  const s = {};
  r.rows.forEach(row => s[row.key] = row.value);
  res.json(s);
});

// ════════════════════════════════
//  ADMIN AUTH
// ════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const r = await query('SELECT * FROM admins WHERE username=$1', [username]);
  if (!r.rows.length || !bcrypt.compareSync(password, r.rows[0].password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const admin = r.rows[0];
  const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
});

app.post('/api/admin/change-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  const r = await query('SELECT * FROM admins WHERE id=$1', [req.admin.id]);
  if (!bcrypt.compareSync(current_password, r.rows[0].password))
    return res.status(400).json({ error: 'Current password wrong' });
  const hashed = bcrypt.hashSync(new_password, 10);
  await query('UPDATE admins SET password=$1 WHERE id=$2', [hashed, req.admin.id]);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — CATEGORIES
// ════════════════════════════════

app.get('/api/admin/categories', authMiddleware, async (req, res) => {
  const r = await query(`SELECT c.*, COUNT(e.id) as exam_count 
    FROM categories c LEFT JOIN exams e ON e.category_id=c.id 
    GROUP BY c.id ORDER BY c.sort_order`);
  res.json(r.rows);
});

app.post('/api/admin/categories', authMiddleware, async (req, res) => {
  const { name, slug, icon, color, sort_order } = req.body;
  const s = slug || name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  try {
    const r = await query('INSERT INTO categories (name,slug,icon,color,sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, s, icon||'📋', color||'#1a56ff', sort_order||0]);
    res.json({ id: r.rows[0].id, success: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/categories/:id', authMiddleware, async (req, res) => {
  const { name, slug, icon, color, sort_order, active } = req.body;
  await query('UPDATE categories SET name=$1,slug=$2,icon=$3,color=$4,sort_order=$5,active=$6 WHERE id=$7',
    [name, slug, icon, color, sort_order, active, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/categories/:id', authMiddleware, async (req, res) => {
  await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — EXAMS
// ════════════════════════════════

app.get('/api/admin/exams', authMiddleware, async (req, res) => {
  let q = `SELECT e.*, c.name as category_name FROM exams e JOIN categories c ON e.category_id=c.id`;
  const params = [];
  if (req.query.category) { q += ' WHERE c.slug=$1'; params.push(req.query.category); }
  q += ' ORDER BY e.category_id, e.sort_order, e.name';
  const r = await query(q, params);
  res.json(r.rows);
});

app.post('/api/admin/exams', authMiddleware, async (req, res) => {
  const f = req.body;
  const slug = f.slug || f.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  try {
    const r = await query(`INSERT INTO exams 
      (category_id,name,slug,icon,description,seo_title,seo_description,seo_keywords,seo_content,
       conducting_body,frequency,stages,language,negative_marking,active,featured,badge,sort_order) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [f.category_id,f.name,slug,f.icon||'📋',f.description,f.seo_title,f.seo_description,
       f.seo_keywords,f.seo_content,f.conducting_body,f.frequency,f.stages,
       f.language||'Hindi & English',f.negative_marking,f.active??1,f.featured??0,f.badge||null,f.sort_order||0]);
    const examId = r.rows[0].id;
    if (f.subjects?.length) {
      for (let i=0; i<f.subjects.length; i++) {
        const s = f.subjects[i];
        await query('INSERT INTO exam_subjects (exam_id,subject_name,questions,marks,duration,sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
          [examId, s.subject_name, s.questions, s.marks, s.duration, i]);
      }
    }
    res.json({ id: examId, success: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/exams/:id', authMiddleware, async (req, res) => {
  const f = req.body;
  await query(`UPDATE exams SET category_id=$1,name=$2,slug=$3,icon=$4,description=$5,
    seo_title=$6,seo_description=$7,seo_keywords=$8,seo_content=$9,conducting_body=$10,
    frequency=$11,stages=$12,language=$13,negative_marking=$14,active=$15,featured=$16,badge=$17,sort_order=$18 WHERE id=$19`,
    [f.category_id,f.name,f.slug,f.icon,f.description,f.seo_title,f.seo_description,
     f.seo_keywords,f.seo_content,f.conducting_body,f.frequency,f.stages,
     f.language,f.negative_marking,f.active,f.featured,f.badge,f.sort_order,req.params.id]);
  if (f.subjects) {
    await query('DELETE FROM exam_subjects WHERE exam_id=$1', [req.params.id]);
    for (let i=0; i<f.subjects.length; i++) {
      const s = f.subjects[i];
      await query('INSERT INTO exam_subjects (exam_id,subject_name,questions,marks,duration,sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.id, s.subject_name, s.questions, s.marks, s.duration, i]);
    }
  }
  res.json({ success: true });
});

app.delete('/api/admin/exams/:id', authMiddleware, async (req, res) => {
  await query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — PAPERS
// ════════════════════════════════

app.get('/api/admin/papers', authMiddleware, async (req, res) => {
  let q = `SELECT p.*, e.name as exam_name, e.slug as exam_slug 
           FROM papers p JOIN exams e ON p.exam_id=e.id`;
  const params = [];
  if (req.query.exam_id) { q += ' WHERE p.exam_id=$1'; params.push(req.query.exam_id); }
  q += ' ORDER BY p.year DESC, p.created_at DESC';
  const r = await query(q, params);
  res.json(r.rows);
});

app.post('/api/admin/papers', authMiddleware, upload.single('pdf'), async (req, res) => {
  const f = req.body;
  const file_path = req.file ? `/uploads/${req.file.filename}` : f.file_path || null;
  const file_size = req.file ? `${(req.file.size/1024/1024).toFixed(1)} MB` : f.file_size || null;
  try {
    const r = await query(`INSERT INTO papers 
      (exam_id,title,year,paper_type,shift,file_path,file_size,questions,is_free,is_active,sort_order) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [f.exam_id,f.title,f.year,f.paper_type,f.shift||null,file_path,file_size,
       f.questions||null,f.is_free??1,f.is_active??1,f.sort_order||0]);
    await query('UPDATE exams SET total_papers=(SELECT COUNT(*) FROM papers WHERE exam_id=$1) WHERE id=$1', [f.exam_id]);
    res.json({ id: r.rows[0].id, success: true, file_path });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/papers/:id', authMiddleware, upload.single('pdf'), async (req, res) => {
  const f = req.body;
  const paperRes = await query('SELECT * FROM papers WHERE id=$1', [req.params.id]);
  const paper = paperRes.rows[0];
  const file_path = req.file ? `/uploads/${req.file.filename}` : f.file_path || paper.file_path;
  const file_size = req.file ? `${(req.file.size/1024/1024).toFixed(1)} MB` : f.file_size || paper.file_size;
  await query(`UPDATE papers SET exam_id=$1,title=$2,year=$3,paper_type=$4,shift=$5,
    file_path=$6,file_size=$7,questions=$8,is_free=$9,is_active=$10,sort_order=$11 WHERE id=$12`,
    [f.exam_id,f.title,f.year,f.paper_type,f.shift,file_path,file_size,
     f.questions,f.is_free,f.is_active,f.sort_order,req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/papers/:id', authMiddleware, async (req, res) => {
  const r = await query('SELECT * FROM papers WHERE id=$1', [req.params.id]);
  if (r.rows[0]?.file_path) {
    const fp = path.join(__dirname, r.rows[0].file_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await query('DELETE FROM papers WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ════════════════════════════════
//  ADMIN — SETTINGS
// ════════════════════════════════

app.get('/api/admin/settings', authMiddleware, async (req, res) => {
  const r = await query('SELECT * FROM site_settings');
  const s = {};
  r.rows.forEach(row => s[row.key] = row.value);
  res.json(s);
});

app.put('/api/admin/settings', authMiddleware, async (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    await query('INSERT INTO site_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k, v]);
  }
  res.json({ success: true });
});

app.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
  const [total_cats, total_exams, total_papers, total_dl, free_papers, premium_papers, active_exams, featured_exams, recent_papers, top_downloads] = await Promise.all([
    query('SELECT COUNT(*) as c FROM categories'),
    query('SELECT COUNT(*) as c FROM exams'),
    query('SELECT COUNT(*) as c FROM papers'),
    query('SELECT COALESCE(SUM(downloads),0) as c FROM papers'),
    query('SELECT COUNT(*) as c FROM papers WHERE is_free=1'),
    query('SELECT COUNT(*) as c FROM papers WHERE is_free=0'),
    query('SELECT COUNT(*) as c FROM exams WHERE active=1'),
    query('SELECT COUNT(*) as c FROM exams WHERE featured=1'),
    query(`SELECT p.*, e.name as exam_name FROM papers p JOIN exams e ON p.exam_id=e.id ORDER BY p.created_at DESC LIMIT 5`),
    query(`SELECT p.*, e.name as exam_name FROM papers p JOIN exams e ON p.exam_id=e.id ORDER BY p.downloads DESC LIMIT 5`),
  ]);
  res.json({
    total_categories: total_cats.rows[0].c,
    total_exams: total_exams.rows[0].c,
    total_papers: total_papers.rows[0].c,
    total_downloads: total_dl.rows[0].c,
    free_papers: free_papers.rows[0].c,
    premium_papers: premium_papers.rows[0].c,
    active_exams: active_exams.rows[0].c,
    featured_exams: featured_exams.rows[0].c,
    recent_papers: recent_papers.rows,
    top_downloads: top_downloads.rows,
  });
});

// ── START ──
setupDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ExamPYQ Server running at http://localhost:${PORT}`);
    console.log(`🔑 Login: admin / admin123\n`);
  });
}).catch(err => {
  console.error('DB Setup failed:', err);
  process.exit(1);
});
