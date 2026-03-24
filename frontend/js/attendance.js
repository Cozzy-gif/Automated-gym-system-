document.addEventListener('DOMContentLoaded', () => {

    // Check Authentication
    const userStr = sessionStorage.getItem('gym_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

    // Security: Members cannot view all attendance logs
    if (user.role === 'Member') {
        window.location.href = 'member_dashboard.html';
        return;
    }

    // Populate Username
    document.getElementById('userNameDisplay').textContent = user.username + ' (' + user.role + ')';

    // Set dynamic back button if existing
    const backBtn = document.getElementById('backToDashBtn');
    if (backBtn) {
        if (user.role === 'Administrator') {
            backBtn.href = 'dashboard.html';
        } else if (user.role === 'Receptionist') {
            backBtn.href = 'receptionist_dashboard.html';
        }
    }

    // Logout logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('gym_user');
        window.location.href = 'login.html';
    });

    const attendanceTableBody = document.getElementById('attendanceTableBody');
    const refreshBtn = document.getElementById('refreshBtn');

    // MOCK DATA for Demo Purposes
    // In a real application, you would fetch this from /api/admin/attendance
    const mockLogs = [
        { time: '10:45 AM', name: 'Clinton Kwamboka', method: 'Biometric Scanner', status: 'GRANTED' },
        { time: '10:30 AM', name: 'Jervis Wokabi', method: 'Biometric Scanner', status: 'DENIED - Expired' },
        { time: '09:15 AM', name: 'Daisy Flowers', method: 'Day Pass (Scan)', status: 'GRANTED' },
        { time: '08:00 AM', name: 'Chris Hunters', method: 'Biometric Scanner', status: 'GRANTED' },
        { time: '07:30 AM', name: 'Zack Juma', method: 'Biometric Scanner', status: 'GRANTED' }
    ];

    function renderTable() {
        attendanceTableBody.innerHTML = '';

        if (mockLogs.length === 0) {
            attendanceTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No check-ins yet today.</td></tr>`;
            return;
        }

        mockLogs.forEach(log => {
            const tr = document.createElement('tr');

            const isGranted = log.status.startsWith('GRANTED');
            const statusClass = isGranted ? 'status-granted' : 'status-denied';

            tr.innerHTML = `
                <td>${log.time}</td>
                <td style="font-weight: 500;">${log.name}</td>
                <td style="color: var(--text-secondary);">${log.method}</td>
                <td><span class="status-badge ${statusClass}">${log.status}</span></td>
            `;

            attendanceTableBody.appendChild(tr);
        });
    }

    // Initial Render
    setTimeout(renderTable, 500); // Simulate network delay

    refreshBtn.addEventListener('click', () => {
        refreshBtn.innerText = 'Refreshing...';
        refreshBtn.disabled = true;

        // Simulate adding a new log on refresh just for interaction
        setTimeout(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            mockLogs.unshift({
                time: timeStr,
                name: 'New Walk-in User',
                method: 'Manual Entry',
                status: 'GRANTED'
            });

            renderTable();

            refreshBtn.innerText = 'Refresh ↻';
            refreshBtn.disabled = false;
        }, 800);
    });
});
