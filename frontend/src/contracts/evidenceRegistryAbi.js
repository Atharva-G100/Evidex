// Minimal ABI for EvidenceRegistry.sol (register + read + event)
export const EVIDENCE_REGISTRY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "fileHash", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "uploader", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "EvidenceRegistered",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "fileHash", "type": "string" },
      { "internalType": "string", "name": "caseId", "type": "string" },
      { "internalType": "string", "name": "officerName", "type": "string" }
    ],
    "name": "registerEvidence",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "fileHash", "type": "string" }],
    "name": "getEvidence",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
