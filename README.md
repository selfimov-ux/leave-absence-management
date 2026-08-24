# Leave and Absence Management

Web application for the bachelor thesis: employees can request leave and report absences; managers and administrators review and administer them.

## Project layout

- `/client` — React frontend
- `/server` — Express API and SQL scripts
- `/docs` — design notes

## Available API endpoints

| Method | Path | Access |
| --- | --- | --- |
| GET | `/` | Public. API title. |
| GET | `/api/health` | Public. Process health. |
| GET | `/api/health/database` | Public. PostgreSQL check. |
| GET | `/api/departments` | JWT required. Department list. |
| GET | `/api/departments/:id` | JWT + `ADMINISTRATOR`. |
| POST | `/api/departments` | JWT + `ADMINISTRATOR`. |
| PUT | `/api/departments/:id` | JWT + `ADMINISTRATOR`. |
| DELETE | `/api/departments/:id` | JWT + `ADMINISTRATOR`. |
| GET | `/api/leave-types` | JWT required. |
| POST | `/api/leave-types` | JWT + `ADMINISTRATOR`. |
| PUT | `/api/leave-types/:id` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/leave-types/:id/status` | JWT + `ADMINISTRATOR`. |
| GET | `/api/employees` | JWT + `ADMINISTRATOR`. |
| GET | `/api/employees/:id` | JWT + `ADMINISTRATOR`. |
| POST | `/api/employees` | JWT + `ADMINISTRATOR`. |
| PUT | `/api/employees/:id` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/employees/:id/status` | JWT + `ADMINISTRATOR`. |
| GET | `/api/audit-logs` | JWT + `ADMINISTRATOR`. |
| POST | `/api/auth/login` | Public. Username and password. |
| GET | `/api/auth/me` | JWT required. Current user. |
| GET | `/api/leave-requests/me` | JWT. Own leave requests. |
| POST | `/api/leave-requests` | JWT. Create own PENDING request. |
| PATCH | `/api/leave-requests/:id/cancel` | JWT. Cancel own PENDING request. |
| GET | `/api/leave-balances/me` | JWT. Own leave balances. |
| GET | `/api/manager/leave-requests` | JWT + `MANAGER`. Department queue. |
| PATCH | `/api/manager/leave-requests/:id/approve` | JWT + `MANAGER`. |
| PATCH | `/api/manager/leave-requests/:id/reject` | JWT + `MANAGER`. |
| GET | `/api/sickness-absences/me` | JWT. Own sickness absences. |
| POST | `/api/sickness-absences` | JWT. Report own sickness. |
| PATCH | `/api/sickness-absences/:id` | JWT. Edit own open sickness. |
| GET | `/api/manager/sickness-absences` | JWT + `MANAGER`. Read-only. |
| GET | `/api/admin/sickness-absences` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/admin/sickness-absences/:id/document-pending` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/admin/sickness-absences/:id/validate` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/admin/sickness-absences/:id/reject` | JWT + `ADMINISTRATOR`. |
| PATCH | `/api/admin/sickness-absences/:id/close` | JWT + `ADMINISTRATOR`. |

Setup, environment variables, and test commands are documented in `/server/README.md`. Authentication details are in `/docs/authentication-and-roles.md`.
