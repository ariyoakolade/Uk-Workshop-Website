import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processEmails } from './emails.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  RESEND_API_KEY: 'test-key',
  RESEND_FROM_EMAIL: 'info@jitglobalconsult.com',
  WORKSHOP_GROUP_URL: 'https://chat.whatsapp.com/example'
};

function registration(kind, grant = null) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    full_name: 'Test Participant',
    email: 'participant@example.com',
    email_kind: kind,
    grant_application: grant,
    claimed_at: '2026-11-11T12:00:00Z'
  };
}

async function exercise(row, status = 200) {
  const calls = [];
  let claims = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/claim_workshop_email')) {
      return Response.json(claims++ === 0 ? [row] : []);
    }
    if (target === 'https://api.resend.com/emails') {
      return Response.json({}, { status });
    }
    if (target.endsWith('/finish_workshop_email')) return Response.json(true);
    throw new Error(`Unexpected request: ${target}`);
  };
  try {
    await processEmails(env);
    return calls;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('interest email includes payment reminder and grant steps without group link', async () => {
  const calls = await exercise(registration('interest', { businessName: 'Business' }));
  const message = JSON.parse(calls[1].options.body);
  assert.match(message.text, /complete your payment/i);
  assert.match(message.text, /three official workshop promotional videos/i);
  assert.match(message.text, /jittravels11@gmail\.com/);
  assert.match(message.text, /does not guarantee a grant/i);
  assert.doesNotMatch(message.text, /chat\.whatsapp\.com/);
  assert.equal(JSON.parse(calls[2].options.body).p_sent, true);
});

test('ordinary registration email does not include grant instructions', async () => {
  const calls = await exercise(registration('interest'));
  const message = JSON.parse(calls[1].options.body);
  assert.doesNotMatch(message.text, /business support grant/i);
  assert.doesNotMatch(message.text, /chat\.whatsapp\.com/);
});

test('group email contains the invitation and a stable idempotency key', async () => {
  const calls = await exercise(registration('group'));
  const message = JSON.parse(calls[1].options.body);
  assert.match(message.text, /full payment has been verified/i);
  assert.ok(message.text.includes(env.WORKSHOP_GROUP_URL));
  assert.equal(calls[1].options.headers['Idempotency-Key'], 'workshop/00000000-0000-4000-8000-000000000001/group');
  assert.equal(JSON.parse(calls[2].options.body).p_sent, true);
});

test('failed email is recorded for retry', async () => {
  const calls = await exercise(registration('interest'), 500);
  assert.equal(JSON.parse(calls[2].options.body).p_sent, false);
});

test('missing configuration stops processing before claiming emails', async () => {
  await assert.rejects(processEmails({ ...env, WORKSHOP_GROUP_URL: '' }), /configuration is incomplete/);
});
