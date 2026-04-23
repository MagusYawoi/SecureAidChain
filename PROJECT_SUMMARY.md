# SecureAidChain — Project Summary

> This document is a self-contained, chatbot-friendly overview of the project. Paste it in full into any LLM and ask it to generate a report, abstract, slide deck, or presentation script. No codebase access required.

---

## 1. What it is

SecureAidChain is a web-based disaster relief fund management system that records every donation and aid disbursement on the **Ethereum blockchain** to make them tamper-proof, transparent, and independently verifiable. Donors, government bodies, NGOs, and beneficiaries use different dashboards tailored to their roles.

---

## 2. The problem it solves

Traditional disaster relief systems suffer from three recurring issues:

1. **Corruption and fraud** — Fake campaigns, disappearing funds, and manipulated beneficiary lists
2. **Opacity** — Donors have no way to verify their contribution actually reached victims
3. **Auditing cost** — Reconciling paper receipts and bank statements across many parties is slow and error-prone

SecureAidChain addresses these by (a) putting every financial transaction on a public blockchain, (b) requiring multi-stage authenticity checks before campaigns go live, and (c) storing proof-of-delivery files on IPFS — a decentralized file system — so receipts cannot be altered or deleted after upload.

---

## 3. Architecture (3 layers)

| Layer | Technology | Responsibility |
|---|---|---|
| **Blockchain** | Ethereum (Hardhat local node) + Solidity smart contract | Immutable ledger of donations, disbursement requests, approvals, withdrawals, and delivery confirmations |
| **Backend API** | Node.js + Express + MongoDB + Mongoose | User accounts, campaigns metadata, authentication, proxies transactions to the smart contract, stores encrypted PII |
| **Frontend** | React + Vite + TailwindCSS + Ethers.js | Role-based dashboards; donors sign their own blockchain transactions via MetaMask |

**Off-chain storage:** MongoDB holds user profiles, campaign metadata, and transaction indices. Sensitive fields (phone, location) are encrypted with AES-256-CBC before storage.

**Off-chain file storage:** Delivery proof files are uploaded to IPFS via Pinata, and only the content hash is written on-chain. This keeps the blockchain lightweight while still making the proof immutable — the hash verifies the file's integrity.

---

## 4. User roles (6 roles)

| Role | What they do |
|---|---|
| **Admin** | Creates and verifies disaster campaigns; verifies beneficiaries and NGOs both in the database and on-chain; approves disbursements (multi-sig); can confirm delivery on any disbursement |
| **Donor** | Donates ETH to verified campaigns via MetaMask; downloads a PDF receipt for every donation (live or historical) |
| **NGO** | Creates campaigns (which go to the admin verification queue); requests disbursements for verified beneficiaries; confirms delivery on campaigns they coordinate |
| **Government** | Creates campaigns; requests disbursements — oversight and coordinated-relief role |
| **Beneficiary** | Withdraws allocated funds to their personal wallet; uploads IPFS proof for *their own* disbursements only (enforced at the API layer) |
| **Agency** | Aid agency role for managing relief operations |

---

## 5. Core workflows

### 5.1 Campaign creation — 3 layers of authenticity

No creator (admin, NGO, or government) can self-publish a live campaign. Every campaign passes through three gates:

**Layer 1 — Creator form enforcement**
A live **Authenticity Score (0–100%)** updates as the creator types. Description must be ≥ 50 characters (enforced), GPS coordinates worth +25%, at least one news/government/NGO source URL worth another +25%. Form visibly warns if score is Weak / Moderate / Strong.

**Layer 2 — Backend auto-checks**
On submission, the backend re-runs the 4 checks and stores the score, runs **duplicate detection** (regex-matched first-3-title-words within the last 30 days), and forces the campaign into `status: "pending"`, `verificationStatus: "unverified"` — regardless of what the client sent.

