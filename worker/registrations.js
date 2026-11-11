import { processEmails } from './emails.js';

const PACKAGES = {
  internationalPhysical: 'International Physical Participation',
  ukResidents: 'UK Residents',
  nigeriaOnline: 'Nigeria Online Participation'
};

const GRANT_FIELDS = {
  businessName: 150,
  businessType: 150,
  businessLocation: 150,
  businessStage: 60,
  grantUse: 3000,
  businessChallenge: 3000
};

function respond(status, body) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function cleanText(value, maxLength, required = true) {
  if (typeof value !== 'string') return required ? null : '';
  const text = value.trim();
  if (text.length > maxLength || (required && !text)) return null;
  return text;
}

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const id = cleanText(input.id, 36);
  const packageId = cleanText(input.package, 32);
  const fullName = cleanText(input.fullName, 150);
  const email = cleanText(input.email, 254);
  const phone = cleanText(input.phone, 40);
  const business = cleanText(input.business, 150, false);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      !packageId || !Object.hasOwn(PACKAGES, packageId) || !fullName || fullName.length < 2 ||
      !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone || !/^[+\d\s().-]{6,40}$/.test(phone) || business === null) return null;

  /** @type {Record<string, string> | null} */
  let grant = null;
  if (input.grantApplication !== null && input.grantApplication !== undefined) {
    if (typeof input.grantApplication !== 'object' || Array.isArray(input.grantApplication)) return null;
    grant = {};
    for (const [field, limit] of Object.entries(GRANT_FIELDS)) {
      grant[field] = cleanText(input.grantApplication[field], limit);
      if (!grant[field]) return null;
    }
    if (!['Idea or pre-launch', 'Operating for under 2 years', 'Operating for 2–5 years', 'Operating for over 5 years'].includes(grant.businessStage)) return null;
  }
  return { id, package: packageId, fullName, email, phone, business, grantApplication: grant };
}

async function fingerprint(registration) {
  const bytes = new TextEncoder().encode(JSON.stringify(registration));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

async function notifyAdmin(env, registration) {
  if (!env.ADMIN_EMAIL) return;
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL || !env.RESEND_FROM_EMAIL) {
    console.error('Registration email notification configuration is incomplete.');
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [env.ADMIN_EMAIL],
        subject: 'New workshop registration',
        text: `Registration ID: ${registration.id}\nPackage: ${PACKAGES[registration.package]}\nName: ${registration.fullName}\nEmail: ${registration.email}\nPhone: ${registration.phone}\nPayment status: pending\nRegistration status: pending_payment\n\nReview the complete registration in Supabase.`
      })
    });
    if (!response.ok) console.error('Registration email notification failed:', response.status);
  } catch (error) {
    console.error('Registration email notification request failed:', error.message);
  }
}

export default {
  async scheduled(_controller, env) {
    await processEmails(env);
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/registrations') return respond(404, { error: 'Not found.' });
    if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });
    if (request.headers.get('Origin') !== url.origin) return respond(403, { error: 'Request origin is not allowed.' });
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
      return respond(415, { error: 'Use JSON to submit your registration.' });
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase registration configuration is missing.');
      return respond(503, { error: 'Registration is not available yet. Please try again later.' });
    }

    let input;
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 16384) return respond(413, { error: 'Registration is too large.' });
      input = JSON.parse(body);
    } catch {
      return respond(400, { error: 'Please submit a valid registration.' });
    }
    const registration = validate(input);
    if (!registration) return respond(400, { error: 'Please check the required registration details and try again.' });

    let databaseUrl;
    try {
      databaseUrl = new URL(env.SUPABASE_URL);
      if (databaseUrl.protocol !== 'https:' || !databaseUrl.hostname.endsWith('.supabase.co')) throw new Error('Invalid Supabase URL');
    } catch {
      console.error('Invalid Supabase project URL.');
      return respond(503, { error: 'Registration is not available yet. Please try again later.' });
    }
    const tableUrl = new URL('/rest/v1/workshop_registrations', databaseUrl);
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };
    const requestFingerprint = await fingerprint(registration);
    let response;
    try {
      response = await fetch(tableUrl, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: registration.id,
          request_fingerprint: requestFingerprint,
          package: registration.package,
          full_name: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          business: registration.business || null,
          grant_application: registration.grantApplication,
          payment_status: 'pending',
          registration_status: 'pending_payment'
        })
      });
      if (response.status === 409) {
        tableUrl.search = new URLSearchParams({ id: `eq.${registration.id}`, select: 'request_fingerprint' }).toString();
        const existing = await fetch(tableUrl, { headers });
        if (!existing.ok) throw new Error(`Supabase lookup failed: ${existing.status}`);
        const rows = await existing.json();
        if (!Array.isArray(rows) || rows.length !== 1 || rows[0].request_fingerprint !== requestFingerprint) {
          return respond(409, { error: 'This registration ID has already been used for different details. Please start a new registration.' });
        }
        return respond(200, { registrationId: registration.id });
      }
      if (!response.ok) throw new Error(`Supabase insert failed: ${response.status}`);
    } catch (error) {
      console.error('Registration database request failed:', error.message);
      return respond(503, { error: 'We could not save your registration. Please try again.' });
    }
    await notifyAdmin(env, registration);
    return respond(201, { registrationId: registration.id });
  }
};
