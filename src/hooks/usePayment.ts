import { useCallback, useEffect, useRef, useState } from 'react'
import { TESTNET_PASSPHRASE } from '../lib/freighter'
import {
  preparePayment,
  signPreparedPayment,
  submitSignedPayment,
  validatePayment,
  type PaymentFailure,
  type PaymentReview,
} from '../lib/payment'

export type TransactionStatus =
  | 'idle'
  | 'reviewing'
  | 'preparing'
  | 'awaiting-signature'
  | 'submitting'
  | 'success'
  | 'rejected'
  | 'failure'

export interface PaymentSuccess {
  hash: string
  amount: string
  recipient: string
}

export function usePayment(input: {
  sender: string | null
  networkPassphrase: string | null
  balance: string | null
  connected: boolean
  refreshBalance: () => Promise<void>
}) {
  const {
    sender,
    networkPassphrase,
    balance,
    connected,
    refreshBalance,
  } = input
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [review, setReview] = useState<PaymentReview | null>(null)
  const [failure, setFailure] = useState<PaymentFailure | null>(null)
  const [success, setSuccess] = useState<PaymentSuccess | null>(null)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)
  const walletKey = sender && networkPassphrase
    ? `${sender}:${networkPassphrase}`
    : null
  const lastWalletKeyRef = useRef<string | null>(null)

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  useEffect(() => {
    if (lastWalletKeyRef.current === walletKey) {
      return
    }

    lastWalletKeyRef.current = walletKey
    busyRef.current = false
    setStatus('idle')
    setReview(null)
    setFailure(null)
    setSuccess(null)
  }, [walletKey])

  const reviewPayment = useCallback(async (recipient: string, amount: string) => {
    if (busyRef.current) return
    const validation = validatePayment({
      sender,
      recipient,
      amount,
      balance,
      isTestnetConnected: connected,
    })
    if (validation) {
      setFailure(validation)
      setStatus('failure')
      return
    }

    busyRef.current = true
    setFailure(null)
    setSuccess(null)
    setStatus('preparing')
    const prepared = await preparePayment(
      sender!,
      recipient.trim(),
      amount.trim(),
    )
    busyRef.current = false
    if (!mountedRef.current) return
    if (!prepared.ok) {
      setFailure(prepared)
      setStatus('failure')
      return
    }
    setReview(prepared.value)
    setStatus('reviewing')
  }, [balance, connected, sender])

  const cancelReview = useCallback(() => {
    if (busyRef.current) return
    setReview(null)
    setFailure(null)
    setStatus('idle')
  }, [])

  const confirmAndSign = useCallback(async () => {
    if (busyRef.current || !review) return
    const validation = validatePayment({
      sender,
      recipient: review.recipient,
      amount: review.amount,
      balance,
      isTestnetConnected: connected && networkPassphrase === TESTNET_PASSPHRASE,
    })
    if (validation) {
      setFailure(validation)
      setStatus('failure')
      setReview(null)
      setSuccess(null)
      return
    }

    busyRef.current = true
    setStatus('preparing')
    const fresh = await preparePayment(review.sender, review.recipient, review.amount)
    if (!fresh.ok) {
      busyRef.current = false
      setFailure(fresh)
      setStatus('failure')
      return
    }

    setStatus('awaiting-signature')
    const signed = await signPreparedPayment(fresh.value)
    if (!signed.ok) {
      busyRef.current = false
      setFailure(signed)
      setStatus(signed.code === 'rejected' ? 'rejected' : 'failure')
      return
    }

    setStatus('submitting')
    const submitted = await submitSignedPayment(signed.value)
    busyRef.current = false
    if (!mountedRef.current) return
    if (!submitted.ok) {
      setFailure(submitted)
      setStatus('failure')
      return
    }

    setSuccess({
      hash: submitted.value,
      amount: review.amount,
      recipient: review.recipient,
    })
    setReview(null)
    setFailure(null)
    setStatus('success')
    await refreshBalance().catch(() => undefined)
  }, [balance, connected, networkPassphrase, refreshBalance, sender, review])

  const reset = useCallback(() => {
    if (busyRef.current) return
    setStatus('idle')
    setReview(null)
    setFailure(null)
    setSuccess(null)
  }, [])

  return {
    status,
    review,
    failure,
    success,
    reviewPayment,
    cancelReview,
    confirmAndSign,
    reset,
    isActive: ['preparing', 'awaiting-signature', 'submitting'].includes(status),
  }
}
