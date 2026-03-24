const db = require('../db/database');

// Service for automated access (biometrics)
const handleCheckIn = (biometric_id, callback) => {
    // Look up the member based on biometric ID
    db.get(`
        SELECT m.first_name, m.last_name, ms.status, ms.expiry_date 
        FROM Memberships ms 
        JOIN Members m ON m.id = ms.member_id 
        WHERE ms.biometric_id = ?
    `, [biometric_id], (err, row) => {
        if (err) {
            return callback({ success: false, message: 'Database error' }, null);
        }

        if (!row) {
            return callback({ success: false, message: 'Biometric ID not recognized' }, null);
        }

        const currentDate = new Date();
        const expiryDate = new Date(row.expiry_date);

        // Check if status is Active and not expired
        if (row.status === 'Active' && expiryDate >= currentDate) {
            // Simulate triggering door relay 
            // In a real system, this sends a signal over serial/GPIO
            return callback(null, {
                success: true,
                message: `Access Granted to ${row.first_name} ${row.last_name}`,
                doorRelay: 'Triggered'
            });
        } else {
            return callback(null, {
                success: false,
                message: 'Access Denied: Membership is inactive or expired',
                doorRelay: 'Locked'
            });
        }
    });
};

module.exports = {
    handleCheckIn
};
