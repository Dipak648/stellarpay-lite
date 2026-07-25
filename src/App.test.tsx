import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the project setup state', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'StellarPay Lite' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Stellar Testnet')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Project setup complete',
    )
  })
})
