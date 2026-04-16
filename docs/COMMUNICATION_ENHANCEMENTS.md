# Comprehensive Implementation Plan: Communication & Analytics Enhancements

## Overview
Enhance the payment communication system with bulk operations, multi-channel delivery, customization, automation, and analytics.

---

## 1. Bulk WhatsApp Send

### Status
✅ **Already Implemented** (see `useBulkOperations.ts`)

### Enhancements Needed

#### A. Progress Tracking UI
**File**: `elscholar-ui/src/feature-module/management/feescollection/components/BulkSendProgress.tsx`

```typescript
interface BulkSendProgressProps {
  current: number;
  total: number;
  sending: boolean;
  type: 'whatsapp' | 'email';
}

export const BulkSendProgress: React.FC<BulkSendProgressProps> = ({
  current, total, sending, type
}) => {
  if (!sending) return null;
  
  return (
    <Modal visible={sending} closable={false}>
      <Progress 
        percent={Math.round((current / total) * 100)} 
        status="active"
      />
      <p>Sending {type} {current} of {total}...</p>
    </Modal>
  );
};
```

#### B. Batch Processing
**File**: `elscholar-api/src/routes/whatsapp_service.js`

Add new endpoint:
```javascript
router.post('/whatsapp/send-bulk', async (req, res) => {
  const { school_id, messages } = req.body; // messages = [{phone, message, pdfBase64, filename}]
  
  const jobs = await Promise.all(
    messages.map(msg => addMessageWithPDFJob({ school_id, ...msg }))
  );
  
  res.json({
    success: true,
    queued: jobs.length,
    job_ids: jobs.map(j => j.id)
  });
});
```

**Effort**: 2 hours  
**Priority**: Low (already functional)

---

## 2. Email Receipts

### A. Backend - Email Service Enhancement

**File**: `elscholar-api/src/services/emailService.js`

Add method:
```javascript
async sendReceiptEmail(to, subject, studentName, pdfBuffer, filename) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `
      <h2>Payment Receipt</h2>
      <p>Dear Parent,</p>
      <p>Please find attached the payment receipt for ${studentName}.</p>
      <p>Thank you.</p>
    `,
    attachments: [{
      filename,
      content: pdfBuffer
    }]
  };
  
  return await this.transporter.sendMail(mailOptions);
}
```

### B. Backend - Email Queue

**File**: `elscholar-api/src/queues/emailQueue.js`

```javascript
const { Queue } = require('bullmq');
const { connection } = require('./whatsappQueue');

const emailQueue = new Queue('email', { connection });

const addEmailWithPDFJob = async (data) => {
  return await emailQueue.add('email-with-pdf', {
    type: 'email-with-pdf',
    ...data
  });
};

module.exports = { emailQueue, addEmailWithPDFJob };
```

**File**: `elscholar-api/src/queues/emailWorker.js`

```javascript
const { Worker } = require('bullmq');
const { connection } = require('./whatsappQueue');
const emailService = require('../services/emailService');

const worker = new Worker('email', async (job) => {
  const { email, subject, studentName, pdfBase64, filename } = job.data;
  
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  await emailService.sendReceiptEmail(email, subject, studentName, pdfBuffer, filename);
  
  return { success: true, email };
}, { connection });

worker.on('completed', (job) => {
  console.log(`✅ Email sent: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Email failed: ${job.id}`, err.message);
});
```

### C. API Route

**File**: `elscholar-api/src/routes/email_service.js`

```javascript
router.post('/email/send-with-pdf', async (req, res) => {
  const { school_id, email, subject, studentName, pdfBase64, filename } = req.body;
  
  const job = await addEmailWithPDFJob({
    school_id,
    email,
    subject,
    studentName,
    pdfBase64,
    filename
  });
  
  res.json({
    success: true,
    message: 'Email queued for sending',
    job_id: job.id
  });
});
```

### D. Frontend Integration

**File**: `elscholar-ui/src/feature-module/management/feescollection/ClassPayments.tsx`

