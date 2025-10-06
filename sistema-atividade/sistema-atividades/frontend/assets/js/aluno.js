const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    loadActivities();
    setupFilters();
    setupModal();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token || userType !== 'aluno') {
        window.location.href = '/pages/login.html';
    }
}

function loadUserInfo() {
    const userName = localStorage.getItem('userName');
    document.getElementById('userName').textContent = userName || 'Aluno';
}

async function loadActivities() {
    try {
        const response = await fetch(`${API_URL}/activities`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const activities = await response.json();
        displayActivities(activities);
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    }
}

function displayActivities(activities) {
    const grid = document.getElementById('activitiesList');
    
    if (activities.length === 0) {
        grid.innerHTML = '<p>Nenhuma atividade disponível no momento.</p>';
        return;
    }

    grid.innerHTML = activities.map(activity => {
        const now = new Date();
        const dataInicio = new Date(activity.data_inicio);
        const dataFim = new Date(activity.data_fim);

        let status, statusClass, statusText;

        if (now < dataInicio) {
            status = 'pending';
            statusClass = 'pending';
            statusText = '⏳ Não iniciada';
        } else if (now >= dataInicio && now <= dataFim) {
            status = 'open';
            statusClass = 'open';
            statusText = '✓ Aberta';
        } else {
            status = 'closed';
            statusClass = 'closed';
            statusText = '✕ Encerrada';
        }

        return `
            <div class="activity-card" onclick="openActivity(${activity.id})">
                <div class="activity-header">
                    <h3 class="activity-title">${activity.titulo}</h3>
                    <div class="activity-meta">
                        <p>${activity.curso} - ${activity.modulo}</p>
                        <p>Professor: ${activity.professor_nome}</p>
                    </div>
                </div>
                <div class="activity-dates">
                    <div class="date-item">
                        <span>Início:</span>
                        <strong>${dataInicio.toLocaleString('pt-BR')}</strong>
                    </div>
                    <div class="date-item">
                        <span>Término:</span>
                        <strong>${dataFim.toLocaleString('pt-BR')}</strong>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </div>
        `;
    }).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');

    searchInput.addEventListener('input', filterActivities);
    filterStatus.addEventListener('change', filterActivities);
}

function filterActivities() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const cards = document.querySelectorAll('.activity-card');

    cards.forEach(card => {
        const title = card.querySelector('.activity-title').textContent.toLowerCase();
        const isOpen = card.querySelector('.status-badge').classList.contains('open');
        
        const matchesSearch = title.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'open' && isOpen) ||
                             (statusFilter === 'closed' && !isOpen);

        card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
    });
}

async function openActivity(id) {
    try {
        const response = await fetch(`${API_URL}/activities/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const activity = await response.json();
        showActivityModal(activity);
    } catch (error) {
        console.error('Erro:', error);
    }
}

function showActivityModal(activity) {
    const modal = document.getElementById('activityModal');
    const detailsDiv = document.getElementById('activityDetails');
    
    const now = new Date();
    const dataFim = new Date(activity.data_fim);
    const canSubmit = dataFim > now;

    detailsDiv.innerHTML = `
        <div style="padding: 30px;">
            <h2>${activity.titulo}</h2>
            <div style="margin: 20px 0;">
                <p><strong>Curso:</strong> ${activity.curso}</p>
                <p><strong>Professor:</strong> ${activity.professor_nome}</p>
                <p><strong>Módulo:</strong> ${activity.modulo}</p>
            </div>
            
            <iframe src="${activity.arquivo_html}" 
                    style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 8px;">
            </iframe>

            ${canSubmit ? `
                <div style="margin-top: 30px;">
                    <h3>Enviar Resposta</h3>
                    <textarea id="respostaTexto" rows="6"
                              style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-family: Calibri, Arial; margin-bottom: 15px;">
                    </textarea>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Anexar Arquivo (opcional):</label>
                        <input type="file" id="arquivoResposta" accept=".pdf,.docx,.doc,.csv"
                               style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; width: 100%;">
                    </div>

                    <button onclick="submitActivity(${activity.id})"
                            style="margin-top: 15px; padding: 12px 30px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: Calibri, Arial;">
                        Enviar Atividade
                    </button>
                </div>
            ` : `
                <div style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b;">
                    ⚠️ Prazo de envio encerrado
                </div>
            `}
        </div>
    `;

    modal.classList.add('show');
}

function setupModal() {
    const modal = document.getElementById('activityModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = () => modal.classList.remove('show');
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    };
}

async function submitActivity(activityId) {
    const texto = document.getElementById('respostaTexto').value;
    const arquivo = document.getElementById('arquivoResposta').files[0];

    if (!texto.trim() && !arquivo) {
        alert('Por favor, escreva uma resposta ou anexe um arquivo.');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('activity_id', activityId);
        formData.append('texto_resposta', texto);
        if (arquivo) {
            formData.append('arquivo', arquivo);
        }

        const response = await fetch(`${API_URL}/activities/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            alert('Atividade enviada com sucesso!');
            document.getElementById('activityModal').classList.remove('show');
        } else {
            const error = await response.json();
            alert('Erro: ' + error.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao enviar atividade');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/pages/login.html';
}