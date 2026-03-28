# ProTraderSim
## PTS-COMM-001 — Trader Communication Templates
**Version 1.0 | March 2026 | CONFIDENTIAL**
*All email and in-app notification copy for the platform*

---

## How to Use This Document

This document contains the copy for every email template and in-app notification in ProTraderSim. Each template is listed with its trigger, subject line, and full body copy. The development team implements these in `packages/email/` as React Email components (`.tsx` files) and sends them via the Resend API.

**Variable placeholders use `{{double_braces}}` format.** All placeholders are replaced at send time with live data from the database.

**Brand voice:** Professional, clear, and warm. Never overly formal or robotic. Traders should feel supported, not processed. Always tell the trader exactly what happened, what it means for them, and what to do next if action is required.

---

## 1. Registration & Onboarding Emails

---

### 1.1 Welcome + Email Verification
**File:** `welcome.tsx`
**Trigger:** Immediately on successful registration
**Subject:** `Welcome to ProTraderSim — Please verify your email`

---

Hi {{first_name}},

Welcome to ProTraderSim. Your account has been created successfully.

Before you can start trading, please verify your email address by clicking the button below. This link is valid for 24 hours.

**[Verify My Email Address]**
`{{verification_link}}`

**Your account details:**
- Account Number: {{account_number}}
- Registered Email: {{email}}

Once verified, you can log in and begin your account setup to unlock trading.

If you didn't create this account, you can safely ignore this email.

ProTraderSim Support Team

---

### 1.2 Email Verification (Standalone Resend)
**File:** `email-verify.tsx`
**Trigger:** When trader requests a new verification email
**Subject:** `Verify your ProTraderSim email address`

---

Hi {{first_name}},

You requested a new email verification link for your ProTraderSim account.

**[Verify My Email Address]**
`{{verification_link}}`

This link is valid for 24 hours. If you didn't request this, please ignore this email — your account is secure.

ProTraderSim Support Team

---

### 1.3 KYC Documents Received — Under Review
**File:** `kyc-pending.tsx`
**Trigger:** When trader uploads both mandatory KYC documents and kyc_status moves to PENDING
**Subject:** `Your documents are under review — ProTraderSim`

---

Hi {{first_name}},

Thank you for submitting your verification documents. Your account is now under review.

**What happens next:**
Our compliance team will review your documents within 24 hours. You will receive an email as soon as the review is complete.

**Current status:** Under Review
**Account Number:** {{account_number}}

While you wait, you can log in to your account and explore the platform. Trading and deposits will be enabled once your verification is approved.

If you need to update or replace a document, you can do so by logging in and visiting My Account → Profile → Upload Documents.

ProTraderSim Support Team

---

## 2. KYC Status Emails

---

### 2.1 KYC Approved — Start Trading
**File:** `kyc-approved.tsx`
**Trigger:** kyc_status updated to APPROVED (kyc_level reaches L2 or L3)
**Subject:** `Your account is verified — You can now trade`

---

Hi {{first_name}},

Great news — your identity has been verified and your ProTraderSim account is now fully active.

**Your account is ready to trade.**

**[Go to Trading Platform]**
`{{platform_url}}`

**What's now available:**
- Make your first deposit (minimum $200 USD)
- Trade across 60+ instruments: Forex, Stocks, Indices, Commodities, and Crypto
- Set price alerts and explore trading signals

**Account Number:** {{account_number}}

If you have any questions, our support team is available via the chat widget on the platform or through Telegram.

Welcome to ProTraderSim.

ProTraderSim Support Team

---

### 2.2 KYC Rejected
**File:** `kyc-rejected.tsx`
**Trigger:** kyc_status updated to REJECTED
**Subject:** `Action required — Document verification issue`

---

Hi {{first_name}},

We were unable to verify your identity with the document you submitted.

**Reason:** {{rejection_reason}}

**What to do:**
Please log in to your account and re-upload a corrected document. Once your new document is submitted, our team will review it within 24 hours.

**[Upload New Document]**
`{{kyc_upload_url}}`

If you are unsure what is required or need assistance, please contact our support team — we are happy to help.

ProTraderSim Support Team

---

### 2.3 KYC — Additional Document Required
**File:** `kyc-additional.tsx`
**Trigger:** kyc_status updated to ADDITIONAL_REQUIRED
**Subject:** `Additional document required for your ProTraderSim account`

