# Immutable Evidence Registry

## Overview
This project is a forensic evidence management system built around an Ethereum smart contract, a protected backend API, and a React-based investigator dashboard. Its primary purpose is to register digital evidence immutably on-chain, preserve case-level traceability, and generate structured reports for evidentiary review.

The system is divided into three major layers:

1. Smart contract layer
   - `backend/contracts/EvidenceRegistry.sol`
   - Stores evidence records by file hash
   - Stores `caseId`, officer name, IPFS CID, uploader, timestamp, and custody status
   - Enforces investigator-only registration and custody updates

2. Backend service layer
   - `backend/api/index.js`
   - Verifies investigator access using signed wallet requests plus on-chain role checks
   - Uploads files and generated reports to Pinata
   - Persists case-level ledger files in `backend/ledger/`
   - Builds merged case reports from local ledger data and shared on-chain registrations
   - Exposes PDF export for case reports

3. Frontend interface layer
   - `frontend/src/App.jsx`
   - `frontend/src/pages/Dashboard.jsx`
   - `frontend/src/components/RegisterForm.jsx`
   - `frontend/src/components/VerifyForm.jsx`
   - `frontend/src/components/ReportForm.jsx`
   - Provides investigator workflows for evidence registration, verification, investigator management, JSON report generation, and PDF download

The artifact sync layer connects Hardhat output to the frontend:
- `backend/scripts/deploy.js`
- `backend/scripts/sync-artifacts.js`
- `frontend/src/contracts/evidenceRegistryAbi.json`
- `frontend/src/contracts/deployed.json`

## Prerequisites
The following software and accounts are required before installation:

1. Node.js
   - Node.js LTS is recommended
   - Hardhat 2.x is most stable on Node 20 LTS

2. npm
   - Included with Node.js

3. MetaMask
   - Required for wallet connection and investigator signing
   - Must be configured for the Sepolia test network

4. Sepolia RPC provider
   - Infura, MetaMask Developer, Alchemy, QuickNode, or equivalent
   - Required by the backend for contract reads and verification

5. Pinata account
   - Required for file upload and report storage
   - You need:
     - a valid Pinata JWT
     - a valid gateway base URL ending in `/ipfs/`

## Backend Setup
The backend compiles and serves the contract artifacts, verifies investigator access, uploads evidence to IPFS via Pinata, stores case ledgers, and generates reports.

### Step 1: Enter the backend directory
```bash
cd backend
```

### Step 2: Install dependencies
```bash
npm install
```

This installs:
- Hardhat
- ethers
- dotenv
- express
- multer
- pdfkit

### Step 3: Create the environment file
```bash
cp .env.example .env
```

### Step 4: Configure backend environment variables
Edit `backend/.env` and provide values for the following:

Required:
- `SEPOLIA_RPC_URL`
- `PRIVATE_KEY`
- `PINATA_JWT`
- `PINATA_GATEWAY_BASE`

### Step 5: Compile the contract
```bash
npm run compile
```

### Step 6: Run backend tests
```bash
npm test
```

### Step 7: Deploy and sync artifacts if needed
Use this when deploying a new contract or refreshing ABI and address metadata:
```bash
npm run deploy:all
```

### Step 8: Start the backend API
```bash
npm run api
```

The backend will serve:
- `GET /health`
- `POST /pinata/upload`
- `POST /ledger/entry`
- `POST /reports/:caseId`
- `POST /reports/:caseId/pdf`

## Backend Troubleshooting
Common backend issues and corresponding fixes are listed below.

### 1. `Missing required file: .../artifacts/contracts/EvidenceRegistry.sol/EvidenceRegistry.json`
Cause:
- Hardhat artifacts are missing after a fresh clone, branch switch, or cleanup

Fix:
```bash
cd backend
npm install
npm run compile
```

If the issue persists:
```bash
rm -rf artifacts cache
npm run compile
```

### 2. `Missing required file: .../backend/artifacts/deployed.json`
Cause:
- Deployment metadata is missing

Fix:
- either run:
```bash
npm run deploy:all
```
- or set `CONTRACT_ADDRESS` in `backend/.env`

### 3. `Wallet is not an investigator`
Cause:
- the connected wallet is not granted investigator access on the active contract

Fix:
- confirm the connected MetaMask account
- confirm backend `/health` returns the intended contract address
- grant the investigator role on that exact contract

### 4. `Evidence read request timed out`
Cause:
- Sepolia RPC is slow or unstable

Fix:
- verify `SEPOLIA_RPC_URL`
- increase `RPC_TIMEOUT_MS` in `backend/.env`
- restart backend

### 5. `PINATA_JWT is missing in backend/.env`
Fix:
- add a valid Pinata JWT and restart backend

### 6. Invalid IPFS gateway URLs
Cause:
- gateway base is malformed

Correct format:
```txt
https://your-gateway.mypinata.cloud/ipfs/
```

Incorrect format:
```txt
your-gateway.mypinata.cloud/Qm...
```

### 7. Reports differ across teammates
Cause:
- different contract addresses are being used on different machines

Fix:
- compare `http://localhost:3001/health` on both machines
- ensure `contractAddress` matches
- ensure frontend and backend both target the same contract deployment

## Frontend Setup
The frontend provides the investigator dashboard, evidence registration workflow, verification workflow, and reporting interface.

