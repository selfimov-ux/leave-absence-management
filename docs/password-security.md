# Password security

This document describes how passwords are stored and how a signed-in user changes their own password. All names, usernames, and demo passwords are fictional. There is no e-mail “forgot password” reset in this local academic project; that is intentional.

## bcrypt storage

- Column: `users.password_hash` (`VARCHAR(255)` in `schema.sql`).
- Login compares the submitted password with `bcrypt.compare`.
- New employee accounts and self-service password changes hash with `bcrypt.hash(password, 10)` (same salt-round count as existing employee creation).
- API responses, JWT payloads, audit log rows, and application logs never contain the current password, the new password, the hash, or the JWT.

Seed data originally stored the placeholder string `TempPassword123!`. After `server/sql/update-demo-password-hashes.sql`, demo accounts use bcrypt hashes. This feature does not change `schema.sql` or `seed.sql`.

## Self-service password change

- UI: **Passwort ändern** in the header (Employee, Manager, Administrator) opens `/change-password`.
- Unauthenticated visitors are sent to `/login`.
- API: `PUT /api/auth/change-password` with a valid JWT.
- Body: `{ "currentPassword", "newPassword" }` only. A `userId` in the body is ignored; the user id always comes from `req.auth.userId`.

Rules for `newPassword`:

- at least 10 characters;
- at least one uppercase letter (`A–Z`);
- at least one lowercase letter (`a–z`);
- at least one digit;
- at least one special character (any character that is not `A–Z`, `a–z`, or `0–9`);
- must not equal `currentPassword`.

If `currentPassword` does not match the stored hash, the API returns HTTP 400 with `Das aktuelle Passwort ist nicht korrekt.`

On success the API returns HTTP 200 with `Das Passwort wurde erfolgreich geändert.` The client then clears the JWT from `localStorage` and opens `/login`.

## Audit log

A successful change writes:

- action: `PASSWORD_CHANGED`
- entity type: `USER`
- entity ID: authenticated user id
- description: `Passwort des eigenen Benutzerkontos geändert.`

The audit row must not contain passwords, hashes, tokens, or the request body.

## Out of scope

- Password reset by e-mail
- External identity providers
- Schema changes or migrations
- Changing another user’s password through this endpoint
