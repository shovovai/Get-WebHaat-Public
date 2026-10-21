# Contributing to WebHaat

Thanks for helping. Bug reports, fixes, translations and documentation improvements are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.

## Development

```bash
cp .env.example .env.local   # fill in your own Sanity / Clerk keys
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Keep pull requests focused on one change, and describe what you changed and how you tested it.

## License of contributions

WebHaat is offered under the AGPL-3.0 and also under a [commercial license](COMMERCIAL-LICENSE.md). To keep that possible, by submitting a contribution you agree that:

1. You wrote it, or you have the right to submit it.
2. It is licensed to the project under the AGPL-3.0, **and** you grant the project maintainers a perpetual, worldwide, royalty-free right to also distribute your contribution under other license terms, including the commercial license.

Add a `Signed-off-by: Your Name <email>` line to your commits (`git commit -s`) to confirm this.
