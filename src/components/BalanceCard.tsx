import type { BalanceController } from '../hooks/useBalance'
import { formatXlmBalance } from '../lib/formatBalance'

interface BalanceCardProps extends BalanceController {
  isWalletConnected: boolean
}

export function BalanceCard({
  isWalletConnected,
  status,
  balance,
  errorMessage,
  lastUpdated,
  refresh,
}: BalanceCardProps) {
  const isLoading = status === 'loading'
  const canRefresh = isWalletConnected && !isLoading

  const balanceDisplay =
    status === 'success' && balance ? formatXlmBalance(balance) : '—'

  return (
    <section className="card balance-card" aria-labelledby="balance-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Available balance</p>
          <h2 id="balance-title" className="balance-value">
            <span aria-label={status === 'success' ? undefined : 'Balance unavailable'}>
              {isLoading ? (
                <span className="balance-loading" aria-hidden="true">
                  ···
                </span>
              ) : (
                balanceDisplay
              )}
            </span>{' '}
            <span className="balance-currency">XLM</span>
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          disabled={!canRefresh}
          onClick={() => void refresh()}
          aria-label={isLoading ? 'Refreshing XLM balance' : 'Refresh XLM balance'}
          title={
            isWalletConnected
              ? 'Refresh XLM balance'
              : 'Connect a wallet to refresh the balance'
          }
        >
          <span aria-hidden="true" className={isLoading ? 'refreshing-icon' : ''}>
            ↻
          </span>
        </button>
      </div>

      <div className="balance-status" role="status" aria-live="polite">
        {status === 'idle' && (
          <p className="card-copy">
            Your Testnet balance will appear after wallet connection.
          </p>
        )}

        {status === 'loading' && (
          <p className="card-copy">Loading the native XLM balance…</p>
        )}

        {status === 'success' && (
          <p className="card-copy">
            Native XLM on Stellar Testnet
            {lastUpdated && (
              <>
                {' '}
                · Updated{' '}
                <time dateTime={lastUpdated.toISOString()}>
                  {lastUpdated.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </>
            )}
          </p>
        )}

        {status === 'unfunded' && (
          <div className="balance-guidance">
            <p className="card-copy">
              This valid Testnet address has not been funded yet.
            </p>
            <a
              href="https://developers.stellar.org/docs/tools/lab/account"
              target="_blank"
              rel="noreferrer"
            >
              Learn how to fund it with Friendbot
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="balance-error">
            <p className="card-copy">{errorMessage}</p>
            <button
              className="retry-button"
              type="button"
              onClick={() => void refresh()}
            >
              Retry balance
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
