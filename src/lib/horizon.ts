import {
  Horizon,
  NetworkError,
  NotFoundError,
} from '@stellar/stellar-sdk'

export const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org'

const NETWORK_ERROR_MESSAGE =
  'The Testnet balance service is temporarily unavailable. Please try again.'
const MALFORMED_ERROR_MESSAGE =
  'The Testnet balance service returned an unexpected response.'
const CONFIGURATION_ERROR_MESSAGE =
  'The configured Horizon endpoint must be a valid HTTPS URL.'

export type BalanceResult =
  | { status: 'funded'; balance: string }
  | { status: 'unfunded' }
  | {
      status: 'error'
      reason: 'network' | 'malformed' | 'configuration'
      message: string
    }

export interface HorizonAccountClient {
  loadAccount: (publicAddress: string) => Promise<unknown>
}

export function resolveHorizonUrl(override?: string): string {
  const candidate = override?.trim() || DEFAULT_HORIZON_URL

  try {
    const url = new URL(candidate)
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw new Error('Invalid Horizon URL')
    }

    return url.toString().replace(/\/$/, '')
  } catch {
    throw new Error(CONFIGURATION_ERROR_MESSAGE)
  }
}

let horizonClient: Horizon.Server | null = null

function getHorizonClient(): Horizon.Server {
  if (!horizonClient) {
    const url = resolveHorizonUrl(import.meta.env.VITE_HORIZON_URL)
    horizonClient = new Horizon.Server(url)
  }

  return horizonClient
}

function malformedResult(): BalanceResult {
  return {
    status: 'error',
    reason: 'malformed',
    message: MALFORMED_ERROR_MESSAGE,
  }
}

export function extractNativeXlmBalance(account: unknown): BalanceResult {
  if (
    typeof account !== 'object' ||
    account === null ||
    !('balances' in account) ||
    !Array.isArray(account.balances)
  ) {
    return malformedResult()
  }

  const nativeBalance = account.balances.find(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      'asset_type' in entry &&
      entry.asset_type === 'native',
  )

  if (
    typeof nativeBalance !== 'object' ||
    nativeBalance === null ||
    !('balance' in nativeBalance) ||
    typeof nativeBalance.balance !== 'string' ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(nativeBalance.balance)
  ) {
    return malformedResult()
  }

  return { status: 'funded', balance: nativeBalance.balance }
}

function isUnfundedError(error: unknown): boolean {
  return (
    error instanceof NotFoundError ||
    (error instanceof NetworkError && error.response?.status === 404)
  )
}

export async function loadNativeXlmBalance(
  publicAddress: string,
  client?: HorizonAccountClient,
): Promise<BalanceResult> {
  try {
    const account = await (client ?? getHorizonClient()).loadAccount(
      publicAddress,
    )
    return extractNativeXlmBalance(account)
  } catch (error) {
    if (isUnfundedError(error)) {
      return { status: 'unfunded' }
    }

    if (
      error instanceof Error &&
      error.message === CONFIGURATION_ERROR_MESSAGE
    ) {
      return {
        status: 'error',
        reason: 'configuration',
        message: CONFIGURATION_ERROR_MESSAGE,
      }
    }

    return {
      status: 'error',
      reason: 'network',
      message: NETWORK_ERROR_MESSAGE,
    }
  }
}