Add email button alongside WhatsApp:
```typescript
const handleEmailReceipt = async (student) => {
  if (!student.parent_email) {
    message.warning('No parent email found');
    return;
  }
  
  const pdfBlob = await generateReceiptPDF(student, 'A4');
  const reader = new FileReader();
  const pdfBase64 = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(pdfBlob);
  });
  
  const response = await _post('api/email/send-with-pdf', {
    school_id: user.school_id,
    email: student.parent_email,
    subject: `Payment Receipt - ${student.student_name}`,
    studentName: student.student_name,
    pdfBase64,
    filename: `receipt_${student.admission_no}.pdf`
  });
  
  if (response.success) {
    message.success('Email queued for delivery');
  }
};
```

**Effort**: 6 hours  
**Priority**: High

---

## 3. Receipt Templates

### A. Database Schema

```sql
CREATE TABLE receipt_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  config JSON NOT NULL COMMENT 'Logo, colors, fonts, layout',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_school_template (school_id, template_name)
);
```

### B. Backend - Template Service

**File**: `elscholar-api/src/services/receiptTemplateService.js`

```javascript
class ReceiptTemplateService {
  async getTemplate(school_id) {
    const [template] = await db.sequelize.query(
      'SELECT * FROM receipt_templates WHERE school_id = ? AND is_default = 1',
      { replacements: [school_id], type: db.sequelize.QueryTypes.SELECT }
    );
    
    return template || this.getDefaultTemplate();
  }
  
  getDefaultTemplate() {
    return {
      logo: null,
      primaryColor: '#1890ff',
      secondaryColor: '#f0f0f0',
      fontFamily: 'Arial',
      showSchoolAddress: true,
      showTermInfo: true,
      footerText: 'Thank you for your payment'
    };
  }
  
  async saveTemplate(school_id, template_name, config) {
    await db.sequelize.query(
      `INSERT INTO receipt_templates (school_id, template_name, config, is_default)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE config = ?, is_default = 1`,
      { replacements: [school_id, template_name, JSON.stringify(config), JSON.stringify(config)] }
    );
  }
}

module.exports = new ReceiptTemplateService();
```

### C. Frontend - Template Editor

**File**: `elscholar-ui/src/feature-module/settings/ReceiptTemplateEditor.tsx`

```typescript
export const ReceiptTemplateEditor = () => {
  const [template, setTemplate] = useState({
    primaryColor: '#1890ff',
    secondaryColor: '#f0f0f0',
    fontFamily: 'Arial',
    showSchoolAddress: true,
    showTermInfo: true,
    footerText: 'Thank you'
  });
  
  const handleSave = async () => {
    await _post('api/receipt-templates/save', {
      school_id: user.school_id,
      template_name: 'default',
      config: template
    });
    message.success('Template saved');
  };
  
  return (
    <Card title="Receipt Template">
      <Form layout="vertical">
        <Form.Item label="Primary Color">
          <Input 
            type="color" 
            value={template.primaryColor}
            onChange={e => setTemplate({...template, primaryColor: e.target.value})}
          />
        </Form.Item>
        
        <Form.Item label="Footer Text">
          <Input.TextArea 
            value={template.footerText}
            onChange={e => setTemplate({...template, footerText: e.target.value})}
          />
        </Form.Item>
        
        <Button type="primary" onClick={handleSave}>Save Template</Button>
      </Form>
      
      <Divider />
      
      <div style={{ border: '1px solid #d9d9d9', padding: 20 }}>
        <h3>Preview</h3>
        <ReceiptPreview template={template} />
      </div>
    </Card>
  );
};
```

### D. Update PDF Generation

**File**: `elscholar-ui/src/feature-module/management/feescollection/ClassPayments.tsx`

```typescript
const generateReceiptPDF = async (student, format) => {
  // Fetch template
  const templateResponse = await _get(`api/receipt-templates?school_id=${user.school_id}`);
  const template = templateResponse.data || {};
  
  // Generate PDF with template
  const blob = await pdf(
    <ReceiptDocument 
      student={student} 
      transaction={transaction}
      template={template}
    />
  ).toBlob();
  
  return blob;
};
```

