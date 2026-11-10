'use strict';

// FRONTEND DEMO ONLY: Never put Paystack secret keys or server-side payment verification in browser JavaScript.
const packages = {
  internationalPhysical: { name: 'International Physical Package', amount: '₦3,500,000' },
  ukResidents: { name: 'UK Residents Package', amount: '£250' },
  nigeriaOnline: { name: 'Nigeria / Online Participation Package', amount: 'Early Bird ₦100,000 / Standard ₦150,000' }
};

const paymentLinks = {
  internationalPhysical: '[PHYSICAL_PAYMENT_LINK]',
  ukResidents: '[UK_RESIDENT_PAYMENT_LINK]',
  nigeriaOnline: '[ONLINE_PAYMENT_LINK]'
};

const menuToggle = document.getElementById('menuToggle');
const siteNav = document.getElementById('siteNav');
menuToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '×' : '☰';
});
siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  siteNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.textContent = '☰';
}));

const dialog = document.getElementById('registrationDialog');
const form = document.getElementById('registrationForm');
const packageInput = document.getElementById('packageInput');
const packageSummary = document.getElementById('packageSummary');
const registrationStatus = document.getElementById('registrationStatus');
function continueWithPayment(data, statusElement) {
  const packageId = String(data.get('package') || '');
  const chosen = packages[packageId];
  if (!chosen) return false;
  const paymentUrl = paymentLinks[packageId];
  let grantEnquiry = null;
  try {
    const savedEnquiry = sessionStorage.getItem('jitGrantEnquiry');
    grantEnquiry = savedEnquiry ? JSON.parse(savedEnquiry) : null;
  } catch {
    statusElement.textContent = 'Your grant application details could not be retrieved. Please return to the grant form and try again.';
    return false;
  }
  if (!paymentUrl || paymentUrl.startsWith('[')) {
    statusElement.textContent = 'Online payment is not available yet. Please contact JIT Travels at +234 707 989 0161.';
    return false;
  }
  if (grantEnquiry && typeof grantEnquiry === 'object') {
    statusElement.textContent = 'Your grant application has not been submitted. Application delivery is not available yet; please contact JIT Travels at +234 707 989 0161.';
    return false;
  }

  let destination;
  try {
    destination = new URL(paymentUrl);
  } catch {
    statusElement.textContent = 'The payment link is invalid. Please contact JIT Travels at +234 707 989 0161.';
    return false;
  }
  if (destination.protocol !== 'https:') {
    statusElement.textContent = 'The payment link is not secure. Please contact JIT Travels at +234 707 989 0161.';
    return false;
  }

  window.location.assign(destination.href);
  return true;
}

document.querySelectorAll('[data-package]').forEach(button => button.addEventListener('click', () => {
  const selection = button.dataset.package;
  const chosen = packages[selection];
  if (!chosen) return;
  form.reset();
  registrationStatus.textContent = '';
  packageInput.value = selection;
  packageSummary.textContent = `${chosen.name} • ${chosen.amount}`;
  try {
    const savedEnquiry = sessionStorage.getItem('jitGrantEnquiry');
    const grantEnquiry = savedEnquiry ? JSON.parse(savedEnquiry) : null;
    if (grantEnquiry && typeof grantEnquiry === 'object') {
      form.elements.fullName.value = String(grantEnquiry.fullName || '');
      form.elements.email.value = String(grantEnquiry.email || '');
      form.elements.phone.value = String(grantEnquiry.phone || '');
      form.elements.business.value = String(grantEnquiry.businessName || '');
    }
  } catch {
    registrationStatus.textContent = 'Your grant application details could not be retrieved. Please return to the grant form and try again.';
  }
  dialog.showModal();
}));

const grantScreeningForm = document.getElementById('grantScreeningForm');
const grantScreeningStatus = document.getElementById('grantScreeningStatus');
const grantSubmit = grantScreeningForm.querySelector('.grant-submit');
const grantSubmitLabel = grantSubmit.querySelector('.grant-submit-label');
grantScreeningForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!grantScreeningForm.reportValidity()) return;

  const grantEnquiry = Object.fromEntries(new FormData(grantScreeningForm));
  try {
    sessionStorage.setItem('jitGrantEnquiry', JSON.stringify(grantEnquiry));
  } catch {
    grantScreeningStatus.textContent = 'Your application details could not be saved in this browser. Please enable site storage and try again.';
    return;
  }
  grantScreeningStatus.textContent = 'Details saved in this browser only. Your application has not yet been sent to the organisers.';
  grantSubmit.disabled = true;
  grantSubmit.setAttribute('aria-busy', 'true');
  grantSubmitLabel.textContent = 'Preparing packages…';
  setTimeout(() => {
    grantSubmit.disabled = false;
    grantSubmit.removeAttribute('aria-busy');
    grantSubmitLabel.textContent = 'Apply for the ₦2M Grant';
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    document.getElementById('packages').scrollIntoView({ behavior });
  }, 3000);
});

document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (continueWithPayment(data, registrationStatus)) dialog.close();
});

// Event start: 14 December 2026 at midnight in London (GMT in December).
const eventStart = new Date('2026-12-14T00:00:00Z').getTime();
const nodes = ['days','hours','minutes','seconds'].map(id => document.getElementById(id));
function updateCountdown() {
  let remaining = Math.max(0, eventStart - Date.now());
  const days = Math.floor(remaining / 86400000); remaining %= 86400000;
  const hours = Math.floor(remaining / 3600000); remaining %= 3600000;
  const minutes = Math.floor(remaining / 60000); remaining %= 60000;
  const seconds = Math.floor(remaining / 1000);
  [days,hours,minutes,seconds].forEach((value,index) => { nodes[index].textContent = String(value).padStart(2,'0'); });
}
updateCountdown();
setInterval(updateCountdown, 1000);
document.getElementById('year').textContent = new Date().getFullYear();
