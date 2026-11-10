'use strict';

const packages = {
  internationalPhysical: { name: 'International Physical Package', amount: '₦3,500,000' },
  ukResidents: { name: 'UK Residents Package', amount: '£250' },
  nigeriaOnline: { name: 'Nigeria / Online Participation Package', amount: 'Early Bird ₦100,000 / Standard ₦150,000' }
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

const heroVideo = document.getElementById('heroVideo');
const heroVideoError = document.getElementById('heroVideoError');
heroVideo.addEventListener('error', () => { heroVideoError.hidden = false; });
heroVideo.addEventListener('loadedmetadata', () => { heroVideoError.hidden = true; });

const dialog = document.getElementById('registrationDialog');
const form = document.getElementById('registrationForm');
const packageInput = document.getElementById('packageInput');
const packageSummary = document.getElementById('packageSummary');
const registrationStatus = document.getElementById('registrationStatus');
const registrationSubmit = document.getElementById('registrationSubmit');
const registrationSuccess = document.getElementById('registrationSuccess');
const registrationId = document.getElementById('registrationId');
let pendingRegistration = null;
let submitting = false;

document.querySelectorAll('[data-package]').forEach(button => button.addEventListener('click', () => {
  const selection = button.dataset.package;
  const chosen = packages[selection];
  if (!chosen) return;
  form.reset();
  registrationStatus.textContent = '';
  registrationSuccess.hidden = true;
  registrationSubmit.hidden = false;
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
  grantScreeningStatus.textContent = 'Details saved in this browser. Choose a package and submit the registration form to send them.';
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

document.getElementById('closeDialog').addEventListener('click', () => { if (!submitting) dialog.close(); });
dialog.addEventListener('click', event => { if (event.target === dialog && !submitting) dialog.close(); });
dialog.addEventListener('cancel', event => { if (submitting) event.preventDefault(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;
  const data = new FormData(form);
  let grantApplication;
  try {
    const savedGrant = sessionStorage.getItem('jitGrantEnquiry');
    grantApplication = savedGrant ? JSON.parse(savedGrant) : null;
  } catch {
    registrationStatus.textContent = 'Your grant details could not be read. Please return to the grant form and try again.';
    return;
  }
  const details = {
    package: String(data.get('package') || ''),
    fullName: String(data.get('fullName') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    business: String(data.get('business') || '').trim(),
    grantApplication
  };
  const serialized = JSON.stringify(details);
  if (!pendingRegistration || pendingRegistration.details !== serialized) {
    if (!window.isSecureContext || !crypto.randomUUID) {
      registrationStatus.textContent = 'Registration requires a secure HTTPS connection. Please open the published website and try again.';
      return;
    }
    pendingRegistration = { id: crypto.randomUUID(), details: serialized };
  }
  submitting = true;
  registrationSubmit.disabled = true;
  registrationSubmit.textContent = 'Submitting registration…';
  registrationStatus.textContent = '';
  try {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pendingRegistration.id, ...details })
    });
    const result = await response.json();
    if (!response.ok) {
      registrationStatus.textContent = typeof result.error === 'string' ? result.error : 'Registration could not be saved. Please try again.';
      return;
    }
    if (result.registrationId !== pendingRegistration.id) throw new Error('Invalid registration response');
    registrationId.textContent = result.registrationId;
    registrationSuccess.hidden = false;
    registrationSubmit.hidden = true;
    try {
      sessionStorage.removeItem('jitGrantEnquiry');
    } catch (error) {
      console.error('Could not clear the saved grant details:', error);
    }
    pendingRegistration = null;
  } catch (error) {
    console.error('Registration request failed:', error);
    registrationStatus.textContent = 'We could not confirm that your registration was saved. Please retry with the same details.';
  } finally {
    submitting = false;
    registrationSubmit.disabled = false;
    registrationSubmit.textContent = 'Submit registration';
  }
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
