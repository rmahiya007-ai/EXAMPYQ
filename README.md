# 🎓 ExamPYQ — Full Stack PYQ Website

## 📁 Project Structure
```
pyq-project/
├── backend/
│   ├── server.js        ← Node.js + Express API
│   ├── package.json     ← Dependencies
│   └── uploads/         ← PDF files yahan save honge (auto-created)
├── admin/
│   └── admin.html       ← Admin Panel (open in browser)
└── frontend/
    └── pyq-website.html ← Public Website
```

---

## 🚀 Setup Kaise Karein (5 Minutes)

### Step 1 — Node.js Install karein
https://nodejs.org se LTS version download karein

### Step 2 — Backend Dependencies Install karein
```bash
cd backend
npm install
```

### Step 3 — Server Start karein
```bash
node server.js
```
✅ Server `http://localhost:4000` pe chalega

### Step 4 — Admin Panel Open karein
`admin/admin.html` ko browser mein directly open karein
- Username: **admin**
- Password: **admin123**

### Step 5 — Frontend Open karein
`frontend/pyq-website.html` ko browser mein open karein

---

## 🔑 Default Login
- **Username:** admin
- **Password:** admin123
> Admin Panel mein jaake Settings → Change Password se badal lo!

---

## 📊 Admin Panel Features

### Dashboard
- Total exams, papers, downloads ka overview
- Recently added papers
- Top downloaded papers

### Categories Manage
- Add / Edit / Delete categories
- Icon (emoji), color, slug customize karein
- Sort order set karein
- Active/Inactive toggle

### Exams Manage
- Complete exam add karein with all details
- SEO title, description, keywords
- Full HTML SEO content editor
- Subject-wise pattern (questions, marks)
- Exam details (conducting body, stages, etc.)
- Featured / Active toggle
- Badge (NEW/HOT/ELITE) set karein

### Papers / PDFs Manage
- PDF file upload (max 50MB)
- Ya direct URL paste karein
- Free / Premium toggle
- Year, type, shift filter
- Download counter auto-track hota hai
- Exam-wise filter

### Site Settings
- Site name, tagline
- Homepage stats (displayed numbers)
- Color theme customize
- Free download on/off
- Google Analytics ID
- PDF watermark text

---

## 🌐 API Endpoints

### Public API
```
GET  /api/categories           → Sab categories
GET  /api/exams                → Sab exams (filter by ?category=banking)
GET  /api/exams/:slug          → Ek exam ka detail
GET  /api/papers/:examSlug     → Exam ke papers
POST /api/papers/:id/download  → Download counter++
GET  /api/stats                → Homepage stats
GET  /api/settings/public      → Site settings
```

### Admin API (JWT required)
```
POST /api/admin/login
PUT  /api/admin/settings
CRUD /api/admin/categories
CRUD /api/admin/exams
CRUD /api/admin/papers  (file upload support)
GET  /api/admin/dashboard
```

---

## 🔗 Frontend ko Backend se Connect Karein

`pyq-website.html` ke andar JS ko update karein:
```javascript
const API_BASE = 'http://localhost:4000/api';

// Categories load
const cats = await fetch(API_BASE + '/categories').then(r => r.json());

// Exams load  
const exams = await fetch(API_BASE + '/exams?category=banking').then(r => r.json());

// Papers load
const papers = await fetch(API_BASE + '/papers/sbi-po').then(r => r.json());
```

---

## 🚀 Production Deploy karna Hai?

1. **Backend** → Railway / Render / VPS pe deploy karein
2. **Frontend + Admin** → Netlify / Vercel pe static hosting
3. **Database** → SQLite ko PostgreSQL mein migrate karein (Railway deta hai free)
4. **PDF Storage** → AWS S3 ya Cloudflare R2 (large files ke liye)
5. **Domain** → Namecheap / GoDaddy se `.com` ya `.in` lein

---

## 📞 Tech Stack
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **File Upload:** Multer
- **Frontend:** Vanilla HTML/CSS/JS
- **Admin:** Pure HTML admin panel
