# Leave-request workflow

This document describes Phase 7: employees submit leave requests, and assigned department managers approve or reject them. Sickness absences are out of scope.

## Lifecycle

1. An authenticated user submits a request for **themselves only** (`POST /api/leave-requests`).
2. The API counts **Monday–Friday working days**, stores `requested_days`, and sets status `PENDING`.
3. Leave **balance is not reduced** while the request is pending.
4. The employee may **cancel** a pending request (`CANCELLED`). Balance stays unchanged.
5. The **department manager** (`departments.manager_id`) may **approve** or **reject** a pending request from someone else in that department.
6. Approval sets `APPROVED`, stores `reviewer_id` and `reviewed_at`, and **adds `requested_days` to `leave_balances.used_days`** for Annual Leave.
7. Rejection sets `REJECTED` with a required `rejection_reason`. Balance is unchanged.

Status labels in the UI: Ausstehend, Genehmigt, Abgelehnt, Storniert.

## Working-day calculation

Days are counted from start date through end date inclusive. Saturday and Sunday are skipped. **Public holidays are not subtracted.** A weekend-only range yields zero working days and is rejected.

Requests that cross a calendar-year boundary are rejected in this phase so a single `leave_balances.calendar_year` row can be used.

## Role restrictions

- Any authenticated employee, manager, or administrator may create and list **their own** requests and balances.
- Cancel is allowed only for **own PENDING** requests.
- `GET/PATCH /api/manager/leave-requests...` requires role **`MANAGER`**.
- Administrators **cannot** approve through manager endpoints unless their user role is `MANAGER` (the seeded administrator is not).
- Managers only see requests in departments where `departments.manager_id` is their employee id, excluding themselves.

## Approval transaction

Approve runs in one PostgreSQL transaction:

1. Lock the leave request (`FOR UPDATE`).
2. Confirm `PENDING`, department assignment, and not self.
3. Recheck overlap with other `PENDING`/`APPROVED` requests.
4. For Annual Leave, lock the balance and check remaining days.
5. Set `APPROVED`, reviewer, timestamp.
6. Increase `used_days`.
7. Insert the audit row.
8. Commit, or roll back on any error.

Remaining days: `annual_allowance + adjusted_days - used_days`.

Annual Leave is recognised by the leave-type name `Annual Leave` (seed data). Other types do not change `used_days` on approval.

## Audit logging

Create, cancel, approve, and reject insert `audit_logs` rows for the acting user. Approve/reject/create/cancel wrap the audit insert in the same transaction as the status change.

## Limitations

- No public-holiday calendar
- No payroll or ERP posting
- No sickness workflow in this phase
- No deletion of leave requests
- No automatic balance rows when an administrator creates an employee
- Leave-type names in the database remain English; the UI maps known names to German
