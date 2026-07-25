interface BalanceCardProps {
  isWalletConnected: boolean
}

export function BalanceCard({ isWalletConnected }: BalanceCardProps) {
  return (
    <section className="card balance-card" aria-labelledby="balance-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Available balance</p>
          <h2 id="balance-title" className="balance-value">
            <span aria-label="Balance unavailable">—</span>{' '}
            <span className="balance-currency">XLM</span>
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          disabled
          aria-label="Refresh XLM balance"
          title={
            isWalletConnected
              ? 'Balance refresh will be added in a later phase'
              : 'Connect a wallet to refresh the balance'
          }
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>
      <p className="card-copy">
        {isWalletConnected
          ? 'Balance fetching will be added in the next phase.'
          : 'Your balance will appear after wallet connection.'}
      </p>
    </section>
  )
}
