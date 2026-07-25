import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the Stellar Testnet identity', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'StellarPay Lite' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Stellar Testnet')).toBeInTheDocument()
  })

  it('renders the disconnected wallet and disabled payment state', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: 'Connect Freighter' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Balance unavailable')).toBeInTheDocument()
    expect(screen.getByText('XLM', { selector: '.balance-currency' })).toBeInTheDocument()

    expect(
      screen.getByRole('textbox', { name: 'Recipient Stellar address' }),
    ).toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Review Payment' }),
    ).toBeDisabled()
  })

  it('renders transaction guidance and the Testnet safety notice', () => {
    render(<App />)

    expect(
      screen.getByText(/transaction status and the Testnet transaction hash/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Built on Stellar Testnet')).toBeInTheDocument()
    expect(
      screen.getByText(/Testnet only — assets have no real-world value/i),
    ).toBeInTheDocument()
  })
})
