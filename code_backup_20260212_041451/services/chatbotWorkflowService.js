const { sequelize } = require('../models');
const Student = require('../models/Student');

class ChatbotWorkflowService {
  constructor() {
    this.activeWorkflows = new Map();
  }

  startWorkflow(userId, workflowType) {
    const workflow = {
      type: workflowType,
      step: 1,
      data: {},
      startedAt: new Date()
    };

    this.activeWorkflows.set(userId, workflow);
    return this.getWorkflowStep(userId);
  }

  getActiveWorkflow(userId) {
    return this.activeWorkflows.get(userId);
  }

  cancelWorkflow(userId) {
    this.activeWorkflows.delete(userId);
    return {
      text: '❌ **Workflow Cancelled**\n\nNo changes were made.',
      intent: 'workflow_cancelled',
      confidence: 1.0
    };
  }

  async processWorkflowInput(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    if (!workflow) return null;

    // Check for cancel
    if (input.toLowerCase().includes('cancel') || input.toLowerCase().includes('stop')) {
      return this.cancelWorkflow(userId);
    }

    try {
      switch (workflow.type) {
        case 'student_enrollment':
          return await this.processEnrollmentStep(userId, input, context);
        case 'fee_payment':
          return await this.processPaymentStep(userId, input, context);
        case 'exam_entry':
          return await this.processExamStep(userId, input, context);
        case 'teacher_assignment':
          return await this.processTeacherAssignmentStep(userId, input, context);
        default:
          return null;
      }
    } catch (error) {
      console.error('Workflow processing error:', error);
      this.activeWorkflows.delete(userId);
      return {
        text: '❌ **Error**\n\nSomething went wrong. Please try again.',
        intent: 'workflow_error',
        confidence: 0.5
      };
    }
  }

  async processEnrollmentStep(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    const step = workflow.step;

    switch (step) {
      case 1: // Student name, DOB, gender, class
        return this.parseStudentBasicInfo(userId, input);
      
      case 2: // Parent information
        return this.parseParentInfo(userId, input);
      
      case 3: // Contact details
        return this.parseContactInfo(userId, input);
      
      case 4: // Address
        return this.parseAddress(userId, input);
      
      case 5: // Confirmation
        return await this.confirmEnrollment(userId, input, context);
      
      default:
        return null;
    }
  }

