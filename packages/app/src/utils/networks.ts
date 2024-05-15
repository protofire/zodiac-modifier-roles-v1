import CHAINS from "../data/chains.json"

export enum Network {
  MAINNET = 1,
  GOERLI = 5,
  SEPOLIA = 11155111,
  OPTIMISM = 10,
  OPTIMISM_ON_GNOSIS = 300,
  BINANCE = 56,
  GNOSIS = 100,
  POLYGON = 137,
  EWT = 246,
  ARBITRUM = 42161,
  AVALANCHE = 43114,
  VOLTA = 73799,
  AURORA = 1313161554,
}

export const NETWORKS = [
  Network.MAINNET,
  Network.GOERLI,
  Network.SEPOLIA,
  Network.OPTIMISM,
  Network.BINANCE,
  Network.GNOSIS,
  Network.POLYGON,
  Network.EWT,
  Network.ARBITRUM,
  Network.AVALANCHE,
  Network.VOLTA,
  Network.AURORA,
]

interface NetworkConfig {
  name: string
  chainId: number
  shortName: string
  rpc: string[]
  infoURL: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  explorers: {
    name: string
    url: string
    standard: string
  }[]
}

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY
export const NETWORK_INFURA_ID: Record<Network, string | undefined> = {
  [Network.MAINNET]: INFURA_KEY,
  [Network.GOERLI]: INFURA_KEY,
  [Network.SEPOLIA]: INFURA_KEY,
  [Network.OPTIMISM]: INFURA_KEY,
  [Network.BINANCE]: INFURA_KEY,
  [Network.GNOSIS]: INFURA_KEY,
  [Network.POLYGON]: INFURA_KEY,
  [Network.EWT]: INFURA_KEY,
  [Network.ARBITRUM]: INFURA_KEY,
  [Network.AVALANCHE]: INFURA_KEY,
  [Network.VOLTA]: INFURA_KEY,
  [Network.AURORA]: INFURA_KEY,
  [Network.OPTIMISM_ON_GNOSIS]: INFURA_KEY,
}

export function getNetworkRPC(network: Network) {
  const config = getNetwork(network)
  const infura = NETWORK_INFURA_ID[network]
  if (config && infura) {
    // eslint-disable-next-line no-template-curly-in-string
    return config.rpc[0].replace("${INFURA_API_KEY}", infura)
  }
}

export function getNetwork(network: Network): NetworkConfig {
  return CHAINS[network]
}
