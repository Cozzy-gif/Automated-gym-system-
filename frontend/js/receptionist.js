document.addEventListener('DOMContentLoaded', () => {

    // Check Authentication
    const userStr = sessionStorage.getItem('gym_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

    // Safety check - redirect if not receptionist/admin
    if (user.role !== 'Receptionist' && user.role !== 'Administrator') {
        window.location.href = 'member_dashboard.html';
        return;
    }

    const API_URL = '/api';

    // Populate Username
    document.getElementById('userNameDisplay').textContent = user.name || user.username || 'Receptionist';

    // If Admin is viewing the Receptionist Dashboard, give them a link back
    if (user.role === 'Administrator') {
        const switchLinks = document.getElementById('switchDashboardLinks');
        if (switchLinks) {
            const adminLink = document.createElement('a');
            adminLink.href = 'dashboard.html';
            adminLink.className = 'nav-item';
            adminLink.style.cssText = 'padding: 0.5rem; font-size: 0.9rem; text-decoration: none; color: var(--text-primary); border-radius: 8px; transition: background 0.2s; margin-bottom: 0.5rem;';
            adminLink.innerHTML = '<span>📊</span> Admin View';
            switchLinks.prepend(adminLink);
        }
    }

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('gym_user');
        window.location.href = 'login.html';
    });

    // Modals Handling
    const modalOverlay = document.getElementById('modalOverlay');
    const dayPassModal = document.getElementById('dayPassModal');
    const statusModal = document.getElementById('statusModal');

    const btnDayPass = document.getElementById('btnDayPass');
    const btnMemberStatus = document.getElementById('btnMemberStatus');
    const closeBtns = document.querySelectorAll('.closeModalBtn');

    function openModal(modal) {
        modalOverlay.style.display = 'block';
        modal.style.display = 'block';
    }

    function closeAllModals() {
        modalOverlay.style.display = 'none';
        dayPassModal.style.display = 'none';
        statusModal.style.display = 'none';
    }

    btnDayPass.addEventListener('click', () => openModal(dayPassModal));
    btnMemberStatus.addEventListener('click', () => {
        document.getElementById('searchResult').style.display = 'none';
        document.getElementById('searchInput').value = '';
        openModal(statusModal);
    });

    closeBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
    modalOverlay.addEventListener('click', closeAllModals);

    // Day Pass Form Handling
    const dayPassForm = document.getElementById('dayPassForm');
    dayPassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const guestName = document.getElementById('guestName').value;
        const phone = document.getElementById('guestPhone').value;
        const amount = document.getElementById('dayPassAmount').value;

        try {
            const res = await fetch(`${API_URL}/receptionist/daypass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guest_name: guestName, phone, amount })
            });
            const data = await res.json();

            if (data.success) {
                showToast(`Day Pass issued to ${guestName}. Receipt: ${data.receipt_id}`, 'success');
                // Update local mock stats in UI
                const passesElem = document.getElementById('dayPassesSold');
                if (passesElem) passesElem.innerText = parseInt(passesElem.innerText) + 1;
                closeAllModals();
                dayPassForm.reset();
            } else {
                showToast('API Error: ' + data.message, 'error');
            }
        } catch (err) {
            showToast('Failed to connect to backend.', 'error');
        }
    });

    // Member Status Search & Database Handling
    const searchInput = document.getElementById('searchInput');
    const searchResult = document.getElementById('searchResult');
    let allMembersData = [];

    async function loadAllMembers() {
        searchResult.innerHTML = '<p>Loading members...</p>';
        try {
            const res = await fetch(`${API_URL}/members/all`);
            const data = await res.json();
            if (data.success) {
                allMembersData = data.data;
                renderMembers(allMembersData);
            } else {
                searchResult.innerHTML = '<p style="color:var(--accent-error);">Failed to load members.</p>';
            }
        } catch (err) {
            searchResult.innerHTML = '<p style="color:var(--accent-error);">Network error loading DB.</p>';
        }
    }

    function renderMembers(members) {
        if (!members || members.length === 0) {
            searchResult.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; text-align: center;">
                    <p style="color: var(--text-secondary);">No members found</p>
                </div>
            `;
            return;
        }

        let html = '';
        members.forEach(m => {
            const isActive = m.status === 'Active';
            const color = isActive ? 'var(--accent-success)' : 'var(--accent-error)';
            const bg = isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            html += `
                <div style="background: ${bg}; border: 1px solid ${color}; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="color: ${color}; margin-bottom: 0.5rem;">${m.first_name} ${m.last_name}</h4>
                        <p style="font-size: 0.9rem;"><strong>Email/Phone:</strong> ${m.email || 'N/A'} / ${m.phone || 'N/A'}</p>
                        <p style="font-size: 0.9rem;"><strong>Plan:</strong> ${m.plan_type || 'None'}</p>
                        <p style="font-size: 0.9rem;"><strong>Expires:</strong> ${m.expiry_date || 'N/A'}</p>
                        <p style="font-size: 0.9rem;"><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${m.status || 'INACTIVE'}</span></p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="openPasswordReset(${m.user_id}, '${m.first_name}')">Reset Password</button>
                        <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem; background: var(--accent-error);" onclick="deleteMember(${m.user_id})">Delete Member</button>
                    </div>
                </div>
            `;
        });
        searchResult.innerHTML = html;
        searchResult.style.display = 'block';
    }

    // Override the generic open handle for statusModal
    btnMemberStatus.replaceWith(btnMemberStatus.cloneNode(true));
    document.getElementById('btnMemberStatus').addEventListener('click', () => {
        searchInput.value = '';
        openModal(statusModal);
        loadAllMembers();
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allMembersData.filter(m =>
            (m.first_name && m.first_name.toLowerCase().includes(query)) ||
            (m.last_name && m.last_name.toLowerCase().includes(query)) ||
            (m.email && m.email.toLowerCase().includes(query)) ||
            (m.phone && m.phone.toLowerCase().includes(query))
        );
        renderMembers(filtered);
    });

    window.openPasswordReset = function (userId, firstName) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('newPasswordInput').value = '';
        document.getElementById('passwordModal').style.display = 'block';
    };

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('resetUserId').value;
        const newPassword = document.getElementById('newPasswordInput').value;

        try {
            const res = await fetch(`${API_URL}/members/password/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Password updated successfully', 'success');
                document.getElementById('passwordModal').style.display = 'none';
            } else {
                showToast(data.message || 'Update failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    });

    window.deleteMember = async (userId) => {
        if (!confirm('Are you sure you want to completely delete this member and all associated data? This action cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/members/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            showToast(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                loadAllMembers();
            }
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    function showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.className = 'toast', 3000);
    }
});
