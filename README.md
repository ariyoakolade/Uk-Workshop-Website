# JIT Travels UK Strategic Business Growth Workshop 2026

## Registration

Visitors select a package and submit their contact information. Registrations are
stored in Supabase with `payment_status` set to `pending` and
`registration_status` set to `pending_payment`. The acknowledgement includes a
registration ID and package-specific bank transfer details. Participants can
open WhatsApp to attach and send their receipt. Neither showing bank details
nor opening WhatsApp verifies payment or confirms a place; staff must verify
transfers separately. There is no Paystack integration.

The International Physical package requires a ₦1,000,000 deposit for visa
processing, with the remaining ₦2,500,000 payable after visa issuance.
Nigeria / Online displays both Early Bird and Standard prices; the team should
confirm which price applies when necessary.

The grant form stores its answers in the browser session only. They are sent to
the organisers **only when** the visitor also submits the package registration
form. Grant selection and awards are not guaranteed.

## Database setup

1. Create a Supabase project and run
   [`supabase/workshop_registrations.sql`](supabase/workshop_registrations.sql)
   in its SQL Editor. It creates the table, enables row-level security and
   revokes access from the public `anon` and `authenticated` roles.
2. Obtain the project URL and service-role key from the Supabase dashboard.
   The service-role key bypasses row-level security and must remain secret.
   Never put it in website files, browser JavaScript or version control.

## Cloudflare deployment

The existing `uk-workshop-website` Worker serves the static site from the Git
repository. Deploy the registrations API as a **separate** Worker, without
replacing the website Worker. The site posts to `/api/registrations`; a
standalone `workers.dev` deployment will not receive these requests.
[`worker/wrangler.jsonc`](worker/wrangler.jsonc) configures the API-only route
`workshop.jitglobalconsult.com/api/registrations` for the Cloudflare zone.
The more specific API route must point to the API Worker; leave the existing
website routes and custom domain on the static website Worker.

Deploy [`worker/registrations.js`](worker/registrations.js) separately using
`npx wrangler deploy --config worker/wrangler.jsonc` from the repository root,
after authenticating Wrangler to the correct Cloudflare account. The separate
config is deliberately outside the repository root so the website's Git build
does not deploy the API Worker in place of its static assets. Add these
environment secrets to the API Worker through the Cloudflare dashboard or
Wrangler's secret commands:

- `SUPABASE_URL`: the Supabase project's HTTPS URL.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role key.

For optional administrator email notifications, configure all three:
`RESEND_API_KEY`, `ADMIN_EMAIL` and `RESEND_FROM_EMAIL`. The sender must be
permitted by Resend. If `ADMIN_EMAIL` is not configured, no administrator
notification is sent; other configuration or delivery failures are logged in the Worker. A notification
failure does not undo a saved registration, so check the Worker logs and
Supabase for operational follow-up.

## Participant emails

The registrations Worker also checks the email queue every five minutes. It
sends a thank-you and payment reminder after registration, including the grant
eligibility steps when a grant application was submitted. Once staff verify
**full payment** and set `payment_status` to exactly `paid` in Supabase, it
sends a second email containing the official WhatsApp group invitation.
The international package's initial deposit alone is not full payment.

To enable this safely:

1. In Resend, verify the `jitglobalconsult.com` domain and set up
   `info@jitglobalconsult.com` as a permitted sender. Configure
   `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on the registrations Worker;
   never commit the API key. Administrator notifications still require
   `ADMIN_EMAIL` as described above.
2. Set `WORKSHOP_GROUP_URL` as a Worker secret to the official WhatsApp
   invitation link. Do not publish this secret in website files.
3. Run [`supabase/workshop_emails.sql`](supabase/workshop_emails.sql) in the
   Supabase SQL Editor **before** deploying the updated Worker. The migration
   leaves existing registrations disabled for email and enables new ones by
   default. In Table Editor, review existing rows and set `email_enabled` to
   `true` for each genuine registration that should receive emails. Leave test
   registrations disabled. Do not mark a row paid without independently
   verifying full payment.
4. Deploy the registrations Worker using the command above. Verify that its
   five-minute cron trigger is active, then monitor its logs and check the
   `interest_email_sent_at` and `group_email_sent_at` columns. These timestamps
   indicate acceptance by Resend, not delivery to the inbox.

Failed sends are logged and retried after 30 minutes. Resend's idempotency key
reduces duplicate emails when a request succeeds but the result cannot be
recorded; its deduplication window is limited, so investigate persistent errors
promptly. Resend setup, migration, review of existing rows and deployment are
required before these emails will run.

## Verification

Opening `index.html` directly or serving it with Live Server displays the
website but does not provide the registration API. After deploying the Worker
and route, submit a test registration through the published HTTPS website.
Verify the registration ID, selected package, details and both pending statuses
in Supabase's Table Editor. Also check invalid submissions and retry behavior.
Remove or clearly identify test records according to your operational practice.

Before publishing, confirm workshop logistics, package terms, grant eligibility
and selection rules, facilitator details and contact information. Include the
hero video file `Images/workshop-hero-web.mp4` with the static site. The original
and larger conversion are retained locally but excluded from Cloudflare static
assets by `.assetsignore`, because they exceed the per-file size limit.
