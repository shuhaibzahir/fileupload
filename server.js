const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const app = express();
const PORT = 3000;

// Hardcoded credentials
const EMAIL = 'admin@example.com';
const PASSWORD = '123';

const uploadDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir);
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

// Middleware
app.use(cors({
    origin: ['*',"fax-upload.quipohealth.com"],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(cookieParser());
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// Serve React static build
app.use(express.static(path.join(__dirname, 'dist')));


// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.cookies.auth === 'token') {
    next();
  } else {
    res.status(401).json({message:"unauthorized"})
  }
}

// auth middlewares
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === EMAIL && password === PASSWORD) {
    res.cookie('auth', 'token', {
        httpOnly: true,          // Prevents JS access
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        sameSite: 'Lax',         // Prevents CSRF, but allows basic requests
        secure: true,           // true if using HTTPS (set to false for local dev)
      });
    res.json({ loggedIn: true})
    
  } else {
   res.json({ error: 'Invalid credentials' })
  }
});

app.post('/logout', (req, res) => {
    res.clearCookie('auth', {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: true // Set to true if using HTTPS
    });
    res.sendStatus(200);
  });

app.get('/auth/check', (req, res) => {
    const token = req.cookies.auth;
    if (token === 'token') {
      res.json({ isAuthenticated: true });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

//---------------- main funcitons 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const originalName = req.file.originalname;
    const txtPath = path.join(uploadDir, `${path.parse(originalName).name}.txt`);
    await fs.writeFile(txtPath, `filename=${originalName}`, 'utf8');
    res.status(200).send('Uploaded');
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});

app.get(/^\/(login|upload)?$/, (req, res) => res.redirect('/'));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
