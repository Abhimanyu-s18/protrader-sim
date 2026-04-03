# ProTraderSim

## PTS-SOP-001 — Compliance & KYC Operations Standard

**Version 1.0 | March 2026 | CONFIDENTIAL**
_Trader Registration, Onboarding, and KYC Review Standard Operating Procedure_

---

## 1. Regulatory Context

ProTraderSim operates under dual regulatory licences:

- **FSC Mauritius** — Financial Services Commission, Mauritius
- **FSA Seychelles** — Financial Services Authority, Seychelles

This SOP governs all processes related to trader registration, identity verification, anti-money laundering screening, and account lifecycle management. All staff involved in KYC review must read and follow this SOP. Deviation from this procedure requires documented CTO and Legal Counsel (Krishantha) approval.

---

## 2. Pool Code Requirement (IB Acquisition Model)

ProTraderSim operates exclusively under an Introducing Broker (IB) model. Every trader must be referred by an active Introducing Broker.

**Rule:** Every new trader registration MUST include a valid Pool Code. The Pool Code maps to an active `staff` record (IB Agent or Team Leader). Registrations without a valid Pool Code are rejected at the API level.

**Registration URL pattern:** `auth.protrader.com/register?ref={pool_code}`

**System behavior on Pool Code validation:**

- Pool Code is validated server-side against `staff.pool_code`
- If valid: `users.agent_id` is set to the staff record's ID at registration
- If invalid or missing: registration returns error `INVALID_POOL_CODE`
- Pool Codes are managed by Super Admin and are non-transferable

---

## 3. Restricted Jurisdictions

Registrations from the following jurisdictions are automatically blocked at the API level:

- OFAC-sanctioned countries (current OFAC list maintained in platform config)
- Countries on UN sanctions list
- Countries on EU sanctions list
- Countries on FSC Mauritius / FSA Seychelles watchlists

This list is maintained by Legal Counsel (Krishantha) and updated in platform configuration. **IP-based jurisdiction blocking is insufficient**. The platform implements multi-layered controls:

1. **Primary Control:** Validate government ID issuing country against declared country of residence
2. **Cross-Check:** Verify payment method country matches declared country
3. **Consistency Check:** Ensure phone number country code aligns with declared country
4. **Manual Review:** Flag mismatches between IP/declared country/document-issuing country for staff review
5. **Security Detection:** Implement device fingerprinting, VPN/proxy detection to prevent circumvention
6. **Audit Logging:** Log all jurisdiction validation attempts for compliance review

Blocking is applied through server-side validation of multiple data points, not just IP geolocation.

---

## 4. Registration Requirements

**Mandatory registration fields:**

