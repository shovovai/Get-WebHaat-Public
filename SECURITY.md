# Security Policy

WebHaat handles orders, customer data and payment gateway credentials, so we take security reports seriously.

## Reporting a vulnerability

**Please don't open a public GitHub issue for security problems.**

Report it privately through GitHub: open the **Security** tab of this repository and click **Report a vulnerability**.

Include:

- what is affected (file, route or feature)
- steps to reproduce or a proof of concept
- the impact you expect (for example, reading other customers' orders, changing prices, bypassing admin checks)

## What happens next

- We aim to reply within **3 working days**.
- We will confirm the problem, work on a fix and agree a disclosure date with you.
- We credit reporters in the release notes unless you ask us not to.

## Supported versions

Only the latest release on the `main` branch receives security fixes. Stores on a maintenance plan are patched by us; self-hosted stores should update regularly.

## Scope

In scope: the code in this repository.

Out of scope: problems in third-party services (Sanity, Clerk, Stripe, SSLCommerz, bKash, Nagad) unless WebHaat uses them unsafely, and attacks that need access to a store's server or admin account.
