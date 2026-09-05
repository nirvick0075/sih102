const hre = require("hardhat");

async function main() {
  console.log("Deploying AuditRegistry smart contract...");
  const AuditRegistry = await hre.ethers.getContractFactory("AuditRegistry");
  const registry = await AuditRegistry.deploy();

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(`✅ AuditRegistry deployed successfully at address: ${address}`);
  console.log(`Add this address to your backend .env: CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
