import {
  Account,
  NotFoundError,
  Networks,
  StrKey,
  TransactionBuilder,
  TransactionFailedError,
} from '@stellar/stellar-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compareDecimalStrings,
  isValidAmount,
  isValidStellarAddress,
  preparePayment,
  signPreparedPayment,
  submitSignedPayment,
  validatePayment,
  type PaymentHorizonClient,
} from './payment'

const freighter = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
}))

vi.mock('@stellar/freighter-api', () => ({
  getAddress: freighter.getAddress,
  getNetworkDetails: freighter.getNetworkDetails,
  signTransaction: freighter.signTransaction,
}))

const SENDER = StrKey.encodeEd25519PublicKey(
  Uint8Array.from({ length: 32 }, () => 1) as unknown as Parameters<
    typeof StrKey.encodeEd25519PublicKey
  >[0],
)
const RECIPIENT = StrKey.encodeEd25519PublicKey(
  Uint8Array.from({ length: 32 }, () => 2) as unknown as Parameters<
    typeof StrKey.encodeEd25519PublicKey
  >[0],
)

function makeTransactionSource(address: string, sequence = '1') {
  return new Account(address, sequence)
}

function makeHorizonClient(): PaymentHorizonClient {
  return {
    loadAccount: vi.fn(async (address: string) => makeTransactionSource(address)),
    fetchBaseFee: vi.fn(async () => 100),
    submitTransaction: vi.fn(),
  }
}

function makeSignedReview() {
  const client = makeHorizonClient()
  return preparePayment(SENDER, RECIPIENT, '1.0000000', client).then((result) => {
    if (!result.ok) {
      throw new Error(result.message)
    }
    return result.value
  })
}

function makeTxFailedError(
  transaction: 'tx_bad_seq' | 'tx_too_late' | 'tx_failed',
  operations: string[] = [],
) {
  const error = Object.create(TransactionFailedError.prototype) as {
    getResultCodes: () => { transaction: string; operations: string[] }
  }
  error.getResultCodes = () => ({ transaction, operations })
  return error as unknown as TransactionFailedError
}

beforeEach(() => {
  vi.clearAllMocks()
  freighter.getAddress.mockResolvedValue({ address: SENDER })
  freighter.getNetworkDetails.mockResolvedValue({
    network: 'TESTNET',
    networkUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
  })
  freighter.signTransaction.mockResolvedValue({
    signedTxXdr: 'signed-xdr',
    signerAddress: SENDER,
  })
})

