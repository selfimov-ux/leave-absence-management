
-- password_hash currently stores the placeholder string TempPassword123!


INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
    (1,  'aschmidt',    'anna.schmidt@example.com',     'TempPassword123!', 'ADMINISTRATOR', TRUE),
    (2,  'eweber',      'elena.weber@example.com',      'TempPassword123!', 'MANAGER',       TRUE),
    (3,  'mklein',      'markus.klein@example.com',     'TempPassword123!', 'MANAGER',       TRUE),
    (4,  'tbauer',      'thomas.bauer@example.com',     'TempPassword123!', 'EMPLOYEE',      TRUE),
    (5,  'jhoffmann',   'julia.hoffmann@example.com',   'TempPassword123!', 'EMPLOYEE',      TRUE),
    (6,  'drichter',    'daniel.richter@example.com',   'TempPassword123!', 'EMPLOYEE',      TRUE),
    (7,  'lkoch',       'laura.koch@example.com',       'TempPassword123!', 'EMPLOYEE',      TRUE),
    (8,  'mwagner',     'michael.wagner@example.com',   'TempPassword123!', 'EMPLOYEE',      TRUE),
    (9,  'sbecker',     'sarah.becker@example.com',     'TempPassword123!', 'EMPLOYEE',      TRUE),
    (10, 'pneumann',    'peter.neumann@example.com',    'TempPassword123!', 'EMPLOYEE',      TRUE);

INSERT INTO departments (id, name, description, manager_id) VALUES
    (1, 'Human Resources',           'Personnel administration and internal HR processes.', NULL),
    (2, 'Information Technology',    'Software development and IT operations.',             NULL),
    (3, 'Finance',                   'Accounting, controlling, and financial reporting.',   NULL);

-- 1 administrator, 2 managers, 7 employees
INSERT INTO employees (
    id, user_id, department_id, manager_id, employee_number, first_name, last_name, hire_date
) VALUES
    (1,  1,  1, NULL, 'EMP-001', 'Anna',    'Schmidt',   '2018-01-15'),
    (2,  2,  1, 1,    'EMP-002', 'Elena',   'Weber',     '2019-04-01'),
    (3,  3,  2, 1,    'EMP-003', 'Markus',  'Klein',     '2019-06-10'),
    (4,  4,  1, 2,    'EMP-004', 'Thomas',  'Bauer',     '2021-03-01'),
    (5,  5,  2, 3,    'EMP-005', 'Julia',   'Hoffmann',  '2021-09-15'),
    (6,  6,  2, 3,    'EMP-006', 'Daniel',  'Richter',   '2022-02-01'),
    (7,  7,  2, 3,    'EMP-007', 'Laura',   'Koch',      '2022-11-20'),
    (8,  8,  3, 1,    'EMP-008', 'Michael', 'Wagner',    '2020-05-04'),
    (9,  9,  3, 1,    'EMP-009', 'Sarah',   'Becker',    '2023-01-09'),
    (10, 10, 3, 1,    'EMP-010', 'Peter',   'Neumann',   '2024-08-01');

UPDATE departments SET manager_id = 2 WHERE id = 1;
UPDATE departments SET manager_id = 3 WHERE id = 2;


INSERT INTO leave_types (id, name, description, is_paid, is_active) VALUES
    (1, 'Annual Leave',  'Regular paid vacation entitlement for the calendar year.', TRUE,  TRUE),
    (2, 'Unpaid Leave',  'Leave without pay. Does not increase salary payments.',    FALSE, TRUE),
    (3, 'Special Leave', 'Paid leave for personal events such as relocation.',       TRUE,  TRUE),
    (4, 'Study Leave',   'Paid leave for examinations and approved training.',       TRUE,  TRUE);

