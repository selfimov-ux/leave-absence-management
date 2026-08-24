# Manual tests — Phase 8

Demo password: `TempPassword123!`

- Employee: `tbauer`
- Manager: `eweber`
- Administrator: `aschmidt`
- Other department: `jhoffmann`

Note remaining days on `/leave-balances` before sickness tests.

## 1. Report without end date

As `tbauer`, `/sickness-absences/new`, Krankmeldung, Beginn today, Ende empty. Expected: list shows **Gemeldet**, Ende **—**.

## 2. Employee later adds an end date

**Bearbeiten**, set Ende >= Beginn, save. Expected: end date shown.

## 3. End date before start is rejected

Set Ende before Beginn. Expected: German error.

## 4. Leave balance unchanged

`/leave-balances` remaining days equal the note from before the sickness report.

## 5. Manager can view, cannot validate

As `eweber`, `/manager/sickness-absences` shows HR people, not **Validieren**. `PATCH /api/admin/sickness-absences/:id/validate` with manager token: 403.

## 6. Employee cannot open manager/admin sickness routes

As `tbauer`, `/manager/sickness-absences` and `/admin/sickness-absences` redirect to `/dashboard`.

## 7. REPORTED → DOCUMENT_PENDING

As `aschmidt`, **Dokument anfordern**. Status **Dokument ausstehend**.

## 8. Administrator validates a completed absence

Record with end date, **Validieren**. Status **Validiert**. Balance still unchanged.

## 9. Cannot validate without end date

Report a new absence without end date; **Validieren**. Expected: German error about Endedatum.

## 10. Rejection requires a reason

**Ablehnen** with empty Begründung blocked; with text → **Abgelehnt**.

## 11. Close VALIDATED

**Abschließen** on a validated row → **Abgeschlossen**.

## 12. Overlapping validated absences

Validate one period, try to validate another overlapping period for the same employee. Expected: 409 overlap message.

## 13. Audit log

`GET /api/audit-logs` as `aschmidt` contains report, update, document request, validate, reject, and close actions.
