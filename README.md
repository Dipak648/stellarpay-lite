# StellarPay Lite

[![CI](https://github.com/Dipak648/stellarpay-lite/actions/workflows/ci.yml/badge.svg)](https://github.com/Dipak648/stellarpay-lite/actions/workflows/ci.yml) [![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7b61ff)](https://developers.stellar.org/docs/networks)

StellarPay Lite is a Level 1 Simple Payment dApp for sending native XLM on the Stellar Testnet. It connects Freighter, verifies the Testnet network, displays the active account balance, guides the user through payment review and signing, and reports the confirmed transaction result.

## Project description

Users can connect and disconnect Freighter, verify Stellar Testnet, view native XLM, review a payment, sign it through Freighter, submit Testnet XLM to an existing funded recipient, and view success or failure feedback with the transaction hash.

## Level 1 requirements

| Requirement | Status | Implementation |
| --- | --- | --- |
| Freighter setup | Implemented | Official installation guidance and Testnet setup instructions |
| Testnet usage | Implemented | Testnet passphrase is verified before wallet use and signing |
| Connect wallet | Implemented | Explicit Freighter access request from the Connect button |
| Disconnect wallet | Implemented | Clears the application session and wallet-change watcher |
| Fetch XLM balance | Implemented | Native XLM loaded from the Testnet Horizon endpoint |
| Display balance | Implemented | Decimal-safe balance display with loading, unfunded, and error states |
| Send XLM | Implemented | One native XLM payment is reviewed, signed, and submitted on Testnet |
| Success/failure feedback | Implemented | Preparing, signing, submitting, success, rejection, failure, and timeout states |
| Transaction hash | Implemented | Valid confirmed hash, copy action, and Stellar Expert Testnet link |
| Public repository | Implemented | [Dipak648/stellarpay-lite](https://github.com/Dipak648/stellarpay-lite) |
| README documentation | Implemented | Setup, usage, architecture, safety, testing, and limitations documented here |

## Features

- Freighter wallet connection, disconnection, and account/network monitoring
- Strict decimal-string validation without floating-point transaction amounts
- Review-before-signing flow
- Accessible labels, status announcements, and copy feedback
- Safe Stellar Expert Testnet explorer links
- Responsive mobile, tablet, and desktop interface
- Error boundary with a safe recovery screen
- Automated mocked unit and component tests
- GitHub Actions CI for lint, tests, coverage, and production builds

## Technology stack

- React 19
- TypeScript 6
- Vite 8
- `@stellar/stellar-sdk` 16
- `@stellar/freighter-api` 6
- Stellar Horizon Testnet
- Vitest 4
- React Testing Library
- GitHub Actions

## Architecture

- `src/components`: semantic UI cards, forms, wallet controls, transaction results, and error boundary.
- `src/hooks`: wallet, balance, and payment state orchestration.
- `src/lib`: Freighter, Horizon, payment, validation, and formatting adapters.
- `src/types`: shared payment hook types.
- `src/**/*.test.*`: mocked integration, hook, library, and component tests.
- `.github/workflows/ci.yml`: Node 22 quality workflow for pull requests and `main` pushes.

## Local setup

Prerequisites: Node.js 22 LTS (or a current compatible Node.js release), npm, and a modern browser.

```bash
git clone https://github.com/Dipak648/stellarpay-lite.git
cd stellarpay-lite
npm ci
```

Optional environment setup:

```powershell
Copy-Item .env.example .env
```

Start the development server:

```bash
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Environment configuration

The optional public configuration is:

```text
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
```

The Testnet endpoint above is the default. Overrides must use HTTPS and cannot contain a username or password; credential-bearing URLs are rejected. This value is not a secret. No private key, secret key, or recovery phrase is needed by the application.

## Freighter setup

1. Install [Freighter](https://www.freighter.app/) from the official source.
2. Create or select a wallet account in the extension.
3. Select **Stellar Testnet** in Freighter.
4. Fund the account using an official Testnet method such as [Stellar Lab account tools](https://developers.stellar.org/docs/tools/lab/account).
5. Never share the wallet recovery phrase or private key.

The app requests access only after the user selects **Connect Freighter**. Disconnect clears this app session; Freighter API 6.0.1 does not expose a supported revoke method, so site authorization may remain in the extension.

## Usage

1. Open the app.
2. Connect Freighter.
3. Confirm that Freighter is using Stellar Testnet.
4. Check the displayed native XLM balance.
5. Enter a funded Testnet recipient address.
6. Enter an amount with no more than seven decimal places.
7. Review the sender, recipient, amount, fee, and network.
8. Confirm the signing request in Freighter.
9. Wait for Horizon to confirm the submission.
10. Open the confirmed transaction in Stellar Expert Testnet.

## Transaction lifecycle

The app validates the address, amount, sender, balance, and Testnet state; prepares a fresh transaction for review; rechecks the wallet immediately before signing; requests an explicit Freighter signature; submits the signed transaction once to Horizon; requires a valid transaction hash for confirmation; and refreshes the balance only after confirmed success.

## Error handling

Common user-facing states include:

- Freighter unavailable or locked: install or unlock Freighter, then check again.
- Wrong network: switch Freighter to Stellar Testnet.
- Invalid address or amount: correct the Stellar G-address or decimal amount.
- Unfunded recipient: fund the destination first; a standard payment cannot create it.
- Insufficient balance or reserve: reduce the amount so the payment, fee, and reserve remain covered.
- Signature rejected: approve the request in Freighter or review again.
- Sequence error: prepare and sign a new transaction.
- Timeout: wait for the network and review a new payment.
- Horizon unavailable: retry later; ambiguous submission failures are never automatically retried.

## Security

- Testnet only; Testnet assets have no real-world value.
- No secret key or recovery phrase handling.
- Freighter performs transaction signing.
- Stellar Testnet network passphrase is checked before wallet use and signing.
- Transaction amounts remain decimal strings rather than JavaScript floating-point values.
- Ambiguous Horizon submissions are not automatically resubmitted.
- User-facing errors and development logs are sanitized.
- Horizon configuration requires HTTPS and rejects credential-bearing URLs.
- Dependencies are checked with `npm audit`.

## Testing

```bash
npm test -- --run
npm run test:watch
npm run test:coverage
npm run lint
npm run build
```

The current suite has **55 passing tests**. Wallet, payment, and balance tests mock Freighter and Horizon; tests never open a wallet popup, call a live Horizon service, or submit a transaction. Coverage thresholds are 75% statements, 70% branches, 78% functions, and 75% lines.

## CI/CD

GitHub Actions runs on pushes to `main` and pull requests targeting `main`. It uses Ubuntu with Node.js 22, installs with `npm ci`, then runs lint, non-watch tests, coverage, and the production build. The workflow uses read-only repository permissions, requires no wallet secrets, performs no deployment, and never submits a Stellar transaction. Deployment instructions and a live URL will be added in Phase 11.

## Screenshots

Screenshots are intentionally not fabricated. Final submission screenshots will be added after deployment testing for:

- Wallet connected
- XLM balance displayed
- Successful transaction result
- Mobile responsive view

## Known limitations

- Stellar Testnet only.
- Native XLM payments only; issued assets are not supported.
- Standard payments require an existing funded recipient account.
- Application disconnect does not revoke Freighter site authorization.
- Transaction history is not implemented.
- Ambiguous submission failures are not automatically retried.

## Project structure

```text
.
├── .github/workflows/ci.yml
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── test/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── eslint.config.js
├── package.json
├── vite.config.ts
└── README.md
```

`node_modules`, `dist`, and `coverage` are generated or local-only directories and are excluded from this tree.

## License

No license file has been selected in the repository. The `package.json` metadata currently contains `MIT`, but no license text is included; licensing should be finalized separately.

## Testnet-only notice

StellarPay Lite is intended exclusively for the **Stellar Testnet** during development. Never enter, share, request, or store a wallet secret key or recovery phrase in this application.
