export function Header() {
  return (
    <header className="site-header">
      <div className="header-content">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <p className="eyebrow">Simple payments on Stellar</p>
            <h1>StellarPay Lite</h1>
          </div>
        </div>
        <span className="network-badge">
          <span className="badge-dot" aria-hidden="true" />
          Stellar Testnet
        </span>
      </div>
      <p className="subtitle">
        Connect, review, and send XLM with a clear, focused payment experience.
      </p>
    </header>
  )
}
