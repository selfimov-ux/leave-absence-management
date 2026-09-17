-- =============================================================================
-- Leave and Absence Management — PostgreSQL schema
-- Database: leave_absence_management
--
-- Run this file in pgAdmin BEFORE seed.sql.
-- This script creates enum types, tables, constraints, and indexes.
-- It does not drop existing objects unless you uncomment the optional
-- reset section below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- OPTIONAL RESET SECTION
-- Uncomment this block ONLY when you intentionally want to wipe schema objects
-- during local development and recreate them from scratch.
-- Do not use this section on a database that contains data you need to keep.
-- Drop order: child tables first, then parent tables, then enum types.
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS sickness_absences CASCADE;
-- DROP TABLE IF EXISTS leave_requests CASCADE;
-- DROP TABLE IF EXISTS leave_balances CASCADE;
-- DROP TABLE IF EXISTS leave_types CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
-- DROP TABLE IF EXISTS departments CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
--
-- DROP TYPE IF EXISTS sickness_absence_status;
-- DROP TYPE IF EXISTS sickness_absence_type;
-- DROP TYPE IF EXISTS leave_request_status;
-- DROP TYPE IF EXISTS user_role;

-- -----------------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'EMPLOYEE',
    'MANAGER',
    'ADMINISTRATOR'
);

CREATE TYPE leave_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE sickness_absence_type AS ENUM (
    'SICK_LEAVE',
    'CARE_LEAVE'
);

CREATE TYPE sickness_absence_status AS ENUM (
    'REPORTED',
    'DOCUMENT_PENDING',
    'VALIDATED',
    'REJECTED',
    'CLOSED'
);

-- -----------------------------------------------------------------------------
-- users
-- Application login accounts. Each employee later links to exactly one user.
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_username_not_blank CHECK (BTRIM(username) <> ''),
    CONSTRAINT ck_users_email_format CHECK (email LIKE '%_@_%.__%')
);

-- -----------------------------------------------------------------------------
-- departments
-- Organizational units. manager_id is added as a foreign key after employees
-- exist, because a department manager is also an employee.
-- -----------------------------------------------------------------------------

CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id  INTEGER,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_departments_name UNIQUE (name),
    CONSTRAINT ck_departments_name_not_blank CHECK (BTRIM(name) <> '')
);

-- -----------------------------------------------------------------------------
-- employees
-- One employee belongs to one department and has exactly one user account.
-- manager_id is the optional direct manager (another employee).
-- -----------------------------------------------------------------------------

CREATE TABLE employees (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER      NOT NULL,
    department_id    INTEGER      NOT NULL,
    manager_id       INTEGER,
    employee_number  VARCHAR(20)  NOT NULL,
    first_name       VARCHAR(80)  NOT NULL,
    last_name        VARCHAR(80)  NOT NULL,
    hire_date        DATE         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_user_id UNIQUE (user_id),
    CONSTRAINT uq_employees_employee_number UNIQUE (employee_number),
    CONSTRAINT fk_employees_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_employees_department
        FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_employees_manager
        FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL,
    CONSTRAINT ck_employees_number_not_blank CHECK (BTRIM(employee_number) <> ''),
    CONSTRAINT ck_employees_first_name_not_blank CHECK (BTRIM(first_name) <> ''),
    CONSTRAINT ck_employees_last_name_not_blank CHECK (BTRIM(last_name) <> ''),
    CONSTRAINT ck_employees_not_own_manager CHECK (manager_id IS DISTINCT FROM id)
);

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
        FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- leave_types
-- Catalogue of leave categories (for example annual leave). Sickness is not a
-- leave type and must not be stored here.
-- -----------------------------------------------------------------------------

CREATE TABLE leave_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_paid     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_leave_types_name UNIQUE (name),
    CONSTRAINT ck_leave_types_name_not_blank CHECK (BTRIM(name) <> '')
);

-- -----------------------------------------------------------------------------
-- leave_balances
-- Entitlement per employee, leave type, and calendar year.
-- remaining days can be derived as:
--   annual_allowance + adjusted_days - used_days
-- Sickness absences must never change these values.
-- -----------------------------------------------------------------------------

CREATE TABLE leave_balances (
    id               SERIAL PRIMARY KEY,
    employee_id      INTEGER        NOT NULL,
    leave_type_id    INTEGER        NOT NULL,
    calendar_year    SMALLINT       NOT NULL,
    annual_allowance NUMERIC(6, 2)  NOT NULL,
    used_days        NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    adjusted_days    NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_balances_employee
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_balances_leave_type
        FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT,
    CONSTRAINT uq_leave_balances_employee_type_year
        UNIQUE (employee_id, leave_type_id, calendar_year),
    CONSTRAINT ck_leave_balances_year CHECK (calendar_year BETWEEN 2000 AND 2100),
    CONSTRAINT ck_leave_balances_allowance CHECK (annual_allowance >= 0),
    CONSTRAINT ck_leave_balances_used_days CHECK (used_days >= 0),
    CONSTRAINT ck_leave_balances_not_overdrawn
        CHECK (used_days <= annual_allowance + adjusted_days)
);

