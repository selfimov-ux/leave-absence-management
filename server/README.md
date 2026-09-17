# Leave and Absence Management API

Express.js backend for the bachelor thesis project. The API connects to the local PostgreSQL database `leave_absence_management`.

## Required packages

Install dependencies in `/server`:

```bash
cd server
npm install
```

This installs Express, `pg`, `dotenv`, `bcrypt`, and `jsonwebtoken`.

## Configure local environment variables

1. Copy the example file to `.env` inside `/server`:

```bash
cd server
copy .env.example .env
```

On macOS or Linux:

```bash
cd server
cp .env.example .env
```

2. Open `/server/.env` in an editor.
3. Replace `replace_with_your_local_postgresql_password` with your local PostgreSQL password.
4. Replace `replace_with_a_long_random_local_secret` with a long random string for `JWT_SECRET`.
5. Do not commit `.env`. Git already ignores this file.
6. Do not put database passwords, JWT secrets, or password hashes in README files, source code, logs, or API responses.

The example file contains:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_absence_management
DB_USER=postgres
DB_PASSWORD=replace_with_your_local_postgresql_password
JWT_SECRET=replace_with_a_long_random_local_secret
```

## Demo password hashes

Run `server/sql/update-demo-password-hashes.sql` in pgAdmin after `schema.sql` and `seed.sql`. Until that script has been executed, login will fail because the seeded `password_hash` values are still plain text.

## Start the backend

```bash
cd server
npm start
```

The server runs on port 5000.

## Test the API

Root:

```
http://localhost:5000/
```

Application health:

```
http://localhost:5000/api/health
```

Database health:

```
http://localhost:5000/api/health/database
```

Departments (authenticated):

```
http://localhost:5000/api/departments
```

Login (after the bcrypt hash script):

```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"aschmidt\",\"password\":\"TempPassword123!\"}"
```

Current user (replace `YOUR_TOKEN` with the token from login; never commit a real token):

```bash
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer YOUR_TOKEN"
```

Change own password (JWT required; the API never accepts a `userId` in the body). Do not log or commit the request body:

```bash
curl -X PUT http://localhost:5000/api/auth/change-password -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"currentPassword\":\"CURRENT_PASSWORD\",\"newPassword\":\"NEW_PASSWORD\"}"
```

The new password must be at least 10 characters and include uppercase, lowercase, a digit, and a special character. Forgot-password e-mail reset is out of scope for this local academic project. See `/docs/password-security.md`.

## Administrator management

Replace `YOUR_TOKEN` with an administrator JWT. Never commit a real token.

List employees:

```bash
curl http://localhost:5000/api/employees -H "Authorization: Bearer YOUR_TOKEN"
```

Create a department:

```bash
curl -X POST http://localhost:5000/api/departments -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Operations\",\"description\":\"Internal operations\",\"managerId\":null}"
```

Update a department:

```bash
curl -X PUT http://localhost:5000/api/departments/1 -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Human Resources\",\"description\":\"Personnel administration\",\"managerId\":2}"
```

Delete a department (fails while employees are assigned):

```bash
curl -X DELETE http://localhost:5000/api/departments/2 -H "Authorization: Bearer YOUR_TOKEN"
```

Create a leave type:

```bash
curl -X POST http://localhost:5000/api/leave-types -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Parental Leave\",\"description\":\"Unpaid parental leave\",\"isActive\":true}"
```

Change leave-type status:

```bash
curl -X PATCH http://localhost:5000/api/leave-types/1/status -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"isActive\":false}"
```

Create an employee (user and employee rows in one transaction):

```bash
curl -X POST http://localhost:5000/api/employees -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"employeeNumber\":\"EMP-011\",\"firstName\":\"Nora\",\"lastName\":\"Lehmann\",\"email\":\"nora.lehmann@example.com\",\"hireDate\":\"2026-01-12\",\"departmentId\":2,\"managerId\":3,\"username\":\"nlehmann\",\"role\":\"EMPLOYEE\",\"password\":\"TempPassword123!\"}"
```

Deactivate an employee:

```bash
curl -X PATCH http://localhost:5000/api/employees/4/status -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"isActive\":false}"
```

Paginated activity log (`page` default 1, `pageSize` default 20, max 100):

```bash
curl "http://localhost:5000/api/audit-logs?page=1&pageSize=20" -H "Authorization: Bearer YOUR_TOKEN"
```

Optional filters: `userId`, `action`, `entityType`, `fromDate`, `toDate`. Response: `{ "totalCount", "page", "pageSize", "records" }`. Records contain actor name, action, entity, and description only — no passwords, tokens, file paths, or certificate data.

## Leave requests

Own requests:

```bash
curl http://localhost:5000/api/leave-requests/me -H "Authorization: Bearer YOUR_TOKEN"
```

Own balances:

```bash
curl http://localhost:5000/api/leave-balances/me -H "Authorization: Bearer YOUR_TOKEN"
```

Create a request (employee token):

```bash
curl -X POST http://localhost:5000/api/leave-requests -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"leaveTypeId\":1,\"startDate\":\"2026-09-21\",\"endDate\":\"2026-09-23\",\"reason\":\"Familienurlaub\"}"
```

Cancel a pending request:

```bash
curl -X PATCH http://localhost:5000/api/leave-requests/1/cancel -H "Authorization: Bearer YOUR_TOKEN"
```

Manager queue:

```bash
curl http://localhost:5000/api/manager/leave-requests -H "Authorization: Bearer YOUR_TOKEN"
```

Approve / reject (manager token):

```bash
curl -X PATCH http://localhost:5000/api/manager/leave-requests/1/approve -H "Authorization: Bearer YOUR_TOKEN"
curl -X PATCH http://localhost:5000/api/manager/leave-requests/1/reject -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"rejectionReason\":\"Personaldeckung nicht ausreichend\"}"
```

## Sickness absences

Own list:

```bash
curl http://localhost:5000/api/sickness-absences/me -H "Authorization: Bearer YOUR_TOKEN"
```

Report (optional fictional PDF as `certificate`):

```bash
curl -X POST http://localhost:5000/api/sickness-absences -H "Authorization: Bearer YOUR_TOKEN" -F "absenceType=SICK_LEAVE" -F "startDate=2026-08-24" -F "employeeNote=Fiktive Testdaten" -F "certificate=@fiktive-bescheinigung.pdf;type=application/pdf"
```

Upload or replace the PDF on an existing own record (`REPORTED` or `DOCUMENT_PENDING`):

```bash
curl -X POST http://localhost:5000/api/sickness-absences/1/certificate -H "Authorization: Bearer YOUR_TOKEN" -F "certificate=@fiktive-bescheinigung.pdf;type=application/pdf"
```

Employee edit (optional new PDF via field `certificate`):

```bash
curl -X PATCH http://localhost:5000/api/sickness-absences/1 -H "Authorization: Bearer YOUR_TOKEN" -F "endDate=2026-08-26" -F "employeeNote=Attest nachgereicht" -F "certificate=@fiktive-bescheinigung.pdf;type=application/pdf"
```

Download certificate (owning employee or administrator; JWT required). Managers receive 403.

```bash
curl -O -J http://localhost:5000/api/sickness-absences/1/certificate -H "Authorization: Bearer YOUR_TOKEN"
```

### Certificate upload restrictions

- Exactly one PDF per sickness absence (`certificate` field).
- Only `.pdf` and `application/pdf`. Maximum size 5 MB.
- German error messages for missing file, invalid type, oversized file, and unauthorized access.
- Files are stored only on this machine under `server/uploads/sickness-certificates/`. The folder is gitignored and is **not** mounted with `express.static`.
- The database stores a generated 32-character hex filename plus `.pdf` in `certificate_reference`, never the original name and never a full path.
- This is local thesis storage only. There is no cloud bucket, virus scan, or eAU connection.

Manager department list:

```bash
curl http://localhost:5000/api/manager/sickness-absences -H "Authorization: Bearer YOUR_TOKEN"
```

Administrator actions:

```bash
curl http://localhost:5000/api/admin/sickness-absences -H "Authorization: Bearer YOUR_TOKEN"
curl -X PATCH http://localhost:5000/api/admin/sickness-absences/1/document-pending -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"administratorNote\":\"Bitte Attestreferenz nachreichen\"}"
curl -X PATCH http://localhost:5000/api/admin/sickness-absences/1/validate -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"administratorNote\":\"Geprüft\"}"
curl -X PATCH http://localhost:5000/api/admin/sickness-absences/1/reject -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"administratorNote\":\"Nachweis unvollständig\"}"
curl -X PATCH http://localhost:5000/api/admin/sickness-absences/1/close -H "Authorization: Bearer YOUR_TOKEN"
```

## Reports (administrator)

All report endpoints require JWT + `ADMINISTRATOR`. They return `{ "filters", "total", "records" }`. Date filters are `fromDate` and `toDate` (overlap on start/end). Invalid filters return German 400 messages.

Leave report:

```bash
curl "http://localhost:5000/api/reports/leave?status=APPROVED&fromDate=2026-01-01&toDate=2026-12-31" -H "Authorization: Bearer YOUR_TOKEN"
```

Sickness report (`certificateAvailable` boolean only; no filename or path):

```bash
curl "http://localhost:5000/api/reports/sickness-absences?status=VALIDATED" -H "Authorization: Bearer YOUR_TOKEN"
```

Absence overview (approved leave + REPORTED/DOCUMENT_PENDING/VALIDATED/CLOSED sickness):

```bash
curl "http://localhost:5000/api/reports/absence-overview?recordType=LEAVE" -H "Authorization: Bearer YOUR_TOKEN"
```

CSV export is generated in the browser (`Blob` / `URL.createObjectURL`), not by the API.

The activity log is not a report tab. Use `GET /api/audit-logs` and `/admin/audit-logs`.

Authorization header format:

```
Authorization: Bearer YOUR_TOKEN
```

## Fictional demo users

Use these usernames only after `update-demo-password-hashes.sql` has been applied. The shared local demo password is `TempPassword123!`.

| Username | Role |
| --- | --- |
| `aschmidt` | ADMINISTRATOR |
| `eweber` | MANAGER |
| `mklein` | MANAGER |
| `tbauer` | EMPLOYEE |

Other seeded usernames (`jhoffmann`, `drichter`, `lkoch`, `mwagner`, `sbecker`, `pneumann`) use the same demo password.

## Other public checks

```bash
curl http://localhost:5000/
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/database
```
