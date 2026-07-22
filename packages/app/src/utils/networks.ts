import { getRegistryChain } from "../chains/registry"

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
  LINEA_GOERLI = 59140,
  LINEA = 59144,
  PLASMA = 9745,
  PLASMA_TESNET = 9746,
  ZETACHAIN_TESTNET = 7001,
  ZETACHAIN = 7000,
  FLOW_EVM_MAINNET = 747,
  FLOW_EVM_TESTNET = 545,
  SHAPE = 360,
  SHAPE_TESTNET = 11011,
  SEI = 1329,
  SEI_TESTNET = 1328,
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
  Network.LINEA_GOERLI,
  Network.LINEA,
  Network.PLASMA_TESNET,
  Network.PLASMA,
  Network.ZETACHAIN_TESTNET,
  Network.ZETACHAIN,
  Network.FLOW_EVM_MAINNET,
  Network.FLOW_EVM_TESTNET,
  Network.SHAPE,
  Network.SHAPE_TESTNET,
  Network.SEI,
  Network.SEI_TESTNET,
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

export function getNetworkRPC(network: Network) {
  const rpc = getRegistryChain(network)?.rpc
  return rpc || undefined
}

export function getNetwork(network: Network): NetworkConfig {
  const chain = getRegistryChain(network)
  return {
    name: chain?.name ?? "",
    chainId: network,
    shortName: chain?.shortName ?? "",
    rpc: chain?.rpc ? [chain.rpc] : [],
    infoURL: "",
    nativeCurrency: {
      name: chain?.nativeAsset.symbol ?? "",
      symbol: chain?.nativeAsset.symbol ?? "",
      decimals: chain?.nativeAsset.decimals ?? 18,
    },
    explorers: chain?.explorer
      ? [{ name: chain.explorer.name, url: chain.explorer.url, standard: "EIP3091" }]
      : [],
  }
}
