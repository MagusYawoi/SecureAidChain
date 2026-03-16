# SecureAidChain

A blockchain-based transparent disaster relief fund management system that ensures every donation and aid disbursement is immutably recorded, verifiable, and tamper-proof.

## What It Does

SecureAidChain solves corruption and mismanagement in disaster relief by putting every financial transaction on the Ethereum blockchain. Donors can see exactly where their money goes, NGOs can request disbursements, and admins approve them through a multi-signature process. Proof of delivery is stored on IPFS — a decentralized file system — so receipts can never be altered or deleted.

## Key Features

- **Blockchain Donations** — Every ETH donation is recorded on-chain via a Solidity smart contract
- **Multi-Signature Disbursements** — Fund releases require admin approval before execution
- **IPFS Proof of Delivery** — Delivery receipts are uploaded to IPFS (via Pinata) and the hash is stored on-chain
- **QR Code Generation** — Each disaster campaign generates a scannable QR code containing beneficiary and disaster info
- **GPS Tracking** — Disaster locations are mapped with coordinates using Leaflet maps
- **AES-256 Encryption** — Sensitive user data (phone, location) is encrypted in MongoDB before storage
- **Role-Based Access** — Donor, Beneficiary, NGO, Government, Agency, and Admin roles with different permissions
- **JWT Authentication** — Secure session management with bcrypt password hashing
- **Auto Deploy Script** — Deployment script automatically copies ABI to frontend and verifies known beneficiaries

## Cryptographic Algorithms Used

| Algorithm | Purpose |
|---|---|
| AES-256-CBC | Encrypting sensitive fields (phone, location) in MongoDB |
| bcrypt | Password hashing |
| HMAC-SHA256 | JWT token signing |
| ECDSA (secp256k1) | Ethereum transaction signing via MetaMask |
| Keccak-256 | Ethereum address derivation and transaction hashing |
| IPFS CID (SHA-256) | Content-addressed proof file hashing |

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Ethereum (Hardhat local node) |
| Smart Contracts | Solidity 0.8.24 |
| Frontend | React.js + Vite + TailwindCSS |
| Web3 Client | Ethers.js v6 + MetaMask |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose |
| Decentralized Storage | IPFS via Pinata |
| Auth | JWT + bcrypt |

## Project Structure

```
SecureAidChain/
├── blockchain/          # Hardhat project — smart contracts
│   ├── contracts/
│   │   └── DisasterFund.sol
│   ├── scripts/
│   │   └── deploy.js    # Auto-deploys, copies ABI, verifies beneficiaries
│   ├── deployments/
│   │   └── DisasterFund.json   # Generated after deployment
│   └── hardhat.config.js
├── backend/             # Node.js/Express API
│   └── src/
│       ├── middleware/  # JWT auth middleware
│       ├── models/      # Mongoose models (User, Disaster, Transaction)
│       ├── routes/      # auth, disasters, transactions, users, blockchain, ipfs, qrcode
│       ├── utils/       # contract.js (ethers), crypto.js (AES)
│       └── index.js
└── frontend/            # React app
    └── src/
        ├── context/     # AuthContext
        ├── pages/       # Login, Register, Dashboard, Disasters, DisasterDetail, Admin, NewDisaster
        ├── services/    # api.js (axios), blockchain.js (ethers)
        └── utils/
```

## User Roles

- **Admin** — Creates disaster campaigns, verifies beneficiaries, approves disbursements, manages users
- **Donor** — Connects MetaMask wallet, donates ETH to campaigns, generates QR codes
- **NGO** — Requests fund disbursements for verified beneficiaries
- **Beneficiary** — Receives funds, submits proof of delivery via IPFS
- **Government** — Oversight role for monitoring campaigns
- **Agency** — Aid agency role for managing relief operations

## Smart Contract — DisasterFund.sol

Key functions:
- `donate(disasterId)` — Accept ETH donations
- `requestDisbursement(recipient, amount, disasterId)` — Create a disbursement request
- `approveDisbursement(requestId)` — Approve and execute (with multi-sig)
- `confirmDelivery(index, ipfsHash)` — Store IPFS proof hash on-chain
- `verifyBeneficiary(address)` — Admin registers a verified recipient
- `withdraw()` — Beneficiary withdraws allocated funds

## After Redeployment

Every time the Hardhat node restarts and you redeploy, the deploy script automatically:
1. Deploys the fresh contract
2. Copies `DisasterFund.json` to `frontend/public/`
3. Verifies all known beneficiary addresses

You only need to restart the backend after redeployment.