-- Leave balances for 2026. used_days reflects approved leave only.
-- Sickness absences are intentionally omitted from used_days.
INSERT INTO leave_balances (
    employee_id, leave_type_id, calendar_year, annual_allowance, used_days, adjusted_days
) VALUES
    -- Anna Schmidt
    (1, 1, 2026, 30.00, 0.00, 0.00),
    (1, 2, 2026, 10.00, 0.00, 0.00),
    (1, 3, 2026,  5.00, 0.00, 0.00),
    (1, 4, 2026, 10.00, 0.00, 0.00),
    -- Elena Weber
    (2, 1, 2026, 30.00, 0.00, 0.00),
    (2, 2, 2026, 10.00, 0.00, 0.00),
    (2, 3, 2026,  5.00, 0.00, 0.00),
    (2, 4, 2026, 10.00, 0.00, 0.00),
    -- Markus Klein
    (3, 1, 2026, 30.00, 0.00, 2.00),
    (3, 2, 2026, 10.00, 0.00, 0.00),
    (3, 3, 2026,  5.00, 0.00, 0.00),
    (3, 4, 2026, 10.00, 0.00, 0.00),
    -- Thomas Bauer (5 approved annual days)
    (4, 1, 2026, 30.00, 5.00, 0.00),
    (4, 2, 2026, 10.00, 0.00, 0.00),
    (4, 3, 2026,  5.00, 0.00, 0.00),
    (4, 4, 2026, 10.00, 0.00, 0.00),
    -- Julia Hoffmann
    (5, 1, 2026, 30.00, 0.00, 0.00),
    (5, 2, 2026, 10.00, 0.00, 0.00),
    (5, 3, 2026,  5.00, 0.00, 0.00),
    (5, 4, 2026, 10.00, 0.00, 0.00),
    -- Daniel Richter
    (6, 1, 2026, 26.00, 0.00, 0.00),
    (6, 2, 2026, 10.00, 0.00, 0.00),
    (6, 3, 2026,  5.00, 0.00, 0.00),
    (6, 4, 2026, 10.00, 0.00, 0.00),
    -- Laura Koch
    (7, 1, 2026, 30.00, 0.00, 0.00),
    (7, 2, 2026, 10.00, 0.00, 0.00),
    (7, 3, 2026,  5.00, 0.00, 0.00),
    (7, 4, 2026, 10.00, 0.00, 0.00),
    -- Michael Wagner
    (8, 1, 2026, 30.00, 0.00, 0.00),
    (8, 2, 2026, 10.00, 0.00, 0.00),
    (8, 3, 2026,  5.00, 0.00, 0.00),
    (8, 4, 2026, 10.00, 0.00, 0.00),
    -- Sarah Becker (2 approved special-leave days)
    (9, 1, 2026, 30.00, 0.00, 0.00),
    (9, 2, 2026, 10.00, 0.00, 0.00),
    (9, 3, 2026,  5.00, 2.00, 0.00),
    (9, 4, 2026, 10.00, 0.00, 0.00),
    -- Peter Neumann (pro-rated annual allowance)
    (10, 1, 2026, 15.00, 0.00, 0.00),
    (10, 2, 2026, 10.00, 0.00, 0.00),
    (10, 3, 2026,  5.00, 0.00, 0.00),
    (10, 4, 2026, 10.00, 0.00, 0.00);

INSERT INTO leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, requested_days,
    status, reason, reviewer_id, reviewed_at, rejection_reason
) VALUES
    (
        1, 5, 1, '2026-09-14', '2026-09-18', 5.00,
        'PENDING',
        'Family vacation in September.',
        NULL, NULL, NULL
    ),
    (
        2, 4, 1, '2026-07-06', '2026-07-10', 5.00,
        'APPROVED',
        'Summer holiday.',
        2, '2026-06-02 09:15:00+00', NULL
    ),
    (
        3, 6, 1, '2026-08-03', '2026-08-14', 10.00,
        'REJECTED',
        'Extended summer trip.',
        3, '2026-07-20 11:40:00+00',
        'Team coverage is insufficient during this period.'
    ),
    (
        4, 7, 4, '2026-10-12', '2026-10-13', 2.00,
        'CANCELLED',
        'Exam dates were postponed by the university.',
        NULL, NULL, NULL
    ),
    (
        5, 9, 3, '2026-06-12', '2026-06-15', 2.00,
        'APPROVED',
        'Relocation to a new apartment.',
        1, '2026-06-01 14:05:00+00', NULL
    ),
    (
        6, 8, 2, '2026-11-02', '2026-11-06', 5.00,
        'PENDING',
        'Unpaid private leave.',
        NULL, NULL, NULL
    );

