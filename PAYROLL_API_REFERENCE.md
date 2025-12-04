# Payroll API Reference

## Base URL
```
http://localhost:34567
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzEyLCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8xIiwiYnJhbmNoX2lkIjpudWxsLCJpYXQiOjE3NTk2OTUzMjYsImV4cCI6MTc1OTY5NjIyNn0.8v7jgIxr28t46tcM2m918coJO5qm72SJ2vpu7uY_Dsw
```

## Common Headers
```
Accept: application/json
Content-Type: application/json
Origin: http://localhost:3000
Referer: http://localhost:3000/
```

---

## 📊 Staff Management APIs

### 1. Get Enrolled Staff
**Endpoint:** `GET /payroll/staff/enrolled`
**Description:** Get all staff enrolled in payroll system
**Authorization:** Admin, Branch Admin

**Response Example:**
```json
{
  \"success\": true,
  \"data\": {
    \"staff\": [
      {
        \"staff_id\": 2,
        \"name\": \"HALIFA NAGUDU\",
        \"email\": \"halifa1@gmail.com\",
        \"mobile_no\": \"0809874388\",
        \"payroll_status\": \"Enrolled\",
        \"date_enrolled\": null,
        \"grade_id\": 5,
        \"step\": 1,
        \"grade_name\": \"Senior Teacher\",
        \"grade_code\": \"ST\",
        \"basic_salary\": \"70000.00\",
        \"increment_rate\": \"0.00\",
        \"calculated_basic_salary\": \"70000.00\",
        \"total_allowances\": \"8000.00\",
        \"total_deductions\": \"0.00\",
        \"total_loans\": \"0.00\",
        \"net_pay\": \"78000.00\"
      }
    ]
  }
}
```

### 2. Get All Staff
**Endpoint:** `GET /payroll/staff/all`
**Description:** Get all staff (enrolled and non-enrolled)
**Authorization:** Admin, Branch Admin

### 3. Get Staff Payroll History
**Endpoint:** `GET /payroll/staff/:staffId/history`
**Description:** Get payroll history for specific staff member

### 4. Enroll Staff in Payroll
**Endpoint:** `PUT /payroll/staff/:staffId/enroll`
**Description:** Enroll a staff member in payroll
**Authorization:** Admin, Branch Admin

### 5. Suspend Staff
**Endpoint:** `PUT /payroll/staff/:staffId/suspend`
**Description:** Suspend staff from payroll
**Authorization:** Admin, Branch Admin

### 6. Promote Staff
**Endpoint:** `PUT /payroll/staff/:staffId/promote`
**Description:** Promote staff to new grade/step
**Authorization:** Admin, Branch Admin

---

## 📅 Payroll Periods APIs

### 1. Get Payroll Periods
**Endpoint:** `GET /payroll/periods`
**Description:** Get all payroll periods with pagination

**Response Example:**
```json
{
  \"success\": true,
  \"data\": [
    {
      \"period_id\": 1,
      \"period_month\": \"2025-09\",
      \"period_year\": 2025,
      \"period_month_num\": 9,
      \"status\": \"locked\",
      \"total_staff\": 4,
      \"total_basic_salary\": \"140000.00\",
      \"total_allowances\": \"0.00\",
      \"total_deductions\": \"0.00\",
      \"total_net_pay\": \"140000.00\",
      \"initiated_by\": 1,
      \"initiated_at\": \"2025-09-23 18:46:17\",
      \"school_id\": \"SCH/1\",
      \"branch_id\": \"BRCH00001\",
      \"notes\": \"Approved for disbursement\"
    }
  ],
  \"pagination\": {
    \"total\": 14,
    \"page\": 1,
    \"limit\": 10,
    \"pages\": 2
  }
}
```

### 2. Get Period Details
**Endpoint:** `GET /payroll/periods/:periodId`
**Description:** Get detailed information for specific payroll period

