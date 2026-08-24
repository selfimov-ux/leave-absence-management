-- =============================================================================
-- Replace temporary plain-text demo passwords with bcrypt hashes.
-- Database: leave_absence_management
--
-- Do not run this against a database that already stores real user passwords.
-- schema.sql and seed.sql are left unchanged on purpose.
--
-- The hash below was generated with bcrypt for the local demo password
-- documented in /server/README.md after this script has been applied.
-- =============================================================================

UPDATE users
   SET password_hash = '$2b$10$axLEPbwHibpg8zN/lR2a9.tmY8QDtZErro.zveM2pycp/xBOx.UnG',
       updated_at = CURRENT_TIMESTAMP
 WHERE password_hash = 'TempPassword123!';
