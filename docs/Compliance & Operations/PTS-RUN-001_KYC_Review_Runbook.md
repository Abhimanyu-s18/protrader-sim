# ProTraderSim
## PTS-RUN-001 — KYC Review Runbook
**Version 1.0 | March 2026 | CONFIDENTIAL**
*Operational Step-by-Step Guide for IB Agents and Team Leaders*

---

## Who This Document Is For

This runbook is for the operations team performing KYC document reviews. It covers every decision point in the review process with explicit steps, checklists, and escalation paths. Reading PTS-SOP-001 first is recommended, but this runbook is written to stand alone at the desk during a live review.

**Roles covered:**
- **IB Agent** — performs L2 (Identity) review. 24-hour SLA.
- **IB Team Leader** — performs L3 (Full Verification) review. 48-hour SLA.
- **Admin** — accesses review queue and tools in admin panel.

---

## 1. Accessing the KYC Review Queue

1. Navigate to `admin.protrader.com`
2. Log in with your staff credentials
3. Click **KYC Review** in the left sidebar
4. Queue shows all submissions with status **PENDING**, sorted oldest first

**Queue columns:**

| Column | What It Shows |
|---|---|
| Trader Name | Full name from registration |
| Account Number | PT-prefixed account number |
| Submitted At | Date and time documents were uploaded |
| Documents | Count of uploaded files |
| Review Level | L2 (Agent) or L3 (Team Leader) |
| Days Waiting | Time since submission — amber at 75% SLA, red at 100% SLA |

**Filter options:** Status, Review Level, Date range, Assigned Agent

---

## 2. Opening a Submission

1. Click the trader's row in the queue
2. A split panel opens: **left** = trader profile, **right** = uploaded documents
3. Click **"Start Review"** — this sets document status to `UNDER_REVIEW` and locks the submission from re-upload while reviewing
4. Trader sees "Your documents are currently being reviewed" on their platform

**Trader profile panel shows:** full name, DOB, nationality, email, phone, country, registration date, account number, lead ID, assigned IB Agent, KYC status history

---

## 3. Viewing Documents

1. Click **"View Document"** next to any file
2. System generates a **15-minute presigned R2 URL** and opens the document in a new browser tab
3. If the link expires, click "View Document" again to generate a fresh one
4. Multiple documents can be open in separate tabs simultaneously

> **Security:** Links expire after 15 minutes and cannot be shared. Do not save, screenshot, or forward document contents outside the review system.

---

## 4. L2 Review — Identity Document Checklist (IB Agent)

Work through all items. Every item must pass before approving.

### 4.1 Image Quality

- [ ] Image is clear and fully legible — no blur, glare, or obscuring shadows
- [ ] All four corners of the document are visible
- [ ] Entire document fits within the frame — nothing clipped
- [ ] Text is readable without excessive zooming
- [ ] No signs of digital alteration — consistent fonts, no pixel artefacts around text fields, consistent background pattern

**→ If any quality item fails: reject with `DOC_QUALITY_POOR`**

### 4.2 Document Type

- [ ] Submitted type matches what the trader selected (e.g. selected "Passport", submitted a passport)
- [ ] Document is a recognised government-issued identity document
- [ ] Document is from a non-sanctioned country

**→ If type mismatch: reject with `UNSUPPORTED_TYPE`**

### 4.3 Expiry

- [ ] Locate the expiry date on the document
- [ ] Document must be **currently valid** as of today's date

**→ If expired: reject with `DOC_EXPIRED`**

### 4.4 Name Match

- [ ] Read the full name exactly as printed on the document
- [ ] Compare to the trader's registered `full_name` in the profile panel
- [ ] Names must match — same spelling, same order
- [ ] Minor accepted variations: middle name present on one but not the other (same first and last name), minor transliteration differences for non-Latin names
- [ ] Document any name variation judgement in the review notes field

**→ If names do not match: reject with `NAME_MISMATCH`**

### 4.5 Document Completeness

**Passport:**
- [ ] Full name, DOB, nationality, passport number, expiry, photo all visible
- [ ] MRZ (machine-readable zone at bottom) visible and not cut off

**National ID:**
- [ ] Front: full name, DOB, ID number, photo visible
- [ ] Back: expiry, address or other fields visible (if required by issuing country)

**Driving Licence:**
- [ ] Full name, DOB, licence number, expiry, issuing authority, photo all visible

**→ If required fields are missing or obscured: reject with `PARTIAL_VISIBILITY`**

---

## 5. L3 Review — Address Document Checklist (IB Team Leader)

### 5.1 Image Quality

Same four quality checks as Section 4.1.

### 5.2 Document Type

- [ ] Accepted types: utility bill, bank statement, credit card statement, local authority tax bill
- [ ] Document is clearly from a recognisable institution
- [ ] Not a handwritten or informally produced document

**→ If unacceptable type: reject with `UNSUPPORTED_TYPE`**

### 5.3 Date Check

- [ ] Locate the issue date or statement date
- [ ] **Utility bills, bank statements, credit card statements:** must be dated within the last **3 months**
- [ ] **Local authority tax bills:** must be dated within the last **12 months**