---

Hi {{first_name}},

Our compliance team has reviewed your submission and requires one more document to complete your verification.

**What is needed:** {{additional_document_request}}

**[Upload Additional Document]**
`{{kyc_upload_url}}`

This is a normal part of the verification process. Once you upload the requested document, our team will review it within 24 hours.

If you have any questions about what is required, please contact our support team.

ProTraderSim Support Team

---

### 2.4 KYC — Resubmission Required
**File:** `kyc-resubmit.tsx`
**Trigger:** kyc_status updated to REQUIRES_RESUBMIT
**Subject:** `Please resubmit your verification document`

---

Hi {{first_name}},

We were unable to complete the review of your document due to the following:

**Issue:** {{rejection_reason}}

Your account remains open and your previous documents are saved. To continue, please upload a corrected version of the affected document.

**[Resubmit Document]**
`{{kyc_upload_url}}`

Once you resubmit, our team will review it within 24 hours.

ProTraderSim Support Team

---

## 3. Deposit & Withdrawal Emails

---

### 3.1 Deposit Confirmed
**File:** `deposit-confirmed.tsx`
**Trigger:** Deposit status moves to COMPLETED (NowPayments webhook confirmed)
**Subject:** `Deposit confirmed — {{formatted_amount}} added to your account`

---

Hi {{first_name}},

Your deposit has been confirmed and credited to your account.

**Deposit Summary:**
- Amount: {{formatted_amount}}
- Currency: {{crypto_currency}}
- Reference: {{deposit_id}}
- Date: {{confirmed_at}}

**New Balance:** {{new_balance}}

**[Start Trading]**
`{{platform_url}}`

ProTraderSim Support Team

---

### 3.2 Deposit Rejected
**File:** `deposit-rejected.tsx`
**Trigger:** Deposit status set to REJECTED by admin
**Subject:** `Deposit could not be processed — ProTraderSim`

---

Hi {{first_name}},

Unfortunately, we were unable to process your recent deposit.

**Deposit Details:**
- Amount: {{formatted_amount}}
- Reference: {{deposit_id}}
- Date: {{created_at}}

**Reason:** {{rejection_reason}}

If you believe this is an error or need assistance, please contact our support team with your deposit reference number.

ProTraderSim Support Team

---

### 3.3 Withdrawal Processing
**File:** `withdrawal-processing.tsx`
**Trigger:** Withdrawal request submitted and accepted
**Subject:** `Withdrawal request received — {{formatted_amount}}`

---

Hi {{first_name}},

We have received your withdrawal request and it is now being processed.

**Withdrawal Summary:**
- Amount: {{formatted_amount}}
- Currency: {{crypto_currency}}
- Wallet Address: {{masked_wallet_address}}
- Reference: {{withdrawal_id}}
- Requested: {{created_at}}

**Estimated processing time:** 2–3 business days

You will receive a confirmation email once the transfer has been sent. You can track the status of your withdrawal in My Account → Funds.

ProTraderSim Support Team

---

### 3.4 Withdrawal Completed
**File:** `withdrawal-completed.tsx`
**Trigger:** NowPayments payout confirmed
**Subject:** `Withdrawal sent — {{formatted_amount}} has been transferred`

---

Hi {{first_name}},

Your withdrawal has been processed and the funds have been sent to your wallet.

**Transfer Summary:**
- Amount: {{formatted_amount}}
- Currency: {{crypto_currency}}
- Wallet Address: {{masked_wallet_address}}
- Transaction ID: {{crypto_txid}}
- Sent: {{completed_at}}

Please allow time for blockchain confirmations. If you do not receive the funds within 24 hours of this email, please contact our support team with the transaction ID above.

ProTraderSim Support Team

---

### 3.5 Withdrawal Rejected
**File:** `withdrawal-rejected.tsx`
**Trigger:** Withdrawal rejected by admin
**Subject:** `Withdrawal request declined — Action required`

---

Hi {{first_name}},

Your withdrawal request could not be processed and has been cancelled.

**Withdrawal Details:**
- Amount: {{formatted_amount}}
- Reference: {{withdrawal_id}}
- Requested: {{created_at}}