### Step 1: Enter the frontend directory
```bash
cd frontend
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Create the environment file
```bash
cp .env.example .env
```

### Step 4: Configure frontend environment variables
Edit `frontend/.env` and provide values as needed.

Available variables:
- `VITE_EVIDENCE_REGISTRY_ADDRESS`
- `VITE_EXPECTED_CHAIN_ID`
- `VITE_BACKEND_URL`

Recommended local development configuration:
```env
VITE_EVIDENCE_REGISTRY_ADDRESS=
VITE_EXPECTED_CHAIN_ID=0xaa36a7
VITE_BACKEND_URL=http://localhost:3001
```

Notes:
- If `VITE_EVIDENCE_REGISTRY_ADDRESS` is left empty, the frontend falls back to synced deployment metadata
- If you use the Vite proxy route, `VITE_BACKEND_URL` may be left unset
- If you explicitly set `VITE_EVIDENCE_REGISTRY_ADDRESS`, it must match the active backend contract

### Step 5: Start the frontend
```bash
npm run dev
```

### Step 6: Optional production build validation
```bash
npm run build
```

## Frontend Troubleshooting
### 1. `Failed to fetch`
Cause:
- frontend cannot reach backend API

Fix:
- confirm backend is running
- open `http://localhost:3001/health`
- confirm `VITE_BACKEND_URL`
- restart frontend after changing `.env`

### 2. `no matching fragment`
Cause:
- ABI and deployed address are out of sync

Fix:
```bash
cd backend
npm run sync-artifacts
```

### 3. Wrong contract visible between teammates
Fix:
- compare frontend and backend contract addresses
- ensure:
  - `frontend/src/contracts/deployed.json`
  - `backend/.env`
  - `backend/artifacts/deployed.json`
  - `frontend/.env`
  all refer to the same deployment

### 4. Wrong network
Fix:
- switch MetaMask to Sepolia
- confirm `VITE_EXPECTED_CHAIN_ID=0xaa36a7`

## Running the Application
The standard execution sequence is:

### 1. Start the backend
```bash
cd backend
npm run api
```

### 2. Start the frontend
```bash
cd frontend
npm run dev
```

### 3. Confirm backend health
Open:
```txt
http://localhost:3001/health
```

Expected:
- `ok: true`
- correct `expectedChainId`
- correct `contractAddress`

### 4. Open the frontend
By default, Vite serves on:
```txt
http://localhost:5173
```

### 5. Connect MetaMask
- use Sepolia
- use an investigator wallet for registration and reporting

## Operational Workflows
### 1. Register Evidence
The registration flow is handled primarily by:
- `frontend/src/components/RegisterForm.jsx`
- `backend/api/index.js`

Process:
1. Select a file
2. Generate a SHA-256 digest in the browser
3. Sign the backend authorization message in MetaMask
4. Upload the file to Pinata through `/pinata/upload`
5. Submit the CID to the smart contract
6. Write a matching case ledger entry to `/ledger/entry`

Outcome:
- evidence is stored on-chain by hash
- file is stored in IPFS via Pinata
- case history is persisted in the backend ledger

### 2. Verify Evidence
The verification flow is handled by:
- `frontend/src/components/VerifyForm.jsx`

Process:
1. Select a file
2. Generate a SHA-256 digest
3. Query the contract for the matching evidence record

Outcome:
- integrity status
- case metadata
- IPFS CID
- uploader
- timestamp
- custody status

### 3. Investigator Management
Handled by:
- `frontend/src/components/InvestigatorPanel.jsx`

Capabilities:
- display active contract address
- grant investigator permissions by wallet address
- list wallets with investigator permissions

### 4. Case Reporting
Handled by:
- `frontend/src/components/ReportForm.jsx`
- `backend/api/index.js`

Process:
1. Enter a case ID
2. Sign the report request
3. Backend builds a merged case report from:
   - shared on-chain evidence registrations
   - local ledger entries and case notes
4. Backend pins the JSON report to Pinata
5. Frontend displays:
   - contributors
   - evidence list
   - timeline
   - report CID
6. User may download the PDF report through `/reports/:caseId/pdf`

Important:
- multiple investigators may register evidence using the same `caseId`
- if they are using the same contract deployment, the report should show shared evidence from all investigators

## Summary of Important Files
Backend:
- `backend/contracts/EvidenceRegistry.sol`
- `backend/api/index.js`
- `backend/scripts/deploy.js`
- `backend/scripts/sync-artifacts.js`
- `backend/test/EvidenceRegistry.test.js`

Frontend:
- `frontend/src/App.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/RegisterForm.jsx`
- `frontend/src/components/VerifyForm.jsx`
- `frontend/src/components/ReportForm.jsx`
- `frontend/src/components/InvestigatorPanel.jsx`
- `frontend/src/contracts/evidenceRegistry.js`

Configuration:
- `backend/.env.example`
- `frontend/.env.example`

## Current Scope
The implemented system currently supports:
- Hardhat-based contract development and deployment
- investigator-gated evidence registration
- IPFS storage through Pinata
- per-case custody ledger persistence
- evidence verification through file hash lookup
- multi-investigator case reporting for shared case IDs
- JSON report generation and Pinata pinning
- PDF report export