**Effort**: 12 hours  
**Priority**: Medium

---

## 4. Payment Reminders

### A. Database Schema

```sql
CREATE TABLE payment_reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id VARCHAR(20) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  parent_phone VARCHAR(20),
  parent_email VARCHAR(100),
  balance_due DECIMAL(10,2) NOT NULL,
  due_date DATE,
  reminder_type ENUM('whatsapp', 'email', 'both') DEFAULT 'both',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
);
```

### B. Backend - Reminder Service

**File**: `elscholar-api/src/services/reminderService.js`

```javascript
class ReminderService {
  async scheduleReminders(school_id, term, academic_year) {
    // Get students with outstanding balances
    const students = await db.sequelize.query(
      `SELECT s.student_id, s.student_name, s.parent_phone, s.parent_email,
              (b.total_bill - COALESCE(p.total_paid, 0)) as balance_due
       FROM students s
       JOIN bills b ON s.student_id = b.student_id
       LEFT JOIN (
         SELECT student_id, SUM(amount_paid) as total_paid
         FROM payment_entries
         WHERE term = ? AND academic_year = ?
         GROUP BY student_id
       ) p ON s.student_id = p.student_id
       WHERE s.school_id = ?
         AND b.term = ? AND b.academic_year = ?
         AND (b.total_bill - COALESCE(p.total_paid, 0)) > 0`,
      { 
        replacements: [term, academic_year, school_id, term, academic_year],
        type: db.sequelize.QueryTypes.SELECT 
      }
    );
    
    // Insert reminders
    for (const student of students) {
      await db.sequelize.query(
        `INSERT INTO payment_reminders 
         (school_id, student_id, parent_phone, parent_email, balance_due, due_date, reminder_type)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 'both')`,
        { replacements: [school_id, student.student_id, student.parent_phone, student.parent_email, student.balance_due] }
      );
    }
    
    return students.length;
  }
  
  async sendReminders() {
    const reminders = await db.sequelize.query(
      `SELECT * FROM payment_reminders 
       WHERE status = 'pending' 
         AND due_date <= CURDATE()
       LIMIT 100`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    
    for (const reminder of reminders) {
      const message = `Dear Parent, your child has an outstanding balance of ₦${reminder.balance_due}. Please make payment at your earliest convenience.`;
      
      if (reminder.reminder_type === 'whatsapp' || reminder.reminder_type === 'both') {
        if (reminder.parent_phone) {
          await addSingleMessageJob({
            school_id: reminder.school_id,
            phone: reminder.parent_phone,
            message
          });
        }
      }
      
      if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
        if (reminder.parent_email) {
          await addEmailJob({
            school_id: reminder.school_id,
            email: reminder.parent_email,
            subject: 'Payment Reminder',
            message
          });
        }
      }
      
      await db.sequelize.query(
        'UPDATE payment_reminders SET status = ?, sent_at = NOW() WHERE id = ?',
        { replacements: ['sent', reminder.id] }
      );
    }
    
    return reminders.length;
  }
}

module.exports = new ReminderService();
```

### C. Cron Job

**File**: `elscholar-api/src/cron/reminderCron.js`

```javascript
const cron = require('node-cron');
const reminderService = require('../services/reminderService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Running payment reminder job...');
  const sent = await reminderService.sendReminders();
  console.log(`✅ Sent ${sent} reminders`);
});
```

### D. Frontend - Reminder Configuration

**File**: `elscholar-ui/src/feature-module/management/feescollection/ReminderConfig.tsx`

