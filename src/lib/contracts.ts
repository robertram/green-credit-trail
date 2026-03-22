import CarbonMarketplaceJson from './abis/CarbonMarketplace.json'
import CarbonTokenJson from './abis/CarbonToken.json'

export const MARKETPLACE_ADDRESS =
  (import.meta.env.VITE_MARKETPLACE_ADDRESS as `0x${string}`) ?? '0x'

export const MARKETPLACE_ABI = CarbonMarketplaceJson.abi as const
export const CARBON_TOKEN_ABI = CarbonTokenJson.abi as const
