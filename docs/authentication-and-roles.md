# Authentication and roles

This document describes login, password storage, JWT sessions, and role checks for the bachelor thesis application. All demo people and passwords are fictional.

## Login flow

1. The public landing page links to `/login`.
2. The user submits a username and password.
3. The React client sends `POST /api/auth/login` with JSON `{ "username", "password" }`.
4. The Express server looks up the username in PostgreSQL with a parameterized query and joins the matching employee row.
5. The submitted password is compared to `users.password_hash` with bcrypt.
6. On success, the API returns a JWT and a public user object (no password and no hash).
7. The client stores the token and user in `localStorage` and opens `/dashboard`.
8. Protected API calls send `Authorization: Bearer <token>`.
9. `GET /api/auth/me` reloads the current user from the database.
10. **Abmelden** removes the stored token and user and returns to the landing page.

Failed logins always use a generic German error. The API does not say whether the username or the password was wrong.

## Password hashing

Seed data originally stored the temporary plain-text value `TempPassword123!` in `password_hash`. That is not a hash.

Phase 5 adds `server/sql/update-demo-password-hashes.sql`. After you run that script in pgAdmin, every demo account stores a bcrypt hash of the same local demo password. Login uses `bcrypt.compare` only. `schema.sql` and `seed.sql` are not modified.

Authenticated users can change **only their own** password with `PUT /api/auth/change-password`. Details, rules, and data-minimization notes are in `/docs/password-security.md`. There is no e-mail password reset.

Do not use this demo password or these hashes outside local development.

## JWT authentication

A signed JSON Web Token is issued after a successful login. The token payload contains the user id (`sub`), role, and employee id. It does not contain the password or the password hash.

The secret `JWT_SECRET` lives only in `server/.env`. `authenticateToken` reads the Bearer token, verifies the signature, and attaches `req.auth` for later handlers.

## Authorization by roles

Roles come from the PostgreSQL enum `user_role`:

- `EMPLOYEE` — own leave and sickness placeholders on the dashboard
- `MANAGER` — department review placeholders
- `ADMINISTRATOR` — administration placeholders and `GET /api/admin/test`

`authorizeRoles(...roles)` runs after `authenticateToken`. A valid token with the wrong role receives HTTP 403.

## Limitations of localStorage

This student project stores the JWT in `localStorage` so the browser can send it again after a refresh. That is convenient locally, but it is not a production session design:

- JavaScript on the page can read the token (XSS risk).
- The token is not a server-side session that can be revoked instantly.
- Production systems typically use httpOnly cookies, short lifetimes, refresh tokens, and stricter CSRF controls.

## Fictional demo data

Names, departments, usernames, and the shared demo password are invented for the thesis. They do not represent real employees. Do not copy these credentials into a live system.
