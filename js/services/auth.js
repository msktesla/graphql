class AuthService {
    static instance = null;
    static API_URL = 'https://learn.01founders.co/api/auth';
    
    constructor() {
        if (AuthService.instance) {
            return AuthService.instance;
        }
        this.isInitialized = false;
        this.currentUser = null;
        AuthService.instance = this;
    }

    static async login(credentials) {
        try {
            const { email, password } = credentials;
            const { token } = await AuthAPI.login(email, password);
            
            if (!token) {
                throw new Error('No token received');
            }

            // Validate token before storing
            if (!TokenUtils.isValidToken(token)) {
                throw new Error('Invalid token received');
            }

            TokenUtils.setToken(token);
            console.log('Token stored, validating...');

            // Get user data
            const response = await BaseAPI.graphqlRequest(Queries.GET_USER_INFO);
            
            if (!response || !response.user || !response.user[0]) {
                TokenUtils.removeToken();
                throw new Error('Failed to fetch user data');
            }

            const instance = AuthService.getInstance();
            instance.currentUser = response.user[0];
            instance.isInitialized = true;

            return instance.currentUser;
        } catch (error) {
            TokenUtils.removeToken();
            throw error;
        }
    }

    async initialize() {
        if (this.isInitialized && this.currentUser) return this.currentUser;
        
        const token = TokenUtils.getToken();
        if (!token || !TokenUtils.isValidToken(token)) {
            TokenUtils.removeToken();
            throw new Error('Invalid or expired token');
        }

        try {
            const response = await BaseAPI.graphqlRequest(Queries.GET_USER_INFO);
            if (!response || !response.user || !response.user[0]) {
                throw new Error('User data not found');
            }

            this.currentUser = response.user[0];
            this.isInitialized = true;
            return this.currentUser;
        } catch (error) {
            this.isInitialized = false;
            this.currentUser = null;
            TokenUtils.removeToken();
            throw error;
        }
    }

    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    static isAuthenticated() {
        const token = TokenUtils.getToken();
        return TokenUtils.isValidToken(token);
    }

    static getToken() {
        return TokenUtils.getToken();
    }

    static logout() {
        const instance = AuthService.getInstance();
        instance.isInitialized = false;
        instance.currentUser = null;
        TokenUtils.removeToken();
        localStorage.clear();
        window.location.replace('./login.html');
    }

    static async getCurrentUser() {
        const instance = AuthService.getInstance();
        if (!instance.currentUser) {
            await instance.initialize();
        }
        return instance.currentUser;
    }
}

window.AuthService = AuthService;