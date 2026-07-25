import { Networks } from '@stellar/stellar-sdk'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

interface WatchParams {
  address: string
  network: string
  networkPassphrase: string
  error?: { code: number; message: string }
}

const freighterMock = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  watchCallbacks: [] as Array<(params: WatchParams) => void>,
  stop: vi.fn(),
}))

vi.mock('@stellar/freighter-api', () => ({
  isConnected: freighterMock.isConnected,
  requestAccess: freighterMock.requestAccess,
  getAddress: freighterMock.getAddress,
  getNetworkDetails: freighterMock.getNetworkDetails,
  WatchWalletChanges: class {
    watch(callback: (params: WatchParams) => void) {
      freighterMock.watchCallbacks.push(callback)
      return {}
    }

    stop() {
      freighterMock.stop()
    }
  },
}))

const PUBLIC_ADDRESS =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
const SECOND_ADDRESS =
  'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBM7'

function mockSuccessfulFreighter() {
  freighterMock.isConnected.mockResolvedValue({ isConnected: true })
  freighterMock.requestAccess.mockResolvedValue({ address: PUBLIC_ADDRESS })
  freighterMock.getAddress.mockResolvedValue({ address: PUBLIC_ADDRESS })
  freighterMock.getNetworkDetails.mockResolvedValue({
    network: 'TESTNET',
    networkUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
  })
}

async function waitForDisconnected() {
  return screen.findByRole('button', { name: 'Connect Freighter' })
}

async function connectWallet() {
  const user = userEvent.setup()
  await user.click(await waitForDisconnected())
  await screen.findByText('Wallet connected')
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  freighterMock.watchCallbacks.length = 0
  mockSuccessfulFreighter()
})

describe('StellarPay Lite wallet connection', () => {
  it('renders the project heading and Testnet badge', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'StellarPay Lite' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Stellar Testnet')).toBeInTheDocument()
    await waitForDisconnected()
  })

  it('shows an official installation link when Freighter is unavailable', async () => {
    freighterMock.isConnected.mockResolvedValue({ isConnected: false })
    render(<App />)

    const installLink = await screen.findByRole('link', {
      name: 'Install Freighter',
    })
    expect(installLink).toHaveAttribute('href', 'https://www.freighter.app/')
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled()
    expect(freighterMock.requestAccess).not.toHaveBeenCalled()
  })

  it('starts disconnected without automatically requesting access', async () => {
    render(<App />)

    expect(await waitForDisconnected()).toBeEnabled()
    expect(freighterMock.requestAccess).not.toHaveBeenCalled()
    expect(freighterMock.getAddress).not.toHaveBeenCalled()
  })

  it('connects only after a click and verifies Stellar Testnet', async () => {
    render(<App />)

    await connectWallet()

    expect(freighterMock.requestAccess).toHaveBeenCalledTimes(1)
    expect(freighterMock.getAddress).toHaveBeenCalledTimes(1)
    expect(freighterMock.getNetworkDetails).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Connected securely on TESTNET/i)).toBeInTheDocument()
    expect(screen.getByTitle(PUBLIC_ADDRESS)).toHaveTextContent(
      'GAAAAA…AAAWHF',
    )
  })

  it('shows a helpful state when permission is rejected', async () => {
    freighterMock.requestAccess.mockResolvedValue({
      address: '',
      error: { code: -4, message: 'The user rejected this request.' },
    })
    render(<App />)

    const user = userEvent.setup()
    await user.click(await waitForDisconnected())

    expect(await screen.findByText('Access declined')).toBeInTheDocument()
    expect(
      screen.getByText(/Wallet access was declined/i),
    ).toBeInTheDocument()
    expect(freighterMock.getAddress).not.toHaveBeenCalled()
  })

  it('requires switching Freighter to Testnet', async () => {
    freighterMock.getNetworkDetails.mockResolvedValue({
      network: 'PUBLIC',
      networkUrl: 'https://horizon.stellar.org',
      networkPassphrase: Networks.PUBLIC,
    })
    render(<App />)

    const user = userEvent.setup()
    await user.click(await waitForDisconnected())

    expect(await screen.findByText('Switch to Testnet')).toBeInTheDocument()
    expect(screen.getByText(/currently using PUBLIC/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Check Testnet again' }),
    ).toBeEnabled()
  })

  it('sanitizes unexpected extension errors', async () => {
    freighterMock.requestAccess.mockRejectedValue(
      new Error('sensitive extension internals'),
    )
    render(<App />)

    const user = userEvent.setup()
    await user.click(await waitForDisconnected())

    expect(await screen.findByText('Connection error')).toBeInTheDocument()
    expect(
      screen.getByText(/Freighter could not complete the request/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/sensitive extension internals/i),
    ).not.toBeInTheDocument()
  })

  it('disconnects by clearing the app session and stopping the watcher', async () => {
    render(<App />)
    const user = await connectWallet()

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(await waitForDisconnected()).toBeEnabled()
    expect(screen.queryByText('Wallet connected')).not.toBeInTheDocument()
    expect(freighterMock.stop).toHaveBeenCalledTimes(1)
    expect(freighterMock.requestAccess).toHaveBeenCalledTimes(1)
  })

  it('copies the connected public address with accessible feedback', async () => {
    render(<App />)
    const user = await connectWallet()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await user.click(
      screen.getByRole('button', { name: 'Copy public address' }),
    )

    expect(writeText).toHaveBeenCalledWith(PUBLIC_ADDRESS)
    expect(await screen.findByText('Address copied')).toBeInTheDocument()
  })

  it('keeps wallet-dependent controls locked while disconnected', async () => {
    render(<App />)
    await waitForDisconnected()

    expect(
      screen.getByRole('textbox', { name: 'Recipient Stellar address' }),
    ).toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'MAX' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Review Payment' }),
    ).toBeDisabled()
  })

  it('unlocks payment fields only after a verified Testnet connection', async () => {
    render(<App />)
    await connectWallet()

    expect(
      screen.getByRole('textbox', { name: 'Recipient Stellar address' }),
    ).toBeEnabled()
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'MAX' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Review Payment' }),
    ).toBeDisabled()
    expect(
      screen.getByText(/Balance fetching will be added/i),
    ).toBeInTheDocument()
  })

  it('responds to account and network changes without requesting access again', async () => {
    render(<App />)
    await connectWallet()
    await waitFor(() => expect(freighterMock.watchCallbacks).toHaveLength(1))

    act(() => {
      freighterMock.watchCallbacks[0]({
        address: SECOND_ADDRESS,
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
      })
    })
    expect(screen.getByTitle(SECOND_ADDRESS)).toHaveTextContent(
      'GBBBBB…BBBBM7',
    )

    act(() => {
      freighterMock.watchCallbacks[0]({
        address: SECOND_ADDRESS,
        network: 'PUBLIC',
        networkPassphrase: Networks.PUBLIC,
      })
    })

    expect(await screen.findByText('Switch to Testnet')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Recipient Stellar address' }),
    ).toBeDisabled()
    expect(freighterMock.requestAccess).toHaveBeenCalledTimes(1)
    expect(freighterMock.stop).toHaveBeenCalledTimes(1)
  })

  it('preserves the transaction and Testnet safety notices', async () => {
    render(<App />)
    await waitForDisconnected()

    expect(
      screen.getByText(/transaction status and the Testnet transaction hash/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Built on Stellar Testnet')).toBeInTheDocument()
    expect(
      screen.getByText(/Testnet only — assets have no real-world value/i),
    ).toBeInTheDocument()
  })
})
