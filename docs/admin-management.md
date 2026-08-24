# Administrator management

This document describes Phase 6: administrator maintenance of employees, departments, and leave types. Leave-request and sickness workflows are out of scope.

## Schema compatibility

The existing tables are reused. No SQL schema change is required.

- Each **employee** has exactly one **user** (`employees.user_id`).
- **Email**, **username**, **role**, and **active flag** live on `users`.
- **Employee number**, names, **hire date**, **department**, and optional **manager** live on `employees`.
- There is **no `job_title` column**. The form still collects “Position”, but the API does not persist it.
- **Leave types** have `name`, `description`, `is_paid`, and `is_active`. There is **no annual limit on `leave_types`**. Yearly allowance is stored per employee in `leave_balances`. The UI shows this limitation instead of inventing a column.
- **Audit logs** store `user_id`, `action`, `entity_type`, `entity_id`, and `description`.

## Role restrictions

| Endpoint group | Who |
| --- | --- |
| `GET /api/departments`, `GET /api/leave-types` | Any authenticated user |
| Department write/delete, leave-type write/status, all employee endpoints, `GET /api/audit-logs` | JWT + role `ADMINISTRATOR` |
| `/admin/*` pages | Frontend: `AdminRoute` redirects others to `/dashboard` |

## API endpoints

### Departments

- `GET /api/departments` — list with manager name
- `GET /api/departments/:id`
- `POST /api/departments` — `{ "name", "description", "managerId" }`
- `PUT /api/departments/:id`
- `DELETE /api/departments/:id` — blocked if any employees are assigned (HTTP 409, German message)

### Leave types

- `GET /api/leave-types`
- `POST /api/leave-types` — `{ "name", "description", "isActive" }`
- `PUT /api/leave-types/:id`
- `PATCH /api/leave-types/:id/status` — `{ "isActive": true|false }`

`annualLimit` is always `null` in JSON because the column does not exist.

### Employees

- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees` — creates `users` and `employees` in one transaction
- `PUT /api/employees/:id` — updates user + employee in one transaction; does not change the password
- `PATCH /api/employees/:id/status` — `{ "isActive": true|false }` on `users.is_active`; an administrator cannot deactivate their own employee record

Password hashes are never returned.

### Audit logs

- `GET /api/audit-logs` — last 50 rows, administrator only

## Input validation

- Required names, unique department/leave-type names, unique username/email/employee number
- Valid email, role in `EMPLOYEE | MANAGER | ADMINISTRATOR`
- Initial password at least 8 characters
- `managerId` must be an existing employee and not the same employee
- German messages for validation and conflict errors

## Transactions

Creating an employee:

1. `BEGIN`
2. `INSERT INTO users` with a bcrypt hash
3. `INSERT INTO employees` referencing the new user
4. `COMMIT` or `ROLLBACK` on error

Updates of user and employee rows use the same pattern.

## Audit logging

After a successful write, the API inserts an `audit_logs` row for the authenticated administrator. If that insert fails, the business change is **not** rolled back. The failure is written to the server log. Administrative work must not be undone because the trail could not be stored.

## Project limitations

- No payroll, legal, or ERP integration
- No password reset in this phase
- Job title is not stored
- Annual leave limits are not stored on the leave-type master data
- Reports page is a placeholder
- `localStorage` JWT remains a student-project session model