```typescript
export const ReminderConfig = () => {
  const [config, setConfig] = useState({
    enabled: false,
    frequency: 'weekly',
    channels: ['whatsapp', 'email'],
    message: 'Dear Parent, your child has an outstanding balance...'
  });
  
  const handleSchedule = async () => {
    const response = await _post('api/reminders/schedule', {
      school_id: user.school_id,
      term: form.term,
      academic_year: form.academic_year
    });
    
    message.success(`Scheduled ${response.count} reminders`);
  };
  
  return (
    <Card title="Payment Reminders">
      <Form layout="vertical">
        <Form.Item label="Enable Reminders">
          <Switch 
            checked={config.enabled}
            onChange={enabled => setConfig({...config, enabled})}
          />
        </Form.Item>
        
        <Form.Item label="Frequency">
          <Select 
            value={config.frequency}
            onChange={frequency => setConfig({...config, frequency})}
          >
            <Select.Option value="daily">Daily</Select.Option>
            <Select.Option value="weekly">Weekly</Select.Option>
            <Select.Option value="monthly">Monthly</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="Channels">
          <Checkbox.Group 
            value={config.channels}
            onChange={channels => setConfig({...config, channels})}
          >
            <Checkbox value="whatsapp">WhatsApp</Checkbox>
            <Checkbox value="email">Email</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        
        <Button type="primary" onClick={handleSchedule}>
          Schedule Reminders
        </Button>
      </Form>
    </Card>
  );
};
```

**Effort**: 10 hours  
**Priority**: High

---

## 5. Analytics Dashboard

### A. Database Views

```sql
CREATE VIEW communication_analytics AS
SELECT 
  school_id,
  DATE(created_at) as date,
  service_type,
  COUNT(*) as messages_sent,
  SUM(cost) as total_cost,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM messaging_usage
GROUP BY school_id, DATE(created_at), service_type;
```

### B. Backend - Analytics API

**File**: `elscholar-api/src/routes/analytics.js`

```javascript
router.get('/analytics/communications', async (req, res) => {
  const { school_id, start_date, end_date } = req.query;
  
  const stats = await db.sequelize.query(
    `SELECT 
       service_type,
       COUNT(*) as total_sent,
       SUM(cost) as total_cost,
       DATE(created_at) as date
     FROM messaging_usage
     WHERE school_id = ?
       AND created_at BETWEEN ? AND ?
     GROUP BY service_type, DATE(created_at)
     ORDER BY date DESC`,
    { 
      replacements: [school_id, start_date, end_date],
      type: db.sequelize.QueryTypes.SELECT 
    }
  );
  
  const summary = await db.sequelize.query(
    `SELECT 
       service_type,
       COUNT(*) as total,
       SUM(cost) as cost
     FROM messaging_usage
     WHERE school_id = ?
       AND created_at BETWEEN ? AND ?
     GROUP BY service_type`,
    { 
      replacements: [school_id, start_date, end_date],
      type: db.sequelize.QueryTypes.SELECT 
    }
  );
  
  res.json({ stats, summary });
});
```

### C. Frontend - Analytics Tab

**File**: `elscholar-ui/src/feature-module/communications/CommunicationAnalytics.tsx`

```typescript
export const CommunicationAnalytics = () => {
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [stats, setStats] = useState({ stats: [], summary: [] });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchStats();
  }, [dateRange]);
  
  const fetchStats = async () => {
    setLoading(true);
    const response = await _get('api/analytics/communications', {
      school_id: user.school_id,
      start_date: dateRange[0].format('YYYY-MM-DD'),
      end_date: dateRange[1].format('YYYY-MM-DD')
    });
    setStats(response);
    setLoading(false);
  };
  
  const chartData = stats.stats.reduce((acc, item) => {
    const existing = acc.find(x => x.date === item.date);
    if (existing) {
      existing[item.service_type] = item.total_sent;
    } else {
      acc.push({
        date: item.date,
        [item.service_type]: item.total_sent
      });
    }
    return acc;
  }, []);
  
  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="WhatsApp Messages" 
              value={stats.summary.find(s => s.service_type === 'whatsapp')?.total || 0}
              prefix={<WhatsAppOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Emails Sent" 
              value={stats.summary.find(s => s.service_type === 'email')?.total || 0}
              prefix={<MailOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Total Cost" 
              value={stats.summary.reduce((sum, s) => sum + parseFloat(s.cost), 0)}
              prefix="₦"
              precision={2}
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="Message Trends">
        <RangePicker 
          value={dateRange}
          onChange={setDateRange}
          style={{ marginBottom: 16 }}
        />
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="whatsapp" stroke="#25D366" name="WhatsApp" />
            <Line type="monotone" dataKey="email" stroke="#1890ff" name="Email" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      
      <Card title="Delivery Status" style={{ marginTop: 16 }}>
        <Table 
          dataSource={stats.stats}
          columns={[
            { title: 'Date', dataKey: 'date' },
            { title: 'Service', dataKey: 'service_type' },
            { title: 'Sent', dataKey: 'total_sent' },
            { title: 'Cost', dataKey: 'total_cost', render: v => `₦${v}` }
          ]}
          loading={loading}
        />
      </Card>
    </div>
  );
};
```

