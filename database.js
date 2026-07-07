const path = require('path');

// Usa PostgreSQL se DATABASE_URL è impostato (produzione), altrimenti SQLite (locale)
const usePostgres = !!process.env.DATABASE_URL;

let db;   // SQLite instance
let pool; // PostgreSQL pool

async function initDatabase() {
  if (usePostgres) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        citta TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        data_registrazione TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS download_tokens (
        token TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `);

    // Pulizia token scaduti
    await pool.query(`DELETE FROM download_tokens WHERE created_at < NOW() - INTERVAL '24 hours'`);

    console.log('✅ Database PostgreSQL (Neon) inizializzato');
  } else {
    const Database = require('better-sqlite3');
    db = new Database(path.join(__dirname, 'surfing_leadership.db'));
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        citta TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        data_registrazione DATETIME DEFAULT (datetime('now', 'localtime'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS download_tokens (
        token TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        used INTEGER DEFAULT 0
      )
    `);

    db.exec(`DELETE FROM download_tokens WHERE created_at < datetime('now', '-24 hours')`);

    console.log('✅ Database SQLite inizializzato (locale)');
  }
}

// --- LEAD FUNCTIONS ---

async function addLead(nome, cognome, citta, email) {
  if (usePostgres) {
    await pool.query(
      'INSERT INTO leads (nome, cognome, citta, email) VALUES ($1, $2, $3, $4)',
      [nome, cognome, citta, email]
    );
  } else {
    db.prepare('INSERT INTO leads (nome, cognome, citta, email) VALUES (?, ?, ?, ?)')
      .run(nome, cognome, citta, email);
  }
}

async function emailExists(email) {
  if (usePostgres) {
    const result = await pool.query('SELECT id FROM leads WHERE email = $1', [email]);
    return result.rows[0] || null;
  } else {
    return db.prepare('SELECT id FROM leads WHERE email = ?').get(email) || null;
  }
}

async function getAllLeads() {
  if (usePostgres) {
    const result = await pool.query('SELECT * FROM leads ORDER BY data_registrazione DESC');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM leads ORDER BY data_registrazione DESC').all();
  }
}

async function getLeadCount() {
  if (usePostgres) {
    const result = await pool.query('SELECT COUNT(*) as count FROM leads');
    return parseInt(result.rows[0].count, 10);
  } else {
    return db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  }
}

async function getTodayLeadCount() {
  if (usePostgres) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM leads WHERE data_registrazione::date = CURRENT_DATE`
    );
    return parseInt(result.rows[0].count, 10);
  } else {
    return db.prepare(
      `SELECT COUNT(*) as count FROM leads WHERE date(data_registrazione) = date('now', 'localtime')`
    ).get().count;
  }
}

async function getWeekLeadCount() {
  if (usePostgres) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM leads WHERE data_registrazione >= NOW() - INTERVAL '7 days'`
    );
    return parseInt(result.rows[0].count, 10);
  } else {
    return db.prepare(
      `SELECT COUNT(*) as count FROM leads WHERE data_registrazione >= datetime('now', 'localtime', '-7 days')`
    ).get().count;
  }
}

async function deleteLead(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  } else {
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  }
}

async function searchLeads(query) {
  const pattern = `%${query}%`;
  if (usePostgres) {
    const result = await pool.query(
      `SELECT * FROM leads 
       WHERE nome ILIKE $1 OR cognome ILIKE $2 OR citta ILIKE $3 OR email ILIKE $4
       ORDER BY data_registrazione DESC`,
      [pattern, pattern, pattern, pattern]
    );
    return result.rows;
  } else {
    return db.prepare(
      `SELECT * FROM leads 
       WHERE nome LIKE ? OR cognome LIKE ? OR citta LIKE ? OR email LIKE ?
       ORDER BY data_registrazione DESC`
    ).all(pattern, pattern, pattern, pattern);
  }
}

// --- TOKEN FUNCTIONS ---

async function saveToken(token) {
  if (usePostgres) {
    await pool.query('INSERT INTO download_tokens (token) VALUES ($1)', [token]);
  } else {
    db.prepare('INSERT INTO download_tokens (token) VALUES (?)').run(token);
  }
}

async function validateToken(token) {
  if (usePostgres) {
    const result = await pool.query(
      `SELECT * FROM download_tokens 
       WHERE token = $1 AND used = FALSE 
       AND created_at >= NOW() - INTERVAL '1 hour'`,
      [token]
    );
    if (result.rows[0]) {
      await pool.query('UPDATE download_tokens SET used = TRUE WHERE token = $1', [token]);
      return true;
    }
    return false;
  } else {
    const row = db.prepare(
      `SELECT * FROM download_tokens 
       WHERE token = ? AND used = 0 
       AND created_at >= datetime('now', '-1 hour')`
    ).get(token);
    if (row) {
      db.prepare('UPDATE download_tokens SET used = 1 WHERE token = ?').run(token);
      return true;
    }
    return false;
  }
}

module.exports = {
  initDatabase,
  addLead,
  emailExists,
  getAllLeads,
  getLeadCount,
  getTodayLeadCount,
  getWeekLeadCount,
  deleteLead,
  searchLeads,
  saveToken,
  validateToken
};
