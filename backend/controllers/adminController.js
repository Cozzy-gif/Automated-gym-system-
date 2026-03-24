const db = require('../db/database');
const bcrypt = require('bcrypt');

// --- User Management ---
exports.getAllUsers = (req, res) => {
    db.all("SELECT id, username, role FROM Users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.createUser = (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ success: false, message: 'All fields are required' });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ success: false, message: 'Encryption error' });
        db.run("INSERT INTO Users (username, password, role) VALUES (?, ?, ?)", [username, hash, role], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Could not create user' });
            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['USER', `Created new user: ${username} (${role})`, new Date().toISOString()]);
            res.json({ success: true, message: 'User created successfully', userId: this.lastID });
        });
    });
};

exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, role, password } = req.body;

    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ success: false, message: 'Encryption error' });
            db.run("UPDATE Users SET username = ?, role = ?, password = ? WHERE id = ?", [username, role, hash, id], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Update failed' });
                db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                    ['USER', `Updated user ID: ${id} to ${username} (${role}) with new password`, new Date().toISOString()]);
                res.json({ success: true, message: 'User updated successfully' });
            });
        });
    } else {
        db.run("UPDATE Users SET username = ?, role = ? WHERE id = ?", [username, role, id], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Update failed' });
            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['USER', `Updated user ID: ${id} to ${username} (${role})`, new Date().toISOString()]);
            res.json({ success: true, message: 'User updated successfully' });
        });
    }
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM Users WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Deletion failed' });
        db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
            ['USER', `Deleted user ID: ${id}`, new Date().toISOString()]);
        res.json({ success: true, message: 'User deleted successfully' });
    });
};

// --- Equipment Management ---
exports.getEquipment = (req, res) => {
    db.all("SELECT * FROM Equipment", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.addEquipment = (req, res) => {
    const { name, condition, status, maintenance_date, body_part } = req.body;
    db.run("INSERT INTO Equipment (name, condition, status, maintenance_date, body_part) VALUES (?, ?, ?, ?, ?)",
        [name, condition, status || 'Operational', maintenance_date, body_part || 'Full Body'], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Could not add equipment' });
            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['EQUIPMENT', `Added new equipment: ${name} (${body_part || 'Full Body'})`, new Date().toISOString()]);
            res.json({ success: true, message: 'Equipment added', equipmentId: this.lastID });
        });
};

exports.updateEquipment = (req, res) => {
    const { id } = req.params;
    const { name, condition, status, maintenance_date, body_part } = req.body;
    db.run("UPDATE Equipment SET name = ?, condition = ?, status = ?, maintenance_date = ?, body_part = ? WHERE id = ?",
        [name, condition, status, maintenance_date, body_part, id], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Update failed' });
            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['EQUIPMENT', `Updated equipment status: ${name} to ${status}`, new Date().toISOString()]);
            res.json({ success: true, message: 'Equipment updated' });
        });
};

exports.deleteEquipment = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM Equipment WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Deletion failed' });
        db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
            ['EQUIPMENT', `Deleted equipment ID: ${id}`, new Date().toISOString()]);
        res.json({ success: true, message: 'Equipment deleted' });
    });
};

// --- Dashboard Reports ---
exports.getDashboardStats = (req, res) => {
    // Collect basic stats: total members, active plans, revenue, and monthly revenue
    let stats = { totalMembers: 0, activePlans: 0, totalRevenue: 0, monthlyRevenue: 0 };

    db.get("SELECT COUNT(*) as count FROM Members", (err, row) => {
        if (row) stats.totalMembers = row.count;

        db.get("SELECT COUNT(*) as count FROM Memberships WHERE status = 'Active'", (err, row) => {
            if (row) stats.activePlans = row.count;

            db.get("SELECT SUM(amount) as total FROM Payments", (err, row) => {
                if (row && row.total) stats.totalRevenue = row.total;

                // Calculate current month strings e.g. "2026-03" -> "2026-03%"
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const monthlyPrefix = `${year}-${month}%`;

                db.get("SELECT SUM(amount) as monthlyTotal FROM Payments WHERE payment_date LIKE ?", [monthlyPrefix], (err, row) => {
                    if (row && row.monthlyTotal) stats.monthlyRevenue = row.monthlyTotal;

                    res.json({ success: true, data: stats });
                });
            });
        });
    });
};

exports.getRecentActivities = (req, res) => {
    db.all("SELECT * FROM ActivityLogs ORDER BY id DESC LIMIT 5", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};
