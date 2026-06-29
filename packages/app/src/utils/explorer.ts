import { Explorer, ExplorerConfig } from "../services/explorer"
import { getNetworkRPC, Network } from "./networks"
import { getRegistryChain } from "../chains/registry"
import memoize from "lodash.memoize"
import { ethers } from "ethers"

// Roles divergence: a SINGLE explorer API key for every chain (the registry serves an
// Etherscan-V2 base; the V2 endpoint accepts one key + a chainid query param). The former
// per-chain *SCAN key map is gone.
const EXPLORER_API_KEY = process.env.REACT_APP_EXPLORER_API_KEY as string

export const getExplorer = memoize((network: Network) => {
  const config: ExplorerConfig = {
    apiUrl: getRegistryChain(network)?.explorer.apiUrl ?? "",
    apiKey: EXPLORER_API_KEY,
  }
  const rpcUrl = getNetworkRPC(network)
  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, network)
  return new Explorer(config, provider)
})
