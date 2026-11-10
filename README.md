# JIT Travels UK Strategic Business Growth Workshop 2026

## Step 1: Open locally
Open this folder in VS Code. Install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**. No npm installation is needed.

## Step 2: Customize before publishing
- The JIT Travels logo is in `jit-travels-logo.jpg`; replace it only if a higher-resolution approved brand asset is supplied.
- The hero uses the site's red, orange and yellow palette; the JIT Travels logo remains in the header and footer.
- Confirm facilitator names and session topics.
- Confirm workshop logistics for 14–18 December 2026, including the published UK and Nigeria times.
- Replace each distinct payment placeholder in `script.js` with its approved HTTPS payment URL: `[PHYSICAL_PAYMENT_LINK]`, `[UK_RESIDENT_PAYMENT_LINK]` and `[ONLINE_PAYMENT_LINK]`.
- Confirm the Early Bird availability and terms for the Nigeria / Online package.
- Publish the giveaway eligibility rules, sponsor approvals, winner-selection process and a direct link to the qualification instructions.
- Confirm the sponsored Tilcare opportunity, participant selection and session details.
- Verify the contact WhatsApp number.

## Step 3: Package checkout
The grant form temporarily saves its answers in the current browser session and then shows the package options. It does not send an application to the organisers. Package forms show an error while payment links are unavailable; they no longer open WhatsApp. Replace the three distinct values in `script.js` with approved HTTPS URLs: `[PHYSICAL_PAYMENT_LINK]`, `[UK_RESIDENT_PAYMENT_LINK]` and `[ONLINE_PAYMENT_LINK]`.

Grant applications need a secure server-side submission and email delivery service before they can be received by the organisers. Grant applicants are prevented from proceeding to checkout until that delivery is implemented; otherwise their details would be lost. Do not treat the three-second loading indicator as confirmation that an application was received.

For live payments, implement a backend (e.g. Supabase Edge Functions or Node.js):
1. Create a pending registration in a protected database.
2. POST the package ID to your backend, not the price. Validate package and price server-side.
3. Initialize the Paystack transaction using a secret key stored only on the server.
4. Redirect to Paystack's authorization URL or use a securely configured checkout.
5. Handle Paystack callback AND verified webhook. Verify transaction reference, amount, currency, status and customer/registration association server-side.
6. Mark registration paid only after successful verification. Ensure idempotency and log events.
7. Send a confirmation email and participant access instructions after verified payment.
8. Add an admin dashboard and refund/cancellation workflows if required.

Never put a Paystack secret key in `script.js`, never trust a frontend success message as proof of payment, and never claim the demo enquiry form is a completed registration.
