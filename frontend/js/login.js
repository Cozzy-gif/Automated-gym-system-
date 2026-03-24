document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // In a real environment, this points to your Node server. 
    // For now we'll mock the check if API is unreachable.
    const API_URL = '/api';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('.btn');

        // Show loading state
        const originalText = btn.innerText;
        btn.innerText = 'Authenticating...';
        btn.disabled = true;

        // Demo Credentials Check BEFORE fetching
        if (username === 'admin' && password === 'admin') {
            showToast('logged in', 'success');
            sessionStorage.setItem('gym_user', JSON.stringify({ id: 1, username: 'admin', role: 'Administrator', name: 'Admin User' }));
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            return;
        } else if (username === 'member' && password === 'member') {
            showToast('logged in', 'success');
            sessionStorage.setItem('gym_user', JSON.stringify({ id: 2, username: 'member', role: 'Member', name: 'Demo Member' }));
            setTimeout(() => {
                window.location.href = 'member_dashboard.html';
            }, 1000);
            return;
        } else if (username === 'receptionist' && password === 'receptionist') {
            showToast('logged in', 'success');
            sessionStorage.setItem('gym_user', JSON.stringify({ id: 3, username: 'receptionist', role: 'Receptionist', name: 'Demo Receptionist' }));
            setTimeout(() => {
                window.location.href = 'receptionist_dashboard.html';
            }, 1000);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                showToast('logged in', 'success');
                // Store user data in session storage
                sessionStorage.setItem('gym_user', JSON.stringify(data.user));

                setTimeout(() => {
                    if (data.user.role === 'Member') {
                        window.location.href = 'member_dashboard.html';
                    } else if (data.user.role === 'Receptionist') {
                        window.location.href = 'receptionist_dashboard.html';
                    } else if (data.user.role === 'Gym staff') {
                        window.location.href = 'trainer_dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1000);
            } else {
                showToast(data.message || 'Invalid credentials', 'error');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Cannot connect to server.', 'error');
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    function showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
});
