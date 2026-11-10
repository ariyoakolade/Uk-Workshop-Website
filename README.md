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
permitted by Resend. If none are configured, no notification is sent; incomplete
configuration or delivery failures are logged in the Worker. A notification
failure does not undo a saved registration, so check the Worker logs and
Supabase for operational follow-up.

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
