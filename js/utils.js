// js/utils.js

// Create a namespace for our utility functions
const TokenUtils = {
    getToken() {
        const token = localStorage.getItem('token');
        return token ? token.trim() : null;
    },
    
    setToken(token) {
        if (!token) return false;
        // Clean the token string
        const cleanToken = token.trim().replace(/^"(.*)"$/, '$1');
        localStorage.setItem('token', cleanToken);
        return true;
    },

    removeToken() {
        console.log("Removing token");
        localStorage.removeItem('token');
        console.log("Token removed, checking:", !localStorage.getItem('token'));
    },
    
    decodeJWT(token) {
        try {
            // Clean the token before splitting
            const cleanToken = token.trim().replace(/^"(.*)"$/, '$1');
            const base64Url = cleanToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('JWT decode error:', error);
            return null;
        }
    },
    
    checkAuth() {
        const token = this.getToken();
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    isValidToken(token) {
        if (!token) {
            console.log('No token provided');
            return false;
        }
        
        try {
            const payload = this.decodeJWT(token);
            if (!payload) {
                console.log('Could not decode token');
                return false;
            }
            
            // Only check expiration
            if (!payload.exp) {
                console.log('Token has no expiration');
                return false;
            }
            
            const currentTime = Math.floor(Date.now() / 1000);
            const isValid = currentTime < payload.exp;
            console.log('Token validation:', isValid ? 'valid' : 'expired', 
                        'Current time:', currentTime, 
                        'Expiration:', payload.exp);
            return isValid;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }
};

// Make TokenUtils globally available
window.TokenUtils = TokenUtils;

// Keep other utility functions
class Utils {
    static formatXP(xp) {
        return new Intl.NumberFormat('en-US').format(xp);
    }

    static calculateLevel(xp) {
        return Math.floor(Math.log(xp / 1000 + 1) / Math.log(2)) + 1;
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    static prepareGraphData(data, type) {
        switch (type) {
            case 'xpProgress':
                return this.prepareXPProgressData(data);
            case 'skillsDistribution':
                return this.prepareSkillsData(data);
            case 'auditRatio':
                return this.prepareAuditData(data);
            default:
                return data;
        }
    }

    static createSVGElement(type, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', type);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }
}

window.Utils = Utils;
  