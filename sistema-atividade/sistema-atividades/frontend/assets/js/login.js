document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userType', data.user.tipo);
                localStorage.setItem('userName', data.user.nome);

                const redirectUrl = data.user.tipo === 'professor' 
                    ? '/pages/professor.html' 
                    : '/pages/aluno.html';
                
                window.location.href = redirectUrl;
            } else {
                errorMessage.textContent = data.error || 'Erro ao fazer login';
                errorMessage.classList.add('show');
            }
        } catch (error) {
            console.error('Erro:', error);
            errorMessage.textContent = 'Erro ao conectar com o servidor';
            errorMessage.classList.add('show');
        }
    });
});
