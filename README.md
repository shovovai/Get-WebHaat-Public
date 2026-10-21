# WebHaat — E-Commerce Platform

WebHaat is a full-featured online store built with **Next.js 16**, **Sanity** (database + CMS), **Clerk** (login), and **Stripe** (card payments). It includes a customer storefront, a complete admin panel, and a staff (employee) portal for order fulfilment.

This document explains what the system does, where data is stored, how it is set up, and how to run it.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

> **Free and open source.** You can download it, run it, and change it at no cost under the [AGPL-3.0 license](LICENSE).
>
> **Don't want to set it up yourself?** We install it, connect your domain and your bKash, Nagad or SSLCommerz merchant account, brand it for you, and maintain it every month. See [Professional setup & maintenance](#15-professional-setup--maintenance).
>
> **Install report.** When a live store first starts on a domain, WebHaat sends its web address and version to the maintainer so they know where it's running. It sends no customer or order data, and you can turn it off with `WEBHAAT_TELEMETRY=off`. Full details: [TELEMETRY.md](TELEMETRY.md).

---

## Contents

1. [What's included](#1-whats-included)
2. [How it works (architecture)](#2-how-it-works-architecture)
3. [Database (Sanity)](#3-database-sanity)
4. [Requirements](#4-requirements)
5. [Installation & first run](#5-installation--first-run)
6. [Environment variables](#6-environment-variables)
7. [Getting the service credentials](#7-getting-the-service-credentials)
8. [Admin panel guide](#8-admin-panel-guide)
9. [Employee portal](#9-employee-portal)
10. [Branding & customization](#10-branding--customization)
11. [Deployment](#11-deployment)
12. [Security notes](#12-security-notes)
13. [Troubleshooting](#13-troubleshooting)
14. [Project structure](#14-project-structure)
15. [Professional setup & maintenance](#15-professional-setup--maintenance)
16. [License](#16-license)
17. [Contributing & security](#17-contributing--security)

---

## 1. What's included

### Storefront (customers)

- Product catalog with categories, brands, deals, search and filters (price, brand, category)
- Cart, wishlist, checkout with saved addresses
- Payments: **Cash on Delivery** (optional fee / maximum amount), **bKash** and **Nagad** (native merchant APIs), **SSLCommerz**, **Stripe**, and **manual "Send Money"** to your personal/agent bKash, Nagad, Rocket, Upay or bank account with admin verification. All configured from **Admin → Payments**
- **Coupons / discount codes** in the cart and at checkout (percent or fixed, minimum order, expiry, usage limits)
- Totals are always calculated on the server — prices can't be changed from the browser
- Customer account: orders, order tracking timeline, invoices, profile, notifications
- Reward and loyalty points, wallet (refund credit) and withdrawal requests
- Product reviews (verified purchases, admin moderation)
- Premium and Business account applications (business accounts get extra discount)
- Blog, FAQ, contact, help, privacy and terms pages
- Newsletter subscription and one-click unsubscribe page
- SEO: editable titles/descriptions, Open Graph & X cards (auto-generated share image), JSON-LD (Organization, WebSite search box, products, breadcrumbs), image `sitemap.xml`, `robots.txt`, verification tags
- Installable, app-like mobile experience: bottom navigation dock, compact header, sticky buy/checkout bars, web app manifest ("Add to Home Screen")
- Announcement bar controlled from the admin panel

### Admin panel (`/admin`)

| Section | What it does |
| --- | --- |
| **Dashboard** | Revenue, orders, users and products with month-over-month change; pending account requests; quick actions |
| **Analytics** | Sales and revenue charts by period, order status and payment method breakdowns, best-selling products |
| **Reports & Export** | Customer insights (repeat rate, average order value, customer value, segments, top customers, top products, top cities, new customers per month) and **Excel/CSV export** of orders, customers, products, subscribers and reviews |
| **Orders** | Search, filter and update orders; assign employees; refunds to wallet; cancellations |
| **Products** | Create, edit and delete products: images (upload), price, discount, stock, categories, brand, badge, featured |
| **Payments** | *Verifications*: approve or reject manual (send-money) payments by TrxID. *Gateways & methods*: turn COD, bKash, Nagad, SSLCommerz, Stripe and manual numbers on/off, sandbox/live, and enter credentials (stored encrypted) |
| **Coupons** | Create discount codes, set limits and expiry, switch them on/off, see how often each was used |
| **Reviews** | Approve or reject customer reviews; product ratings are recalculated |
| **Users** | Customer list (Clerk + Sanity), details, activation, sync |
| **Account Requests** | Approve or reject Premium and Business account applications |
| **Email Marketing** | Compose and send newsletter campaigns (with test send and campaign history); manage and export subscribers |
| **Notifications** | Send in-app notifications to users and view sent history |
| **Employees** | Assign staff roles, suspend or activate staff, view performance |
| **SEO & Branding** | Upload store logo, favicon/app icon and social share image; home title, title template, meta description, keywords (with Google preview); social profile links; Google/Bing/Facebook verification; hide-from-search switch; Google Analytics 4, Tag Manager, Meta Pixel and AdSense IDs |
| **Settings** | Admin panel title, logo and accent color; store name, support contact, currency symbol; **delivery charge and free-delivery amount**; storefront announcement bar |

### Employee portal (`/employee`)

Role-based order processing for staff: Call Center → Packer → Warehouse → Delivery → Accounts, plus an In-charge role with full access and team analytics. See [section 9](#9-employee-portal).

---

## 2. How it works (architecture)

```
             ┌────────────────────────────── Browser ──────────────────────────────┐
             │  Storefront  (/ , /shop, /product, /cart, /checkout, /user/...)    │
             │  Admin panel (/admin/...)      Employee portal (/employee)          │
             │  Sanity Studio (/studio)                                           │
             └───────────────┬─────────────────────────────────────┬──────────────┘
                             │                                     │
                 Next.js 16 App Router (server)                    │ Clerk (sign-in UI)
     ┌───────────────────────┼──────────────────────────┐         │
     │ Server components      API routes (/api/...)      │         │
     │ Server actions (/actions)   proxy.ts (auth guard) │         │
     └──────┬──────────────┬──────────────┬─────────────┘         │
            │              │              │                        │
      ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼──────┐  ┌──────────────▼─┐
      │  Sanity   │  │  Stripe   │  │ Gmail SMTP │  │     Clerk      │
      │ database  │  │ payments  │  │ (Nodemailer│  │ users/sessions │
      │ + images  │  │ + webhook │  │  OAuth2)   │  │                │
      └───────────┘  └───────────┘  └────────────┘  └────────────────┘
                                   Firebase Analytics (optional, browser events)
```

| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript | Pages, API routes, server actions |
| Database / CMS | **Sanity Content Lake** | All store data: products, orders, users, reviews, settings… |
| Authentication | **Clerk** | Sign-up/sign-in, sessions, user profiles |
| Payments | Cash on Delivery, **SSLCommerz** hosted checkout + IPN, **Stripe** Checkout + webhook | Taking payment |
| Email | Nodemailer via Gmail OAuth2 | Order confirmations, newsletters, campaigns |
| Analytics | Firebase Analytics (optional) | Browser event tracking |
| UI | Tailwind CSS 4, Radix UI (shadcn/ui), Framer Motion, Recharts | Styling, components, charts |
| State | Zustand | Cart and wishlist in the browser |

**Request flow example — placing an order**

1. The customer adds items to the cart (stored in the browser with Zustand).
2. Cart and checkout show totals from `/api/checkout/quote`, which re-prices every item from Sanity (plus business discount, coupon, shipping and tax — see `lib/pricing.ts`).
3. `/api/orders` prices the cart again on the server, reserves stock, records coupon usage and creates the `order` document. Client-sent totals are ignored.
4. Online payments: the customer is sent to SSLCommerz or Stripe for **exactly the stored order total**. SSLCommerz (`/api/payments/sslcommerz/*`) and Stripe (`/api/webhook`) confirm the payment server-to-server before the order is marked paid.
5. A confirmation email goes to the customer and a "new order" email to every admin.
6. Staff move the order through the pipeline in `/employee`, and admins can follow it in `/admin/orders`. Cancelling an order puts its stock back.

**Who is an admin?** Any signed-in user whose email is listed in `NEXT_PUBLIC_ADMIN_EMAIL`. This is checked on the server for every admin page, admin API route and admin server action.

---

## 3. Database (Sanity)

WebHaat has no separate SQL/Mongo database. **Sanity is the database.** Data is stored as JSON documents in your Sanity project (hosted by Sanity) and queried with GROQ. Images are stored on Sanity's CDN (`cdn.sanity.io`).

- **Studio**: open `/studio` on your site to browse and edit all data directly (products, banners, blog posts, etc.).
- **Read client** (`sanity/lib/client.ts`): uses the CDN for public pages.
- **Write/back-end clients** (`sanity/lib/client.ts` → `writeClient`, `sanity/lib/backendClient.ts`): use `SANITY_API_TOKEN` on the server only.

### Document types (`sanity/schemaTypes/`)

| Type | Holds |
| --- | --- |
| `product` | Name, slug, images, description, price, discount, stock, categories, brand, status, variant, featured flag, rating stats |
| `category`, `brand` | Catalog taxonomy |
| `order` | Order number, customer, items, totals, address, status, payment status and method, Stripe/Clerk IDs, full employee tracking (who confirmed, packed, delivered, cash collected…) and status history |
| `user` | Profile linked to Clerk (`clerkUserId`), addresses, preferences, cart, wishlist, reward and loyalty points, wallet balance and transactions, premium/business status, employee role, status and performance |
| `address` | Saved shipping addresses |
| `review` | Product reviews with rating, status (`pending`/`approved`/`rejected`) and admin notes |
| `subscription` | Newsletter subscribers (email, status, source) |
| `emailCampaign` | History of campaigns sent from the admin panel |
| `coupon` | Discount codes (type, value, limits, expiry, times used) |
| `paymentSettings` | Singleton with payment gateway settings (secrets encrypted) |
| `storeSettings` | Singleton with admin branding, store info and announcement bar |
| `sentNotification` | Notifications sent by admins |
| `userAccessRequest` | Access and approval requests |
| `banner`, `blog`, `blogcategory`, `author`, `blockContent` | Marketing and blog content |
| `contact` | Contact form submissions |

After changing a schema, regenerate TypeScript types:

```bash
npm run typegen
```

---

## 4. Requirements

- **Node.js 20+** (Node 22 LTS recommended)
- npm (or pnpm/yarn)
- Free accounts on: **Sanity**, **Clerk**, **Stripe**
- Optional: a Google account (for sending emails), Firebase (analytics)

---

## 5. Installation & first run

```bash
# 1. Get the code
git clone <your-repository-url> webhaat
cd webhaat

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
#    then fill in the values (see sections 6 and 7)

# 4. Start the development server
npm run dev
```

Open:

- Storefront → http://localhost:3000
- Admin panel → http://localhost:3000/admin (sign in with an email listed in `NEXT_PUBLIC_ADMIN_EMAIL`)
- Sanity Studio → http://localhost:3000/studio
- Employee portal → http://localhost:3000/employee

### First-time checklist

1. Sign up on the site with the email you put in `NEXT_PUBLIC_ADMIN_EMAIL`.
2. Open `/studio` and add at least one **category**, **brand**, and **product** (with an image and price).
3. In Sanity → **API → CORS origins**, add `http://localhost:3000` (and later your live domain) with *Allow credentials* checked.
4. Open `/admin/settings` and set your store name, colors, and currency.
5. Place a test order (Cash on Delivery works without Stripe webhooks).

### Production build

```bash
npm run build
npm start
```

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (Turbopack) with hot reload |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typegen` | Extract the Sanity schema and generate `sanity.types.ts` |

---

## 6. Environment variables

All settings live in `.env` (copy it from `.env.example`). **Never commit `.env`** — it is git-ignored.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | yes | Public site URL, e.g. `https://webhaat.com` (`http://localhost:3000` locally). Used for SEO, sitemap and email links |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | yes | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | yes | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | no | e.g. `2025-01-01` |
| `SANITY_API_TOKEN` | yes | Sanity token with **Editor** rights (server-only) |
| `SANITY_API_READ_TOKEN` | yes | Sanity token with **Viewer** rights (live content) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` | yes | `/sign-in` and `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | yes | `/` |
| `PAYMENT_ENCRYPTION_KEY` | **yes** | Long random string used to encrypt gateway credentials saved in Admin → Payments. Never change it after saving credentials |
| `STRIPE_SECRET_KEY` | no | Optional fallback — Stripe keys are normally entered in Admin → Payments |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | Signing secret of the `/api/webhook` endpoint |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | no | Optional fallback — normally entered in Admin → Payments |
| `SSLCOMMERZ_SANDBOX` | no | `true` (default) for the sandbox, `false` for live payments |
| `ADMIN_EMAILS` | yes | Admin emails, comma-separated: `owner@shop.com,manager@shop.com`. Server-only — never sent to the browser |
| `NEXT_PUBLIC_ADMIN_EMAIL` | no (legacy) | Old name of `ADMIN_EMAILS`, still read when `ADMIN_EMAILS` is empty. It is embedded in the public JavaScript bundle — move the value to `ADMIN_EMAILS` and remove it |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | Upstash Redis REST credentials: shares rate-limit counters across all server instances (in-memory per instance when empty) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | no | Cloudflare Turnstile keys: bot check on the contact and newsletter forms (off when either is empty) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | for emails | Any SMTP provider (Brevo, Mailgun, Amazon SES, Zoho, your host). Used when `SMTP_HOST` is set |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | for emails | Gmail OAuth2 — used when `SMTP_HOST` is empty |
| `SENDER_EMAIL_ADDRESS` | for emails | The "From" address of store emails |
| `UNSUBSCRIBE_SECRET` | no | Signs newsletter unsubscribe links (falls back to `PAYMENT_ENCRYPTION_KEY`) |
| `NEXT_PUBLIC_COMPANY_NAME` | no | Store name (default `WebHaat`) |
| `NEXT_PUBLIC_COMPANY_EMAIL`, `NEXT_PUBLIC_COMPANY_PHONE`, `NEXT_PUBLIC_COMPANY_ADDRESS`, `NEXT_PUBLIC_COMPANY_CITY` | no | Contact details shown on the site |
| `NEXT_PUBLIC_COMPANY_BUSINESS_HOURS_WEEKDAY` / `_WEEKEND` | no | Opening hours text |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SALES_EMAIL` | no | Contact emails |
| `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_TWITTER_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_YOUTUBE_URL` | no | Social links in the footer |
| `NEXT_PUBLIC_COMPANY_DESCRIPTION`, `NEXT_PUBLIC_COPYRIGHT_TEXT` | no | SEO description and footer copyright |
| `NEXT_PUBLIC_CURRENCY` | no | Store currency code: `USD` (default), `BDT`, `EUR`, `INR`… |
| `NEXT_PUBLIC_LOCALE` | no | Number format, e.g. `en-US`, `en-BD`, `bn-BD` |
| `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` | no | Starting value for "free delivery over" (default `100`). Change it later in Admin → Settings → Delivery |
| `NEXT_PUBLIC_SHIPPING_FEE` | no | Starting delivery charge (default `10`). Change it later in Admin → Settings → Delivery |
| `NEXT_PUBLIC_TAX_RATE` | no | Tax as a decimal: `0.05` = 5% (default `0`) |
| `NEXT_PUBLIC_BUSINESS_DISCOUNT_RATE` | no | Extra discount for business accounts (default `0.02` = 2%) |
| `NEXT_PUBLIC_PRICE_BUCKETS` | no | Shop price filter steps, e.g. `500,1000,5000,10000` for BDT |
| `REWARD_POINTS_THRESHOLD`, `REWARD_POINTS_AMOUNT` | no | Reward points rules |
| `LOYALTY_POINTS_ORDER_THRESHOLD`, `LOYALTY_POINTS_AMOUNT` | no | Loyalty points rules |
| `NEXT_PUBLIC_FIREBASE_*` | no | Firebase Analytics config (browser event tracking) |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | no | Your own Google AdSense publisher ID (ads are off when empty) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | Google Search Console verification code |

---

## 7. Getting the service credentials

### Sanity (database)

1. Create a project at [sanity.io/manage](https://www.sanity.io/manage) (or run `npm create sanity@latest`).
2. Copy the **Project ID** into `NEXT_PUBLIC_SANITY_PROJECT_ID`, and use dataset `production`.
3. **API → Tokens**: create one **Editor** token (`SANITY_API_TOKEN`) and one **Viewer** token (`SANITY_API_READ_TOKEN`).
4. **API → CORS origins**: add your local and live URLs with credentials allowed.

### Clerk (login)

1. Create an application at [clerk.com](https://clerk.com) and enable Email sign-in.
2. Copy the **Publishable key** and **Secret key** into `.env`.
3. In production, add your domain in Clerk and use the live keys.

### Stripe (card payments)

1. From [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys, copy the **Secret key** into `STRIPE_SECRET_KEY`.
2. Webhook: Developers → Webhooks → Add endpoint → `https://your-domain.com/api/webhook`, event **`checkout.session.completed`**. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```

### Payment gateways (Admin → Payments)

All payment methods are managed from **Admin → Payments → Gateways & methods**. Credentials are encrypted with `PAYMENT_ENCRYPTION_KEY` before being stored, and the admin screen never shows them again (only the last 4 characters). Each gateway has a **Sandbox / Live** switch — test in sandbox first. Online gateways require `NEXT_PUBLIC_CURRENCY=BDT` for bKash and Nagad.

**bKash (Tokenized Checkout)**
1. Apply for a bKash merchant account / PGW at [bkash.com](https://www.bkash.com/en/business) — you receive *App key, App secret, Username, Password*. Sandbox credentials are available from bKash's developer portal.
2. Enter them in Admin → Payments → bKash. Give bKash the **callback URL** shown there (`/api/payments/bkash/callback`).
3. Flow: customer is sent to bKash → returns to the callback → the payment is *executed* and checked (invoice number + amount) → order marked paid.

**Nagad (merchant API)**
1. Get a Nagad merchant account — you receive a *Merchant ID*, your *merchant private key* and *Nagad's public key*. Nagad must also whitelist your server IP for live mode.
2. Paste them in Admin → Payments → Nagad.
3. Flow: initialize + complete (RSA-encrypted, signed) → customer pays on Nagad → callback → payment re-verified with Nagad → order marked paid.

**Manual payments (personal / agent numbers)**
1. Turn on *Manual payment* and add numbers, e.g. *bKash Personal 017XXXXXXXX*, *Nagad Personal*, *Rocket*, or a bank account.
2. At checkout the customer sees your number and the exact amount, sends the money, then enters **their number + Transaction ID (TrxID)**.
3. The order is saved as *Awaiting verification*; admins get an email and a badge on **Payments**.
4. In **Payments → Verifications**, check the TrxID in your app, then **Approve** (order → paid) or **Reject** with a reason (customer is notified and can resubmit from the order page). Each TrxID can only be used once.

**Cash on delivery** — optional *COD fee* (added to the total) and *maximum order amount* (COD hidden above it).

> Native bKash / Nagad integrations follow the providers' published APIs. Always complete a sandbox payment and one small live payment before launch; merchant accounts sometimes use different API versions.

### SSLCommerz (bKash, Nagad, Rocket, cards — Bangladesh)

1. Create a free sandbox account at [developer.sslcommerz.com](https://developer.sslcommerz.com/registration/) — you receive a **Store ID** and **Store Password** by email.
2. Enter them in Admin → Payments → SSLCommerz (or `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD` in `.env`) and set `NEXT_PUBLIC_CURRENCY=BDT`.
3. Test with the sandbox (`SSLCOMMERZ_SANDBOX=true`). For real payments, apply for a live merchant account, use the live credentials and set `SSLCOMMERZ_SANDBOX=false`.
4. `NEXT_PUBLIC_BASE_URL` must be your public site URL: SSLCommerz sends customers back to `/api/payments/sslcommerz/success|fail|cancel` and notifies `/api/payments/sslcommerz/ipn`. For local testing use a tunnel such as `ngrok http 3000`.

### Email

**Recommended:** any SMTP provider. Fill `SMTP_HOST`, `SMTP_PORT` (587, or 465 with `SMTP_SECURE=true`), `SMTP_USER`, `SMTP_PASSWORD` and `SENDER_EMAIL_ADDRESS`.

**Or Gmail (OAuth2):**


1. In [Google Cloud Console](https://console.cloud.google.com) create an OAuth client (Web application) and enable the Gmail API.
2. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
3. In the [OAuth Playground](https://developers.google.com/oauthplayground), use your own client ID/secret, authorize `https://mail.google.com/`, and exchange the code for a **refresh token**.
4. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `SENDER_EMAIL_ADDRESS` (the Gmail address).

> Gmail limits sending to about 500 emails per day (2,000 for Google Workspace). For larger newsletters use an SMTP provider instead.

### Analytics (optional)

Browser analytics use Google Analytics 4 — there is no Firebase or other analytics SDK in the bundle. Enter your GA4 Measurement ID (`G-…`) in **Admin → SEO & Branding**; Google Tag Manager, Meta Pixel and AdSense IDs go in the same place (AdSense can also come from `NEXT_PUBLIC_ADSENSE_CLIENT_ID`). Shop events such as `view_item`, `add_to_cart`, `remove_from_cart` and `add_to_wishlist` are sent to GA4 through `gtag` (or pushed to the GTM `dataLayer` when only Tag Manager is set). Nothing is tracked until an ID is entered.

---

## 8. Admin panel guide

**Access:** add the owner's email to `NEXT_PUBLIC_ADMIN_EMAIL`, restart the server, sign in with that email, and open `/admin`. Other users are sent to `/admin/access-denied`.

- **Dashboard** — daily overview. Cards link to the matching sections.
- **Analytics** — choose a period to see revenue and sales trends, order status and payment breakdowns, and best sellers.
- **Reports & Export**
  - Pick a range (30 days, 90 days, 12 months, or all time) for customer insights.
  - *Export data*: choose optional From/To dates, then click Orders, Customers, Products, Subscribers or Reviews. A `.csv` file downloads and opens directly in Excel or Google Sheets.
- **Orders** — open an order to change its status, assign staff, or refund to the customer's wallet.
- **Products** — **New product** opens the editor: upload images (the first is the main image), set price, discount, stock, categories, brand and badge. The *Hot* badge puts a product on the Deals page. Products that appear in past orders are set to out of stock instead of deleted.
- **Coupons** — create codes like `WELCOME10`: percentage or fixed amount, optional minimum subtotal, maximum discount, start/end dates, total uses and *once per customer*. Toggle a code off at any time.
- **Reviews** — the *Pending* tab lists new reviews. Approve to publish or reject with a note.
- **Account Requests** — approve Premium or Business applications. The sidebar badge shows how many are pending.
- **Email Marketing**
  1. Write the subject and message (leave a blank line between paragraphs). The button text and link are optional.
  2. Click **Send test to me** to preview in your inbox.
  3. Click **Send to all subscribers**. Every email includes an unsubscribe link (`/newsletter/unsubscribe`).
  4. The subscriber table below supports search, filters, delete and CSV export.
- **Employees** — pick a registered user and assign a role. Suspend or activate staff at any time.
- **Settings** — panel title, logo URL, accent color, store name, currency symbol, support contact, **delivery charge** (added to every order, whatever the payment method) with an optional free-delivery amount, and the storefront announcement bar. Changes apply immediately.

---

## 9. Employee portal

Staff sign in normally and open **`/employee`** (also linked in their account menu). Each role sees only the orders it works on:

| Role | Responsibilities |
| --- | --- |
| `callcenter` | Confirm the customer's address, then confirm the order |
| `packer` | Pack confirmed orders |
| `warehouse` | Assign packed orders to a delivery person |
| `deliveryman` | Start delivery, mark delivered or failed, reschedule, collect cash |
| `accounts` | Receive cash from delivery staff; view payment analytics |
| `incharge` | Can perform every step; view team analytics |

Every action is recorded on the order (who did it and when) and in its status history. Customers are notified as the status changes.

---

## 10. Branding & customization

| What | Where |
| --- | --- |
| Store name, description, URL, social links (code defaults) | `config/brand.ts` (or the matching env variables) |
| Contact page details | `config/contact.ts` / env variables |
| Logo in header and footer | `components/common/Logo.tsx` |
| Theme colors | `app/globals.css` (`--color-shop_dark_green`, `--color-shop_light_green`, `--color-shop_orange`, …) |
| Admin title, logo, accent color, announcement bar | **Admin → Settings** (no code needed) |
| FAQ content | `constants/index.ts` |
| About / Terms / Privacy pages | `app/(client)/(public)/...` |
| Email templates | `lib/emailService.ts`, `app/api/newsletter/subscribe/route.ts` |
| Open Graph image | add `public/og-image.jpg` (1200×630) |
| "Powered by WebHaat" footer credit | `NEXT_PUBLIC_SHOW_POWERED_BY=false` hides it |

---

### SEO checklist after launch

1. **Admin → SEO & Branding**: upload the logo, a square 512×512 PNG icon and a 1200×630 share image; write the home title (30–60 characters) and description (70–160 characters).
2. Verify the domain in **Google Search Console** (paste the HTML-tag code) and **Bing Webmaster Tools**.
3. Submit `https://your-domain/sitemap.xml` in both. The sitemap lists every product (with image), category, brand and blog post and refreshes hourly.
4. Add your GA4 / Meta Pixel IDs to start tracking.
5. Make sure *Hide the whole store from search engines* is **off** on the live site.

### Storefront design

- Minimal boutique look: light gray page, black type, portrait product photos, General Sans font (self-hosted in `app/fonts/`, ITF Free Font License).
- Colors live in `app/globals.css` (`@theme`): `ink` = text, `clay` = primary accent (black), `cream` = page background, `sand` = image/panel background, `sale` = discount red.
- Product photos look best in **portrait 4:5** (e.g. 1200×1500). Category and banner images are cropped to fill their tiles.
- Home hero uses the three newest **Banner** documents from Content Studio (falls back to the newest products). Categories and brands appear automatically once added.
- Information pages (About, Delivery & returns, Terms, Privacy, FAQs, Help, Contact) are in `app/(client)/(public)/` — edit the text there. Delivery charge, payment methods, phone and email are filled in from Admin automatically.

### Mobile app experience

- Phones and tablets get a floating bottom navigation (Home, Browse, Search, Cart with count, Account), a compact header whose search row hides while scrolling, and sticky "Add to cart" / "Checkout" bars.
- The site ships a web app manifest (`/manifest.webmanifest`), so customers can **Add to Home Screen** on Android/iOS and open it full-screen like an app. The icon and theme color come from Admin → SEO & Branding.

## 11. Deployment

### Vercel (recommended)

1. Push the code to a Git repository (your fork).
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add all variables from your `.env` in **Project → Settings → Environment Variables**, and set `NEXT_PUBLIC_BASE_URL` to your live domain.
4. Deploy, then:
   - Add the domain to Sanity CORS origins and to Clerk (production instance).
   - Create the Stripe webhook for `https://your-domain.com/api/webhook`.

### Any Node.js host (VPS, Railway, Render…)

```bash
npm ci
npm run build
npm start          # listens on port 3000 (use PORT=8080 npm start to change)
```

Run it behind a reverse proxy (Nginx or Caddy) with HTTPS, and use a process manager such as `pm2`.

---

## 12. Security notes

- **Customer data in a public Sanity dataset.** Orders, customers, addresses, reviews, contact messages, newsletter subscribers, coupons, campaigns, the audit log and payment settings are stored in Sanity. Sanity's **free plan only offers public datasets**: anyone who knows your project id (it is in the page source) can download every document *without a token*. The one exception is documents whose `_id` contains a dot (`private.order.2f1c…`) — Sanity treats those as private and only returns them to authenticated requests.
  - **How the store uses this:** every non-catalog document is created with a private id from `lib/privateId.ts` (`privateId("order")` → `private.order.<uuid>`). Catalog content (products, categories, brands, banners, blog, store settings) stays public on purpose. The server reads private documents with `SANITY_API_READ_TOKEN` / `SANITY_API_TOKEN`, so the site works the same.
  - **Upgrading an existing store:** documents created before this change still have public ids. Back up (`npx sanity dataset export production backup.tar.gz`), then run the migration **once**:
    ```bash
    npx tsx scripts/migrate-private-ids.ts --dry-run   # shows what would move, writes nothing
    npx tsx scripts/migrate-private-ids.ts --apply     # moves docs to private.<type>.<oldId>, rewrites references, deletes the originals
    ```
    It reads `.env.local` (needs `SANITY_API_TOKEN` with write access) and ends by querying the API **without a token**; it must report `0` private-type documents. Old order links in past emails keep working (the order page also looks up `private.order.<oldId>`).
  - **Verify any time** (no token — this is what a stranger sees; the result must be `0`):
    ```bash
    curl "https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=count(*%5B_type%20in%20%5B%22order%22%2C%22user%22%2C%22address%22%2C%22review%22%2C%22contact%22%2C%22subscription%22%2C%22coupon%22%2C%22emailCampaign%22%2C%22sentNotification%22%2C%22paymentSettings%22%2C%22auditLog%22%5D%5D)"
    ```
  - Documents created by hand in **Sanity Studio** get a normal (public) id. Create coupons, users etc. from the admin panel instead, or re-run the migration afterwards.
  - On a paid Sanity plan you can additionally set the dataset to **Private** ([sanity.io/manage](https://www.sanity.io/manage) → project → **Datasets**); then nothing is readable without a token.
- All order totals are computed on the server (`lib/pricing.ts`); payment gateways are charged the stored total and payments are verified server-to-server before an order is marked paid.

- Admin rights come only from `ADMIN_EMAILS` (server-only; the older `NEXT_PUBLIC_ADMIN_EMAIL` is still read as a fallback, but every `NEXT_PUBLIC_*` value is copied into the browser bundle, so it publishes your admin addresses — move the list to `ADMIN_EMAILS` and delete it), matched against the user's **verified** primary email in Clerk — never from data stored in Sanity. The proxy (`proxy.ts`) blocks `/admin`, `/studio`, `/api/admin/*` and `/api/analytics/*` for non-admins, and every admin route and server action checks again on its own (`lib/adminAuth.ts`).
- Customer APIs only ever act on the signed-in user's own data (profile, addresses, reviews, account applications) — ids or emails sent by the browser are ignored or checked for ownership.
- Public forms (contact, newsletter, checkout, order placement, reviews) are rate-limited (`lib/rateLimit.ts`), per signed-in user where possible and otherwise per IP (taken from `x-real-ip` / `x-vercel-forwarded-for` before `x-forwarded-for`). Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (free Upstash Redis database) to share the counters across all server instances; without them each instance counts in memory.
- The contact and newsletter forms have a hidden honeypot field and optional [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) bot protection: set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` to turn it on.
- Login redirects (`?redirectTo=`) only accept same-site paths (`lib/safeRedirect.ts`).
- Newsletter unsubscribe links are signed, so nobody can unsubscribe someone else.
- Security headers (HSTS, clickjacking protection, nosniff, referrer and permissions policy) are sent on every page (`next.config.ts`). Structured data and emails escape user-entered text.
- On startup the server logs missing or unsafe configuration (`instrumentation.ts`), e.g. test Clerk keys or a non-https base URL.
- Dependencies: `npm audit` reports 0 known vulnerabilities. A few transitive packages are pinned to patched versions via `overrides` in `package.json`.
- Employee-management server actions check that the caller is an admin, and order-processing actions check the employee's role.
- The fake "Clerk payment" gateway from the original template was removed, and so was the open `/api/orders/send-email` endpoint.
- Wallet credits can only be added from server code (`lib/walletCredit.ts`). They cannot be triggered from the browser.
- CSV exports neutralize spreadsheet formulas to prevent CSV injection.
- Keep `SANITY_API_TOKEN`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY` and the Google secrets private. If they were ever committed to git or shared, **rotate them** in each provider's dashboard.

---

### Launch checklist

1. **Sanity:** run `npx tsx scripts/migrate-private-ids.ts --apply` once if the store has data from before private ids, check that the unauthenticated `curl` above returns `0` (or set the dataset to **Private** on a paid plan); add your domain to CORS origins.
2. **Clerk:** create a *production* instance, use its keys (`pk_live_…`/`sk_live_…`), add your domain, and set the application name (it appears as "Sign in to …").
3. **Environment:** `NEXT_PUBLIC_BASE_URL=https://your-domain`, a strong `PAYMENT_ENCRYPTION_KEY`, `ADMIN_EMAILS` (not `NEXT_PUBLIC_ADMIN_EMAIL`), email settings (SMTP or Gmail).
4. **Payments:** switch gateways from sandbox to live in Admin → Payments; create the Stripe webhook for `/api/webhook`.
5. **Secrets:** if any key was ever committed or shared, rotate it before launch.
6. Check the server log after the first deploy — `[config]` lines list anything still missing.

---

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Missing environment variable: NEXT_PUBLIC_SANITY_...` | Fill in the Sanity variables in `.env` and restart |
| A payment option is missing at checkout | Enable it in Admin → Payments and fill in its credentials — only configured methods are shown |
| "Set PAYMENT_ENCRYPTION_KEY…" when saving payments | Add `PAYMENT_ENCRYPTION_KEY` to `.env` and restart |
| bKash/Nagad "require the store currency to be BDT" | Set `NEXT_PUBLIC_CURRENCY=BDT` |
| Products or pages show nothing after making the dataset private | Set `SANITY_API_READ_TOKEN` (Viewer token) and restart |
| Coupon "not valid" | Check it is active, not expired, under its usage limit and the cart meets the minimum subtotal |
| `/admin` redirects to access-denied | Your sign-in email must be listed exactly in `NEXT_PUBLIC_ADMIN_EMAIL`. Restart after changing `.env` |
| Products don't appear | Publish them in `/studio`, and check CORS origins and the dataset name |
| Orders stay unpaid after Stripe payment | Check the webhook URL (`/api/webhook`) and `STRIPE_WEBHOOK_SECRET`. Locally, run `stripe listen` |
| Emails not sent | Check the Google OAuth variables. Refresh tokens from an OAuth app in "Testing" mode expire after 7 days, so publish the app |
| Stale data or odd build errors | Delete the `.next` folder and restart |

---

## 14. Project structure

```
app/
  (client)/            Storefront pages (shop, product, cart, checkout, user account, blog…)
  (auth)/              Clerk sign-in / sign-up pages
  (admin)/admin/
    (panel)/           Admin pages (server-guarded layout + AdminShell sidebar)
    access-denied/
  (employee)/employee/ Employee portal
  api/                 API routes (admin/*, orders, checkout, webhook, newsletter, user…)
  studio/              Embedded Sanity Studio
actions/               Server actions (orders, employees, wallet, reviews, users…)
components/
  admin/               Admin UI (AdminShell, dashboards, reports, settings, campaigns…)
  ui/                  shadcn/ui primitives
config/                brand.ts, contact.ts
lib/                   adminAuth, storeSettings, emailService, seo, cache, points…
sanity/                Schema types, GROQ queries, Sanity clients
docs/                  Extra technical notes (employee system, reviews, caching, SEO…)
proxy.ts               Clerk middleware (auth for protected routes)
website/               Separate sales website for setup & maintenance orders (own package.json)
```

---

## 15. Professional setup & maintenance

WebHaat is free. If you would rather have it set up and looked after for you, we offer paid services:

| Service | What you get |
| --- | --- |
| **Setup** (one-time) | Deployment, domain and SSL, your logo and colours, payment methods (COD, send-money, bKash/Nagad merchant, SSLCommerz, Stripe), email, SEO basics, product upload, admin training |
| **Maintenance** (monthly or yearly) | Security patches and updates, backups, uptime monitoring, hosting management, a set number of hours for changes each month, priority support |
| **Custom work** | New features, design changes, moving from another platform |

Packages, prices and the order form are on [get.webhaat.org](https://get.webhaat.org).

---

## 16. License

WebHaat is licensed under the **GNU Affero General Public License v3.0** ([LICENSE](LICENSE)).

In short:

- You can use it for any purpose, including running your own commercial store, at no cost.
- You can change it. If you run a **modified** version that other people use over a network (for example a public store), you must make your modified source code available to them under the same license.
- You can't take the code, close it and resell it as your own product.

If you want to use WebHaat in a closed-source product or SaaS without the AGPL obligations, a **commercial license** is available. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

The name "WebHaat" and its logo are not covered by the code license. See [TRADEMARK.md](TRADEMARK.md).

This summary is for convenience only; the [LICENSE](LICENSE) text is what counts.

---

## 17. Contributing & security

- Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.
- Found a security problem? **Don't open a public issue.** Follow [SECURITY.md](SECURITY.md).

---

© 2026 WebHaat contributors. Licensed under AGPL-3.0.
