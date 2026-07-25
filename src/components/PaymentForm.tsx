import { useState } from 'react'
import type { ReturnTypeUsePayment } from '../types/payment'

interface PaymentFormProps {
  isWalletConnected: boolean
  payment: ReturnTypeUsePayment
}

export function PaymentForm({ isWalletConnected, payment }: PaymentFormProps) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const locked = !isWalletConnected || payment.isActive || payment.status === 'reviewing'

  return (
    <section className="card payment-card" aria-labelledby="payment-title">
      <div className="card-heading">
        <div><p className="section-kicker">New transfer</p><h2 id="payment-title">Send a payment</h2></div>
        <span className="asset-chip">XLM</span>
      </div>

      <form onSubmit={(event) => {
        event.preventDefault()
        void payment.reviewPayment(recipient, amount)
      }}>
        <fieldset disabled={locked} aria-describedby="payment-help">
          <legend className="sr-only">XLM payment details</legend>
          <div className="field">
            <label htmlFor="recipient">Recipient Stellar address</label>
            <input id="recipient" name="recipient" type="text" autoComplete="off"
              placeholder="G…" value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              disabled={!isWalletConnected} />
            <p className="field-hint">Use a funded Testnet G-address. Standard payments cannot create accounts.</p>
          </div>
          <div className="field">
            <label htmlFor="amount">Amount</label>
            <div className="amount-input">
              <input id="amount" name="amount" type="text" inputMode="decimal"
                placeholder="0.0000000" value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!isWalletConnected} />
              <span className="input-asset" aria-hidden="true">XLM</span>
              <button className="max-button" type="button" disabled
                title="MAX is unavailable until reserve-aware calculation is implemented">MAX</button>
            </div>
            <p className="field-hint">Up to seven decimals. MAX is disabled because reserves and fees must remain available.</p>
          </div>
          <button className="button button--primary button--full" type="submit"
            disabled={!isWalletConnected || payment.isActive}>
            {payment.status === 'preparing' ? 'Preparing…' : 'Review Payment'}
          </button>
        </fieldset>
      </form>

      {payment.review && payment.status === 'reviewing' && (
        <div className="review-panel" role="dialog" aria-labelledby="review-title">
          <h3 id="review-title">Review payment</h3>
          <dl>
            <div><dt>Sender</dt><dd><code>{payment.review.sender}</code></dd></div>
            <div><dt>Recipient</dt><dd><code>{payment.review.recipient}</code></dd></div>
            <div><dt>Amount</dt><dd>{payment.review.amount} XLM</dd></div>
            <div><dt>Network</dt><dd>{payment.review.network}</dd></div>
            <div><dt>Estimated fee</dt><dd>{payment.review.fee} XLM</dd></div>
          </dl>
          <div className="review-actions">
            <button className="button button--secondary" type="button" onClick={payment.cancelReview}>Cancel</button>
            <button className="button button--primary" type="button" onClick={() => void payment.confirmAndSign()}>Confirm &amp; Sign</button>
          </div>
        </div>
      )}

      <p className="form-lock-note" id="payment-help">
        <span aria-hidden="true">◆</span>
        {isWalletConnected ? 'Payments are reviewed before Freighter opens.' : 'Connect Freighter to unlock payment details.'}
      </p>
    </section>
  )
}
