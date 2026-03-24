const bcrypt = require('bcrypt');
const db = require('../db/database');

const login = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    db.get('SELECT * FROM Users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error comparing passwords' });
            }

            if (isMatch) {
                // Determine checking status logic if member (in Chapter 3 logic says expired still could login? We correct this!)
                // In our schema, Users are admin/staff. Members use the check in.

                return res.json({
                    success: true,
                    message: 'Login successful',
                    user: { id: user.id, username: user.username, role: user.role }
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        });
    });
};

const signup = (req, res) => {
    const { username, password, role, firstName, lastName, email, phone } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (role === 'Member' && (!firstName || !lastName || !email || !phone)) {
        return res.status(400).json({ success: false, message: 'Member personal details are required' });
    }

    db.get('SELECT * FROM Users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (user) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error hashing password' });
            }

            db.run("INSERT INTO Users (username, password, role) VALUES (?, ?, ?)", [username, hash, role], function (err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create user' });
                }

                const userId = this.lastID;

                if (role === 'Member') {
                    db.run("INSERT INTO Members (user_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)",
                        [userId, firstName, lastName, email, phone], function (err) {
                            if (err) {
                                // If member creation fails, consider rolling back user creation or handling it as a partial failure
                                // For simplicity, we'll just return an error here.
                                return res.status(500).json({ success: false, message: 'Failed to create member profile' });
                            }
                            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                                ['USER', `New member registered: ${firstName} ${lastName}`, new Date().toISOString()]);
                            return res.json({
                                success: true,
                                message: 'Registration successful',
                                user: { id: userId, username, role }
                            });
                        });
                } else {
                    return res.json({
                        success: true,
                        message: 'Registration successful',
                        user: { id: userId, username, role }
                    });
                }
            });
        });
    });
};

const forgotPassword = (req, res) => {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        return res.status(400).json({ success: false, message: 'Username and new password are required' });
    }

    db.get('SELECT * FROM Users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error hashing new password' });
            }

            db.run("UPDATE Users SET password = ? WHERE id = ?", [hash, user.id], function (err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to reset password' });
                }

                db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                    ['USER', `Password reset via forgot password for: ${username}`, new Date().toISOString()]);

                return res.json({
                    success: true,
                    message: 'Password reset successful'
                });
            });
        });
    });
};

module.exports = {
    login,
    signup,
    forgotPassword
};
