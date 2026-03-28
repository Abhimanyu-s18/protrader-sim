# ProTraderSim
## PTS-SOP-001 — Compliance & KYC Operations Standard
**Version 1.0 | March 2026 | CONFIDENTIAL**
*Trader Registration, Onboarding, and KYC Review Standard Operating Procedure*

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

This list is maintained by Legal Counsel (Krishantha) and updated in platform configuration. Blocking is applied by server-side IP geolocation check + country field validation.

---

## 4. Registration Requirements

**Mandatory registration fields:**
- Full legal name (as it appears on government ID)
- Email address (verified via confirmation link)
- Phone number (with country code)
- Country of residence
- Pool Code (IB referral code)
- Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
- Terms & Conditions acceptance (checkbox, logged with version + timestamp)
- Risk Disclosure acceptance (checkbox, logged with timestamp)

**Auto-generated at registration:**
- Account Number: `PT` + zero-padded 8-digit sequence (e.g. PT00000001)
- Lead ID: `LEAD` + zero-padded 10-digit sequence (e.g. LEAD0000000001)
- kyc_status: `NOT_STARTED`
- kyc_level: `1` (Email Verified)

---

## 5. KYC Tiering

ProTraderSim uses a three-level progressive verification framework.

| Level | Label | Requirements | Verification Method | Account Capabilities |
|---|---|---|---|---|
| L1 | Email Verified | Email address confirmed via verification link | Automatic (system) | Account created. No trading. No deposit. KYC wizard presented. |
| L2 | Identity Verified | Government-issued photo ID (front + back) | IB Agent preliminary review — 24-hour SLA | Trading enabled. Deposits via NowPayments unlocked. Withdrawal restricted to deposited amount. |
| L3 | Fully Verified | L2 documents + proof of address + selfie capture | IB Team Leader final approval — 48-hour SLA | All features unlocked. Withdrawal unrestricted. Bonus eligibility active. |

**No trading is permitted before kyc_level reaches L2 (kyc_status = 'APPROVED').**
This is an absolute product policy enforced at the API level via `requireKYC` middleware.

---

## 6. Required KYC Documents

### 6.1 Identity Documents (L2 — Mandatory)

| Type | Requirements |
|---|---|
| Passport | Full name, date of birth, nationality, passport number, expiry date, photo, all four corners visible |
| National ID Card | Full name, DOB, ID number, expiry (front + back). All corners visible. |
| Driving Licence | Full name, DOB, licence number, expiry. All corners visible. |
| Other | As specified by compliance team in the kyc_documents review notes |

### 6.2 Address Documents (L3 — Required for Full Verification)

| Type | Requirements |
|---|---|
| Utility Bill | Full name, current residential address, dated within 3 months |
| Bank Statement | Full name, current residential address, dated within 3 months |
| Credit Card Statement | Full name, address, dated within 3 months |
| Local Authority Tax Bill | Full name, address, dated within 12 months |
| Other | As specified by compliance team |

### 6.3 Miscellaneous Documents (Optional / Compliance-Requested)

Tax residency certificate, company registration, source of funds documentation, court orders, enhanced due diligence material. These are requested by the compliance team on a case-by-case basis.

### 6.4 File Technical Rules

| Requirement | Rule |
|---|---|
| Accepted formats | PDF, JPEG, PNG |
| Maximum file size | 10 MB per file |
| Minimum image resolution | 800 × 600 pixels |
| MIME type validation | Verified from file bytes server-side (not extension) |
| Storage | Cloudflare R2 private bucket — never publicly accessible |
| Access method | Presigned URLs with 15-minute expiry, generated per admin request |

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

| # | Trigger Pattern | Threshold / Signal | Required Action |
|---|---|---|---|
| 1 | Rapid deposit/withdrawal cycle | >90% of deposited amount withdrawn within 24 hours of credit, with minimal trading activity | Freeze withdrawal. Escalate to Legal. Request source-of-funds documentation. |
| 2 | Large deposit — unknown source | Single deposit > 5× the trader's declared monthly income | Request source-of-funds declaration before crediting account. |
| 3 | Multiple accounts — same IP or device | 2+ accounts from identical IP address within 30 days | Flag all accounts. Admin review. Suspend if same beneficial owner confirmed. |
| 4 | Trading pattern vs risk profile mismatch | High-frequency, high-leverage trading on account declaring "Beginner / Low Risk" | Risk questionnaire re-review. Notify trader. May trigger enhanced due diligence. |
| 5 | Sanctions list match (name/country) | Automated AML/PEP API match or manual identification | Immediate account suspension. Notify Legal. Do not inform trader. File SAR. |

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
7. When both mandatory documents (identity + address per L2) approved:
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

