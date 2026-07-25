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

const horizonMock = vi.hoisted(() => ({
  loadNativeXlmBalance: vi.fn(),
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

vi.mock('./lib/horizon', () => ({
  loadNativeXlmBalance: horizonMock.loadNativeXlmBalance,
}))

const PUBLIC_ADDRESS =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
const SECOND_ADDRESS =
  'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBM7'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

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
  horizonMock.loadNativeXlmBalance.mockResolvedValue({
    status: 'funded',
    balance: '125.0000000',
  })
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
    expect(horizonMock.loadNativeXlmBalance).not.toHaveBeenCalled()
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
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'MAX' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Review Payment' }),
    ).toBeDisabled()
    expect(horizonMock.loadNativeXlmBalance).not.toHaveBeenCalled()
  })

  it('unlocks payment fields only after a verified Testnet connection', async () => {
    render(<App />)
    await connectWallet()

    expect(
      screen.getByRole('textbox', { name: 'Recipient Stellar address' }),
    ).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'MAX' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Review Payment' }),
    ).toBeEnabled()
    expect(
      await screen.findByText(/Native XLM on Stellar Testnet/i),
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

  it('fetches and displays the native balance automatically after connection', async () => {
    horizonMock.loadNativeXlmBalance.mockResolvedValue({
      status: 'funded',
      balance: '987654321.1234567',
    })
    render(<App />)

    await connectWallet()

    expect(horizonMock.loadNativeXlmBalance).toHaveBeenCalledWith(
      PUBLIC_ADDRESS,
    )
    expect(
      await screen.findByText('987,654,321.1234567'),
    ).toBeInTheDocument()
  })

  it('announces the balance loading state', async () => {
    const pending = deferred<{ status: 'funded'; balance: string }>()
    horizonMock.loadNativeXlmBalance.mockReturnValue(pending.promise)
    render(<App />)

    await connectWallet()

    expect(
      await screen.findByText('Loading the native XLM balance…'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Refreshing XLM balance' }),
    ).toBeDisabled()

    pending.resolve({ status: 'funded', balance: '10.0000000' })
    expect(await screen.findByText('10.0000000')).toBeInTheDocument()
  })

  it('refreshes the connected account balance manually', async () => {
    render(<App />)
    const user = await connectWallet()
    await screen.findByText('125.0000000')

    horizonMock.loadNativeXlmBalance.mockResolvedValue({
      status: 'funded',
      balance: '126.5000000',
    })
    await user.click(
      screen.getByRole('button', { name: 'Refresh XLM balance' }),
    )

    expect(
      await screen.findByText('126.5000000'),
    ).toBeInTheDocument()
    expect(horizonMock.loadNativeXlmBalance).toHaveBeenCalledTimes(2)
  })

  it('shows unfunded Testnet guidance without requesting Friendbot funds', async () => {
    horizonMock.loadNativeXlmBalance.mockResolvedValue({ status: 'unfunded' })
    render(<App />)

    await connectWallet()

    expect(
      await screen.findByText(/valid Testnet address has not been funded/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /fund it with Friendbot/i }),
    ).toHaveAttribute(
      'href',
      'https://developers.stellar.org/docs/tools/lab/account',
    )
  })

  it('shows a network error and retries on request', async () => {
    horizonMock.loadNativeXlmBalance.mockResolvedValueOnce({
      status: 'error',
      reason: 'network',
      message: 'The Testnet balance service is temporarily unavailable.',
    })
    render(<App />)
    const user = await connectWallet()

    expect(
      await screen.findByText(/temporarily unavailable/i),
    ).toBeInTheDocument()

    horizonMock.loadNativeXlmBalance.mockResolvedValueOnce({
      status: 'funded',
      balance: '42.0000000',
    })
    await user.click(screen.getByRole('button', { name: 'Retry balance' }))

    expect(await screen.findByText('42.0000000')).toBeInTheDocument()
    expect(horizonMock.loadNativeXlmBalance).toHaveBeenCalledTimes(2)
  })

  it('clears the visible balance immediately on disconnect', async () => {
    render(<App />)
    const user = await connectWallet()
    await screen.findByText('125.0000000')

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(screen.queryByText('125.0000000')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Balance unavailable')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Refresh XLM balance' }),
    ).toBeDisabled()
  })

  it('clears the old account balance and loads the new active account', async () => {
    horizonMock.loadNativeXlmBalance.mockImplementation(async (address) => ({
      status: 'funded',
      balance: address === PUBLIC_ADDRESS ? '11.0000000' : '22.0000000',
    }))
    render(<App />)
    await connectWallet()
    await screen.findByText('11.0000000')
    await waitFor(() => expect(freighterMock.watchCallbacks).toHaveLength(1))

    act(() => {
      freighterMock.watchCallbacks[0]({
        address: SECOND_ADDRESS,
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
      })
    })

    expect(screen.queryByText('11.0000000')).not.toBeInTheDocument()
    expect(await screen.findByText('22.0000000')).toBeInTheDocument()
    expect(horizonMock.loadNativeXlmBalance).toHaveBeenLastCalledWith(
      SECOND_ADDRESS,
    )
  })

  it('prevents a stale account response from replacing the current balance', async () => {
    const firstRequest =
      deferred<{ status: 'funded'; balance: string }>()
    const secondRequest =
      deferred<{ status: 'funded'; balance: string }>()
    horizonMock.loadNativeXlmBalance.mockImplementation((address) =>
      address === PUBLIC_ADDRESS ? firstRequest.promise : secondRequest.promise,
    )
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

    firstRequest.resolve({ status: 'funded', balance: '999.0000000' })
    await act(async () => {
      await firstRequest.promise
    })
    expect(screen.queryByText('999.0000000')).not.toBeInTheDocument()

    secondRequest.resolve({ status: 'funded', balance: '5.5000000' })
    expect(await screen.findByText('5.5000000')).toBeInTheDocument()
  })

  it('preserves the transaction and Testnet safety notices', async () => {
    render(<App />)
    await waitForDisconnected()

    expect(
      screen.getByText(/confirmed Testnet transaction details and hash/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Built on Stellar Testnet')).toBeInTheDocument()
    expect(
      screen.getByText(/Testnet only — assets have no real-world value/i),
    ).toBeInTheDocument()
  })
})
