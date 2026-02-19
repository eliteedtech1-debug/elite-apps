// utils/codeGenerator.js
const db = require("../models");

/**
 * Generates next sequential code based on description (e.g., 'class' → CLS0001)
 * @param {string} description - e.g., 'class', 'branch_code', 'school_code'
 * @returns {Promise<string>} - e.g., 'CLS0001'
 */
async function getNextCodeByDescription(description) {
  if (!description) {
    throw new Error("description is required");
  }

  const cleanDescription = description.trim();
  if (!cleanDescription) {
    throw new Error("description cannot be empty");
  }

  return db.sequelize.transaction(async (t) => {
    // Step 1: Get prefix
    const rows = await db.sequelize.query(
      `SELECT prefix FROM number_generator WHERE description = :description`,
      { 
        type: db.sequelize.QueryTypes.SELECT, 
        replacements: { description: cleanDescription } 
      }
    );

    if (rows.length === 0) {
      const knownDescriptions = (
        await db.sequelize.query(`SELECT description FROM number_generator`, {
          type: db.sequelize.QueryTypes.SELECT,
        })
      ).map((r) => r.description);

      throw new Error(
        `Unknown description: "${cleanDescription}". ` +
          `Available descriptions: [${knownDescriptions.join(", ")}]`
      );
    }

    const { prefix } = rows[0];
    if (!prefix) {
      throw new Error(`prefix is missing for description: "${cleanDescription}"`);
    }

    // Step 2: Lock and increment the code
    const codeRows = await db.sequelize.query(
      `SELECT code FROM number_generator WHERE description = :description FOR UPDATE`,
      {
        replacements: { description: cleanDescription },
        type: db.sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );

    // 🔑 CRITICAL FIXES:
    // 1. Parse as integer
    // 2. Validate range to prevent overflow/corruption
    // 3. Reset if invalid
    let currentCode = parseInt(codeRows[0]?.code, 10);
    
    // Handle NaN, negative, or absurdly large values
    if (isNaN(currentCode) || currentCode < 0 || currentCode > 1000000) {
      console.warn(
        `⚠️ Invalid code detected for '${cleanDescription}': ${codeRows[0]?.code}. Resetting to 0.`
      );
      currentCode = 0;
    }

    const nextCode = currentCode + 1;

    // Prevent sequence exhaustion
    if (nextCode > 999999) {
      throw new Error(`Code sequence exhausted for '${cleanDescription}' (max 999999)`);
    }

    // Update the sequence
    await db.sequelize.query(
      `UPDATE number_generator SET code = :nextCode WHERE description = :description`,
      { 
        replacements: { nextCode, description: cleanDescription }, 
        transaction: t 
      }
    );

    // Format with leading zeros (always 4+ digits)
    return `${prefix}${String(nextCode).padStart(4, "0")}`;
  });
}

module.exports = { getNextCodeByDescription };