class LoginController {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.errorDiv = document.getElementById('loginError');
        
        this.init();
    }

    init() {
        // Redirect if already logged in
        if (AuthService.isAuthenticated()) {
            window.location.href = '/dashboard.html';
            return;
        }

        this.form.addEventListener('submit', this.handleLogin.bind(this));
    }

    async handleLogin(event) {
        event.preventDefault();
        this.clearError();

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        try {
            // Validate input
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            // Show loading state
            this.setLoading(true);

            // Attempt login
            await AuthService.login(email, password);

            // Redirect to profile on success
            window.location.href = '/dashboard.html';
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    clearError() {
        this.errorDiv.textContent = '';
        this.errorDiv.style.display = 'none';
    }

    setLoading(isLoading) {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Logging in...' : 'Login';
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.loginController = new LoginController();
});