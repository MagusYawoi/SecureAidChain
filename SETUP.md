# SecureAidChain — Setup Guide

This guide covers everything needed to run the project from scratch on a new machine.

## Prerequisites

Install the following before starting:

- **Node.js** v22.12.0 or higher — https://nodejs.org
- **MongoDB** — https://www.mongodb.com/try/download/community
- **MetaMask** browser extension — https://metamask.io
- **Git** (optional)

Verify installations:
```bash
node --version    # should be v22.12.0+
mongod --version  # should show MongoDB version
```

---

## Step 1 — Clone / Open the Project

```bash
cd SecureAidChain
```

---

## Step 2 — Install Dependencies

Run these three commands:

```bash
# Blockchain
cd blockchain && npm install

# Backend
cd ../backend && npm install

# Frontend
cd ../frontend && npm install
```

---

## Step 3 — Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secureaidschain
JWT_SECRET=secureaidschain_super_secret_key_2024
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
PINATA_JWT=<your Pinata JWT from pinata.cloud>
```

> **Pinata JWT** — Sign up free at https://pinata.cloud, create an API key with Admin permissions, and paste the JWT here.

> **ENCRYPTION_KEY** — Generate a fresh one:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Step 4 — Start MongoDB

MongoDB should run as a Windows service automatically. If not:

```bash
net start MongoDB
```

Verify it's running:
```bash
sc query MongoDB
```

---

## Step 5 — Start the Hardhat Local Blockchain

Open a terminal and keep it running the whole time:

```bash
cd blockchain
npx hardhat node
```

You will see 20 test accounts each with 10,000 fake ETH. **Never close this terminal.**

---

## Step 6 — Deploy the Smart Contract

Open a second terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

This automatically:
- Deploys the contract
- Saves `DisasterFund.json` to `blockchain/deployments/`
- Copies it to `frontend/public/` (no manual copy needed)
- Verifies known beneficiary addresses on-chain

---

## Step 7 — Start the Backend

Open a third terminal:

```bash
cd backend
npm run dev
```

You should see:
```
MongoDB connected
Backend running on http://localhost:5000
```

---

## Step 8 — Start the Frontend

Open a fourth terminal:

```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`

---

## Step 9 — Create the Admin Account

Run this **once** (only needed if MongoDB is fresh/wiped):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@secureaidchain.com\",\"password\":\"Admin@1234\",\"role\":\"admin\",\"walletAddress\":\"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\"}"
```

Login at `http://localhost:5173` with:
- Email: `admin@secureaidchain.com`
- Password: `Admin@1234`

---

## Step 10 — Connect MetaMask

1. Open MetaMask → Networks → **Add a custom network**:
   - **Network name:** `Hardhat Local`
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency symbol:** `ETH`

2. Import a test account — click MetaMask → Add wallet → Import an account:
   - Use Account #1 private key (donor, has 10,000 ETH):
   ```
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```

3. Click **Connect Wallet** in the app navbar.

---

## Test Accounts (Hardhat)

These are public test accounts — never use on mainnet.

| Account | Address | Private Key |
|---|---|---|
| #0 (Deployer/Admin) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #1 (Donor) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| #2 (Beneficiary/Sindhu) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

---

## Running Order Summary

Every time you start the project:

1. `net start MongoDB` (if not running as a service)
2. Terminal 1: `cd blockchain && npx hardhat node`
3. Terminal 2: `cd blockchain && npx hardhat run scripts/deploy.js --network localhost`
4. Terminal 3: `cd backend && npm run dev`
5. Terminal 4: `cd frontend && npm run dev`

> **After redeployment:** The deploy script handles everything automatically. Just restart the backend (step 4).

---

## If You Add a New Beneficiary

To auto-verify a new beneficiary address on every deploy, add their address to the `BENEFICIARIES` array in `blockchain/scripts/deploy.js`:

```js
const BENEFICIARIES = [
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Sindhu
  "0xYourNewAddress",                             // New beneficiary
];
```

---

## Typical Demo Flow

1. **Admin** logs in → creates a disaster campaign
2. **Donor** logs in → connects MetaMask → donates ETH to the campaign
3. **Admin** logs in → requests a disbursement for a beneficiary (Sindhu)
4. **Admin** goes to **Admin → Multi-Sig Approvals** → approves the pending request
5. **Admin** uploads delivery proof file → stored on IPFS → hash saved on-chain
6. Dashboard shows updated contract balance, transaction history, and IPFS proof link
