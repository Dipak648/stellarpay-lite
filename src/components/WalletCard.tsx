export function WalletCard() {
  return (
    <section className="card wallet-card" aria-labelledby="wallet-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Wallet</p>
          <h2 id="wallet-title">Connect your wallet</h2>
        </div>
        <span className="status-pill status-pill--neutral">Disconnected</span>
      </div>

      <p className="card-copy" id="wallet-requirements">
        Freighter must be installed and set to Stellar Testnet. Wallet
        connection will be enabled in the next development phase.
      </p>

      <button
        className="button button--primary button--full"
        type="button"
        disabled
        aria-describedby="wallet-requirements"
      >
        Connect Freighter
      </button>
    </section>
  )
}
