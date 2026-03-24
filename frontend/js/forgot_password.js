document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');
    const toast = document.getElementById('toast');
    const API_URL = '/api';

    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.className = `toast show ${isError ? 'error' : 'success'}`;
        setTimeout(() => toast.className = 'toast', 3000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match.', true);
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Resetting...';

        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, newPassword })
            });

            const data = await res.json();

            if (data.success) {
                showToast('Password reset successfully! Redirecting...');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                showToast(data.message || 'Failed to reset password.', true);
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        } catch (error) {
            showToast('Network error checking server.', true);
            btn.disabled = false;
            btn.textContent = 'Reset Password';
        }
    });
});
