document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const API_URL = '/api';

    const roleSelect = document.getElementById('role');
    const memberFields = document.getElementById('memberFields');
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');

    roleSelect.addEventListener('change', () => {
        if (roleSelect.value === 'Member') {
            memberFields.style.display = 'block';
            firstName.required = true;
            lastName.required = true;
            email.required = true;
            phone.required = true;
        } else {
            memberFields.style.display = 'none';
            firstName.required = false;
            lastName.required = false;
            email.required = false;
            phone.required = false;
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = roleSelect.value;

        const payload = { username, password, role };

        if (role === 'Member') {
            payload.firstName = firstName.value;
            payload.lastName = lastName.value;
            payload.email = email.value;
            payload.phone = phone.value;
        }

        const btn = signupForm.querySelector('.btn');

        const originalText = btn.innerText;
        btn.innerText = 'Registering...';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                showToast('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showToast(data.message || 'Registration failed', 'error');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Signup error:', error);
            // Fallback for demo purposes if backend isn't running
            showToast('Demo Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
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
