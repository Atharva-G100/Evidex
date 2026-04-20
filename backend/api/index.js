require('dotenv').config()

const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const { JsonRpcProvider, Contract, verifyMessage, FetchRequest } = require('ethers')

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
const CONTRACT_ADDRESS_ENV = String(process.env.CONTRACT_ADDRESS || '').trim()
const NETWORK_NAME = String(process.env.NETWORK_NAME || 'sepolia').trim().toLowerCase()
const LEDGER_DIR_INPUT = String(process.env.LEDGER_DIR || 'ledger').trim()
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 30000)
const INVESTIGATOR_CACHE_TTL_MS = Number(process.env.INVESTIGATOR_CACHE_TTL_MS || 10 * 60 * 1000)

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

function resolveLedgerDir(value) {
  if (!value) return path.join(__dirname, '..', 'ledger')
  return path.isAbsolute(value) ? value : path.join(__dirname, '..', value)
}

function isTimeoutError(error) {
  return error?.code === 'TIMEOUT' || /timeout/i.test(String(error?.message || ''))
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || '').trim())
}

function resolveDeploymentAddress() {
  if (fs.existsSync(deployedPath)) {
    const deployment = loadJson(deployedPath)
    if (isAddress(deployment?.address)) {
      return deployment.address
    }
  }

  if (isAddress(CONTRACT_ADDRESS_ENV)) {
    return CONTRACT_ADDRESS_ENV
  }

  throw new Error(
    `Missing contract address. Provide ${deployedPath} or set CONTRACT_ADDRESS in backend/.env`
  )
}

const LEDGER_DIR = resolveLedgerDir(LEDGER_DIR_INPUT)

