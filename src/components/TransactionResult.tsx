import { useState } from 'react'
import type { ReturnTypeUsePayment } from '../types/payment'

export function TransactionResult({ payment }: { payment: ReturnTypeUsePayment }) {
  const [copyMessage, setCopyMessage] = useState('')
  const progress: Record<string, string> = {
    preparing: 'Preparing the payment and rechecking the active wallet.',
    'awaiting-signature': 'Waiting for Freighter confirmation.',
    submitting: 'Submitting the signed transaction to Stellar Testnet.',
  }

  if (payment.status === 'success' && payment.success) {
    const explorer = `https://stellar.expert/explorer/testnet/tx/${payment.success.hash}`
    return (
      <section
        className="card transaction-result transaction-result--success"
        aria-labelledby="transaction-title"
        role="status"
      >
        <span className="result-icon" aria-hidden="true">
          ✓
        </span>
        <div className="result-content">
          <p className="result-success">Payment successful on Stellar Testnet.</p>
          <h2 id="transaction-title">Successful</h2>
          <p>
            {payment.success.amount} XLM was sent to{' '}
            <code>{payment.success.recipient}</code>.
          </p>
          <code className="hash-value">{payment.success.hash}</code>
          <div className="result-actions">
            <a href={explorer} target="_blank" rel="noreferrer">
              View on Stellar Expert
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payment.success!.hash)
                  setCopyMessage('Hash copied')
                } catch {
                  setCopyMessage('Could not copy hash')
                }
              }}
            >
              Copy hash
            </button>
            <button type="button" onClick={payment.reset}>
              Send Another Payment
            </button>
          </div>
          <p className="copy-feedback" aria-live="polite">
            {copyMessage}
          </p>
        </div>
      </section>
    )
  }

  if (
    payment.failure &&
    ['failure', 'rejected', 'timed-out'].includes(payment.status)
  ) {
    const title =
      payment.status === 'rejected'
        ? 'Rejected by user'
        : payment.status === 'timed-out'
          ? 'Timed out'
          : 'Failed'

    return (
      <section
        className={`card transaction-result ${
          payment.status === 'timed-out'
            ? 'transaction-result--timed-out'
            : 'transaction-result--error'
        }`}
        aria-labelledby="transaction-title"
        role="status"
      >
        <span className="result-icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2 id="transaction-title">{title}</h2>
          <p>{payment.failure.message}</p>
        </div>
      </section>
    )
  }

  if (payment.isActive) {
    return (
      <section
        className="card transaction-result transaction-result--loading"
        aria-labelledby="transaction-title"
        role="status"
      >
        <span className="result-icon" aria-hidden="true">
          …
        </span>
        <div>
          <h2 id="transaction-title">
            {payment.status === 'awaiting-signature'
              ? 'Waiting for Freighter'
              : payment.status === 'submitting'
                ? 'Submitting'
                : 'Preparing'}
          </h2>
          <p>{progress[payment.status]}</p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="card transaction-result transaction-result--empty"
      aria-labelledby="transaction-title"
    >
      <span className="result-icon" aria-hidden="true">
        ↗
      </span>
      <div>
        <h2 id="transaction-title">Transaction result</h2>
        <p>Confirmed Testnet transaction details and hash will appear here.</p>
      </div>
    </section>
  )
}
