const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'gym_system.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create tables
        db.serialize(() => {
            // Users Table for Staff & Admin (Login)
            db.run(`CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )`);

            // Members Table
            db.run(`CREATE TABLE IF NOT EXISTS Members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )`);

            // Try to add user_id column if it doesn't exist (for existing databases)
            db.run(`ALTER TABLE Members ADD COLUMN user_id INTEGER`, (err) => {
                // Ignore error if column already exists
            });

            // Memberships Table
            db.run(`CREATE TABLE IF NOT EXISTS Memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                plan_type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                expiry_date TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                biometric_id TEXT UNIQUE,
                FOREIGN KEY (member_id) REFERENCES Members(id)
            )`);

            // Workouts Table
            db.run(`CREATE TABLE IF NOT EXISTS Workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                day_of_week TEXT NOT NULL,
                routine_details TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )`);

            // Equipment Table
            db.run(`CREATE TABLE IF NOT EXISTS Equipment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'Operational',
                maintenance_date TEXT,
                condition TEXT,
                body_part TEXT
            )`);

            // Try to add body_part column if it doesn't exist (for existing databases)
            db.run(`ALTER TABLE Equipment ADD COLUMN body_part TEXT`, (err) => {
                // Ignore error if column already exists
            });

            // Attendance Table
            db.run(`CREATE TABLE IF NOT EXISTS Attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                check_in_time TEXT,
                check_out_time TEXT,
                date TEXT NOT NULL,
                FOREIGN KEY (member_id) REFERENCES Members(id)
            )`);

            // TrainingSessions Table
            db.run(`CREATE TABLE IF NOT EXISTS TrainingSessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainer_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                session_date TEXT NOT NULL,
                session_time TEXT NOT NULL,
                status TEXT DEFAULT 'Scheduled',
                FOREIGN KEY (trainer_id) REFERENCES Users(id),
                FOREIGN KEY (member_id) REFERENCES Members(id)
            )`);

            // Payments Table
            db.run(`CREATE TABLE IF NOT EXISTS Payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                plan_type TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                receipt_id TEXT UNIQUE NOT NULL,
                FOREIGN KEY (member_id) REFERENCES Members(id)
            )`);

            // Notifications Table
            db.run(`CREATE TABLE IF NOT EXISTS Notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )`);

            // ActivityLogs Table
            db.run(`CREATE TABLE IF NOT EXISTS ActivityLogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_type TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )`);

            // Insert a default admin user if not exists
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const plainPassword = 'admin'; // Default password

            db.get("SELECT * FROM Users WHERE username = 'admin'", (err, row) => {
                if (!row) {
                    bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
                        if (!err) {
                            db.run("INSERT INTO Users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'Administrator']);
                            console.log('Default admin user created.');
                        }
                    });
                }
            });
        });
    }
});

module.exports = db;
