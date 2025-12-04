# CA/Exam Process System - Complete Implementation Guide

## 📋 Overview

This document provides a complete implementation guide for the CA/Exam Process system that extends the existing Examinations module in Elite Scholar.

## 🗄️ Database Schema

### Tables Created

1. **`ca_exam_submissions`** - Teacher question submissions
2. **`ca_exam_moderation_logs`** - Audit log for all moderation actions
3. **`ca_exam_notifications`** - Notification system
4. **`ca_exam_print_logs`** - Printing activity tracking

### Enhanced Tables

1. **`ca_setup`** - Added columns:
   - `scheduled_date` - Auto-calculated from week_number
   - `submission_deadline` - Deadline for teachers
   - `notification_sent` - Tracking notification status

2. **`school_setup`** - Added column:
   - `cbt_enabled` - Enable CBT for school

## 🚀 Implementation Steps

### Step 1: Run Database Migration

```bash
mysql -u root -p elite_db < backend/src/models/ca_exam_process_migration.sql
```

### Step 2: Backend Implementation

#### A. Controllers (Already Created)

**File**: `backend/src/controllers/caExamProcessController.js`

**Endpoints**:
- `GET /api/ca-exam-process/setups` - Get CA setups
- `POST /api/ca-exam-process/setups` - Create CA setup
- `PUT /api/ca-exam-process/setups/:id` - Update CA setup
- `DELETE /api/ca-exam-process/setups/:id` - Delete CA setup
- `GET /api/ca-exam-process/submissions` - Get submissions
- `POST /api/ca-exam-process/submissions` - Submit questions
- `GET /api/ca-exam-process/moderation` - Get submissions for moderation
- `PUT /api/ca-exam-process/moderation/:id/approve` - Approve submission
- `PUT /api/ca-exam-process/moderation/:id/reject` - Reject submission
- `PUT /api/ca-exam-process/moderation/:id/request-modification` - Request changes
- `POST /api/ca-exam-process/print/:id` - Generate printable PDF
- `GET /api/ca-exam-process/notifications` - Get notifications
- `POST /api/ca-exam-process/notifications/send` - Send notifications

#### B. Routes

**File**: `backend/src/routes/caExamProcessRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const controller = require('../controllers/caExamProcessController');
const { verifyToken } = require('../controllers/user');

// CA Setup Management (Admin/Exam Officer)
router.get('/setups', verifyToken, controller.getCASetups);
router.post('/setups', verifyToken, controller.createCASetup);
router.put('/setups/:id', verifyToken, controller.updateCASetup);
router.delete('/setups/:id', verifyToken, controller.deleteCASetup);

// Question Submission (Teachers)
router.get('/submissions', verifyToken, controller.getTeacherSubmissions);
router.post('/submissions', verifyToken, controller.submitQuestions);
router.get('/submissions/:id', verifyToken, controller.getSubmissionDetails);

// Moderation (Admin/Exam Officer)
router.get('/moderation', verifyToken, controller.getModerationQueue);
router.put('/moderation/:id/approve', verifyToken, controller.approveSubmission);
router.put('/moderation/:id/reject', verifyToken, controller.rejectSubmission);
router.put('/moderation/:id/request-modification', verifyToken, controller.requestModification);
router.post('/moderation/:id/replace-file', verifyToken, controller.replaceQuestionFile);

// Printing
router.post('/print/:id', verifyToken, controller.generatePrintablePDF);
router.get('/print-logs', verifyToken, controller.getPrintLogs);

// Notifications
router.get('/notifications', verifyToken, controller.getNotifications);
router.post('/notifications/send', verifyToken, controller.sendNotifications);
router.put('/notifications/:id/mark-read', verifyToken, controller.markNotificationRead);

// Dashboard/Statistics
router.get('/dashboard', verifyToken, controller.getDashboardStats);
router.get('/progress', verifyToken, controller.getProgressReport);

module.exports = router;
```

#### C. Register Routes

**File**: `backend/src/app.js` or `backend/src/routes/index.js`

```javascript
const caExamProcessRoutes = require('./routes/caExamProcessRoutes');
app.use('/api/ca-exam-process', caExamProcessRoutes);
```

### Step 3: Frontend Implementation

#### A. Page Structure

Create these pages under `frontend/src/feature-module/academic/examinations/`:

```
examinations/
├── ca-exam-process/
│   ├── CASetupManagement.tsx          # Admin: Configure CA/Exam
│   ├── QuestionSubmission.tsx         # Teacher: Submit questions
│   ├── ModerationDashboard.tsx        # Admin: Moderate submissions
│   ├── PrintQuestions.tsx             # Admin: Print question papers
│   ├── ProgressTracking.tsx           # All: Track progress
│   ├── NotificationCenter.tsx         # All: View notifications
│   └── components/
│       ├── CASetupForm.tsx
│       ├── SubmissionForm.tsx
│       ├── ModerationCard.tsx
│       ├── QuestionPaperTemplate.tsx
│       └── ProgressChart.tsx
```

#### B. Routes Configuration

**File**: `frontend/src/feature-module/router/router.tsx`

```typescript
// Add to existing examinations routes
{
  path: '/examinations/ca-setup',
  component: CASetupManagement,
  requiredRoles: ['admin', 'exam_officer'],
  title: 'CA/Exam Setup'
},
{
  path: '/examinations/submit-questions',
  component: QuestionSubmission,
  requiredRoles: ['teacher'],
  title: 'Submit Questions'
},
{
  path: '/examinations/moderation',
  component: ModerationDashboard,
  requiredRoles: ['admin', 'exam_officer', 'moderation_committee'],
  title: 'Moderation Dashboard'
},
{
  path: '/examinations/print-questions',
  component: PrintQuestions,
  requiredRoles: ['admin', 'exam_officer'],
  title: 'Print Questions'
},
{
  path: '/examinations/progress',
  component: ProgressTracking,
  requiredRoles: ['admin', 'exam_officer', 'teacher', 'principal'],
  title: 'Progress Tracking'
}
```

#### C. Sidebar Menu

**File**: `frontend/src/core/common/sidebar/sidebarData.tsx`

```typescript
// Add under Examinations menu
{
  label: "Examinations",
  submenu: true,
  submenuItems: [
    // ... existing items
    {
      label: "CA/Exam Setup",
      link: "/examinations/ca-setup",
      roles: ["admin", "exam_officer"]
    },
    {
      label: "Submit Questions",
      link: "/examinations/submit-questions",
      roles: ["teacher"]
    },
    {
      label: "Moderation",
      link: "/examinations/moderation",
      roles: ["admin", "exam_officer", "moderation_committee"]
    },
    {
      label: "Print Questions",
      link: "/examinations/print-questions",
      roles: ["admin", "exam_officer"]
    },
    {
      label: "Progress Tracking",
      link: "/examinations/progress",
      roles: ["admin", "exam_officer", "teacher", "principal"]
    }
  ]
}
```

## 📱 Frontend Components

### 1. CA Setup Management (Admin)

