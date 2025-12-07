USE elite_yazid;

CREATE TABLE IF NOT EXISTS asset_history (
  history_id VARCHAR(20) PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL,
  action_type ENUM('Created', 'Updated', 'Transferred', 'Maintenance', 'Status Change', 'Inspection', 'Deleted') NOT NULL,
  description TEXT,
  user_id VARCHAR(20),
  user_name VARCHAR(100),
  old_values JSON,
  new_values JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  school_id VARCHAR(20) NOT NULL,
  INDEX idx_asset_id (asset_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);
