# Manual tests — Phase 6

Use the fictional demo users after `update-demo-password-hashes.sql`. Shared password: `TempPassword123!`.

Start backend (`npm start` in `/server`) and frontend (`npm run dev` in `/client`).

## 1. Employee cannot access admin pages

1. Log in as `tbauer`.
2. Open http://localhost:5173/admin/employees
3. Expected: redirect to http://localhost:5173/dashboard

## 2. Manager cannot call admin API endpoints

1. Log in as `eweber` and copy the JWT from localStorage (`authToken`) or from the login response.
2. Call:

```bash
curl http://localhost:5000/api/employees -H "Authorization: Bearer YOUR_TOKEN"
```

3. Expected: HTTP 403 and a German permission message.

## 3. Administrator can view employee data

1. Log in as `aschmidt`.
2. Open http://localhost:5173/admin/employees
3. Expected: table with Personalnummer, Name, E-Mail, Abteilung, Vorgesetzter, Rolle, Status.

## 4. Administrator can create an employee with a bcrypt-hashed password

1. Open http://localhost:5173/admin/employees/new
2. Fill required fields, role Mitarbeiter, Anfangspasswort at least 8 characters.
3. Save.
4. Expected: redirect to the employee list; the new person appears. The password is not shown again.
5. Optional check in pgAdmin: `password_hash` for the new user starts with `$2b$`.

## 5. Duplicate username, email, and employee number are rejected

Repeat create/edit with an existing username, then email, then Personalnummer.

Expected: German error messages, no second row.

## 6. Administrator cannot deactivate their own account

On the employee list, for Anna Schmidt (`aschmidt` / own row): **Deaktivieren** is disabled or the API returns HTTP 403 “Sie können Ihr eigenes Konto nicht deaktivieren.”

## 7. A department with employees cannot be deleted

1. Open http://localhost:5173/admin/departments
2. Delete **Information Technology**.
3. Expected: confirmation dialog, then a German message that employees are still assigned. The department remains.

## 8. A leave type can be created and edited

1. Open http://localhost:5173/admin/leave-types
2. Create a type, then edit its name/description.
3. Expected: it appears in the table and updates after save.

## 9. Inactive leave types are shown clearly

Deactivate a leave type.

Expected: status badge **Inaktiv** and a visually quieter table row.

## 10. Audit log records administrative actions

After the steps above:

```bash
curl http://localhost:5000/api/audit-logs -H "Authorization: Bearer ADMIN_TOKEN"
```

Or in pgAdmin:

```sql
SELECT action, entity_type, entity_id, description, created_at
  FROM audit_logs
 ORDER BY created_at DESC
 LIMIT 20;
```

Expected: rows for create/update/status/delete actions by the administrator username `aschmidt`.
