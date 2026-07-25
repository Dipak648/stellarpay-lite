interface PaymentFormProps {
  isWalletConnected: boolean
}

export function PaymentForm({ isWalletConnected }: PaymentFormProps) {
  return (
    <section className="card payment-card" aria-labelledby="payment-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">New transfer</p>
          <h2 id="payment-title">Send a payment</h2>
        </div>
        <span className="asset-chip">XLM</span>
      </div>

      <form>
        <fieldset aria-describedby="payment-help">
          <legend className="sr-only">XLM payment details</legend>

          <div className="field">
            <label htmlFor="recipient">Recipient Stellar address</label>
            <input
              id="recipient"
              name="recipient"
              type="text"
              autoComplete="off"
              placeholder="G…"
              disabled={!isWalletConnected}
            />
            <p className="field-hint">Enter a public Stellar account beginning with G.</p>
          </div>

          <div className="field">
            <label htmlFor="amount">Amount</label>
            <div className="amount-input">
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0.00"
                disabled={!isWalletConnected}
              />
              <span className="input-asset" aria-hidden="true">
                XLM
              </span>
              <button
                className="max-button"
                type="button"
                disabled={!isWalletConnected}
              >
                MAX
              </button>
            </div>
            <p className="field-hint">Choose an amount after connecting your wallet.</p>
          </div>

          <button
            className="button button--primary button--full"
            type="submit"
            disabled
          >
            Review Payment
          </button>
        </fieldset>
      </form>

      <p className="form-lock-note" id="payment-help">
        <span aria-hidden="true">◆</span>
        {isWalletConnected
          ? 'Payment review will be enabled in a later phase.'
          : 'Connect Freighter to unlock payment details.'}
      </p>
    </section>
  )
}
