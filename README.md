# Immutable Evidence Registry (Sepolia) — Setup Guide

This project is a **blockchain-based digital evidence registry**:

- Evidence files stay **local** (not uploaded to the blockchain)
- The app computes a **SHA‑256 hash locally**
- Only the **hash + metadata** are stored on **Ethereum Sepolia**
- Later, you re-upload the file, re-hash it, and the system verifies integrity against the on-chain record

---

## 0) What you need (prerequisites)

1. **Node.js (LTS recommended)** + npm
2. A browser with **MetaMask** extension installed
3. Some **Sepolia test ETH** (for gas fees) from a faucet
4. Internet access to use **Remix IDE** (browser-based Solidity IDE)

---

## 1) Get Sepolia ETH (so you can deploy + register evidence)

1. Open MetaMask → switch network to **Sepolia**
2. Copy your wallet address (Account 1 address)
3. Use a faucet and paste your address

Example faucet (Google Cloud Web3):

```text
https://cloud.google.com/application/web3/faucet/ethereum/sepolia
```

After funding, you should see a **SepoliaETH** balance in MetaMask.

---

## 2) Deploy the smart contract on Sepolia (Remix + MetaMask)

The contract source is in:

```text
backend/EvidenceRegistry.sol
```

### Step-by-step deployment

1. Open Remix:

```text
https://remix.ethereum.org
```

2. In Remix (File Explorer):
   - Create a new file: `EvidenceRegistry.sol`
   - Copy/paste the contents from `backend/EvidenceRegistry.sol`

3. Compile:
   - Go to **Solidity Compiler**
   - Select compiler version **0.8.20+** (anything compatible with `pragma solidity ^0.8.20;` is fine)
   - Click **Compile EvidenceRegistry.sol**
   - Ensure there are **no errors**

4. Connect Remix to MetaMask (Sepolia):
   - Go to **Deploy & Run Transactions**
   - In **Environment**, select:
     - **Sepolia Testnet – MetaMask** (or **Injected Provider – MetaMask**)
   - MetaMask popup appears → **Connect** and ensure the network is **Sepolia**

5. Deploy:
   - Select contract: **EvidenceRegistry**
   - Click **Deploy** (or **Deploy & Verify**)
   - MetaMask pops up → **Confirm**
   - Wait for confirmation

6. Copy the deployed contract address:
   - In Remix → **Deployed Contracts**
   - Copy the address like:
     ```text
     0xAbc...123
     ```
     You will need this in the frontend `.env`.

> Notes:
>
> - Verification warnings (Etherscan API key / Sourcify) are optional and do **not** affect functionality.
> - As long as you have a deployed contract address, the app can work.

---

## 3) Configure and run the frontend

### 3.1 Install dependencies

From the repository root:

```bash
cd frontend
npm install
```

### 3.2 Create and edit the .env file

In `frontend/`, create `.env` from the example:

```bash
# Windows PowerShell
copy .env.example .env
```

Now open `frontend/.env` and set:

```env
# Sepolia deployment address of EvidenceRegistry
VITE_EVIDENCE_REGISTRY_ADDRESS=0xPASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE

# Sepolia chain id (use hex to avoid wallet chainId format mismatch)
VITE_EXPECTED_CHAIN_ID=0xaa36a7
```

Sepolia chain id reference:

- Decimal: `11155111`
- Hex: `0xaa36a7`

### 3.3 Start the dev server

```bash
npm run dev
```

Open the URL shown in the terminal (usually):

```text
http://localhost:5173
```

---

## 4) Using the app (Register + Verify)

### 4.1 Register new evidence

1. Click **Connect Wallet**
2. Upload a file
3. Click **Generate SHA‑256 Digest**
4. Fill metadata (Case ID, Officer Name, etc.)
5. Click **Commit to Blockchain**
6. Confirm the transaction in MetaMask
7. You should see:
   - Transaction hash
   - Block height
   - Timestamp

### 4.2 Verify evidence integrity

1. Go to the **Verify Evidence** page
2. Upload the **same file**
3. The app recomputes SHA‑256 and fetches the on-chain record
4. Expected result: **IMMUTABLE / VERIFIED**

### 4.3 Tamper test (recommended for demo)

- Upload a **different file**, or modify the original file slightly
- The hash will differ → verification should fail / not found

---

## 5) Troubleshooting

### “Wrong network” even though MetaMask is on Sepolia

- Use `VITE_EXPECTED_CHAIN_ID=0xaa36a7` (hex) in `.env`
- Restart the dev server after editing `.env`:
  ```bash
  # stop dev server
  Ctrl + C
  npm run dev
  ```
- Hard refresh browser: `Ctrl + Shift + R`

### MetaMask popups don’t show (Brave / multiple wallets)

- In Brave, set default wallet provider to **MetaMask** (disable Brave Wallet for dApps), then refresh.

### “Evidence already registered”

- The contract prevents duplicates for the same hash.
- Try a different file (different hash), or use a fresh contract deployment.

### Transaction fails / insufficient funds

- Get more Sepolia ETH from a faucet and retry.

### Nothing happens on “Commit”

- Ensure:
  - MetaMask is unlocked
  - You are connected to Sepolia
  - `.env` contains the **correct deployed contract address**
  - You restarted `npm run dev` after `.env` changes

---

## 6) What NOT to commit to Git

Do **not** commit:

- `frontend/.env`
- `node_modules/`
- Remix `.states/`, `artifacts/`

The repository already ignores these via `.gitignore`.

---

## 7) (Optional) Helpful proof links for reports

- Paste your **transaction hash** into Sepolia Etherscan:

```text
https://sepolia.etherscan.io
```

- You can screenshot:
  - “Evidence secured on blockchain” panel (tx hash + block height)
  - “Integrity verified” panel

---

## Project structure (quick)

```text
backend/
  EvidenceRegistry.sol

frontend/
  src/
  .env.example
  .env  (local only, not committed)
```
