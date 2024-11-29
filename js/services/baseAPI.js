class BaseAPI {
    static API_URL = 'https://learn.01founders.co/api/graphql-engine/v1/graphql';
    
    static async graphqlRequest(query, variables = {}) {
        try {
            let token = AuthService.getToken();
            if (!token) {
                throw new Error('No authentication token');
            }

            token = token.trim().replace(/^"(.*)"$/, '$1');

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query,
                    variables
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                const errorMessage = data.errors[0].message;
                console.error('Full GraphQL Error:', data.errors[0]);
                
                if (errorMessage.includes('JWT') || errorMessage.includes('token')) {
                    TokenUtils.removeToken();
                    throw new Error('Authentication failed. Please try again.');
                }
                
                throw new Error(errorMessage || 'GraphQL request failed');
            }

            return data.data;
        } catch (error) {
            console.error('GraphQL Request Failed:', error);
            throw error;
        }
    }
}

window.BaseAPI = BaseAPI;