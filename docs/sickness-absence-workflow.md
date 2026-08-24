# Sickness absence workflow

This document describes Phase 8. Sickness absences are stored in `sickness_absences` and are **never** written to `leave_balances` or `leave_requests`.

## Lifecycle

1. An authenticated user reports an absence for **themselves** (`REPORTED`). An end date may be omitted.
2. While `REPORTED` or `DOCUMENT_PENDING`, the employee may edit end date, certificate file (PDF or image), and their note.
3. Administrators may set `DOCUMENT_PENDING` (request a certificate). Employees can then upload a PDF or image.
4. Administrators **validate** (`VALIDATED`) only if a final end date exists and the period does not overlap another `VALIDATED` absence for that employee. `validation_user_id` and `validated_at` are set.
5. Administrators may **reject** open records (`REJECTED`) with a required note; validation user and timestamp are stored to satisfy the existing CHECK constraint.
6. Administrators **close** (`CLOSED`) only `VALIDATED` records that have an end date.

## Responsibilities

| Role | What they can do |
| --- | --- |
| Employee / any logged-in person on their own record | Report, list own, edit open own records |
| Manager (`departments.manager_id`) | Read-only list of department absences, excluding themselves |
| Administrator | List all, document-pending, validate, reject, close |

Managers have **no** validate/reject/close/edit-other APIs.

## Why leave balance is unchanged

Sickness and care leave are not vacation. The schema keeps them in a separate table with no foreign key to `leave_balances`. This phase does not `UPDATE leave_balances` anywhere.

## Validation rules

- Types: `SICK_LEAVE`, `CARE_LEAVE`
- End date optional at report; if present, `end_date >= start_date`
- Overlap against other **VALIDATED** rows only when an end date is present
- Validate requires end date
- Close requires `VALIDATED` and end date
- `certificate_reference` stores a short local filename when a PDF or image was uploaded (still `VARCHAR(100)`, no schema change). Files live in `server/uploads/sickness/` and are served only to the employee, department manager, or administrator.

## Audit

Actions: `REPORT_SICKNESS_ABSENCE`, `UPDATE_SICKNESS_ABSENCE`, `REQUEST_SICKNESS_DOCUMENT`, `VALIDATE_SICKNESS_ABSENCE`, `REJECT_SICKNESS_ABSENCE`, `CLOSE_SICKNESS_ABSENCE`.

## Limitations and future work

Out of scope: payroll, continued-pay rules, eAU/health-insurance, legal deadlines, and ERP posting. Future work could add holiday calendars and works-council workflows.
