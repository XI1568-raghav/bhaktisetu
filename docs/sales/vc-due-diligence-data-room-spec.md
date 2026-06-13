# VC Due Diligence Data Room Spec

> Pre-Series-A DD-ready data room. Investor secure access. Foundation for $1.5M-3M Series A close.

## Architecture

- **Platform**: Notion (initial), DocSend or Brex (post-Series-A)
- **Access**: Per-investor signed NDA + invite link
- **Tracking**: Per-investor activity log (which docs viewed + when)
- **Security**: 2FA + audit log + access expiration after 30 days

## Folder structure

```
Bhaktisetu Foundation Data Room/
├── 00_Executive_Summary/
│   ├── 1-page_overview.pdf
│   ├── pitch_deck_v3.pdf
│   ├── founder_bio.pdf
│   └── advisor_bios.pdf
├── 01_Financial/
│   ├── monthly_PnL_2026.xlsx
│   ├── revenue_projection_5yr.xlsx
│   ├── cap_table_v2.xlsx
│   ├── burn_rate_history.xlsx
│   ├── unit_economics_per_cohort.xlsx
│   └── tax_filings_FY26.pdf
├── 02_Operations/
│   ├── pandit_network_status.pdf
│   ├── temple_partnerships.pdf
│   ├── customer_metrics_dashboard.pdf
│   ├── monthly_KPI_history.xlsx
│   ├── churn_analysis.pdf
│   └── operational_SLA_compliance.pdf
├── 03_Technical/
│   ├── api_documentation_v1.pdf
│   ├── architecture_diagrams.pdf
│   ├── code_review_summary.pdf
│   ├── security_audit.pdf
│   ├── infrastructure_overview.pdf
│   └── tech_team_resumes.pdf
├── 04_Legal/
│   ├── section_8_incorporation.pdf
│   ├── 80G_certificate.pdf
│   ├── GST_registration.pdf
│   ├── TDS_filings_FY26.pdf
│   ├── trademark_registry.pdf
│   ├── DPDP_compliance_audit.pdf
│   ├── vendor_DPA_agreements.pdf
│   ├── pandit_contract_template.pdf
│   ├── temple_master_agreement.pdf
│   └── insurance_policies.pdf
├── 05_Investor_Updates/
│   ├── monthly_investor_email_history.pdf
│   ├── quarterly_review_decks.pdf
│   ├── KPI_dashboard_screenshots.pdf
│   └── pre_seed_investor_list.pdf
├── 06_References/
│   ├── customer_testimonials/
│   ├── pandit_references/
│   ├── advisor_letters/
│   └── press_coverage/
├── 07_Future/
│   ├── series_A_use_of_funds.pdf
│   ├── 18_month_plan.pdf
│   ├── 5_year_vision.pdf
│   ├── product_roadmap.pdf
│   └── hiring_plan.pdf
└── 08_Q&A/
    └── frequently_asked_questions.pdf
```

## Per-document requirements

### Executive Summary (00)
- Updated quarterly minimum
- 1-page version for quick scan
- Full pitch deck for detailed read
- Founder + advisor bios with photos + LinkedIn URLs

### Financial (01)
- Monthly P&L with 3-month forward projection
- Per-cohort unit economics (NRI vs domestic)
- Cap table showing all pre-seed signers + projected dilution at Series A
- Burn rate history showing default-alive trajectory
- Tax filings verified by CA (per R-Q3-F-003)

### Operations (02)
- Pandit network roster (count + verified status + cities)
- Temple partnerships (signed LoIs + pilot status)
- Customer metrics screenshot from /admin/customer-success
- Monthly KPI history (12+ months ideal)
- Churn analysis with cohort breakdown
- Operational SLA compliance report (uptime + video proof delivery + etc.)

### Technical (03)
- API documentation (per R-Q2-E-001 OpenAPI 3.1)
- Architecture diagrams (database + services + integrations)
- Code review summary (LOC + module structure + tech debt)
- Security audit report (annual independent firm)
- Infrastructure overview (Render + Supabase + CF Pages)
- Tech team resumes (founder + contractors + advisors)

### Legal (04)
- Section 8 incorporation papers
- 80G certificate (current valid)
- GST registration documents
- TDS filings (Form 26AS available)
- Trademark registry (per R-Q3 IP strategy)
- DPDP compliance audit (Grievance Officer designation + DSAR endpoints)
- Vendor DPA agreements (Razorpay, Stripe, Resend, etc.)
- Pandit + temple master agreements
- Insurance policies (cyber + E&O + D&O + others)

### Investor Updates (05)
- All monthly investor emails sent to pre-seed cohort
- Quarterly review decks
- KPI dashboard screenshots showing growth trajectory
- Pre-seed investor list with check sizes + commit dates

### References (06)
- 5-10 customer testimonials (signed permissions)
- 3-5 pandit network references
- Advisor letters of support
- Press coverage from launch + funding announcements

### Future (07)
- Use of funds for $1.5M-3M Series A
- 18-month plan post-Series A
- 5-year vision document
- Product roadmap (Q1 2027 to Q4 2027 detailed)
- Hiring plan (4 contractors → 8-10 hires post-Series A)

### Q&A (08)
- Frequently asked questions document (per docs/product/founder-faq-100-questions.md)

## Per-investor access flow

1. Founder + investor sign NDA (template provided)
2. Investor receives unique data room invite link
3. Investor accesses with 2FA
4. 30-day access window
5. Activity log captured (which docs accessed + when)
6. Renewable upon serious interest

## Investor Q&A management

- All investor questions logged in single shared doc
- Founder responds within 48 hours
- Common Q&A becomes Q&A document for future investors
- Quarterly Q&A document update

## Customer reference call coordination

For seriously-interested investors (post-pitch-meeting):
- 2-3 customer references (1 NRI + 1 India + 1 enterprise where applicable)
- 1-2 advisor references
- Founder schedules + facilitates 30-min calls
- Customer + advisor consents documented
- Per-investor reference list maintained

## Security audit (annual)

- External firm assessment (₹2-3L Q3 + Q1 2027 annual)
- Findings documented + remediation plan
- Investor-shared security audit summary
- Pen test report for tech team review

## Annual data room maintenance

- Founder quarterly review of all documents
- Update outdated financials + metrics
- Add new agreements + policies as established
- Archive completed milestones
- Annual independent legal counsel review of data room contents

## Investor closing acceleration

Well-organized data room can reduce Series A closing by 30-60 days:
- Investor confidence (organized founder = good operator)
- Faster DD completion
- Reduced legal back-and-forth
- Cleaner negotiations

## Cost summary

- Notion paid plan: $8/mo (for advanced sharing controls)
- DocSend (post-Series-A): $45/mo
- Security audit: ₹2-3L annual
- Counsel data room review: ₹50K Q3
- Total: ₹2.5-3.5L for full data room setup