-- -----------------------------------------------------------------------------
-- leave_requests
-- Planned time off that consumes leave balance when approved.
-- reviewer_id is the manager or administrator who decided the request.
-- -----------------------------------------------------------------------------

CREATE TABLE leave_requests (
    id                SERIAL PRIMARY KEY,
    employee_id       INTEGER               NOT NULL,
    leave_type_id     INTEGER               NOT NULL,
    start_date        DATE                  NOT NULL,
    end_date          DATE                  NOT NULL,
    requested_days    NUMERIC(6, 2)         NOT NULL,
    status            leave_request_status  NOT NULL DEFAULT 'PENDING',
    reason            TEXT,
    reviewer_id       INTEGER,
    reviewed_at       TIMESTAMPTZ,
    rejection_reason  TEXT,
    created_at        TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_requests_employee
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT,
    CONSTRAINT fk_leave_requests_leave_type
        FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT,
    CONSTRAINT fk_leave_requests_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES employees (id) ON DELETE SET NULL,
    CONSTRAINT ck_leave_requests_date_order CHECK (end_date >= start_date),
    CONSTRAINT ck_leave_requests_days_positive CHECK (requested_days > 0),
    CONSTRAINT ck_leave_requests_rejection
        CHECK (
            (status <> 'REJECTED' AND rejection_reason IS NULL)
            OR (status = 'REJECTED' AND rejection_reason IS NOT NULL)
        ),
    CONSTRAINT ck_leave_requests_review
        CHECK (
            (
                status IN ('PENDING', 'CANCELLED')
                AND reviewer_id IS NULL
                AND reviewed_at IS NULL
            )
            OR (
                status IN ('APPROVED', 'REJECTED')
                AND reviewer_id IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
        )
);

-- -----------------------------------------------------------------------------
-- sickness_absences
-- Health-related absences. Separate from leave_requests so they cannot reduce
-- annual leave balance. end_date may be NULL while the absence is ongoing.
-- -----------------------------------------------------------------------------

CREATE TABLE sickness_absences (
    id                    SERIAL PRIMARY KEY,
    employee_id           INTEGER                  NOT NULL,
    start_date            DATE                     NOT NULL,
    end_date              DATE,
    absence_type          sickness_absence_type    NOT NULL,
    status                sickness_absence_status  NOT NULL DEFAULT 'REPORTED',
    certificate_reference VARCHAR(100),
    employee_note         TEXT,
    administrator_note    TEXT,
    validation_user_id    INTEGER,
    validated_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sickness_absences_employee
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT,
    CONSTRAINT fk_sickness_absences_validation_user
        FOREIGN KEY (validation_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_sickness_absences_date_order
        CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT ck_sickness_absences_closed_has_end
        CHECK (status <> 'CLOSED' OR end_date IS NOT NULL),
    CONSTRAINT ck_sickness_absences_validation
        CHECK (
            (
                status IN ('REPORTED', 'DOCUMENT_PENDING')
                AND validation_user_id IS NULL
                AND validated_at IS NULL
            )
            OR (
                status IN ('VALIDATED', 'REJECTED', 'CLOSED')
                AND validation_user_id IS NOT NULL
                AND validated_at IS NOT NULL
            )
        )
);

-- -----------------------------------------------------------------------------
-- audit_logs
-- Immutable activity trail. created_at only; rows should not be updated.
-- -----------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL,
    action       VARCHAR(80)  NOT NULL,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    INTEGER      NOT NULL,
    description  TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_audit_logs_action_not_blank CHECK (BTRIM(action) <> ''),
    CONSTRAINT ck_audit_logs_entity_type_not_blank CHECK (BTRIM(entity_type) <> ''),
    CONSTRAINT ck_audit_logs_entity_id_positive CHECK (entity_id > 0)
);

-- -----------------------------------------------------------------------------
-- Indexes for frequently filtered foreign keys and status fields
-- -----------------------------------------------------------------------------

CREATE INDEX ix_employees_department_id ON employees (department_id);
CREATE INDEX ix_employees_manager_id ON employees (manager_id);
CREATE INDEX ix_departments_manager_id ON departments (manager_id);

CREATE INDEX ix_leave_balances_employee_id ON leave_balances (employee_id);
CREATE INDEX ix_leave_balances_leave_type_id ON leave_balances (leave_type_id);

CREATE INDEX ix_leave_requests_employee_id ON leave_requests (employee_id);
CREATE INDEX ix_leave_requests_leave_type_id ON leave_requests (leave_type_id);
CREATE INDEX ix_leave_requests_status ON leave_requests (status);
CREATE INDEX ix_leave_requests_reviewer_id ON leave_requests (reviewer_id);

CREATE INDEX ix_sickness_absences_employee_id ON sickness_absences (employee_id);
CREATE INDEX ix_sickness_absences_status ON sickness_absences (status);
CREATE INDEX ix_sickness_absences_validation_user_id ON sickness_absences (validation_user_id);

CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX ix_audit_logs_entity ON audit_logs (entity_type, entity_id);
