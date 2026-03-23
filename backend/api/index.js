require('dotenv').config()

const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const { JsonRpcProvider, Contract, verifyMessage } = require('ethers')

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
})

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3001)
const PINATA_JWT = process.env.PINATA_JWT
const PINATA_GATEWAY_BASE = process.env.PINATA_GATEWAY_BASE || 'https://gateway.pinata.cloud/ipfs/'
const EXPECTED_CHAIN_ID = String(process.env.EXPECTED_CHAIN_ID || '0xaa36a7').toLowerCase()
const RPC_URL = process.env.SEPOLIA_RPC_URL

const deployedPath = path.join(__dirname, '..', 'artifacts', 'deployed.json')
const artifactPath = path.join(
  __dirname,
  '..',
  'artifacts',
  'contracts',
  'EvidenceRegistry.sol',
  'EvidenceRegistry.json'
)

if (!RPC_URL) {
  throw new Error('SEPOLIA_RPC_URL is missing in backend/.env')
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function normaliseGatewayBase(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function buildAuthMessage({ address, chainId, timestamp }) {
  return [
    'Evidence Registry Pinata Upload',
    `address:${String(address).toLowerCase()}`,
    `chainId:${String(chainId).toLowerCase()}`,
    `timestamp:${timestamp}`
  ].join('\n')
}

const deployment = loadJson(deployedPath)
const artifact = loadJson(artifactPath)
const provider = new JsonRpcProvider(RPC_URL)
const contract = new Contract(deployment.address, artifact.abi, provider)

app.use(express.json())

async function verifyInvestigator(req, res, next) {
  try {
    const address = String(req.header('x-wallet-address') || '').trim().toLowerCase()
    const signature = String(req.header('x-wallet-signature') || '').trim()
    const chainId = String(req.header('x-chain-id') || '').trim().toLowerCase()
    const timestampHeader = String(req.header('x-auth-timestamp') || '').trim()

    if (!address || !signature || !chainId || !timestampHeader) {
      return res.status(401).json({ error: 'Missing authentication headers.' })
    }

    if (chainId !== EXPECTED_CHAIN_ID) {
      return res.status(400).json({ error: 'Wrong network.' })
    }

    const timestamp = Number(timestampHeader)
    if (!Number.isFinite(timestamp)) {
      return res.status(400).json({ error: 'Invalid auth timestamp.' })
    }

    if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Expired authentication signature.' })
    }

    const message = buildAuthMessage({ address, chainId, timestamp })
    const recovered = verifyMessage(message, signature).toLowerCase()
    if (recovered !== address) {
      return res.status(401).json({ error: 'Signature verification failed.' })
    }

    const isInvestigator = await contract.isInvestigator(address)
    if (!isInvestigator) {
      return res.status(403).json({ error: 'Wallet is not an investigator.' })
    }

    req.investigator = address
    next()
  } catch (error) {
    next(error)
  }
}

async function uploadToPinata(file, metadata) {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is missing in backend/.env')
  }

  const form = new FormData()
  const blob = new Blob([file.buffer], {
    type: file.mimetype || 'application/octet-stream'
  })

  form.append('file', blob, file.originalname)
  form.append(
    'pinataMetadata',
    JSON.stringify({
      name: file.originalname,
      keyvalues: metadata
    })
  )

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`
    },
    body: form
  })

  const raw = await response.text()
  let payload = null

  try {
    payload = JSON.parse(raw)
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error?.reason || payload?.message || raw || 'Pinata upload failed.')
  }

  if (!payload?.IpfsHash) {
    throw new Error('Pinata response did not include IpfsHash.')
  }

  return {
    cid: payload.IpfsHash,
    gatewayUrl: `${normaliseGatewayBase(PINATA_GATEWAY_BASE)}${payload.IpfsHash}`,
    size: Number(payload.PinSize || file.size || 0)
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    expectedChainId: EXPECTED_CHAIN_ID,
    contractAddress: deployment.address
  })
})

app.post('/pinata/upload', verifyInvestigator, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file.' })
    }

    const metadata = {
      caseId: String(req.body.caseId || '').trim(),
      fileHash: String(req.body.fileHash || '').trim(),
      officerName: String(req.body.officerName || '').trim(),
      notes: String(req.body.notes || '').trim(),
      investigator: req.investigator
    }

    const result = await uploadToPinata(req.file, metadata)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  res.status(500).json({
    error: error?.message || 'Internal server error.'
  })
})

app.listen(BACKEND_PORT, () => {
  console.log(`Pinata API listening on http://localhost:${BACKEND_PORT}`)
})
