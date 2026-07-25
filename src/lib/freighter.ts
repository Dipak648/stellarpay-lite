import {
  WatchWalletChanges,
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
} from '@stellar/freighter-api'
import { Networks } from '@stellar/stellar-sdk'

export const TESTNET_PASSPHRASE = Networks.TESTNET

export interface WalletNetwork {
  name: string
  url: string
  passphrase: string
}

interface FreighterError {
  code: number
  message: string
}

export type AvailabilityResult =
  | { status: 'available' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

export type ConnectionResult =
  | { status: 'connected'; publicAddress: string; network: WalletNetwork }
  | { status: 'wrong-network'; network: WalletNetwork }
  | { status: 'rejected'; message: string }
  | { status: 'error'; message: string }

export type WalletChangeResult =
  | { status: 'connected'; publicAddress: string; network: WalletNetwork }
  | { status: 'wrong-network'; network: WalletNetwork }
  | { status: 'disconnected' }
  | { status: 'error'; message: string }

const GENERIC_ERROR_MESSAGE =
  'Freighter could not complete the request. Please try again.'
const REJECTED_ERROR_CODE = -4

function safeErrorMessage(error?: FreighterError): string {
  if (error?.code === REJECTED_ERROR_CODE) {
    return 'Wallet access was declined. You can try again when you are ready.'
  }

  return GENERIC_ERROR_MESSAGE
}

function toNetwork(
  details: Awaited<ReturnType<typeof getNetworkDetails>>,
): WalletNetwork {
  return {
    name: details.network,
    url: details.networkUrl,
    passphrase: details.networkPassphrase,
  }
}

export function isTestnet(networkPassphrase: string): boolean {
  return networkPassphrase === TESTNET_PASSPHRASE
}

export async function checkFreighterAvailability(): Promise<AvailabilityResult> {
  try {
    const result = await isConnected()

    if (result.error) {
      return { status: 'error', message: GENERIC_ERROR_MESSAGE }
    }

    return { status: result.isConnected ? 'available' : 'unavailable' }
  } catch {
    return { status: 'error', message: GENERIC_ERROR_MESSAGE }
  }
}

export async function connectFreighter(): Promise<ConnectionResult> {
  try {
    const access = await requestAccess()

    if (access.error) {
      return access.error.code === REJECTED_ERROR_CODE
        ? { status: 'rejected', message: safeErrorMessage(access.error) }
        : { status: 'error', message: safeErrorMessage(access.error) }
    }

    const addressResult = await getAddress()
    if (addressResult.error || !addressResult.address) {
      return {
        status: 'error',
        message: safeErrorMessage(addressResult.error),
      }
    }

    const networkResult = await getNetworkDetails()
    if (networkResult.error || !networkResult.networkPassphrase) {
      return {
        status: 'error',
        message: safeErrorMessage(networkResult.error),
      }
    }

    const network = toNetwork(networkResult)
    if (!isTestnet(network.passphrase)) {
      return { status: 'wrong-network', network }
    }

    return {
      status: 'connected',
      publicAddress: addressResult.address,
      network,
    }
  } catch {
    return { status: 'error', message: GENERIC_ERROR_MESSAGE }
  }
}

export function watchFreighterChanges(
  onChange: (result: WalletChangeResult) => void,
  interval = 5_000,
): () => void {
  const watcher = new WatchWalletChanges(interval)
  const result = watcher.watch(
    ({ address, network, networkPassphrase, error }) => {
      if (error) {
        onChange({ status: 'error', message: safeErrorMessage(error) })
        return
      }

      if (!address) {
        onChange({ status: 'disconnected' })
        return
      }

      const networkInfo: WalletNetwork = {
        name: network,
        url: '',
        passphrase: networkPassphrase,
      }

      if (!isTestnet(networkPassphrase)) {
        onChange({ status: 'wrong-network', network: networkInfo })
        return
      }

      onChange({
        status: 'connected',
        publicAddress: address,
        network: networkInfo,
      })
    },
  )

  if (result.error) {
    onChange({ status: 'error', message: safeErrorMessage(result.error) })
  }

  return () => watcher.stop()
}
