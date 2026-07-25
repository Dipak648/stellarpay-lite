import { BalanceCard } from './components/BalanceCard'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PaymentForm } from './components/PaymentForm'
import { TransactionResult } from './components/TransactionResult'
import { WalletCard } from './components/WalletCard'

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="dashboard">
        <section className="dashboard-grid" aria-label="Payment dashboard">
          <div className="dashboard-sidebar">
            <WalletCard />
            <BalanceCard />
          </div>
          <PaymentForm />
        </section>
        <TransactionResult />
      </main>
      <Footer />
    </div>
  )
}

export default App
