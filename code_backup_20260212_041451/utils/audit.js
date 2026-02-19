const db = require("../models");

async function auditLog({ 
  table_name, 
  record_id, 
  action, 
  old_values = null, 
  new_values = null, 
  user_id, 
  user_name 
}) {
  try {
    await db.AuditLog.create({
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      user_name,
    });
    console.log(`✅ Audit log created for ${action} on ${table_name} (ID: ${record_id})`);
  } catch (error) {
    console.error("❌ Error creating audit log:", error);
  }
}

module.exports = auditLog;
