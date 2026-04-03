# ProTraderSim

## PTS-IB-001 — IB Onboarding & Operations Guide

**Version 1.0 | March 2026 | CONFIDENTIAL**
_For Victor (Operations), IB Team Leaders, and IB Agents_

---

## 1. The IB Model — Overview

ProTraderSim operates exclusively under an Introducing Broker (IB) model. This means:

- Every trader on the platform must be referred by an active IB Agent using a Pool Code
- There is no self-registration or organic sign-up — every trader has an IB relationship
- IB Agents earn commission on every trade their traders execute
- IB Team Leaders earn an override commission on all trades from their Agent network
- The platform's revenue comes from spreads; the IB commission is paid from that spread income

**The IB hierarchy has four roles:**

```
Super Admin
    |
    |—— Admin
    |       (Platform operations: KYC, deposits, withdrawals, user management)
    |
    |—— IB Team Leader
            |
            |—— Agent 1
            |       |—— Trader A (assigned to Agent 1)
            |       |—— Trader B (assigned to Agent 1)
            |
            |—— Agent 2
                    |—— Trader C (assigned to Agent 2)
```

---

## 2. Setting Up a New IB Team Leader

IB Team Leaders are created by Super Admin only.

**Steps (in admin panel):**

1. Navigate to `admin.protrader.com` → Staff Management → Add Staff
2. Fill in:
   - Full Name
   - Email address (this becomes their login)
   - Role: **IB_TEAM_LEADER**
   - Commission Rate (bps): set `override_rate_bps` — this is the Team Leader's override percentage on all agent network trades (e.g. 5 bps = 0.05% of trade notional)
   - Generate and assign a unique `pool_code` (see Section 4)
   - Generate and assign a unique `ref_code` (used for referral links)
3. Save the record
4. Send the Team Leader their login credentials via secure channel
5. Send them this onboarding guide for reference

**Important:** The IB_TEAM_LEADER role grants access only to `ib.protrader.com`. Team Leaders cannot access the admin panel.

---

## 3. Setting Up a New IB Agent

IB Agents are created by Super Admin. Each Agent must be assigned to a Team Leader.

**Steps (in admin panel):**

1. Navigate to `admin.protrader.com` → Staff Management → Add Staff
2. Fill in:
   - Full Name
   - Email address (login credential)
   - Role: **AGENT**
   - Team Leader: select the Team Leader this Agent reports to (`team_leader_id`)
   - Commission Rate (bps): set `commission_rate_bps` — this is the Agent's per-trade commission on their traders' trades (e.g. 20 bps = 0.20% of trade notional)
   - Generate and assign a unique `pool_code`
   - Generate and assign a unique `ref_code`
3. Save the record
4. Send the Agent their login credentials and their Pool Code via secure channel
5. The Agent's registration link is: `auth.protrader.com/register?ref={ref_code}`

---

## 4. Pool Codes — What They Are and How They Work

Every IB Agent (and Team Leader who directly refers traders) has a unique Pool Code. This is the mechanism that:

1. Links every new trader to their referring Agent at the moment of registration
2. Enforces the IB-only model — registrations must include a valid Pool Code unless the account is legacy, created by admin, or manually assigned by staff
3. Automatically sets `users.agent_id` to the correct staff record

**Pool Code format:** Alphanumeric string, no spaces. Example: `IB_TL_001`, `AGT_DUBAI_007`. There is no strict format requirement — use something meaningful for your team.

### Exceptions to Pool Code Requirement

The following account types are exempt from the Pool Code validation requirement and can be created or remediated without one:

- **Legacy Accounts**: Existing traders imported from prior systems before the IB model was enforced
- **Admin-Created Accounts**: Accounts created directly by SUPER_ADMIN or ADMIN staff for testing, staff accounts, or special partner relationships
- **Staff-Assigned Corrections**: Traders whose Pool Code or agent assignment must be manually corrected due to registration errors or business disputes. Use **Staff Management → Edit User** to assign the correct agent. This is the supported workflow for remediation.

