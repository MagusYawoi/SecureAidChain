# Guide — Pulling the `changes` branch

Hi Aan — this guide walks you through (1) what's different in the new `changes` branch, and (2) exactly how to pull it into your local SecureAidChain folder and run it.

All terminal commands below are run from **inside your SecureAidChain folder**. Open your terminal and `cd` into it first if you aren't already there.

---

## Part 1 — What changed in the `changes` branch

Short version: campaigns now go through an authenticity check and an admin approval before donations can happen, passwords must be strong, NGOs and Government users can also create campaigns, the create-campaign and admin pages were restyled to match the rest of the site, and donors can now download a PDF receipt after donating.

### 1.1 Campaign verification — 3 layers

Campaigns no longer go live the moment they're created. They pass through three independent checks:

**Layer 1 — Form enforcement (creator-side)**
The New Campaign form now requires:
- Description of at least 50 characters (live counter turns green when you cross 50)
- Latitude + Longitude (GPS) for the disaster location
- At least one Source URL (news article, government notice, NGO report)

A live **Authenticity Score (0–100%)** updates as you type. Each filled requirement is worth 25% — form shows Weak / Moderate / Strong.

**Layer 2 — Backend auto-checks**
On submission the server automatically:
- Re-runs the 4 checks (GPS, description length, sources, evidence) and stores the score
- Runs **duplicate detection** — searches for campaigns with overlapping titles created in the last 30 days. If it finds one, the new campaign gets flagged `isDuplicate: true` with a pointer to the possible duplicate
- Forces the new campaign into `status: "pending"`, `verificationStatus: "unverified"` — no one can donate yet

**Layer 3 — Admin approval**
`/admin` now has a new tab: **Campaign Verification**. It lists all unverified campaigns with:
- Full description, clickable source URLs, GPS coordinates, creator name
- Auto-check chips (✓ / ○) with overall score
- A ⚠ "Possible duplicate" badge if flagged
- A note input + **Verify** and **Reject** buttons (rejection requires a reason)

Only after an admin clicks **Verify** does a campaign become `verified` + `active` and appear in the public campaigns list. Donors never see unverified or rejected campaigns.

### 1.2 Strong-password policy

The Register page now requires:
- 8+ characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

A live strength meter (Weak / Moderate / Strong) shows which rules have passed. The Create Account button is disabled until all 5 pass. The backend also enforces this — a weak password returns a 400 with the list of missing requirements.

### 1.3 NGO and Government roles can create campaigns

Previously only Admin and NGO could create campaigns. Now **Government** users can too. All creator roles go through the same admin verification — no one self-publishes.

### 1.4 UI theming

- The **New Campaign** form and the **Admin** page were rewritten to match the dark theme used on the rest of the site (grid background, ambient orbs, `.card-glow` cards, cyan accent, `Syne` / `DM Mono` fonts)
- The **Register** page had a light-text bug where input text was nearly invisible — inputs now force dark text against the white card

### 1.5 Donation receipts (PDF)

After a donor donates successfully, a green **✓ Donation confirmed** card appears with a **Download Receipt** button. The Transaction History table at the bottom of the campaign page also has a **Download** button on every donation row, so donors can re-download receipts for any past donation.

The receipt is built fully client-side (`jspdf` + `html2canvas` — new frontend deps). It contains:
- Donor name, email, wallet address
- Campaign title, location, disaster ID
- Amount donated in ETH (displayed prominently)
- Blockchain proof: transaction hash, block number, network
- ISO timestamp

Filename format: `SecureAidChain-receipt-<txhash-short>.pdf`.

### 1.6 Smaller bug fixes / polish

