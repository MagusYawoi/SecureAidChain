const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Known beneficiary addresses to auto-verify after deployment
const BENEFICIARIES = [
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" // Account #2 - Sindhu
];


async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy DisasterFund with 1 required approval for multi-sig
  const DisasterFund = await hre.ethers.getContractFactory("DisasterFund");
  const contract = await DisasterFund.deploy(1);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DisasterFund deployed to:", address);

  // Save address + ABI
  const artifact = await hre.artifacts.readArtifact("DisasterFund");
  const deployInfo = { address, abi: artifact.abi, network: hre.network.name, deployedAt: new Date().toISOString() };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, "DisasterFund.json"), JSON.stringify(deployInfo, null, 2));
  console.log("Deployment info saved to deployments/DisasterFund.json");

  // Copy to frontend public folder
  const frontendPublic = path.join(__dirname, "../../frontend/public/DisasterFund.json");
  fs.copyFileSync(path.join(outDir, "DisasterFund.json"), frontendPublic);
  console.log("Copied to frontend/public/DisasterFund.json");

  // Auto-verify known beneficiaries
  console.log("\nVerifying beneficiaries...");
  for (const addr of BENEFICIARIES) {
    const tx = await contract.verifyBeneficiary(addr);
    await tx.wait();
    console.log("  Verified beneficiary:", addr);
  }

  console.log("\nDone! Restart the backend to load the new contract.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
