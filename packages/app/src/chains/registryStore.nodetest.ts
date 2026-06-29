import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRegistryStore } from './registryStore.ts'
import type { RegistryChainRaw } from './deriveChain.ts'
import type { AppChain } from './deriveChain.ts'

const raw = (chainId: string, shortName: string, extra: Partial<RegistryChainRaw> = {}): RegistryChainRaw => ({
  chainId,
  chainName: `Chain ${chainId}`,
  shortName,
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  publicRpcUri: { value: `https://rpc.${shortName}.example` },
  blockExplorerUriTemplate: {
    address: `https://${shortName}.example/address/{{address}}`,
    api: `https://api.${shortName}.example/api?x=1`,
  },
  transactionService: `https://tx.${shortName}.example`,
  ...extra,
})

// A fetch fake that serves the given pages in order; `next` chains them.
const pagedFetch = (pages: RegistryChainRaw[][]) => {
  const urls = pages.map((_, i) => `https://reg/page/${i}`)
  return async (url: string | URL) => {
    const u = String(url)
    const idx = u.includes('/page/') ? Number(u.split('/page/')[1]) : 0
    const results = pages[idx] ?? []
    const next = idx + 1 < pages.length ? urls[idx + 1] : null
    return { ok: true, json: async () => ({ results, next }) } as unknown as Response
  }
}

const memStorage = (): Storage => {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size
    },
  } as Storage
}

const baseDeps = () => ({
  fetchFn: pagedFetch([[raw('1', 'eth')]]),
  storage: memStorage(),
  now: () => 1000,
  parentOrigin: 'https://app.safe.protofire.io',
  registryUrl: 'https://reg/page/0',
  timeoutMs: 100,
  ttlMs: 10_000,
  fallback: {} as Record<number, AppChain>,
})

test('init follows `next` across pages and exposes every chain', async () => {
  const store = createRegistryStore({
    ...baseDeps(),
    fetchFn: pagedFetch([[raw('1', 'eth')], [raw('100', 'gno')], [raw('10', 'oeth')]]),
  })
  await store.init()
  assert.equal(store.getSource(), 'registry')
  assert.deepEqual(
    store.getAllChains().map((c) => c.chainId).sort((a, b) => a - b),
    [1, 10, 100],
  )
})

test('init dedupes repeated chainIds (first occurrence wins)', async () => {
  const store = createRegistryStore({
    ...baseDeps(),
    fetchFn: pagedFetch([[raw('1', 'eth')], [raw('1', 'eth-dup')]]),
  })
  await store.init()
  const all = store.getAllChains().filter((c) => c.chainId === 1)
  assert.equal(all.length, 1)
  assert.equal(all[0].shortName, 'eth')
})

test('getChain resolves registry value; FALLBACK only fills gaps (registry wins)', async () => {
  const fallback: Record<number, AppChain> = {
    1: { chainId: 1, name: 'STALE', shortName: 'stale', nativeAsset: { symbol: 'X', decimals: 18 }, rpc: '', explorer: { name: '', url: '', apiUrl: '' }, verifyContractUrl: '', safeTransactionApi: null, safeUrl: '', features: [] },
    999: { chainId: 999, name: 'Hemi-like', shortName: 'hemi', nativeAsset: { symbol: 'ETH', decimals: 18 }, rpc: 'https://rpc.hemi', explorer: { name: 'H', url: 'https://h', apiUrl: 'https://h/api' }, verifyContractUrl: 'https://h/verifyContract', safeTransactionApi: null, safeUrl: '', features: [] },
  }
  const store = createRegistryStore({ ...baseDeps(), fallback, fetchFn: pagedFetch([[raw('1', 'eth')]]) })
  await store.init()
  assert.equal(store.getChain(1)!.name, 'Chain 1') // registry beats fallback
  assert.equal(store.getChain(999)!.name, 'Hemi-like') // fallback fills the gap
})

test('on fetch failure, falls back to the localStorage cache and never throws', async () => {
  const storage = memStorage()
  // warm the cache via a successful run
  const ok = createRegistryStore({ ...baseDeps(), storage, fetchFn: pagedFetch([[raw('1', 'eth')]]) })
  await ok.init()
  // new boot, registry unreachable
  const store = createRegistryStore({
    ...baseDeps(),
    storage,
    fetchFn: async () => {
      throw new Error('network down')
    },
  })
  await assert.doesNotReject(() => store.init())
  assert.equal(store.getSource(), 'cache')
  assert.equal(store.getChain(1)!.shortName, 'eth')
})

test('cold boot, empty cache, registry unreachable resolves only FALLBACK chains', async () => {
  const fallback: Record<number, AppChain> = {
    999: { chainId: 999, name: 'Hemi', shortName: 'hemi', nativeAsset: { symbol: 'ETH', decimals: 18 }, rpc: 'https://rpc.hemi', explorer: { name: 'H', url: 'https://h', apiUrl: 'https://h/api' }, verifyContractUrl: 'https://h/verifyContract', safeTransactionApi: null, safeUrl: '', features: [] },
  }
  const store = createRegistryStore({
    ...baseDeps(),
    fallback,
    storage: memStorage(),
    fetchFn: async () => {
      throw new Error('down')
    },
  })
  await store.init()
  assert.equal(store.getSource(), 'fallback')
  assert.deepEqual(store.getAllChains().map((c) => c.chainId), [999])
})

test('gate narrows getAllChains but getChain still resolves a non-gated chain', async () => {
  const store = createRegistryStore({
    ...baseDeps(),
    fetchFn: pagedFetch([[raw('1', 'eth'), raw('100', 'gno')]]),
    gate: (id) => id === 1, // only mainnet is usable
  })
  await store.init()
  assert.deepEqual(store.getAllChains().map((c) => c.chainId), [1])
  assert.equal(store.getChain(100)!.shortName, 'gno') // metadata still resolvable
})
