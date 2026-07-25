import { NetworkError, NotFoundError } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import { formatXlmBalance } from './formatBalance'
import {
  DEFAULT_HORIZON_URL,
  extractNativeXlmBalance,
  loadNativeXlmBalance,
  resolveHorizonUrl,
  type HorizonAccountClient,
} from './horizon'

function clientReturning(account: unknown): HorizonAccountClient {
  return {
    loadAccount: vi.fn().mockResolvedValue(account),
  }
}

describe('Horizon Testnet balance client', () => {
  it('uses the safe Testnet default and validates HTTPS overrides', () => {
    expect(resolveHorizonUrl()).toBe(DEFAULT_HORIZON_URL)
    expect(resolveHorizonUrl('https://example.com/horizon/')).toBe(
      'https://example.com/horizon',
    )
    expect(() => resolveHorizonUrl('http://example.com')).toThrow(/HTTPS URL/)
    expect(() => resolveHorizonUrl('not-a-url')).toThrow(/HTTPS URL/)
  })

  it('extracts only the native XLM balance and ignores issued assets', () => {
    const result = extractNativeXlmBalance({
      balances: [
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'XLM',
          asset_issuer: 'GISSUER',
          balance: '999999.0000000',
        },
        { asset_type: 'native', balance: '123.4567890' },
      ],
    })

    expect(result).toEqual({
      status: 'funded',
      balance: '123.4567890',
    })
  })

  it('formats large balances as strings while preserving seven decimals', () => {
    expect(formatXlmBalance('12345678901234567890.1234567')).toBe(
      '12,345,678,901,234,567,890.1234567',
    )
  })

  it('loads a funded account through Horizon Server.loadAccount', async () => {
    const client = clientReturning({
      balances: [{ asset_type: 'native', balance: '25.0000000' }],
    })

    await expect(
      loadNativeXlmBalance('GTESTADDRESS', client),
    ).resolves.toEqual({ status: 'funded', balance: '25.0000000' })
    expect(client.loadAccount).toHaveBeenCalledWith('GTESTADDRESS')
  })

  it('classifies a Horizon 404 as an unfunded account', async () => {
    const client: HorizonAccountClient = {
      loadAccount: vi
        .fn()
        .mockRejectedValue(new NotFoundError('Not found', { status: 404 })),
    }

    await expect(
      loadNativeXlmBalance('GUNFUNDED', client),
    ).resolves.toEqual({ status: 'unfunded' })
  })

  it('classifies temporary Horizon failures without exposing raw details', async () => {
    const client: HorizonAccountClient = {
      loadAccount: vi.fn().mockRejectedValue(
        new NetworkError('internal upstream details', {
          status: 503,
          data: { detail: 'large raw response' },
        }),
      ),
    }

    const result = await loadNativeXlmBalance('GTESTADDRESS', client)
    expect(result).toEqual({
      status: 'error',
      reason: 'network',
      message:
        'The Testnet balance service is temporarily unavailable. Please try again.',
    })
    expect(JSON.stringify(result)).not.toContain('large raw response')
  })

  it.each([
    undefined,
    {},
    { balances: 'not-an-array' },
    { balances: [] },
    {
      balances: [
        { asset_type: 'credit_alphanum4', balance: '10.0000000' },
      ],
    },
    { balances: [{ asset_type: 'native', balance: 'not-a-balance' }] },
    { balances: [{ asset_type: 'native', balance: '1.12345678' }] },
  ])('handles malformed account response %#', async (account) => {
    const result = await loadNativeXlmBalance(
      'GTESTADDRESS',
      clientReturning(account),
    )

    expect(result).toEqual({
      status: 'error',
      reason: 'malformed',
      message: 'The Testnet balance service returned an unexpected response.',
    })
  })
})