**File**: `CASetupManagement.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import axios from 'axios';

const CASetupManagement = () => {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSetups();
  }, []);

  const fetchSetups = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ca-exam-process/setups', {
        params: {
          school_id: user.school_id,
          branch_id: user.branch_id
        }
      });
      setSetups(response.data.data);
    } catch (error) {
      message.error('Failed to fetch CA setups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      await axios.post('/api/ca-exam-process/setups', {
        ...values,
        school_id: user.school_id,
        branch_id: user.branch_id
      });
      message.success('CA setup created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchSetups();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create CA setup');
    }
  };

  const columns = [
    {
      title: 'CA Type',
      dataIndex: 'ca_type',
      key: 'ca_type'
    },
    {
      title: 'Week Number',
      dataIndex: 'week_number',
      key: 'week_number'
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Not set'
    },
    {
      title: 'Submission Deadline',
      dataIndex: 'submission_deadline',
      key: 'submission_deadline',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Not set'
    },
    {
      title: 'Days Until Deadline',
      dataIndex: 'days_until_deadline',
      key: 'days_until_deadline',
      render: (days) => {
        if (days < 0) return <span style={{ color: 'red' }}>Overdue</span>;
        if (days <= 7) return <span style={{ color: 'orange' }}>{days} days</span>;
        return <span>{days} days</span>;
      }
    },
    {
      title: 'Submissions',
      key: 'submissions',
      render: (_, record) => `${record.approved_submissions}/${record.total_submissions}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className={`badge ${status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
          {status}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button size="small" onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </div>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="row align-items-center">
            <div className="col">
              <h3 className="page-title">CA/Exam Setup Management</h3>
            </div>
            <div className="col-auto">
              <Button type="primary" onClick={() => setModalVisible(true)}>
                Add New CA/Exam
              </Button>
            </div>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={setups}
          loading={loading}
          rowKey="id"
        />

        <Modal
          title="Create CA/Exam Setup"
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form form={form} onFinish={handleCreate} layout="vertical">
            <Form.Item
              name="ca_type"
              label="CA/Exam Type"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="CA1">CA1</Select.Option>
                <Select.Option value="CA2">CA2</Select.Option>
                <Select.Option value="CA3">CA3</Select.Option>
                <Select.Option value="CA4">CA4</Select.Option>
                <Select.Option value="EXAM">EXAM</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="week_number"
              label="Week Number"
              rules={[{ required: true }]}
            >
              <Input type="number" min={1} max={52} />
            </Form.Item>

            <Form.Item
              name="max_score"
              label="Maximum Score"
              rules={[{ required: true }]}
            >
              <Input type="number" min={1} />
            </Form.Item>

            <Form.Item
              name="overall_contribution_percent"
              label="Overall Contribution %"
            >
              <Input type="number" min={0} max={100} />
            </Form.Item>

            <Form.Item
              name="academic_year_start"
              label="Academic Year Start Date"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Create Setup
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default CASetupManagement;
```

### 2. Question Submission (Teacher)

**File**: `QuestionSubmission.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, Button, Upload, Form, Input, Select, message, Table } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';

const QuestionSubmission = () => {
  const [submissions, setSubmissions] = useState([]);
  const [caSetups, setCASetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSubmissions();
    fetchCASetups();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await axios.get('/api/ca-exam-process/submissions', {
        params: {
          teacher_id: user.id,
          school_id: user.school_id
        }
      });
      setSubmissions(response.data.data);
    } catch (error) {
      message.error('Failed to fetch submissions');
    }
  };

  const handleSubmit = async (values, isDraft = false) => {
    const formData = new FormData();
    Object.keys(values).forEach(key => {
      if (values[key]) formData.append(key, values[key]);
    });
    formData.append('submit_now', !isDraft);
    formData.append('teacher_id', user.id);
    formData.append('school_id', user.school_id);
    formData.append('branch_id', user.branch_id);

    try {
      await axios.post('/api/ca-exam-process/submissions', formData);
      message.success(isDraft ? 'Draft saved' : 'Questions submitted successfully');
      form.resetFields();
      fetchSubmissions();
    } catch (error) {
      message.error(error.response?.data?.message || 'Submission failed');
    }
  };

  const columns = [
    {
      title: 'CA Type',
      dataIndex: 'ca_type',
      key: 'ca_type'
    },
    {
      title: 'Subject',
      dataIndex: 'subject_name',
      key: 'subject_name'
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name'
    },
    {
      title: 'Deadline',
      dataIndex: 'submission_deadline',
      key: 'submission_deadline',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Days Remaining',
      dataIndex: 'days_remaining',
      key: 'days_remaining',
      render: (days, record) => {
        if (record.is_overdue) return <span style={{ color: 'red' }}>Overdue</span>;
        if (days <= 7) return <span style={{ color: 'orange' }}>{days} days</span>;
        return <span>{days} days</span>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'Draft': 'secondary',
          'Submitted': 'info',
          'Under Moderation': 'warning',
          'Approved': 'success',
          'Rejected': 'danger',
          'Modification Requested': 'warning'
        };
        return <span className={`badge badge-${colors[status]}`}>{status}</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div>
          {record.status === 'Draft' && (
            <Button size="small" onClick={() => handleEdit(record)}>Edit</Button>
          )}
          {record.question_file_url && (
            <Button size="small" icon={<FileTextOutlined />} onClick={() => window.open(record.question_file_url)}>
              View
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <h3 className="page-title">Submit CA/Exam Questions</h3>

        <Card title="New Submission" className="mb-4">
          <Form form={form} layout="vertical" onFinish={(values) => handleSubmit(values, false)}>
            <Form.Item name="ca_setup_id" label="CA/Exam" rules={[{ required: true }]}>
              <Select placeholder="Select CA/Exam">
                {caSetups.map(setup => (
                  <Select.Option key={setup.id} value={setup.id}>
                    {setup.ca_type} - Week {setup.week_number} (Deadline: {new Date(setup.submission_deadline).toLocaleDateString()})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
              <Select placeholder="Select Subject">
                {/* Populate from subjects */}
              </Select>
            </Form.Item>

            <Form.Item name="class_id" label="Class" rules={[{ required: true }]}>
              <Select placeholder="Select Class">
                {/* Populate from classes */}
              </Select>
            </Form.Item>

            <Form.Item name="question_file" label="Question File" rules={[{ required: true }]}>
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />}>Upload Question Paper (PDF/DOC)</Button>
              </Upload>
            </Form.Item>

            <Form.Item name="comments" label="Comments">
              <Input.TextArea rows={3} placeholder="Any additional notes..." />
            </Form.Item>

            <Form.Item>
              <Button type="default" onClick={() => handleSubmit(form.getFieldsValue(), true)} className="mr-2">
                Save as Draft
              </Button>
              <Button type="primary" htmlType="submit">
                Submit Questions
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="My Submissions">
          <Table
            columns={columns}
            dataSource={submissions}
            loading={loading}
            rowKey="id"
          />
        </Card>
      </div>
    </div>
  );
};

export default QuestionSubmission;
```

## 🔔 Notification System

### Cron Job Setup

**File**: `backend/src/cron/caExamNotifications.js`

```javascript
const cron = require('node-cron');
const db = require('../models');

// Run daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running CA/Exam notification job...');
  
  try {
    // Get all active schools
    const schools = await db.sequelize.query(
      `SELECT DISTINCT school_id, branch_id FROM ca_setup 
       WHERE is_active = 1 AND status = 'Active'`,
      { type: db.sequelize.QueryTypes.SELECT }
    );

    for (const school of schools) {
      await db.sequelize.query(
        'CALL sp_send_teacher_notifications(:school_id, :branch_id)',
        {
          replacements: {
            school_id: school.school_id,
            branch_id: school.branch_id
          }
        }
      );
    }

    console.log('Notification job completed successfully');
  } catch (error) {
    console.error('Notification job failed:', error);
  }
});
```

## 📄 PDF Generation

### Question Paper Template

**File**: `backend/src/utils/questionPaperPDF.js`

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

async function generateQuestionPaperPDF(submission, schoolInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const fileName = `question_paper_${submission.id}_${Date.now()}.pdf`;
    const filePath = `./uploads/question_papers/${fileName}`;

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(schoolInfo.school_name, { align: 'center' });
    doc.fontSize(12).text(schoolInfo.address, { align: 'center' });
    doc.moveDown();

    // Title
    doc.fontSize(16).text(`${submission.ca_type} EXAMINATION`, { align: 'center', underline: true });
    doc.moveDown();

    // Details
    doc.fontSize(12);
    doc.text(`Subject: ${submission.subject_name}`);
    doc.text(`Class: ${submission.class_name}`);
    doc.text(`Term: ${submission.term}`);
    doc.text(`Academic Year: ${submission.academic_year}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Instructions
    doc.fontSize(11).text('INSTRUCTIONS:', { underline: true });
    doc.fontSize(10);
    doc.text('1. Answer all questions');
    doc.text('2. Write clearly and legibly');
    doc.text('3. Time allowed: [TO BE FILLED]');
    doc.moveDown();

    // Questions section
    doc.fontSize(12).text('QUESTIONS:', { underline: true });
    doc.moveDown();
    
    // Placeholder for questions (actual questions from uploaded file)
    doc.fontSize(10).text('[Questions will be inserted here from the uploaded file]');

    // Footer
    doc.fontSize(8).text(`School Code: ${schoolInfo.short_name}`, 50, doc.page.height - 50);

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateQuestionPaperPDF };
```

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] CA setup CRUD operations work
- [ ] Teachers can submit questions
- [ ] File upload works correctly
- [ ] Deadline validation works
- [ ] Moderation workflow functions
- [ ] Notifications are sent
- [ ] PDF generation works
- [ ] Role-based permissions enforced
- [ ] Audit logs are created
- [ ] CBT placeholder shows when enabled

## 📚 API Documentation

See the complete API documentation in the controller file for all available endpoints and their parameters.

## 🔐 Security Considerations

1. **File Upload Validation**
   - Only PDF, DOC, DOCX allowed
   - Max file size: 10MB
   - Virus scanning recommended

2. **Role-Based Access**
   - Teachers: Submit only
   - Admin/Exam Officer: Full access
   - Moderation Committee: Review only

3. **Audit Trail**
   - All actions logged
   - IP address tracking
   - Timestamp recording

## 🎯 Next Steps

1. Complete remaining controller methods
2. Implement all frontend components
3. Add email/SMS integration for notifications
4. Implement CBT module (future)
5. Add analytics and reporting
6. Set up automated testing

---

**Version**: 1.0.0  
**Date**: December 2024  
**Status**: ✅ Foundation Complete - Ready for Extension