**Layer 3 — Admin approval**
Admin opens the Campaign Verification tab in `/admin`, reviews full description, clickable source URLs, GPS, score chips, and duplicate warnings. Explicitly clicks **Verify** (campaign becomes active) or **Reject** (reason required). Only verified campaigns appear to donors, and the donate form on the detail page is hidden for anything unverified.

### 5.2 Donation flow

1. Donor connects MetaMask to the app
2. Enters amount in ETH on a verified campaign's page
3. MetaMask prompts; donor signs and broadcasts the transaction directly — the smart contract's `donate(disasterId)` function receives the ETH and records it on-chain
4. Backend logs the transaction hash in MongoDB (for fast indexing; chain is the source of truth)
5. A green "Donation confirmed" card appears with a **Download Receipt** button
6. Receipt is built client-side (html2canvas → jsPDF) and contains donor name, email, wallet, campaign details, amount, transaction hash, block number, and ISO timestamp — making it independently verifiable against the chain
7. Every past donation in the Transaction History table also gets a **Download** button for re-downloadable receipts

### 5.3 Disbursement flow (multi-signature)

1. An admin, NGO, or government user fills the **Request Disbursement** form on a campaign page, picking a verified beneficiary from a dropdown and entering an amount
2. Backend calls the contract's `requestDisbursement()`. Contract checks: caller is a verified NGO/admin, recipient is a verified beneficiary, contract balance is sufficient. On success it creates a pending request record on-chain
3. An admin opens `/admin` → **Multi-Sig Approvals** tab, sees the pending request, clicks **Approve**. Contract executes `approveDisbursement()`, marks the request executed, and allocates ETH to the beneficiary's contract-internal balance
4. Beneficiary logs in, connects MetaMask using their beneficiary wallet, clicks **Withdraw** on the disaster page. Contract's `withdraw()` transfers the allocated ETH to their personal wallet (24-hour cooldown enforced on-chain)
5. Beneficiary (or NGO, or admin) uploads a delivery-proof file (photo, receipt, PDF) — file is pinned to IPFS via Pinata, and the content hash is stored on-chain via `confirmDelivery()`
6. `/admin` → **Multi-Sig Approvals** tab now shows the disbursement as Confirmed with a clickable link to view the proof on IPFS

### 5.4 User verification (DB + on-chain sync)

When an admin clicks **Verify** on a user in `/admin → Users`, the backend does two things in one call:
- Sets `isVerified: true` in MongoDB
- If the user has a wallet address and is a beneficiary → calls `verifyBeneficiary(wallet)` on the contract, adding them to the on-chain whitelist. If NGO → `verifyNGO(wallet)`
- A second button, **Sync chain**, is shown for already-verified users so admins can re-run the chain call idempotently if the chain state was ever lost (e.g., Hardhat node restart)

This keeps the off-chain and on-chain authorization lists in sync. Without it, a beneficiary verified only in MongoDB would see their disbursement requests rejected by the contract with "Recipient not verified".

---

## 6. Cryptographic primitives used

| Algorithm | Where it's used |
|---|---|
| **AES-256-CBC** | Encrypting `phone` and `location` fields in MongoDB before storage |
| **bcrypt** | Hashing user passwords (cost factor 10) |
| **HMAC-SHA256** | Signing JWT authentication tokens (7-day expiry) |
| **ECDSA (secp256k1)** | All blockchain transaction signing, done by MetaMask on the user's device |
| **Keccak-256** | Ethereum address derivation and transaction hashing (built into the chain) |
| **IPFS CID (SHA-256)** | Content-addressing delivery proof files — the CID is what gets stored on-chain |

---

## 7. Strong password policy

Registration enforces: **8+ characters**, at least **one uppercase**, **one lowercase**, **one digit**, and **one special character**. The Register page shows a live strength meter (Weak / Moderate / Strong) with a per-rule checklist. The submit button is disabled until all five rules pass. The backend independently validates, so a tampered client can't bypass it.

---