**Reason:** {{rejection_reason}}

The amount has been returned to your account balance. You can view your current balance in My Account → Funds.

If you have questions or would like to submit a new withdrawal request, please log in or contact our support team.

ProTraderSim Support Team

---

## 4. Trading Event Emails

---

### 4.1 Stop Loss Triggered
**File:** `stop-loss-triggered.tsx`
**Trigger:** Trade closed by stop-loss engine
**Subject:** `Stop loss triggered — {{symbol}} position closed`

---

Hi {{first_name}},

Your stop loss has been triggered and your position has been closed automatically.

**Trade Summary:**
- Instrument: {{symbol}} ({{direction}})
- Units: {{units}}
- Open Rate: {{open_rate}}
- Close Rate: {{close_rate}} (Stop Loss Level)
- Realized P&L: {{realized_pnl}}
- Closed At: {{close_at}}

**Account Balance:** {{new_balance}}

Your stop loss worked as intended to protect your account from further loss. You can open a new position at any time by logging into the platform.

**[Go to Platform]**
`{{platform_url}}`

ProTraderSim Support Team

---

### 4.2 Take Profit Triggered
**File:** `take-profit-triggered.tsx`
**Trigger:** Trade closed by take-profit engine
**Subject:** `Take profit hit — {{symbol}} position closed with profit`

---

Hi {{first_name}},

Congratulations — your take profit target has been reached and your position has been closed.

**Trade Summary:**
- Instrument: {{symbol}} ({{direction}})
- Units: {{units}}
- Open Rate: {{open_rate}}
- Close Rate: {{close_rate}} (Take Profit Level)
- Realized P&L: {{realized_pnl}}
- Closed At: {{close_at}}

**Account Balance:** {{new_balance}}

**[Continue Trading]**
`{{platform_url}}`

ProTraderSim Support Team

---

### 4.3 Margin Call Warning
**File:** `margin-call.tsx`
**Trigger:** Account margin level drops to or below 100%
**Subject:** `URGENT: Margin call warning on your ProTraderSim account`

---

Hi {{first_name}},

**Your account margin level has fallen below 100% and a margin call has been triggered.**

**Current Account Status:**
- Margin Level: {{margin_level}}%
- Equity: {{equity}}
- Used Margin: {{used_margin}}

**What this means:**
If your margin level falls below 50%, your open positions will begin to be closed automatically, starting with the position with the largest unrealized loss.

**What you can do:**
1. Deposit additional funds to increase your equity
2. Close one or more of your open positions to reduce margin usage
3. Modify your open positions to reduce exposure

**[Go to Platform Now]**
`{{platform_url}}`

Time is critical. Please take action immediately.

ProTraderSim Support Team

---

### 4.4 Stop-Out — Positions Closed
**File:** `stop-out.tsx`
**Trigger:** Stop-out sequence completed
**Subject:** `Your positions have been closed — ProTraderSim account update`

---

Hi {{first_name}},

Your account margin level fell below the stop-out threshold (50%) and one or more of your positions have been automatically closed to protect your account balance.

**Stop-Out Summary:**
- Positions Closed: {{positions_closed_count}}
- Stop-Out Time: {{stop_out_at}}
- Final Balance: {{final_balance}}