- Duplicate-detection regex is now character-escaped, so titles with `(`, `.`, `+`, etc. no longer crash the POST
- The per-campaign verification note in the admin tab is kept per card (so typing in one card doesn't bleed into others)
- Donor-facing disaster list now filters to `verificationStatus: verified` only
- Donate form on the detail page is hidden for unverified/rejected campaigns — replaced with an amber "Pending verification" / "Campaign rejected" banner

### 1.7 Files touched

Backend: `models/Disaster.js`, `routes/disasters.js`, `routes/auth.js`
Frontend: `App.jsx`, `services/api.js`, `pages/Register.jsx`, `pages/Disasters.jsx`, `pages/DisasterDetail.jsx`, `pages/NewDisaster.jsx`, `pages/Admin.jsx`
New: `frontend/src/utils/receipt.js`
Docs: `README.md`, this `GUIDE.md`

### 1.8 Schema additions on `Disaster`

- `verificationStatus: "unverified" | "pending_review" | "verified" | "rejected"`
- `verifiedBy`, `verifiedAt`, `verifyNote`
- `rejectedAt`, `rejectReason`
- `sourceUrls[]`, `evidenceHashes[]`
- `isDuplicate`, `duplicateOf`
- `autoChecks: { hasGPS, hasEvidence, hasSources, hasDescription, checkScore }`

### 1.9 New API endpoint

`PATCH /api/disasters/:id/verify` — admin-only
Body: `{ action: "verify" | "reject", note: string }`

---

## Part 2 — Save your current work first

Before pulling, make sure nothing you've done gets lost.

```
git status
```

**If the output says "nothing to commit, working tree clean":**
Skip to Part 3.

**If the output lists any `modified:` or `Untracked files:`:**
You have uncommitted work. Pick one:

**Option 1 — you want to keep your local edits** (e.g. you've been working on your own feature):
```
git add .
git commit -m "WIP: saving my local work"
git push origin aan
```
This saves your work to your `aan` branch on GitHub.

**Option 2 — you don't need those edits** (just test scratches):
```
git stash
```
This hides them. You can bring them back later with `git stash pop` if you change your mind.

---

## Part 3 — Pull the `changes` branch

```
git fetch origin
```
Downloads info about new branches on GitHub (including `changes`) without touching your files.

```
git checkout changes
```
Switches your working folder to the new branch. Git auto-creates a local `changes` branch tracking the remote one, and your files update.

Confirm with:
```
git branch --show-current
```
Should print `changes`.

For future updates to this branch, just run:
```
git pull
```

---

## Part 4 — Install the new frontend dependencies

The branch added two new libraries (`jspdf` and `html2canvas` for PDF receipts). You **must** install them before running the frontend:

```
cd frontend
npm install
cd ..
```

`npm install` reads `package.json` and installs any missing packages. You do **not** need to reinstall backend or blockchain unless you see errors.

---

## Part 5 — Restart the services

Because backend code + schema changed, restart it. Same for frontend.

| Terminal | Action |
|---|---|
| 1. Hardhat node | Leave running if already up. If not: `cd blockchain && npx hardhat node` |
| 2. Deploy contract | Only needed if the Hardhat node was just restarted: `cd blockchain && npx hardhat run scripts/deploy.js --network localhost` |
| 3. Backend | `Ctrl+C` to stop → `cd backend && npm run dev` |
| 4. Frontend | `Ctrl+C` to stop → `cd frontend && npm run dev` |

Then open http://localhost:5173 in a fresh browser tab (`Ctrl+Shift+R` for a hard refresh — clears any cached styles).

---

## Part 6 — Things you'll notice

### 6.1 Your old test campaigns disappeared
**Why:** The public list now filters to `verificationStatus: "verified"`. Campaigns created before this change don't have that field, so they're hidden.

**Cleanest fix — wipe the collection:**
```
mongosh secureaidschain --eval "db.disasters.deleteMany({})"
```
Then create fresh test campaigns using the new flow.

### 6.2 Your admin account still works
`admin@secureaidchain.com / Admin@1234` still logs in. Password validation only runs at *registration* — existing accounts are untouched.

### 6.3 New user registrations need strong passwords
`password` won't work anymore. `Admin@1234` does. The meter on the form will tell you exactly what's missing.

### 6.4 `.env` file
Your existing `backend/.env` keeps working — no new environment variables.

### 6.5 MetaMask
Unchanged. Same Hardhat Local network, same test accounts.

---

## Part 7 — Quick sanity test (7 steps)

1. Log in as admin
2. Go to `/admin` → there should be a new **"Campaign Verification"** tab
3. Register a new user with role **NGO** (test the password meter while doing it)
4. Log in as the NGO → click **+ New Campaign** on the disasters page — the form has a new **Authenticity Score** card at the top
5. Create a test campaign, log back in as admin, verify it from the Campaign Verification tab
6. Log in as a donor, donate to that campaign
7. You should see the **green ✓ Donation confirmed → Download Receipt** card appear under the donate form. Click it — a PDF downloads.

If all 7 pass, you're fully synced.

---

## Part 8 — Troubleshooting

| Error / situation | Cause | Fix |
|---|---|---|
| `error: Your local changes would be overwritten by checkout` | You have uncommitted changes | Go back to Part 2 and pick Option 1 or 2 |
| `pathspec 'changes' did not match any file(s)` | You didn't run `git fetch origin` first, or name is mistyped | Run `git fetch origin`, then retry |
| Frontend throws "Cannot find module 'jspdf'" | Skipped Part 4 | Run `npm install` inside `frontend/` |
| Backend throws Mongoose schema errors | Didn't restart it | `Ctrl+C` in backend terminal, then `npm run dev` again |
| MetaMask "transaction failed" / nonce errors | Hardhat node was restarted so state reset, but MetaMask still has stale info | MetaMask → Settings → Advanced → **Clear activity tab data** |
| "Not authorized" on `/admin` | You're logged in as a non-admin user | Log out and log in as admin |
| PDF download button does nothing | Browser popup blocker on first click | Allow popups / downloads for localhost, try again |

---

## Part 9 — Going back to your own branch

When you want to return to your own work:

```
git checkout aan
```

To pull any new updates on `aan`:
```
git pull
```

To see which branch you're on at any time:
```
git branch --show-current
```

---

If anything above fails, copy the exact error text and send it over — that's the fastest way to get unstuck.
