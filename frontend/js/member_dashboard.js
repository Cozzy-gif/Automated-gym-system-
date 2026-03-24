document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const userJson = sessionStorage.getItem('gym_user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userJson);
    document.getElementById('userNameDisplay').textContent = user.username;
    document.getElementById('memberGreeting').textContent = user.username.split('_')[0] || user.username;

    const API_URL = '/api';

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('gym_user');
        window.location.href = 'login.html';
    });

    function showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => { toast.className = 'toast'; }, 3000);
    }

    // Role-based Navigation logic
    const navMenu = document.querySelector('.nav-menu');

    if (user.role === 'Administrator' || user.role === 'Receptionist') {
        const switchDiv = document.createElement('div');
        switchDiv.style.cssText = 'padding: 1rem 1.5rem; margin-top: auto;';
        switchDiv.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.5rem;">Switch Dashboard</p>`;

        const linksContainer = document.createElement('div');
        linksContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

        if (user.role === 'Administrator') {
            const adminLink = document.createElement('a');
            adminLink.href = 'dashboard.html';
            adminLink.className = 'nav-item';
            adminLink.style.cssText = 'padding: 0.5rem; font-size: 0.9rem; text-decoration: none; color: var(--text-primary); border-radius: 8px; transition: background 0.2s;';
            adminLink.innerHTML = '<span>📊</span> Admin View';
            linksContainer.appendChild(adminLink);
        }

        const repLink = document.createElement('a');
        repLink.href = 'receptionist_dashboard.html';
        repLink.className = 'nav-item';
        repLink.style.cssText = 'padding: 0.5rem; font-size: 0.9rem; text-decoration: none; color: var(--text-primary); border-radius: 8px; transition: background 0.2s;';
        repLink.innerHTML = '<span>🏢</span> Receptionist View';
        linksContainer.appendChild(repLink);

        switchDiv.appendChild(linksContainer);
        navMenu.parentElement.insertBefore(switchDiv, document.getElementById('logoutBtn'));
    }

    // Activity 1: View Status
    let expiryDateGlobal = null;
    let showingDaysLeft = false;

    async function loadStatus() {
        try {
            const res = await fetch(`${API_URL}/member/status/${user.id}`);
            const data = await res.json();
            const statusEl = document.getElementById('memStatus');
            const expiryEl = document.getElementById('memExpiry');

            if (data.success) {
                const credDisplay = document.getElementById('memberCredentialsDisplay');
                if (credDisplay) credDisplay.style.display = 'flex';

                const displayMemberId = document.getElementById('displayMemberId');
                if (displayMemberId) displayMemberId.textContent = data.member_id || 'N/A';

                const displayBiometricId = document.getElementById('displayBiometricId');
                if (displayBiometricId) displayBiometricId.textContent = data.biometric_id || 'Not Assigned';
            }

            if (data.status === 'Active') {
                statusEl.textContent = data.plan_type + ' Plan';
                statusEl.style.color = 'var(--accent-success)';
                expiryEl.textContent = `Valid until ${data.expiry_date}`;
                expiryDateGlobal = new Date(data.expiry_date);
            } else {
                statusEl.textContent = 'Inactive';
                statusEl.style.color = 'var(--text-secondary)';
                expiryEl.textContent = 'Please renew your plan';
                expiryDateGlobal = new Date(); // expired
                expiryDateGlobal.setDate(expiryDateGlobal.getDate() - 1);

                const payLink = document.getElementById('renewBtn');
                if (payLink) payLink.style.display = 'inline-block';
            }
        } catch (e) {
            document.getElementById('memStatus').textContent = 'Monthly Plan';
            const demoDate = new Date();
            demoDate.setDate(demoDate.getDate() - 1);
            expiryDateGlobal = demoDate;
            document.getElementById('memExpiry').textContent = `Expired`;
            document.getElementById('memStatus').textContent = 'Inactive';
            document.getElementById('memStatus').style.color = 'var(--text-secondary)';
            const payLink = document.getElementById('renewBtn');
            if (payLink) payLink.style.display = 'inline-block';
        }
    }

    const memStatusCard = document.getElementById('memStatusCard');
    const memExpiry = document.getElementById('memExpiry');
    const memDaysLeft = document.getElementById('memDaysLeft');

    if (memStatusCard) {
        memStatusCard.addEventListener('click', () => {
            if (!expiryDateGlobal) return;
            showingDaysLeft = !showingDaysLeft;
            if (showingDaysLeft) {
                const today = new Date();
                const diffTime = expiryDateGlobal - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                memExpiry.style.display = 'none';
                memDaysLeft.style.display = 'block';
                memDaysLeft.textContent = diffDays > 0 ? `${diffDays} days remaining` : 'Expired';
            } else {
                memExpiry.style.display = 'block';
                memDaysLeft.style.display = 'none';
            }
        });
    }

    // Activity 2: Daily Workout
    let workoutDayGlobal = null;

    async function loadWorkout() {
        try {
            const res = await fetch(`${API_URL}/member/workout/${user.id}`);
            const data = await res.json();
            document.getElementById('workoutDay').textContent = data.day;
            document.getElementById('workoutRoutine').textContent = data.routine;
            workoutDayGlobal = data.day;
        } catch (e) {
            document.getElementById('workoutDay').textContent = 'Workout Day';
            document.getElementById('workoutRoutine').textContent = 'Warmup 10m -> Weights 40m -> Stretching 10m';
            workoutDayGlobal = 'Workout Day';
        }
    }

    // Activity 3: Payment History
    async function loadPayments() {
        try {
            const res = await fetch(`${API_URL}/member/payments/${user.id}`);
            const data = await res.json();
            const list = document.getElementById('paymentList');
            list.innerHTML = '';
            if (data.payments && data.payments.length > 0) {
                data.payments.forEach(p => {
                    list.innerHTML += `
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <strong>ksh ${p.amount}</strong>
                                <span style="color: var(--accent-success); font-size: 0.85rem;">Paid #${p.receipt_id}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.85rem;">
                                <span>${p.plan_type}</span>
                                <span>${p.payment_date}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                list.innerHTML = '<p>No payment history found.</p>';
            }
        } catch (e) {
            document.getElementById('paymentList').innerHTML = '<p>No recent payments found.</p>';
        }
    }

    // Load Training Sessions
    async function loadSessions() {
        try {
            const res = await fetch(`${API_URL}/member/sessions/${user.id}`);
            const data = await res.json();
            const list = document.getElementById('sessionsList');
            list.innerHTML = '';

            if (data.success && data.data && data.data.length > 0) {
                data.data.forEach(s => {
                    const statusColor = s.status === 'Scheduled' ? 'var(--primary-color)' :
                        s.status === 'Completed' ? 'var(--accent-success)' : 'var(--accent-error)';
                    list.innerHTML += `
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <strong>${s.trainer_name}</strong>
                                <span style="color: ${statusColor}; font-size: 0.85rem; font-weight: bold;">${s.status}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.85rem;">
                                <span>${s.session_date}</span>
                                <span>${s.session_time}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                list.innerHTML = '<p>No booked training sessions.</p>';
            }
        } catch (e) {
            document.getElementById('sessionsList').innerHTML = '<p>Failed to load sessions.</p>';
        }
    }

    // Initialize all independent dashboard components
    loadWorkout();
    loadPayments();
    loadSessions();

    // Activity 4: Check-In
    document.getElementById('checkInCard').addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_URL}/member/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
            } else {
                showToast(data.message, 'error');
            }
        } catch (e) {
            showToast('Service unavailable', 'error');
        }
    });

    // Activity 5: Book Personal Trainer
    const bookingModal = document.getElementById('bookingModal');
    const bookingOverlay = document.getElementById('bookingModalOverlay');

    async function populateTrainers() {
        try {
            const res = await fetch(`${API_URL}/admin/users`);
            const data = await res.json();
            if (data.success) {
                const select = document.getElementById('trainerSelect');
                select.innerHTML = ''; // clear old options
                const trainers = data.data.filter(u => u.role === 'Gym staff');
                if (trainers.length === 0) {
                    select.innerHTML = '<option value="">No trainers available</option>';
                } else {
                    trainers.forEach(t => {
                        select.innerHTML += `<option value="${t.id}">${t.username} (Trainer)</option>`;
                    });
                }
            }
        } catch (e) {
            console.log('Using default trainers');
            document.getElementById('trainerSelect').innerHTML = `
                <option value="1">Coach Alex (Strength)</option>
                <option value="2">Coach Sarah (Cardio/HIIT)</option>
            `;
        }
    }

    document.getElementById('bookPTCard').addEventListener('click', () => {
        populateTrainers(); // load dynamically
        bookingModal.style.display = 'block';
        bookingOverlay.style.display = 'block';
    });

    document.getElementById('cancelBookingBtn').addEventListener('click', () => {
        bookingModal.style.display = 'none';
        bookingOverlay.style.display = 'none';
    });

    // Availability check
    async function checkAvailability() {
        const trainerId = document.getElementById('trainerSelect').value;
        const date = document.getElementById('bookingDate').value;
        const warningEl = document.getElementById('availabilityWarning');
        const confirmBtn = document.getElementById('confirmBookingBtn');

        if (!trainerId || !date) {
            warningEl.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`${API_URL}/member/trainer-availability/${trainerId}/${date}`);
            const data = await res.json();

            if (data.success && data.booked_times.length > 0) {
                // Determine if they picked a taken time
                const selectedTime = document.getElementById('bookingTime').value;
                warningEl.innerHTML = `⚠️ Trainer has booked sessions at: ${data.booked_times.join(', ')}`;
                warningEl.style.display = 'block';

                if (selectedTime && data.booked_times.includes(selectedTime)) {
                    confirmBtn.disabled = true;
                    warningEl.innerHTML += `<br/><br/><b>The time you selected is already booked!</b>`;
                } else {
                    confirmBtn.disabled = false;
                }
            } else {
                warningEl.style.display = 'none';
                confirmBtn.disabled = false;
            }
        } catch (e) {
            warningEl.style.display = 'none';
        }
    }

    document.getElementById('trainerSelect').addEventListener('change', checkAvailability);
    document.getElementById('bookingDate').addEventListener('change', checkAvailability);
    document.getElementById('bookingTime').addEventListener('change', checkAvailability);

    document.getElementById('confirmBookingBtn').addEventListener('click', async () => {
        const trainerId = document.getElementById('trainerSelect').value;
        const date = document.getElementById('bookingDate').value;
        const time = document.getElementById('bookingTime').value;

        if (!trainerId || !date || !time) {
            showToast('Please select a trainer, date, and time', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/member/book-trainer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, trainer_id: trainerId, date, time })
            });
            const data = await res.json();
            showToast(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                loadSessions(); // Reload sessions after booking
            }
        } catch (e) {
            showToast(`Server error booking session.`, 'error');
        }

        bookingModal.style.display = 'none';
        bookingOverlay.style.display = 'none';
    });

    // Profile Modal Logic
    const profileModal = document.getElementById('profileModal');
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');

    profileDropdownBtn.addEventListener('click', () => {
        profileModal.style.display = 'block';
        bookingOverlay.style.display = 'block';
    });

    document.getElementById('cancelProfileBtn').addEventListener('click', () => {
        profileModal.style.display = 'none';
        bookingOverlay.style.display = 'none';
    });

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fName = document.getElementById('profileFirstName').value;
        const lName = document.getElementById('profileLastName').value;
        const phone = document.getElementById('profilePhone').value;

        try {
            const res = await fetch(`${API_URL}/member/profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: fName, last_name: lName, phone })
            });
            const data = await res.json();
            showToast(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                profileModal.style.display = 'none';
                bookingOverlay.style.display = 'none';
            }
        } catch (e) {
            showToast('Failed to update profile', 'error');
        }
    });

    // Password Modal Logic
    const passwordModal = document.getElementById('passwordModal');

    document.getElementById('changePasswordCard').addEventListener('click', () => {
        passwordModal.style.display = 'block';
        bookingOverlay.style.display = 'block';
        document.getElementById('newPasswordInput').value = '';
    });

    document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
        passwordModal.style.display = 'none';
        bookingOverlay.style.display = 'none';
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPasswordInput').value;

        try {
            const res = await fetch(`${API_URL}/members/password/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            showToast(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                passwordModal.style.display = 'none';
                bookingOverlay.style.display = 'none';
            }
        } catch (e) {
            showToast('Failed to update password', 'error');
        }
    });

    // Notifications Logic
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationBadge');

    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notificationDropdown.style.display === 'flex';
            notificationDropdown.style.display = isVisible ? 'none' : 'flex';
        });

        document.addEventListener('click', (e) => {
            if (notificationDropdown && !notificationBell.contains(e.target)) {
                notificationDropdown.style.display = 'none';
            }
        });
    }

    async function generateNotifications() {
        let notifications = [];

        // 1. Fetch DB notifications
        try {
            const res = await fetch(`${API_URL}/member/notifications/${user.id}`);
            const data = await res.json();
            if (data.success && data.data) {
                notifications = data.data.map(n => ({
                    type: 'info',
                    message: n.message,
                    time: new Date(n.created_at).toLocaleDateString()
                }));
            }
        } catch (e) { console.log('DB Notifications unreachable'); }

        // 2. Local Workout Notification
        if (workoutDayGlobal && workoutDayGlobal !== 'Rest Day') {
            notifications.unshift({ // Add to top
                type: 'info',
                message: `Time to train! 💪 Don't forget your ${workoutDayGlobal} workout today.`,
                time: 'Just now'
            });
        }

        // 3. Expiry Notification
        if (expiryDateGlobal) {
            const today = new Date();
            const diffTime = expiryDateGlobal - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 7 && diffDays > 0) {
                notifications.unshift({
                    type: 'warning',
                    message: `⚠️ Your membership expires in ${diffDays} days! Please renew soon.`,
                    time: 'Today'
                });
            } else if (diffDays <= 0) {
                notifications.unshift({
                    type: 'danger',
                    message: `🚨 Your membership has expired! <a href="payment.html" style="color: white; text-decoration: underline;">Click here to renew</a>.`,
                    time: 'Today'
                });
            }
        }

        // 4. Render
        if (notifications.length > 0) {
            if (notificationBadge) {
                notificationBadge.style.display = 'flex';
                notificationBadge.textContent = notifications.length;
            }

            if (notificationList) {
                notificationList.innerHTML = notifications.map(n => `
                    <div style="background: rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 6px; font-size: 0.9rem; border-left: 3px solid ${n.type === 'info' ? 'var(--primary-color)' : n.type === 'warning' ? '#F59E0B' : '#EF4444'};">
                        <p style="margin-bottom: 0.25rem;">${n.message}</p>
                        <small style="color: var(--text-secondary); font-size: 0.75rem;">${n.time}</small>
                    </div>
                `).join('');
            }
        } else {
            if (notificationBadge) notificationBadge.style.display = 'none';
            if (notificationList) notificationList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem; text-align: center;">No new notifications.</p>';
        }
    }

    // Initial load calls
    Promise.all([
        loadStatus(),
        loadWorkout(),
        loadPayments()
    ]).then(() => {
        generateNotifications();
    });
});
