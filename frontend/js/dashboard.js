document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const userStr = sessionStorage.getItem('gym_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

    // Admin Security Enforcement
    if (user.role !== 'Administrator') {
        if (user.role === 'Receptionist') window.location.href = 'receptionist_dashboard.html';
        else if (user.role === 'Gym staff') window.location.href = 'trainer_dashboard.html';
        else window.location.href = 'member_dashboard.html';
        return;
    }

    document.getElementById('userNameDisplay').textContent = user.username + ' (' + user.role + ')';

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('gym_user');
        window.location.href = 'login.html';
    });

    // Tab Switching Logic
    const tabs = {
        overview: { btn: document.getElementById('overviewTab'), section: document.getElementById('overviewSection'), title: 'Overview Dashboard' },
        users: { btn: document.getElementById('usersTab'), section: document.getElementById('usersSection'), title: 'User & Roles Management' },
        equipment: { btn: document.getElementById('equipmentTab'), section: document.getElementById('equipmentSection'), title: 'Equipment Management' },
        members: { btn: document.getElementById('membersTab'), section: document.getElementById('membersSection'), title: 'Gym Members Database' }
    };

    function switchTab(tabId) {
        Object.values(tabs).forEach(t => {
            t.btn.classList.remove('active');
            t.section.style.display = 'none';
        });
        tabs[tabId].btn.classList.add('active');
        tabs[tabId].section.style.display = 'block';
        document.getElementById('pageTitle').textContent = tabs[tabId].title;

        if (tabId === 'overview') loadStats();
        if (tabId === 'users') loadUsers();
        if (tabId === 'equipment') loadEquipment();
        if (tabId === 'members') loadMembers();
    }

    Object.keys(tabs).forEach(key => {
        tabs[key].btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(key);
        });
    });

    // --- Loading Data Functions ---
    async function loadStats() {
        // Default loading/error state values
        document.getElementById('statTotalMembers').textContent = '...';
        document.getElementById('statActivePlans').textContent = '...';
        document.getElementById('statTotalRevenue').textContent = 'ksh ...';
        document.getElementById('statMonthlyRevenue').textContent = 'ksh ...';

        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();

            if (data.success && data.data) {
                document.getElementById('statTotalMembers').textContent = data.data.totalMembers || 0;
                document.getElementById('statActivePlans').textContent = data.data.activePlans || 0;
                document.getElementById('statTotalRevenue').textContent = `ksh ${data.data.totalRevenue || 0}`;
                document.getElementById('statMonthlyRevenue').textContent = `ksh ${data.data.monthlyRevenue || 0}`;
            }
        } catch (error) {
            console.error('Failed to load stats', error);
        }

        loadActivities();
    }

    async function loadActivities() {
        try {
            const res = await fetch('/api/admin/activities');
            const data = await res.json();
            const logContainer = document.getElementById('activityLog');
            logContainer.innerHTML = '';

            if (data.success && data.data && data.data.length > 0) {
                data.data.forEach(activity => {
                    const dateObj = new Date(activity.timestamp);
                    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateString = dateObj.toLocaleDateString();

                    let icon = '📝';
                    if (activity.activity_type === 'USER') icon = '👤';
                    else if (activity.activity_type === 'EQUIPMENT') icon = '🏋️';
                    else if (activity.activity_type === 'SYSTEM') icon = '⚙️';
                    else if (activity.activity_type === 'ATTENDANCE') icon = '✅';
                    else if (activity.activity_type === 'PAYMENT') icon = '💳';

                    logContainer.innerHTML += `
                        <div style="display: flex; gap: 1rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 1.5rem; filter: grayscale(0.2);">${icon}</div>
                            <div style="flex: 1;">
                                <p style="margin-bottom: 0.2rem; font-weight: 500;">${activity.description}</p>
                                <small style="color: var(--text-secondary);">${dateString} at ${timeString}</small>
                            </div>
                        </div>
                    `;
                });
            } else {
                logContainer.innerHTML = '<p style="color: var(--text-secondary);">No recent activities found.</p>';
            }
        } catch (error) {
            console.error('Failed to load activities', error);
            document.getElementById('activityLog').innerHTML = '<p style="color: var(--accent-error);">Failed to load activity log.</p>';
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(u => {
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem 0;">${u.id}</td>
                            <td style="padding: 1rem 0;">${u.username}</td>
                            <td style="padding: 1rem 0;"><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${u.role}</span></td>
                            <td style="padding: 1rem 0;">
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="editUser(${u.id}, '${u.username}', '${u.role}')">Edit</button>
                                ${u.id !== user.id ? `<button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--accent-error);" onclick="deleteUser(${u.id})">Delete</button>` : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load users', error);
        }
    }

    async function loadEquipment() {
        try {
            const res = await fetch('/api/admin/equipment');
            const data = await res.json();
            const tbody = document.getElementById('equipmentTableBody');
            tbody.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(e => {
                    let statusColor = e.status === 'Operational' ? 'var(--accent-success)' : (e.status === 'Under Maintenance' ? '#F59E0B' : 'var(--accent-error)');
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem 0;">${e.id}</td>
                            <td style="padding: 1rem 0;">${e.name}</td>
                            <td style="padding: 1rem 0;">${e.body_part || 'Full Body'}</td>
                            <td style="padding: 1rem 0;">${e.condition}</td>
                            <td style="padding: 1rem 0;"><span style="color: ${statusColor}; font-weight: bold;">${e.status}</span></td>
                            <td style="padding: 1rem 0;">${e.maintenance_date || 'N/A'}</td>
                            <td style="padding: 1rem 0;">
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="editEquipment(${e.id}, '${e.name}', '${e.condition}', '${e.status}', '${e.maintenance_date}', '${e.body_part || 'Full Body'}')">Edit</button>
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--accent-error);" onclick="deleteEquipment(${e.id})">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6">No equipment found.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load equipment', error);
        }
    }

    async function loadMembers() {
        try {
            const res = await fetch('/api/members/all');
            const data = await res.json();
            const tbody = document.getElementById('membersTableBody');
            tbody.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(m => {
                    const statusColor = m.status === 'Active' ? 'var(--accent-success)' : 'var(--text-secondary)';
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem 0;">${m.member_profile_id}</td>
                            <td style="padding: 1rem 0;">${m.first_name} ${m.last_name}</td>
                            <td style="padding: 1rem 0;">${m.email || m.phone}</td>
                            <td style="padding: 1rem 0;">${m.plan_type}</td>
                            <td style="padding: 1rem 0; color: ${statusColor}; font-weight: bold;">${m.status}</td>
                            <td style="padding: 1rem 0; display: flex; gap: 0.5rem; align-items: center;">
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="openMemberPasswordReset(${m.user_id})">Reset Password</button>
                                <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--accent-error);" onclick="deleteMember(${m.user_id})">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6">No members found in system.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load members', error);
        }
    }

    // --- Modal Handling ---
    const userModal = document.getElementById('userModal');
    const equipmentModal = document.getElementById('equipmentModal');
    const passwordModal = document.getElementById('passwordModal');
    const overlay = document.getElementById('modalOverlay');

    function closeAllModals() {
        userModal.style.display = 'none';
        equipmentModal.style.display = 'none';
        passwordModal.style.display = 'none';
        document.getElementById('checkInModal').style.display = 'none';
        overlay.style.display = 'none';
    }

    document.querySelectorAll('.closeModalBtn').forEach(btn => btn.addEventListener('click', closeAllModals));
    overlay.addEventListener('click', closeAllModals);

    // Add User Flow
    document.getElementById('btnAddUser').addEventListener('click', () => {
        document.getElementById('userForm').reset();
        document.getElementById('userIdInput').value = '';
        document.getElementById('userModalTitle').textContent = 'Add User';
        userModal.style.display = 'block';
        overlay.style.display = 'block';
    });

    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('userIdInput').value;
        const username = document.getElementById('usernameInput').value;
        const role = document.getElementById('roleInput').value;
        const password = document.getElementById('passwordInput').value;

        const url = id ? `/api/admin/users/${id}` : '/api/admin/users';
        const method = id ? 'PUT' : 'POST';

        const payload = { username, role };
        if (password) payload.password = password;

        try {
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                closeAllModals();
                loadUsers();
                showToast(data.message);
            } else {
                showToast(data.message, true);
            }
        } catch (err) {
            showToast('An error occurred', true);
        }
    });

    window.editUser = (id, username, role) => {
        document.getElementById('userForm').reset();
        document.getElementById('userIdInput').value = id;
        document.getElementById('usernameInput').value = username;
        document.getElementById('roleInput').value = role;
        document.getElementById('passwordInput').value = '';
        document.getElementById('userModalTitle').textContent = 'Edit User';
        userModal.style.display = 'block';
        overlay.style.display = 'block';
    };

    window.deleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadUsers();
                showToast(data.message);
            }
        } catch (err) {
            showToast('Delete failed', true);
        }
    };

    // Add Equipment Flow
    document.getElementById('btnAddEquipment').addEventListener('click', () => {
        document.getElementById('equipmentForm').reset();
        document.getElementById('equipIdInput').value = '';
        document.getElementById('equipmentModalTitle').textContent = 'Add Equipment';
        equipmentModal.style.display = 'block';
        overlay.style.display = 'block';
    });

    document.getElementById('equipmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('equipIdInput').value;
        const name = document.getElementById('equipNameInput').value;
        const condition = document.getElementById('equipConditionInput').value;
        const status = document.getElementById('equipStatusInput').value;
        const date = document.getElementById('equipDateInput').value;
        const body_part = document.getElementById('equipBodyPartInput').value;

        const url = id ? `/api/admin/equipment/${id}` : '/api/admin/equipment';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, condition, status, maintenance_date: date, body_part })
            });
            const data = await res.json();
            if (data.success) {
                closeAllModals();
                loadEquipment();
                showToast(data.message);
            } else {
                showToast(data.message, true);
            }
        } catch (err) {
            showToast('An error occurred', true);
        }
    });

    window.editEquipment = (id, name, condition, status, date, body_part) => {
        document.getElementById('equipmentForm').reset();
        document.getElementById('equipIdInput').value = id;
        document.getElementById('equipNameInput').value = name;
        document.getElementById('equipConditionInput').value = condition;
        document.getElementById('equipStatusInput').value = status;
        document.getElementById('equipDateInput').value = date;
        document.getElementById('equipBodyPartInput').value = body_part || 'Full Body';
        document.getElementById('equipmentModalTitle').textContent = 'Edit Equipment';
        equipmentModal.style.display = 'block';
        overlay.style.display = 'block';
    };

    window.deleteEquipment = async (id) => {
        if (!confirm('Are you sure you want to delete this equipment?')) return;
        try {
            const res = await fetch(`/api/admin/equipment/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadEquipment();
                showToast(data.message);
            }
        } catch (err) {
            showToast('Delete failed', true);
        }
    };

    // Member Password Reset Flow
    window.openMemberPasswordReset = (userId) => {
        document.getElementById('passwordForm').reset();
        document.getElementById('resetUserId').value = userId;
        passwordModal.style.display = 'block';
        overlay.style.display = 'block';
    };

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('resetUserId').value;
        const newPassword = document.getElementById('newPasswordInput').value;

        try {
            const res = await fetch(`/api/members/password/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            if (data.success) {
                closeAllModals();
                showToast(data.message);
            } else {
                showToast(data.message, true);
            }
        } catch (err) {
            showToast('Update failed', true);
        }
    });

    window.deleteMember = async (userId) => {
        if (!confirm('Are you sure you want to completely delete this member and all associated data? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/members/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            showToast(data.message, !data.success);
            if (data.success) {
                loadMembers();
            }
        } catch (err) {
            showToast('Delete failed', true);
        }
    };

    // Toast Notification logic
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return; // In case toast isn't in DOM
        toast.textContent = message;
        toast.style.background = isError ? "var(--accent-error)" : "var(--accent-success)";
        toast.style.color = "white";
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    // Biometric Simulation Flow Handling (from previous layout)
    document.getElementById('simulateCheckIn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('checkInModal').style.display = 'block';
        overlay.style.display = 'block';
        document.getElementById('scanResult').style.display = 'none';
        document.getElementById('bioIdInput').value = '';
    });

    document.getElementById('scanBtn').addEventListener('click', async () => {
        const bId = document.getElementById('bioIdInput').value;
        if (!bId) return;
        const scanBtn = document.getElementById('scanBtn');
        scanBtn.innerText = 'Scanning...';
        scanBtn.disabled = true;

        try {
            const response = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ biometric_id: bId })
            });
            const data = await response.json();
            const resultDiv = document.getElementById('scanResult');
            resultDiv.style.display = 'block';
            if (data.success) {
                resultDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                resultDiv.style.color = 'var(--accent-success)';
                resultDiv.innerHTML = `${data.message} <br/><small>Door Lock: ${data.doorRelay}</small>`;
            } else {
                resultDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                resultDiv.style.color = 'var(--accent-error)';
                resultDiv.innerHTML = `${data.message} <br/><small>Door Lock: ${data.doorRelay}</small>`;
            }
        } catch (error) {
            console.log(error);
        }
        scanBtn.innerText = 'Scan';
        scanBtn.disabled = false;
    });

    // Initialize Active Tab Data
    loadStats();
});