describe('payment validation helpers', () => {
  it('accepts strict decimal-string amounts and compares them without floating-point conversion', () => {
    expect(isValidStellarAddress(SENDER)).toBe(true)
    expect(isValidAmount('1')).toBe(true)
    expect(isValidAmount('1.2345678')).toBe(true)
    expect(isValidAmount('1e2')).toBe(false)
    expect(isValidAmount('01')).toBe(false)
    expect(isValidAmount('0')).toBe(false)
    expect(isValidAmount('0.0000000')).toBe(false)
    expect(isValidAmount('1.23456789')).toBe(false)
    expect(compareDecimalStrings('1.0000000', '1')).toBe(0)
    expect(compareDecimalStrings('0.0000001', '0')).toBeGreaterThan(0)
  })

  it('rejects invalid payment drafts before Freighter opens', () => {
    expect(
      validatePayment({
        sender: null,
        recipient: RECIPIENT,
        amount: '1',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'wrong-network' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: '',
        amount: '1',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'empty-recipient' })

    expect(
      validatePayment({
      sender: SENDER,
      recipient: SENDER,
      amount: '1',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'same-account' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'empty-amount' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '0',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'non-positive-amount' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '-1',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'non-positive-amount' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '1.23456789',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'too-many-decimals' })

    expect(
      validatePayment({
        sender: SENDER,
        recipient: RECIPIENT,
        amount: '3',
        balance: '2',
        isTestnetConnected: true,
      }),
    ).toMatchObject({ code: 'insufficient-balance' })
  })
})

describe('payment transaction flow', () => {
  it('builds one native XLM operation on Stellar Testnet with a timeout and fee review', async () => {
    const client = makeHorizonClient()

    const result = await preparePayment(
      SENDER,
      RECIPIENT,
      '12.3456789',
      client,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }

    const transaction = TransactionBuilder.fromXDR(
      result.value.unsignedXdr,
      Networks.TESTNET,
    ) as import('@stellar/stellar-sdk').Transaction

    expect(transaction.networkPassphrase).toBe(Networks.TESTNET)
    expect(transaction.operations).toHaveLength(1)
    expect(transaction.operations[0]).toMatchObject({
      type: 'payment',
      destination: RECIPIENT,
      amount: '12.3456789',
    })
    expect(
      (transaction.operations[0] as { asset: { isNative: () => boolean } }).asset.isNative(),
    ).toBe(true)
    expect(result.value.fee).toBe('0.0000100')
    expect(client.loadAccount).toHaveBeenCalledWith(SENDER)
    expect(client.loadAccount).toHaveBeenCalledWith(RECIPIENT)
    expect(client.fetchBaseFee).toHaveBeenCalledTimes(1)
  })

  it('classifies an unfunded recipient as an unfunded-destination review error', async () => {
    const client: PaymentHorizonClient = {
      loadAccount: vi.fn(async (address: string) => {
        if (address === RECIPIENT) {
          throw new NotFoundError('Not found', { status: 404 })
        }

        return makeTransactionSource(address)
      }),
      fetchBaseFee: vi.fn(async () => 100),
      submitTransaction: vi.fn(),
    }

    await expect(
      preparePayment(SENDER, RECIPIENT, '1', client),
    ).resolves.toMatchObject({
      ok: false,
      code: 'unfunded-destination',
    })
  })

  it('signs only after an explicit confirmation on Testnet', async () => {
    const review = await makeSignedReview()

    const signed = await signPreparedPayment(review)

    expect(signed).toEqual({ ok: true, value: 'signed-xdr' })
    expect(freighter.getAddress).toHaveBeenCalledTimes(1)
    expect(freighter.getNetworkDetails).toHaveBeenCalledTimes(1)
    expect(freighter.signTransaction).toHaveBeenCalledWith(review.unsignedXdr, {
      networkPassphrase: Networks.TESTNET,
      address: SENDER,
    })
  })

  it('rejects signing when Freighter is on the wrong network', async () => {
    freighter.getNetworkDetails.mockResolvedValueOnce({
      network: 'PUBLIC',
      networkUrl: 'https://horizon.stellar.org',
      networkPassphrase: Networks.PUBLIC,
    })

    const review = await makeSignedReview()
    const result = await signPreparedPayment(review)

    expect(result).toMatchObject({ ok: false, code: 'wrong-network' })
    expect(freighter.signTransaction).not.toHaveBeenCalled()
  })

  it('rejects signing when the active address changes', async () => {
    freighter.getAddress.mockResolvedValueOnce({ address: RECIPIENT })
    const review = await makeSignedReview()
    const result = await signPreparedPayment(review)

    expect(result).toMatchObject({ ok: false, code: 'account-changed' })
    expect(freighter.signTransaction).not.toHaveBeenCalled()
  })

  it('sanitizes unexpected Freighter errors during signing', async () => {
    freighter.getAddress.mockRejectedValueOnce(new Error('extension internals'))

    const review = await makeSignedReview()
    const result = await signPreparedPayment(review)

    expect(result).toMatchObject({ ok: false, code: 'submission' })
    expect(JSON.stringify(result)).not.toContain('extension internals')
  })

  it('submits a signed transaction once and requires a valid 64-character hash', async () => {
    const review = await makeSignedReview()
    const client = makeHorizonClient()
    client.submitTransaction = vi.fn(async () => ({
      hash: 'A'.repeat(64),
    }))

    const submitted = await submitSignedPayment(review.unsignedXdr, client)

    expect(submitted).toEqual({ ok: true, value: 'a'.repeat(64) })
    expect(client.submitTransaction).toHaveBeenCalledTimes(1)
  })

  it('maps Horizon transaction failures and does not automatically resubmit', async () => {
    const review = await makeSignedReview()
    const client = makeHorizonClient()
    client.submitTransaction = vi.fn(async () => {
      throw makeTxFailedError('tx_bad_seq')
    })

    const failed = await submitSignedPayment(review.unsignedXdr, client)

    expect(failed).toMatchObject({ ok: false, code: 'bad-sequence' })
    expect(client.submitTransaction).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      name: 'underfunded',
      error: makeTxFailedError('tx_failed', ['op_underfunded']),
      code: 'insufficient-reserve',
    },
    {
      name: 'timeout',
      error: makeTxFailedError('tx_too_late'),
      code: 'timeout',
    },
  ])('maps $name failures from Horizon', async ({ error, code }) => {
    const review = await makeSignedReview()
    const client = makeHorizonClient()
    client.submitTransaction = vi.fn(async () => {
      throw error
    })

    await expect(submitSignedPayment(review.unsignedXdr, client)).resolves.toMatchObject({
      ok: false,
      code,
    })
  })

  it('treats a malformed Horizon hash as a submission error', async () => {
    const review = await makeSignedReview()
    const client = makeHorizonClient()
    client.submitTransaction = vi.fn(async () => ({
      hash: 'not-a-valid-hash',
    }))

    await expect(
      submitSignedPayment(review.unsignedXdr, client),
    ).resolves.toMatchObject({
      ok: false,
      code: 'submission',
    })
  })
})
