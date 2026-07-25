import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionResult } from './TransactionResult'

describe('TransactionResult', () => {
  it('shows the successful payment receipt details and explorer link', () => {
    render(
      <TransactionResult
        payment={
          {
            status: 'success',
            success: {
              hash: 'a'.repeat(64),
              amount: '12.5000000',
              recipient:
                'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            },
            reset: vi.fn(),
          } as never
        }
      />,
    )

    expect(
      screen.getByText('Payment successful on Stellar Testnet.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Successful' })).toBeInTheDocument()
    expect(screen.getByText(/12\.5000000 XLM was sent to/i)).toBeInTheDocument()
    expect(
      screen.getByText('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('a'.repeat(64)),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View on Stellar Expert' }),
    ).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/testnet/tx/' + 'a'.repeat(64),
    )
  })

  it('copies the confirmed hash with accessible feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(
      <TransactionResult
        payment={{
          status: 'success',
          success: {
            hash: 'b'.repeat(64),
            amount: '1.0000000',
            recipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          },
          reset: vi.fn(),
        } as never}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copy hash' }))

    expect(writeText).toHaveBeenCalledWith('b'.repeat(64))
    expect(await screen.findByText('Hash copied')).toBeInTheDocument()
  })
})
