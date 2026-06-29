// Pure derivation layer: maps a raw Chain Registry entry onto the app's chain shape.
// No app imports, no `import.meta.env`, no browser globals — every input is a parameter,
// so this module is unit-testable in isolation (see deriveChain.nodetest.ts).

/** The subset of a Chain Registry `/api/v1/chains/` entry the apps consume. */
export interface RegistryChainRaw {
  chainId: string
  chainName: string
  shortName: string
  nativeCurrency: { symbol: string; decimals: number; name?: string }
  safeAppsRpcUri?: { value?: string }
  publicRpcUri?: { value?: string }
  rpcUri?: { value?: string }
  blockExplorerUriTemplate: { address: string; api: string; txHash?: string }
  transactionService?: string | null
  features?: string[]
}

/** The normalised chain metadata the app reads everywhere (registry- or FALLBACK-sourced). */
export interface AppChain {
  chainId: number
  name: string
  shortName: string
  nativeAsset: { symbol: string; decimals: number }
  rpc: string
  explorer: { name: string; url: string; apiUrl: string }
  verifyContractUrl: string
  safeTransactionApi: string | null
  safeUrl: string
  features: string[]
}

/**
 * The explorer `api` base, with the query template truncated.
 * The registry serves a full Etherscan-V2 template
 * (`https://api.etherscan.io/v2/api?module={{module}}&...`); the app builds its own
 * `module/action/address/chainid/apiKey` query via URLSearchParams, so we keep the
 * base only. Truncating at `?` also sidesteps the malformed `&` in the registry's
 * Base (8453) template.
 */
export const deriveExplorerApiUrl = (apiTemplate: string): string =>
  apiTemplate.split('?')[0]

/**
 * The explorer browse base: the registry `address` template with the
 * `/address/{{address}}` tail and any trailing slash removed.
 */
export const deriveExplorerUrl = (addressTemplate: string): string =>
  addressTemplate.replace(/\/address\/\{\{address\}\}\/?$/, '').replace(/\/+$/, '')

/**
 * A display label for the explorer, derived from the host of the `address` template:
 * drop `www.`, take the first DNS label, title-case it (e.g. `etherscan` -> `Etherscan`).
 * Best-effort — the registry carries no explorer display name.
 */
export const deriveExplorerName = (addressTemplate: string): string => {
  let host: string
  try {
    host = new URL(addressTemplate).hostname
  } catch {
    host = addressTemplate
  }
  const label = host.replace(/^www\./, '').split('.')[0]
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface RpcUri {
  value?: string
}

/**
 * Read RPC endpoint, preferring `safeAppsRpcUri` -> `publicRpcUri` -> `rpcUri`.
 * Any `{{...}}` template token (e.g. an Infura key placeholder) and the resulting
 * trailing slash are dropped — the embedded app prefers its injected provider and the
 * committed Infura key is removed.
 */
export const deriveRpc = (uris: {
  safeAppsRpcUri?: RpcUri
  publicRpcUri?: RpcUri
  rpcUri?: RpcUri
}): string => {
  const candidates = [
    uris.safeAppsRpcUri?.value,
    uris.publicRpcUri?.value,
    uris.rpcUri?.value,
  ].filter((v): v is string => !!v)
  if (candidates.length === 0) return ''
  const isTemplated = (v: string) => /\{\{[^}]+\}\}/.test(v)
  // Prefer (in priority order) a URI with no template token, since stripping a key
  // placeholder leaves an unusable endpoint; fall back to the first if all are templated.
  const chosen = candidates.find((v) => !isTemplated(v)) ?? candidates[0]
  return chosen
    .replace(/\/?\{\{[^}]+\}\}/g, '') // drop `/{{INFURA_API_KEY}}` style segments
    .replace(/\/+$/, '')
}

/**
 * The embedding Safe UI link base: the parent frame origin + the registry `shortName`,
 * e.g. `https://app.safe.protofire.io/eth:`. Built only for the embedding chain.
 */
export const deriveSafeUrl = (parentOrigin: string, shortName: string): string =>
  `${parentOrigin.replace(/\/+$/, '')}/${shortName}:`

/** The explorer's contract-verification page. */
export const deriveVerifyContractUrl = (explorerUrl: string): string =>
  `${explorerUrl}/verifyContract`

/**
 * The Safe Transaction Service base, normalised to exactly one trailing slash.
 * `null`/`undefined` (only possible for a FALLBACK chain that lacks one) passes through
 * as `null`, disabling tx-service reads rather than defaulting to a wrong host.
 */
export const normalizeTransactionService = (
  transactionService: string | null | undefined,
): string | null => {
  if (!transactionService) return null
  return transactionService.replace(/\/+$/, '') + '/'
}

/**
 * Map a raw registry entry onto the normalised {@link AppChain}.
 * `parentOrigin` is the embedding Safe UI's origin, used to derive `safeUrl`.
 * Returns `null` when `chainId` is not a parseable number (the entry is skipped).
 */
export const toAppChain = (
  raw: RegistryChainRaw,
  { parentOrigin }: { parentOrigin: string },
): AppChain | null => {
  const chainId = parseInt(raw.chainId, 10)
  if (Number.isNaN(chainId)) return null

  const explorerUrl = deriveExplorerUrl(raw.blockExplorerUriTemplate.address)

  return {
    chainId,
    name: raw.chainName,
    shortName: raw.shortName,
    nativeAsset: { symbol: raw.nativeCurrency.symbol, decimals: raw.nativeCurrency.decimals },
    rpc: deriveRpc(raw),
    explorer: {
      name: deriveExplorerName(raw.blockExplorerUriTemplate.address),
      url: explorerUrl,
      apiUrl: deriveExplorerApiUrl(raw.blockExplorerUriTemplate.api),
    },
    verifyContractUrl: deriveVerifyContractUrl(explorerUrl),
    safeTransactionApi: normalizeTransactionService(raw.transactionService),
    safeUrl: deriveSafeUrl(parentOrigin, raw.shortName),
    features: raw.features ?? [],
  }
}
