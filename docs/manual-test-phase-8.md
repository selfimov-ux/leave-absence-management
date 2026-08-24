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

## 14. PDF upload — valid fictional file

Create a local dummy PDF (not real medical data), e.g. empty file saved as `fiktive-bescheinigung.pdf` from a PDF printer or a one-page text PDF. As `tbauer`, attach it on `/sickness-absences/new` or via:

`POST /api/sickness-absences/:id/certificate` with JWT and `-F certificate=@fiktive-bescheinigung.pdf;type=application/pdf`.

Expected: `hasCertificateFile` true in JSON, no disk path and no original filename in the response. Employee list shows **Bescheinigung anzeigen**.

## 15. PDF upload — invalid type

Upload a `.png` or `.txt` as `certificate`. Expected: German message that only PDF files are allowed.

## 16. PDF upload — missing file

`POST /api/sickness-absences/:id/certificate` with employee JWT and no `certificate` part. Expected: German message asking to upload a PDF.

## 17. PDF upload — oversized file

Upload a PDF larger than 5 MB. Expected: German message that the file may be at most 5 MB.

## 18. PDF upload — employee ownership

As `jhoffmann`, `POST /api/sickness-absences/:id/certificate` for `tbauer`'s record. Expected: 403 German unauthorized message. Same for `GET .../certificate`.

## 19. PDF download — administrator access

As `aschmidt`, `GET /api/sickness-absences/:id/certificate` for the employee record. Expected: 200, `Content-Type: application/pdf`. Admin UI **Bescheinigung anzeigen** opens the PDF.

## 20. PDF download — manager denial

As `eweber`, `GET /api/sickness-absences/:id/certificate` for `tbauer`. Expected: 403. Manager UI has no working preview/download of the file.

## 21. Git exclusion

`server/.gitignore` contains `uploads/sickness-certificates/*`. After an upload, `git status` must not list the generated PDF. Only `.gitkeep` is tracked.