## 8. Smart contract — `DisasterFund.sol` (key functions)

| Function | Purpose | Access control |
|---|---|---|
| `donate(disasterId) payable` | Accept ETH donations tagged with a campaign ID | Any address (when contract is not paused) |
| `requestDisbursement(recipient, amount, disasterId)` | Create a pending fund-release request | `onlyVerifiedNGO` (covers admin + verified NGO) |
| `approveDisbursement(requestId)` | Approve and — when quorum reached — execute the request | `onlyAdmin` |
| `withdraw()` | Beneficiary claims allocated funds to their wallet | Must be a verified beneficiary, 24h cooldown |
| `confirmDelivery(index, ipfsHash)` | Store IPFS proof hash for an executed disbursement | `onlyAdmin` (backend proxies NGO/beneficiary calls, so it still passes) |
| `verifyBeneficiary(address)` | Whitelist an address as a valid recipient | `onlyAdmin` |
| `verifyNGO(address)` | Whitelist an address as an authorized requester | `onlyAdmin` |

The contract also supports pausing (`setPaused`) for emergency freeze, tracks donation and disbursement history as append-only arrays, and emits events for every material state change so external indexers can observe the state.

---

## 9. Why it's different from existing solutions

1. **Two-key fraud prevention** — The creator of a campaign cannot approve it. An admin different from the creator must review and approve before donations open. Combined with the duplicate-detection auto-check and the authenticity score, fake campaigns are filtered out before they can accept a single ETH.
2. **Distributed proof of delivery** — Field workers (beneficiaries and NGOs) can upload proof themselves, so admins aren't forced to become a middleman and the chain of custody stays with the people actually handling aid.
3. **Independently verifiable receipts** — Every donor gets a PDF that carries the transaction hash. Anyone with Etherscan access can verify the donation happened, without trusting SecureAidChain's backend.
4. **On-chain + off-chain in sync** — Unlike typical hybrid dApps where DB and chain drift apart, every admin action that changes authorization state updates both at once, with a manual **Sync chain** escape hatch for recovery.
5. **Cost-efficient immutability** — Only hashes and numeric values live on the blockchain; large files (proof documents) live on IPFS; sensitive data (phone, location) lives encrypted in MongoDB. Each store is used for what it's best at.

---

## 10. Constraints and limitations (worth disclosing in a report)

- The current demo runs against a **local Hardhat node** — all test ETH, all test addresses. Deploying to a testnet (Sepolia) or mainnet would require gas budget planning and real KYC for the admin role.
- **Multi-signature quorum** is set at deploy time to a fixed number. There's currently no process for adding or removing admins without a full redeployment.
- The **20-second human review** that Layer 3 relies on is non-technical — an inattentive admin remains the weakest link. This is by design: the system cannot algorithmically decide whether a disaster is real.
- **Pinata JWT** is a centralized gateway to IPFS. For a production deployment, either run your own IPFS node or use a redundancy service.
- The contract has a **24-hour withdrawal cooldown** per beneficiary wallet — intended to rate-limit drain attacks if a beneficiary key is compromised, but legitimate rapid relief scenarios may hit this wall.

---

## 11. Stats for the report

- **Roles:** 6 (Admin, Donor, NGO, Government, Beneficiary, Agency)
- **Verification layers per campaign:** 3 (form, backend auto-checks, admin approval)
- **Auto-checks per campaign:** 4 (GPS, description length, sources, evidence)
- **Cryptographic algorithms in use:** 6 (AES-256-CBC, bcrypt, HMAC-SHA256, ECDSA, Keccak-256, SHA-256 via IPFS CID)
- **Password rules enforced:** 5 (length, upper, lower, digit, special)
- **Test blockchain:** Ethereum via Hardhat local node (Chain ID 31337)

---

*This summary is sufficient for a chatbot to generate a report, presentation, or academic writeup without seeing the source code. Edit or extend any section before passing it along.*