### 3. Initiate Payroll Period
**Endpoint:** `POST /payroll/periods/initiate`
**Description:** Create and initiate new payroll period
**Authorization:** Admin, Branch Admin, Accountant

### 4. Approve Payroll Period
**Endpoint:** `POST /payroll/periods/:periodId/approve`
**Description:** Approve payroll period for disbursement
**Authorization:** Admin, Branch Admin

---

## 💰 Allowances & Deductions APIs

### 1. Get Allowance Types
**Endpoint:** `GET /payroll/allowances`
**Description:** Get all allowance types

### 2. Create Allowance Type
**Endpoint:** `POST /payroll/allowances`
**Description:** Create new allowance type
**Authorization:** Admin, Branch Admin

### 3. Get Deduction Types
**Endpoint:** `GET /payroll/deductions`
**Description:** Get all deduction types

### 4. Create Deduction Type
**Endpoint:** `POST /payroll/deductions`
**Description:** Create new deduction type
**Authorization:** Admin, Branch Admin

### 5. Get Staff Allowances
**Endpoint:** `GET /payroll/staff/:staffId/allowances`
**Description:** Get allowances assigned to specific staff

### 6. Assign Allowance to Staff
**Endpoint:** `POST /payroll/staff/:staffId/allowances`
**Description:** Assign allowance to staff member
**Authorization:** Admin, Branch Admin

### 7. Get Staff Deductions
**Endpoint:** `GET /payroll/staff/:staffId/deductions`
**Description:** Get deductions assigned to specific staff

### 8. Assign Deduction to Staff
**Endpoint:** `POST /payroll/staff/:staffId/deductions`
**Description:** Assign deduction to staff member
**Authorization:** Admin, Branch Admin

---

## 🏦 Loans APIs

### 1. Get Loans
**Endpoint:** `GET /payroll/loans`
**Description:** Get all loans with optional staff filter
**Query Parameters:** `?staff_id=123`

### 2. Create Loan
**Endpoint:** `POST /payroll/loans`
**Description:** Create new loan for staff
**Authorization:** Admin, Branch Admin

### 3. Approve Loan
**Endpoint:** `PUT /payroll/loans/:loanId/approve`
**Description:** Approve loan application
**Authorization:** Admin, Branch Admin

### 4. Get Loan Types
**Endpoint:** `GET /payroll/loan-types`
**Description:** Get available loan types

---

## 📊 Reports APIs

### 1. Salary Report (Grade-Level Based) ⭐ NEW
**Endpoint:** `GET /payroll/reports/salary`
**Description:** Get salary report grouped by grade levels (Salary Guru Groups)
**Query Parameters:** 
- `period` - Filter by period (e.g., 2025-09)
- `grade` - Filter by grade name
- `status` - Filter by staff status

**Response Example:**
```json
{
  \"success\": true,
  \"data\": {
    \"staff_id\": 19,
    \"staff_name\": \"Jane Smith\",
    \"email\": \"janesmith@example.com\",
    \"mobile_no\": \"08187654321\",
    \"employee_id\": \"EMP019\",
    \"grade_name\": \"Entry Level Teacher\",
    \"grade_code\": \"ELT\",
    \"step\": 1,
    \"basic_salary\": \"35000.00\",
    \"total_allowances\": \"0.00\",
    \"total_deductions\": \"0.00\",
    \"gross_pay\": \"35000.00\",
    \"net_pay\": \"35000.00\",
    \"status\": \"Active\",
    \"period_month\": \"2025-09\"
  }
}
```

### 2. Salary Analytics ⭐ NEW
**Endpoint:** `GET /payroll/reports/salary/analytics`
**Description:** Get salary analytics grouped by grade levels

### 3. Salary Comparison ⭐ NEW
**Endpoint:** `GET /payroll/reports/salary/comparison`
**Description:** Get salary comparison data over time

### 4. Export Salary Report ⭐ NEW
**Endpoint:** `GET /payroll/reports/salary/export`
**Description:** Export salary report in various formats
**Query Parameters:** `format=excel|pdf`

