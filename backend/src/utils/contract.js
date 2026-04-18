const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const deploymentPath = path.join(__dirname, "../../../blockchain/deployments/DisasterFund.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

// Read-only contract (for querying state)
const contractReadOnly = new ethers.Contract(deployment.address, deployment.abi, provider);

// Signer contract (for admin transactions)
const contract = new ethers.Contract(deployment.address, deployment.abi, signer);

async function getContractBalance() {
  return ethers.formatEther(await contractReadOnly.getContractBalance());
}

async function getTotalFunds() {
  return ethers.formatEther(await contractReadOnly.totalFunds());
}

async function getDonationCount() {
  return Number(await contractReadOnly.getDonationCount());
}

async function getDisbursementCount() {
  return Number(await contractReadOnly.getDisbursementCount());
}

async function verifyBeneficiary(address) {
  const tx = await contract.verifyBeneficiary(address);
  await tx.wait();
  return tx.hash;
}

async function verifyNGO(address) {
  const tx = await contract.verifyNGO(address);
  await tx.wait();
  return tx.hash;
}

async function requestDisbursement(recipientAddress, amountEth, disasterId) {
  const amountWei = ethers.parseEther(String(amountEth));
  const tx = await contract.requestDisbursement(recipientAddress, amountWei, disasterId);
  await tx.wait();
  return tx.hash;
}

async function approveDisbursement(requestId) {
  const tx = await contract.approveDisbursement(requestId);
  await tx.wait();
  return tx.hash;
}

async function isPaused() {
  return contractReadOnly.paused();
}

async function setPaused(state) {
  const tx = await contract.setPaused(state);
  await tx.wait();
  return tx.hash;
}

async function getPendingRequests() {
  const count = await contractReadOnly.requestCount();
  const requests = [];
  for (let i = 0; i < Number(count); i++) {
    const r = await contractReadOnly.requests(i);
    requests.push({
      requestId: i,
      recipient: r[0],
      amount: ethers.formatEther(r[1]),
      disasterId: r[2],
      approvalCount: Number(r[3]),
      executed: r[4],
    });
  }
  return requests;
}

async function confirmDelivery(disbursementIndex, ipfsHash) {
  const tx = await contract.confirmDelivery(disbursementIndex, ipfsHash);
  await tx.wait();
  return tx.hash;
}

async function getDisbursements() {
  const count = await contractReadOnly.getDisbursementCount();
  const disbursements = [];
  for (let i = 0; i < Number(count); i++) {
    const d = await contractReadOnly.disbursements(i);
    disbursements.push({
      index: i,
      recipient: d.recipient,
      amount: ethers.formatEther(d.amount),
      timestamp: Number(d.timestamp),
      disasterId: d.disasterId,
      proofIPFSHash: d.proofIPFSHash,
      confirmed: d.confirmed,
    });
  }
  return disbursements;
}

module.exports = {
  contract,
  contractReadOnly,
  provider,
  signer,
  contractAddress: deployment.address,
  getContractBalance,
  getTotalFunds,
  getDonationCount,
  getDisbursementCount,
  verifyBeneficiary,
  verifyNGO,
  requestDisbursement,
  approveDisbursement,
  isPaused,
  setPaused,
  confirmDelivery,
  getDisbursements,
  getPendingRequests,
};
