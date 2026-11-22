-- Run once at startup: IF NOT EXISTS preserves existing tables and their data.
CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(40) NOT NULL,
  consecutive_failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP(6),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- Remove the old account flag from databases initialized by earlier versions.
SET @enabled_column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'enabled');
SET @drop_enabled_sql = IF(@enabled_column_exists > 0, 'ALTER TABLE users DROP COLUMN enabled', 'SELECT 1');
PREPARE drop_enabled_stmt FROM @drop_enabled_sql;
EXECUTE drop_enabled_stmt;
DEALLOCATE PREPARE drop_enabled_stmt;

-- Machines are stored separately so reports can validate their machine identifier.
CREATE TABLE IF NOT EXISTS machines (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  location VARCHAR(120),
  status VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- The current status is on the report; changes are also recorded in status_history below.
CREATE TABLE IF NOT EXISTS fault_reports (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  machine_id BIGINT NOT NULL,
  description TEXT NOT NULL,
  reporter_id BIGINT NOT NULL,
  assigned_technician_id BIGINT,
  status VARCHAR(24) NOT NULL DEFAULT 'REPORTED',
  submitted_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_fault_submitted_at (submitted_at),
  INDEX idx_fault_status (status),
  CONSTRAINT fk_fault_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
  CONSTRAINT fk_fault_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_fault_technician FOREIGN KEY (assigned_technician_id) REFERENCES users(id)
);

-- Append-only lifecycle history: one row for the initial status and each accepted change.
CREATE TABLE IF NOT EXISTS status_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fault_report_id BIGINT NOT NULL,
  from_status VARCHAR(24),
  to_status VARCHAR(24) NOT NULL,
  changed_by_id BIGINT NOT NULL,
  changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_status_fault FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id),
  CONSTRAINT fk_status_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS maintenance_actions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fault_report_id BIGINT NOT NULL,
  technician_id BIGINT NOT NULL,
  description TEXT NOT NULL,
  recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_action_fault FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id),
  CONSTRAINT fk_action_technician FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- Metadata is in MySQL; the larger uploaded file bytes are kept in file storage.
CREATE TABLE IF NOT EXISTS attachments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fault_report_id BIGINT NOT NULL,
  uploaded_by_id BIGINT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_name VARCHAR(255) NOT NULL UNIQUE,
  content_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_attachment_fault FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id),
  CONSTRAINT fk_attachment_user FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assignment_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fault_report_id BIGINT NOT NULL,
  previous_technician_id BIGINT,
  new_technician_id BIGINT NOT NULL,
  assigned_by_id BIGINT NOT NULL,
  assigned_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_assignment_fault FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id),
  CONSTRAINT fk_assignment_previous FOREIGN KEY (previous_technician_id) REFERENCES users(id),
  CONSTRAINT fk_assignment_next FOREIGN KEY (new_technician_id) REFERENCES users(id),
  CONSTRAINT fk_assignment_actor FOREIGN KEY (assigned_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_id BIGINT NOT NULL,
  fault_report_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  message VARCHAR(300) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  read_at TIMESTAMP(6),
  INDEX idx_notification_recipient_created (recipient_id, created_at),
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT fk_notification_report FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id)
);

CREATE TABLE IF NOT EXISTS login_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  attempted_username VARCHAR(80) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_login_event_created (created_at),
  CONSTRAINT fk_login_event_user FOREIGN KEY (user_id) REFERENCES users(id)
);
