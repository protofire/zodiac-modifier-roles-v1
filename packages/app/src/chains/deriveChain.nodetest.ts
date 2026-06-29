import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveExplorerApiUrl,
  deriveExplorerUrl,
  deriveExplorerName,
  deriveRpc,
  deriveSafeUrl,
  deriveVerifyContractUrl,
  normalizeTransactionService,
  toAppChain,
} from './deriveChain.ts'
import type { RegistryChainRaw } from './deriveChain.ts'

const rawMainnet: RegistryChainRaw = {
  chainId: '1',
  chainName: 'Ethereum',
  shortName: 'eth',
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  safeAppsRpcUri: { value: 'https://mainnet.infura.io/v3/{{INFURA_API_KEY}}' },
  blockExplorerUriTemplate: {
    address: 'https://etherscan.io/address/{{address}}',
    api: 'https://api.etherscan.io/v2/api?module={{module}}&action={{action}}',
  },
  transactionService: 'https://transaction-mainnet.safe.protofire.io',
  features: ['ZODIAC'],
}

test('deriveExplorerApiUrl truncates the registry api template at the query string', () => {
  // Registry serves a full Etherscan-V2 template; the app builds its own query params,
  // so everything from `?` onward must be dropped.
  assert.equal(
    deriveExplorerApiUrl('https://api.etherscan.io/v2/api?module={{module}}&action={{action}}'),
    'https://api.etherscan.io/v2/api',
  )
})

test('deriveExplorerUrl strips the /address/{{address}} tail and trailing slash', () => {
  assert.equal(
    deriveExplorerUrl('https://etherscan.io/address/{{address}}'),
    'https://etherscan.io',
  )
  // already a bare origin
  assert.equal(deriveExplorerUrl('https://gnosisscan.io/'), 'https://gnosisscan.io')
  // a path that is not the address template is preserved (no over-trimming)
  assert.equal(
    deriveExplorerUrl('https://unichain.blockscout.com/address/{{address}}'),
    'https://unichain.blockscout.com',
  )
})

test('deriveExplorerName takes the host, strips www., and title-cases', () => {
  assert.equal(deriveExplorerName('https://etherscan.io/address/{{address}}'), 'Etherscan')
  assert.equal(deriveExplorerName('https://www.snowtrace.io/address/{{address}}'), 'Snowtrace')
  assert.equal(
    deriveExplorerName('https://unichain.blockscout.com/address/{{address}}'),
    'Unichain',
  )
})

test('deriveRpc prefers safeApps > public > rpc but skips templated-key URIs when a usable one exists', () => {
  // safeApps is an Infura template (unusable once the key is stripped) and a public RPC
  // exists -> prefer the usable public RPC rather than a keyless Infura URL.
  assert.equal(
    deriveRpc({
      safeAppsRpcUri: { value: 'https://mainnet.infura.io/v3/{{INFURA_API_KEY}}' },
      publicRpcUri: { value: 'https://cloudflare-eth.com' },
    }),
    'https://cloudflare-eth.com',
  )
  // a non-templated safeApps URI keeps top priority
  assert.equal(
    deriveRpc({
      safeAppsRpcUri: { value: 'https://safe-rpc.protofire.io/eth' },
      publicRpcUri: { value: 'https://cloudflare-eth.com' },
    }),
    'https://safe-rpc.protofire.io/eth',
  )
  // all candidates templated -> strip the first (best-effort, key dropped)
  assert.equal(
    deriveRpc({ safeAppsRpcUri: { value: 'https://x.infura.io/v3/{{INFURA_API_KEY}}' } }),
    'https://x.infura.io/v3',
  )
  // falls through to publicRpcUri then rpcUri
  assert.equal(deriveRpc({ publicRpcUri: { value: 'https://rpc.ankr.com/eth' } }), 'https://rpc.ankr.com/eth')
  assert.equal(deriveRpc({ rpcUri: { value: 'https://x.io' } }), 'https://x.io')
  // nothing available
  assert.equal(deriveRpc({}), '')
})

test('deriveSafeUrl is parentOrigin + shortName with a trailing colon', () => {
  assert.equal(deriveSafeUrl('https://app.safe.protofire.io', 'eth'), 'https://app.safe.protofire.io/eth:')
  // parent origin with trailing slash is normalised
  assert.equal(deriveSafeUrl('https://safe.linea.build/', 'linea'), 'https://safe.linea.build/linea:')
})

test('deriveVerifyContractUrl appends /verifyContract to the explorer base', () => {
  assert.equal(deriveVerifyContractUrl('https://etherscan.io'), 'https://etherscan.io/verifyContract')
})

test('normalizeTransactionService enforces a single trailing slash, passes null through', () => {
  assert.equal(normalizeTransactionService('https://tx.safe.protofire.io'), 'https://tx.safe.protofire.io/')
  assert.equal(normalizeTransactionService('https://tx.safe.protofire.io/'), 'https://tx.safe.protofire.io/')
  // a FALLBACK chain with no tx-service disables the feature rather than guessing a host
  assert.equal(normalizeTransactionService(null), null)
  assert.equal(normalizeTransactionService(undefined), null)
})

test('toAppChain maps a raw registry entry onto the full app chain shape', () => {
  const chain = toAppChain(rawMainnet, { parentOrigin: 'https://app.safe.protofire.io' })
  assert.deepEqual(chain, {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'eth',
    nativeAsset: { symbol: 'ETH', decimals: 18 },
    rpc: 'https://mainnet.infura.io/v3',
    explorer: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/v2/api',
    },
    verifyContractUrl: 'https://etherscan.io/verifyContract',
    safeTransactionApi: 'https://transaction-mainnet.safe.protofire.io/',
    safeUrl: 'https://app.safe.protofire.io/eth:',
    features: ['ZODIAC'],
  })
})

test('toAppChain returns null for a non-numeric chainId', () => {
  assert.equal(toAppChain({ ...rawMainnet, chainId: 'not-a-number' }, { parentOrigin: 'x' }), null)
})
