# How to Add Navigation Links for Billing Management

## 🎯 Quick Answer

You need to add **2 navigation links** to make billing easily accessible:

1. **Pricing Plan Management** - Configure global pricing
2. **School Billing** - Already exists in School List (Billing button)

---

## 📍 Option 1: Add to Settings Menu (RECOMMENDED)

### **Location:** Your sidebar/menu component

Find your settings navigation (usually in sidebar or header) and add:

```jsx
// In your navigation/menu component
<Menu>
  {/* Existing menu items */}
  <Menu.Item icon={<SettingOutlined />}>
    <Link to="/settings">Settings</Link>
  </Menu.Item>

  {/* ✅ ADD THIS - Pricing Management */}
  <Menu.Item icon={<DollarOutlined />}>
    <Link to="/settings/pricing-management">Pricing Management</Link>
  </Menu.Item>

  <Menu.Item icon={<TeamOutlined />}>
    <Link to="/school-setup">School List</Link>
  </Menu.Item>
</Menu>
```

---

## 📍 Option 2: Add Direct Links in School List Page

### **Location:** `/elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`

Add a button in the header section (around line 570):

```tsx
<div className="d-md-flex d-block align-items-center justify-content-between mb-3">
  <h3 className="mb-1">School List</h3>
  <Space>
    {/* ✅ ADD THIS BUTTON */}
    <Button
      icon={<DollarOutlined />}
      onClick={() => navigate("/settings/pricing-management")}
      style={{ backgroundColor: "#52c41a", borderColor: "#52c41a", color: "white" }}
    >
      Manage Pricing Plans
    </Button>

    <Button
      onClick={() => navigate("/school-setup/add-school")}
      className="btn btn-primary"
    >
      <i className="ti ti-square-rounded-plus-filled me-2" />
      Add New School
    </Button>
  </Space>
</div>
```

---

## 📍 Option 3: Add Route Configuration

### **Location:** Your routing file (e.g., `routes.tsx` or `App.tsx`)

Add the route for Pricing Management:

```tsx
import PricingPlanManagement from "./feature-module/settings/PricingPlanManagement";

// In your routes configuration
<Routes>
  {/* Existing routes */}
  <Route path="/school-setup" element={<SchoolList />} />
  <Route path="/settings" element={<Settings />} />

  {/* ✅ ADD THIS ROUTE */}
  <Route path="/settings/pricing-management" element={<PricingPlanManagement />} />
</Routes>
```

---

## 🎨 Option 4: Add Quick Access Card on Dashboard

### **Location:** Your admin dashboard

Add a quick access card:

```tsx
<Row gutter={16}>
  {/* Existing dashboard cards */}

  {/* ✅ ADD THIS CARD */}
  <Col span={6}>
    <Card
      hoverable
      onClick={() => navigate("/settings/pricing-management")}
      style={{ cursor: "pointer" }}
    >
      <Statistic
        title="Pricing Management"
        value="Configure Plans"
        prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
      />
      <p style={{ marginTop: 16, color: "#666" }}>
        Set pricing for school subscriptions
      </p>
    </Card>
  </Col>

  <Col span={6}>
    <Card
      hoverable
      onClick={() => navigate("/school-setup")}
      style={{ cursor: "pointer" }}
    >
      <Statistic
        title="School Billing"
        value="Create Subscriptions"
        prefix={<TeamOutlined style={{ color: "#1890ff" }} />}
      />
      <p style={{ marginTop: 16, color: "#666" }}>
        Manage school billing & invoices
      </p>
    </Card>
  </Col>
</Row>
```

---

## 📱 Complete Navigation Structure (Example)

Here's how your menu should look:

```
📊 Dashboard
├── 🏫 Schools
│   ├── School List  ← "Billing" button here
│   └── Add New School
│
├── ⚙️ Settings
│   ├── General Settings
│   ├── 💰 Pricing Management  ← NEW! Configure pricing plans
│   ├── Communication Setup
│   └── User Management
│
└── 💵 Finance (Optional separate section)
    ├── 💰 Pricing Plans
    ├── 📄 All Invoices
    └── 💳 Pending Payments
```

---

## 🚀 Quick Implementation (Copy-Paste Ready)

### **Step 1: Add to your main navigation/sidebar**

Find your sidebar component (usually something like `Sidebar.tsx`, `Navigation.tsx`, or `MainLayout.tsx`):

```tsx
import { DollarOutlined, TeamOutlined } from '@ant-design/icons';

// Inside your navigation menu:
<Menu mode="inline" selectedKeys={[location.pathname]}>
  {/* ... existing items ... */}

  {/* Settings Section */}
  <Menu.SubMenu
    key="settings"
    icon={<SettingOutlined />}
    title="Settings"
  >
    <Menu.Item key="/settings/general">
      <Link to="/settings/general">General</Link>
    </Menu.Item>

    {/* ✅ ADD THIS */}
    <Menu.Item key="/settings/pricing-management">
      <DollarOutlined />
      <Link to="/settings/pricing-management">Pricing Management</Link>
    </Menu.Item>

    <Menu.Item key="/settings/communication">
      <Link to="/settings/communication">Communication</Link>
    </Menu.Item>
  </Menu.SubMenu>

  {/* School Section */}
  <Menu.SubMenu
    key="schools"
    icon={<TeamOutlined />}
    title="Schools"
  >
    <Menu.Item key="/school-setup">
      <Link to="/school-setup">School List & Billing</Link>
    </Menu.Item>
    <Menu.Item key="/school-setup/add">
      <Link to="/school-setup/add-school">Add New School</Link>
    </Menu.Item>
  </Menu.SubMenu>
</Menu>
```

### **Step 2: Add route in your router file**

```tsx
import PricingPlanManagement from "./feature-module/settings/PricingPlanManagement";

<Route path="/settings/pricing-management" element={<PricingPlanManagement />} />
```

### **Step 3: Test navigation**

1. Click "Settings" → "Pricing Management"
2. You should see the Pricing Plan Management page
3. Create/edit pricing plans
4. Then go to "Schools" → "School List"
5. Click "Billing" button on any school
6. Select your pricing plan from dropdown

---

## 🔑 Key Points

1. **Pricing Management** = Configure pricing plans (do this FIRST)
2. **School List → Billing Button** = Create subscriptions for specific schools (do this AFTER pricing plans are set up)
3. **Route** = `/settings/pricing-management`
4. **Component** = `PricingPlanManagement.tsx`

---

## 💡 Pro Tip: Add Breadcrumbs

Add breadcrumbs to help users navigate:

```tsx
import { Breadcrumb } from 'antd';

// In PricingPlanManagement.tsx:
<Breadcrumb style={{ marginBottom: 16 }}>
  <Breadcrumb.Item>
    <Link to="/dashboard">Dashboard</Link>
  </Breadcrumb.Item>
  <Breadcrumb.Item>
    <Link to="/settings">Settings</Link>
  </Breadcrumb.Item>
  <Breadcrumb.Item>Pricing Management</Breadcrumb.Item>
</Breadcrumb>
```

---

## ✅ Verification Checklist

After adding navigation:

- [ ] Can you see "Pricing Management" in your menu?
- [ ] Does clicking it take you to the pricing page?
- [ ] Can you create a new pricing plan?
- [ ] Can you go to School List?
- [ ] Can you click "Billing" on a school?
- [ ] Does the pricing plan dropdown show your created plans?

---

**Need Help?**
Check your existing navigation structure and add the links following the same pattern as your other menu items!

**Last Updated:** 2025-01-08
