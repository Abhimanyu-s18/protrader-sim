# ⚠️ Leverage Limits Compliance Update Log

**Status**: Append-only audit trail (immutable)  
**Last Updated**: April 16, 2026  
**Maintainer**: Compliance Officer  
**Review Cycle**: Quarterly (Q1, Q2, Q3, Q4) + Emergency 48-hour updates on regulatory announcements

---

## 📝 Entry Schema

Each entry must include the following fields:

| Field                  | Type     | Description                                                                                                                                                                                                                                                                          | Required |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Timestamp**          | ISO 8601 | When the change was made (UTC timezone)                                                                                                                                                                                                                                              | ✅       |
| **ChangeType**         | Enum     | Type of change: `REGULATION_UPDATE`, `LIMIT_ADJUSTMENT`, `FRAMEWORK_ADD`, `FRAMEWORK_REMOVE`, `OVERRIDE_POLICY`, `EMERGENCY_PATCH`                                                                                                                                                   | ✅       |
| **Summary**            | String   | 1-line description of the change (e.g., "Updated ASIC crypto leverage from 5:1 to 10:1")                                                                                                                                                                                             | ✅       |
| **RegulatorReference** | String   | Regulatory source or citation. Must include the original URL or citation **and** an archival reference (Internet Archive URL or local PDF path under `docs/Compliance & Operations/`). Example: `"ESMA 22/1216 — https://esma.europa.eu/... — archive: https://web.archive.org/..."` | ✅       |
| **ImpactAssessment**   | Object   | Structured impact object with keys: `jurisdictions` (array of strings), `asset_classes` (array of strings), `notes` (optional string). Example: `{ "jurisdictions": ["EU","UK"], "asset_classes": ["FOREX","CRYPTO"], "notes": "..." }`                                              | ✅       |
| **Reviewer**           | String   | Name/email of compliance officer who approved                                                                                                                                                                                                                                        | ✅       |
| **Attachments**        | String   | Optional: link to change ticket (COMP-2026-001), approval email, code commit hash                                                                                                                                                                                                    | ⭕       |

---

## 📋 Edit Policy

**⚠️ WARNING**: This file is **append-only**. Entries must NEVER be modified or deleted inline.

**Authorized actions**:

- ✅ **APPEND** new entries at the end (add before the next quarterly review)
- ✅ **ADD COMMENTS** inline (mark with `<!-- -->`) to clarify context
- ❌ **NO EDITING** of existing entries (corrections require new entry)
- ❌ **NO DELETIONS** (regulatory requirement for audit trail)

**Technical enforcement**:

- **Pre-commit hook** (`.githooks/pre-commit`): Rejects any commit that modifies or deletes existing lines in this file; only diffs that append at EOF are accepted. Enable with: `git config core.hooksPath .githooks`
- **CI job** (`validate-append-only` in `.github/workflows/ci.yml`): Compares this file against the base branch HEAD and fails if any pre-existing lines were edited or removed.
- **Branch protection**: Enable "Require pull request reviews" on `main` and add this file to `.github/CODEOWNERS` so compliance team approval is mandatory before any merge touching this file.

**Before first quarterly review**: Compliance Officer must audit all entries and produce a summary report.

---

## 🔄 Entry History

### Entry #1: Initial System Deployment

- **Timestamp**: 2026-04-16T00:00:00Z _(effective date of deployment; midnight UTC represents the agreed compliance effective date, not the exact deployment time)_
- **ChangeType**: `FRAMEWORK_ADD`
- **Summary**: Leverage limits system deployed with 7 regulatory frameworks (EU, UK, US, ASIC, DFSA, FSA Seychelles, FSC Mauritius)
- **RegulatorReference**:
  - ESMA 22/1216 (MiFID II leverage caps) — https://www.esma.europa.eu/document/esma22-1216 — archive: https://web.archive.org/web/20260415000000/https://www.esma.europa.eu/document/esma22-1216
  - FCA Handbook COBS 5R (UK leverage limits) — https://www.handbook.fca.org.uk/handbook/COBS/5/ — archive: https://web.archive.org/web/20260415000000/https://www.handbook.fca.org.uk/handbook/COBS/5/
  - CFTC Regulation 190.10 (US leverage limits) — https://www.ecfr.gov/current/title-17/chapter-I/part-190/section-190.10 — archive: https://web.archive.org/web/20260415000000/https://www.ecfr.gov/current/title-17/chapter-I/part-190/section-190.10
  - ASIC RG 207 (Australian leverage limits) — https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-207-credit-licensing-responsible-lending-conduct/ — archive: https://web.archive.org/web/20260415000000/https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-207-credit-licensing-responsible-lending-conduct/
  - DFSA Rules 2020 (Dubai leverage limits) — https://rulebook.dfsa.ae/ — archive: https://web.archive.org/web/20260415000000/https://rulebook.dfsa.ae/
  - Seychelles FSA (offshore framework) — https://fsaseychelles.sc/regulated-activities/capital-markets — archive: https://web.archive.org/web/20260415000000/https://fsaseychelles.sc/regulated-activities/capital-markets
  - Mauritius FSC (offshore framework) — https://www.fscmauritius.org/en/regulation/acts-and-rules — archive: https://web.archive.org/web/20260415000000/https://www.fscmauritius.org/en/regulation/acts-and-rules
- **ImpactAssessment**:
  - jurisdictions: `["EU", "UK", "US", "ASIC", "DFSA", "FSA_SEYCHELLES", "FSC_MAURITIUS"]`
  - asset_classes: `["FOREX", "STOCKS", "INDICES", "COMMODITIES", "CRYPTO"]`
  - notes: "All traders across all 7 jurisdictions; initial system deployment establishing baseline leverage limits"
- **Reviewer**: Chief Compliance Officer (ProTraderSim)
- **Attachments**:
  - GitHub PR: [LEVERAGE_SYSTEM_001](https://github.com/krishan/protrader-sim/pull/1)
  - Commit: `af4f3be`
  - Approval ticket: `COMP-2026-001`

---

## 🚀 Next Review

**Scheduled**: Q3 2026 (July 15, 2026)

**Checklist**:

- [ ] Audit all entries for completeness
- [ ] Verify each entry has required fields
- [ ] Confirm regulatory sources are still accurate
- [ ] Identify any missing changes from regulatory announcements
- [ ] Produce compliance summary report
- [ ] Sign-off by Legal Counsel and Chief Compliance Officer
