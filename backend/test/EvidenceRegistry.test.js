const { expect } = require('chai')
const hre = require('hardhat')

describe('EvidenceRegistry', function () {
  let registry
  let deployer

  const CustodyStatus = {
    COLLECTED: 0,
    TRANSFERRED: 1,
    ANALYZED: 2
  }

  beforeEach(async function () {
    const EvidenceRegistry = await hre.ethers.getContractFactory('EvidenceRegistry')
    registry = await EvidenceRegistry.deploy()
    deployer = (await hre.ethers.getSigners())[0]
  })

  it('stores metadata, CID, and default status when registering', async function () {
    const hash = '0x' + 'ab'.repeat(32)
    const cid = 'QmTestCid'
    await registry.registerEvidence(hash, 'CASE-123', 'Officer K', cid, CustodyStatus.COLLECTED)

    const [caseId, officerName, ipfsCid, uploader, timestamp, status] =
      await registry.getEvidence(hash)

    expect(caseId).to.equal('CASE-123')
    expect(officerName).to.equal('Officer K')
    expect(ipfsCid).to.equal(cid)
    expect(uploader).to.equal(deployer.address)
    expect(Number(timestamp)).to.be.greaterThan(0)
    expect(Number(status)).to.equal(CustodyStatus.COLLECTED)
  })

  it('rejects duplicate hashes', async function () {
    const hash = '0x' + 'cd'.repeat(32)
    await registry.registerEvidence(hash, 'CASE-XYZ', 'Officer L', 'QmDup', CustodyStatus.COLLECTED)

    await expect(
      registry.registerEvidence(hash, 'CASE-XYZ', 'Officer L', 'QmDup', CustodyStatus.COLLECTED)
    ).to.be.revertedWith('Evidence already registered')
  })

  it('enforces investigator role', async function () {
    const [, other] = await hre.ethers.getSigners()
    await registry.revokeInvestigator(other.address)
    const hash = '0x' + 'ef'.repeat(32)
    await expect(
      registry
        .connect(other)
        .registerEvidence(hash, 'CASE-000', 'Officer X', 'QmCid', CustodyStatus.COLLECTED)
    ).to.be.revertedWith('Caller is not investigator')
  })

  it('allows owner to update custody status', async function () {
    const hash = '0x' + '23'.repeat(32)
    await registry.registerEvidence(hash, 'CASE-9', 'Officer Y', 'QmStatus', CustodyStatus.COLLECTED)
    await registry.setCustodyStatus(hash, CustodyStatus.TRANSFERRED)

    const [, , , , , status] = await registry.getEvidence(hash)
    expect(Number(status)).to.equal(CustodyStatus.TRANSFERRED)
  })
})
