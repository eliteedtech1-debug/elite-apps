-- Add Admission section to RBAC menu cache
-- This should be inserted between Personal Data Mngr and Attendance sections

UPDATE rbac_menu_cache 
SET menu_data = JSON_INSERT(
  menu_data,
  '$[1]',
  JSON_OBJECT(
    'name', 'Admission',
    'requiredAccess', JSON_ARRAY('admin', 'branchadmin'),
    'premium', true,
    'items', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'ADMISSION_DASHBOARD',
        'label', 'Dashboard',
        'icon', 'ti ti-dashboard',
        'link', '/admission/dashboard',
        'feature', 'admission',
        'premium', true,
        'requiredAccess', JSON_ARRAY('admin', 'branchadmin')
      ),
      JSON_OBJECT(
        'key', 'ADMISSION_APPLICATIONS',
        'label', 'Applications',
        'icon', 'ti ti-file-text',
        'link', '/admission/applications',
        'feature', 'admission',
        'premium', true,
        'requiredAccess', JSON_ARRAY('admin', 'branchadmin')
      ),
      JSON_OBJECT(
        'key', 'ADMISSION_ANALYTICS',
        'label', 'Analytics',
        'icon', 'ti ti-chart-bar',
        'link', '/admission/analytics',
        'feature', 'admission',
        'premium', true,
        'requiredAccess', JSON_ARRAY('admin', 'branchadmin')
      )
    )
  )
)
WHERE id = (SELECT MAX(id) FROM (SELECT id FROM rbac_menu_cache) AS temp);