  parseStudentBasicInfo(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    
    // Expected format: "John Doe, 2010-05-15, Male, JSS1"
    const parts = input.split(',').map(p => p.trim());
    
    if (parts.length < 4) {
      return {
        text: '⚠️ **Invalid Format**\n\nPlease provide:\nFull Name, Date of Birth (YYYY-MM-DD), Gender, Class\n\nExample: John Doe, 2010-05-15, Male, JSS1',
        intent: 'workflow_validation_error',
        confidence: 0.9,
        suggestions: ['Cancel enrollment']
      };
    }

    const [name, dob, gender, className] = parts;
    const nameParts = name.split(' ');
    
    workflow.data.firstName = nameParts[0];
    workflow.data.lastName = nameParts.slice(1).join(' ') || nameParts[0];
    workflow.data.dateOfBirth = dob;
    workflow.data.gender = gender.toLowerCase();
    workflow.data.className = className.toUpperCase();
    workflow.step = 2;

    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 1/5 Complete**

**Student:** ${name}
**DOB:** ${dob}
**Gender:** ${gender}
**Class:** ${className}

**Step 2/5: Parent Information**
Please provide:
Parent Name, Relationship

Example: Jane Doe, Mother`,
      intent: 'workflow_step_2',
      confidence: 1.0,
      suggestions: ['Cancel enrollment']
    };
  }

  parseParentInfo(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    const parts = input.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return {
        text: '⚠️ **Invalid Format**\n\nPlease provide:\nParent Name, Relationship\n\nExample: Jane Doe, Mother',
        intent: 'workflow_validation_error',
        confidence: 0.9,
        suggestions: ['Cancel enrollment']
      };
    }

    workflow.data.parentName = parts[0];
    workflow.data.relationship = parts[1];
    workflow.step = 3;

    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 2/5 Complete**

**Parent:** ${parts[0]}
**Relationship:** ${parts[1]}

**Step 3/5: Contact Details**
Please provide:
Phone Number, Email (optional)

Example: 08012345678, parent@email.com
Or just: 08012345678`,
      intent: 'workflow_step_3',
      confidence: 1.0,
      suggestions: ['Cancel enrollment']
    };
  }

  parseContactInfo(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    const parts = input.split(',').map(p => p.trim());
    
    workflow.data.phone = parts[0];
    workflow.data.email = parts[1] || '';
    workflow.step = 4;

    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 3/5 Complete**

**Phone:** ${parts[0]}
**Email:** ${parts[1] || 'Not provided'}

**Step 4/5: Address**
Please provide the home address:

Example: 123 Main Street, Lagos`,
      intent: 'workflow_step_4',
      confidence: 1.0,
      suggestions: ['Cancel enrollment']
    };
  }

  parseAddress(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    
    workflow.data.address = input;
    workflow.step = 5;

    this.activeWorkflows.set(userId, workflow);

    const data = workflow.data;

    return {
      text: `✅ **Step 4/5 Complete**

**Step 5/5: Confirmation**

Please review the information:

**Student Information:**
• Name: ${data.firstName} ${data.lastName}
• DOB: ${data.dateOfBirth}
• Gender: ${data.gender}
• Class: ${data.className}

**Parent Information:**
• Name: ${data.parentName}
• Relationship: ${data.relationship}
• Phone: ${data.phone}
• Email: ${data.email || 'Not provided'}
• Address: ${data.address}

Type "confirm" to complete enrollment or "cancel" to abort.`,
      intent: 'workflow_step_5',
      confidence: 1.0,
      actionButtons: [
        { type: 'action', label: '✅ Confirm', action: 'confirm_enrollment' },
        { type: 'action', label: '❌ Cancel', action: 'cancel_enrollment' }
      ]
    };
  }

  async confirmEnrollment(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    if (!input.toLowerCase().includes('confirm')) {
      return {
        text: '⚠️ Type "confirm" to complete enrollment or "cancel" to abort.',
        intent: 'workflow_awaiting_confirmation',
        confidence: 0.9
      };
    }

    const data = workflow.data;

    try {
      // Use students_queries procedure to create student
      const [result] = await sequelize.query(
        `CALL students_queries(
          'create',
          NULL,
          NULL,
          NULL,
          :student_name,
          :home_address,
          :date_of_birth,
          :sex,
          :religion,
          :state_of_origin,
          :l_g_a,
          :last_school_attended,
          :current_class,
          :admission_no,
          :school_id,
          :branch_id,
          :status,
          :academic_year,
          :term,
          :parent_name,
          :parent_phone,
          :parent_email,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL
        )`,
        {
          replacements: {
            student_name: `${data.firstName} ${data.lastName}`,
            home_address: data.address,
            date_of_birth: data.dateOfBirth,
            sex: data.gender,
            religion: '',
            state_of_origin: '',
            l_g_a: '',
            last_school_attended: '',
            current_class: data.className,
            admission_no: null, // Procedure generates this
            school_id: context.schoolId,
            branch_id: context.branchId,
            status: 'active',
            academic_year: new Date().getFullYear(),
            term: 'Term 1',
            parent_name: data.parentName,
            parent_phone: data.phone,
            parent_email: data.email
          }
        }
      );

      // Extract admission number from result
      const admissionNo = result[0]?.admission_no || 'Generated';

      // Clear workflow
      this.activeWorkflows.delete(userId);

      return {
        text: `🎉 **Enrollment Complete!**

**Admission Number:** ${admissionNo}
**Student:** ${data.firstName} ${data.lastName}
**Class:** ${data.className}

**Next Steps:**
✅ Student record created
✅ Admission number generated
✅ Initial billing created
📧 Welcome notification sent

What would you like to do next?`,
        intent: 'enrollment_complete',
        confidence: 1.0,
        actionButtons: [
          { type: 'action', label: '📄 Generate Invoice', action: 'generate_invoice' },
          { type: 'action', label: '💳 Record Payment', action: 'record_payment' },
          { type: 'action', label: '👤 View Student', action: 'view_student' }
        ],
        suggestions: [
          'Generate invoice',
          'Enroll another student',
          'Show me student list'
        ],
        data: { admissionNo }
      };

    } catch (error) {
      console.error('Enrollment error:', error);
      this.activeWorkflows.delete(userId);
      
      return {
        text: `❌ **Enrollment Failed**

Error: ${error.message}

Please try again or contact support.`,
        intent: 'enrollment_error',
        confidence: 0.5,
        suggestions: ['Try again', 'Contact support']
      };
    }
  }

  async generateAdmissionNumber(context) {
    // Not needed - students_queries procedure handles this
    return null;
  }

  async createInitialBilling(student, context) {
    // Not needed - students_queries procedure handles this
    return null;
  }

  getWorkflowStep(userId) {
    const workflow = this.activeWorkflows.get(userId);
    if (!workflow) return null;

    switch (workflow.type) {
      case 'student_enrollment':
        return {
          text: `📝 **Student Enrollment Workflow**

**Step 1/5: Student Information**
Please provide:
• Full Name
• Date of Birth (YYYY-MM-DD)
• Gender (Male/Female)
• Class (e.g., JSS1, SS2, PRIMARY 3)

Format: Name, DOB, Gender, Class

Example: John Doe, 2010-05-15, Male, JSS1`,
          intent: 'workflow_step_1',
          confidence: 1.0,
          suggestions: ['Cancel enrollment']
        };
      
      case 'fee_payment':
        return {
          text: `💳 **Fee Payment Workflow**

**Step 1/3: Student Selection**
Please provide the student's admission number or name:

Example: STU/2026/0001
Or: John Doe`,
          intent: 'workflow_step_1',
          confidence: 1.0,
          suggestions: ['Cancel payment']
        };

      case 'exam_entry':
        return {
          text: `📊 **Exam Result Entry Workflow**

**Step 1/4: Exam Details**
Please provide:
• Class (e.g., JSS1, SS2)
• Subject
• Term
• Academic Year

Format: Class, Subject, Term, Year

Example: JSS1, Mathematics, Term 1, 2026`,
          intent: 'workflow_step_1',
          confidence: 1.0,
          suggestions: ['Cancel entry']
        };

      case 'teacher_assignment':
        return {
          text: `👨‍🏫 **Teacher Assignment Workflow**

**Step 1/3: Teacher Selection**
Please provide teacher's name or staff ID:

Example: John Smith
Or: STAFF/001`,
          intent: 'workflow_step_1',
          confidence: 1.0,
          suggestions: ['Cancel assignment']
        };
      
      default:
        return null;
    }
  }

  // Fee Payment Workflow
  async processPaymentStep(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    const step = workflow.step;

    switch (step) {
      case 1: return this.parsePaymentStudent(userId, input, context);
      case 2: return this.parsePaymentAmount(userId, input);
      case 3: return await this.confirmPayment(userId, input, context);
      default: return null;
    }
  }

  async parsePaymentStudent(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    const [students] = await sequelize.query(`
      SELECT s.id, s.admission_no, s.first_name, s.last_name, s.class_name,
             COALESCE(SUM(pe.cr - pe.dr), 0) as outstanding
      FROM students s
      LEFT JOIN payment_entries pe ON s.admission_no = pe.admission_no
      WHERE (s.admission_no = ? OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?)
        AND s.school_id = ? AND s.branch_id = ?
      GROUP BY s.id
      LIMIT 1
    `, {
      replacements: [input, `%${input}%`, context.schoolId, context.branchId]
    });

    if (!students || students.length === 0) {
      return {
        text: '⚠️ **Student Not Found**\n\nPlease provide a valid admission number or name.',
        intent: 'workflow_validation_error',
        confidence: 0.9,
        suggestions: ['Cancel payment']
      };
    }

    const student = students[0];
    workflow.data.student = student;
    workflow.step = 2;
    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 1/3 Complete**

**Student:** ${student.first_name} ${student.last_name}
**Admission No:** ${student.admission_no}
**Class:** ${student.class_name}
**Outstanding:** ₦${Number(student.outstanding).toLocaleString()}

**Step 2/3: Payment Amount**
Enter amount to pay:

Example: 50000`,
      intent: 'workflow_step_2',
      confidence: 1.0,
      suggestions: ['Pay full amount', 'Cancel payment']
    };
  }

  async parsePaymentAmount(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    const amount = parseFloat(input.replace(/[₦,]/g, ''));

    if (isNaN(amount) || amount <= 0) {
      return {
        text: '⚠️ **Invalid Amount**\n\nPlease enter a valid amount.\n\nExample: 50000',
        intent: 'workflow_validation_error',
        confidence: 0.9
      };
    }

    workflow.data.amount = amount;
    workflow.step = 3;
    this.activeWorkflows.set(userId, workflow);

    const student = workflow.data.student;
    const newBalance = student.outstanding - amount;

    return {
      text: `✅ **Step 2/3 Complete**

**Amount:** ₦${amount.toLocaleString()}

**Step 3/3: Confirmation**

**Student:** ${student.first_name} ${student.last_name}
**Amount Paying:** ₦${amount.toLocaleString()}
**Outstanding:** ₦${Number(student.outstanding).toLocaleString()}
**New Balance:** ₦${Number(newBalance).toLocaleString()}

Type "confirm" to process payment.`,
      intent: 'workflow_step_3',
      confidence: 1.0,
      actionButtons: [
        { type: 'action', label: '✅ Confirm', action: 'confirm_payment' },
        { type: 'action', label: '❌ Cancel', action: 'cancel_payment' }
      ]
    };
  }

  async confirmPayment(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    if (!input.toLowerCase().includes('confirm')) {
      return {
        text: '⚠️ Type "confirm" to process payment or "cancel" to abort.',
        intent: 'workflow_awaiting_confirmation',
        confidence: 0.9
      };
    }

    const { student, amount } = workflow.data;

    try {
      await sequelize.query(`
        UPDATE payment_entries 
        SET dr = dr + ?, payment_status = 'Paid', updated_at = NOW()
        WHERE admission_no = ? AND school_id = ? AND branch_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, {
        replacements: [amount, student.admission_no, context.schoolId, context.branchId]
      });

      this.activeWorkflows.delete(userId);

      return {
        text: `🎉 **Payment Successful!**

**Receipt Details:**
• Student: ${student.first_name} ${student.last_name}
• Amount Paid: ₦${amount.toLocaleString()}
• Date: ${new Date().toLocaleDateString()}
• New Balance: ₦${Number(student.outstanding - amount).toLocaleString()}

✅ Payment recorded
📧 Receipt sent to parent`,
        intent: 'payment_complete',
        confidence: 1.0,
        actionButtons: [
          { type: 'download', label: '📥 Download Receipt', action: 'download_receipt' },
          { type: 'action', label: '📧 Email Receipt', action: 'email_receipt' }
        ],
        suggestions: ['Record another payment', 'View payment history']
      };
    } catch (error) {
      console.error('Payment error:', error);
      this.activeWorkflows.delete(userId);
      return {
        text: `❌ **Payment Failed**\n\nError: ${error.message}`,
        intent: 'payment_error',
        confidence: 0.5
      };
    }
  }

  // Exam Entry Workflow
  async processExamStep(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    const step = workflow.step;

    switch (step) {
      case 1: return this.parseExamDetails(userId, input);
      case 2: return await this.parseExamScores(userId, input, context);
      case 3: return this.parseMoreScores(userId, input);
      case 4: return await this.confirmExamEntry(userId, input, context);
      default: return null;
    }
  }

  parseExamDetails(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    const parts = input.split(',').map(p => p.trim());
    
    if (parts.length < 4) {
      return {
        text: '⚠️ **Invalid Format**\n\nFormat: Class, Subject, Term, Year\nExample: JSS1, Mathematics, Term 1, 2026',
        intent: 'workflow_validation_error',
        confidence: 0.9
      };
    }

    workflow.data.className = parts[0];
    workflow.data.subject = parts[1];
    workflow.data.term = parts[2];
    workflow.data.year = parts[3];
    workflow.data.scores = [];
    workflow.step = 2;
    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 1/4 Complete**

**Class:** ${parts[0]}
**Subject:** ${parts[1]}
**Term:** ${parts[2]}
**Year:** ${parts[3]}

**Step 2/4: Enter Scores**
Format: Admission No, Score

Example: STU/2026/0001, 85

Enter one at a time or type "done" when finished.`,
      intent: 'workflow_step_2',
      confidence: 1.0,
      suggestions: ['Done', 'Cancel']
    };
  }

  async parseExamScores(userId, input, context) {
    if (input.toLowerCase() === 'done') {
      const workflow = this.activeWorkflows.get(userId);
      if (workflow.data.scores.length === 0) {
        return {
          text: '⚠️ **No Scores Entered**\n\nPlease enter at least one score.',
          intent: 'workflow_validation_error',
          confidence: 0.9
        };
      }
      workflow.step = 4;
      this.activeWorkflows.set(userId, workflow);
      return this.confirmExamEntry(userId, 'review', context);
    }

    const parts = input.split(',').map(p => p.trim());
    if (parts.length < 2) {
      return {
        text: '⚠️ **Invalid Format**\n\nFormat: Admission No, Score\nExample: STU/2026/0001, 85',
        intent: 'workflow_validation_error',
        confidence: 0.9
      };
    }

    const [admissionNo, score] = parts;
    const workflow = this.activeWorkflows.get(userId);
    workflow.data.scores.push({ admissionNo, score: parseFloat(score) });
    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Score Added** (${workflow.data.scores.length} total)

**${admissionNo}:** ${score}

Enter next score or type "done" to finish.`,
      intent: 'workflow_step_2_continue',
      confidence: 1.0,
      suggestions: ['Done', 'Cancel']
    };
  }

  async confirmExamEntry(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    if (input === 'review') {
      const { className, subject, term, year, scores } = workflow.data;
      let scoreList = '\n';
      scores.forEach((s, idx) => {
        scoreList += `${idx + 1}. ${s.admissionNo}: ${s.score}\n`;
      });

      return {
        text: `✅ **Step 3/4: Review**

**Class:** ${className}
**Subject:** ${subject}
**Term:** ${term}
**Year:** ${year}
**Total Scores:** ${scores.length}
${scoreList}
Type "confirm" to save results.`,
        intent: 'workflow_step_4',
        confidence: 1.0,
        actionButtons: [
          { type: 'action', label: '✅ Confirm', action: 'confirm_exam' },
          { type: 'action', label: '❌ Cancel', action: 'cancel_exam' }
        ]
      };
    }

    if (!input.toLowerCase().includes('confirm')) {
      return {
        text: '⚠️ Type "confirm" to save or "cancel" to abort.',
        intent: 'workflow_awaiting_confirmation',
        confidence: 0.9
      };
    }

    try {
      const { className, subject, term, year, scores } = workflow.data;
      
      for (const score of scores) {
        await sequelize.query(`
          INSERT INTO exam_results 
          (admission_no, class_name, subject, term, academic_year, total_score, school_id, branch_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE total_score = ?, updated_at = NOW()
        `, {
          replacements: [
            score.admissionNo, className, subject, term, year, score.score,
            context.schoolId, context.branchId, score.score
          ]
        });
      }

      this.activeWorkflows.delete(userId);

      return {
        text: `🎉 **Results Saved!**

**Class:** ${className}
**Subject:** ${subject}
**Total Students:** ${scores.length}

✅ Results recorded
📊 Analytics updated`,
        intent: 'exam_entry_complete',
        confidence: 1.0,
        suggestions: ['Enter more results', 'View class performance']
      };
    } catch (error) {
      console.error('Exam entry error:', error);
      this.activeWorkflows.delete(userId);
      return {
        text: `❌ **Entry Failed**\n\nError: ${error.message}`,
        intent: 'exam_error',
        confidence: 0.5
      };
    }
  }

  // Teacher Assignment Workflow
  async processTeacherAssignmentStep(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    const step = workflow.step;

    switch (step) {
      case 1: return await this.parseTeacher(userId, input, context);
      case 2: return this.parseClassSubject(userId, input);
      case 3: return await this.confirmAssignment(userId, input, context);
      default: return null;
    }
  }

  async parseTeacher(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    const [teachers] = await sequelize.query(`
      SELECT id, staff_id, first_name, last_name
      FROM staff
      WHERE (staff_id = ? OR CONCAT(first_name, ' ', last_name) LIKE ?)
        AND school_id = ? AND branch_id = ?
        AND role = 'teacher'
      LIMIT 1
    `, {
      replacements: [input, `%${input}%`, context.schoolId, context.branchId]
    });

    if (!teachers || teachers.length === 0) {
      return {
        text: '⚠️ **Teacher Not Found**\n\nPlease provide a valid name or staff ID.',
        intent: 'workflow_validation_error',
        confidence: 0.9
      };
    }

    const teacher = teachers[0];
    workflow.data.teacher = teacher;
    workflow.step = 2;
    this.activeWorkflows.set(userId, workflow);

    return {
      text: `✅ **Step 1/3 Complete**

**Teacher:** ${teacher.first_name} ${teacher.last_name}
**Staff ID:** ${teacher.staff_id}

**Step 2/3: Class & Subject**
Format: Class, Subject

Example: JSS1, Mathematics`,
      intent: 'workflow_step_2',
      confidence: 1.0,
      suggestions: ['Cancel assignment']
    };
  }

  parseClassSubject(userId, input) {
    const workflow = this.activeWorkflows.get(userId);
    const parts = input.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return {
        text: '⚠️ **Invalid Format**\n\nFormat: Class, Subject\nExample: JSS1, Mathematics',
        intent: 'workflow_validation_error',
        confidence: 0.9
      };
    }

    workflow.data.className = parts[0];
    workflow.data.subject = parts[1];
    workflow.step = 3;
    this.activeWorkflows.set(userId, workflow);

    const teacher = workflow.data.teacher;

    return {
      text: `✅ **Step 2/3 Complete**

**Step 3/3: Confirmation**

**Teacher:** ${teacher.first_name} ${teacher.last_name}
**Class:** ${parts[0]}
**Subject:** ${parts[1]}

Type "confirm" to assign.`,
      intent: 'workflow_step_3',
      confidence: 1.0,
      actionButtons: [
        { type: 'action', label: '✅ Confirm', action: 'confirm_assignment' },
        { type: 'action', label: '❌ Cancel', action: 'cancel_assignment' }
      ]
    };
  }

  async confirmAssignment(userId, input, context) {
    const workflow = this.activeWorkflows.get(userId);
    
    if (!input.toLowerCase().includes('confirm')) {
      return {
        text: '⚠️ Type "confirm" to assign or "cancel" to abort.',
        intent: 'workflow_awaiting_confirmation',
        confidence: 0.9
      };
    }

    const { teacher, className, subject } = workflow.data;

    try {
      await sequelize.query(`
        INSERT INTO teacher_classes 
        (teacher_id, class_name, subject, school_id, branch_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [teacher.id, className, subject, context.schoolId, context.branchId]
      });

      this.activeWorkflows.delete(userId);

      return {
        text: `🎉 **Assignment Complete!**

**Teacher:** ${teacher.first_name} ${teacher.last_name}
**Class:** ${className}
**Subject:** ${subject}

✅ Assignment recorded
📧 Teacher notified`,
        intent: 'assignment_complete',
        confidence: 1.0,
        suggestions: ['Assign another teacher', 'View assignments']
      };
    } catch (error) {
      console.error('Assignment error:', error);
      this.activeWorkflows.delete(userId);
      return {
        text: `❌ **Assignment Failed**\n\nError: ${error.message}`,
        intent: 'assignment_error',
        confidence: 0.5
      };
    }
  }

  isWorkflowCommand(message) {
    const commands = [
      'enroll student',
      'enroll new student',
      'add student',
      'register student',
      'new student',
      'record payment',
      'process payment',
      'make payment',
      'pay fees',
      'enter results',
      'enter exam results',
      'record results',
      'add results',
      'assign teacher',
      'assign class',
      'teacher assignment'
    ];

    return commands.some(cmd => message.toLowerCase().includes(cmd));
  }

  detectWorkflowType(message) {
    const normalized = message.toLowerCase();
    
    if (normalized.includes('enroll') || normalized.includes('register') || normalized.includes('new student')) {
      return 'student_enrollment';
    }
    if (normalized.includes('payment') || normalized.includes('pay') || normalized.includes('fees')) {
      return 'fee_payment';
    }
    if (normalized.includes('result') || normalized.includes('exam') || normalized.includes('score')) {
      return 'exam_entry';
    }
    if (normalized.includes('assign') || normalized.includes('teacher')) {
      return 'teacher_assignment';
    }
    
    return 'student_enrollment'; // default
  }
}

module.exports = new ChatbotWorkflowService();