**Creating a Pool Code:**

1. In Staff Management, click Edit on a staff member
2. In the Pool Code field, enter the desired code
3. Save — the code is now active
4. Pool Codes must be unique across all staff

**Sharing the Pool Code with traders:**

The Agent gives their Pool Code to traders before they register. Traders enter it in the "Verification Code" field on the registration form. The Agent can also share a direct registration URL:

```
auth.protrader.com/register?ref={pool_code}
```

When a trader registers via this URL, the pool_code field is pre-filled automatically.

**If a trader registers without a valid Pool Code:**

The registration API returns error `INVALID_POOL_CODE`. The trader must re-attempt registration with a valid code. Admins can manually assign an agent to an existing account via Staff Management → Edit User if a trader somehow registered without a code.

---

## 5. Commission Structure

### How commission is calculated

Commission is calculated on every trade open. Two records are inserted per trade (one for the Agent, one for their Team Leader):

```
trade_notional_cents = units × contract_size × open_rate_scaled × 100 / 100000

Where open_rate_scaled = open_rate × 100000 (e.g., 1.08500 = 108500)

agent_commission_cents = trade_notional_cents × agent.commission_rate_bps / 10000
tl_commission_cents    = trade_notional_cents × tl.override_rate_bps / 10000
```

**Example:**

- Agent commission rate: 20 bps (0.20%)
- Team Leader override rate: 5 bps (0.05%)
- Trade: BUY 10,000 units EURUSD at 1.08500
- Contract size (for this example): 1
- Notional: 10,000 × 1 × 1.08500 = $10,850
- Agent earns: $10,850 × 0.20% = **$21.70**
- Team Leader earns: $10,850 × 0.05% = **$5.43**

### Commission by asset class

The commission in the formula above is the IB commission (paid from the spread). In addition, the platform charges a separate transaction commission for non-forex asset classes:

| Asset Class | Platform Commission        | IB Commission                         |
| ----------- | -------------------------- | ------------------------------------- |
| Forex       | None (spread only)         | Percentage of notional per trade open |
| Indices     | $1.00 per lot per side     | Percentage of notional per trade open |
| Commodities | $1.50 per lot per side     | Percentage of notional per trade open |
| Stocks      | $0.02 per share per side   | Percentage of notional per trade open |
| Crypto      | 0.10% of notional per side | Percentage of notional per trade open |

Both commissions are applied at trade open. IB commissions are tracked in the `ib_commissions` table.

### Commission status

Commission records have two statuses:

- `PENDING` — earned but not yet paid out to the IB
- `PAID` — payout processed by Super Admin

---

## 6. Viewing Commissions — IB Portal

IB Agents and Team Leaders log in to `ib.protrader.com` using their staff credentials.

### Agent dashboard sections

**My Traders:**
Table showing all traders assigned to this Agent. Columns: Name, Account Number, Balance, Last Active, Total Trading Volume (all-time), Status.

**My Commissions:**
Paginated table of all commission records. Columns: Date, Trader, Symbol, Direction, Units, Notional, Commission Earned, Status (PENDING / PAID).

Filter by: date range, status (pending / paid), trader.

**Commission Summary:**

- Total lifetime commissions earned
- Total paid out
- Pending payout balance (amount awaiting disbursement)
- This month vs last month comparison chart

**Performance Chart:**
Bar chart showing daily/weekly/monthly commission earned. Toggle between periods.

### Team Leader dashboard (additional sections)

**My Agents:**
Table showing all Agents under this Team Leader. Columns: Agent Name, Number of Traders, Total Volume (month), Commissions Generated (month), Active Traders.

**Network Overview:**

- Total traders in entire network
- Total trading volume (all-time and MTD)
- Total commissions earned by the entire network
- Override commissions earned by Team Leader specifically

**Per-Agent Drilldown:**
Click any Agent to see their trader list and full commission detail — same view as the Agent's own dashboard.

---

## 7. Commission Payout Process

