# Leave and Absence Management API

Express.js backend for the bachelor thesis project. The API connects to the local PostgreSQL database `leave_absence_management`.

## Install dependencies

```bash
cd server
npm install
```

This installs Express, the official `pg` driver, and `dotenv`.

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
4. Do not commit `.env`. Git already ignores this file.
5. Do not put the password in README files, source code, or API responses.

The example file contains:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_absence_management
DB_USER=postgres
DB_PASSWORD=replace_with_your_local_postgresql_password
```

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

Example commands:

```bash
curl http://localhost:5000/
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/database
curl http://localhost:5000/api/departments
```
