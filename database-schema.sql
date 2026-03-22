-- Create database
CREATE DATABASE IF NOT EXISTS emergency_dispatch;
USE emergency_dispatch;

-- ============================================
-- TABLE: vehicles
-- Stores all emergency vehicles
-- ============================================

CREATE TABLE vehicles (
    vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type ENUM('ambulance', 'fire', 'police') NOT NULL,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    status ENUM('available', 'busy', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (vehicle_type),
    INDEX idx_status (status)
);

-- ============================================
-- TABLE: dispatch_history
-- Tracks all dispatched vehicles
-- ============================================
CREATE TABLE dispatch_history (
    dispatch_id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    emergency_lat DECIMAL(10,8) NOT NULL,
    emergency_lng DECIMAL(11,8) NOT NULL,
    distance_km DECIMAL(5,2),
    response_time_hours DECIMAL(3,1),
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_time (dispatched_at)
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert vehicles
INSERT INTO vehicles (vehicle_type, vehicle_number, latitude, longitude, status) VALUES
('ambulance', 'AMB-101', 40.7128, -74.0060, 'available'),
('ambulance', 'AMB-102', 40.7150, -74.0090, 'available'),
('ambulance', 'AMB-103', 40.7100, -74.0020, 'available'),
('ambulance', 'AMB-104', 40.7200, -74.0150, 'busy'),
('fire', 'FIR-201', 40.7140, -74.0080, 'available'),
('fire', 'FIR-202', 40.7180, -74.0120, 'available'),
-- ('fire', 'FIR-207', 40.7120, -74.0220, 'available'),
('fire', 'FIR-203', 40.7250, -74.0200, 'busy'),
('fire', 'FIR-204', 40.7260, -74.0201, 'available'),

('police', 'POL-301', 40.7135, -74.0075, 'available'),
('police', 'POL-302', 40.7160, -74.0100, 'available'),
('police', 'POL-303', 40.7220, -74.0170, 'available'),
('police', 'POL-304', 40.7300, -74.0250, 'available'),
('police', 'POL-305', 40.7350, -74.0300, 'busy');

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View: Available vehicles count
CREATE VIEW vw_available_vehicles AS
SELECT 
    vehicle_type,
    COUNT(*) as available_count
FROM vehicles
WHERE status = 'available'
GROUP BY vehicle_type;

-- View: Recent dispatches
CREATE VIEW vw_recent_dispatches AS
SELECT 
    d.dispatch_id,
    v.vehicle_number,
    v.vehicle_type,
    d.distance_km,
    d.response_time_hours,
    d.dispatched_at
FROM dispatch_history d
JOIN vehicles v ON d.vehicle_id = v.vehicle_id
ORDER BY d.dispatched_at DESC
LIMIT 10;

-- ============================================
-- VERIFY DATA
-- ============================================
SELECT '✅ Database created successfully!' as Status;
SELECT 'Vehicles:' as '';
SELECT * FROM vehicles;
SELECT 'Available counts:' as '';
~
SELECT * FROM vw_available_vehicles;
