import { BalanceCard } from './components/BalanceCard'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PaymentForm } from './components/PaymentForm'
import { TransactionResult } from './components/TransactionResult'
import { WalletCard } from './components/WalletCard'
import { useWallet } from './hooks/useWallet'

function App() {
  const wallet = useWallet()
  const isWalletConnected = wallet.status === 'connected'

  return (
    <div className="app-shell">
      <Header />
      <main className="dashboard">
        <section className="dashboard-grid" aria-label="Payment dashboard">
          <div className="dashboard-sidebar">
            <WalletCard {...wallet} />
            <BalanceCard isWalletConnected={isWalletConnected} />
          </div>
          <PaymentForm isWalletConnected={isWalletConnected} />
        </section>
        <TransactionResult />
      </main>
      <Footer />
    </div>
  )
}

export default App
