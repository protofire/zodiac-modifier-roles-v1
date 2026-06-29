// Registry store: fetches the Chain Registry (paginating via `next`), derives the
// app chain shape, caches to localStorage, and resolves each chain as
// `registry[id] ?? cache[id] ?? FALLBACK[id]`. Never throws from init().
//
// Implemented as a factory so it can be driven with injected fetch/storage/clock in
// tests (see registryStore.nodetest.ts); the app wires a browser-backed singleton in
// registry.ts.
import { toAppChain } from './deriveChain.ts'
import type { AppChain, RegistryChainRaw } from './deriveChain.ts'

export type RegistrySource = 'uninitialized' | 'registry' | 'cache' | 'fallback'

export interface RegistryStoreDeps {
  fetchFn: typeof fetch
  storage: Storage | undefined
  now: () => number
  parentOrigin: string
  registryUrl: string
  timeoutMs: number
  ttlMs: number
  /** Manual exceptions, keyed by chainId. Backstops chains/fields the registry lacks. */
  fallback: Record<number, AppChain>
  /** Whether an (existing) chain is usable/offered. Defaults to always-true. */
  gate?: (chainId: number) => boolean
  storageKey?: string
}

interface CachePayload {
  fetchedAt: number
  chains: AppChain[]
}

interface RegistryPage {
  results?: RegistryChainRaw[]
  next?: string | null
}

const indexByChainId = (chains: AppChain[]): Map<number, AppChain> => {
  const map = new Map<number, AppChain>()
  for (const chain of chains) {
    if (!map.has(chain.chainId)) map.set(chain.chainId, chain) // first occurrence wins
  }
  return map
}

export interface RegistryStore {
  init(): Promise<void>
  getChain(chainId: number): AppChain | undefined
  getAllChains(): AppChain[]
  getSource(): RegistrySource
}

export const createRegistryStore = (deps: RegistryStoreDeps): RegistryStore => {
  const storageKey = deps.storageKey ?? 'zodiac.chainRegistry'
  const gate = deps.gate ?? (() => true)

  let registryMap = new Map<number, AppChain>()
  let cacheMap = new Map<number, AppChain>()
  let source: RegistrySource = 'uninitialized'

  const readCache = (): AppChain[] | undefined => {
    try {
      const raw = deps.storage?.getItem(storageKey)
      if (!raw) return undefined
      const payload = JSON.parse(raw) as CachePayload
      return Array.isArray(payload.chains) ? payload.chains : undefined
    } catch {
      return undefined
    }
  }

  const writeCache = (chains: AppChain[]): void => {
    try {
      const payload: CachePayload = { fetchedAt: deps.now(), chains }
      deps.storage?.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // storage may be full or unavailable — caching is best-effort.
    }
  }

  const fetchAllPages = async (): Promise<RegistryChainRaw[]> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs)
    try {
      const all: RegistryChainRaw[] = []
      let url: string | null = deps.registryUrl
      let guard = 0
      while (url && guard++ < 100) {
        const response: Response = await deps.fetchFn(url, { signal: controller.signal })
        if (!response.ok) throw new Error(`registry responded ${response.status}`)
        const page = (await response.json()) as RegistryPage
        if (page.results) all.push(...page.results)
        url = page.next ?? null
      }
      return all
    } finally {
      clearTimeout(timer)
    }
  }

  const init = async (): Promise<void> => {
    // Seed from cache first so a slow/failed fetch still has warm data.
    const cached = readCache()
    if (cached) cacheMap = indexByChainId(cached)

    try {
      const rawChains = await fetchAllPages()
      const derived = rawChains
        .map((raw) => toAppChain(raw, { parentOrigin: deps.parentOrigin }))
        .filter((chain): chain is AppChain => chain !== null)

      if (derived.length === 0) throw new Error('registry returned no usable chains')

      registryMap = indexByChainId(derived)
      writeCache(Array.from(registryMap.values()))
      source = 'registry'
    } catch {
      source = cacheMap.size > 0 ? 'cache' : 'fallback'
    }
  }

  const getChain = (chainId: number): AppChain | undefined =>
    registryMap.get(chainId) ?? cacheMap.get(chainId) ?? deps.fallback[chainId]

  const getAllChains = (): AppChain[] => {
    const ids = new Set<number>([
      ...registryMap.keys(),
      ...cacheMap.keys(),
      ...Object.keys(deps.fallback).map(Number),
    ])
    const chains: AppChain[] = []
    for (const id of ids) {
      if (!gate(id)) continue
      const chain = getChain(id)
      if (chain) chains.push(chain)
    }
    return chains
  }

  return { init, getChain, getAllChains, getSource: () => source }
}
