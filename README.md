# StellarPay Lite

StellarPay Lite is a responsive payment dApp for the Stellar Testnet. The finished application will let users connect a Freighter wallet, view their XLM balance, send Testnet XLM, and receive clear transaction feedback.

This repository currently contains the Phase 2 project foundation. Wallet connection, balance fetching, and payment transactions are intentionally not implemented yet.

## Planned features

- Connect and disconnect a Freighter wallet
- Display the connected account and its XLM balance
- Send XLM on the Stellar Testnet
- Show transaction progress, errors, and success feedback
- Display the resulting transaction hash
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
```

## Testnet only

StellarPay Lite is intended exclusively for the **Stellar Testnet** during development. Testnet assets have no real-world value. Never enter, share, request, or store a wallet secret key or recovery phrase in this application.
