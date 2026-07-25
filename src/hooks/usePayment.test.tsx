import { Networks, StrKey } from '@stellar/stellar-sdk'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePayment } from './usePayment'
import type { PaymentReview } from '../lib/payment'

const paymentLib = vi.hoisted(() => ({
  preparePayment: vi.fn(),
  signPreparedPayment: vi.fn(),
  submitSignedPayment: vi.fn(),
  validatePayment: vi.fn(),
}))

vi.mock('../lib/payment', () => ({
  preparePayment: paymentLib.preparePayment,
  signPreparedPayment: paymentLib.signPreparedPayment,
  submitSignedPayment: paymentLib.submitSignedPayment,
  validatePayment: paymentLib.validatePayment,
}))

const SENDER = StrKey.encodeEd25519PublicKey(
  Uint8Array.from({ length: 32 }, () => 3) as unknown as Parameters<
    typeof StrKey.encodeEd25519PublicKey
  >[0],
)
const RECIPIENT = StrKey.encodeEd25519PublicKey(
  Uint8Array.from({ length: 32 }, () => 4) as unknown as Parameters<
    typeof StrKey.encodeEd25519PublicKey
  >[0],
)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function createReview(): PaymentReview {
  return {
    sender: SENDER,
    recipient: RECIPIENT,
    amount: '1.2500000',
    network: 'Stellar Testnet',
    fee: '0.0000100',
    unsignedXdr: 'review-xdr',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  paymentLib.validatePayment.mockReturnValue(null)
  paymentLib.preparePayment.mockResolvedValue({ ok: true, value: createReview() })
  paymentLib.signPreparedPayment.mockResolvedValue({
    ok: true,
    value: 'signed-xdr',
  })
  paymentLib.submitSignedPayment.mockResolvedValue({
    ok: true,
    value: 'a'.repeat(64),
  })
})

describe('usePayment', () => {
  it('keeps review-before-signing and refreshes the balance only after success', async () => {
    const refreshBalance = vi.fn(async () => undefined)
    const { result } = renderHook(() =>
      usePayment({
        sender: SENDER,
        networkPassphrase: Networks.TESTNET,
        balance: '5.0000000',
        connected: true,
        refreshBalance,
      }),
    )

    await act(async () => {
      await result.current.reviewPayment(RECIPIENT, '1.2500000')
    })

    expect(paymentLib.preparePayment).toHaveBeenCalledTimes(1)
    expect(paymentLib.signPreparedPayment).not.toHaveBeenCalled()
    expect(result.current.status).toBe('reviewing')

    await act(async () => {
      await result.current.confirmAndSign()
    })

    expect(paymentLib.preparePayment).toHaveBeenCalledTimes(2)
    expect(paymentLib.signPreparedPayment).toHaveBeenCalledTimes(1)
    expect(paymentLib.submitSignedPayment).toHaveBeenCalledTimes(1)
    expect(refreshBalance).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('success')
    expect(result.current.success).toMatchObject({
      hash: 'a'.repeat(64),
      recipient: RECIPIENT,
      amount: '1.2500000',
    })
  })

  it('blocks duplicate confirmation attempts while a payment is active', async () => {
    const refreshBalance = vi.fn(async () => undefined)
    const pending = deferred<{ ok: true; value: PaymentReview }>()
    paymentLib.preparePayment
      .mockResolvedValueOnce({ ok: true, value: createReview() })
      .mockReturnValueOnce(pending.promise)

    const { result } = renderHook(() =>
      usePayment({
        sender: SENDER,
        networkPassphrase: Networks.TESTNET,
        balance: '5.0000000',
        connected: true,
        refreshBalance,
      }),
    )

    await act(async () => {
      await result.current.reviewPayment(RECIPIENT, '1.2500000')
    })

    await act(async () => {
      void result.current.confirmAndSign()
      void result.current.confirmAndSign()
    })

    expect(paymentLib.preparePayment).toHaveBeenCalledTimes(2)
    expect(paymentLib.signPreparedPayment).not.toHaveBeenCalled()

    pending.resolve({ ok: true, value: createReview() })

    await waitFor(() => {
      expect(paymentLib.signPreparedPayment).toHaveBeenCalledTimes(1)
      expect(paymentLib.submitSignedPayment).toHaveBeenCalledTimes(1)
    })
    expect(refreshBalance).toHaveBeenCalledTimes(1)
  })

  it('invalidates stale reviews when the wallet address changes', async () => {
    const refreshBalance = vi.fn(async () => undefined)
    const { result, rerender } = renderHook(
      ({ sender, networkPassphrase }) =>
        usePayment({
          sender,
          networkPassphrase,
          balance: '5.0000000',
          connected: true,
          refreshBalance,
        }),
      {
        initialProps: {
          sender: SENDER,
          networkPassphrase: Networks.TESTNET,
        },
      },
    )

    await act(async () => {
      await result.current.reviewPayment(RECIPIENT, '1.2500000')
    })
    expect(result.current.review).toMatchObject({ sender: SENDER })

    rerender({
      sender: RECIPIENT,
      networkPassphrase: Networks.TESTNET,
    })

    await waitFor(() => {
      expect(result.current.review).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })
})
