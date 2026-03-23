# Immutable Evidence Registry - Hardhat Edition

## Overview
- Hardhat manages compilation, testing, and deployment for `EvidenceRegistry.sol`.
- The React frontend hashes files locally, uploads the original file to Pinata through a protected backend API, and stores the returned CID on-chain.
- The `backend/scripts/sync-artifacts.js` script keeps the frontend ABI and deployed address in sync with Hardhat artifacts.
- The backend exposes `POST /pinata/upload`, verifies the caller is an investigator, uploads the file to Pinata with a server-side JWT, and returns `{ cid, gatewayUrl, size }`.
- The UI shows a clickable `Open` link next to IPFS CID values and uses `DD/MM/YYYY HH:mm:ss` timestamps in register/verify/footer views.

## Prerequisites
- [Node.js LTS](https://nodejs.org/) and `npm` (18+ recommended).
- MetaMask or another compatible wallet connected to Sepolia.
- A Sepolia RPC URL from Infura, Alchemy, QuickNode, or a similar provider.
- A Pinata account with:
  - an API key JWT
  - a dedicated gateway domain

## Backend Setup

1. `cd backend`
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in:
   - `SEPOLIA_RPC_URL`
   - `PRIVATE_KEY`
   - `PINATA_JWT`
   - `PINATA_GATEWAY_BASE`
   - optional: `BACKEND_PORT`
   - optional: `EXPECTED_CHAIN_ID`

Example:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xyourdeployerprivatekey
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY_BASE=https://your-gateway.mypinata.cloud/ipfs/
BACKEND_PORT=3001
EXPECTED_CHAIN_ID=0xaa36a7
```

Notes:
- `BACKEND_PORT` defaults to `3001` if omitted.
- `EXPECTED_CHAIN_ID` defaults to `0xaa36a7` if omitted.
- `PINATA_GATEWAY_BASE` must include both `https://` and `/ipfs/`.

## Backend Commands

1. `npm run compile`
2. `npm run test`
3. `npm run deploy:all`
4. `npm run api`

What these do:
- `compile` rebuilds contract artifacts.
- `test` runs the Hardhat test suite.
- `deploy:all` deploys the contract and syncs ABI/address files to the frontend.
- `api` starts the Pinata upload API at `http://localhost:3001` by default.

## Pinata Setup

1. Log in to Pinata.
2. Open `API Keys`.
3. Create a key with upload access and copy the JWT.
4. Open `Gateways`.
5. Copy your dedicated gateway domain.
6. Set `PINATA_GATEWAY_BASE` like:

```env
PINATA_GATEWAY_BASE=https://purple-top-bedbug-107.mypinata.cloud/ipfs/
```

If the generated URL looks invalid, the usual problem is that the gateway base is missing:
- `https://`
- `/ipfs/`

Correct:

```txt
https://purple-top-bedbug-107.mypinata.cloud/ipfs/Qm...
```

Incorrect:

```txt
purple-top-bedbug-107.mypinata.cloud/Qm...
```

## Frontend Setup

1. `cd frontend`
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in:
   - optional: `VITE_EVIDENCE_REGISTRY_ADDRESS`
   - optional: `VITE_EXPECTED_CHAIN_ID=0xaa36a7`
   - optional: `VITE_BACKEND_URL=http://localhost:3001` (set this if you are not using the Vite proxy route)

Example:

```env
VITE_EVIDENCE_REGISTRY_ADDRESS=
VITE_EXPECTED_CHAIN_ID=0xaa36a7
VITE_BACKEND_URL=http://localhost:3001
```

## Running The App

1. Start the backend:

```powershell
cd backend
npm run api
```

2. Start the frontend:

```powershell
cd frontend
npm run dev
```

3. Open the frontend in your browser.
4. Connect MetaMask on Sepolia.
5. Use a wallet that has investigator access.
6. Open `Register Evidence`.
7. Select a file.
8. Click `Generate SHA-256 Digest`.
9. Click `Commit to Blockchain`.

## Registration Flow

When you register evidence:

1. The frontend hashes the selected file in the browser with SHA-256.
2. MetaMask asks you to sign an upload-auth message.
3. The frontend sends the file plus metadata to `POST /pinata/upload`.
4. The backend checks:
   - request signature
   - connected chain ID
   - on-chain `isInvestigator(address)`
5. If valid, the backend uploads the file to Pinata.
6. Pinata returns a CID.
7. The frontend calls `registerEvidence(...)` with that CID.
8. The success box shows:
   - `IPFS CID`
   - `IPFS URL`
   - transaction hash
   - block number
   - timestamp

## Investigator Management

1. The dashboard shows an investigator admin panel.
2. Use the owner wallet to grant investigator access.
3. Only wallets with investigator access can use the protected Pinata upload route successfully.

## Testing And Verification

Backend:
- Open `http://localhost:3001/health`
- You should receive JSON showing the backend is running.

Frontend:
- Register a test file.
- Approve the signature prompt in MetaMask.
- Approve the transaction prompt in MetaMask.
- Confirm the success box shows an `IPFS CID`.
- Open the `IPFS URL` in a browser and confirm the file resolves.
- Verify the same file on the `Verify Evidence` screen.

## Troubleshooting

- `Missing script: api`
  Add `"api": "node api/index.js"` to `backend/package.json`.

- `Missing required file: .../artifacts/contracts/EvidenceRegistry.sol/EvidenceRegistry.json`
  Your Hardhat build artifacts are missing (common on fresh clone/branch switch because artifacts are git-ignored). Rebuild them:
  ```bash
  cd backend
  npm ci
  npm run compile
  npm run api
  ```
  If it still fails, clean and rebuild:
  ```bash
  cd backend
  rm -rf artifacts cache
  npm run compile
  npm run api
  ```

- `Missing required file: .../backend/artifacts/deployed.json`
  Either run a deployment flow (`npm run deploy:all`) or set `CONTRACT_ADDRESS` in `backend/.env`.
  The API can use `CONTRACT_ADDRESS` when `deployed.json` is not present.

- `Failed to fetch` on commit/upload
  Usually frontend cannot reach backend upload API.
  Check:
  - backend is running: `cd backend && npm run api`
  - `http://localhost:3001/health` returns JSON
  - `frontend/.env` and network mode:
    - local Vite proxy mode: leave `VITE_BACKEND_URL` empty/commented
    - direct backend mode: set `VITE_BACKEND_URL=http://localhost:3001`
  - restart frontend after env changes

- `Wallet is not an investigator`
  Grant investigator access to the connected Sepolia wallet on the same contract address your app is using.

- `Wallet is not an investigator` even after granting
  Confirm there is no contract mismatch:
  - frontend `VITE_EVIDENCE_REGISTRY_ADDRESS` (if set) must match deployed address in `frontend/src/contracts/deployed.json`
  - backend `/health` `contractAddress` should match the same deployment
  - connected MetaMask account is the same wallet that was granted

- `no matching fragment` during contract calls
  ABI/address mismatch. Run:
  - `cd backend && npm run sync-artifacts`
  - pull latest `frontend/src/contracts/evidenceRegistryAbi.json` and `frontend/src/contracts/deployed.json`

- `Wrong network`
  Make sure MetaMask is on Sepolia and `EXPECTED_CHAIN_ID` is `0xaa36a7`.

- `Invalid IPFS URL`
  Fix `PINATA_GATEWAY_BASE` so it looks like:
  `https://your-gateway.mypinata.cloud/ipfs/`
  If `/ipfs/` or `https://` is missing, generated links can fail in browser.

- Hardhat warning on Node 25+
  Hardhat 2.x is most stable on Node 20 LTS. Use Node 20 for deployment/test reliability.

- No CID appears
  Make sure:
  - the backend is running
  - the frontend is using the updated register flow
  - the signature request succeeds
  - the backend terminal shows no Pinata errors

- `PINATA_JWT is missing in backend/.env`
  Add a valid Pinata JWT to `backend/.env`.

- Pinata upload fails
  Regenerate the JWT in Pinata and update `backend/.env`.

## Current Scope

This project currently supports:
- smart contract deployment with Hardhat
- investigator-based evidence registration
- protected Pinata uploads through the backend
- storing returned Pinata CIDs on-chain

Planned future work includes:
- custody ledger storage
- report generation
- PDF/JSON case summaries
