// Browser-wired singleton over the testable registry store. This is the module the app
// imports; it supplies the real fetch/localStorage/clock and derives the embedding parent
// origin for safeUrl.
//
// This is a Create-React-App app, so env is read via process.env.REACT_APP_*.
// No app-side gate: every chain the registry carries is offered. If the network exists in
// the registry, it works.
import { createRegistryStore } from "./registryStore"
import { buildFallback } from "./fallback"
import type { AppChain } from "./deriveChain"

export const REGISTRY_URL =
  process.env.REACT_APP_CHAIN_REGISTRY_URL || "https://registry.safe.protofire.io/api/v1/chains/"
const STORAGE_KEY = "zodiac.chainRegistry"
const TIMEOUT_MS = 2500
const TTL_MS = 3_600_000 // 1h (roles cache TTL)

/**
 * The embedding Safe UI's origin. When iframed inside the Safe UI that owns the chain, the
 * parent frame origin is the correct base for safeUrl; otherwise fall back to own origin.
 */
const getParentOrigin = (): string => {
  try {
    const ancestors = window.location.ancestorOrigins
    if (ancestors && ancestors.length > 0) return ancestors[0]
    if (document.referrer) return new URL(document.referrer).origin
  } catch {
    /* fall through to own origin */
  }
  return window.location.origin
}

const parentOrigin = getParentOrigin()

const store = createRegistryStore({
  fetchFn: (...args) => fetch(...args),
  storage: typeof localStorage !== "undefined" ? localStorage : undefined,
  now: () => Date.now(),
  parentOrigin,
  registryUrl: REGISTRY_URL,
  timeoutMs: TIMEOUT_MS,
  ttlMs: TTL_MS,
  fallback: buildFallback(parentOrigin),
  // No gate: any chain present in the registry (or FALLBACK) is offered.
  storageKey: STORAGE_KEY,
})

export const initRegistry = (): Promise<void> => store.init()
export const getRegistryChain = (chainId: number): AppChain | undefined => store.getChain(chainId)
export const getAllRegistryChains = (): AppChain[] => store.getAllChains()
export const getRegistrySource = () => store.getSource()
