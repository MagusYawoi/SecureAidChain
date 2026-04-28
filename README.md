# SecureAidChain

A blockchain-based transparent disaster relief fund management system that ensures every donation and aid disbursement is immutably recorded, verifiable, and tamper-proof.

## What It Does

SecureAidChain solves corruption and mismanagement in disaster relief by putting every financial transaction on the Ethereum blockchain. Donors can see exactly where their money goes, NGOs can request disbursements, and admins approve them through a multi-signature process. Proof of delivery is stored on IPFS — a decentralized file system — so receipts can never be altered or deleted.

## Key Features

- **Blockchain Donations** — Every ETH donation is recorded on-chain via a Solidity smart contract
- **Multi-Signature Disbursements** — Fund releases require admin approval before execution
- **3-Layer Campaign Authenticity** — Every campaign is enforced at creation, auto-scored by the backend, and manually approved by an admin before donations open (see [Campaign Verification Flow](#campaign-verification-flow))
- **Distributed Delivery Confirmation** — Beneficiaries and NGOs (not just admins) can upload IPFS proof of delivery, with server-side checks so beneficiaries can only confirm their own disbursements
- **Synced On-Chain Verification** — The admin "Verify user" button now also calls `verifyBeneficiary` or `verifyNGO` on the smart contract, keeping the database and blockchain whitelist in sync
- **Strong-Password Policy** — Registration enforces 8+ chars, upper, lower, digit, and special character; Register page shows a live strength meter
- **Duplicate Campaign Detection** — Backend flags campaigns whose titles overlap with any other created in the past 30 days
- **PDF Donation Receipts** — Donors download a branded, blockchain-verified receipt after any donation, and can re-download one for any past donation from the Transaction History
- **Real-Time Fraud Detection** — Every recorded transaction is auto-scanned by a 7-rule risk-scoring engine; admins get an investigation dashboard with charts, attack-pattern attribution, and 5 simulation scenarios for demos (see [Fraud Detection System](#fraud-detection-system))
- **IPFS Proof of Delivery** — Delivery receipts are uploaded to IPFS (via Pinata) and the hash is stored on-chain
- **QR Code Generation** — Each disaster campaign generates a scannable QR code containing beneficiary and disaster info
- **GPS Tracking** — Disaster locations are shown via an embedded Google Maps iframe (no API key required) with a quick-link to open the location in a new tab
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
│   ├── scripts/
│   │   └── reset-ledger.js   # Sync MongoDB to fresh on-chain state after Hardhat restart
│   └── src/
│       ├── middleware/  # JWT auth middleware
│       ├── models/      # Mongoose models (User, Disaster, Transaction, FraudAlert)
│       ├── routes/      # auth, disasters, transactions, users, blockchain, ipfs, qrcode, fraud
│       ├── utils/       # contract.js (ethers), crypto.js (AES), fraudDetector.js
│       └── index.js
└── frontend/            # React app
    └── src/
        ├── context/     # AuthContext
        ├── pages/       # Login, Register, Dashboard, Disasters, DisasterDetail, Admin, NewDisaster, FraudDashboard
        ├── services/    # api.js (axios), blockchain.js (ethers)
        └── utils/       # receipt.js (PDF receipt generator)
```

## User Roles

- **Admin** — Creates and **verifies** disaster campaigns, verifies beneficiaries + NGOs (DB + on-chain), approves disbursements, can confirm delivery on any disbursement, manages users
- **Donor** — Connects MetaMask wallet, donates ETH to **verified** campaigns, downloads PDF donation receipts
- **NGO** — Creates disaster campaigns, requests fund disbursements, confirms delivery on any disbursement in campaigns they coordinate
- **Government** — Creates disaster campaigns, requests disbursements (oversight + coordination role)
- **Beneficiary** — Withdraws allocated funds, submits IPFS delivery proof for **their own** disbursements
- **Agency** — Aid agency role for managing relief operations

> Campaigns created by NGO and Government roles enter the same verification queue as admin-created ones — no one can self-publish a live campaign.

### Permissions matrix

| Action | Admin | NGO | Government | Donor | Beneficiary |
|---|---|---|---|---|---|
| Create campaign | ✓ | ✓ | ✓ | | |
| Verify campaign | ✓ | | | | |
| Donate | | | | ✓ | |
| Request disbursement | ✓ | ✓ | ✓ | | |
| Approve disbursement | ✓ | | | | |
| Withdraw allocated funds | | | | | ✓ (self) |
| Confirm delivery (IPFS proof) | ✓ (any) | ✓ (any) | | | ✓ (own only) |

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

## Donation Receipts

After every successful donation, donors see a green confirmation card on the campaign detail page with a **Download Receipt** button. Every `donation` row in the Transaction History table also has its own **Download** button, so donors can re-download receipts for any past donation.

Receipts are produced fully client-side:

- The page builds a styled HTML receipt off-screen (light background with SecureAidChain brand accents — designed to print cleanly)
- `html2canvas` snapshots the node
- `jsPDF` embeds the snapshot into an A4 PDF
- The browser triggers a download as `SecureAidChain-receipt-<txhash>.pdf`

### What each receipt contains

- Donor name + email + wallet address
- Campaign title, location, and disaster ID
- Amount in ETH (displayed prominently)
- Blockchain proof block: transaction hash, block number, network (Chain ID 31337 for local Hardhat)
- ISO timestamp of issuance

The transaction hash makes the receipt independently verifiable against the Ethereum chain.

### Client-side deps

- `jspdf` (PDF construction)
- `html2canvas` (HTML → canvas snapshot)

Both live in `frontend/package.json`. The receipt builder lives in `frontend/src/utils/receipt.js` and is invoked from `DisasterDetail.jsx`.

---

## Fraud Detection System

Every transaction recorded in MongoDB (donation, disbursement, withdrawal) is automatically passed through a server-side analyzer ([backend/src/utils/fraudDetector.js](backend/src/utils/fraudDetector.js)). If the transaction trips one or more rules, a `FraudAlert` document is created and surfaced to admins on a dedicated dashboard at `/admin/fraud`.

### 7 detection rules

| # | Rule | Trigger | Score |
|---|---|---|---|
| 1 | Large donation | Donation > 50 ETH | +20 to +40 |
| 2 | Rapid fire | 3+ transactions from same address in 10 minutes | +25 to +50 |
| 3 | Round amount | Exact integer ≥ 10 ETH (10, 20, 50…) | +15 |
| 4 | Duplicate disaster | Same address contributed to same campaign within 1 hour | +15 to +35 |
| 5 | Zero / dust | Amount = 0, or 0 < amount ≤ 0.001 ETH | +30 |
| 6 | Suspicious address | Self-transfer (sender == recipient) or null/burn address | +70 to +90 |
| 7 | Large disbursement | Disbursement > 50 ETH | +45 |

Cumulative score is capped at 100 and bucketed into:

| Score range | Risk level |
|---|---|
| 0–19 | (no alert created) |
| 20–39 | Medium |
| 40–69 | High |
| 70–100 | Critical |

Each alert also stores: triggered flag list, transaction count from the same address, prior alert count, attack pattern (e.g. "Self-transfer / wash trading"), severity label, and a recommended admin action.

### Admin dashboard

`/admin/fraud` is admin-only and provides:

- **Stat cards** — Total / Critical / High / Medium / Flagged / Confirmed Fraud counts
- **Visualization panel** — Pure-SVG pie / donut / bar / horizontal-bar charts (no chart library) of alerts by risk level
- **Attack simulator** — One-click demo buttons for 5 canned scenarios (large amount, rapid fire, self-transfer, dust attack, large disbursement) so the system can be demonstrated without staging real attacks
- **Active rules panel** — Shows all 7 rules with thresholds and score ranges
- **Alerts table** — Filterable by risk level + status; each row has a Review action
- **Investigation modal** — Full alert detail: severity banner, key info grid, timeline, attacker info (with prior activity count), triggered rules, recommendation, admin review note. Action buttons: Dismiss, Mark Reviewed, Confirm Fraud

### API endpoints (admin-only)

- `GET /api/fraud` — list alerts (filterable by `status`, `riskLevel`)
- `GET /api/fraud/stats` — aggregate counts for the stat cards
- `PATCH /api/fraud/:id/review` — update an alert's status + admin note
- `POST /api/fraud/simulate` — generate a synthetic alert for one of the 5 scenarios

### What it does NOT do (yet)

- It does not **block** suspicious transactions — alerts are post-facto; the on-chain transaction has already been mined. Hard blocking would require either rejecting at the API layer before the on-chain call, or adding a contract-level pause/blacklist.
- It does not learn — rules are static thresholds. A future iteration could feed labeled alerts to a classifier.

---

## Maintenance scripts

`backend/scripts/reset-ledger.js` — wipes the `transactions` collection and resets `collectedAmount: 0` on all disasters. Use after restarting the Hardhat node, since the on-chain state resets to zero but MongoDB still holds the old donation records, causing "Insufficient funds" errors when you try to disburse.

```bash
cd backend
node scripts/reset-ledger.js
```

No npm install needed — uses the existing `mongoose` dependency.

---

## Frontend dev-server CSP

The Vite dev server in [frontend/vite.config.js](frontend/vite.config.js) sends a Content-Security-Policy header that locks down which external origins the app may talk to. The current allowlist:

| Directive | Allowed sources | Why |
|---|---|---|
| `default-src` | `'self'` | Catch-all stays tight |
| `script-src` | `'self' 'unsafe-eval' 'unsafe-inline'` | Required by Vite/React HMR |
| `style-src` | `'self' 'unsafe-inline'` | Inline styles + Tailwind |
| `img-src` | `'self' data: blob: https:` | Map tiles, Pinata gateway, IPFS proofs |
| `connect-src` | `'self' http://127.0.0.1:8545 https:` | Hardhat JSON-RPC + outbound APIs |
| `frame-src` | `'self' https://www.openstreetmap.org https://maps.google.com https://www.google.com` | Embedded Google Maps for GPS Location |

Without these directives, embedded map iframes are blocked with `ERR_BLOCKED_BY_CSP`. If you add a new tile or iframe provider (Mapbox, Stadia, etc.), extend the appropriate directive.

## Typography

The site uses the OS native UI font stack (`-apple-system, Segoe UI, Roboto, Helvetica Neue, ...`). The `Syne` Google Font import was previously included but has been disabled in [src/index.css](frontend/src/index.css) to keep the CSP simple and avoid an external font fetch. Numeric and address fields use a `'DM Mono', monospace` rule that falls through cleanly to the OS monospace font (Menlo / Consolas / Liberation Mono).

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
