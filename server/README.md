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

Departments:

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
curl http://localhost:5000/api/departments
```
