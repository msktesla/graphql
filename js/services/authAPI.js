class AuthAPI extends BaseAPI {
    static async login(identifier, password) {
        try {
            // Check if identifier is an email
            const isEmail = identifier.includes('@');
            const credentials = btoa(`${identifier}:${password}`);
            
            const response = await fetch('https://learn.01founders.co/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const token = await response.text();
            if (!token) {
                throw new Error('No token received');
            }

            return { token };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
}

window.AuthAPI = AuthAPI;