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
| GET | `/api/departments` | Public. Department list. |
| POST | `/api/auth/login` | Public. Username and password. |
| GET | `/api/auth/me` | JWT required. Current user. |
| GET | `/api/admin/test` | JWT + role `ADMINISTRATOR`. |

Setup, environment variables, and test commands are documented in `/server/README.md`. Authentication details are in `/docs/authentication-and-roles.md`.