**→ If document is too old: reject with `DOC_OUTDATED`**

### 5.4 Name Match

Same rules as Section 4.4.

**→ If names do not match: reject with `NAME_MISMATCH`**

### 5.5 Address Match

- [ ] Full address on document matches the trader's registered address in the profile (`address_line1`, `address_city`, `address_country`)
- [ ] Minor formatting differences are acceptable (e.g. "St." vs "Street", abbreviated city name)
- [ ] If the trader updated their address after registration, compare against the current profile address

**→ If address does not match: reject with `ADDRESS_MISMATCH`**

### 5.6 Completeness

- [ ] Trader's full name clearly visible
- [ ] Full current residential address clearly visible (street, city, country minimum)
- [ ] Issue or statement date clearly visible
- [ ] Issuing institution name or logo clearly visible

---

## 6. Approving a Document

When all checklist items pass:

1. Click **"Approve"** next to the document
2. Confirm in the approval dialog
3. Repeat for each mandatory document in the submission
4. When **all mandatory documents** for the current review level are approved, the system automatically:
   - Updates `kyc_status = 'APPROVED'` and increments `kyc_level`
   - Sends the trader a KYC approval email
   - If trader is online, sends an in-app notification immediately
5. Submission moves out of the PENDING queue

**For L2:** Identity document(s) must be approved.
**For L3:** Address document (plus any other compliance-requested documents) must be approved.

---

## 7. Rejecting a Document

When one or more checklist items fail:

1. Click **"Reject"** next to the document
2. Select the **rejection reason code** from the dropdown
3. Write a **reviewer note** — this is sent directly to the trader. Be specific: state what was wrong and what they must do to fix it. See Section 9 for examples.
4. Click **"Confirm Rejection"**
5. System updates the document status and sends the trader a rejection email with your note

**Rejection reason codes:**

| Code | When to Use |
|---|---|
| `DOC_QUALITY_POOR` | Blurry, glare, shadows, cut-off corners, unreadable text |
| `DOC_EXPIRED` | Document expiry date has passed |
| `NAME_MISMATCH` | Name on document does not match registered name |
| `ADDRESS_MISMATCH` | Address on document does not match registered address |
| `DOC_OUTDATED` | Address document is older than the accepted timeframe (3 months, or up to 12 months for Local Authority Tax Bill) | "Your address document is dated more than the accepted timeframe. Please submit a document issued within the last 3 months (or 12 months for Local Authority Tax Bill)." | kyc_status → REQUIRES_RESUBMIT |
| `PARTIAL_VISIBILITY` | Required fields, corners, or sections not fully visible |
| `UNSUPPORTED_TYPE` | Document type is not on the accepted list |

> **Never use `PEP_MATCH` in the rejection UI.** If you suspect a PEP or sanctions match, stop the review and call Krishantha immediately. See Section 11.2.

---

## 8. Requesting Additional Documents

Use when the submission is insufficient but not a clear rejection — for example, when a second page is needed or compliance has requested a specific supporting document.

1. Click **"Request Additional Document"**
2. Specify exactly what document is needed and why
3. Click **"Send Request"**
4. Trader's `kyc_status` is set to `ADDITIONAL_REQUIRED`
5. Trader receives an email and in-app notification with your instructions
6. When the trader re-uploads, the submission returns to the PENDING queue

---

## 9. Writing Good Reviewer Notes

Your notes go directly to the trader. Write them clearly and helpfully.

**Good examples:**

> "Your passport image is blurry in the lower-right corner and the expiry date is not readable. Please re-take the photo in good lighting, holding the passport flat on a solid surface, and ensure all four corners and all text are clearly visible."

> "The name on your bank statement ('John R. Smith') does not match your registered name ('John Richard Smith'). Please upload a document where your full registered name appears exactly, or contact support if your registered name needs to be corrected."

> "Your utility bill is dated 4 months ago. Please upload a bill from the last 3 months."

**Poor examples (avoid):**

> "Document rejected." — Trader does not know what to fix.

> "Name mismatch." — Too brief. Doesn't explain the discrepancy.

> "Please resubmit with a better photo." — What is wrong with the current photo?

---

## 10. Common Scenarios and Correct Responses