### 5. Net Salary Report
**Endpoint:** `GET /payroll/reports/net-salary/:periodMonth`
**Description:** Get net salary report for specific period

### 6. Payroll Summary
**Endpoint:** `GET /payroll/reports/summary/:periodMonth`
**Description:** Get payroll summary for specific period

### 7. Bank Schedule
**Endpoint:** `GET /payroll/reports/bank-schedule/:periodMonth`
**Description:** Get bank disbursement schedule

### 8. Deduction Report
**Endpoint:** `GET /payroll/reports/deductions/:periodMonth`
**Description:** Get deduction report for specific period

### 9. Loan Report
**Endpoint:** `GET /payroll/reports/loans/:periodMonth`
**Description:** Get loan report for specific period

---

## 📈 Dashboard APIs

### 1. Dashboard KPIs
**Endpoint:** `GET /payroll/dashboard/kpis`
**Description:** Get key performance indicators for dashboard

**Response Example:**
```json
{
  \"success\": true,
  \"data\": {
    \"total_staff\": \"11\",
    \"enrolled_staff\": \"6\",
    \"suspended_staff\": \"0\",
    \"total_basic_salary\": \"315000.00\",
    \"total_allowances\": \"8000.00\",
    \"total_deductions\": \"0.00\"
  }
}
```

### 2. Dashboard Charts
**Endpoint:** `GET /payroll/dashboard/charts`
**Description:** Get chart data for dashboard visualizations

---

## 💸 Disbursement APIs

### 1. Disburse Individual Salary
**Endpoint:** `POST /payroll/staff/:staffId/disburse`
**Description:** Disburse salary for individual staff member
**Authorization:** Admin, Branch Admin

### 2. Disburse All Salaries
**Endpoint:** `POST /payroll/disburse-all`
**Description:** Disburse all pending salaries for a period
**Authorization:** Admin, Branch Admin

### 3. Return Payroll for Correction
**Endpoint:** `POST /payroll/periods/:periodId/return`
**Description:** Return payroll period for corrections
**Authorization:** Admin, Branch Admin

---

## 📤 Export APIs

### 1. Export Payslips
**Endpoint:** `GET /payroll/exports/payslips/:periodMonth`
**Description:** Export payslips for specific period

### 2. Export Excel
**Endpoint:** `GET /payroll/exports/excel/:periodMonth`
**Description:** Export payroll data to Excel
**Query Parameters:** `type=summary|detailed`

---

## 🔐 Authorization Levels

- **Admin**: Full access to all endpoints
- **Branch Admin**: Access to branch-specific data and operations
- **Accountant**: Limited access to financial operations
- **Authenticated**: Basic read access to own data

---

## 📝 Notes

1. **Grade-Level Focus**: The new salary report APIs focus on grade levels (Salary Guru Groups) instead of departments, as grade levels determine salary structures.

2. **Employee ID Generation**: Employee IDs are auto-generated as `EMP` + zero-padded staff ID (e.g., EMP001, EMP019).

3. **Pagination**: Most list endpoints support pagination with `page`, `limit` parameters.

4. **Filtering**: Report endpoints support various filters like `period`, `grade`, `status`.

5. **Error Handling**: All endpoints return structured error responses with `success: false` and error details.

## 🧪 Testing Commands

```bash
# Test enrolled staff
curl -X GET \"http://localhost:34567/payroll/staff/enrolled\" \\
  -H \"Authorization: Bearer YOUR_TOKEN\" \\
  -H \"Content-Type: application/json\"

# Test salary report
curl -X GET \"http://localhost:34567/payroll/reports/salary?period=2025-09\" \\
  -H \"Authorization: Bearer YOUR_TOKEN\" \\
  -H \"Content-Type: application/json\"

# Test dashboard KPIs
curl -X GET \"http://localhost:34567/payroll/dashboard/kpis\" \\
  -H \"Authorization: Bearer YOUR_TOKEN\" \\
  -H \"Content-Type: application/json\"
```