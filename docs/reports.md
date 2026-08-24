# Administrator reports — Phase 9

Read-only reports for administrators. Leave, sickness, authentication, and PDF-upload workflows are not changed.

## Schema

No database change. Reports join existing `leave_requests`, `sickness_absences`, `employees`, `departments`, `leave_types`, `users`, and `audit_logs`.

Certificate reports expose only `certificateAvailable` (true when `certificate_reference` matches a stored PDF name). Filename, path, and file contents are not returned.

## Report endpoints

All require JWT + `ADMINISTRATOR`.

| Path | Content |
| --- | --- |
| `GET /api/reports/leave` | Leave requests with optional `employeeId`, `departmentId`, `leaveTypeId`, `status`, `fromDate`, `toDate` |
| `GET /api/reports/sickness-absences` | Sickness absences with optional `employeeId`, `departmentId`, `absenceType`, `status`, `fromDate`, `toDate` |
| `GET /api/reports/absence-overview` | `APPROVED` leave plus sickness in `REPORTED`, `DOCUMENT_PENDING`, `VALIDATED`, `CLOSED`. Optional `recordType=LEAVE\|SICKNESS_ABSENCE` |

Response shape: `{ filters, total, records }`.

Date range uses overlap: the absence is included if it intersects `[fromDate, toDate]`. Open sickness (`end_date` null) uses the start date as the end of the interval.

## Activity log (separate from reports)

`GET /api/audit-logs` is administrator-only and paginated.

Query parameters: `userId`, `action`, `entityType`, `fromDate`, `toDate`, `page` (default 1), `pageSize` (default 20, maximum 100).

Response: `{ totalCount, page, pageSize, records }`. Each record has `id`, `timestamp`, `actorName` (employee full name when linked, otherwise username), `action`, `entityType`, `entityId`, `description`. No passwords, hashes, JWT, file paths, certificate names, or PDF data.

Frontend: `/admin/audit-logs` (**Aktivitätsprotokoll**). Not a tab on `/admin/reports`.

## Frontend reports

`/admin/reports` has exactly three tabs: Urlaubsbericht, Krankmeldungsbericht, Abwesenheitsübersicht. CSV export uses `Blob` and `URL.createObjectURL` with a semicolon separator and UTF-8 BOM.

## Limitations

No charts, no PDF report files, no payroll export, no cloud storage.
