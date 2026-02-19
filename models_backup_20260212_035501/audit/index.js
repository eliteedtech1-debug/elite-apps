const { auditDB } = require('../../config/databases');

const AuditTrail = require('./AuditTrail')(auditDB, auditDB.Sequelize.DataTypes);
const EliteLog = require('./EliteLog')(auditDB, auditDB.Sequelize.DataTypes);

module.exports = {
  sequelize: auditDB,
  AuditTrail,
  EliteLog
};