| Scenario | Correct Action |
|---|---|
| Trader submitted a selfie photo instead of a document | Reject with `DOC_QUALITY_POOR`. Note: "You have uploaded a photo of yourself. Please upload a clear scan or photo of your identity document (passport, national ID, or driving licence)." |
| Passport photo page submitted only — data page missing | Reject with `PARTIAL_VISIBILITY`. Note: "Your passport submission shows only the photo page. Please upload the personal data page showing your full name, date of birth, passport number, and expiry date." |
| Utility bill is in a company name, not personal | Reject with `UNSUPPORTED_TYPE`. Note: "The bill you submitted appears to be in a company name. Please submit a personal utility bill, bank statement, or other accepted document in your own full legal name." |
| Address document is 89 days old | Approve — within 3 months. |
| Address document is 94 days old | Reject with `DOC_OUTDATED`. |
| Middle name on document but not on registration | Approve if first and last name match exactly. Add a review note: "Approved — middle name present on document but not on registration; first and last name match exactly." |
| Document is in a non-English language | Approve if all required fields are identifiable (names, dates, and addresses are typically readable across languages). Use Google Translate for basic field identification only (names, dates, addresses). **Do not use Google Translate for legal/nuanced interpretation**. Any legal, identity-sensitive, or regulator-facing documents require a professional certified translation. If uncertain, stop processing, flag the document, and escalate to Krishantha with the translated screenshot and original file. |
| Phone photo of a document (not scanned) | Acceptable if clear and legible. Reject with `DOC_QUALITY_POOR` only if quality genuinely prevents verification. |
| Document shows a PO Box, not a residential address | Reject with `ADDRESS_MISMATCH`. Note: "Address documents must show a residential address. A PO Box is not accepted. Please submit a document showing your physical residential address." |
| Two people listed on a bank statement | Acceptable if the trader's name appears on the statement and their address is shown. Approve. |

---

## 11. Escalation Procedures

### 11.1 Suspected Document Forgery

Signs to watch for: inconsistent fonts within the same document, pixelated or smeared text around specific fields only, background security pattern inconsistencies, MRZ code that does not visually match the data page, photo that appears digitally inserted or tampered with.

**Steps:**
1. Do NOT approve or reject through the normal flow
2. Click "Request Additional Document" to pause the review without alerting the trader
3. Call **Krishantha (Legal Counsel)** immediately — do not email first
4. Follow up with a written memo (encrypted email) describing what you observed, with the account number and specific document details
5. Await instruction from Krishantha before taking any further action
6. Document the escalation in the internal review notes field (visible to admin only, not to trader)

### 11.2 Suspected PEP or Sanctions Match

If during document review you notice a name, nationality, or other identifier that may match a politically exposed person or a sanctions list entry:

1. Do NOT approve, reject, or take any action in the review panel
2. Do NOT inform the trader that a review is taking place or that there is an issue
3. Call **Krishantha (Legal Counsel)** immediately
4. Send Krishantha the trader's account number, full name, and the basis for your concern in an encrypted email
5. Krishantha will instruct Admin to suspend the account
6. A Suspicious Activity Report (SAR) must be filed within 24 hours if the match is confirmed

### 11.3 High-Value Deposit During Review

If a trader makes or attempts a deposit greater than $10,000 USD while their KYC is under review:

1. Flag the account using the "Flag for Review" button in the admin panel
2. Email **Victor (Operations)** and **Krishantha (Legal Counsel)** with the account number and deposit amount
3. The deposit should be held pending KYC completion and enhanced due diligence
4. Continue the KYC review normally — do not delay it because of the deposit

### 11.4 Escalation Contact Reference

| Situation | Primary Contact | Method | Timeframe |
|---|---|---|---|
| Suspected forgery | Krishantha [LastName], Legal Counsel, +<phone>, krishantha@...<br>Backup: George [LastName], Executive Director, +<phone>, george@... | Phone first, then encrypted email | Immediately |
| PEP / Sanctions match | Krishantha [LastName], Legal Counsel, +<phone>, krishantha@... | Phone first, then encrypted email | Immediately |
| High-value deposit (>$10K) | Victor [LastName], Operations Manager, +<phone>, victor@...<br>Backup: Krishantha [LastName], Legal Counsel, +<phone>, krishantha@... | Email | Same business day |
| AML behavioural trigger | Krishantha [LastName], Legal Counsel, +<phone>, krishantha@... | Written escalation report | Within 4 hours |
| Account suspension dispute | Krishantha [LastName], Legal Counsel, +<phone>, krishantha@...<br>Backup: Victor [LastName], Operations Manager, +<phone>, victor@... | Email | Within 24 hours |
| System error during review | Victor [LastName], Operations Manager, +<phone>, victor@... | Slack / phone | As soon as possible |

---

## 12. SLA Monitoring and Handover

| Level | SLA | At-Risk | Escalation |
|---|---|---|---|
| L2 (Agent) | 24 hours from submission | 18 hours elapsed | Notify Team Leader |
| L3 (Team Leader) | 48 hours from L2 approval | 36 hours elapsed | Notify Admin |

Queue highlights submissions in amber at 75% of SLA elapsed, red at 100%. Red submissions must be actioned or escalated immediately.

**If you cannot complete a review within SLA:**
- Click **"Release Review"** to return the document to PENDING status
- Notify Victor (Operations) so the submission can be reassigned
- Do not leave submissions in UNDER_REVIEW status overnight

---

## 13. End-of-Session Checklist

Before finishing your review session:

- [ ] All submissions in your queue reviewed, approved, rejected, or escalated
- [ ] No submissions remaining in UNDER_REVIEW status (release any unfinished reviews)
- [ ] All escalations documented in writing
- [ ] SLA status checked — no red items left unaddressed
- [ ] All reviewer notes are clear, specific, and professional in tone

---

*ProTraderSim — PTS-RUN-001 — KYC Review Runbook — v1.0 — March 2026*
