const fs = require('fs')
const path = require('path')

const artifactPath = path.join(
  __dirname,
  '..',
  'artifacts',
  'contracts',
  'EvidenceRegistry.sol',
  'EvidenceRegistry.json'
)
const deployedPath = path.join(__dirname, '..', 'artifacts', 'deployed.json')
const frontendContractsDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts')
const abiDest = path.join(frontendContractsDir, 'evidenceRegistryAbi.json')
const deployedDest = path.join(frontendContractsDir, 'deployed.json')

function syncAbi() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run npx hardhat compile first.`)
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
  fs.mkdirSync(frontendContractsDir, { recursive: true })
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2), 'utf-8')
  console.log('ABI synced to', abiDest)
}

function syncDeployed() {
  if (!fs.existsSync(deployedPath)) {
    console.warn('No deployed metadata found; skip deployed.json sync')
    return
  }
  fs.copyFileSync(deployedPath, deployedDest)
  console.log('Deployed metadata synced to', deployedDest)
}

try {
  syncAbi()
  syncDeployed()
} catch (error) {
  console.error('Artifact sync failed:', error.message)
  process.exitCode = 1
}
