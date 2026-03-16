const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy DisasterFund with 1 required approval for multi-sig
  const DisasterFund = await hre.ethers.getContractFactory("DisasterFund");
  const contract = await DisasterFund.deploy(1);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DisasterFund deployed to:", address);

  // Save address + ABI for backend and frontend
  const artifact = await hre.artifacts.readArtifact("DisasterFund");
  const deployInfo = {
    address,
    abi: artifact.abi,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, "DisasterFund.json"), JSON.stringify(deployInfo, null, 2));

  console.log("Deployment info saved to deployments/DisasterFund.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
