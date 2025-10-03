const API_URL = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

function setAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    window.location.href = '/pages/login.html';
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/pages/login.html';
    }
}
