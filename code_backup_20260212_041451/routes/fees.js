module.exports = (app) => {
  app.get("/fee-structure", async (req, res) => {
    try {
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const [rows] = await pool.execute(`
        SELECT fs.*, c.class_name 
        FROM fees_structure fs
        JOIN classes c ON fs.class_id = c.class_id
        WHERE fs.is_active = TRUE
        ORDER BY c.class_name, fs.item_name
      `);
        res.json(rows);
      } else {
        res.json(mockData.feeStructure);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get fee structure by class
  app.get("/fee-structure/class/:class_id", async (req, res) => {
    try {
      const { class_id } = req.params;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const [rows] = await pool.execute(
          `
        SELECT * FROM fees_structure 
        WHERE class_id = ? AND is_active = TRUE
        ORDER BY item_name
      `,
          [class_id]
        );
        res.json(rows);
      } else {
        const fees = mockData.feeStructure.filter(
          (f) => f.class_id == class_id
        );
        res.json(fees);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create fee structure item
  app.post("/fee-structure", async (req, res) => {
    try {
      const { class_id, item_name, amount, updated_by } = req.body;

      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const [result] = await pool.execute(
          "INSERT INTO fees_structure (class_id, item_name, amount, updated_by) VALUES (?, ?, ?, ?)",
          [class_id, item_name, amount, updated_by || null]
        );
        res.json({
          fee_id: result.insertId,
          message: "Fee structure created successfully",
        });
      } else {
        res.json({
          fee_id: Date.now(),
          message: "Fee structure created (mock mode)",
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update fee structure (affects only future bills)
  app.put("/fee-structure/:fee_id", async (req, res) => {
    try {
      const { fee_id } = req.params;
      const { amount, updated_by } = req.body;

      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        await pool.execute(
          "UPDATE fees_structure SET amount = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE fee_id = ?",
          [amount, updated_by || null, fee_id]
        );
      }

      res.json({
        message: "Fee structure updated. Changes will apply to new bills only.",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===============================
  // BILL MANAGEMENT
  // ===============================

  // Get student bills (can filter by parent_id, class_id, etc.)
  app.get("/bills", async (req, res) => {
    try {
      const { parent_id, class_id, status, term_id } = req.query;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        let query = `
        SELECT sb.*, s.name as student_name, s.admission_no, c.class_name, 
               p.name as parent_name, p.email as parent_email,
               t.term_name, ses.session_name
        FROM student_bills sb
        JOIN students s ON sb.admission_no = s.admission_no
        JOIN classes c ON s.class_id = c.class_id
        JOIN parents p ON s.parent_id = p.parent_id
        JOIN terms t ON sb.term_id = t.term_id
        JOIN academic_sessions ses ON sb.session_id = ses.session_id
        WHERE 1=1
      `;

        const params = [];

        if (parent_id) {
          query += " AND s.parent_id = ?";
          params.push(parent_id);
        }

        if (class_id) {
          query += " AND s.class_id = ?";
          params.push(class_id);
        }

        if (status) {
          query += " AND sb.status = ?";
          params.push(status);
        }

        if (term_id) {
          query += " AND sb.term_id = ?";
          params.push(term_id);
        } else {
          // Default to current term
          query += " AND t.is_current = TRUE";
        }

        query += " ORDER BY c.class_name, s.name";

        const [rows] = await pool.execute(query, params);
        res.json(rows);
      } else {
        let filteredStudents = [...mockData.students];

        if (parent_id) {
          filteredStudents = filteredStudents.filter(
            (s) => s.parent_id == parent_id
          );
        }

        if (class_id) {
          filteredStudents = filteredStudents.filter(
            (s) => s.class_id == class_id
          );
        }

        if (status) {
          filteredStudents = filteredStudents.filter(
            (s) => s.current_bill?.status === status
          );
        }

        res.json(filteredStudents);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get bill details with items
  app.get("/bills/:bill_id", async (req, res) => {
    try {
      const { bill_id } = req.params;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        // Get bill details
        const [bills] = await pool.execute(
          `
        SELECT sb.*, s.name as student_name, s.admission_no, c.class_name,
               p.name as parent_name, t.term_name, ses.session_name
        FROM student_bills sb
        JOIN students s ON sb.admission_no = s.admission_no
        JOIN classes c ON s.class_id = c.class_id
        JOIN parents p ON s.parent_id = p.parent_id
        JOIN terms t ON sb.term_id = t.term_id
        JOIN academic_sessions ses ON sb.session_id = ses.session_id
        WHERE sb.bill_id = ?
      `,
          [bill_id]
        );

        if (bills.length === 0) {
          return res.status(404).json({ error: "Bill not found" });
        }

        // Get bill items
        const [items] = await pool.execute(
          `
        SELECT * FROM bill_items WHERE bill_id = ? ORDER BY item_name
      `,
          [bill_id]
        );

        const bill = bills[0];
        bill.items = items;

        res.json(bill);
      } else {
        // Mock response
        const student = mockData.students.find(
          (s) => s.current_bill?.bill_id == bill_id
        );
        if (student) {
          res.json({
            ...student.current_bill,
            student_name: student.name,
            class_name: student.class_name,
            parent_name: student.parent_name,
          });
        } else {
          res.status(404).json({ error: "Bill not found" });
        }
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate bills for current term
  app.post("/bills/generate", async (req, res) => {
    try {
      const { term_id, session_id, user_id } = req.body;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          // Get current term and session if not provided
          let currentTermId = term_id;
          let currentSessionId = session_id;

          if (!currentTermId || !currentSessionId) {
            const [currentTerm] = await connection.execute(
              "SELECT t.term_id, t.session_id FROM terms t WHERE t.is_current = TRUE LIMIT 1"
            );

            if (currentTerm.length === 0) {
              throw new Error("No current term found");
            }

            currentTermId = currentTerm[0].term_id;
            currentSessionId = currentTerm[0].session_id;
          }

          // Get all active students
          const [students] = await connection.execute(
            "SELECT * FROM students WHERE is_active = TRUE"
          );

          let billsGenerated = 0;

          for (const student of students) {
            // Check if bill already exists
            const [existingBill] = await connection.execute(
              "SELECT bill_id FROM student_bills WHERE admission_no = ? AND term_id = ? AND session_id = ?",
              [student.admission_no, currentTermId, currentSessionId]
            );

            if (existingBill.length > 0) {
              continue; // Skip if bill already exists
            }

            // Get fee structure for student's class
            const [feeItems] = await connection.execute(
              "SELECT * FROM fees_structure WHERE class_id = ? AND is_active = TRUE",
              [student.class_id]
            );

            if (feeItems.length === 0) {
              continue; // Skip if no fee structure
            }

            const total_amount = feeItems.reduce(
              (sum, item) => sum + parseFloat(item.amount),
              0
            );

            // Apply sibling discount if applicable
            const [siblingCount] = await connection.execute(
              "SELECT COUNT(*) as count FROM students WHERE parent_id = ? AND is_active = TRUE",
              [student.parent_id]
            );

            let discount_amount = 0;
            if (siblingCount[0].count >= 3) {
              discount_amount = total_amount * 0.1; // 10% discount for 3+ children
            }

            const final_amount = total_amount - discount_amount;

            // Create bill
            const [billResult] = await connection.execute(
              `INSERT INTO student_bills 
             (admission_no, term_id, session_id, total_amount, discount_amount, final_amount, balance) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                student.admission_no,
                currentTermId,
                currentSessionId,
                total_amount,
                discount_amount,
                final_amount,
                final_amount,
              ]
            );

            const bill_id = billResult.insertId;

            // Create bill items (snapshots of current fee structure)
            for (const feeItem of feeItems) {
              await connection.execute(
                "INSERT INTO bill_items (bill_id, fee_id, item_name, amount_snapshot) VALUES (?, ?, ?, ?)",
                [bill_id, feeItem.fee_id, feeItem.item_name, feeItem.amount]
              );
            }

            // Apply sibling discount record if applicable
            if (discount_amount > 0) {
              await connection.execute(
                "INSERT INTO discounts (parent_id, admission_no, type, percentage, applied_by) VALUES (?, ?, ?, ?, ?)",
                [
                  student.parent_id,
                  student.admission_no,
                  "sibling",
                  10,
                  user_id || null,
                ]
              );
            }

            billsGenerated++;
          }

          await connection.commit();
          res.json({
            message: `Bills generated successfully for ${billsGenerated} students`,
            billsGenerated,
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else {
        res.json({
          message: "Bills generated successfully (mock mode)",
          billsGenerated: 5,
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===============================
  // PAYMENT MANAGEMENT
  // ===============================

  // Record payment
  app.post("/payments", async (req, res) => {
    try {
      const {
        bill_id,
        parent_id,
        amount_paid,
        payment_method,
        reference_number,
        recorded_by,
      } = req.body;

      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          // Get current bill
          const [bills] = await connection.execute(
            "SELECT * FROM student_bills WHERE bill_id = ?",
            [bill_id]
          );

          if (bills.length === 0) {
            throw new Error("Bill not found");
          }

          const bill = bills[0];

          if (parseFloat(amount_paid) > parseFloat(bill.balance)) {
            throw new Error("Payment amount exceeds outstanding balance");
          }

          // Record payment
          const [paymentResult] = await connection.execute(
            `INSERT INTO payments 
           (bill_id, parent_id, amount_paid, payment_method, reference_number, recorded_by) 
           VALUES (?, ?, ?, ?, ?, ?)`,
            [
              bill_id,
              parent_id,
              amount_paid,
              payment_method,
              reference_number,
              recorded_by || null,
            ]
          );

          // Update bill
          const new_amount_paid =
            parseFloat(bill.amount_paid) + parseFloat(amount_paid);
          const new_balance = parseFloat(bill.final_amount) - new_amount_paid;

          let status = "partial";
          if (new_balance <= 0) {
            status = "paid";
          } else if (new_amount_paid === 0) {
            status = "unpaid";
          }

          await connection.execute(
            "UPDATE student_bills SET amount_paid = ?, balance = ?, status = ? WHERE bill_id = ?",
            [new_amount_paid, new_balance, status, bill_id]
          );

          await connection.commit();
          res.json({
            payment_id: paymentResult.insertId,
            message: "Payment recorded successfully",
            new_balance: new_balance,
            status: status,
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else {
        res.json({
          payment_id: Date.now(),
          message: "Payment recorded successfully (mock mode)",
          new_balance: 0,
          status: "paid",
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment history
  app.get("/payments", async (req, res) => {
    try {
      const { parent_id, bill_id, student_id } = req.query;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        let query = `
        SELECT p.*, sb.admission_no, s.name as student_name, t.term_name
        FROM payments p
        JOIN student_bills sb ON p.bill_id = sb.bill_id
        JOIN students s ON sb.admission_no = s.admission_no
        JOIN terms t ON sb.term_id = t.term_id
        WHERE 1=1
      `;

        const params = [];

        if (parent_id) {
          query += " AND p.parent_id = ?";
          params.push(parent_id);
        }

        if (bill_id) {
          query += " AND p.bill_id = ?";
          params.push(bill_id);
        }

        if (student_id) {
          query += " AND sb.admission_no = ?";
          params.push(student_id);
        }

        query += " ORDER BY p.payment_date DESC";

        const [payments] = await pool.execute(query, params);
        res.json(payments);
      } else {
        let payments = [...mockData.payments];

        if (parent_id) {
          payments = payments.filter((p) => p.parent_id == parent_id);
        }

        res.json(payments);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===============================
  // BILL ADJUSTMENTS
  // ===============================

  // Apply manual discount/adjustment
  app.put("/bills/:bill_id/adjust", async (req, res) => {
    try {
      const { bill_id } = req.params;
      const { discount_amount, discount_type, notes, applied_by } = req.body;

      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          // Get current bill
          const [bills] = await connection.execute(
            "SELECT * FROM student_bills sb JOIN students s ON sb.admission_no = s.admission_no WHERE sb.bill_id = ?",
            [bill_id]
          );

          if (bills.length === 0) {
            throw new Error("Bill not found");
          }

          const bill = bills[0];
          const new_discount = parseFloat(discount_amount);
          const new_final_amount = parseFloat(bill.total_amount) - new_discount;
          const new_balance = new_final_amount - parseFloat(bill.amount_paid);

          // Update bill
          await connection.execute(
            "UPDATE student_bills SET discount_amount = ?, final_amount = ?, balance = ? WHERE bill_id = ?",
            [new_discount, new_final_amount, new_balance, bill_id]
          );

          // Record manual discount
          await connection.execute(
            "INSERT INTO discounts (parent_id, admission_no, type, fixed_amount, applied_by, notes) VALUES (?, ?, ?, ?, ?, ?)",
            [
              bill.parent_id,
              bill.admission_no,
              discount_type || "manual",
              new_discount,
              applied_by || null,
              notes,
            ]
          );

          await connection.commit();
          res.json({
            message: "Bill adjusted successfully",
            new_final_amount,
            new_balance,
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else {
        res.json({
          message: "Bill adjusted successfully (mock mode)",
          new_final_amount: 50000,
          new_balance: 25000,
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===============================
  // SUMMARY REPORTS
  // ===============================

  // Get fee collection summary
  app.get("/reports/collection-summary", async (req, res) => {
    try {
      const { term_id, class_id } = req.query;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        let query = `
        SELECT 
          COUNT(sb.bill_id) as total_bills,
          SUM(sb.total_amount) as total_fees,
          SUM(sb.discount_amount) as total_discounts,
          SUM(sb.final_amount) as total_final,
          SUM(sb.amount_paid) as total_paid,
          SUM(sb.balance) as total_outstanding,
          SUM(CASE WHEN sb.status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
          SUM(CASE WHEN sb.status = 'partial' THEN 1 ELSE 0 END) as partial_bills,
          SUM(CASE WHEN sb.status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_bills
        FROM student_bills sb
        JOIN students s ON sb.admission_no = s.admission_no
        WHERE 1=1
      `;

        const params = [];

        if (term_id) {
          query += " AND sb.term_id = ?";
          params.push(term_id);
        } else {
          query +=
            " AND sb.term_id = (SELECT term_id FROM terms WHERE is_current = TRUE LIMIT 1)";
        }

        if (class_id) {
          query += " AND s.class_id = ?";
          params.push(class_id);
        }

        const [summary] = await pool.execute(query, params);
        res.json(summary[0] || {});
      } else {
        // Mock summary
        res.json({
          total_bills: 5,
          total_fees: 361000,
          total_discounts: 19500,
          total_final: 341500,
          total_paid: 197400,
          total_outstanding: 144100,
          paid_bills: 2,
          partial_bills: 2,
          unpaid_bills: 1,
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get outstanding bills report
  app.get("/reports/outstanding", async (req, res) => {
    try {
      const { class_id, min_amount } = req.query;
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        let query = `
        SELECT sb.*, s.name as student_name, s.admission_no, c.class_name,
               p.name as parent_name, p.email as parent_email, p.phone as parent_phone
        FROM student_bills sb
        JOIN students s ON sb.admission_no = s.admission_no
        JOIN classes c ON s.class_id = c.class_id
        JOIN parents p ON s.parent_id = p.parent_id
        WHERE sb.balance > 0
      `;

        const params = [];

        if (class_id) {
          query += " AND s.class_id = ?";
          params.push(class_id);
        }

        if (min_amount) {
          query += " AND sb.balance >= ?";
          params.push(min_amount);
        }

        query += " ORDER BY sb.balance DESC, c.class_name, s.name";

        const [outstanding] = await pool.execute(query, params);
        res.json(outstanding);
      } else {
        // Mock outstanding bills
        const outstanding = mockData.students
          .filter((s) => s.current_bill && s.current_bill.balance > 0)
          .map((s) => ({
            ...s.current_bill,
            student_name: s.name,
            admission_no: s.admission_no,
            class_name: s.class_name,
            parent_name: s.parent_name,
            parent_email: s.parent_email,
          }));

        res.json(outstanding);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===============================
  // INTEGRATION HELPERS
  // ===============================

  // Get current academic context
  app.get("/context/current", async (req, res) => {
    try {
      const dbAvailable = await isDatabaseAvailable();

      if (dbAvailable) {
        const [currentSession] = await pool.execute(
          "SELECT * FROM academic_sessions WHERE is_current = TRUE LIMIT 1"
        );

        const [currentTerm] = await pool.execute(
          "SELECT * FROM terms WHERE is_current = TRUE LIMIT 1"
        );

        res.json({
          session: currentSession[0] || null,
          term: currentTerm[0] || null,
        });
      } else {
        res.json({
          session: { session_id: 1, session_name: "2024-2025" },
          term: mockData.currentTerm,
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/health", async (req, res) => {
    const dbAvailable = await isDatabaseAvailable();
    res.json({
      status: "ok",
      module: "fees-management",
      database: dbAvailable ? "connected" : "mock_mode",
      timestamp: new Date().toISOString(),
    });
  });

  // Export app and initialization function
  module.exports = {
    app,
    initializeDatabase,

    // Integration functions for parent school system
    getStudentBills: async (studentId) => {
      // Helper function to get bills for a specific student
      if (await isDatabaseAvailable()) {
        const [bills] = await pool.execute(
          "SELECT * FROM student_bills WHERE admission_no = ? ORDER BY generated_at DESC",
          [studentId]
        );
        return bills;
      }
      return (
        mockData.students.find((s) => s.admission_no === studentId)
          ?.current_bill || null
      );
    },

    getParentBills: async (parentId) => {
      // Helper function to get all bills for a parent's children
      if (await isDatabaseAvailable()) {
        const [bills] = await pool.execute(
          `
        SELECT sb.*, s.name as student_name
        FROM student_bills sb
        JOIN students s ON sb.admission_no = s.admission_no
        WHERE s.parent_id = ?
        ORDER BY s.name, sb.generated_at DESC
      `,
          [parentId]
        );
        return bills;
      }
      return mockData.students.filter((s) => s.parent_id == parentId);
    },

    getOutstandingBalance: async (studentId) => {
      // Helper function to get current outstanding balance for a student
      if (await isDatabaseAvailable()) {
        const [result] = await pool.execute(
          "SELECT SUM(balance) as total_balance FROM student_bills WHERE admission_no = ? AND balance > 0",
          [studentId]
        );
        return parseFloat(result[0]?.total_balance || 0);
      }
      const student = mockData.students.find(
        (s) => s.admission_no === studentId
      );
      return student?.current_bill?.balance || 0;
    },
  };
};
// ===============================
// USAGE EXAMPLE IN MAIN SCHOOL SYSTEM
// ===============================

/*
// In your main school system's app.js or routes file:

const express = require('express');
const feesModule = require('./modules/fees/fees-routes');

const app = express();

// Initialize fees module with your existing database pool
const mysql = require('mysql2/promise');
const dbPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'school_management_system'
});

// Initialize the fees module
feesModule.initializeDatabase(dbPool);

// Mount the fees routes
app.use('/api/fees', feesModule.app);

// Use helper functions in other parts of your system
app.get('/api/students/:id/dashboard', async (req, res) => {
  const { id } = req.params;
  
  // Get student info from your existing system
  const student = await getStudentById(id);
  
  // Get fees info from fees module
  const bills = await feesModule.getStudentBills(id);
  const outstandingBalance = await feesModule.getOutstandingBalance(id);
  
  res.json({
    student,
    bills,
    outstandingBalance
  });
});
*/
