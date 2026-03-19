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

1. `cd backend` and `npm install` (the dependencies live inside `backend/package.json`).
2. Copy `.env.example` to `.env` and populate:
   - `SEPOLIA_RPC_URL` (your Sepolia endpoint from MetaMask Developer, Infura, Alchemy, or QuickNode).
   - `PRIVATE_KEY` for the deployer account (Sepolia test ETH only) exported from MetaMask.
   - `PINATA_JWT` + `PINATA_GATEWAY_BASE` when you wire in Pinata uploads.
   - Optional: `CONTRACT_ADDRESS` / `INVESTIGATOR_ADDRESS` for the investigative script.
3. `npm run compile` to regenerate the contract artifacts.
4. `npm run test` to execute the Hardhat suite (`backend/test/EvidenceRegistry.test.js` covers registration, duplicates, CID/status, investigator access).
5. Run `npm run deploy:all` to execute `deploy` followed by `sync-artifacts`; this publishes the contract to Sepolia and refreshes `backend/artifacts/deployed.json` plus the frontend ABI/address JSONs.
6. Commit the synced `frontend/src/contracts/{evidenceRegistryAbi.json,deployed.json}` after shared deployments so teammates get the refreshed ABI/address without rerunning `sync-artifacts`. Skip committing these files after ephemeral local Hardhat runs.
7. Optional: run `npx hardhat run scripts/grantInvestigator.js --network sepolia` (with `CONTRACT_ADDRESS`/`INVESTIGATOR_ADDRESS` set in `.env`) to grant/revoke investigator wallets.

## Frontend setup & run steps

1. `cd frontend` and `npm install`.
2. Copy `.env.example` to `.env` and set (or leave blank):
   - `VITE_EVIDENCE_REGISTRY_ADDRESS`: put the latest deployed address (`0x2BA273909e58E3f4096ABBf3604E3E0D78064ED2`) or leave it blank so the UI uses `frontend/src/contracts/deployed.json`.
   - `VITE_EXPECTED_CHAIN_ID=0xaa36a7` to lock MetaMask to Sepolia.
3. Start the Vite server with `npm run dev` (it auto-loads the synced ABI/address).
4. Connect MetaMask (Sepolia, investigator wallet), upload a file to compute the SHA-256 hash, and click “Commit to Blockchain.” The UI now calls the 5-argument `registerEvidence` on Sepolia with the synchronized ABI.

### Investigator management

1. The dashboard now exposes an investigator admin panel that shows the current contract address, lets you paste any Sepolia wallet to grant access, and lists all wallets that currently hold the investigator role (based on `InvestigatorUpdated` events).
2. Keep the owner wallet connected (the wallet you used in `backend/.env`) before clicking “Grant Access.” Status feedback appears in the panel, and newly granted wallets appear immediately in the list.
3. To audit the on-chain mapping from CLI, run `cd backend && npx hardhat run scripts/listInvestigators.js --network sepolia`—it reads the same `InvestigatorUpdated` events and prints every granted address.
4. When you need to add another investigator without the UI, set `CONTRACT_ADDRESS` and `INVESTIGATOR_ADDRESS` in `backend/.env` and run `npx hardhat run scripts/grantInvestigator.js --network sepolia`.

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
