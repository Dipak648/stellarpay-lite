import { useState } from 'react'
import type { WalletController, WalletStatus } from '../hooks/useWallet'

type WalletCardProps = Pick<
  WalletController,
  | 'status'
  | 'publicAddress'
  | 'shortenedAddress'
  | 'network'
  | 'message'
  | 'connect'
  | 'disconnect'
  | 'retry'
>

const statusLabels: Record<WalletStatus, string> = {
  checking: 'Checking',
  unavailable: 'Unavailable',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  'wrong-network': 'Wrong network',
  rejected: 'Access declined',
  error: 'Connection error',
}

export function WalletCard({
  status,
  publicAddress,
  shortenedAddress,
  network,
  message,
  connect,
  disconnect,
  retry,
}: WalletCardProps) {
  const [copyFeedback, setCopyFeedback] = useState({
    address: '',
    message: '',
  })

  const copyAddress = async () => {
    if (!publicAddress) {
      return
    }

    try {
      await navigator.clipboard.writeText(publicAddress)
      setCopyFeedback({ address: publicAddress, message: 'Address copied' })
    } catch {
      setCopyFeedback({
        address: publicAddress,
        message: 'Could not copy address',
      })
    }
  }

  const heading =
    status === 'connected'
      ? 'Wallet connected'
      : status === 'wrong-network'
        ? 'Switch to Testnet'
        : 'Connect your wallet'

  return (
    <section className="card wallet-card" aria-labelledby="wallet-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Wallet</p>
          <h2 id="wallet-title">{heading}</h2>
        </div>
        <span className={`status-pill status-pill--${status}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="wallet-status" aria-live="polite">
        {status === 'checking' && (
          <p className="card-copy">Checking this browser for Freighter…</p>
        )}

        {status === 'unavailable' && (
          <>
            <p className="card-copy">
              Freighter was not detected. Install the official browser extension,
              then check again.
            </p>
            <a
              className="button button--secondary button--full button-link"
              href="https://www.freighter.app/"
              target="_blank"
              rel="noreferrer"
            >
              Install Freighter
            </a>
            <button
              className="button button--primary button--full button--stacked"
              type="button"
              onClick={() => void retry()}
            >
              Check again
            </button>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <p className="card-copy" id="wallet-requirements">
              Freighter must be installed and set to Stellar Testnet. Connecting
              shares only your public address.
            </p>
            <button
              className="button button--primary button--full"
              type="button"
              onClick={() => void connect()}
              aria-describedby="wallet-requirements"
            >
              Connect Freighter
            </button>
          </>
        )}

        {status === 'connecting' && (
          <>
            <p className="card-copy">
              Review the access request in Freighter. StellarPay Lite never asks
              for a secret key or recovery phrase.
            </p>
            <button
              className="button button--primary button--full"
              type="button"
              disabled
            >
              Connecting…
            </button>
          </>
        )}

        {status === 'connected' && publicAddress && shortenedAddress && (
          <>
            <p className="card-copy wallet-confirmation">
              <span className="success-dot" aria-hidden="true" />
              Connected securely on {network?.name || 'Stellar Testnet'}
            </p>
            <div className="address-row">
              <code title={publicAddress}>{shortenedAddress}</code>
              <button
                className="copy-button"
                type="button"
                onClick={() => void copyAddress()}
                aria-label="Copy public address"
              >
                Copy
              </button>
            </div>
            <p className="copy-feedback" aria-live="polite">
              {copyFeedback.address === publicAddress
                ? copyFeedback.message
                : ''}
            </p>
            <button
              className="button button--secondary button--full"
              type="button"
              onClick={disconnect}
            >
              Disconnect
            </button>
            <p className="session-note">
              Disconnect clears this app session only. Freighter 6.0.1 does not
              provide a revoke API.
            </p>
          </>
        )}

        {status === 'wrong-network' && (
          <>
            <p className="card-copy">
              Freighter is currently using {network?.name || 'another network'}.
              Open Freighter, switch the active network to Testnet, then try
              again.
            </p>
            <button
              className="button button--primary button--full"
              type="button"
              onClick={() => void connect()}
            >
              Check Testnet again
            </button>
          </>
        )}

        {status === 'rejected' && (
          <>
            <p className="card-copy">{message}</p>
            <button
              className="button button--primary button--full"
              type="button"
              onClick={() => void connect()}
            >
              Try connecting again
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="card-copy">{message}</p>
            <button
              className="button button--primary button--full"
              type="button"
              onClick={() => void connect()}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </section>
  )
}
