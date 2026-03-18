# Phase 3: Device Detection & Lite Mode (Day 3 - 3 hours)

## Goal: Serve lightweight version to old devices

---

## 3.1 Device Detection Utility

**File:** `elscholar-ui/src/utils/deviceDetection.ts`

```typescript
interface DeviceInfo {
  isOldDevice: boolean;
  memory: number;
  platform: string;
  isSlowNetwork: boolean;
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  const memory = (navigator as any).deviceMemory || 4;
  const connection = (navigator as any).connection;
  
  // Check for old Android
  const isOldAndroid = /Android [1-4]/.test(ua);
  
  // Check for old iOS
  const isOldIOS = /iPhone OS [1-9]_/.test(ua);
  
  // Check for low memory
  const isLowMemory = memory < 2;
  
  // Check for slow network
  const isSlowNetwork = connection?.effectiveType === 'slow-2g' || 
                        connection?.effectiveType === '2g';
  
  const isOldDevice = isOldAndroid || isOldIOS || isLowMemory;
  
  return {
    isOldDevice,
    memory,
    platform: navigator.platform,
    isSlowNetwork
  };
}

export function shouldUseLiteMode(): boolean {
  const device = detectDevice();
  
  // Use lite mode if:
  // - Old device OR
  // - Slow network OR
  // - User preference (from localStorage)
  const userPreference = localStorage.getItem('useLiteMode') === 'true';
  
  return device.isOldDevice || device.isSlowNetwork || userPreference;
}
```

---

## 3.2 Create Lite Dashboard Components

**File:** `elscholar-ui/src/feature-module/mainMenu/adminDashboard/LiteAdminDashboard.tsx`

```typescript
import React from 'react';
import { Card, Row, Col, Typography } from 'antd';

const { Title, Text } = Typography;

interface LiteAdminDashboardProps {
  stats?: {
    totalStudents: number;
    totalTeachers: number;
    totalRevenue: number;
  };
}

const LiteAdminDashboard: React.FC<LiteAdminDashboardProps> = ({ stats }) => {
  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Admin Dashboard (Lite)</Title>
      <Text type="secondary">Optimized for your device</Text>
      
      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card>
            <Text strong>Total Students</Text>
            <Title level={3}>{stats?.totalStudents || 0}</Title>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card>
            <Text strong>Total Teachers</Text>
            <Title level={3}>{stats?.totalTeachers || 0}</Title>
          </Card>
        </Col>
        
        <Col span={24}>
          <Card>
            <Text strong>Total Revenue</Text>
            <Title level={3}>₦{stats?.totalRevenue || 0}</Title>
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a 
          href="#" 
          onClick={() => {
            localStorage.setItem('useLiteMode', 'false');
            window.location.reload();
          }}
        >
          Switch to Full Version
        </a>
      </div>
    </div>
  );
};

export default LiteAdminDashboard;
```

---

## 3.3 Update Main Dashboard to Use Lite Mode

**File:** `elscholar-ui/src/feature-module/mainMenu/adminDashboard/index.tsx`

Add at the top:

```typescript
import { lazy, Suspense } from 'react';
import { shouldUseLiteMode } from '../../../utils/deviceDetection';
import LiteAdminDashboard from './LiteAdminDashboard';

const FullAdminDashboard = lazy(() => import('./FullAdminDashboard'));

const AdminDashboard = () => {
  const useLite = shouldUseLiteMode();
  
  if (useLite) {
    return <LiteAdminDashboard />;
  }
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FullAdminDashboard />
    </Suspense>
  );
};

export default AdminDashboard;
```

Move existing dashboard code to `FullAdminDashboard.tsx`

---

## 3.4 Add Mode Switcher

**File:** `elscholar-ui/src/components/ModeSwitcher.tsx`

```typescript
import React from 'react';
import { Switch, Space, Typography } from 'antd';
import { shouldUseLiteMode } from '../utils/deviceDetection';

const { Text } = Typography;

const ModeSwitcher: React.FC = () => {
  const [isLite, setIsLite] = React.useState(shouldUseLiteMode());
  
  const handleToggle = (checked: boolean) => {
    localStorage.setItem('useLiteMode', String(checked));
    setIsLite(checked);
    window.location.reload();
  };
  
  return (
    <Space>
      <Text>Lite Mode</Text>
      <Switch checked={isLite} onChange={handleToggle} />
    </Space>
  );
};

export default ModeSwitcher;
```

Add to header/settings menu.

---

## 3.5 Create Lite Versions for Other Dashboards

Repeat for:
- `LiteTeacherDashboard.tsx`
- `LiteStudentDashboard.tsx`
- `LiteParentDashboard.tsx`

**Template:**
```typescript
const LiteDashboard = () => (
  <div style={{ padding: 20 }}>
    <h2>Dashboard (Lite)</h2>
    {/* Simple cards, no charts, no animations */}
    <Card>Basic stats only</Card>
  </div>
);
```

---

## ✅ Phase 3 Checklist

- [ ] Created device detection utility
- [ ] Created LiteAdminDashboard component
- [ ] Updated main dashboard to use lite mode
- [ ] Added mode switcher component
- [ ] Created lite versions for all dashboards
- [ ] Tested on old device (Chrome DevTools → Device Mode → Moto G4)

**Time:** 3 hours
**Impact:** Old devices can now use the app

---

**Next:** Phase 4 - Browser Compatibility