INSERT INTO sickness_absences (
    id, employee_id, start_date, end_date, absence_type, status,
    certificate_reference, employee_note, administrator_note,
    validation_user_id, validated_at
) VALUES
    (
        1, 10, '2026-08-22', NULL, 'SICK_LEAVE', 'REPORTED',
        NULL,
        'Flu-like symptoms. I will visit the doctor today.',
        NULL,
        NULL, NULL
    ),
    (
        2, 6, '2026-08-18', '2026-08-21', 'SICK_LEAVE', 'DOCUMENT_PENDING',
        NULL,
        'Fever. Medical certificate will be submitted.',
        'Waiting for the medical certificate.',
        NULL, NULL
    ),
    (
        3, 5, '2026-05-04', '2026-05-05', 'CARE_LEAVE', 'VALIDATED',
        'CARE-2026-0041',
        'Care for a sick child.',
        'Certificate checked. Care leave confirmed.',
        1, '2026-05-06 08:30:00+00'
    ),
    (
        4, 4, '2026-03-10', '2026-03-14', 'SICK_LEAVE', 'CLOSED',
        'AU-2026-1188',
        'Respiratory infection.',
        'Absence closed after return to work. No leave balance deducted.',
        1, '2026-03-16 10:00:00+00'
    );

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, created_at) VALUES
    (
        1, 'CREATE_EMPLOYEE', 'employees', 10,
        'Administrator created employee record EMP-010 for Peter Neumann.',
        '2024-08-01 07:45:00+00'
    ),
    (
        2, 'APPROVE_LEAVE_REQUEST', 'leave_requests', 2,
        'Manager Elena Weber approved annual leave for Thomas Bauer (5 days).',
        '2026-06-02 09:15:00+00'
    ),
    (
        3, 'REJECT_LEAVE_REQUEST', 'leave_requests', 3,
        'Manager Markus Klein rejected annual leave for Daniel Richter.',
        '2026-07-20 11:40:00+00'
    ),
    (
        7, 'CANCEL_LEAVE_REQUEST', 'leave_requests', 4,
        'Laura Koch cancelled her study-leave request after exam dates changed.',
        '2026-08-10 16:22:00+00'
    ),
    (
        1, 'VALIDATE_SICKNESS_ABSENCE', 'sickness_absences', 3,
        'Administrator validated care leave for Julia Hoffmann.',
        '2026-05-06 08:30:00+00'
    ),
    (
        1, 'CLOSE_SICKNESS_ABSENCE', 'sickness_absences', 4,
        'Administrator closed sickness absence for Thomas Bauer. Leave balance unchanged.',
        '2026-03-16 10:00:00+00'
    );

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('departments', 'id'), (SELECT MAX(id) FROM departments));
SELECT setval(pg_get_serial_sequence('employees', 'id'), (SELECT MAX(id) FROM employees));
SELECT setval(pg_get_serial_sequence('leave_types', 'id'), (SELECT MAX(id) FROM leave_types));
SELECT setval(pg_get_serial_sequence('leave_balances', 'id'), (SELECT MAX(id) FROM leave_balances));
SELECT setval(pg_get_serial_sequence('leave_requests', 'id'), (SELECT MAX(id) FROM leave_requests));
SELECT setval(pg_get_serial_sequence('sickness_absences', 'id'), (SELECT MAX(id) FROM sickness_absences));
SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), (SELECT MAX(id) FROM audit_logs));
