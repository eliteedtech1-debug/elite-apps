const db = require("../models"); // Adjust the path to your db connection
const sequelize = db.sequelize;
const moment = require("moment");
const { QueryTypes } = require("sequelize");

// const schoolRevenues = async (req, res) => {
//   const operations = Array.isArray(req.body) ? req.body : [req.body];
//   const results = [];
//   try {
//     for (const operation of operations) {
//       const {
//         query_type = null,
//         id = null,
//         description = null,
//         amount = null,
//         term = [],
//         revenue_type = null,
//         section = null,
//         class_name = [],
//         is_optional = null,
//         status = null,
//         account_type = null,
//         branch_id = null,
//         academic_year = null,
//         quantity = 1, // Default to 1 if not provided
//       } = operation;
//       // term can also be single term:"First Term"
//       // Create cross-product of class_name and term
//       const processedOperations = class_name.length > 0 && term.length > 0
//         ? class_name.flatMap(cls => 
//             term.map(termItem => ({
//               ...operation,
//               class_code: cls.value, 
//               term: termItem.value,
//               class_name: cls.label
//             }))
//           )
//         : [operation];

//       // Process each combination
//       for (const processedOperation of processedOperations) {
//         const result = await db.sequelize.query(
//           `CALL school_revenues(:query_type,:id,:description,:amount,:term,:section,:class_name,:class_code,:revenue_type,:is_optional,:status,:account_type,:school_id,:branch_id,:academic_year,:quantity)`,
//           {
//             replacements: {
//               query_type,
//               id: processedOperation.id ?? null,
//               description,
//               amount,
//               term: processedOperation.term ?? null,
//               section, 
//               class_name: processedOperation.class_name ?? null,
//               class_code: processedOperation.class_code ?? null, 
//               revenue_type,
//               is_optional,
//               status,
//               account_type,
//               branch_id: processedOperation.branch_id ?? req.user.branch_id,
//               school_id: req.user.school_id,
//               academic_year,
//               quantity: quantity || 1 // Ensure quantity is always at least 1: quantity || 1 // Ensure quantity is always at least 1: quantity || 1 // Ensure quantity is always at least 1: quantity || 1 // Ensure quantity is always at least 1: quantity || 1 // Ensure quantity is always at least 1
//             },
//           }
//         );

//         results.push(result);
//       }
//     }

//     res.status(200).json({ success: true, data: results.flat() });
//   } catch (error) {
//     console.error("Error executing school_revenues operation:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// Normalize term into array of { value, label }
const normalizeTerm = (term) => {
  if (!term) return [];
  if (Array.isArray(term)) return term;
  if (typeof term === 'string') return [{ value: term, label: term }];
  if (typeof term === 'object' && term.value && term.label) return [term];
  console.warn("Unexpected term format:", term);
  return [];
};

// Normalize class_name into array of { value, label }
const normalizeClass = (cls) => {
  if (!cls) return [];
  if (Array.isArray(cls)) return cls;
  if (typeof cls === 'string') return [{ value: cls, label: cls }];
  if (typeof cls === 'object' && cls.value && cls.label) return [cls];
  console.warn("Unexpected class_name format:", cls);
  return [];
};

// // In your loop:
// const terms = normalizeTerm(operation.term);
// const classes = normalizeClass(operation.class_name);