- Full legal name (as it appears on government ID)
- Email address (verified via confirmation link)
- Phone number (with country code)
- Country of residence
- Pool Code (IB referral code)
- Password (min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
- Terms & Conditions acceptance (checkbox, logged with version + timestamp)
- Risk Disclosure acceptance (checkbox, logged with timestamp)

**Recommended security enhancements:**

- Password breach checking (e.g., Have I Been Pwned API integration)
- Passwordless authentication options (WebAuthn/passkeys)

_Note: Multi-Factor Authentication (MFA) is not required at registration but is enforced before first withdrawal. See Section 5 (Security Requirements) for MFA policy._

**Auto-generated at registration:**

- Account Number: `PT` + zero-padded 8-digit sequence (e.g. PT00000001)
- Lead ID: `LEAD` + zero-padded 10-digit sequence (e.g. LEAD0000000001)
- kyc_status: `NOT_STARTED`
- kyc_level: `1` (Email Verified)

---

## 5. Security Requirements

### Multi-Factor Authentication (MFA) Policy

**Enforcement Timing:**

- MFA enrollment is **mandatory before the first withdrawal attempt**
- All traders (new and existing) must enable MFA before processing any withdrawal after [EFFECTIVE_DATE]
- If MFA is not completed, the withdrawal is paused with a prompt to complete MFA setup
- Grace period: Existing traders with accounts created before [CUTOFF_DATE] have until [GRACE_PERIOD_END] to enable MFA

**UX Flow:**

1. Trader initiates withdrawal request
2. System checks if `users.mfa_enabled` = true
3. If false: display modal "Enable Multi-Factor Authentication" with setup wizard
4. Once MFA setup is complete, withdrawal processing resumes
5. Thereafter, all sensitive operations (withdrawal, bulk settings change) require MFA verification

**Accepted MFA Methods:**

- **Time-based One-Time Password (TOTP)**: Authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
- **SMS**: One-time code sent to registered phone number (fallback method)
- **WebAuthn/FIDO2**: Hardware security keys or platform authenticators (recommended for high-balance accounts)

**Method Preferences & Compliance:**

- TOTP is the preferred method (stored locally, no secondary communication required)
- SMS is available as a fallback but requires phone number verification
- WebAuthn is strongly recommended for accounts managing balances > $25,000
- Traders may configure multiple MFA methods (primary + backup)
- Before first withdrawal, at least one MFA method must be fully activated and tested

> **Rationale for $25,000 WebAuthn Threshold:** This threshold aligns with institutional security benchmarks for "high-value accounts" under FSC Mauritius and FSA Seychelles cybersecurity guidelines. The $25,000 cutoff reflects: (1) the point at which account takeover losses exceed typical fraud insurance deductibles; (2) NIST 800-63B Authenticator Assurance Level 3 (AAL3) recommendations for high-risk transactions; and (3) threat model analysis showing phishing-resistant MFA becomes cost-effective when account balances exceed this threshold. This value is configurable via the `MFA_WEBAUTHN_THRESHOLD_CENTS` environment variable (default: 2500000 cents = $25,000) — see Environment Configuration Policy (PTS-ENV-001).

---

## 6. KYC Tiering

---

ProTraderSim uses a three-level progressive verification framework.

| Level | Label             | Requirements                                     | Verification Method                         | Account Capabilities                                                                           |
| ----- | ----------------- | ------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| L1    | Email Verified    | Email address confirmed via verification link    | Automatic (system)                          | Account created. No trading. No deposit. KYC wizard presented.                                 |
| L2    | Identity Verified | Government-issued photo ID (front + back)        | IB Agent preliminary review — 24-hour SLA   | Trading enabled. Deposits via NowPayments unlocked. Withdrawal restricted to deposited amount. |
| L3    | Fully Verified    | L2 documents + proof of address + selfie capture | IB Team Leader final approval — 48-hour SLA | All features unlocked. Withdrawal unrestricted. Bonus eligibility active.                      |

**No trading is permitted before kyc_level reaches L2 (kyc_status = 'APPROVED').**
This is an absolute product policy enforced at the API level via `requireKYC` middleware.

---

## 6. Required KYC Documents

### 6.1 Identity Documents (L2 — Mandatory)

| Type             | Requirements                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Passport         | Full name, date of birth, nationality, passport number, expiry date, photo, all four corners visible |
| National ID Card | Full name, DOB, ID number, expiry (front + back). All corners visible.                               |
| Driving Licence  | Full name, DOB, licence number, expiry. All corners visible.                                         |
| Other            | As specified by compliance team in the kyc_documents review notes                                    |

### 6.2 Address Documents (L3 — Required for Full Verification)

| Type                     | Requirements                                                  |
| ------------------------ | ------------------------------------------------------------- |
| Utility Bill             | Full name, current residential address, dated within 3 months |
| Bank Statement           | Full name, current residential address, dated within 3 months |
| Credit Card Statement    | Full name, address, dated within 3 months                     |
| Local Authority Tax Bill | Full name, address, dated within 12 months                    |
| Other                    | As specified by compliance team                               |

#### 6.2.1 Trading Profit Documentation (L3 — Required for Profit Withdrawals)

L2 traders may withdraw only their original deposited amount. To withdraw trading profits (equity exceeding total deposits), traders must provide documented proof of trading activity. This is a **separate verification step** from the standard L3 address verification and is triggered when an L2 trader requests a withdrawal amount exceeding their cumulative deposits.

**Acceptable Profit Documentation Artifacts:**

| Artifact                 | Description                                                   | Required Elements                                                                                   |
| ------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Trade History Export     | Complete transaction log from the ProTraderSim platform       | All closed trades with timestamps, instrument, direction, lot size, open/close prices, realized P&L |
| Account Statement        | Official platform statement showing trading activity          | Date range, opening/closing balance, all transactions, fees, net P&L                                |
| P&L Report               | Profit and Loss summary from the trading platform             | Realized P&L, unrealized P&L (if applicable), date range, account ID                                |
| Third-Party Verification | Broker statement from linked external account (if applicable) | Official letterhead, account holder name matching KYC, trade confirmations                          |

**Required Metadata for All Submissions:**

- **Timestamp**: ISO 8601 format (UTC) of document generation
- **Transaction IDs**: Unique identifiers for each trade (platform-generated)
- **Date Range**: Clear start and end dates covering the profit period
- **Account Identifier**: Internal ProTraderSim account ID

**Review Authority:**

- **Primary Reviewer:** IB Team Leader or designated KYC Review Officer
- **Escalation:** Legal Counsel (Krishantha) for amounts >$50,000 or suspicious patterns
- **SLA:** 48 hours from submission to approval/rejection

**Submission Process:**

1. L2 trader submits withdrawal request exceeding deposit amount
2. System flags request as "Profit Withdrawal — Documentation Required"
3. Trader uploads profit documentation via KYC portal (separate from address docs)
4. IB Team Leader reviews against acceptance checklist
5. Upon approval, withdrawal proceeds; rejection triggers resubmission request

**Technical Requirements:**

| Requirement              | Rule                                                          |
| ------------------------ | ------------------------------------------------------------- |
| Accepted formats         | PDF (preferred), CSV (for trade history exports)              |
| Maximum file size        | 10 MB per file                                                |
| Minimum retention period | 7 years from withdrawal date (regulatory requirement)         |
| Storage                  | Cloudflare R2 private bucket under `/kyc/profit-docs/` prefix |
| Access control           | Presigned URLs with 15-minute expiry; audit log of all views  |

**Reviewer Acceptance Checklist:**

Before approving profit documentation, the reviewer must verify:

- [ ] **Identity Match:** Document shows account holder name matching approved L2 identity
- [ ] **Source Verification:** All trades originated from ProTraderSim platform (verify transaction IDs in database)
- [ ] **Profit Calculation:** Stated profit amount matches system-calculated realized P&L for the period
- [ ] **Date Validity:** Trade dates fall within the trader's active L2 period (no pre-L2 trades counted)
- [ ] **No Anomalies:** No evidence of wash trading, market manipulation, or account takeovers
- [ ] **Document Integrity:** No signs of tampering, editing, or fabrication (checksum verification)
- [ ] **Completeness:** All pages present; no missing transactions in the reported period

**Rejection Reasons (Document in Review Notes):**

- Incomplete trade history (missing transactions)
- Mismatched profit calculations
- Identity discrepancy
- Suspected document manipulation
- Trades from inactive/suspended periods included

> **Note:** Profit documentation is **not** required as part of the initial L3 application (address verification). It is only required when an L2 trader attempts to withdraw profits. Once reviewed and approved, the profit withdrawal is processed and documentation is retained per the retention policy.

### 6.3 Miscellaneous Documents (Optional / Compliance-Requested)

Tax residency certificate, company registration, source of funds documentation, court orders, enhanced due diligence material. These are requested by the compliance team on a case-by-case basis.

### 6.4 File Technical Rules

| Requirement              | Rule                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| Accepted formats         | PDF, JPEG, PNG                                                    |
| Maximum file size        | 10 MB per file                                                    |
| Minimum image resolution | 800 × 600 pixels                                                  |
| MIME type validation     | Verified from file bytes server-side (not extension)              |
| Storage                  | Cloudflare R2 private bucket — never publicly accessible          |
| Access method            | Presigned URLs with 15-minute expiry, generated per admin request |

---

## 7. AML / PEP Screening

### 7.1 Automated Screening

PEP (Politically Exposed Person) and sanctions checks are triggered automatically:

- At trader registration (name + nationality check)
- At each KYC document submission

If a match is found against OFAC, UN, EU, or FSC/FSA sanctions lists:

- Account is immediately suspended
- Legal Counsel (Krishantha) is notified immediately
- Do NOT inform the trader of the match
- File a Suspicious Activity Report (SAR) within 24 hours

### 7.2 Behavioural AML Trigger Patterns

The following patterns must be escalated to Krishantha (Legal Counsel) and logged in the audit trail. BullMQ jobs monitor patterns 1, 2, and 3 nightly. Pattern 4 is a manual review item. Pattern 5 fires at registration and document submission.

| #   | Trigger Pattern                          | Threshold / Signal                                                                          | Required Action                                                                  |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Rapid deposit/withdrawal cycle           | >90% of deposited amount withdrawn within 24 hours of credit, with minimal trading activity | Freeze withdrawal. Escalate to Legal. Request source-of-funds documentation.     |
| 2   | Large deposit — unknown source           | Single deposit > 5× the trader's declared monthly income                                    | Request source-of-funds declaration before crediting account.                    |
| 3   | Multiple accounts — same IP or device    | 2+ accounts from identical IP address within 30 days                                        | Flag all accounts. Admin review. Suspend if same beneficial owner confirmed.     |
| 4   | Trading pattern vs risk profile mismatch | High-frequency, high-leverage trading on account declaring "Beginner / Low Risk"            | Risk questionnaire re-review. Notify trader. May trigger enhanced due diligence. |
| 5   | Sanctions list match (name/country)      | Automated AML/PEP API match or manual identification                                        | Immediate account suspension. Notify Legal. Do not inform trader. File SAR.      |

---

## 8. KYC Review Workflow

### 8.1 Step-by-Step: L2 Review (IB Agent — 24-Hour SLA)

1. Admin panel shows new KYC submission notification
2. Agent opens KYC queue at admin.protrader.com → KYC Review
3. Clicks on submission → views trader profile, uploaded documents
4. For each document: clicks "View" → system generates R2 presigned URL (15-min expiry) → opens in new tab
5. Reviews each document for:
   - Authenticity (no obvious editing or tampering)
   - Legibility (all text readable, all corners visible)
   - Name match (matches registration full_name exactly)
   - Expiry (document is not expired)
6. **If approved:** PUT /v1/admin/kyc/:doc_id `{status: 'APPROVED'}` for each mandatory document
7. When both mandatory documents (identity per L2) approved:
   - System automatically updates: `users.kyc_status = 'APPROVED'`, `users.kyc_level = 2`
   - BullMQ queues KYC approval email (kyc-approved.tsx template)
   - If trader is online: Socket.io emits `account:kyc_approved` to user room
8. **If rejected:** Include rejection_code (from standard codes list) + rejection_reason text
   - System updates: `users.kyc_status = 'REJECTED'` or `'REQUIRES_RESUBMIT'`
   - Email sent with specific reason + re-upload instructions
9. **If additional info needed:** Set status = 'ADDITIONAL_REQUIRED'. Trader notified to upload specific additional doc.

### 8.2 Step-by-Step: L3 Review (IB Team Leader — 48-Hour SLA)

1. L2 review completed by Agent
2. Team Leader receives notification of pending L3 review
3. Team Leader opens KYC queue → filters by `kyc_level = 2, kyc_status = 'APPROVED'`
4. Reviews address document + selfie (if provided) + full trader profile
5. Confirms all L3 requirements are met
6. **If approved:** Approve address document + any additional L3 docs
   - System updates: `users.kyc_level = 3`
   - Email: "Your account is now fully verified"
   - All platform features unlocked
7. **If rejected:** Same rejection flow as L2 review

### 8.3 Escalation to Compliance

| Situation                      | Escalate to                                     | Timeframe         | Method                     |
| ------------------------------ | ----------------------------------------------- | ----------------- | -------------------------- |
| Suspected document forgery     | Krishantha (Legal) + George (Executive Sponsor) | Immediately       | Direct call + written memo |
| Sanctions list match (PEP/AML) | Krishantha (Legal)                              | Immediately       | Encrypted email + call     |
| High-value deposit >$10,000    | Admin team + Krishantha                         | Same business day | Admin panel flag + email   |
| Behavioural AML trigger (any)  | Krishantha (Legal)                              | Within 4 hours    | Written escalation report  |
| Account suspension dispute     | Krishantha + Victor (Operations)                | Within 24 hours   | Email                      |

---

## 9. KYC Rejection Reason Codes

| Code               | Condition                                                                                                         | Trader-Facing Message                                                                                                                                                    | Outcome                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| DOC_QUALITY_POOR   | Blurry or illegible scan                                                                                          | "Your document image is not sufficiently clear. Please re-upload a high-resolution, well-lit photo."                                                                     | kyc_status → REQUIRES_RESUBMIT                |
| DOC_EXPIRED        | Identity document has expired                                                                                     | "The identity document you submitted has expired. Please provide a currently valid document."                                                                            | kyc_status → REJECTED                         |
| NAME_MISMATCH      | Name on document does not match registration                                                                      | "The name on your submitted document does not match your registered name. Please check and resubmit."                                                                    | kyc_status → REJECTED                         |
| ADDRESS_MISMATCH   | Address document does not match profile                                                                           | "The address on your document does not match your registered address. Please update your profile or submit a matching document."                                         | kyc_status → REQUIRES_RESUBMIT                |
| `DOC_OUTDATED`     | Address document is older than the accepted timeframe (3 months, or up to 12 months for Local Authority Tax Bill) | "Your address document is dated more than the accepted timeframe. Please submit a document issued within the last 3 months (or 12 months for Local Authority Tax Bill)." | kyc_status → REQUIRES_RESUBMIT                |
| PARTIAL_VISIBILITY | Document edges or corners not fully visible                                                                       | "Your document image does not show all four corners. Please re-photograph in a clear area with all corners visible."                                                     | kyc_status → REQUIRES_RESUBMIT                |
| UNSUPPORTED_TYPE   | Document type not accepted                                                                                        | "The document type you submitted is not accepted for this verification step. Please refer to the accepted document list and resubmit."                                   | kyc_status → REQUIRES_RESUBMIT                |
| PEP_MATCH          | Name/nationality matches PEP/sanctions list                                                                       | Account suspended. Do NOT communicate this code to the trader.                                                                                                           | Immediate suspension. Notify Legal. File SAR. |

---

## 10. KYC Status State Machine

```
NOT_STARTED
    |
    | (trader uploads identity + address docs)
    v
PENDING
    |
    |---- Agent review -----> APPROVED (kyc_level = 2)
    |                              |
    |                              | (Team Leader review)
    |                              v
    |                         kyc_level = 3 (fully verified)
    |
    |---- Agent rejects -----> REJECTED
    |                              |
    |                              | (trader re-submits)
    |                              v
    |                          PENDING
    |
    |---- Agent requests more -> ADDITIONAL_REQUIRED
    |                              |
    |                              | (trader uploads)
    |                              v
    |                          PENDING
    |
    |---- Agent requires resubmit -> REQUIRES_RESUBMIT
                                       |
                                       | (trader resubmits)
                                       v
                                   PENDING
```

---

## 11. Account Status Lifecycle

| Status    | Meaning                    | Trade Access       | Deposit Access     | Withdrawal Access                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------- | ------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ACTIVE    | Normal trading account     | L2/L3: Yes; L1: No | L2/L3: Yes; L1: No | **L2:** Limited to original deposited amount; documented trading profits require L3 verification. _Example: $1,000 deposited, now has $5,000 equity ($3,000 unrealized P&L), may withdraw max $1,000 as L2._ [L2 withdrawal verification required] **L3:** Unrestricted                                  |
| INACTIVE  | No activity for 90+ days   | L2/L3: Yes; L1: No | L2/L3: Yes; L1: No | **L2:** Limited to original deposited amount; documented trading profits require L3 verification. _Example: $1,000 deposited, now has $5,000 equity ($3,000 unrealized P&L), may withdraw max $1,000 as L2._ [L2 withdrawal verification required] **L3:** Unrestricted (inactivity fee charged monthly) |
| SUSPENDED | Admin-initiated freeze     | No                 | No                 | No                                                                                                                                                                                                                                                                                                       |
| CLOSED    | Account permanently closed | No                 | No                 | No (final balance settled)                                                                                                                                                                                                                                                                               |

> **Note:** Access is tiered based on KYC Level (L1, L2, L3) as defined in Section 6. L1 has no trading or deposit access. L2 enables trading and deposits with withdrawal restrictions (original deposited amount only). L3 enables all features including unrestricted withdrawals.

---

## 12. Document Retention Policy

| Document Type                         | Retention Period                     | Storage Location                    |
| ------------------------------------- | ------------------------------------ | ----------------------------------- |
| KYC identity documents                | Minimum 5 years from account closure | Cloudflare R2 (private bucket)      |
| KYC address documents                 | Minimum 5 years from account closure | Cloudflare R2 (private bucket)      |
| Trading profit documentation          | Minimum 7 years from withdrawal date | Cloudflare R2 (`/kyc/profit-docs/`) |
| KYC review audit logs                 | Minimum 7 years                      | PostgreSQL (immutable ledger)       |
| Registration + T&C acceptance records | Minimum 7 years                      | PostgreSQL                          |
| Transaction records                   | Minimum 7 years                      | PostgreSQL                          |
| SAR filings                           | 5 years from filing date             | Secure offline backup + R2          |

R2 bucket lifecycle policy: files in the `/kyc/` prefix are protected from deletion. Admin UI delete is disabled for KYC documents — only archival (status change to EXPIRED) is permitted.

---

_ProTraderSim — PTS-SOP-001 — Compliance & KYC Operations Standard — v1.0 — March 2026_