**Positions closed:**
{{#each closed_positions}}
- {{symbol}} {{direction}} {{units}} units — Realized P&L: {{realized_pnl}}
{{/each}}

**What happens next:**
Your account remains active. You can continue trading once you have reviewed your account balance and available margin.

**[Review Your Account]**
`{{platform_url}}`

If you have questions about stop-out or would like to discuss risk management, please contact our support team.

ProTraderSim Support Team

---

## 5. Account & Security Emails

---

### 5.1 Password Reset
**File:** `password-reset.tsx`
**Trigger:** Trader requests password reset
**Subject:** `Reset your ProTraderSim password`

---

Hi {{first_name}},

We received a request to reset the password for your ProTraderSim account.

**[Reset My Password]**
`{{reset_link}}`

This link is valid for **1 hour**. If you did not request a password reset, you can safely ignore this email — your password will not be changed.

For your security, never share this link with anyone.

ProTraderSim Support Team

---

### 5.2 Password Changed Confirmation
**File:** `password-changed.tsx`
**Trigger:** Password successfully changed
**Subject:** `Your ProTraderSim password has been changed`

---

Hi {{first_name}},

Your account password was successfully changed on {{changed_at}}.

If you made this change, no further action is needed.

**If you did not make this change**, please contact our support team immediately and change your password again as soon as possible.

ProTraderSim Support Team

---

## 6. Inactivity Fee Emails

---

### 6.1 Inactivity Fee Warning (7 Days Notice)
**File:** `inactivity-warning.tsx`
**Trigger:** 7 days before the first inactivity fee is applied (83 days of inactivity)
**Subject:** `Account inactivity notice — action required`

---

Hi {{first_name}},

Your ProTraderSim account has been inactive for 83 days. In 7 days, a monthly inactivity fee of **$25.00** will be applied to your account balance.

**Account Number:** {{account_number}}
**Current Balance:** {{current_balance}}
**Fee Date:** {{fee_date}}

**How to avoid the fee:**
Simply open or close any trade on the platform before {{fee_date}} and the inactivity clock will reset.

**[Log In and Trade]**
`{{platform_url}}`

If you have questions about our inactivity policy, please contact support.

ProTraderSim Support Team

---

### 6.2 Inactivity Fee Charged
**File:** `inactivity-charged.tsx`
**Trigger:** Monthly inactivity fee applied
**Subject:** `Monthly inactivity fee charged — ProTraderSim`

---

Hi {{first_name}},

A monthly inactivity fee of **{{fee_amount}}** has been deducted from your account balance. This fee applies to accounts that have had no trading activity for 90 or more consecutive days.

**Fee Details:**
- Fee Amount: {{fee_amount}}
- Date Applied: {{fee_date}}
- Account Balance After Fee: {{balance_after}}

To stop further inactivity fees from being charged, simply open or close any trade on the platform. The inactivity clock resets automatically when you trade.

**[Log In and Trade]**
`{{platform_url}}`

ProTraderSim Support Team

---

## 7. KYC Reminder Email

---

### 7.1 KYC Not Started Reminder
**File:** `kyc-reminder.tsx`
**Trigger:** BullMQ job — sent 3 days after registration if kyc_status = NOT_STARTED
**Subject:** `Complete your verification to start trading`

---

Hi {{first_name}},

Your ProTraderSim account is set up, but your identity verification is not yet complete. You need to complete verification before you can deposit funds or start trading.

**It only takes a few minutes.** You will need:
- A government-issued photo ID (passport, national ID, or driving licence)
- A proof of address (utility bill or bank statement dated within 3 months)

**[Complete Verification Now]**
`{{kyc_upload_url}}`

Once you submit your documents, our team will review them within 24 hours.

ProTraderSim Support Team

---

## 8. In-App Notification Copy

These are short messages displayed inside the platform notification panel. They accompany the email templates for events that use both channels.

| Event | Title | Message |
|---|---|---|
| Trade opened (market) | Trade opened | {{symbol}} {{direction}} {{units}} units opened at {{open_rate}} |
| Trade opened (entry triggered) | Entry order triggered | Your entry order for {{symbol}} has been triggered at {{open_rate}} |
| Trade closed (by user) | Trade closed | {{symbol}} {{direction}} closed. P&L: {{realized_pnl}} |
| Stop loss triggered | Stop loss triggered | {{symbol}} {{direction}} closed at stop loss ({{close_rate}}). P&L: {{realized_pnl}} |
| Take profit triggered | Take profit reached | {{symbol}} {{direction}} closed at take profit ({{close_rate}}). P&L: {{realized_pnl}} |
| Trailing stop triggered | Trailing stop triggered | {{symbol}} {{direction}} closed by trailing stop ({{close_rate}}). P&L: {{realized_pnl}} |
| Margin call | Margin call warning | Your margin level has dropped to {{margin_level}}%. Add funds or close positions immediately. |
| Stop-out | Positions auto-closed | {{positions_count}} position(s) were closed due to margin stop-out. Balance: {{final_balance}} |
| Deposit confirmed | Deposit received | {{formatted_amount}} has been credited to your account. New balance: {{new_balance}} |
| Withdrawal processing | Withdrawal submitted | Your withdrawal of {{formatted_amount}} is being processed. |
| Withdrawal completed | Withdrawal sent | Your withdrawal of {{formatted_amount}} has been sent to your wallet. |
| Withdrawal rejected | Withdrawal declined | Your withdrawal of {{formatted_amount}} was declined. Reason: {{rejection_reason}} |
| KYC approved | Account verified | Your identity has been verified. You can now deposit and trade. |
| KYC rejected | Verification issue | There is an issue with your verification document. Please resubmit. |
| KYC additional required | Document needed | Our team requires an additional document. Please check your email. |
| Price alert triggered | Price alert | {{symbol}} has reached {{trigger_price}}. Your alert has been triggered. |
| Inactivity warning | Inactivity notice | Your account has been inactive for 83 days. A $25 fee will be charged on {{fee_date}} if no trade is made. |
| Inactivity fee charged | Inactivity fee deducted | A monthly inactivity fee of {{fee_amount}} has been deducted. New balance: {{balance_after}} |
| Annual statement ready | Annual statement available | Your {{year}} annual trading statement is ready to download. |

---

## 9. Platform Toast Messages

Short feedback messages displayed as toast notifications immediately after a user action.

| Action | Toast Text | Type |
|---|---|---|
| Trade opened successfully | Trade opened — {{symbol}} {{direction}} at {{open_rate}} | Success (green) |
| Entry order placed | Entry order set for {{symbol}} at {{order_rate}} | Success (green) |
| Trade closed | {{symbol}} closed — P&L: {{realized_pnl}} | Success (green) |
| Entry order cancelled | Entry order for {{symbol}} cancelled | Info (blue) |
| SL/TP updated | Stop loss and take profit updated | Success (green) |
| Alert set | Price alert set for {{symbol}} at {{trigger_price}} | Success (green) |
| Alert deleted | Alert removed | Info (blue) |
| Instrument added to watchlist | {{symbol}} added to your watchlist | Success (green) |
| Instrument removed from watchlist | {{symbol}} removed from your watchlist | Info (blue) |
| Password changed | Password changed successfully | Success (green) |
| Profile updated | Profile updated | Success (green) |
| Withdrawal submitted | Withdrawal request submitted | Success (green) |
| Insufficient margin | Insufficient margin to open this trade | Error (red) |
| Market closed | {{symbol}} is not available for trading right now | Warning (amber) |
| Session expired | Your session has expired. Please log in again. | Warning (amber) |
| Copy to clipboard | Copied to clipboard | Info (blue) |

---

## 10. Error and Validation Messages

Messages shown inline in forms when validation fails.

| Field / Context | Error Message |
|---|---|
| Email — invalid format | Please enter a valid email address |
| Email — already registered | An account with this email already exists. Log in instead? |
| Password — too short | Password must be at least 8 characters |
| Password — missing uppercase | Password must include at least one uppercase letter |
| Password — missing number | Password must include at least one number |
| Confirm password — mismatch | Passwords do not match |
| Pool Code — invalid | This referral code is not valid. Please check and try again. |
| Pool Code — missing | A referral code is required to register. Please contact your IB for your code. |
| Terms — not accepted | You must accept the Terms and Conditions to create an account |
| Units — below minimum | Minimum trade size for {{symbol}} is {{min_units}} units |
| Units — above maximum | Maximum trade size for {{symbol}} is {{max_units}} units |
| Stop loss — wrong side | Stop loss must be {{direction_instruction}} the entry price for a {{direction}} trade |
| Take profit — wrong side | Take profit must be {{direction_instruction}} the entry price for a {{direction}} trade |
| Entry order rate — invalid | Rate must be above {{above_rate}} or below {{below_rate}} for this instrument |
| Withdrawal amount — below minimum | Minimum withdrawal amount is $50.00 |
| Withdrawal amount — above maximum | Maximum withdrawal amount per transaction is $5,000.00 |
| Withdrawal amount — exceeds balance | Withdrawal amount exceeds your available balance of {{available_balance}} |
| KYC required | You need to complete identity verification before you can {{action}} |
| Document — wrong format | Only PDF, JPEG, and PNG files are accepted |
| Document — too large | Maximum file size is 10 MB. Your file is {{file_size}} MB. |

---

*ProTraderSim — PTS-COMM-001 — Trader Communication Templates — v1.0 — March 2026*
