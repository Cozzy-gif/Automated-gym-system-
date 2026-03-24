const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

const authController = require('./controllers/authController');
const memberController = require('./controllers/memberController');
const adminController = require('./controllers/adminController');
const trainerController = require('./controllers/trainerController');
const receptionistController = require('./controllers/receptionistController');
const checkInLogic = require('./services/checkInLogic');
const paymentService = require('./services/paymentService');

// Main Route (Redirect to frontend login)
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// API Routes
app.post('/api/login', authController.login);
app.post('/api/signup', authController.signup);
app.post('/api/forgot-password', authController.forgotPassword);

// Member Routes
app.get('/api/member/status/:user_id', memberController.getStatus);
app.get('/api/member/workout/:user_id', memberController.getWorkout);
app.post('/api/member/checkin', memberController.logAttendance);
app.get('/api/member/payments/:user_id', memberController.getPayments);
app.post('/api/member/book-trainer', memberController.bookTrainer);
app.get('/api/member/notifications/:user_id', memberController.getNotifications);
app.put('/api/member/profile/:user_id', memberController.updateProfile);

app.get('/api/members/all', memberController.getAllMembersDetails);
app.put('/api/members/password/:user_id', memberController.updatePassword);
app.delete('/api/members/:user_id', memberController.deleteMember);
app.get('/api/member/sessions/:user_id', memberController.getMemberSessions);
app.get('/api/member/trainer-availability/:trainer_id/:date', memberController.getTrainerAvailability);

app.post('/api/checkin', (req, res) => {
    const { biometric_id } = req.body;
    checkInLogic.handleCheckIn(biometric_id, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// Admin Routes
app.get('/api/admin/users', adminController.getAllUsers);
app.post('/api/admin/users', adminController.createUser);
app.put('/api/admin/users/:id', adminController.updateUser);
app.delete('/api/admin/users/:id', adminController.deleteUser);
app.get('/api/admin/equipment', adminController.getEquipment);
app.post('/api/admin/equipment', adminController.addEquipment);
app.put('/api/admin/equipment/:id', adminController.updateEquipment);
app.delete('/api/admin/equipment/:id', adminController.deleteEquipment);
app.get('/api/admin/stats', adminController.getDashboardStats);
app.get('/api/admin/activities', adminController.getRecentActivities);

// Trainer Routes
app.get('/api/trainer/members', trainerController.getMembers);
app.get('/api/trainer/workout/:user_id', trainerController.getMemberWorkout);
app.post('/api/trainer/workout', trainerController.updateWorkout);
app.get('/api/trainer/attendance/:member_id', trainerController.getAttendance);
app.get('/api/trainer/sessions/:trainer_id', trainerController.getSessions);
app.put('/api/trainer/session/:session_id', trainerController.updateSessionStatus);

// Receptionist Routes
app.get('/api/receptionist/search', receptionistController.searchMember);
app.post('/api/receptionist/daypass', receptionistController.issueDayPass);
app.post('/api/receptionist/members/register', receptionistController.registerMember);

app.post('/api/payment', (req, res) => {
    const { member_id, plan_type, amount } = req.body;
    paymentService.processPayment(member_id, plan_type, amount, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
