import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  checkFreighterAvailability,
  connectFreighter,
  watchFreighterChanges,
  type WalletChangeResult,
  type WalletNetwork,
} from '../lib/freighter'

export type WalletStatus =
  | 'checking'
  | 'unavailable'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'wrong-network'
  | 'rejected'
  | 'error'

interface WalletState {
  status: WalletStatus
  publicAddress: string | null
  network: WalletNetwork | null
  message: string | null
}

export interface WalletController extends WalletState {
  shortenedAddress: string | null
  connect: () => Promise<void>
  disconnect: () => void
  retry: () => Promise<void>
}

const initialState: WalletState = {
  status: 'checking',
  publicAddress: null,
  network: null,
  message: null,
}

function shortenAddress(address: string): string {
  if (address.length <= 14) {
    return address
  }

  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

export function useWallet(): WalletController {
  const [wallet, setWallet] = useState<WalletState>(initialState)
  const mountedRef = useRef(true)
  const connectionInProgressRef = useRef(false)
  const sessionRef = useRef(0)

  const checkAvailability = useCallback(async () => {
    const session = ++sessionRef.current
    setWallet({
      status: 'checking',
      publicAddress: null,
      network: null,
      message: null,
    })

    const result = await checkFreighterAvailability()
    if (!mountedRef.current || session !== sessionRef.current) {
      return
    }

    if (result.status === 'available') {
      setWallet({
        status: 'disconnected',
        publicAddress: null,
        network: null,
        message: null,
      })
      return
    }

    setWallet({
      status: result.status,
      publicAddress: null,
      network: null,
      message: result.status === 'error' ? result.message : null,
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const session = ++sessionRef.current

    const initialCheck = async () => {
      const result = await checkFreighterAvailability()
      if (!mountedRef.current || session !== sessionRef.current) {
        return
      }

      if (result.status === 'available') {
        setWallet({
          status: 'disconnected',
          publicAddress: null,
          network: null,
          message: null,
        })
        return
      }

      setWallet({
        status: result.status,
        publicAddress: null,
        network: null,
        message: result.status === 'error' ? result.message : null,
      })
    }

    void initialCheck()

    return () => {
      mountedRef.current = false
      sessionRef.current += 1
    }
  }, [checkAvailability])

  const connect = useCallback(async () => {
    if (connectionInProgressRef.current) {
      return
    }

    connectionInProgressRef.current = true
    const session = ++sessionRef.current
    setWallet({
      status: 'connecting',
      publicAddress: null,
      network: null,
      message: null,
    })

    const result = await connectFreighter()
    connectionInProgressRef.current = false

    if (!mountedRef.current || session !== sessionRef.current) {
      return
    }

    if (result.status === 'connected') {
      setWallet({
        status: 'connected',
        publicAddress: result.publicAddress,
        network: result.network,
        message: null,
      })
      return
    }

    setWallet({
      status: result.status,
      publicAddress: null,
      network: result.status === 'wrong-network' ? result.network : null,
      message: result.status === 'wrong-network' ? null : result.message,
    })
  }, [])

  const disconnect = useCallback(() => {
    sessionRef.current += 1
    connectionInProgressRef.current = false
    setWallet({
      status: 'disconnected',
      publicAddress: null,
      network: null,
      message: null,
    })
  }, [])

  useEffect(() => {
    if (wallet.status !== 'connected') {
      return
    }

    const session = sessionRef.current
    const stopWatching = watchFreighterChanges(
      (result: WalletChangeResult) => {
        if (!mountedRef.current || session !== sessionRef.current) {
          return
        }

        if (result.status === 'connected') {
          setWallet({
            status: 'connected',
            publicAddress: result.publicAddress,
            network: result.network,
            message: null,
          })
          return
        }

        setWallet({
          status: result.status,
          publicAddress: null,
          network: result.status === 'wrong-network' ? result.network : null,
          message: result.status === 'error' ? result.message : null,
        })
      },
    )

    return stopWatching
  }, [wallet.status])

  const shortenedAddress = useMemo(
    () => (wallet.publicAddress ? shortenAddress(wallet.publicAddress) : null),
    [wallet.publicAddress],
  )

  return {
    ...wallet,
    shortenedAddress,
    connect,
    disconnect,
    retry: checkAvailability,
  }
}
