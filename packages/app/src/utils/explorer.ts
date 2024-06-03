import { Explorer, ExplorerConfig } from "../services/explorer"
import { getNetworkRPC, Network } from "./networks"
import memoize from "lodash.memoize"
import { ethers } from "ethers"

const ETHERSCAN_KEY = process.env.REACT_APP_ETHERSCAN_KEY as string
const GNOSISSCAN_KEY = process.env.REACT_APP_GNOSISSCAN_KEY as string
const POLYGONSCAN_KEY = process.env.REACT_APP_POLYGONSCAN_KEY as string
const ARBISCAN_KEY = process.env.REACT_APP_ARBISCAN_KEY as string
const BSCSCAN_KEY = process.env.REACT_APP_BSCSCAN_KEY as string
const OPTIMISTICSCAN_KEY = process.env.REACT_APP_OPTIMISTICSCAN_KEY as string
const SNOWTRACE_KEY = process.env.REACT_APP_SNOWTRACE_KEY as string

const explorerConfig: Record<Network, ExplorerConfig> = {
  [Network.MAINNET]: {
    apiUrl: "https://api.etherscan.io/api",
    apiKey: ETHERSCAN_KEY,
  },
  [Network.GOERLI]: {
    apiUrl: "https://api-goerli.etherscan.io/api",
    apiKey: ETHERSCAN_KEY,
  },
  [Network.SEPOLIA]: {
    apiUrl: "https://api-sepolia.etherscan.io/api",
    apiKey: ETHERSCAN_KEY,
  },
  [Network.OPTIMISM_ON_GNOSIS]: {
    apiUrl: "https://blockscout.com/xdai/optimism/",
  },
  [Network.POLYGON]: {
    apiUrl: "https://api.polygonscan.com/api",
    apiKey: POLYGONSCAN_KEY,
  },
  [Network.ARBITRUM]: {
    apiUrl: "https://api.arbiscan.io/api",
    apiKey: ARBISCAN_KEY,
  },
  [Network.GNOSIS]: {
    apiUrl: "https://api.gnosisscan.io/api",
    apiKey: GNOSISSCAN_KEY,
  },
  [Network.BINANCE]: {
    apiUrl: "https://api.bscscan.com/api",
    apiKey: BSCSCAN_KEY,
  },
  [Network.OPTIMISM]: {
    apiUrl: "https://api-optimistic.etherscan.io/api",
    apiKey: OPTIMISTICSCAN_KEY,
  },
  [Network.EWT]: {
    apiUrl: "https://explorer.energyweb.org/api",
  },
  [Network.VOLTA]: {
    apiUrl: "https://volta-explorer.energyweb.org/api",
  },
  [Network.AVALANCHE]: {
    apiUrl: "https://api.snowtrace.io/api",
    apiKey: SNOWTRACE_KEY,
  },
  [Network.AURORA]: {
    apiUrl: "https://explorer.mainnet.aurora.dev/api",
  },
  [Network.LINEA_GOERLI]: {
    apiUrl: "https://api-testnet.lineascan.build/api",
    apiKey: process.env.REACT_APP_LINEASCAN_KEY ?? "",
  },
  [Network.LINEA]: {
    apiUrl: "https://api.lineascan.build/api",
    apiKey: process.env.REACT_APP_LINEASCAN_KEY ?? "",
  },
}

export const getExplorer = memoize((network: Network) => {
  const config = explorerConfig[network]
  const rpcUrl = getNetworkRPC(network)
  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, network)
  return new Explorer(config, provider)
})
