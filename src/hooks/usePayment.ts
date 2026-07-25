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
  | 'timed-out'
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

   const logStep= useCallback((step: string, details?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.warn(`[payment-ui] ${step}`, details ?? '')
    }
  }, [])

  useEffect(() => {
  mountedRef.current = true

  return () => {
    mountedRef.current = false
  }
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
    logStep('Review started', { recipientLength: recipient.length })
    const validation = validatePayment({
      sender,
      recipient,
      amount,
      balance,
      isTestnetConnected: connected,
    })
    if (validation) {
      logStep('Review validation failed', { code: validation.code })
      setFailure(validation)
      setStatus('failure')
      return
    }

    busyRef.current = true
    setFailure(null)
    setSuccess(null)
    setStatus('preparing')
    logStep('Preparing started')
    try {
      const prepared = await preparePayment(
        sender!,
        recipient.trim(),
        amount.trim(),
      )
      logStep('Preparing finished', { ok: prepared.ok })
      busyRef.current = false
      if (!mountedRef.current) return

      if (!prepared.ok) {
        logStep('Preparing failed', { code: prepared.code })
        setFailure(prepared)
        setStatus('failure')
        return
      }

      setReview(prepared.value)
      setStatus('reviewing')
    } catch {
      busyRef.current = false
      if (!mountedRef.current) return
      const unexpected: PaymentFailure = {
        ok: false,
        code: 'network',
        message: 'The payment could not be prepared. Please try again.',
      }
      setFailure(unexpected)
      setStatus('failure')
    }
  }, [balance, connected, logStep, sender])

  const cancelReview = useCallback(() => {
    if (busyRef.current) return
    setReview(null)
    setFailure(null)
    setStatus('idle')
  }, [])

  const confirmAndSign = useCallback(async () => {
    if (busyRef.current || !review) return
    logStep('Confirmation started', { sender, recipient: review.recipient })
    const validation = validatePayment({
      sender,
      recipient: review.recipient,
      amount: review.amount,
      balance,
      isTestnetConnected: connected && networkPassphrase === TESTNET_PASSPHRASE,
    })
    if (validation) {
      logStep('Confirmation validation failed', { code: validation.code })
      setFailure(validation)
      setStatus('failure')
      setReview(null)
      setSuccess(null)
      return
    }

    busyRef.current = true
    setStatus('preparing')
    logStep('Preparing before Freighter')
    let fresh: Awaited<ReturnType<typeof preparePayment>>
    try {
      fresh = await preparePayment(review.sender, review.recipient, review.amount)
    } catch {
      busyRef.current = false
      if (!mountedRef.current) return
      setFailure({
        ok: false,
        code: 'network',
        message: 'The payment could not be prepared. Please try again.',
      })
      setStatus('failure')
      return
    }
    logStep('Preparing before Freighter finished', { ok: fresh.ok })
    if (!fresh.ok) {
      busyRef.current = false
      logStep('Preparing before Freighter failed', { code: fresh.code })
      setFailure(fresh)
      setStatus('failure')
      return
    }

    setStatus('awaiting-signature')
    logStep('Waiting for Freighter')
    let signed: Awaited<ReturnType<typeof signPreparedPayment>>
    try {
      signed = await signPreparedPayment(fresh.value)
    } catch {
      busyRef.current = false
      if (!mountedRef.current) return
      setFailure({ ok: false, code: 'submission', message: 'Freighter could not sign the payment.' })
      setStatus('failure')
      return
    }
    logStep('Freighter step finished', { ok: signed.ok })
    if (!signed.ok) {
      busyRef.current = false
      logStep('Freighter signing failed', { code: signed.code })
      setFailure(signed)
      setStatus(signed.code === 'rejected' ? 'rejected' : 'failure')
      return
    }

    setStatus('submitting')
    logStep('Submitting to Horizon')
    let submitted: Awaited<ReturnType<typeof submitSignedPayment>>
    try {
      submitted = await submitSignedPayment(signed.value)
    } catch {
      busyRef.current = false
      if (!mountedRef.current) return
      setFailure({ ok: false, code: 'network', message: 'Submission could not be confirmed. It was not retried automatically.' })
      setStatus('failure')
      return
    }
    logStep('Horizon submission finished', { ok: submitted.ok })
    busyRef.current = false
    if (!mountedRef.current) return
    if (!submitted.ok) {
      logStep('Horizon submission failed', { code: submitted.code })
      setFailure(submitted)
      setStatus(submitted.code === 'timeout' ? 'timed-out' : 'failure')
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
    logStep('Success reached', { hash: submitted.value })
    await refreshBalance().catch(() => undefined)
  }, [balance, connected, logStep, networkPassphrase, refreshBalance, sender, review])

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
