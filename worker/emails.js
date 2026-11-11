const SITE_URL = 'https://workshop.jitglobalconsult.com';

function emailText(registration, groupUrl) {
  if (registration.email_kind === 'group') {
    return `Hello ${registration.full_name},\n\nThank you for completing your payment for the UK Strategic Business Growth Workshop 2026. Your full payment has been verified.\n\nJoin the official workshop WhatsApp group here:\n${groupUrl}\n\nWe look forward to welcoming you.\n\nJIT Travels`;
  }

  let text = `Hello ${registration.full_name},\n\nThank you for your interest in the UK Strategic Business Growth Workshop 2026. We have received your registration.\n\nPlease complete your payment using the bank transfer details provided when you registered and send your payment receipt to our team. If you have already paid, please allow our team to verify your full payment. Once it is verified, we will send another email with the link to join the official workshop WhatsApp group.\n\nRegistration ID: ${registration.id}`;
  if (registration.grant_application) {
    text += `\n\nTo be considered for the business support grant, please complete all the giveaway eligibility steps: register and pay in full; follow JIT Travels / JIT Empirical Global Consult Ltd on Instagram, TikTok and Facebook; reshare three official workshop promotional videos on Instagram, tagging JIT Travels, sending a collaboration invitation and using the required hashtags; and share your own Instagram video introducing yourself and your business and announcing your participation, tagging JIT Travels and using the required hashtags. Then email your full name, business name, payment confirmation and links to your promotional posts to jittravels11@gmail.com.\n\nMeeting the requirements does not guarantee a grant. Winners are selected based on the applicable award criteria. Full details: ${SITE_URL}/#giveaway-rules`;
  }
  return `${text}\n\nJIT Travels`;
}

async function rpc(env, name, data) {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, env.SUPABASE_URL), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`${name} failed: ${response.status}`);
  return response.json();
}

export async function processEmails(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY ||
      !env.RESEND_FROM_EMAIL || !env.WORKSHOP_GROUP_URL) {
    throw new Error('Workshop email configuration is incomplete.');
  }
  const database = new URL(env.SUPABASE_URL);
  if (database.protocol !== 'https:' || !database.hostname.endsWith('.supabase.co') ||
      database.pathname !== '/' || database.search || database.hash) {
    throw new Error('Invalid Supabase project URL.');
  }
  const group = new URL(env.WORKSHOP_GROUP_URL);
  if (group.protocol !== 'https:' || group.hostname !== 'chat.whatsapp.com') {
    throw new Error('Invalid workshop WhatsApp group URL.');
  }

  for (let i = 0; i < 20; i++) {
    const rows = await rpc(env, 'claim_workshop_email', {});
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Invalid email claim response.');
    if (rows.length === 0) return;
    const registration = rows[0];
    if (!['interest', 'group'].includes(registration.email_kind)) throw new Error('Invalid email kind.');
    let sent = false;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `workshop/${registration.id}/${registration.email_kind}`
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: [registration.email],
          subject: registration.email_kind === 'interest'
            ? 'Thank you for registering for the UK Strategic Business Growth Workshop'
            : 'Your workshop payment is verified — join the official group',
          text: emailText(registration, env.WORKSHOP_GROUP_URL)
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Resend request failed: ${response.status}`);
      sent = true;
    } catch (error) {
      console.error(`Workshop ${registration.email_kind} email failed for ${registration.id}:`, error.message);
    }
    const completed = await rpc(env, 'finish_workshop_email', {
      p_id: registration.id,
      p_kind: registration.email_kind,
      p_claimed_at: registration.claimed_at,
      p_sent: sent
    });
    if (completed !== true) throw new Error(`Could not record email result for ${registration.id}.`);
  }
}
