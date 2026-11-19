SET NAMES utf8mb4;
SET time_zone = '+05:30';

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id CHAR(36) NOT NULL,
  admin_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
  KEY idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS facilities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(160) NOT NULL,
  sport ENUM('Badminton','Cricket','Football') NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT 'Jaffna Sports Academy, Jaffna',
  ground_type VARCHAR(120) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT 'Jaffna Sports Academy, Jaffna',
  whatsapp VARCHAR(30) NOT NULL DEFAULT '94772234567',
  opening_time TIME NOT NULL DEFAULT '06:00:00',
  closing_time TIME NOT NULL DEFAULT '20:00:00',
  slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  status ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_facilities_slug (slug),
  KEY idx_facilities_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference VARCHAR(24) NOT NULL,
  facility_id BIGINT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  customer_name VARCHAR(140) NOT NULL,
  customer_contact VARCHAR(190) NOT NULL,
  notes TEXT NULL,
  status ENUM('pending','confirmed','rejected','cancelled') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY idx_bookings_date_status (booking_date, status),
  KEY idx_bookings_facility_date (facility_id, booking_date),
  CONSTRAINT fk_bookings_facility FOREIGN KEY (facility_id) REFERENCES facilities(id),
  CONSTRAINT fk_bookings_reviewer FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_slots (
  booking_id BIGINT UNSIGNED NOT NULL,
  facility_id BIGINT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  PRIMARY KEY (booking_id),
  UNIQUE KEY uq_booking_slots_facility_time (facility_id, booking_date, start_time),
  CONSTRAINT fk_booking_slots_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_slots_facility FOREIGN KEY (facility_id) REFERENCES facilities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(80) NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created (created_at),
  KEY idx_audit_logs_admin (admin_id),
  CONSTRAINT fk_audit_logs_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admins (email, password_hash, display_name)
VALUES ('demo@gmail.com', '$2b$12$hCtSGiC1xD5r9G1Wbvhw.eMjH7c6ivTKVEGRmxVh8tzQaweni1NJu', 'Administrator')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), is_active = TRUE;

INSERT INTO facilities (slug, name, sport, ground_type, hourly_rate, sort_order) VALUES
  ('badminton-court-1', 'Badminton Court 1', 'Badminton', 'Independent indoor court', 2500, 10),
  ('cricket-net-1', 'Cricket Net 1', 'Cricket', 'Shared turf · book any cricket net for this time slot', 3000, 20),
  ('cricket-net-2', 'Cricket Net 2', 'Cricket', 'Shared turf · book any cricket net for this time slot', 3000, 30),
  ('cricket-net-3', 'Cricket Net 3', 'Cricket', 'Shared turf · book any cricket net for this time slot', 3000, 40),
  ('cricket-net-4', 'Cricket Net 4', 'Cricket', 'Shared turf · book any cricket net for this time slot', 3000, 50),
  ('football-play-area', 'Football Play Area', 'Football', 'Shared turf · football bookings reserve the cricket nets', 4000, 60)
ON DUPLICATE KEY UPDATE name = VALUES(name), sport = VALUES(sport), ground_type = VALUES(ground_type), hourly_rate = VALUES(hourly_rate), sort_order = VALUES(sort_order);

INSERT IGNORE INTO bookings (reference, facility_id, booking_date, start_time, end_time, customer_name, customer_contact, status)
SELECT 'JSA-8917', id, '2026-10-09', '06:00:00', '07:00:00', 'hcdgjcfjg', '+94 77 123 4567', 'pending'
FROM facilities WHERE slug = 'badminton-court-1';
INSERT IGNORE INTO bookings (reference, facility_id, booking_date, start_time, end_time, customer_name, customer_contact, status)
SELECT 'JSA-8918', id, '2026-10-09', '09:00:00', '10:00:00', 'dgfsgsg', 'wijeyaabhimanue@gmail.com', 'pending'
FROM facilities WHERE slug = 'cricket-net-2';
INSERT IGNORE INTO booking_slots (booking_id, facility_id, booking_date, start_time)
SELECT id, facility_id, booking_date, start_time FROM bookings WHERE status IN ('pending','confirmed');
