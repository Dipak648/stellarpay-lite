import { useCallback, useEffect, useRef, useState } from 'react'
import { loadNativeXlmBalance } from '../lib/horizon'

export type BalanceStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'unfunded'
  | 'error'

interface BalanceState {
  account: string | null
  status: BalanceStatus
  balance: string | null
  errorMessage: string | null
  lastUpdated: Date | null
}

export interface BalanceController {
  status: BalanceStatus
  balance: string | null
  errorMessage: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const idleState: BalanceState = {
  account: null,
  status: 'idle',
  balance: null,
  errorMessage: null,
  lastUpdated: null,
}

function resultToState(
  account: string,
  result: Awaited<ReturnType<typeof loadNativeXlmBalance>>,
): BalanceState {
  const lastUpdated = new Date()

  if (result.status === 'funded') {
    return {
      account,
      status: 'success',
      balance: result.balance,
      errorMessage: null,
      lastUpdated,
    }
  }

  if (result.status === 'unfunded') {
    return {
      account,
      status: 'unfunded',
      balance: null,
      errorMessage: null,
      lastUpdated,
    }
  }

  return {
    account,
    status: 'error',
    balance: null,
    errorMessage: result.message,
    lastUpdated,
  }
}

export function useBalance(
  publicAddress: string | null,
  isTestnetConnected: boolean,
): BalanceController {
  const [balanceState, setBalanceState] = useState<BalanceState>(idleState)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const activeAccount =
    isTestnetConnected && publicAddress ? publicAddress : null

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!activeAccount) {
      requestIdRef.current += 1
      return
    }

    const account = activeAccount
    const requestId = ++requestIdRef.current
    let active = true

    const load = async () => {
      const result = await loadNativeXlmBalance(account)
      if (
        !active ||
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return
      }

      setBalanceState(resultToState(account, result))
    }

    void load()

    return () => {
      active = false
    }
  }, [activeAccount])

  const refresh = useCallback(async () => {
    const account = activeAccount
    if (!account) {
      return
    }

    const requestId = ++requestIdRef.current
    setBalanceState({
      account,
      status: 'loading',
      balance: null,
      errorMessage: null,
      lastUpdated: null,
    })

    const result = await loadNativeXlmBalance(account)
    if (
      !mountedRef.current ||
      requestId !== requestIdRef.current
    ) {
      return
    }

    setBalanceState(resultToState(account, result))
  }, [activeAccount])

  if (!activeAccount) {
    return { ...idleState, refresh }
  }

  if (balanceState.account !== activeAccount) {
    return {
      status: 'loading',
      balance: null,
      errorMessage: null,
      lastUpdated: null,
      refresh,
    }
  }

  return {
    status: balanceState.status,
    balance: balanceState.balance,
    errorMessage: balanceState.errorMessage,
    lastUpdated: balanceState.lastUpdated,
    refresh,
  }
}
