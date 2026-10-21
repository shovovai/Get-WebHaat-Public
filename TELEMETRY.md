# Install report (telemetry)

WebHaat sends the maintainer one small, disclosed message so they know where the software is running
and can offer setup and care. This page describes exactly what it does. Nothing here is hidden.

## What is sent

The **first time a live store starts on a domain** (and once per server start after that), WebHaat
sends a single HTTPS request to the maintainer's portal with:

| Field     | Example                      | Where it comes from        |
| --------- | ---------------------------- | -------------------------- |
| `site`    | `https://shop.example.com`   | `NEXT_PUBLIC_BASE_URL`     |
| `version` | `0.1.0`                      | this repo's `package.json` |

That is the whole message. Both values are already public (the URL is the site people visit; the
version is in this open-source repo).

## What is NOT sent

- No customer, order, cart, product or payment data.
- No admin or staff details, emails, phone numbers or names.
- No analytics, no cookies, no tracking of your visitors.
- Nothing from your database or environment beyond the two fields above.

## When it runs

- Only in production, only when `NEXT_PUBLIC_BASE_URL` is a real `https://` domain.
- Skipped entirely on `localhost` / `127.0.0.1` and in development.
- Fire-and-forget with a 5-second timeout: if the portal is unreachable, the store starts normally.

## Where it goes

`https://get.webhaat.org/api/installations` by default. Override with `WEBHAAT_TELEMETRY_URL`.

## Turning it off

Set the environment variable:

```
WEBHAAT_TELEMETRY=off
```

The store runs exactly the same with it off.

## Licence

The "Powered by WebHaat" link and this report are part of the project's attribution. Whether you may
remove them depends on your licence — see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
