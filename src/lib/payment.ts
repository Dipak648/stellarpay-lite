import { getAddress, getNetworkDetails, signTransaction } from '@stellar/freighter-api'
import {
  Asset,
  Horizon,
  Keypair,
  NetworkError,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
  TransactionFailedError,
} from '@stellar/stellar-sdk'
import { getHorizonClient, type HorizonAccountClient } from './horizon'

export const TRANSACTION_TIMEOUT_SECONDS = 180

export type PaymentErrorCode =
  | 'invalid-recipient'
  | 'invalid-amount'
  | 'insufficient-balance'
  | 'same-account'
  | 'unfunded-destination'
  | 'wrong-network'
  | 'account-changed'
  | 'rejected'
  | 'bad-sequence'
  | 'insufficient-reserve'
  | 'timeout'
  | 'network'
  | 'submission'

export interface PaymentFailure {
  ok: false
  code: PaymentErrorCode
  message: string
}

export interface PaymentReview {
  sender: string
  recipient: string
  amount: string
  network: 'Stellar Testnet'
  fee: string
  unsignedXdr: string
}

type PaymentResult<T> = { ok: true; value: T } | PaymentFailure

export interface PaymentHorizonClient extends HorizonAccountClient {
  fetchBaseFee: () => Promise<number>
  submitTransaction: (transaction: unknown) => Promise<{ hash?: string }>
}

const failure = (code: PaymentErrorCode, message: string): PaymentFailure => ({
  ok: false,
  code,
  message,
})

export function isValidStellarAddress(address: string): boolean {
  try {
    Keypair.fromPublicKey(address)
    return true
  } catch {
    return false
  }
}

export function isValidAmount(amount: string): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(amount) && !/^0(?:\.0*)?$/.test(amount)
}

function decimalUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'))
}

export function compareDecimalStrings(left: string, right: string): number {
  const leftUnits = decimalUnits(left)
  const rightUnits = decimalUnits(right)
  return leftUnits === rightUnits ? 0 : leftUnits > rightUnits ? 1 : -1
}

export function validatePayment(input: {
  sender: string | null
  recipient: string
  amount: string
  balance: string | null
  isTestnetConnected: boolean
}): PaymentFailure | null {
  const recipient = input.recipient.trim()
  const amount = input.amount.trim()
  if (!input.sender || !input.isTestnetConnected) {
    return failure('wrong-network', 'Connect Freighter on Stellar Testnet.')
  }
  if (!recipient || !isValidStellarAddress(recipient)) {
    return failure('invalid-recipient', 'Enter a valid Stellar G-address.')
  }
  if (recipient === input.sender) {
    return failure('same-account', 'The recipient must differ from the sender.')
  }
  if (!amount || !isValidAmount(amount)) {
    return failure('invalid-amount', 'Enter an amount greater than zero with at most seven decimal places.')
  }
  if (!input.balance || compareDecimalStrings(amount, input.balance) > 0) {
    return failure('insufficient-balance', 'The amount exceeds the displayed XLM balance.')
  }
  return null
}

function stroopsToXlm(stroops: number): string {
  const value = BigInt(String(stroops))
  return `${value / 10_000_000n}.${(value % 10_000_000n).toString().padStart(7, '0')}`
}

function client(): PaymentHorizonClient {
  return getHorizonClient() as unknown as PaymentHorizonClient
}

export async function preparePayment(
  sender: string,
  recipient: string,
  amount: string,
  horizon: PaymentHorizonClient = client(),
): Promise<PaymentResult<PaymentReview>> {
  try {
    const [source, fee] = await Promise.all([
      horizon.loadAccount(sender),
      horizon.fetchBaseFee(),
      horizon.loadAccount(recipient),
    ])
    const transaction = new TransactionBuilder(
      source as Horizon.AccountResponse,
      { fee: String(fee), networkPassphrase: Networks.TESTNET },
    )
      .addOperation(
        Operation.payment({
          destination: recipient,
          asset: Asset.native(),
          amount,
        }),
      )
      .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
      .build()

    return {
      ok: true,
      value: {
        sender,
        recipient,
        amount,
        network: 'Stellar Testnet',
        fee: stroopsToXlm(fee),
        unsignedXdr: transaction.toXDR(),
      },
    }
  } catch (error) {
    if (error instanceof NotFoundError || (error instanceof NetworkError && error.response?.status === 404)) {
      return failure('unfunded-destination', 'The recipient is unfunded. A standard payment cannot create the account.')
    }
    return failure('network', 'Horizon is unavailable. No transaction was signed or submitted.')
  }
}

export async function signPreparedPayment(
  review: PaymentReview,
): Promise<PaymentResult<string>> {
  try {
    const [address, network] = await Promise.all([getAddress(), getNetworkDetails()])
    if (address.error || address.address !== review.sender) {
      return failure('account-changed', 'The active Freighter account changed. Review the payment again.')
    }
    if (network.error || network.networkPassphrase !== Networks.TESTNET) {
      return failure('wrong-network', 'Switch Freighter back to Stellar Testnet and review again.')
    }
    const signed = await signTransaction(review.unsignedXdr, {
      networkPassphrase: Networks.TESTNET,
      address: review.sender,
    })
    if (signed.error) {
      return signed.error.code === -4
        ? failure('rejected', 'The signing request was rejected in Freighter.')
        : failure('submission', 'Freighter could not sign the payment.')
    }
    if (!signed.signedTxXdr || signed.signerAddress !== review.sender) {
      return failure('account-changed', 'Freighter returned a different signing account.')
    }
    return { ok: true, value: signed.signedTxXdr }
  } catch {
    return failure('submission', 'Freighter could not sign the payment.')
  }
}

export async function submitSignedPayment(
  signedXdr: string,
  horizon: PaymentHorizonClient = client(),
): Promise<PaymentResult<string>> {
  try {
    const transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
    const response = await horizon.submitTransaction(transaction)
    if (!response.hash || !/^[a-fA-F0-9]{64}$/.test(response.hash)) {
      return failure('submission', 'Horizon did not return a valid transaction hash.')
    }
    return { ok: true, value: response.hash.toLowerCase() }
  } catch (error) {
    if (error instanceof TransactionFailedError) {
      const codes = error.getResultCodes()
      if (codes.transaction === 'tx_bad_seq') {
        return failure('bad-sequence', 'The account sequence changed. Review and sign a newly built transaction.')
      }
      if (codes.operations?.includes('op_underfunded')) {
        return failure('insufficient-reserve', 'The account cannot cover the payment, reserve, and network fee.')
      }
      if (codes.transaction === 'tx_too_late') {
        return failure('timeout', 'The transaction expired. Review and sign a new payment.')
      }
    }
    return failure('network', 'Submission could not be confirmed. It was not retried automatically.')
  }
}
