import { Contract } from 'ethers'
import ABI from './evidenceRegistryAbi.json'
import deployed from './deployed.json'

const envAddress = (import.meta.env.VITE_EVIDENCE_REGISTRY_ADDRESS || '').trim()
const fallbackAddress = deployed?.address || ''
const ADDRESS = envAddress || fallbackAddress

if (!ADDRESS || !/^0x[0-9a-fA-F]{40}$/.test(ADDRESS)) {
  throw new Error(
    'Missing/invalid contract address. Set VITE_EVIDENCE_REGISTRY_ADDRESS in your .env file or run the backend sync script.'
  )
}

export function getEvidenceRegistryContract(providerOrSigner) {
  return new Contract(ADDRESS, ABI, providerOrSigner)
}
