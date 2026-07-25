import { BalanceCard } from './components/BalanceCard'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PaymentForm } from './components/PaymentForm'
import { TransactionResult } from './components/TransactionResult'
import { WalletCard } from './components/WalletCard'
import { useBalance } from './hooks/useBalance'
import { usePayment } from './hooks/usePayment'
import { useWallet } from './hooks/useWallet'

function App() {
  const wallet = useWallet()
  const isWalletConnected = wallet.status === 'connected'
  const balance = useBalance(wallet.publicAddress, isWalletConnected)
  const payment = usePayment({
    sender: wallet.publicAddress,
    networkPassphrase: wallet.network?.passphrase ?? null,
    balance: balance.balance,
    connected: isWalletConnected,
    refreshBalance: balance.refresh,
  })

  return (
    <div className="app-shell">
      <Header />
      <main className="dashboard">
        <section className="dashboard-grid" aria-label="Payment dashboard">
          <div className="dashboard-sidebar">
            <WalletCard {...wallet} />
            <BalanceCard
              isWalletConnected={isWalletConnected}
              {...balance}
            />
          </div>
          <PaymentForm isWalletConnected={isWalletConnected} payment={payment} />
        </section>
        <TransactionResult payment={payment} />
      </main>
      <Footer />
    </div>
  )
}

export default App