| Situation | Escalate to | Timeframe | Method |
|---|---|---|---|
| Suspected document forgery | Krishantha (Legal) + George (Executive Sponsor) | Immediately | Direct call + written memo |
| Sanctions list match (PEP/AML) | Krishantha (Legal) | Immediately | Encrypted email + call |
| High-value deposit >$10,000 | Admin team + Krishantha | Same business day | Admin panel flag + email |
| Behavioural AML trigger (any) | Krishantha (Legal) | Within 4 hours | Written escalation report |
| Account suspension dispute | Krishantha + Victor (Operations) | Within 24 hours | Email |

---

## 9. KYC Rejection Reason Codes

| Code | Condition | Trader-Facing Message | Outcome |
|---|---|---|---|
| DOC_QUALITY_POOR | Blurry or illegible scan | "Your document image is not sufficiently clear. Please re-upload a high-resolution, well-lit photo." | kyc_status → REQUIRES_RESUBMIT |
| DOC_EXPIRED | Identity document has expired | "The identity document you submitted has expired. Please provide a currently valid document." | kyc_status → REJECTED |
| NAME_MISMATCH | Name on document does not match registration | "The name on your submitted document does not match your registered name. Please check and resubmit." | kyc_status → REJECTED |
| ADDRESS_MISMATCH | Address document does not match profile | "The address on your document does not match your registered address. Please update your profile or submit a matching document." | kyc_status → REQUIRES_RESUBMIT |
| DOC_OUTDATED | Address document older than 3 months | "Your address document is dated more than 3 months ago. Please submit a document issued within the last 3 months." | kyc_status → REQUIRES_RESUBMIT |
| PARTIAL_VISIBILITY | Document edges or corners not fully visible | "Your document image does not show all four corners. Please re-photograph in a clear area with all corners visible." | kyc_status → REQUIRES_RESUBMIT |
| UNSUPPORTED_TYPE | Document type not accepted | "The document type you submitted is not accepted for this verification step. Please refer to the accepted document list and resubmit." | kyc_status → REQUIRES_RESUBMIT |
| PEP_MATCH | Name/nationality matches PEP/sanctions list | Account suspended. Do NOT communicate this code to the trader. | Immediate suspension. Notify Legal. File SAR. |

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

| Status | Meaning | Trade Access | Deposit Access | Withdrawal Access |
|---|---|---|---|---|
| ACTIVE | Normal trading account | Yes (if KYC approved) | Yes (if KYC approved) | Yes (if KYC approved) |
| INACTIVE | No activity for 90+ days | Yes | Yes | Yes (inactivity fee charged monthly) |
| SUSPENDED | Admin-initiated freeze | No | No | No |
| CLOSED | Account permanently closed | No | No | No (final balance settled) |

---

## 12. Document Retention Policy

| Document Type | Retention Period | Storage Location |
|---|---|---|
| KYC identity documents | Minimum 5 years from account closure | Cloudflare R2 (private bucket) |
| KYC address documents | Minimum 5 years from account closure | Cloudflare R2 (private bucket) |
| KYC review audit logs | Minimum 7 years | PostgreSQL (immutable ledger) |
| Registration + T&C acceptance records | Minimum 7 years | PostgreSQL |
| Transaction records | Minimum 7 years | PostgreSQL |
| SAR filings | 5 years from filing date | Secure offline backup + R2 |

R2 bucket lifecycle policy: files in the `/kyc/` prefix are protected from deletion. Admin UI delete is disabled for KYC documents — only archival (status change to EXPIRED) is permitted.

---

*ProTraderSim — PTS-SOP-001 — Compliance & KYC Operations Standard — v1.0 — March 2026*
