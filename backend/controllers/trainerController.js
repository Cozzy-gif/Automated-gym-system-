const db = require('../db/database');

exports.getMembers = (req, res) => {
    db.all(`
        SELECT m.id, m.first_name, m.last_name, m.email, m.phone, ms.plan_type, ms.status 
        FROM Members m
        LEFT JOIN Memberships ms ON m.id = ms.member_id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.getMemberWorkout = (req, res) => {
    const { user_id } = req.params;
    db.all("SELECT * FROM Workouts WHERE user_id = ?", [user_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.updateWorkout = (req, res) => {
    const { user_id, day_of_week, routine_details } = req.body;

    // Check if workout exists for that day
    db.get("SELECT id FROM Workouts WHERE user_id = ? AND day_of_week = ?", [user_id, day_of_week], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        if (row) {
            db.run("UPDATE Workouts SET routine_details = ? WHERE id = ?", [routine_details, row.id], function (err) {
                if (err) return res.status(500).json({ success: false, message: 'Update failed' });
                res.json({ success: true, message: 'Workout updated' });
            });
        } else {
            db.run("INSERT INTO Workouts (user_id, day_of_week, routine_details) VALUES (?, ?, ?)",
                [user_id, day_of_week, routine_details], function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Insert failed' });
                    res.json({ success: true, message: 'Workout created' });
                });
        }
    });
};

exports.getAttendance = (req, res) => {
    const { member_id } = req.params;
    db.all("SELECT * FROM Attendance WHERE member_id = ? ORDER BY date DESC", [member_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.getSessions = (req, res) => {
    const { trainer_id } = req.params;
    db.all(`
        SELECT ts.*, m.first_name, m.last_name 
        FROM TrainingSessions ts
        JOIN Members m ON ts.member_id = m.id
        WHERE ts.trainer_id = ?
        ORDER BY ts.session_date ASC, ts.session_time ASC
    `, [trainer_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, data: rows });
    });
};

exports.updateSessionStatus = (req, res) => {
    const { session_id } = req.params;
    const { status } = req.body; // e.g., 'Completed', 'Cancelled'
    db.run("UPDATE TrainingSessions SET status = ? WHERE id = ?", [status, session_id], function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Update failed' });
        db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
            ['TRAINING', `Training session ID ${session_id} marked as ${status}`, new Date().toISOString()]);
        res.json({ success: true, message: 'Session updated' });
    });
};
