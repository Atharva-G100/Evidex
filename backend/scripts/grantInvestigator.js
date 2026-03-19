const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const registry = await hre.ethers.getContractAt(
    "EvidenceRegistry",
    "0xdce10d518FF7c619ff2CAd15faaf428A0911CA44"
  );
  const tx = await registry.grantInvestigator(
    "0x12C10Da5C9843Df0ba60419B42F32D8227b76C39"
  );
  await tx.wait();
  console.log(
    "Investigator granted to 0x12C10Da5C9843Df0ba60419B42F32D8227b76C39"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
