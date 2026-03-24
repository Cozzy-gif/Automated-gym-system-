const db = require('../db/database');
const bcrypt = require('bcrypt');

exports.searchMember = (req, res) => {
    const { term } = req.query; // Search term (name, email, phone)

    const query = `
        SELECT m.id, m.first_name, m.last_name, m.email, m.phone, ms.plan_type, ms.status, ms.expiry_date
        FROM Members m
        LEFT JOIN Memberships ms ON m.id = ms.member_id
        WHERE m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?
    `;
    const searchParam = `%${term}%`;

    db.all(query, [searchParam, searchParam, searchParam, searchParam], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.issueDayPass = (req, res) => {
    const { guest_name, phone, amount } = req.body;

    const date = new Date().toISOString().split('T')[0];
    const receipt_id = 'DP' + Date.now();

    db.run("INSERT INTO Payments (member_id, amount, plan_type, payment_date, receipt_id) VALUES (?, ?, ?, ?, ?)",
        [0, amount, 'Day Pass - ' + guest_name, date, receipt_id], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to issue pass' });
            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['FINANCE', `Issued Day Pass to ${guest_name} for Ksh ${amount}`, new Date().toISOString()]);
            res.json({ success: true, message: 'Day pass issued successfully', receipt_id });
        });
};

exports.registerMember = (req, res) => {
    const { firstName, lastName, email, phone, biometricId, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !biometricId || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    db.get('SELECT * FROM Users WHERE username = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (user) return res.status(400).json({ success: false, message: 'Email (username) already exists' });

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });

            db.run("INSERT INTO Users (username, password, role) VALUES (?, ?, ?)", [email, hash, 'Member'], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to create user account' });

                const userId = this.lastID;

                db.run("INSERT INTO Members (user_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)",
                    [userId, firstName, lastName, email, phone], function (err) {
                        if (err) return res.status(500).json({ success: false, message: 'Failed to create member profile' });

                        const memberId = this.lastID;

                        const startDateStr = new Date().toISOString().split('T')[0];
                        db.run("INSERT INTO Memberships (member_id, plan_type, start_date, expiry_date, status, biometric_id) VALUES (?, ?, ?, ?, ?, ?)",
                            [memberId, 'Pending', startDateStr, startDateStr, 'Pending Payment', biometricId], function (err) {
                                if (err) {
                                    if (err.message.includes('UNIQUE constraint failed: Memberships.biometric_id')) {
                                        return res.status(400).json({ success: false, message: 'Biometric ID already assigned' });
                                    }
                                    return res.status(500).json({ success: false, message: 'Failed to assign biometric ID' });
                                }

                                db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                                    ['USER', `New member registered by receptionist: ${firstName} ${lastName}`, new Date().toISOString()]);

                                return res.json({
                                    success: true,
                                    message: 'Member registered successfully. Redirecting to payment.',
                                    member_id: memberId
                                });
                            });
                    });
            });
        });
    });
};
