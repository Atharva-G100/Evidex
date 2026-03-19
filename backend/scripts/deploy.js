const fs = require('fs')
const path = require('path')
const hre = require('hardhat')

async function main() {
  const EvidenceRegistry = await hre.ethers.getContractFactory('EvidenceRegistry')
  const contract = await EvidenceRegistry.deploy()
  await contract.waitForDeployment()

  const deploymentTx = await contract.deploymentTransaction()
  const [deployer] = await hre.ethers.getSigners()
  const deployedAddress = await contract.getAddress()
  const payload = {
    name: 'EvidenceRegistry',
    address: deployedAddress,
    network: hre.network.name,
    transactionHash: deploymentTx.transactionHash,
    timestamp: new Date().toISOString(),
    signer: deployer.address.toLowerCase()
  }

  const outputDir = path.join(__dirname, '..', 'artifacts')
  const outputPath = path.join(outputDir, 'deployed.json')

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), { encoding: 'utf-8' })

  console.log('Deployed EvidenceRegistry to', deployedAddress, 'on', payload.network)
  console.log('Deployment metadata written to', outputPath)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
