function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <span className="network-badge">Stellar Testnet</span>
        <h1 id="app-title">StellarPay Lite</h1>
        <p className="description">
          A focused payment dApp for connecting Freighter, viewing XLM, and
          sending payments safely on the Stellar Testnet.
        </p>
        <p className="setup-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Project setup complete
        </p>
      </section>
    </main>
  )
}

export default App
