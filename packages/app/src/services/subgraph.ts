import { createClient, gql, defaultExchanges } from "urql"
import { ethers } from "ethers"
import {
  ConditionType,
  ExecutionOption,
  FunctionCondition,
  Member,
  ParamComparison,
  ParamCondition,
  ParameterType,
  Role,
  Target,
  TargetConditions,
} from "../typings/role"
import { getFunctionConditionType } from "../utils/conditions"
import { Network } from "../utils/networks"

let client

const getUrl = (network?: Network) => {
  switch (network) {
    case Network.MAINNET:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-mainnet"
    case Network.GNOSIS:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-gnosis"
    case Network.GOERLI:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-goerli"
    case Network.POLYGON:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-polygon"
    case Network.OPTIMISM:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-optimism"
    case Network.ARBITRUM:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-arbitrum"
    case Network.LINEA:
      return "https://graph-query.linea.build/subgraphs/name/linea-safe/zodiac-roles-mod-linea-mainnet"
    case Network.LINEA_GOERLI:
      return "https://graph-query.goerli.linea.build/subgraphs/name/linea-safe/zodiac-roles-mod-linea-goerli"
    default:
      return "https://api.thegraph.com/samepant/zodiac-roles-mod-mainnet"
  }
}

const getSubgraphClient = (network?: Network) =>
  createClient({
    url: getUrl(network),
    exchanges: [...defaultExchanges],
    fetchOptions: {
      cache: "no-cache",
    },
  })

const RolesQuery = gql`
  query ($id: ID!) {
    rolesModifier(id: $id) {
      id
      address
      avatar
      roles {
        id
        name
        targets {
          id
          address
          executionOptions
          clearance
          functions {
            sighash
            executionOptions
            wildcarded
            parameters {
              index
              type
              comparison
              comparisonValue
            }
          }
        }
        members {
          id
          member {
            id
            address
          }
        }
      }
    }
  }
`

interface RolesQueryResponse {
  rolesModifier: null | {
    id: string
    address: string
    avatar: string
    roles: {
      id: string
      name: string
      targets: {
        id: string
        address: string
        executionOptions: string
        clearance: ConditionType
        functions: {
          sighash: string
          executionOptions: string
          wildcarded: boolean
          parameters: {
            index: number
            type: ParameterType
            comparison: ParamComparison
            comparisonValue: string[]
          }[]
        }[]
      }[]
      members: {
        id: string
        member: Member
      }[]
    }[]
  }
}

export const fetchRoles = async (network: Network, rolesModifierAddress: string): Promise<Role[]> => {
  client = getSubgraphClient(network)
  if (rolesModifierAddress == null || !ethers.utils.isAddress(rolesModifierAddress)) {
    return []
  }
  try {
    const roles = await client
      .query<RolesQueryResponse>(RolesQuery, { id: rolesModifierAddress.toLowerCase() })
      .toPromise()
    if (roles.data && roles.data.rolesModifier) {
      return roles.data.rolesModifier.roles.map((role) => ({
        ...role,
        members: role.members.map((roleMember) => roleMember.member),
        targets: role.targets.map((target): Target => {
          const conditions: TargetConditions = Object.fromEntries(
            target.functions.map((func) => {
              const paramConditions = func.parameters.map((param) => {
                const paramCondition: ParamCondition = {
                  index: param.index,
                  condition: param.comparison,
                  value: param.comparisonValue,
                  type: param.type,
                }
                return paramCondition
              })

              const funcConditions: FunctionCondition = {
                sighash: func.sighash,
                type: func.wildcarded ? ConditionType.WILDCARDED : getFunctionConditionType(paramConditions),
                executionOption: getExecutionOptionFromLabel(func.executionOptions),
                params: paramConditions,
              }
              return [func.sighash, funcConditions]
            }),
          )
          return {
            id: target.id,
            address: target.address,
            type: target.clearance,
            executionOption: getExecutionOptionFromLabel(target.executionOptions),
            conditions,
          }
        }),
      }))
    } else {
      return []
    }
  } catch (err) {
    console.log("err", err)
    throw err
  }
}

function getExecutionOptionFromLabel(label: string): ExecutionOption {
  switch (label) {
    case "Both":
      return ExecutionOption.BOTH
    case "Send":
      return ExecutionOption.SEND
    case "DelegateCall":
      return ExecutionOption.DELEGATE_CALL
  }
  return ExecutionOption.NONE
}
