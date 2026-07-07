require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambia-questa-stringa-segreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Impostare a true se si usa HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Hash the admin password at startup
let adminPasswordHash;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.status(401).json({ error: 'Non autorizzato. Effettua il login.' });
}

// ============================
//      PUBLIC ROUTES
// ============================

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Submit lead (form submission)
app.post('/api/leads', async (req, res) => {
  const { nome, cognome, citta, email } = req.body;

  // Validation
  if (!nome || !cognome || !citta || !email) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
  }

  if (nome.trim().length < 2) {
    return res.status(400).json({ error: 'Il nome deve avere almeno 2 caratteri.' });
  }

  if (cognome.trim().length < 2) {
    return res.status(400).json({ error: 'Il cognome deve avere almeno 2 caratteri.' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Indirizzo email non valido.' });
  }

  try {
    // Check if email already exists — still allow download
    const existing = await db.emailExists(email.toLowerCase().trim());
    if (!existing) {
      await db.addLead(
        nome.trim(),
        cognome.trim(),
        citta.trim(),
        email.toLowerCase().trim()
      );
    }

    // Generate a one-time download token
    const token = uuidv4();
    await db.saveToken(token);

    res.json({
      success: true,
      message: 'Registrazione completata! Il download partirà a breve.',
      downloadToken: token
    });
  } catch (error) {
    console.error('Errore salvataggio lead:', error);
    res.status(500).json({ error: 'Errore durante la registrazione. Riprova più tardi.' });
  }
});

// Download PDF with one-time token
app.get('/download/:token', async (req, res) => {
  const { token } = req.params;

  const valid = await db.validateToken(token);
  if (!valid) {
    return res.status(403).send(`
      <html>
        <head><title>Link scaduto</title></head>
        <body style="font-family: Palatino, serif; text-align: center; padding: 60px;">
          <h1>⚠️ Link non valido o scaduto</h1>
          <p>Torna alla <a href="/">pagina principale</a> per richiedere un nuovo download.</p>
        </body>
      </html>
    `);
  }

  const pdfPath = path.join(__dirname, 'uploads', 'surfing-leadership.pdf');

  res.download(pdfPath, 'Surfing-Leadership.pdf', (err) => {
    if (err) {
      console.error('Errore download file:', err);
      if (!res.headersSent) {
        res.status(404).send(`
          <html>
            <head><title>File non trovato</title></head>
            <body style="font-family: Palatino, serif; text-align: center; padding: 60px;">
              <h1>📄 PDF non ancora disponibile</h1>
              <p>Il file del libro non è ancora stato caricato. Contatta l'amministratore.</p>
            </body>
          </html>
        `);
      }
    }
  });
});

// ============================
//       ADMIN ROUTES
// ============================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Inserisci username e password.' });
  }

  try {
    if (username === ADMIN_USERNAME && await bcrypt.compare(password, adminPasswordHash)) {
      req.session.isAdmin = true;
      res.json({ success: true, message: 'Login effettuato!' });
    } else {
      res.status(401).json({ error: 'Credenziali non valide.' });
    }
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore durante il login.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// Get statistics
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    res.json({
      total: await db.getLeadCount(),
      today: await db.getTodayLeadCount(),
      week: await db.getWeekLeadCount()
    });
  } catch (error) {
    console.error('Errore stats:', error);
    res.status(500).json({ error: 'Errore caricamento statistiche.' });
  }
});

// Export leads as CSV (must be BEFORE /api/leads/:id to avoid route conflict)
app.get('/api/leads/export', requireAuth, async (req, res) => {
  try {
    const leads = await db.getAllLeads();

    const csvHeader = 'ID,Nome,Cognome,Città,Email,Data Registrazione\n';
    const csvRows = leads.map(lead =>
      `${lead.id},"${lead.nome}","${lead.cognome}","${lead.citta}","${lead.email}","${lead.data_registrazione}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-surfing-leadership.csv');
    // BOM per compatibilità Excel
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('Errore export:', error);
    res.status(500).json({ error: 'Errore durante l\'esportazione.' });
  }
});

// Get all leads (with optional search)
app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;

    if (search && search.trim().length > 0) {
      res.json(await db.searchLeads(search.trim()));
    } else {
      res.json(await db.getAllLeads());
    }
  } catch (error) {
    console.error('Errore caricamento leads:', error);
    res.status(500).json({ error: 'Errore caricamento dati.' });
  }
});

// Delete a lead
app.delete('/api/leads/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.deleteLead(parseInt(id, 10));
    res.json({ success: true, message: 'Lead eliminato.' });
  } catch (error) {
    console.error('Errore eliminazione lead:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione.' });
  }
});

// ============================
//       START SERVER
// ============================

async function startServer() {
  // Initialize database
  await db.initDatabase();

  // Hash admin password
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  adminPasswordHash = await bcrypt.hash(password, 10);

  // Start listening
  app.listen(PORT, () => {
    console.log('');
    console.log('🏄 ═══════════════════════════════════════════');
    console.log('   SURFING LEADERSHIP — Server Avviato!');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log(`   📄  Landing page:   http://localhost:${PORT}`);
    console.log(`   🔐  Pannello admin: http://localhost:${PORT}/admin`);
    console.log('');
    console.log('   Premi Ctrl+C per fermare il server');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Errore avvio server:', err);
  process.exit(1);
});
