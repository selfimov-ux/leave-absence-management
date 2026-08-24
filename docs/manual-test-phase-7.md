# Manual tests — Phase 7

Demo password after the bcrypt script: `TempPassword123!`

- Employee: `tbauer` (HR, Thomas Bauer)
- Manager: `eweber` (HR department manager, Elena Weber)
- Other employee: `jhoffmann` (IT, Julia Hoffmann)
- IT manager: `mklein`

## 1. Employee creates a valid leave request

1. Log in as `tbauer`.
2. Open `/leave-requests/new`.
3. Choose Erholungsurlaub, Monday–Wednesday in 2026, optional Bemerkung.
4. Expected: redirect to `/leave-requests`, status **Ausstehend**, Arbeitstage = 3.

## 2. Invalid date range is rejected

Begin after Ende.

Expected: German validation message, no new row.

## 3. Weekend-only request is rejected

Saturday–Sunday only.

Expected: no Arbeitstage, German error about Monday–Friday.

## 4. Overlapping pending request is rejected

Create a second pending request that overlaps the first.

Expected: HTTP 409 / German overlap message.

## 5. Overlapping approved request is rejected

Approve the first request as `eweber`, then as `tbauer` submit overlapping dates.

Expected: overlap error.

## 6. Employee cannot access another employee’s leave requests

`GET /api/leave-requests/me` as `tbauer` never includes Julia Hoffmann’s requests.

## 7. Employee can cancel only their own pending request

Cancel a pending own request: status **Storniert**, balance unchanged. Cancelling someone else’s id returns 403.

## 8. Manager sees only their department

`eweber` on `/manager/leave-requests` sees HR people (e.g. Thomas), not IT (`jhoffmann`). Own requests of Elena do not appear.

## 9. Manager cannot approve their own leave request

As `eweber`, create a request via `/leave-requests/new`. It must not appear in the department queue. Direct approve API on that id returns 403.

## 10. Approval updates status and used days

Approve Thomas’s Annual Leave. Status **Genehmigt**. `/leave-balances/me` as `tbauer` shows higher **Genommene Tage** and lower remaining days.

## 11. Rejection requires a reason and does not change balance

Reject another pending request with empty reason: blocked. With reason: **Abgelehnt**, used days unchanged.

## 12. Employee cannot call manager endpoints

As `tbauer`:

```bash
curl http://localhost:5000/api/manager/leave-requests -H "Authorization: Bearer EMPLOYEE_TOKEN"
```

Expected: HTTP 403.

## 13. Audit log

As administrator `aschmidt`:

```bash
curl http://localhost:5000/api/audit-logs -H "Authorization: Bearer ADMIN_TOKEN"
```

Expected: `CREATE_LEAVE_REQUEST`, `CANCEL_LEAVE_REQUEST`, `APPROVE_LEAVE_REQUEST`, `REJECT_LEAVE_REQUEST`.
