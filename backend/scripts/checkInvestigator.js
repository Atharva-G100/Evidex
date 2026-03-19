const hre = require("hardhat");

async function main() {
  const registry = await hre.ethers.getContractAt(
    "EvidenceRegistry",
    "0xdce10d518FF7c619ff2CAd15faaf428A0911CA44"
  );
  const result = await registry.isInvestigator(
    "0x12C10Da5C9843Df0ba60419B42F32D8227b76C39"
  );
  console.log("isInvestigator:", result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
