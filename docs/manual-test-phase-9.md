# Manual tests — Phase 9

Demo password: `TempPassword123!`

- Administrator: `aschmidt`
- Manager: `eweber`
- Employee: `tbauer`

Restart the API so the paginated audit-log route is loaded.

## 1. Administrator opens reports

Log in as `aschmidt`, dashboard **Berichte** → `/admin/reports`. Exactly three tabs: **Urlaubsbericht**, **Krankmeldungsbericht**, **Abwesenheitsübersicht**. There is no Prüfprotokoll tab.

## 2. Leave report filters

Filter by employee, department, leave type, status, from/to. Table updates. Invalid API dates (curl with `fromDate=abc`) return a German 400 message.

## 3. Sickness report hides certificate files

Krankmeldungsbericht shows **Ja**/**Nein** for Bescheinigung. JSON has `certificateAvailable` only — no filename, path, or PDF.

## 4. Absence overview

Tab shows only genehmigten Urlaub and Krankmeldungen with status Gemeldet, Dokument ausstehend, Validiert, or Abgeschlossen. Rejected leave/sickness do not appear. Filter **Nur Urlaub** / **Nur Krankmeldung**.

## 5. CSV export

With rows visible, **CSV exportieren**. A `.csv` file downloads. Open in a spreadsheet: German headers, semicolon-separated. Sickness CSV has Ja/Nein, not a file path.

## 6. Activity log page and pagination

Dashboard **Aktivitätsprotokoll** → `/admin/audit-logs`. Title **Aktivitätsprotokoll**. Table has Zeitpunkt, Benutzer, Aktion, Entität, ID, Beschreibung. Default 20 rows. Use **Weiter** / **Zurück** and confirm **Seite X von Y**. `GET /api/audit-logs?page=1&pageSize=20` returns `{ totalCount, page, pageSize, records }`. `pageSize=101` returns a German 400.

## 7. Activity log filters

Filter Benutzer, Aktion, Entität, Zeitraum von/bis. Results update and page resets to 1. Invalid `userId=abc` or `fromDate=nein` via curl returns German 400.

## 8. Non-admin access denial

As `eweber` or `tbauer`, open `/admin/audit-logs` and `/admin/reports`: redirect to `/dashboard`. `GET /api/audit-logs` and `GET /api/reports/leave` with their JWT: 403.

## 9. Sensitive data not in audit output

Inspect `GET /api/audit-logs` JSON. There is no `password`, `password_hash`, token/JWT, file path, certificate filename, or PDF content. Actor is a display name or username only.

## 10. Existing workflows unchanged

Submit a leave request and a sickness report. Approve/validate still work. PDF upload/download still follow owner/admin rules.
