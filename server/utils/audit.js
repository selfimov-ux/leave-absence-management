async function writeAuditLog(queryable, entry) {
  try {
    await queryable.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.userId,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.description,
      ]
    )
    return true
  } catch (err) {
    console.error('Audit log failed:', err.message)
    return false
  }
}

module.exports = {
  writeAuditLog,
}
