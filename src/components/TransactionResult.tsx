export function TransactionResult() {
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
        <p>
          Transaction status and the Testnet transaction hash will appear here
          after a payment is submitted.
        </p>
      </div>
    </section>
  )
}