Commission payouts are processed manually by Super Admin. The platform does not automatically transfer funds to IBs.

**Monthly payout process:**

1. Super Admin navigates to admin panel → IB Management → Commission Payouts
2. Filter by period (e.g. previous calendar month)
3. Review total PENDING commission for each Agent and Team Leader
4. For each IB being paid:
   - Confirm payout amount with the IB
   - Process payment via agreed method (crypto, bank transfer, etc. — handled outside the platform)
   - Once payment is sent, mark commissions as PAID in admin panel: select all PENDING records for that IB → click "Mark as Paid"
   - Optionally record the payment reference in the notes field
5. The IB sees their commission status update to PAID in their portal

**Commission record update:**
When marked PAID, the `ib_commissions.status` changes to `PAID` and `paid_at` is set to the current timestamp.

---

## 8. Assigning and Reassigning Traders

**Assigning at registration:** Automatic — when a trader registers with a valid Pool Code, their `agent_id` is set automatically. No manual action required.

**Reassigning a trader:**

Traders can be reassigned between Agents only by Super Admin. This should be done only with documented business justification.

1. Navigate to admin panel → Users → find the trader
2. Click Edit
3. Change the "Assigned Agent" dropdown to the new Agent
4. Save — this immediately updates `users.agent_id`
5. All future trade commissions will go to the new Agent
6. Historical commissions already recorded remain with the original Agent

**Impact of reassignment:**

- New trades: commission goes to new Agent
- Open positions: commission already captured at open, not affected
- Historical records: unchanged

---

## 9. Monitoring Trader Activity

### From the IB Portal (Agent view)

For each trader, the Agent can see:

- Current balance and equity
- Open positions (instrument, direction, P&L)
- Last active date
- Total trading volume (lifetime and this month)
- KYC status (whether verified or pending)

**The Agent cannot:**

- Open or close trades on behalf of a trader
- Modify account settings or balances
- View trader's personal documents or KYC files
- See wallet addresses or withdrawal details

### Flagging a trader for compliance

If an Agent notices suspicious activity (large deposits, unusual trading patterns, multiple accounts), they should:

1. Note the trader's account number and the suspicious activity
2. Email Victor (Operations) with a brief description
3. Victor escalates to Krishantha (Legal) if necessary

Do not attempt to contact the trader directly about compliance concerns.

---

## 10. Common IB Operations Scenarios

| Scenario                                                | Action                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trader forgot their Pool Code                           | Agent provides their Pool Code again. Trader re-registers if they haven't completed registration, or contacts support if already registered.                  |
| Trader registered without a Pool Code                   | Super Admin edits the user record to set the correct agent_id.                                                                                                |
| Agent wants their Pool Code changed                     | Super Admin updates staff.pool_code. Old code immediately becomes invalid. New code must be shared with traders going forward.                                |
| Team Leader wants to see a specific Agent's performance | Accessible via IB Portal → My Agents → click the Agent name.                                                                                                  |
| Agent asks why commission is lower than expected        | Check the trade notional and the commission_rate_bps set on their staff record. Verify the calculation using the formula in Section 5.                        |
| Commission payout dispute                               | Super Admin can export commission records as CSV from admin panel → Reports for full audit trail.                                                             |
| Agent no longer active                                  | Super Admin sets staff.is_active = false. The Agent can no longer log in. Their traders remain assigned to them; reassign traders to active agents as needed. |
| Two agents claim the same trader                        | Check users.agent_id in the admin panel — one agent is recorded. Review registration Pool Code in the audit log to confirm.                                   |

---

## 11. IB Portal Login

IB Agents and Team Leaders log in at:

```
https://ib.protrader.com
```

Login uses the email and password set when their staff account was created. They use the same "Forgot Password" flow as traders (via the auth zone), sending a reset link to their registered email.

If a Team Leader or Agent is locked out or needs a password reset, Super Admin can trigger a reset from the staff management panel.

---

_ProTraderSim — PTS-IB-001 — IB Onboarding & Operations Guide — v1.0 — March 2026_
