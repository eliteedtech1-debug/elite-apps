-- Create RBAC menu cache table and populate with superadmin menu
CREATE TABLE IF NOT EXISTS rbac_menu_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert menu data with proper superadmin access
INSERT INTO rbac_menu_cache (menu_data) VALUES ('[
  {
    "name": "Super Admin",
    "requiredAccess": ["superadmin"],
    "items": [
      {"key": "CREATE_SCHOOL", "label": "Create School", "link": "/school-setup/school-setup", "requiredAccess": ["superadmin"]},
      {"key": "SCHOOL_LIST", "label": "School List", "link": "/school-setup/school-list", "requiredAccess": ["superadmin"]},
      {"key": "SUPPORT_DASHBOARD", "label": "Support Dashboard", "link": "/superadmin/support-dashboard", "requiredAccess": ["superadmin"]},
      {"key": "QUEUE_DASHBOARD", "label": "Queue Dashboard", "link": "/superadmin/queue-dashboard", "requiredAccess": ["superadmin"]}
    ]
  }
]');
