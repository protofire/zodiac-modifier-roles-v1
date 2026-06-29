import type { AppChain } from './deriveChain.ts'
import { deriveSafeUrl, deriveVerifyContractUrl } from './deriveChain.ts'

// Manual exceptions only — chains the Chain Registry does not (yet) carry. The registry
// always wins (`registry[id] ?? cache[id] ?? FALLBACK[id]`); an entry here is deleted
// once the registry serves that chain. This is NOT a snapshot of all chains.
//
// `safeTransactionApi` is intentionally `null`: these chains' former tx-service hosts
// were on `safe.global`, which has been dropped. A FALLBACK chain with no tx-service
// disables tx-service reads rather than guessing a host (until it lands in the registry).
// `safeUrl` is built from the embedding parent origin at runtime, like registry chains.

interface FallbackSeed {
  chainId: number
  name: string
  shortName: string
  nativeAsset: { symbol: string; decimals: number }
  explorer: { name: string; url: string; apiUrl: string }
}

const SEEDS: FallbackSeed[] = [
  {
    chainId: 43111,
    name: 'hemi',
    shortName: 'hemi',
    nativeAsset: { symbol: 'ETH', decimals: 18 },
    explorer: { name: 'Hemi Explorer', url: 'https://explorer.hemi.network', apiUrl: 'https://api.hemi.network/api' },
  },
  {
    chainId: 747474,
    name: 'katana',
    shortName: 'katana',
    nativeAsset: { symbol: 'ETH', decimals: 18 },
    explorer: { name: 'Katana Explorer', url: 'https://explorer.katana.network', apiUrl: 'https://api.katana.network/api' },
  },
  {
    chainId: 232,
    name: 'lens',
    shortName: 'lens',
    nativeAsset: { symbol: 'GHO', decimals: 18 },
    explorer: { name: 'Lens Explorer', url: 'https://explorer.lens.xyz', apiUrl: 'https://api.lens.xyz/api' },
  },
  {
    chainId: 3338,
    name: 'peaq',
    shortName: 'PEAQ',
    nativeAsset: { symbol: 'PEAQ', decimals: 18 },
    explorer: { name: 'Peaq Explorer', url: 'https://explorer.peaq.network', apiUrl: 'https://api.peaq.network/api' },
  },
]

/** Build the FALLBACK map, deriving `safeUrl` from the embedding parent origin. */
export const buildFallback = (parentOrigin: string): Record<number, AppChain> => {
  const map: Record<number, AppChain> = {}
  for (const seed of SEEDS) {
    map[seed.chainId] = {
      chainId: seed.chainId,
      name: seed.name,
      shortName: seed.shortName,
      nativeAsset: seed.nativeAsset,
      rpc: '', // embedded app prefers its injected provider
      explorer: seed.explorer,
      verifyContractUrl: deriveVerifyContractUrl(seed.explorer.url),
      safeTransactionApi: null,
      safeUrl: deriveSafeUrl(parentOrigin, seed.shortName),
      features: [],
    }
  }
  return map
}
