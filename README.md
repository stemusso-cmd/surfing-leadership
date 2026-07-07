# 🏄 Surfing Leadership — Landing Page

Landing page per il download gratuito del libro **Surfing Leadership**, con database integrato e pannello di amministrazione.

---

## 🚀 Come avviare in locale

### 1. Installare le dipendenze

Apri il Terminale, vai nella cartella del progetto e digita:

```bash
npm install
```

### 2. Configurare le credenziali

Il file `.env` contiene le credenziali dell'admin. Modificalo con le tue:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=la-tua-password-sicura
SESSION_SECRET=una-stringa-casuale-lunga
PORT=3000
```

### 3. Caricare il PDF del libro

Metti il file PDF del tuo libro nella cartella `uploads/` con questo nome esatto:

```
uploads/surfing-leadership.pdf
```

### 4. Avviare il server

```bash
npm run dev
```

Vedrai:

```
🏄 SURFING LEADERSHIP — Server Avviato!

   📄  Landing page:   http://localhost:3000
   🔐  Pannello admin: http://localhost:3000/admin
```

Apri il browser all'indirizzo **http://localhost:3000** per vedere la landing page.

---

## 🔐 Pannello Admin

Vai su **http://localhost:3000/admin** e inserisci le credenziali che hai impostato nel file `.env`.

Da qui puoi:
- ✅ Vedere tutti i contatti raccolti
- 🔍 Cercare per nome, cognome, città o email
- 📥 Esportare tutti i dati in formato CSV (apribile con Excel o Google Sheets)
- 🗑️ Eliminare singoli contatti

---

## 📁 Struttura del progetto

```
surfing-leadership/
├── server.js           ← Server principale
├── database.js         ← Gestione database SQLite
├── package.json        ← Dipendenze del progetto
├── .env                ← Credenziali (NON condividere!)
├── .env.example        ← Template credenziali
├── .gitignore          ← File da escludere da Git
├── uploads/
│   └── surfing-leadership.pdf  ← Il tuo libro (da aggiungere)
└── public/
    ├── index.html      ← Landing page
    ├── styles.css      ← Stili della landing page
    ├── script.js       ← Logica del form
    └── admin.html      ← Pannello amministrazione
```

---

## 🌐 Come pubblicare online (gratis)

### Opzione: Render.com

1. **Crea un account** su [render.com](https://render.com) (gratuito)
2. **Carica il progetto su GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Primo commit"
   ```
   Poi crea un repository su GitHub e segui le istruzioni per fare il push.
3. **Su Render**, clicca **"New" → "Web Service"**
4. **Collega il tuo repository GitHub**
5. Imposta:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Nella sezione **"Environment"**, aggiungi le variabili:
   - `ADMIN_USERNAME` → il tuo username admin
   - `ADMIN_PASSWORD` → la tua password admin
   - `SESSION_SECRET` → una stringa casuale
7. Clicca **"Create Web Service"**

Il tuo sito sarà disponibile in pochi minuti su un URL tipo `https://surfing-leadership.onrender.com`.

> ⚠️ **Nota**: Con il piano gratuito di Render, il database SQLite viene resettato ad ogni deploy. Per un uso in produzione, valuta di passare a un database persistente (es. PostgreSQL su Render) o di esportare regolarmente i dati in CSV.

---

## ❓ Domande frequenti

**D: Cosa succede se qualcuno inserisce la stessa email due volte?**
R: Il sistema riconosce l'email e permette comunque il download, senza creare un duplicato nel database.

**D: In che formato vengono esportati i dati?**
R: In formato CSV, compatibile con Microsoft Excel, Google Sheets e Numbers.

**D: Il PDF è protetto?**
R: Sì, il download avviene tramite un token temporaneo monouso. Non è possibile accedere al PDF con un link diretto.

---

© 2025 Surfing Leadership
