const db = require('../db/database');
const bcrypt = require('bcrypt');

const getStatus = (req, res) => {
    const userId = req.params.user_id;

    db.get(`
        SELECT m.id AS member_id, ms.status, ms.plan_type, ms.expiry_date, ms.biometric_id
        FROM Members m
        LEFT JOIN Memberships ms ON m.id = ms.member_id
        WHERE m.user_id = ?
    `, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        if (!row) {
            return res.json({ success: false, message: 'Member profile not found' });
        }

        if (!row.status) {
            return res.json({ success: true, member_id: row.member_id, biometric_id: 'Not Assigned', status: 'No Active Membership', plan_type: 'N/A', expiry_date: 'N/A' });
        }

        return res.json({ success: true, ...row });
    });
};

const getWorkout = (req, res) => {
    const userId = req.params.user_id;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    db.get(`SELECT routine_details FROM Workouts WHERE user_id = ? AND day_of_week = ?`, [userId, today], (err, workout) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        if (!workout) {
            // Default simulated workout if not explicitly set
            const defaultWorkouts = {
                'Monday': 'Chest & Triceps: Bench Press 4x10, Incline DB Press 3x12, Tricep Pushdowns 3x15, Cardio 20 mins',
                'Tuesday': 'Back & Biceps: Deadlifts 4x8, Lat Pulldowns 3x12, Bicep Curls 3x15, Rowing 15 mins',
                'Wednesday': 'Active Recovery: Stretching, Mobility work, Light Jogging 30 mins',
                'Thursday': 'Legs & Core: Squats 4x10, Leg Press 3x12, Planks 3x1 min',
                'Friday': 'Shoulders & Arms: OHP 4x10, Lateral Raises 3x15, Hammer Curls 3x12',
                'Saturday': 'Full Body HIIT: Burpees, Kettlebell Swings, Box Jumps (45s work / 15s rest) x 20 mins',
                'Sunday': 'Rest Day'
            };
            return res.json({ success: true, day: today, routine: defaultWorkouts[today] });
        }

        return res.json({ success: true, day: today, routine: workout.routine_details });
    });
};

const logAttendance = (req, res) => {
    const userId = req.body.user_id || req.params.user_id; // Accept from body or params
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();

    // Assuming we can lookup member_id from user_id if needed
    db.get("SELECT id FROM Members WHERE user_id = ?", [userId], (err, member) => {
        if (err || !member) return res.status(500).json({ success: false, message: 'Member not found' });

        db.run("INSERT INTO Attendance (member_id, check_in_time, date) VALUES (?, ?, ?)",
            [member.id, time, date], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to log attendance' });
                db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                    ['SYSTEM', `Member logged attendance: ID ${member.id}`, new Date().toISOString()]);
                res.json({ success: true, message: 'Attendance logged successfully for today!' });
            });
    });
};

const getPayments = (req, res) => {
    const userId = req.params.user_id;
    db.get("SELECT id FROM Members WHERE user_id = ?", [userId], (err, member) => {
        if (err || !member) return res.status(500).json({ success: false, message: 'Member not found' });

        db.all("SELECT * FROM Payments WHERE member_id = ? ORDER BY payment_date DESC", [member.id], (err, payments) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            res.json({ success: true, payments });
        });
    });
};

const bookTrainer = (req, res) => {
    const { user_id, trainer_id, date, time } = req.body;
    db.get("SELECT id FROM Members WHERE user_id = ?", [user_id], (err, member) => {
        if (err || !member) return res.status(500).json({ success: false, message: 'Member not found' });

        db.run("INSERT INTO TrainingSessions (trainer_id, member_id, session_date, session_time) VALUES (?, ?, ?, ?)",
            [trainer_id, member.id, date, time], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to book session' });
                res.json({ success: true, message: 'Successfully booked session.' });
            });
    });
};

const getNotifications = (req, res) => {
    const { user_id } = req.params;
    db.all("SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC", [user_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

const updateProfile = (req, res) => {
    const { user_id } = req.params;
    const { first_name, last_name, phone } = req.body;
    db.run("UPDATE Members SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?",
        [first_name, last_name, phone, user_id], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to update profile' });
            res.json({ success: true, message: 'Profile updated successfully' });
        });
};

const getAllMembersDetails = (req, res) => {
    db.all(`
        SELECT m.id AS member_profile_id, m.user_id, m.first_name, m.last_name, m.email, m.phone, 
               u.username, u.role, ms.status, ms.plan_type, ms.expiry_date
        FROM Members m
        JOIN Users u ON m.user_id = u.id
        LEFT JOIN Memberships ms ON m.id = ms.member_id
        ORDER BY m.id DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

const updatePassword = (req, res) => {
    const { user_id } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ success: false, message: 'Encryption error' });

        db.run("UPDATE Users SET password = ? WHERE id = ?", [hash, user_id], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to update password' });

            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                ['USER', `Password updated for user ID: ${user_id}`, new Date().toISOString()]);

            res.json({ success: true, message: 'Password updated successfully' });
        });
    });
};

const deleteMember = (req, res) => {
    const { user_id } = req.params;

    // First get the member_id associated with this user_id
    db.get("SELECT id FROM Members WHERE user_id = ?", [user_id], (err, member) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            if (member) {
                const memberId = member.id;
                db.run("DELETE FROM Memberships WHERE member_id = ?", [memberId]);
                db.run("DELETE FROM Attendance WHERE member_id = ?", [memberId]);
                db.run("DELETE FROM Payments WHERE member_id = ?", [memberId]);
                db.run("DELETE FROM TrainingSessions WHERE member_id = ?", [memberId]);
                db.run("DELETE FROM Members WHERE id = ?", [memberId]);
            }

            db.run("DELETE FROM Workouts WHERE user_id = ?", [user_id]);
            db.run("DELETE FROM Notifications WHERE user_id = ?", [user_id]);

            db.run("DELETE FROM Users WHERE id = ?", [user_id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ success: false, message: 'Failed to delete user' });
                }

                db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                    ['SYSTEM', `Deleted member profile and user data for user ID: ${user_id}`, new Date().toISOString()]);

                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Failed to commit transaction' });
                    res.json({ success: true, message: 'Member deleted successfully' });
                });
            });
        });
    });
};

const getMemberSessions = (req, res) => {
    const { user_id } = req.params;

    db.get("SELECT id FROM Members WHERE user_id = ?", [user_id], (err, member) => {
        if (err || !member) return res.status(500).json({ success: false, message: 'Member not found' });

        db.all(`
            SELECT ts.id, ts.session_date, ts.session_time, ts.status, u.username as trainer_name 
            FROM TrainingSessions ts
            JOIN Users u ON ts.trainer_id = u.id
            WHERE ts.member_id = ?
            ORDER BY ts.session_date DESC, ts.session_time DESC
        `, [member.id], (err, sessions) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error fetching sessions' });
            res.json({ success: true, data: sessions });
        });
    });
};

const getTrainerAvailability = (req, res) => {
    const { trainer_id, date } = req.params;

    db.all(`
        SELECT session_time 
        FROM TrainingSessions 
        WHERE trainer_id = ? AND session_date = ? AND status != 'Cancelled'
    `, [trainer_id, date], (err, takenSlots) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        const bookedTimes = takenSlots.map(slot => slot.session_time);
        res.json({ success: true, booked_times: bookedTimes });
    });
};

module.exports = {
    getStatus, getWorkout, logAttendance, getPayments, bookTrainer, getNotifications, updateProfile,
    getAllMembersDetails, updatePassword, deleteMember, getMemberSessions, getTrainerAvailability
};
