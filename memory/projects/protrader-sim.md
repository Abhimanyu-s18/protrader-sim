# ProTraderSim

**Simulation-only paper-trading platform** — No real money, no live payments, regulatory-exempt demo environment. See [Regulatory Compliance](#regulatory-compliance-and-licensing) for details.

## Regulatory Compliance and Licensing

### Jurisdictional Scope

Platform targets retail traders in offshore jurisdictions (e.g., Seychelles, Mauritius, Vanuatu) for CFD simulation trading demo/educational accounts. **This product is simulation/educational-only and does not accept real money.** Any future transition to live-money trading would be a separate product roadmap item requiring full legal and jurisdictional approvals, banking partnerships, and regulatory licensing.

> **TODO**: Consult legal counsel before any live-money deployment. Licensing requirements for live trading must be assessed by qualified legal counsel in each target jurisdiction.

### Applicable Regulations

- **MiFID II / ESMA** — Reference for best execution and product governance (applied to simulation logic even if not directly applicable)
- **FCA / SEC** — Not applicable to offshore demo platform; no live customer funds
- **Local consumer protection** — Basic fair dealing principles followed

### AML/CTF Controls

- **Simulation accounts**: No real identity documents collected; simulation accounts use pseudonymized identifiers (email + auto-generated usernames) only
- **No real money handling**: Standard AML/CTF obligations do not apply
- **Data stored**: Encrypted email addresses and simulated KYC metadata (status only) stored in Cloudflare R2; no scanned IDs, passports, or real KYC artifacts
- **Metadata retention**: Simulated KYC metadata retained for 30–90 days per regulatory requirements (not real KYC documents)
- **If live money added**: Full KYC/AML compliance required per applicable regulations, including document collection, verification, and 3-year retention

### Licensing Status

- **Current**: No licenses obtained — not required for simulation-only platform
- **If live money added**: Would require respective jurisdictional license (FCA, CySEC, etc.)

### Legal Counsel Review

**Required before launch** — Legal counsel sign-off obtained: [YES/NO/Date]

- **Owner**: Product Legal or Compliance
- **Approval artifact**: Counsel name, date, and link to signed review (required before any deployment)
- **Manual approval gate**: Deployment team must verify the sign-off field = "YES" and review counsel artifact before pushing to staging/production. This is a human-enforced gate; no automated CI/CD block yet (GitHub Actions enforcement TODO — see ticket #DEPLOY-001)

> **Additional review required** before any live-money transition for financial services licensing.

## Completion Status (~75%)

| Area                        | Status      |
| --------------------------- | ----------- |
| API (63 endpoints)          | ~90% done   |
| Auth app                    | Done        |
| Platform app                | Done        |
| Admin app                   | Done        |
| IB portal                   | Done        |
| Email system (15 templates) | Done        |
| Web marketing site          | In progress |
| Workers (4/9)               | Partial     |

## Completed Workers

- **rollover** — Daily rollover processing (swap charges)
- **email** — Transactional email delivery via Resend
- **notification** — In-app notification delivery
- **kyc-reminder** — Daily KYC submission reminders

## Missing Workers

- **alert-check** — Evaluate alert rules and emit notifications
- **entry-order-expiry** — Expire and cancel pending entry orders after timeout
- **deposit-confirm** — Simulate crypto deposit confirmations and credit virtual user accounts (simulation-only; no real payments)
- **pnl-snapshot** — Take periodic P&L snapshots for reporting and reconciliation
- **report-generator** — Generate scheduled reports from snapshots

## Apps & Ports

| App       | Port | Description              |
| --------- | ---- | ------------------------ |
| web       | 3000 | Public marketing site    |
| auth      | 3001 | Login / Register / KYC   |
| platform  | 3002 | Trading dashboard        |
| admin     | 3003 | Back-office              |
| ib-portal | 3004 | IB Agent portal          |
| api       | 4000 | Express REST + Socket.io |

## Key External Services

- **NowPayments** — Crypto deposit/withdrawal processing (**simulated only for demo; disabled in production**) <!-- NowPayments selected for crypto payment processing due to no-KYC API access, competitive fees, and IPN webhook support. -->
- **Twelve Data** — Real-time market data WebSocket
- **Resend** — Transactional email delivery
- **Cloudflare R2** — KYC document storage

### Security & Data Protection

#### Encryption

- **At-rest**: All data stored in Cloudflare R2 (KYC documents) uses server-side encryption with S3-compatible API. Customer files are encrypted before storage.
- **In-transit**: All external service connections (Twelve Data WebSocket, Resend API, Cloudflare R2) use TLS 1.2+. Internal API communication between services uses HTTPS.

#### Access Control

- **KYC/payment data access (simulated)**: Restricted to admin users with `admin:read:kyc` permission. `admin:read:payments` is a placeholder/mock permission for future payment integration — no real payment data is stored or processed in the current simulation-only build.
- **Role-based access**: Platform uses role-based permissions (user, ib, admin). KYC documents only accessible by verification staff
- **NowPayments data (simulation-only)**: Payment transaction records are mock/simulated; no real payment data exists in the system

#### Data Retention & Deletion

- **KYC documents (simulation accounts)**: Retained for up to 30–90 days after account closure for fraud prevention and account recovery, then securely deleted. Rationale: GDPR Article 5(1)(e) storage limitation; platform is simulation-only and does not require multi-year retention.
- **Transaction logs**: Retained for 90 days for audit and fraud-prevention purposes. Rationale: Simulation-only platform with no regulatory audit requirements; shorter retention aligns with demo account lifecycle. If transitioning to live-money platform, extend to 5+ years per applicable financial regulations.
- **User data**: Deletion requests processed within 30 days via hard-delete from all stores (R2, database)

#### Compliance Regimes

- **GDPR/CCPA** (scoped to simulation data):
  - **Data collected**: Email addresses only for demo account creation and notifications
  - **Controls**: Basic data protection (deletion, portability) for email data only
  - **Full regulatory compliance**: Only enforced if sensitive personal data is collected in future
  - **Vendor agreements**: DPAs in place with Resend (email), Twelve Data (market data), Cloudflare (assets)
  - **Note**: Full GDPR/CCPA controls with audit trails and data subject rights will be implemented when/if sensitive PII is collected

#### Security Audits

- **Penetration testing**: Annual third-party pen test (last: Q1 2025; next due: Q1 2026). Penetration testing not yet conducted. Schedule before production launch.
- **Vulnerability scanning**: Monthly automated scans via cloud-native tools
- **Code security review**: Part of PR pipeline (static analysis)

#### Backup & Disaster Recovery

- **Database**: Automated daily backups with 30-day retention (point-in-time recovery enabled)
- **Cloudflare R2**: Versioning enabled for simulated KYC metadata; cross-region replication not yet configured
  - **Retention policy**: KYC metadata retained for 30–90 days per regulatory/business requirements (separate from backup window)
  - **Backup window**: 30-day backup retention for disaster recovery (independent of retention policy)
  - **TODO**: Configure cross-region replication to meet compliance and disaster recovery requirements
- **RTO/RPO**: Target 4-hour recovery time objective, 1-hour recovery point objective
- **Disaster recovery plan**: Documented; annual failover test scheduled

> **Examples**: Cloudflare R2 applies to encryption and backup controls; NowPayments/Twelve Data fall under access control and data retention policies for transaction/market data logs.

> **Note**: As a simulation-only platform, no real money flows through any external service. NowPayments deposits are simulated with mock confirmations. If transitioning to live-money trading, full regulatory licensing and AML/CTF compliance would be required.
