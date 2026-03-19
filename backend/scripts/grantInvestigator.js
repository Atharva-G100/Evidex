require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const investigatorAddress = process.env.INVESTIGATOR_ADDRESS;

  if (!contractAddress) {
    throw new Error("Missing CONTRACT_ADDRESS in backend/.env");
  }

  if (!investigatorAddress) {
    throw new Error("Missing INVESTIGATOR_ADDRESS in backend/.env");
  }

  const registry = await hre.ethers.getContractAt(
    "EvidenceRegistry",
    contractAddress
  );

  const tx = await registry.grantInvestigator(investigatorAddress);
  await tx.wait();

  console.log(`Investigator granted to ${investigatorAddress}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
