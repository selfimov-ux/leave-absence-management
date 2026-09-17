# Manual tests — password change

Use fictional demo users after `update-demo-password-hashes.sql`. Starting password: `TempPassword123!`.

Start backend (`npm start` in `/server`) and frontend (`npm run dev` in `/client`).

A valid new password example for tests: `NeuesPasswort1!`  
Restore the demo password afterwards with **Passwort ändern** back to `TempPassword123!`, or re-run `server/sql/update-demo-password-hashes.sql`.

## 1. Correct current password and valid new password succeeds

1. Log in as `tbauer`.
2. Click **Passwort ändern**.
3. Enter current `TempPassword123!`, new `NeuesPasswort1!`, confirmation `NeuesPasswort1!`.
4. Click **Passwort speichern**.
5. Expected: redirect to `/login` and message `Das Passwort wurde erfolgreich geändert. Bitte melden Sie sich erneut an.`

## 2. Wrong current password returns the German error

1. Log in as `eweber` (if you already changed `tbauer`).
2. Open `/change-password`.
3. Current password `WrongPass1!`, new `NeuesPasswort1!`, confirmation matching.
4. Expected: `Das aktuelle Passwort ist nicht korrekt.` Fields are cleared.

## 3. New password below 10 characters is rejected

1. Current password correct, new password `Kurz1!aB`.
2. Expected: German message that the password must be at least 10 characters.

## 4. Missing uppercase, lowercase, digit, or special character is rejected

Repeat with a correct current password and:

- `neuespasswort1!` (no uppercase)
- `NEUESPASSWORT1!` (no lowercase)
- `NeuesPasswort!` (no digit)
- `NeuesPasswort1` (no special character)

Expected: the matching German HTTP 400 / form error.

## 5. Confirmation mismatch is rejected in the frontend

1. New password `NeuesPasswort1!`, confirmation `AnderesPasswort1!`.
2. Expected: `Das neue Passwort und die Bestätigung stimmen nicht überein.` No API call required.

## 6. Reusing the current password is rejected

1. Current and new both `TempPassword123!` (or the account’s current password).
2. Expected: `Das neue Passwort darf nicht mit dem aktuellen Passwort übereinstimmen.`

## 7. Old password no longer logs in after a successful change

1. After test 1, on `/login` use `tbauer` / `TempPassword123!`.
2. Expected: `Benutzername oder Passwort ist ungültig.`

## 8. New password logs in successfully

1. Log in as `tbauer` / `NeuesPasswort1!`.
2. Expected: dashboard opens.

## 9. Audit log shows PASSWORD_CHANGED with no password or hash data

1. Log in as `aschmidt`.
2. Open `/admin/audit-logs`, filter action **Passwort geändert**.
3. Expected: row with action `PASSWORD_CHANGED` (label **Passwort geändert**), entity `USER`, description `Passwort des eigenen Benutzerkontos geändert.`
4. Confirm the description and table cells contain no password, hash, or JWT.

## 10. Employee, Manager, and Administrator can change only their own password

1. Repeat a successful change (or open the form) as `tbauer`, `eweber`, and `aschmidt`.
2. Expected: each account only updates itself; there is no user-id field.
3. Optional API check: send `userId` of another user in the JSON body with your own JWT. Expected: still only your hash changes.

## 11. Unauthenticated user cannot access the endpoint or `/change-password`

1. Sign out. Open http://localhost:5173/change-password
2. Expected: redirect to `/login`.
3. Call without a token:

```bash
curl -X PUT http://localhost:5000/api/auth/change-password -H "Content-Type: application/json" -d "{\"currentPassword\":\"x\",\"newPassword\":\"NeuesPasswort1!\"}"
```

4. Expected: HTTP 401.
