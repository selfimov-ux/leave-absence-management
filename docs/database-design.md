# Database design — Leave and Absence Management

This document describes the PostgreSQL schema for the bachelor thesis project. The physical database already exists locally under the name `leave_absence_management`. Schema objects are created by `server/sql/schema.sql`. Demo rows are loaded by `server/sql/seed.sql`.

The design covers internal HR processes for planned leave and sickness reporting. It does not cover payroll, social insurance, occupational health, or any external ERP system.

## Purpose of each table

### `users`

Stores login accounts for the web application. Each row has a unique username, a unique email address, a role (`EMPLOYEE`, `MANAGER`, or `ADMINISTRATOR`), and an active flag. The `password_hash` column will hold a hash after authentication is implemented. In the current seed data it only contains a clearly marked temporary placeholder.

### `departments`

Stores organizational units such as Human Resources, Information Technology, and Finance. A department may optionally name one employee as department manager.

### `employees`

Stores the HR person record: employee number, name, hire date, department, optional direct manager, and the linked user account. This is the central entity for leave requests, sickness absences, and leave balances.

### `leave_types`

Stores the catalogue of planned leave categories (annual leave, unpaid leave, special leave, study leave). Sickness is not a leave type.

### `leave_balances`

Stores yearly entitlements per employee and leave type: `annual_allowance`, `used_days`, and `adjusted_days`. Remaining days are derived as `annual_allowance + adjusted_days - used_days`. Only approved leave requests should increase `used_days`. Sickness absences must not change this table.

### `leave_requests`

Stores planned time-off applications: period, requested days, status, reason, reviewer, review timestamp, and rejection reason when the status is `REJECTED`. An approved request is the business event that consumes leave balance.

### `sickness_absences`

Stores health-related absences (`SICK_LEAVE` or `CARE_LEAVE`) with their own status workflow. The end date may be empty while the absence is still open. Optional `certificate_reference` holds either a short text note or a local uploaded filename (PDF/image under `server/uploads/sickness/`). Employee note, administrator note, validating user, and validation timestamp support HR follow-up. These rows never reduce annual leave.

### `audit_logs`

Stores who performed which action on which entity. Rows are append-only (`created_at` only) and always belong to the user who carried out the action.

## Important relationships

- One **department** has many **employees**.
- Each **employee** has exactly one **user** (`employees.user_id` is unique).
- An **employee** may have one optional direct **manager** (self-reference on `employees.manager_id`).
- A **department** may have one optional **manager** (`departments.manager_id` → `employees`).
- One **employee** has many **leave requests**.
- One **employee** has many **sickness absences**.
- One **leave type** is used by many **leave requests**.
- One **employee** has many **leave balances** (one row per leave type and calendar year).
- One **leave type** appears in many **leave balances**.
- One **user** has many **audit log** entries.
- A **leave request** may reference a reviewing **employee**.
- A **sickness absence** may reference the **user** who validated it.

## Concise ER-model description

```
users 1 ── 1 employees
                 │
                 ├── * leave_requests * ── 1 leave_types
                 │                              │
                 ├── * leave_balances * ────────┘
                 │
                 ├── * sickness_absences
                 │
                 └── optional manager (employees.manager_id → employees.id)

departments 1 ── * employees
departments 0..1 ── 1 employees (optional department manager)

users 1 ── * audit_logs
users 1 ── * sickness_absences (optional validation_user_id)
```

Cardinality in words:

- `users` to `employees` is one-to-one.
- `departments` to `employees` is one-to-many.
- `employees` to `leave_requests`, `sickness_absences`, and `leave_balances` is one-to-many.
- `leave_types` to `leave_requests` and `leave_balances` is one-to-many.
- `users` to `audit_logs` is one-to-many.

## Why leave requests and sickness absences are separate

Leave requests are planned, often discretionary, and consume a leave type balance when approved. They follow a request-and-review cycle (`PENDING` → `APPROVED` / `REJECTED`, or `CANCELLED`).

Sickness absences are reported because of illness or care duties. They are not an application against vacation entitlement. German HR practice keeps incapacity for work and similar absences on a different path: medical documentation, validation by administration, and closure after return to work. Mixing both processes in one table would make it easy to deduct annual leave for sickness, which this system must not do.

The schema therefore uses two tables, two status enums, and no foreign key from `sickness_absences` to `leave_balances` or `leave_types`.

## Scope limitations

The following topics are out of scope for this database and for the thesis application:

- Payroll, tax, and salary continuation calculations
- Legal case handling, works-council workflows, and statutory deadline engines
- Health insurance, medical content, or eAU provider integration
- Interfaces to SAP, DATEV, or other external ERP / HRIS products
- Authentication, session storage, and password hashing (later application phase)

The schema only supports internal recording, review, and reporting of leave and sickness inside this web application.
