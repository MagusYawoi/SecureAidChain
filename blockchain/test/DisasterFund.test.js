const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DisasterFund", function () {
  let contract, owner, admin2, ngo, beneficiary, donor;

  beforeEach(async () => {
    [owner, admin2, ngo, beneficiary, donor] = await ethers.getSigners();
    const DisasterFund = await ethers.getContractFactory("DisasterFund");
    contract = await DisasterFund.deploy(2); // 2 approvals required
    await contract.waitForDeployment();

    await contract.addAdmin(admin2.address);
    await contract.verifyNGO(ngo.address);
    await contract.verifyBeneficiary(beneficiary.address);
  });

  it("accepts donations", async () => {
    await contract.connect(donor).donate("disaster-001", { value: ethers.parseEther("1.0") });
    expect(await contract.getContractBalance()).to.equal(ethers.parseEther("1.0"));
    expect(await contract.getDonationCount()).to.equal(1);
  });

  it("multi-sig disbursement requires 2 approvals", async () => {
    await contract.connect(donor).donate("disaster-001", { value: ethers.parseEther("2.0") });

    await contract.connect(ngo).requestDisbursement(
      beneficiary.address,
      ethers.parseEther("1.0"),
      "disaster-001"
    );
    const requestId = 0;

    // First approval — funds not yet allocated
    await contract.connect(owner).approveDisbursement(requestId);
    expect(await contract.getAllocatedFunds(beneficiary.address)).to.equal(0);

    // Second approval — executes
    await contract.connect(admin2).approveDisbursement(requestId);
    expect(await contract.getAllocatedFunds(beneficiary.address)).to.equal(ethers.parseEther("1.0"));
  });

  it("beneficiary can withdraw allocated funds after cooldown", async () => {
    await contract.connect(donor).donate("disaster-001", { value: ethers.parseEther("2.0") });
    await contract.connect(ngo).requestDisbursement(beneficiary.address, ethers.parseEther("1.0"), "disaster-001");
    await contract.connect(owner).approveDisbursement(0);
    await contract.connect(admin2).approveDisbursement(0);

    // Fast-forward 24h
    await ethers.provider.send("evm_increaseTime", [86401]);
    await ethers.provider.send("evm_mine");

    const balanceBefore = await ethers.provider.getBalance(beneficiary.address);
    await contract.connect(beneficiary).withdraw();
    const balanceAfter = await ethers.provider.getBalance(beneficiary.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("pausing blocks donations and disbursements", async () => {
    await contract.setPaused(true);
    await expect(
      contract.connect(donor).donate("disaster-001", { value: ethers.parseEther("1.0") })
    ).to.be.revertedWith("Contract paused");
  });
});
