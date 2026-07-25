# StellarPay Lite

StellarPay Lite is a responsive payment dApp for the Stellar Testnet. The application lets users connect a Freighter wallet, view their native XLM balance, review a Testnet payment, sign it in Freighter, submit it once to Horizon, and see the resulting transaction feedback and hash.

This repository currently contains the responsive interface, real Freighter connection flow, native XLM balance loading from Stellar Testnet, and the Testnet payment review/sign/submit flow.

## Freighter and Testnet

Install the official [Freighter wallet](https://www.freighter.app/) browser extension before running the dApp. In Freighter, open network settings and select **Testnet** before connecting.

StellarPay Lite requests access only after you select **Connect Freighter**. The app reads the selected public address and network details; it never requests a private key, secret key, or recovery phrase.

When you select **Disconnect**, the app clears its own session state and stops wallet-change monitoring. Freighter API 6.0.1 does not expose a supported disconnect or permission-revocation method, so the site may remain authorized inside Freighter. The app does not automatically reconnect after an app-session disconnect.

## Payment review and signing

Payment entry is intentionally conservative:

- the recipient address must be a valid Stellar G-address
- the amount must be a strict decimal string with at most seven decimal places
- the app builds exactly one native XLM payment operation
- the review step happens before Freighter opens the signing prompt
- Freighter signs only after you explicitly confirm the review
- the signed transaction is submitted once to Horizon
- ambiguous failures are not auto-resubmitted
- the MAX button stays disabled until reserve-aware max calculation exists

The transaction result card shows the confirmed Testnet transaction hash, a copy button, and a link to the explorer for verification. In the current UI, that explorer link points to Stellar Expert on Testnet.

## Testnet XLM balance

After a verified Testnet wallet connection, StellarPay Lite loads the account through Horizon and displays only its native XLM balance. Issued assets and trustlines are not treated as XLM. Balance values remain decimal strings, preserving Stellar's seven decimal places without JavaScript floating-point conversion.

The default endpoint is `https://horizon-testnet.stellar.org`. You can select another HTTPS Horizon endpoint in `.env`:

```bash
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
```

The endpoint is public configuration and must not contain credentials or secrets.

A valid public address may not exist on the Testnet ledger until it is funded. The UI identifies Horizon 404 responses as unfunded accounts and links to the official Stellar Lab Friendbot instructions. StellarPay Lite does not make Friendbot funding requests.

Payment recipients must already exist on Testnet. Standard XLM payments cannot create the destination account; if the recipient is unfunded, you must fund it first.

## Planned features

- Connect and disconnect a Freighter wallet on Testnet
- Display the connected account and its XLM balance
- Send XLM on the Stellar Testnet after an explicit review step
- Show transaction progress, errors, and success feedback
- Display and copy the resulting transaction hash
- Work well across mobile and desktop screen sizes

## Technology stack

- React
- TypeScript
- Vite
- Stellar SDK and Freighter API
- Vitest
- React Testing Library
- ESLint

## Local setup

Prerequisites: a current Node.js LTS release and npm.

```bash
git clone https://github.com/Dipak648/stellarpay-lite.git
cd stellarpay-lite
npm install
cp .env.example .env
npm run dev
```

Run the quality checks:

```bash
npm test
npm run lint
npm run build
npm audit
```

## Current limitations

The wallet can connect, its Testnet status can be verified, its native XLM balance can be loaded, and Testnet payments can be reviewed, signed, and submitted. Friendbot funding is still manual, and transaction history is not implemented yet.

## Testnet only

StellarPay Lite is intended exclusively for the **Stellar Testnet** during development. Testnet assets have no real-world value. Never enter, share, request, or store a wallet secret key or recovery phrase in this application.
