# Immutable Evidence Registry — Hardhat Edition

## Overview
- Hardhat manages the Solidity compilation, tests, and deployments for `EvidenceRegistry.sol`.
- A Vite-powered React UI hashes evidence and points to the on-chain record; the frontend now consumes the ABI/address JSON produced by Hardhat instead of manual ABI files.
- The `backend/scripts/sync-artifacts.js` script keeps the frontend in sync with every deploy so the UI always uses the latest contract definition plus deployed address metadata.


## Prerequisites
- [Node.js LTS](https://nodejs.org/) and `npm` (>= 18 recommended).
- MetaMask (or compatible wallet) connected to Sepolia or your chosen testnet.
- A Sepolia RPC URL and private key for deployments (`INFURA`, `Alchemy`, etc.).
- Pinata account (for the next phase) — the JWT is referenced in `backend/.env.example`.

## Backend setup & run steps

1. `cd backend` and `npm install`.
2. Copy `.env.example` to `.env` and populate:
   - `SEPOLIA_RPC_URL` (or another network RPC) for deployments.
   - `PRIVATE_KEY` for the deployer account (Sepolia test ETH only).
   - `PINATA_JWT` + `PINATA_GATEWAY_BASE` when you wire in Pinata uploads later.
3. `npm run compile` to build the contract.
4. `npm run test` to execute the Hardhat suite (`backend/test/EvidenceRegistry.test.js` covers registration + dedup logic).
5. `npm run deploy` to run `scripts/deploy.js --network sepolia` (or change `--network` to `hardhat` for local runs). The command produces `backend/artifacts/deployed.json`.
6. `npm run sync-artifacts` so `frontend/src/contracts/{evidenceRegistryAbi.json,deployed.json}` match the latest ABI + address.

## Frontend setup & run steps

1. `cd frontend` and `npm install`.
2. Copy `.env.example` to `.env` and set:
   - `VITE_EVIDENCE_REGISTRY_ADDRESS` to the deployed address (or leave blank and rely on `frontend/src/contracts/deployed.json` after running `sync-artifacts`).
   - `VITE_EXPECTED_CHAIN_ID=0xaa36a7` to keep MetaMask on Sepolia.
3. `npm run dev` to start Vite’s dev server.
4. Connect MetaMask (Sepolia) in the UI, hash a file via “Register Evidence,” and submit the transaction. The frontend now uses the Hardhat ABI/address artifacts instead of manual ABI files.

## Data flow reminder
- Files remain local; the app only hashes them and stores the hash + metadata on-chain.
- The next phase will add Pinata pinning, report generation, and custody ledger tracking.

## Testing & verification
- `npm run test` inside `backend` exercises `backend/test/EvidenceRegistry.test.js` (duplicate prevention, stored metadata).
- Frontend manual verification: register evidence with a test file, verify the hash on the `Verify Evidence` screen, and confirm the contract event appears on Sepolia Etherscan.

## Troubleshooting
- `Missing/invalid contract address`: ensure `VITE_EVIDENCE_REGISTRY_ADDRESS` (or `frontend/src/contracts/deployed.json`) points to a Sepolia deploy and rerun `npm run sync-artifacts`.
- Hardhat deployment stalls: ensure your `.env` has a funded account on Sepolia and the RPC URL is correct.
- To re-sync after a new deploy, rerun `npm run sync-artifacts` so the UI reads the latest ABI/address pair.

## Next steps
- Refer to `MiniProject.md` for the full Hardhat + Pinata + custody/reporting roadmap. Once the backend API and Pinata integration land, the frontend will POST files to Pinata, store CIDs, and surface custody reports.
