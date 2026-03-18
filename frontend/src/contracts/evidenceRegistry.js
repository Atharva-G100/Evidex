import { Contract } from 'ethers'
import { EVIDENCE_REGISTRY_ABI } from './evidenceRegistryAbi'

export function getEvidenceRegistryContract(providerOrSigner) {
  const address = import.meta.env.VITE_EVIDENCE_REGISTRY_ADDRESS

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(
      'Missing/invalid contract address. Set VITE_EVIDENCE_REGISTRY_ADDRESS in your .env file.'
    )
  }

  return new Contract(address, EVIDENCE_REGISTRY_ABI, providerOrSigner)
}
