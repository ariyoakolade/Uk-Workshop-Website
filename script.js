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
  const message = [
    'Hello JIT Travels, I have completed the registration form for the UK Strategic Business Growth Workshop 2026.',
    `Package: ${chosen.name} (${chosen.amount})`,
    `Name: ${String(data.get('fullName') || '').trim()}`,
    `Email: ${String(data.get('email') || '').trim()}`,
    `Phone: ${String(data.get('phone') || '').trim()}`,
    `Business / profession: ${String(data.get('business') || 'Not provided').trim()}`,
    `Growth focus: ${String(data.get('growthFocus') || 'Not provided').trim()}`,
    `Participant profile: ${String(data.get('profile') || 'Not provided').trim()}`,
    'Please send me the payment instructions for this package.'
  ].join('\n');

  if (!paymentUrl || paymentUrl.startsWith('[')) {
    statusElement.textContent = 'Continue in WhatsApp to receive payment instructions for this package.';
    const whatsapp = window.open(`https://wa.me/2347079890161?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    return Boolean(whatsapp);
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
  packageInput.value = selection;
  packageSummary.textContent = `${chosen.name} • ${chosen.amount}`;
  dialog.showModal();
}));

const qualificationForm = document.getElementById('qualificationForm');
const qualificationSteps = [...qualificationForm.querySelectorAll('.qualification-step')];
const qualificationStepLabel = document.getElementById('qualificationStepLabel');
const qualificationProgress = document.getElementById('qualificationProgress');
const qualificationProgressBar = qualificationProgress.parentElement;
const qualificationBack = document.getElementById('qualificationBack');
const qualificationNext = document.getElementById('qualificationNext');
const qualificationSubmit = document.getElementById('qualificationSubmit');
const qualificationStatus = document.getElementById('qualificationStatus');
const qualificationSummary = document.getElementById('qualificationSummary');
let currentQualificationStep = 1;

function renderQualificationStep() {
  qualificationSteps.forEach((step, index) => {
    step.hidden = index + 1 !== currentQualificationStep;
  });
  qualificationStepLabel.textContent = `Step ${currentQualificationStep} of ${qualificationSteps.length}`;
  qualificationProgress.style.width = `${currentQualificationStep / qualificationSteps.length * 100}%`;
  qualificationProgressBar.setAttribute('aria-valuenow', String(currentQualificationStep));
  qualificationBack.hidden = currentQualificationStep === 1;
  qualificationNext.hidden = currentQualificationStep === qualificationSteps.length;
  qualificationSubmit.hidden = currentQualificationStep !== qualificationSteps.length;
  qualificationStatus.textContent = '';

  if (currentQualificationStep === qualificationSteps.length) {
    const data = new FormData(qualificationForm);
    const chosen = packages[String(data.get('package'))];
    qualificationSummary.textContent = `${chosen ? `${chosen.name} • ${chosen.amount}` : 'Choose a package'} | ${String(data.get('fullName') || 'Name not entered')} | ${String(data.get('email') || 'Email not entered')} | ${String(data.get('phone') || 'Phone not entered')}`;
  }
}

function validateCurrentQualificationStep() {
  const activeStep = qualificationSteps[currentQualificationStep - 1];
  for (const field of activeStep.querySelectorAll('input, textarea, select')) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

qualificationNext.addEventListener('click', () => {
  if (!validateCurrentQualificationStep()) return;
  currentQualificationStep = Math.min(currentQualificationStep + 1, qualificationSteps.length);
  renderQualificationStep();
});
qualificationBack.addEventListener('click', () => {
  currentQualificationStep = Math.max(currentQualificationStep - 1, 1);
  renderQualificationStep();
});
qualificationForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateCurrentQualificationStep()) return;
  const opened = continueWithPayment(new FormData(qualificationForm), qualificationStatus);
  if (opened) qualificationStatus.textContent = 'Your package-specific payment instructions are opening in WhatsApp.';
});
renderQualificationStep();

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
