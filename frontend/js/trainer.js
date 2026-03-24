document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const userStr = sessionStorage.getItem('gym_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

    if (user.role !== 'Gym staff') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userNameDisplay').textContent = user.username + ' (Trainer)';

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('gym_user');
        window.location.href = 'login.html';
    });

    // Tab Switching
    const tabs = {
        members: { btn: document.getElementById('membersTab'), section: document.getElementById('membersSection'), title: 'Member Management' },
        sessions: { btn: document.getElementById('sessionsTab'), section: document.getElementById('sessionsSection'), title: 'My Sessions' }
    };

    function switchTab(tabId) {
        Object.values(tabs).forEach(t => {
            t.btn.classList.remove('active');
            t.section.style.display = 'none';
        });
        tabs[tabId].btn.classList.add('active');
        tabs[tabId].section.style.display = 'block';
        document.getElementById('pageTitle').textContent = tabs[tabId].title;

        if (tabId === 'members') loadMembers();
        if (tabId === 'sessions') loadSessions();
    }

    Object.keys(tabs).forEach(key => {
        tabs[key].btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(key);
        });
    });

    // --- Api calls ---
    async function loadMembers() {
        try {
            const res = await fetch('/api/trainer/members');
            const data = await res.json();
            const tbody = document.getElementById('membersTableBody');
            tbody.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(m => {
                    let statusColor = m.status === 'Active' ? 'var(--accent-success)' : 'var(--text-secondary)';
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem 0;">${m.first_name} ${m.last_name}</td>
                            <td style="padding: 1rem 0;">${m.plan_type || 'None'}</td>
                            <td style="padding: 1rem 0;"><span style="color: ${statusColor}; font-weight: bold;">${m.status || 'Inactive'}</span></td>
                            <td style="padding: 1rem 0;">
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="assignWorkout(${m.id}, '${m.first_name} ${m.last_name}')">Workout</button>
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--surface-hover);" onclick="viewAttendance(${m.id}, '${m.first_name} ${m.last_name}')">Attendance</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4">No members found.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load members', error);
        }
    }

    async function loadSessions() {
        try {
            const res = await fetch(`/api/trainer/sessions/${user.id}`);
            const data = await res.json();
            const listDiv = document.getElementById('sessionsList');
            listDiv.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(s => {
                    listDiv.innerHTML += `
                        <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-left: 3px solid ${s.status === 'Completed' ? 'var(--accent-success)' : 'var(--primary-color)'}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>Session with ${s.first_name} ${s.last_name}</strong>
                                <br/>
                                <small style="color: var(--text-secondary);">${s.session_date} at ${s.session_time}</small>
                            </div>
                            <div>
                                <span style="font-size: 0.85rem; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.1); margin-right: 10px;">${s.status}</span>
                                ${s.status === 'Scheduled' ? `<button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--accent-success);" onclick="completeSession(${s.id})">Mark Complete</button>` : ''}
                            </div>
                        </div>
                    `;
                });
            } else {
                listDiv.innerHTML = '<p>No upcoming sessions.</p>';
            }
        } catch (error) {
            console.error('Failed to load sessions', error);
        }
    }

    window.completeSession = async (sessionId) => {
        if (!confirm('Mark session as complete?')) return;
        try {
            const res = await fetch(`/api/trainer/session/${sessionId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Completed' })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Session completed!');
                loadSessions();
            }
        } catch (err) {
            showToast('Update failed', true);
        }
    };

    // --- Modal Handling ---
    const workoutModal = document.getElementById('workoutModal');
    const attendanceModal = document.getElementById('attendanceModal');
    const overlay = document.getElementById('modalOverlay');

    function closeAllModals() {
        workoutModal.style.display = 'none';
        attendanceModal.style.display = 'none';
        overlay.style.display = 'none';
    }

    document.querySelectorAll('.closeModalBtn').forEach(btn => btn.addEventListener('click', closeAllModals));
    overlay.addEventListener('click', closeAllModals);

    // Assign Workout Flow
    window.assignWorkout = async (userId, memberName) => {
        document.getElementById('workoutUserIdInput').value = userId;
        document.getElementById('workoutMemberName').textContent = `Member: ${memberName}`;
        document.getElementById('workoutForm').reset();

        // Fetch current workout for the selected day (default Monday) if we wanted to pre-fill it.
        // For simplicity, we just leave it blank to let trainer assign new or overwrite.

        workoutModal.style.display = 'block';
        overlay.style.display = 'block';
    };

    document.getElementById('workoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('workoutUserIdInput').value;
        const day = document.getElementById('workoutDayInput').value;
        const routine = document.getElementById('workoutRoutineInput').value;

        try {
            const res = await fetch('/api/trainer/workout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, day_of_week: day, routine_details: routine })
            });
            const data = await res.json();
            if (data.success) {
                closeAllModals();
                showToast('Workout assigned successfully');
            } else {
                showToast(data.message, true);
            }
        } catch (err) {
            showToast('Error saving workout', true);
        }
    });

    // View Attendance Flow
    window.viewAttendance = async (memberId, memberName) => {
        document.getElementById('attendanceMemberName').textContent = `Member: ${memberName}`;
        const attList = document.getElementById('attendanceList');
        attList.innerHTML = 'Loading...';

        attendanceModal.style.display = 'block';
        overlay.style.display = 'block';

        try {
            const res = await fetch(`/api/trainer/attendance/${memberId}`);
            const data = await res.json();

            attList.innerHTML = '';
            if (data.success && data.data.length > 0) {
                data.data.forEach(a => {
                    attList.innerHTML += `
                        <div style="padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.9rem;">
                            <strong>${a.date}</strong> at ${a.check_in_time}
                        </div>
                    `;
                });
            } else {
                attList.innerHTML = '<p>No check-in history found.</p>';
            }
        } catch (err) {
            attList.innerHTML = '<p style="color:red;">Failed to load attendance.</p>';
        }
    };

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.background = isError ? "var(--accent-error)" : "var(--accent-success)";
        toast.style.color = "white";
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    // Init
    loadMembers();
});
