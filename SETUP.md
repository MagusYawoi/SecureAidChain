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

Run these three commands (each in the project root):

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

Open a terminal and keep it running:

```bash
cd blockchain
npx hardhat node
```

You will see 20 test accounts each with 10,000 fake ETH. Keep this terminal open.

---

## Step 6 — Deploy the Smart Contract

Open a second terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

This creates `blockchain/deployments/DisasterFund.json` with the contract address and ABI.

Then copy it to the frontend:
```bash
cp deployments/DisasterFund.json ../frontend/public/DisasterFund.json
```

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

## Step 9 — Create an Admin Account

Run this once to seed the admin user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@secureaidchain.com",
    "password": "Admin@1234",
    "role": "admin",
    "walletAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }'
```

Login at `http://localhost:5173` with:
- Email: `admin@secureaidchain.com`
- Password: `Admin@1234`

---

## Step 10 — Connect MetaMask

1. Open MetaMask → Networks → Add a custom network:
   - **Network name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency symbol:** `ETH`

2. Import a test account using this private key (Account #1, has 10,000 ETH):
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
| #2 (Beneficiary) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

---

## Running Order Summary

Every time you start the project:

1. `net start MongoDB` (if not already running as a service)
2. Terminal 1: `cd blockchain && npx hardhat node`
3. Terminal 2: `cd backend && npm run dev`
4. Terminal 3: `cd frontend && npm run dev`

> Note: The contract address changes every time you redeploy. Always copy `DisasterFund.json` to `frontend/public/` after redeployment and restart the backend.

---

## Typical Demo Flow

1. **Admin** logs in → creates a disaster campaign
2. **Admin** verifies a beneficiary address on-chain
3. **Donor** logs in → connects MetaMask → donates ETH
4. **Admin** requests a disbursement for the beneficiary
5. **Admin** approves the disbursement (Multi-Sig Approvals tab)
6. **Admin/NGO** uploads delivery proof → stored on IPFS → hash saved on-chain
7. Dashboard shows updated contract balance and transaction history
