# Diaspora Outreach — Running Log

> Append-only log of every diaspora org touchpoint. Founder updates after each email send / call / reply. Source-of-truth for KPI `diaspora_orgs_engaged` (R-Q1-SA-004 + related items).
>
> KPI rule: counts increment ONLY when an intro call (30+ min, agenda-driven, both sides present) is completed. Email sent + no reply does NOT count.

## Schema (append rows in reverse-chronological order)

| Date | Org | Contact | Channel | Action | Outcome | Next step |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | HAF / Sewa / VHPA / ISKCON-USA / BAPS-USA / other | name + role | email / linkedin / call / WA | sent / replied / scheduled / completed-call / declined | brief 1-line | follow-up date + action |

---

## Active outreach (R-Q1-SA-004)

### Hindu American Foundation (HAF)

_No touchpoints logged yet — founder to send email per `R-Q1-SA-004-cold-email-haf.md` and update this log._

| Date | Contact | Channel | Action | Outcome | Next step |
|---|---|---|---|---|---|
| _pending_ | _lookup_ | email | _pending_ | _pending_ | _pending_ |

### Sewa International USA

_No touchpoints logged yet — founder to send email per `R-Q1-SA-004-cold-email-sewa.md` and update this log._

| Date | Contact | Channel | Action | Outcome | Next step |
|---|---|---|---|---|---|
| _pending_ | _lookup_ | email | _pending_ | _pending_ | _pending_ |

---

## Completed intro calls (KPI-counting events)

> Only rows here count toward `diaspora_orgs_engaged` KPI. Add row after each completed 30+ min call.

| Date | Org | Attendees (theirs + ours) | Duration (min) | Agenda covered | Outcome | Next step |
|---|---|---|---|---|---|---|
| _none yet_ | — | — | — | — | — | — |

**Running count toward Feb-28 target of 2**: 0 / 2

---

## Declined / dead leads

> Move rows here when org explicitly declines or thread goes dark after 3 follow-ups.

| Date | Org | Reason / final touchpoint |
|---|---|---|
| _none yet_ | — | — |

---

## Adjacent / future targets (do not actively pursue under R-Q1-SA-004)

- VHP America — separate diaspora item if scoped
- ISKCON-USA — overlaps with R-Q1-S-008 ISKCON track
- BAPS USA — covered under R-Q1-SA-002 + related BAPS items
- Art of Living USA
- Chinmaya Mission USA
- Vivekananda Vedanta Society chapters
- Indian Cultural Society chapters by metro (NYC / SF Bay / Houston / Chicago / Atlanta)

---

## Update process

1. Founder edits this file after each touchpoint.
2. Commit with subject `docs(sales): diaspora-outreach log update YYYY-MM-DD`.
3. Trailer: reference parent item `R-Q1-SA-004` if first send / last close.
4. KPI roll-up agent reads "Completed intro calls" table count to update item `kpi.current`.
