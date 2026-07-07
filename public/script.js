// =========================================
//  SURFING LEADERSHIP — Frontend Logic
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initForm();
});

// --- Scroll Reveal Animation ---
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

// --- Form Handling ---
function initForm() {
  const form = document.getElementById('downloadForm');
  if (!form) return;

  form.addEventListener('submit', handleFormSubmit);

  // Clear error state on input focus
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.classList.remove('input-error');
      hideError();
    });
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('.submit-btn');
  const errorEl = document.getElementById('formError');

  // Get form values
  const nome = form.nome.value.trim();
  const cognome = form.cognome.value.trim();
  const citta = form.citta.value.trim();
  const email = form.email.value.trim();

  // Client-side validation
  if (!validateForm(nome, cognome, citta, email, form)) {
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  hideError();

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cognome, citta, email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Errore durante la registrazione.');
    }

    // Success — show success message and trigger download
    showSuccess();

    if (data.downloadToken) {
      // Small delay to let user see the success message
      setTimeout(() => {
        triggerDownload(data.downloadToken);
      }, 800);
    }

  } catch (error) {
    showError(error.message);
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

function validateForm(nome, cognome, citta, email, form) {
  if (nome.length < 2) {
    showError('Inserisci il tuo nome (almeno 2 caratteri).');
    form.nome.classList.add('input-error');
    form.nome.focus();
    return false;
  }

  if (cognome.length < 2) {
    showError('Inserisci il tuo cognome (almeno 2 caratteri).');
    form.cognome.classList.add('input-error');
    form.cognome.focus();
    return false;
  }

  if (citta.length < 2) {
    showError('Inserisci la tua città di residenza.');
    form.citta.classList.add('input-error');
    form.citta.focus();
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Inserisci un indirizzo email valido.');
    form.email.classList.add('input-error');
    form.email.focus();
    return false;
  }

  return true;
}

function showError(message) {
  const errorEl = document.getElementById('formError');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
}

function hideError() {
  const errorEl = document.getElementById('formError');
  if (errorEl) {
    errorEl.classList.remove('visible');
  }
}

function showSuccess() {
  const formContainer = document.getElementById('formContainer');
  const successEl = document.getElementById('successMessage');

  if (formContainer) formContainer.style.display = 'none';
  if (successEl) successEl.classList.add('visible');
}

function triggerDownload(token) {
  const link = document.createElement('a');
  link.href = `/download/${token}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