const getSchoolRevenues = async (req, res) => {
try{
      const {
        query_type = null,
        id = null,
        description = null,
        amount = null,
        revenue_type = null,
        section = null,
        is_optional = null,
        status = null,
        class_code=null,
        class_name=null,
        account_type = null,
        branch_id = null,
        academic_year = null,
        term=null,
        quantity = 1, // Default to 1 if not provided
      } = req.query;

        const result = await db.sequelize.query(
          `CALL school_revenues(
            :query_type,
            :id,
            :description,
            :amount,
            :term,
            :section,
            :class_name,
            :class_code,
            :revenue_type,
            :is_optional,
            :status,
            :account_type,
            :school_id,
            :branch_id,
            :academic_year,
            :quantity
          )`,
          {
            replacements: {
              query_type,
              id: id ?? null,
              description,
              amount,
              term: term ?? null,
              section,
              class_name: class_name ?? null,
              class_code: class_code ?? null,
              revenue_type,
              is_optional,
              status: status ?? 'Active',
              account_type,
              branch_id:
                branch_id ?? branch_id ?? req.user.branch_id,
              school_id: req.user.school_id,
              academic_year,
              quantity: quantity || 1, // Ensure quantity is always at least 1
            },
          }
        );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error executing school_revenues operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const schoolRevenues = async (req, res) => {
  try {
    const operations = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    // Helper: Normalize term/class to array of { value, label }
    const normalizeField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') return [{ value: field, label: field }];
      if (typeof field === 'object' && field.value != null && field.label != null) {
        return [field];
      }
      console.warn("Unexpected field format:", field);
      return [];
    };

    for (const operation of operations) {
      const {
        query_type = null,
        id = null,
        description = null,
        amount = null,
        revenue_type = null,
        section = null,
        is_optional = null,
        status = null,
        account_type = null,
        branch_id = null,
        academic_year = null,
        quantity = 1, // Default to 1 if not provided
      } = operation;

      // Normalize term and class_name
      const terms = normalizeField(operation.term);
      const classes = normalizeField(operation.class_name);

      // Generate cross-product: each class × each term
      const processedOperations =
        classes.length > 0 && terms.length > 0
          ? classes.flatMap((cls) =>
              terms.map((termItem) => ({
                ...operation,
                class_code: cls.value,
                class_name: cls.label,
                term: termItem.value,
                term_label: termItem.label, // optional: if you need to store/display label
              }))
            )
          : [
                {
                  ...operation,
                  class_code: null,
                  class_name: null,
                  term: null,
                },
              ];

      // Execute each processed operation
      for (const processedOperation of processedOperations) {
        const result = await db.sequelize.query(
          `CALL school_revenues(
            :query_type,
            :id,
            :description,
            :amount,
            :term,
            :section,
            :class_name,
            :class_code,
            :revenue_type,
            :is_optional,
            :status,
            :account_type,
            :school_id,
            :branch_id,
            :academic_year,
            :quantity
          )`,
          {
            replacements: {
              query_type,
              id: processedOperation.id ?? null,
              description,
              amount,
              term: processedOperation.term ?? null,
              section,
              class_name: processedOperation.class_name ?? null,
              class_code: processedOperation.class_code ?? null,
              revenue_type,
              is_optional,
              status: status ?? 'Active',
              account_type,
              branch_id:
                processedOperation.branch_id ?? branch_id ?? req.user.branch_id,
              school_id: req.user.school_id,
              academic_year,
              quantity: quantity || 1, // Ensure quantity is always at least 1
            },
          }
        );

        results.push(result);
      }
    }

    res.status(200).json({ success: true, data: results.flat() });
  } catch (error) {
    console.error("Error executing school_revenues operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const singleschoolRevenues = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];
  try {
    for (const operation of operations) {
      const {
        query_type = null,
        id = null,
        description = null,
        amount = null,
        term = [],
        revenue_type = null,
        section = null,
        class_name = [],
        is_optional = null,
        status = null,
        account_type = null,
        branch_id = null,
        academic_year = null,
        quantity = 1, // Default to 1 if not provided
      } = operation;

       await db.sequelize.query(
          `CALL school_revenues(:query_type,:id,:description,:amount,:term,:section,:class_name,:class_code,:revenue_type,:is_optional,:status,:account_type,:school_id,:branch_id,:academic_year,:quantity)`,
          {
            replacements: {
              query_type,
              id,
              description,
              amount,
              term,
              section, 
              class_name,
              class_code, 
              revenue_type,
              is_optional,
              status,
              account_type,
              branch_id: branch_id ?? req.user.branch_id,
              school_id: req.user.school_id,
              academic_year,
              quantity
            },
          }
        );
      
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error executing school_revenues operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const generateRefNo = async () => {
  let refNo = moment().format("YYmmSS");
  refNo = refNo + `${Math.floor(10 + Math.random() * 9)}`;
  return refNo;
};

// Handle create-with-accounting-replace query type
const handleCreateWithAccountingReplace = async (req, res, transaction) => {
  console.log('🔧 Starting accounting replace with db.sequelize.query()...');
  
  try {
    const {
      admission_no,
      class_name,
      term,
      academic_year,
      branch_id,
      school_id,
      created_by,
      bill_items = [],
      journal_entries = []
    } = req.body;

    console.log('Processing create-with-accounting-replace for:', admission_no);

    // Step 1: Check for existing active bills to prevent duplicates
    const existingBillsQuery = `
      SELECT COUNT(*) as count FROM payment_entries 
      WHERE admission_no = :admission_no 
        AND term = :term 
        AND academic_year = :academic_year 
        AND school_id = :school_id
        AND payment_status NOT IN ('Excluded', 'Cancelled')
    `;

    const [existingBills] = await sequelize.query(existingBillsQuery, {
      replacements: { admission_no, term, academic_year, school_id },
      type: sequelize.QueryTypes.SELECT
    });

    if (existingBills.count > 0) {
      console.log(`⚠️ Found ${existingBills.count} existing active bills for ${admission_no}`);
      // Only proceed if explicitly replacing
      if (!req.body.force_replace) {
        return res.status(409).json({
          success: false,
          message: `Student ${admission_no} already has active bills for ${term} ${academic_year}. Use force_replace=true to override.`,
          existing_bills: existingBills.count
        });
      }
    }

    // Step 2: Delete existing bills for this student, term, and academic year (REPLACE mode)
    const deleteQuery = `
      UPDATE payment_entries 
      SET payment_status = 'Excluded', 
          updated_by = :created_by,
          updated_at = NOW()
      WHERE admission_no = :admission_no 
        AND term = :term 
        AND academic_year = :academic_year 
        AND school_id = :school_id
        AND payment_status != 'Excluded'
    `;

    await sequelize.query(deleteQuery, {
      replacements: {
        admission_no,
        term,
        academic_year,
        school_id,
        created_by
      },
      type: sequelize.QueryTypes.UPDATE
    });

    console.log('Excluded existing bills for student:', admission_no);

    // Step 2: Generate new reference number
    const refNo = await generateRefNo();

    // Step 3: Create new bill items
    const insertPromises = bill_items.map((item, index) => {
      const itemId = `${refNo}_${index + 1}`;
      
      const insertQuery = `
        INSERT INTO payment_entries (
          item_id, ref_no, admission_no, class_code, academic_year, term,
          cr, dr, description, quantity, discount, fines,
          item_category, payment_mode, payment_status, 
          school_id, branch_id, created_by, created_at
        ) VALUES (
          :item_id, :ref_no, :admission_no, :class_code, :academic_year, :term,
          :cr, :dr, :description, :quantity, :discount, :fines,
          :item_category, :payment_mode, :payment_status,
          :school_id, :branch_id, :created_by, NOW()
        )
      `;

      return sequelize.query(insertQuery, {
        replacements: {
          item_id: itemId,
          ref_no: refNo,
          admission_no,
          class_code: class_name,
          academic_year,
          term,
          cr: item.netAmount || item.baseAmount || 0,
          dr: 0,
          description: item.description || 'Copied Bill Item',
          quantity: item.quantity || 1,
          discount: item.discount || 0,
          fines: item.fines || 0,
          item_category: 'Fees',
          payment_mode: 'Pending',
          payment_status: 'Pending',
          school_id,
          branch_id,
          created_by
        },
        type: sequelize.QueryTypes.INSERT
      });
    });

    await Promise.all(insertPromises);
    console.log(`Created ${bill_items.length} new bill items for student:`, admission_no);

    // Step 4: Create journal entries if provided
    if (journal_entries && journal_entries.length > 0) {
      const journalPromises = journal_entries.map(entry => {
        const journalQuery = `
          INSERT INTO journal_entries (
            entry_date, reference_no, account_name, account_type,
            debit_amount, credit_amount, description,
            admission_no, term, academic_year,
            school_id, branch_id, created_by, created_at
          ) VALUES (
            CURDATE(), :reference_no, :account_name, :account_type,
            :debit_amount, :credit_amount, :description,
            :admission_no, :term, :academic_year,
            :school_id, :branch_id, :created_by, NOW()
          )
        `;

        return sequelize.query(journalQuery, {
          replacements: {
            reference_no: refNo,
            account_name: entry.account,
            account_type: entry.accountType,
            debit_amount: entry.debit || 0,
            credit_amount: entry.credit || 0,
            description: entry.description || 'Bill copy journal entry',
            admission_no,
            term,
            academic_year,
            school_id,
            branch_id,
            created_by
          },
          type: sequelize.QueryTypes.INSERT
        }).catch(error => {
          // Journal entries are optional - log error but don't fail the operation
          console.warn('Journal entry creation failed (continuing):', error.message);
          return null;
        });
      });

      await Promise.allSettled(journalPromises);
      console.log(`Processed ${journal_entries.length} journal entries`);
    }

    console.log('✅ Bills copied successfully with accounting replace mode');

    res.json({
      success: true,
      message: "Bills copied successfully with accounting replace mode",
      data: {
        admission_no,
        ref_no: refNo,
        items_created: bill_items.length,
        journal_entries_created: journal_entries.length,
        operation: 'replace'
      }
    });

  } catch (error) {
    console.error('❌ Error in handleCreateWithAccountingReplace:', error);
    res.status(500).json({
      success: false,
      message: "Error processing bill copy with accounting replace",
      error: error.message
    });
  }
};
const payments = async (req, res) => {
  console.log("USER", { MAIN: req.user }, "========>");
  console.log('🔧 Starting payments processing with db.sequelize.query()...');

  try {
    // Handle special query types that need custom processing
    if (req.body.query_type === 'create-with-accounting-replace') {
      return await handleCreateWithAccountingReplace(req, res, null); // Pass null instead of transaction
    }

    // Ensure data is an array
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const refNo = await generateRefNo();

    // Run all queries in bulk with Promise.all (without transaction)
    const results = await Promise.all(
      data.map((element) => {
        const {
          query_type = null,
          id = null,
          admission_no = null,
          class_name = null,
          ref_no = null,
          item_code = null,
          description = null,
          amount = 0,
          discount = 0,
          fines = 0,
          qty = 1,
          academic_year = null,
          term = null,
          status = null,
          due_date = null,
          payment_date = null,
          payment_mode = null,
          created_by = null,
          school_id = null,
          branch_id = null,
          limit = null,
          offset = null,
          start_date = null,
          end_date = null,
          total = 0.0,
        } = element;

        return sequelize.query(
          `CALL manage_payments(
            :query_type,
            :id,
            :admission_no,
            :class_name,
            :ref_no,
            :item_code,
            :description,
            :amount,
            :discount,
            :fines,
            :qty,
            :academic_year,
            :term,
            :status,
            :due_date,
            :payment_date,
            :payment_mode,
            :created_by,
            :branch_id,
            :school_id,
            :limit,
            :offset,
            :start_date,
            :end_date,
            :total
          )`,
          {
            replacements: {
              query_type,
              id,
              admission_no,
              class_name,
              ref_no: ["create", "copy"].includes(query_type) ? refNo : ref_no,
              item_code,
              description,
              amount,
              discount,
              fines,
              qty,
              academic_year,
              term,
              status: status ?? null,
              due_date,
              payment_date,
              payment_mode,
              branch_id: branch_id ?? req.user.branch_id,
              school_id: req.user.school_id,
              created_by,
              limit,
              offset,
              start_date,
              end_date,
              total: parseFloat(total),
            },
            type: sequelize.QueryTypes.RAW
          }
        );
      })
    );

    console.log('✅ Payments processed successfully without transactions');

    res.json({
      success: true,
      message: "Payments processed successfully",
      data: results,
    });
  } catch (error) {
    console.error("❌ Error processing manage_payments :", error);
    res.status(500).json({
      success: false,
      message: "Error executing stored procedures",
      error: error.message,
    });
  }
};



// Controller to handle creating transactions (single or bulk)
const createTransaction = async (req, res) => {
  try {
    const transactions = req.body.transactions; // Expecting an array of transactions

    // Check if it's a bulk insert or a single insert
    if (Array.isArray(transactions)) {
      // For bulk insert, we process each transaction entry
      const transactionData = transactions.map((transaction) => [
        transaction.student_id,
        transaction.revenue_head_id,
        transaction.amount_paid,
        transaction.payment_method,
        transaction.transaction_reference,
      ]);

      // Bulk insert using Sequelize query (ensure the transaction table is the right one)
      await db.sequelize.query(
        `CALL insert_transaction(:student_id, :revenue_head_id, :amount_paid, :payment_method, :transaction_reference)`,
        {
          replacements: {
            student_id: transactionData[0][0], // Set parameters for each
            revenue_head_id: transactionData[0][1],
            amount_paid: transactionData[0][2],
            payment_method: transactionData[0][3],
            transaction_reference: transactionData[0][4],
          },
          type: QueryTypes.INSERT,
        }
      );
      return res
        .status(201)
        .json({ message: "Transactions created successfully" });
    } else {
      // If not an array, treat it as a single transaction
      const {
        student_id,
        revenue_head_id,
        amount_paid,
        payment_method,
        transaction_reference,
      } = req.body;
      await db.sequelize.query(
        `CALL insert_transaction(:student_id, :revenue_head_id, :amount_paid, :payment_method, :transaction_reference)`,
        {
          replacements: {
            student_id,
            revenue_head_id,
            amount_paid,
            payment_method,
            transaction_reference,
          },
          type: QueryTypes.INSERT,
        }
      );
      return res
        .status(201)
        .json({ message: "Transaction created successfully" });
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// Controller to update the transaction status
const updateTransactionStatus = async (req, res) => {
  const {
    transaction_id,
    payment_status,
    document_status,
    print_count,
    print_by,
  } = req.body;
  try {
    await db.sequelize.query(
      `CALL update_transaction_status(:transaction_id, :payment_status, :document_status, :print_count, :print_by)`,
      {
        replacements: {
          transaction_id,
          payment_status,
          document_status,
          print_count,
          print_by,
        },
        type: QueryTypes.UPDATE,
      }
    );
    return res
      .status(200)
      .json({ message: "Transaction status updated successfully" });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// Controller to update the transaction status
const receiptUrls = async (req, res) => {
  const { query_type, id, ref_no, url } = req.body;
  try {
    await db.sequelize.query(
      `CALL receipt_urls(:query_type, :id, :ref_no, :url)`,
      {
        replacements: {
          query_type,
          id,
          ref_no,
          url,
        },
        type: QueryTypes.UPDATE,
      }
    );
    return res
      .status(200)
      .json({ success: true, message: "Payment URL  updated successfully" });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
};

const genericSchoolFees = async (req, res) => {
  try {
    const feesData = Array.isArray(req.body) ? req.body : [req.body];

    if (!feesData.length) {
      return res.status(400).json({ message: "Invalid or empty data array" });
    }

    // Extract school_id from authenticated user
    const school_id = req.user?.dataValues?.school_id;

    if (!school_id) {
      return res
        .status(403)
        .json({ message: "Unauthorized: School ID not found" });
    }

    // Prepare multiple calls to the stored procedure
    const queries = feesData.map((fee) => {
      return db.sequelize.query(
        `CALL genericSchoolFees(:query_type, :id, :section, :description, :class_name, :fees, :term, :academic_year, :status, :created_by, :school_id)`,
        {
          replacements: {
            query_type: fee.query_type || "INSERT", // Default to INSERT
            id: fee.id || null,
            section: fee.section || null,
            description: fee.description || null,
            class_name: fee.class_name || null,
            fees: fee.fees || null,
            term: fee.term || null,
            academic_year: fee.academic_year || null,
            status: fee.status || "Active",
            created_by: fee.created_by || "Admin",
            school_id: school_id ?? req.user.school_id, // Automatically assign user's school_id
          },
          type: db.sequelize.QueryTypes.RAW,
        }
      );
    });

    // Execute all queries in parallel
    await Promise.all(queries);

    res.status(201).json({
      message: "Fees inserted successfully",
      insertedCount: feesData.length,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const schoolFeesProgress = async (req, res) => {
  try {
    const { startDate, endDate, school_id, branch_id } = req.body;

    // Get school_id and branch_id from request body, JWT user, or headers
    const schoolId = school_id || req.user?.school_id || req.headers['x-school-id'];
    const branchId = branch_id || req.user?.branch_id || req.headers['x-branch-id'];

    console.log('📊 School Fees Progress Request:', {
      startDate,
      endDate,
      school_id: schoolId,
      branch_id: branchId,
      user: req.user?.user_id
    });

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, error: 'Start date cannot be later than end date' });
    }

    // Validate school_id
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'School ID is required' });
    }

    // Build query with school_id and optional branch_id filtering
    // Note: Fees/Income are identified by cr > 0 (credit entries)
    let query = `
      SELECT
        CONCAT(COALESCE(academic_year, 'N/A'), '/', COALESCE(term, 'N/A')) AS period,
        SUM(CASE
          WHEN payment_status IN ('Confirmed', 'Paid', 'completed') AND cr > 0
          THEN cr
          ELSE 0
        END) AS collected_fee,
        SUM(CASE WHEN cr > 0 THEN cr ELSE 0 END) AS total_fee
      FROM payment_entries
      WHERE created_at BETWEEN :startDate AND :endDate
        AND school_id = :schoolId
        AND payment_status NOT IN ('Excluded', 'Cancelled', 'Reversed')
        AND cr > 0`;

    const replacements = { startDate, endDate, schoolId };

    // Add branch_id filter if provided
    if (branchId) {
      query += ` AND branch_id = :branchId`;
      replacements.branchId = branchId;
    }

    query += `
      GROUP BY academic_year, term
      HAVING total_fee > 0
      ORDER BY academic_year DESC, FIELD(term, 'First Term', 'Second Term', 'Third Term')
      LIMIT 9`;

    // Log the final query for debugging
    console.log('🔍 Executing SQL Query:', query);
    console.log('🔍 With Replacements:', replacements);

    const rows = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${rows.length} fee periods for school ${schoolId}` + (branchId ? ` branch ${branchId}` : ''));
    console.log('📊 Query Results:', JSON.stringify(rows, null, 2));

    // Verify the data is actually filtered - run a count query to double-check
    const verifyQuery = `
      SELECT COUNT(*) as total_records,
             COUNT(DISTINCT branch_id) as distinct_branches,
             COUNT(DISTINCT school_id) as distinct_schools
      FROM payment_entries
      WHERE created_at BETWEEN :startDate AND :endDate
        AND school_id = :schoolId
        ${branchId ? 'AND branch_id = :branchId' : ''}
    `;

    const verifyResult = await db.sequelize.query(verifyQuery, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log('🔍 Verification Query Results:', verifyResult[0]);

    // Get sample records to understand data format
    const sampleQuery = `
      SELECT school_id, branch_id, academic_year, term, cr, payment_status, created_at
      FROM payment_entries
      WHERE created_at BETWEEN :startDate AND :endDate
        AND school_id = :schoolId
        ${branchId ? 'AND branch_id = :branchId' : ''}
      LIMIT 5
    `;

    const sampleRecords = await db.sequelize.query(sampleQuery, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log('🔍 Sample Records:', JSON.stringify(sampleRecords, null, 2));

    // Return clean response (debug info already logged to console)
    return res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('❌ Error fetching fees:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};


const revenueExpenditureReport = async (req, res) => {
  try {
    const { startDate, endDate, school_id, branch_id } = req.body;

    // Get school_id and branch_id from request body, JWT user, or headers
    const schoolId = school_id || req.user?.school_id || req.headers['x-school-id'];
    const branchId = branch_id || req.user?.branch_id || req.headers['x-branch-id'];

    console.log('📊 Revenue Expenditure Report Request:', {
      startDate,
      endDate,
      school_id: schoolId,
      branch_id: branchId,
      user: req.user?.user_id
    });

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, error: 'Start date cannot be later than end date' });
    }

    // Validate school_id
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'School ID is required' });
    }

    // Build query with school_id and optional branch_id filtering
    // ✅ FIXED: Revenue = Actual Payments Received minus Refunds
    // Expenditure = Expenses + Payroll + Discounts + Scholarships + Refunds
    let query = `
      SELECT
        CONCAT(COALESCE(pe.academic_year, 'N/A'), '/', COALESCE(pe.term, 'N/A')) AS period,
        SUM(
          CASE
            WHEN pe.dr > 0 AND pe.payment_status IN ('Confirmed', 'Paid', 'completed')
            THEN pe.dr
            ELSE 0
          END
        ) - SUM(
          CASE
            WHEN pe.payment_status = 'Refund' AND pe.cr > 0
            THEN pe.cr
            ELSE 0
          END
        ) AS revenue,
        (
          SUM(
            CASE
              WHEN pe.item_category IN ('Salary', 'Payroll', 'Expense', 'Expenditure', 'Operational Cost') 
              AND pe.dr > 0
              THEN pe.dr
              WHEN pe.payment_status IN ('Discount', 'Scholarship', 'Refund') AND pe.cr > 0
              THEN pe.cr
              ELSE 0
            END
          ) +
          COALESCE((
            SELECT SUM(pl.net_pay) 
            FROM payroll_lines pl 
            WHERE pl.school_id = :schoolId 
            AND pl.created_at BETWEEN :startDate AND :endDate
            AND pl.is_processed = 1
          ), 0)
        ) AS expenditure
      FROM payment_entries pe
      WHERE pe.created_at BETWEEN :startDate AND :endDate
        AND pe.school_id = :schoolId`;

    const replacements = { startDate, endDate, schoolId };

    // Add branch_id filter if provided
    if (branchId) {
      query += ` AND branch_id = :branchId`;
      replacements.branchId = branchId;
    }

    query += `
      GROUP BY academic_year, term
      HAVING revenue > 0 OR expenditure > 0
      ORDER BY academic_year DESC, FIELD(term, 'First Term', 'Second Term', 'Third Term')
      LIMIT 9`;

    const rows = await db.sequelize.query(query, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${rows.length} revenue/expenditure periods for school ${schoolId}` + (branchId ? ` branch ${branchId}` : ''));

    return res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('❌ Error fetching revenue/expenditure:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};



// GET PAYMENTS FUNCTION - For backward compatibility
const getPayments = async (req, res) => {
  try {
    let {
      query_type = 'select-entries',
      id = null,
      admission_no = null,
      class_name = null,
      ref_no = null,
      academic_year = null,
      term = null,
      branch_id = null,
      limit = 50,
      offset = 0,
      start_date = null,
      end_date = null,
    } = req.query;

    console.log("GET PAYMENTS USER", { MAIN: req.user }, "========>");
    console.log("GET PAYMENTS QUERY", req.query, "========>");
    console.log('🔍 Original class_name parameter:', req.query.class_name);
    console.log('🔍 Original class_code parameter:', req.query.class_code);

    // Handle legacy query types for backward compatibility
    if (query_type === 'class-payments') {
      query_type = 'select-bills';
      console.log('Converting legacy query_type "class-payments" to "select-bills"');
    }

    // Handle class_code parameter by mapping it to class_name
    if (req.query.class_code && !class_name) {
      class_name = req.query.class_code;
      console.log('Using class_code as class_name:', class_name);
    }

    // Handle class name to class code conversion
    // If class_name looks like a human-readable name (contains spaces or doesn't start with CLS), 
    // try to convert it to class_code
    if (class_name && (class_name.includes(' ') || !class_name.startsWith('CLS'))) {
      console.log('🔍 Attempting to convert class name to class code:', class_name);
      try {
        const classLookupQuery = `
          SELECT class_code 
          FROM classes 
          WHERE class_name = :class_name 
            AND school_id = :school_id 
          LIMIT 1
        `;
        
        const classLookupResult = await db.sequelize.query(classLookupQuery, {
          replacements: { 
            class_name: class_name,
            school_id: req.user.school_id 
          },
          type: db.sequelize.QueryTypes.SELECT
        });
        
        if (classLookupResult && classLookupResult.length > 0) {
          const originalClassName = class_name;
          class_name = classLookupResult[0].class_code;
          console.log(`✅ Converted class name "${originalClassName}" to class code "${class_name}"`);
        } else {
          console.log(`⚠️ No class code found for class name "${class_name}"`);
        }
      } catch (classLookupError) {
        console.error('❌ Error looking up class code:', classLookupError);
        // Continue with original class_name if lookup fails
      }
    }

    console.log('🎯 Final class_name value being used in query:', class_name);
    console.log('🎯 Query type:', query_type);

    // Build SQL query based on query_type
    let sql = '';
    let replacements = {
      school_id: req.user.school_id,
      branch_id: branch_id || req.user.branch_id,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    switch (query_type) {
      case 'expense-report':
        sql = `
          SELECT 
            item_id,
            ref_no,
            DATE(created_at) as date,
            description,
            dr,
            item_category,
            payment_mode,
            branch_id,
            created_by,
            payment_status,
            academic_year,
            term,
            class_code as department,
            'Various' as vendor,
            'Various' as supplier,
            0 as tax_amount,
            '' as invoice_number,
            'Operating' as expense_type
          FROM payment_entries 
          WHERE school_id = :school_id
            AND dr > 0
            AND payment_status != 'Excluded'
          ${start_date && end_date ? 'AND DATE(created_at) BETWEEN :start_date AND :end_date' : ''}
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
          ${branch_id ? 'AND branch_id = :branch_id' : ''}
          ORDER BY created_at DESC
          LIMIT 1000
        `;
        if (start_date && end_date) {
          replacements.start_date = start_date;
          replacements.end_date = end_date;
        }
        if (academic_year) replacements.academic_year = academic_year;
        if (term) replacements.term = term;
        if (branch_id) replacements.branch_id = branch_id;
        break;

      case 'select-student':
        sql = `
          SELECT 
            item_id as id, ref_no, admission_no, class_code, academic_year, term,
            cr, dr, (cr - dr) as balance, description, quantity,
            item_category, payment_mode, payment_status, created_at, created_by
          FROM payment_entries 
          WHERE admission_no = :admission_no AND school_id = :school_id
            AND payment_status != 'Excluded'
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
          ORDER BY created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        replacements.admission_no = admission_no;
        if (academic_year) replacements.academic_year = academic_year;
        if (term) replacements.term = term;
        break;

      case 'select-bills':
        sql = `
          SELECT 
            item_id as id, ref_no, admission_no, class_code, academic_year, term,
            cr, dr, (cr - dr) as balance, description, quantity,
            item_category, payment_mode, payment_status, created_at, created_by
          FROM payment_entries 
          WHERE class_code = :class_name AND school_id = :school_id
            AND payment_status != 'Excluded'
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
          ORDER BY admission_no ASC, created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        replacements.class_name = class_name;
        if (academic_year) replacements.academic_year = academic_year;
        if (term) replacements.term = term;
        break;

      case 'select-ref':
        sql = `
          SELECT 
            item_id as id, ref_no, admission_no, class_code, academic_year, term,
            cr, dr, (cr - dr) as balance, description, quantity,
            item_category, payment_mode, payment_status, created_at, created_by
          FROM payment_entries 
          WHERE ref_no = :ref_no AND school_id = :school_id
            AND payment_status != 'Excluded'
          ORDER BY created_at DESC
        `;
        replacements.ref_no = ref_no;
        break;

      case 'balance':
        sql = `
          SELECT 
            admission_no, academic_year, term,
            SUM(cr) as total_charges,
            SUM(dr) as total_payments,
            (SUM(cr) - SUM(dr)) as outstanding_balance,
            COUNT(*) as total_entries
          FROM payment_entries 
          WHERE admission_no = :admission_no AND school_id = :school_id
            AND payment_status != 'Excluded'
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
          GROUP BY admission_no, academic_year, term
        `;
        replacements.admission_no = admission_no;
        if (academic_year) replacements.academic_year = academic_year;
        if (term) replacements.term = term;
        break;

      case 'summary':
        sql = `
          SELECT 
            COUNT(DISTINCT admission_no) as total_students,
            COUNT(DISTINCT ref_no) as total_transactions,
            COUNT(*) as total_entries,
            SUM(cr) as total_charges,
            SUM(dr) as total_payments,
            (SUM(cr) - SUM(dr)) as outstanding_balance,
            SUM(CASE WHEN payment_status = 'Confirmed' THEN cr ELSE 0 END) as confirmed_payments,
            SUM(CASE WHEN payment_status = 'Pending' THEN cr ELSE 0 END) as pending_payments,
            COUNT(DISTINCT CASE WHEN payment_status = 'Confirmed' THEN admission_no END) as students_with_payments,
            AVG(cr) as average_charge_amount,
            MIN(created_at) as earliest_transaction,
            MAX(created_at) as latest_transaction
          FROM payment_entries 
          WHERE school_id = :school_id
            AND payment_status != 'Excluded'
          ${start_date && end_date ? 'AND created_at BETWEEN :start_date AND :end_date' : ''}
          ${academic_year ? 'AND academic_year = :academic_year' : ''}
          ${term ? 'AND term = :term' : ''}
        `;
        if (start_date && end_date) {
          replacements.start_date = start_date;
          replacements.end_date = end_date;
        }
        if (academic_year) replacements.academic_year = academic_year;
        if (term) replacements.term = term;
        break;

      default:
        sql = `
          SELECT 
            item_id as id, ref_no, admission_no, class_code, academic_year, term,
            cr, dr, (cr - dr) as balance, description, quantity,
            item_category, payment_mode, payment_status, created_at, created_by
          FROM payment_entries 
          WHERE school_id = :school_id
            AND payment_status != 'Excluded'
          ${start_date && end_date ? 'AND created_at BETWEEN :start_date AND :end_date' : ''}
          ORDER BY created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        if (start_date && end_date) {
          replacements.start_date = start_date;
          replacements.end_date = end_date;
        }
    }

    const result = await db.sequelize.query(sql, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Data retrieved successfully",
      data: result || [],
      query_type,
      debug: {
        resultLength: result?.length || 0,
        extractionMethod: "direct_sql_query"
      }
    });
  } catch (error) {
    console.error("Error in GET payments:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving payment data",
      error: error.message,
    });
  }
};

// TEST PAYMENT ENTRIES FUNCTION - For debugging
const testPaymentEntries = async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT admission_no) as unique_students,
        COUNT(DISTINCT ref_no) as unique_references,
        SUM(cr) as total_charges,
        SUM(dr) as total_payments,
        (SUM(cr) - SUM(dr)) as net_balance
      FROM payment_entries 
      WHERE school_id = :school_id
    `;

    const result = await db.sequelize.query(sql, {
      replacements: { school_id: req.user.school_id },
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Payment entries test completed",
      data: result[0] || {},
      school_id: req.user.school_id
    });
  } catch (error) {
    console.error("Error in test payment entries:", error);
    res.status(500).json({
      success: false,
      message: "Error testing payment entries",
      error: error.message,
    });
  }
};

// TEST DIRECT QUERY FUNCTION - For debugging
const testDirectQuery = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required"
      });
    }

    // Only allow SELECT queries for security
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({
        success: false,
        message: "Only SELECT queries are allowed"
      });
    }

    const result = await db.sequelize.query(query, {
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      message: "Direct query executed successfully",
      data: result || [],
      query: query
    });
  } catch (error) {
    console.error("Error in test direct query:", error);
    res.status(500).json({
      success: false,
      message: "Error executing direct query",
      error: error.message,
    });
  }
};

module.exports = { 
  genericSchoolFees,
  createTransaction,
  updateTransactionStatus,
  payments,
  getPayments,
  receiptUrls,
  schoolRevenues,
  getSchoolRevenues,
  singleschoolRevenues,
  schoolFeesProgress,
  revenueExpenditureReport,
  testPaymentEntries,
  testDirectQuery
};