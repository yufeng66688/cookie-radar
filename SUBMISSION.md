# Cookie Radar — Superteam Earn Submission Pack

Use this file as the final submission checklist. Both live URLs below are filled
in, then submit to
[Create an App on Cookie Chain](https://superteam.fun/earn/listing/create-an-app-on-cookie-chain-app).

## Submission fields

### Live application URL

```text
https://yufeng66688.github.io/cookie-radar/
```

The app can be hosted on Vercel, Netlify, Cloudflare Pages, or any static host.
Run `npm run build` and point the host at `dist/`.

### GitHub repository

```text
https://github.com/yufeng66688/cookie-radar
```

The repository must be public and include:

- `README.md` with setup instructions
- `SUBMISSION.md` with this checklist
- `LICENSE`
- source under `src/`
- `package.json` and lockfile
- `vercel.json` / `netlify.toml` deployment configs

### Application / program addresses

There is no custom contract or token used by the application. The on-chain
interaction targets the community Memo program:

```text
MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
```

Cookie Chain network parameters used by the app:

```text
RPC:           https://rpc.cookiescan.io
Genesis hash:  9wDaBRDgArEUpvhHxGguNkwozsZh4UpGZB9o2EoEcBB2
Explorer:      https://cookiescan.io
Bridge:        https://bridge.cookiescan.io
DAS API:       https://api.cookiescan.io
Markets API:   https://api.cookiescan.io/api/markets
```

## Required feature verification

Run these checks before submitting:

1. Open the deployed URL in Chrome or Brave.
2. Install Nightly if it is not already installed.
3. Click **Connect Nightly** and approve the Cookie Chain network switch.
4. Confirm the connected address is displayed in the wallet card.
5. Confirm the address links to Cookiescan.
6. Type a message and click **Post crumb**.
7. Approve one signature in Nightly.
8. Confirm the status moves through **Sign → Send → Confirm**.
9. Confirm the new signature appears in the feed and in Cookiescan.
10. Refresh the page and confirm the wallet reconnects or can be reconnected.
11. Confirm chain stats, activity chart, market radar, and bridge guide render.
12. Connect a wallet with assets and confirm the DAS asset grid is populated.
13. Try disconnecting / clearing a signature and confirm friendly error feedback.
14. Open the Cookiebox quote card, choose a pair, and confirm a route is returned.
15. Optional: with a funded wallet, execute one small swap and confirm the signature.

## Demo script (about 45 seconds)

1. Show the live chain status cards.
2. Show the public feed updating.
3. Click **Connect Nightly** and approve the network switch.
4. Type a short tagline, e.g. `Built on Cookie Chain #cookiechain`.
5. Approve the wallet signature.
6. Show the confirmation and open Cookiescan.
7. Scroll to the liquidity radar and bridge guide.

## X thread requirements

See `X_THREAD.md` for a ready-to-post thread. The thread must:

- explain what Cookie Radar does
- show a short usage walkthrough
- link the Cookie Chain Bridge
- link the app and GitHub repository
- tag `@TheCookieChain`

## Telegram requirement

After publishing the X thread, open
[Cookie Chain Telegram](https://t.me/TheCookieNetChain) and share the thread with a
one-line note, for example:

> Just built Cookie Radar, a live Cookie Chain dashboard + on-chain crumb board.
> Connect Nightly, post a memo, watch it confirm. 🍪 [X thread link]

## Deadline

The listing closes at `2026-09-22T21:59:59.000Z`, which is
`2026-09-23 05:59` Beijing time. Aim to deploy and publish at least one day early.