function normaliseGatewayBase(value) {
  const trimmed = String(value || '').trim()
  const withSlash = trimmed.endsWith('/') ? trimmed : `${trimmed}/`

  try {
    const url = new URL(withSlash)
    const path = url.pathname || '/'
    if (path === '/' || path === '') {
      url.pathname = '/ipfs/'
      return url.toString()
    }
    if (!path.endsWith('/')) {
      url.pathname = `${path}/`
    }
    if (!url.pathname.includes('/ipfs/')) {
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/ipfs/`
    }
    return url.toString()
  } catch {
    if (withSlash.includes('/ipfs/')) return withSlash
    return `${withSlash.replace(/\/+$/, '')}/ipfs/`
  }
}

function buildAuthMessage({ address, chainId, timestamp }) {
  return [
    'Evidence Registry API Auth',
    `address:${String(address).toLowerCase()}`,
    `chainId:${String(chainId).toLowerCase()}`,
    `timestamp:${timestamp}`
  ].join('\n')
}

function buildGatewayUrl(cid) {
  return `${normaliseGatewayBase(PINATA_GATEWAY_BASE)}${cid}`
}

async function withRpcRetry(operation, label, attempts = 3) {
  let lastError = null

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTimeoutError(error) || index === attempts - 1) {
        break
      }
    }
  }

  if (isTimeoutError(lastError)) {
    throw new Error(`${label} request timed out. Check the backend RPC URL and try again.`)
  }

  throw lastError
}

function ensureLedgerDir() {
  fs.mkdirSync(LEDGER_DIR, { recursive: true })
}

function sanitiseCaseId(caseId) {
  return String(caseId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
}

function getLedgerFilePath(caseId) {
  const safeCaseId = sanitiseCaseId(caseId)
  if (!safeCaseId) {
    throw new Error('Case ID is required.')
  }

  return path.join(LEDGER_DIR, `${safeCaseId}.json`)
}

function createEmptyLedger(caseId) {
  return {
    caseId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries: [],
    reports: []
  }
}

function readLedger(caseId, { allowMissing = false } = {}) {
  const filePath = getLedgerFilePath(caseId)
  if (!fs.existsSync(filePath)) {
    return allowMissing ? createEmptyLedger(caseId) : null
  }

  const payload = loadJson(filePath)
  payload.caseId = payload.caseId || caseId
  payload.entries = Array.isArray(payload.entries) ? payload.entries : []
  payload.reports = Array.isArray(payload.reports) ? payload.reports : []
  payload.createdAt = payload.createdAt || new Date().toISOString()
  payload.updatedAt = payload.updatedAt || payload.createdAt
  return payload
}

function writeLedger(ledger) {
  ensureLedgerDir()
  const filePath = getLedgerFilePath(ledger.caseId)
  fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2))
}

function getStatusLabel(statusCode) {
  if (Number(statusCode) === 0) return 'Collected'
  if (Number(statusCode) === 1) return 'Transferred'
  return 'Analyzed'
}

function normaliseIsoTimestamp(value) {
  const parsed = new Date(value || Date.now())
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

function appendLedgerEntry(caseId, entry) {
  const ledger = readLedger(caseId, { allowMissing: true })
  const now = new Date().toISOString()
  const nextEntry = {
    id: `entry-${Date.now()}-${ledger.entries.length + 1}`,
    createdAt: now,
    ...entry
  }

  if (!ledger.createdAt) {
    ledger.createdAt = now
  }

  ledger.updatedAt = now
  ledger.entries.push(nextEntry)
  writeLedger(ledger)
  return nextEntry
}

async function readOnChainEvidence(fileHash) {
  const [caseId, officerName, ipfsCid, uploader, timestamp, status] = await withRpcRetry(
    () => contract.getEvidence(fileHash),
    'Evidence read'
  )
  const rawTimestamp = Number(timestamp)
  const statusCode = Number(status)

  return {
    caseId,
    officerName,
    ipfsCid,
    uploader,
    timestamp: rawTimestamp ? new Date(rawTimestamp * 1000).toISOString() : null,
    rawTimestamp,
    statusCode,
    statusLabel: getStatusLabel(statusCode)
  }
}

const artifact = loadJson(artifactPath)
const rpcRequest = new FetchRequest(RPC_URL)
rpcRequest.timeout = RPC_TIMEOUT_MS
const provider = new JsonRpcProvider(rpcRequest, NETWORK_NAME, { staticNetwork: true })
const deployedAddress = resolveDeploymentAddress()
const contract = new Contract(deployedAddress, artifact.abi, provider)
const investigatorCache = new Map()

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

    const cached = investigatorCache.get(address)
    if (cached && cached.expiresAt > Date.now()) {
      req.investigator = address
      return next()
    }

    const isInvestigator = await withRpcRetry(
      () => contract.isInvestigator(address),
      'Investigator check'
    )
    if (!isInvestigator) {
      return res.status(403).json({ error: 'Wallet is not an investigator.' })
    }

    investigatorCache.set(address, {
      expiresAt: Date.now() + INVESTIGATOR_CACHE_TTL_MS
    })
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
    gatewayUrl: buildGatewayUrl(payload.IpfsHash),
    size: Number(payload.PinSize || file.size || 0)
  }
}

async function uploadJsonReportToPinata(content, metadata) {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is missing in backend/.env')
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: metadata
    })
  })

  const raw = await response.text()
  let payload = null

  try {
    payload = JSON.parse(raw)
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error?.reason || payload?.message || raw || 'Pinata report upload failed.')
  }

  if (!payload?.IpfsHash) {
    throw new Error('Pinata report response did not include IpfsHash.')
  }

  return {
    cid: payload.IpfsHash,
    gatewayUrl: buildGatewayUrl(payload.IpfsHash),
    size: Number(payload.PinSize || 0)
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    expectedChainId: EXPECTED_CHAIN_ID,
    contractAddress: deployedAddress,
    ledgerDirectory: LEDGER_DIR
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

app.post('/ledger/entry', verifyInvestigator, (req, res, next) => {
  try {
    const caseId = String(req.body.caseId || '').trim()
    const fileHash = String(req.body.fileHash || '').trim()

    if (!caseId || !fileHash) {
      return res.status(400).json({ error: 'Both caseId and fileHash are required.' })
    }

    const statusCode = Number(req.body.status ?? 0)
    const entry = appendLedgerEntry(caseId, {
      type: String(req.body.type || 'EVIDENCE_REGISTERED').trim() || 'EVIDENCE_REGISTERED',
      investigator: req.investigator,
      fileHash,
      officerName: String(req.body.officerName || '').trim(),
      evidenceType: String(req.body.evidenceType || '').trim(),
      notes: String(req.body.notes || '').trim(),
      ipfsCid: String(req.body.ipfsCid || '').trim(),
      gatewayUrl: String(req.body.gatewayUrl || '').trim(),
      fileSize: Number(req.body.fileSize || 0),
      txHash: String(req.body.txHash || '').trim(),
      blockNumber: req.body.blockNumber == null ? null : Number(req.body.blockNumber),
      timestamp: normaliseIsoTimestamp(req.body.timestamp),
      statusCode,
      statusLabel: getStatusLabel(statusCode),
      uploader: String(req.body.uploader || '').trim().toLowerCase()
    })

    res.status(200).json({
      ok: true,
      caseId,
      entryId: entry.id
    })
  } catch (error) {
    next(error)
  }
})

app.post('/reports/:caseId', verifyInvestigator, async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId || '').trim()
    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required.' })
    }

    const ledger = readLedger(caseId)
    if (!ledger || ledger.entries.length === 0) {
      return res.status(404).json({ error: 'No ledger entries found for this case.' })
    }

    const registrationEntries = ledger.entries.filter(
      (entry) => entry.type === 'EVIDENCE_REGISTERED' && entry.fileHash
    )
    const uniqueFileHashes = [...new Set(registrationEntries.map((entry) => entry.fileHash))]
    const evidence = []
    let chainReadFailures = 0

    for (const fileHash of uniqueFileHashes) {
      const registration = registrationEntries.find((entry) => entry.fileHash === fileHash)
      let onChain = null
      let chainReadError = null

      try {
        onChain = await readOnChainEvidence(fileHash)
      } catch (error) {
        chainReadFailures += 1
        chainReadError = error?.message || 'On-chain read failed.'
      }

      const resolvedCid = onChain?.ipfsCid || registration?.ipfsCid || ''
      const resolvedStatusCode = onChain && Number.isFinite(onChain.statusCode)
        ? onChain.statusCode
        : Number(registration?.statusCode || 0)

      evidence.push({
        fileHash,
        caseId: onChain?.caseId || caseId,
        officerName: onChain?.officerName || registration?.officerName || '',
        ipfsCid: resolvedCid,
        ipfsGatewayUrl: resolvedCid ? buildGatewayUrl(resolvedCid) : registration?.gatewayUrl || '',
        uploader: onChain?.uploader || registration?.uploader || '',
        registeredAt: onChain?.timestamp || registration?.timestamp || null,
        custodyStatusCode: resolvedStatusCode,
        custodyStatusLabel: onChain?.statusLabel || registration?.statusLabel || getStatusLabel(resolvedStatusCode),
        txHash: registration?.txHash || '',
        blockNumber: registration?.blockNumber ?? null,
        notes: registration?.notes || '',
        evidenceType: registration?.evidenceType || '',
        chainVerification: onChain ? 'verified' : 'ledger-fallback',
        chainReadError
      })
    }

    const generatedAt = new Date().toISOString()
    const reportContent = {
      reportVersion: 1,
      caseId,
      generatedAt,
      generatedBy: req.investigator,
      network: NETWORK_NAME,
      contractAddress: deployedAddress,
      summary: {
        evidenceCount: evidence.length,
        ledgerEntryCount: ledger.entries.length,
        latestLedgerUpdate: ledger.updatedAt,
        chainReadFailures
      },
      evidence,
      ledgerEntries: ledger.entries
    }

    const pinataResult = await uploadJsonReportToPinata(reportContent, {
      name: `case-report-${sanitiseCaseId(caseId)}-${Date.now()}.json`,
      keyvalues: {
        caseId,
        reportType: 'CASE_REPORT',
        generatedBy: req.investigator
      }
    })

    const reportRecord = {
      id: `report-${Date.now()}`,
      generatedAt,
      generatedBy: req.investigator,
      cid: pinataResult.cid,
      gatewayUrl: pinataResult.gatewayUrl,
      size: pinataResult.size,
      evidenceCount: evidence.length,
      ledgerEntryCount: ledger.entries.length
    }

    ledger.reports.push(reportRecord)
    ledger.updatedAt = generatedAt
    ledger.entries.push({
      id: `entry-${Date.now()}-${ledger.entries.length + 1}`,
      type: 'REPORT_GENERATED',
      createdAt: generatedAt,
      timestamp: generatedAt,
      investigator: req.investigator,
      reportId: reportRecord.id,
      reportCid: reportRecord.cid,
      reportGatewayUrl: reportRecord.gatewayUrl
    })
    writeLedger(ledger)

    res.status(200).json({
      ok: true,
      caseId,
      generatedAt,
      generatedBy: req.investigator,
      contractAddress: deployedAddress,
      network: NETWORK_NAME,
      reportCid: reportRecord.cid,
      reportGatewayUrl: reportRecord.gatewayUrl,
      reportSize: reportRecord.size,
      evidenceCount: evidence.length,
      ledgerEntryCount: ledger.entries.length,
      chainReadFailures,
      evidence,
      ledgerEntries: ledger.entries
    })
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
