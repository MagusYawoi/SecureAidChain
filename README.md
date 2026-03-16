# SecureAidChain

A blockchain-based transparent disaster relief fund management system that ensures every donation and aid disbursement is immutably recorded, verifiable, and tamper-proof.

## What It Does

SecureAidChain solves corruption and mismanagement in disaster relief by putting every financial transaction on the Ethereum blockchain. Donors can see exactly where their money goes, NGOs can request disbursements, and admins approve them through a multi-signature process. Proof of delivery is stored on IPFS — a decentralized file system — so receipts can never be altered or deleted.

## Key Features

- **Blockchain Donations** — Every ETH donation is recorded on-chain via a Solidity smart contract
- **Multi-Signature Disbursements** — Fund releases require admin approval before execution
- **IPFS Proof of Delivery** — Delivery receipts are uploaded to IPFS (via Pinata) and the hash is stored on-chain
- **QR Code Generation** — Each disaster campaign has a scannable QR code for quick access
- **GPS Tracking** — Disaster locations are mapped with coordinates
- **AES-256 Encryption** — Sensitive user data (phone, location) is encrypted in MongoDB
- **Role-Based Access** — Donor, Beneficiary, NGO, and Admin roles with different permissions
- **JWT Authentication** — Secure session management with bcrypt password hashing

## Cryptographic Algorithms Used

| Algorithm | Purpose |
|---|---|
| AES-256-CBC | Encrypting sensitive fields in MongoDB |
| bcrypt | Password hashing |
| HMAC-SHA256 | JWT token signing |
| ECDSA (secp256k1) | Ethereum transaction signing |
| Keccak-256 | Ethereum address derivation and tx hashing |
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
│   │   └── deploy.js
│   ├── deployments/
│   │   └── DisasterFund.json   # Generated after deployment
│   └── hardhat.config.js
├── backend/             # Node.js/Express API
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── utils/
│       └── index.js
└── frontend/            # React app
    └── src/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── services/
        └── utils/
```

## User Roles

- **Admin** — Creates disaster campaigns, verifies beneficiaries, approves disbursements
- **Donor** — Connects MetaMask wallet, donates ETH to campaigns
- **NGO** — Requests fund disbursements for verified beneficiaries
- **Beneficiary** — Receives funds, submits proof of delivery via IPFS