### D. Integrate into Communications Dashboard

**File**: `elscholar-ui/src/feature-module/communications/dashboard.tsx`

```typescript
export const CommunicationsDashboard = () => {
  return (
    <Tabs defaultActiveKey="overview">
      <TabPane tab="Overview" key="overview">
        <CommunicationsOverview />
      </TabPane>
      
      <TabPane tab="Analytics" key="analytics">
        <CommunicationAnalytics />
      </TabPane>
      
      <TabPane tab="WhatsApp" key="whatsapp">
        <WhatsAppConnection />
      </TabPane>
      
      <TabPane tab="Email Settings" key="email">
        <EmailSettings />
      </TabPane>
    </Tabs>
  );
};
```

**Effort**: 8 hours  
**Priority**: High

---

## Implementation Timeline

### Phase 1: Core Communication (Week 1)
- **Day 1-2**: Email receipts (backend + worker)
- **Day 3**: Email receipts (frontend integration)
- **Day 4-5**: Payment reminders (backend + cron)

### Phase 2: Analytics & Monitoring (Week 2)
- **Day 1-2**: Analytics dashboard (backend API)
- **Day 3-4**: Analytics dashboard (frontend)
- **Day 5**: Testing and bug fixes

### Phase 3: Customization (Week 3)
- **Day 1-3**: Receipt templates (backend + database)
- **Day 4-5**: Receipt template editor (frontend)

### Phase 4: Polish & Deploy (Week 4)
- **Day 1-2**: Bulk send enhancements
- **Day 3**: Integration testing
- **Day 4**: Documentation
- **Day 5**: Production deployment

---

## Effort Summary

| Feature | Backend | Frontend | Testing | Total |
|---------|---------|----------|---------|-------|
| Bulk WhatsApp | 1h | 1h | - | 2h |
| Email Receipts | 3h | 2h | 1h | 6h |
| Receipt Templates | 4h | 6h | 2h | 12h |
| Payment Reminders | 5h | 3h | 2h | 10h |
| Analytics Dashboard | 3h | 4h | 1h | 8h |
| **Total** | **16h** | **16h** | **6h** | **38h** |

**Estimated Duration**: 3-4 weeks (1 developer)

---

## Priority Order

1. **High Priority** (Week 1-2)
   - Email Receipts
   - Payment Reminders
   - Analytics Dashboard

2. **Medium Priority** (Week 3)
   - Receipt Templates

3. **Low Priority** (Week 4)
   - Bulk Send Enhancements

---

## Dependencies

### Required
- Redis (already installed)
- SMTP server configured
- Node-cron package

### Optional
- Recharts (for analytics charts)
- React-PDF enhancements

---

## Success Metrics

- ✅ Email delivery rate > 95%
- ✅ Reminder automation reduces manual work by 80%
- ✅ Analytics dashboard provides real-time insights
- ✅ Template customization used by 50%+ of schools
- ✅ Bulk operations handle 100+ recipients efficiently

---

**Ready to start implementation?** Begin with Phase 1 (Email Receipts + Reminders).
