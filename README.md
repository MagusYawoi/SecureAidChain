# SecureAidChain

A blockchain-based transparent disaster relief fund management system that ensures every donation and aid disbursement is immutably recorded, verifiable, and tamper-proof.

## What It Does

SecureAidChain solves corruption and mismanagement in disaster relief by putting every financial transaction on the Ethereum blockchain. Donors can see exactly where their money goes, NGOs can request disbursements, and admins approve them through a multi-signature process. Proof of delivery is stored on IPFS — a decentralized file system — so receipts can never be altered or deleted.

## Key Features

- **Blockchain Donations** — Every ETH donation is recorded on-chain via a Solidity smart contract
- **Multi-Signature Disbursements** — Fund releases require admin approval before execution
- **3-Layer Campaign Authenticity** — Every campaign is enforced at creation, auto-scored by the backend, and manually approved by an admin before donations open (see [Campaign Verification Flow](#campaign-verification-flow))
- **Strong-Password Policy** — Registration enforces 8+ chars, upper, lower, digit, and special character; Register page shows a live strength meter
- **Duplicate Campaign Detection** — Backend flags campaigns whose titles overlap with any other created in the past 30 days
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

- **Admin** — Creates and **verifies** disaster campaigns, verifies beneficiaries, approves disbursements, manages users
- **Donor** — Connects MetaMask wallet, donates ETH to **verified** campaigns, generates QR codes
- **NGO** — Creates disaster campaigns, requests fund disbursements for verified beneficiaries
- **Government** — Creates disaster campaigns for oversight and coordinated relief
- **Beneficiary** — Receives funds, submits proof of delivery via IPFS
- **Agency** — Aid agency role for managing relief operations

> Campaigns created by NGO and Government roles enter the same verification queue as admin-created ones — no one can self-publish a live campaign.

## Campaign Verification Flow

Campaigns do not accept donations the moment they are created — they pass through three independent layers first.

### Layer 1 — Creator form enforcement

The New Campaign form (`NewDisaster.jsx`) live-computes an **Authenticity Score (0–100%)** as the creator types:

| Requirement | Score |
|---|---|
| Description ≥ 50 characters | +25% |
| GPS coordinates (lat + lng) | +25% |
| At least one Source URL (news, govt notice, NGO report) | +25% |

The form rejects submission if description is < 50 characters and visibly warns when the score is Weak (< 50%) / Moderate (50–74%) / Strong (75%+).

### Layer 2 — Automatic backend checks

On every `POST /api/disasters`, the backend:

1. Re-runs the same 4 boolean checks (`hasGPS`, `hasDescription`, `hasSources`, `hasEvidence`) and stores the score on the document
2. Runs **duplicate detection** — searches for any campaign in the past 30 days whose title overlaps on the first 3 words (regex-escaped to tolerate special characters). If found, the new campaign is saved with `isDuplicate: true` and `duplicateOf: <existing disasterId>`
3. Forces `verificationStatus: "unverified"` and `status: "pending"` — regardless of what the client sent

### Layer 3 — Admin approval

A campaign remains invisible to donors until an admin explicitly approves it.

- Admins open **Admin → Campaign Verification** tab (new in `Admin.jsx`)
- They see every unverified campaign with full description, clickable source URLs, GPS, auto-check chips, score, and a duplicate warning if flagged
- **Verify** → `verificationStatus: "verified"`, `status: "active"`, donations open
- **Reject** (reason required) → `verificationStatus: "rejected"`, campaign stays in `pending` and never accepts donations

The donor-facing campaigns list (`GET /api/disasters?verificationStatus=verified`) and the donate form on the detail page both filter on `verificationStatus`. Unverified and rejected campaigns are never exposed to donors, even by direct URL.

### Relevant schema additions on `Disaster`

- `verificationStatus: "unverified" | "pending_review" | "verified" | "rejected"`
- `verifiedBy`, `verifiedAt`, `verifyNote`
- `rejectedAt`, `rejectReason`
- `sourceUrls[]`, `evidenceHashes[]`
- `isDuplicate`, `duplicateOf`
- `autoChecks: { hasGPS, hasEvidence, hasSources, hasDescription, checkScore }`

### Relevant API endpoint

- `PATCH /api/disasters/:id/verify` — admin-only; body `{ action: "verify" | "reject", note: string }`

---

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
