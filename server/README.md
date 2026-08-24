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

Administrator test endpoint:

```bash
curl http://localhost:5000/api/admin/test -H "Authorization: Bearer YOUR_TOKEN"
```

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

Recent audit log:

```bash
curl http://localhost:5000/api/audit-logs -H "Authorization: Bearer YOUR_TOKEN"
```

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

Report (optional certificate file as `certificate`):

```bash
curl -X POST http://localhost:5000/api/sickness-absences -H "Authorization: Bearer YOUR_TOKEN" -F "absenceType=SICK_LEAVE" -F "startDate=2026-08-24" -F "endDate=" -F "employeeNote=Fieber" -F "certificate=@attest.pdf;type=application/pdf"
```

Employee edit (keep existing file unless a new `certificate` is sent):

```bash
curl -X PATCH http://localhost:5000/api/sickness-absences/1 -H "Authorization: Bearer YOUR_TOKEN" -F "endDate=2026-08-26" -F "employeeNote=Attest nachgereicht" -F "certificate=@attest.jpg;type=image/jpeg"
```

View certificate (employee, department manager, or administrator):

```bash
curl -O -J http://localhost:5000/api/sickness-absences/1/certificate -H "Authorization: Bearer YOUR_TOKEN"
```

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
