const API_URL = 'http://localhost:3000/api';
let currentStep = 1;
let uploadedFile = null;
let parsedData = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    loadDashboard();
    setupMenuNavigation();
    setupFileUpload();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token || userType !== 'professor') {
        window.location.href = '/pages/login.html';
    }
}

function loadUserInfo() {
    const userName = localStorage.getItem('userName');
    document.getElementById('userName').textContent = userName || 'Professor';
}

function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            document.getElementById(sectionId).classList.add('active');
            
            if (sectionId === 'minhas-atividades') {
                loadActivities();
            } else if (sectionId === 'dashboard') {
                loadDashboard();
            }
        });
    });
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/activities`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const activities = await response.json();
        
        const now = new Date();
        const atividadesAtivas = activities.filter(a => new Date(a.data_fim) > now).length;
        
        document.getElementById('totalAtividades').textContent = activities.length;
        document.getElementById('atividadesAtivas').textContent = atividadesAtivas;
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const btnSelectFile = document.querySelector('.btn-select-file');

    btnSelectFile.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFileSelect);

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2563eb';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#d1d5db';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    document.querySelector('.btn-process').addEventListener('click', processFile);
}

function handleFileSelect() {
    const file = fileInput.files[0];
    if (file) {
        uploadedFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileInfo').style.display = 'block';
    }
}

async function processFile() {
    if (!uploadedFile) return;

    const formData = new FormData();
    formData.append('document', uploadedFile);

    const statusDiv = document.getElementById('processingStatus');
    statusDiv.innerHTML = '<p>Processando arquivo...</p>';

    try {
        const response = await fetch(`${API_URL}/upload/document`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            parsedData = result.data;
            statusDiv.innerHTML = '<p style="color: green;">✓ Arquivo processado com sucesso!</p>';
            
            // Preencher campos do formulário com dados extraídos
            if (parsedData.metadata) {
                document.getElementById('curso').value = parsedData.metadata.curso || '';
                document.getElementById('professorNome').value = parsedData.metadata.professor || '';
                document.getElementById('modulo').value = parsedData.metadata.modulo || '';
                document.getElementById('agenda').value = parsedData.metadata.agenda || '';
                document.getElementById('titulo').value = parsedData.metadata.titulo || '';
            }
            
            setTimeout(() => nextStep(), 1500);
        } else {
            statusDiv.innerHTML = `<p style="color: red;">Erro: ${result.error}</p>`;
        }
    } catch (error) {
        console.error('Erro:', error);
        statusDiv.innerHTML = '<p style="color: red;">Erro ao processar arquivo</p>';
    }
}

function nextStep() {
    if (currentStep < 3) {
        currentStep++;
        updateSteps();
        
        if (currentStep === 3) {
            showPreview();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateSteps();
    }
}

function updateSteps() {
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    document.querySelectorAll('.form-step').forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function showPreview() {
    const previewDiv = document.getElementById('activityPreview');
    
    const curso = document.getElementById('curso').value;
    const professor = document.getElementById('professorNome').value;
    const modulo = document.getElementById('modulo').value;
    const agenda = document.getElementById('agenda').value;
    const titulo = document.getElementById('titulo').value;
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    previewDiv.innerHTML = `
        <div class="preview-card">
            <h3>${titulo}</h3>
            <div class="preview-details">
                <p><strong>Curso:</strong> ${curso}</p>
                <p><strong>Professor:</strong> ${professor}</p>
                <p><strong>Módulo:</strong> ${modulo}</p>
                <p><strong>Agenda:</strong> ${agenda}</p>
                <p><strong>Data de Início:</strong> ${new Date(dataInicio).toLocaleString('pt-BR')}</p>
                <p><strong>Data de Fim:</strong> ${new Date(dataFim).toLocaleString('pt-BR')}</p>
            </div>
        </div>
    `;
}

async function createActivity() {
    const activityData = {
        curso: document.getElementById('curso').value,
        professor_nome: document.getElementById('professorNome').value,
        modulo: document.getElementById('modulo').value,
        agenda: document.getElementById('agenda').value,
        titulo: document.getElementById('titulo').value,
        data_inicio: document.getElementById('dataInicio').value,
        data_fim: document.getElementById('dataFim').value
    };

    try {
        // Gerar HTML primeiro
        const htmlResponse = await fetch(`${API_URL}/upload/generate-html`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                parsedData: parsedData,
                activityInfo: activityData
            })
        });

        const htmlResult = await htmlResponse.json();

        if (htmlResponse.ok) {
            activityData.arquivo_html = htmlResult.htmlPath;

            // Criar atividade
            const response = await fetch(`${API_URL}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(activityData)
            });

            if (response.ok) {
                alert('Atividade criada com sucesso!');
                resetForm();
                document.querySelector('[data-section="dashboard"]').click();
            } else {
                const error = await response.json();
                alert('Erro ao criar atividade: ' + error.error);
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao criar atividade');
    }
}

function resetForm() {
    currentStep = 1;
    uploadedFile = null;
    parsedData = null;
    document.getElementById('activityForm').reset();
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('processingStatus').innerHTML = '';
    updateSteps();
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
    const listDiv = document.getElementById('activitiesList');
    
    if (activities.length === 0) {
        listDiv.innerHTML = '<p>Nenhuma atividade cadastrada ainda.</p>';
        return;
    }

    listDiv.innerHTML = activities.map(activity => {
        const now = new Date();
        const dataFim = new Date(activity.data_fim);
        const isOpen = dataFim > now;
        
        return `
            <div class="activity-card">
                <h3>${activity.titulo}</h3>
                <p><strong>Curso:</strong> ${activity.curso}</p>
                <p><strong>Módulo:</strong> ${activity.modulo}</p>
                <p><strong>Início:</strong> ${new Date(activity.data_inicio).toLocaleString('pt-BR')}</p>
                <p><strong>Fim:</strong> ${new Date(activity.data_fim).toLocaleString('pt-BR')}</p>
                <p><strong>Status:</strong> <span style="color: ${isOpen ? 'green' : 'red'}">${isOpen ? 'Aberta' : 'Encerrada'}</span></p>
                <div style="margin-top: 15px;">
                    <button onclick="editActivity(${activity.id})" class="btn-edit">Editar</button>
                    <button onclick="deleteActivity(${activity.id})" class="btn-delete">Excluir</button>
                    <a href="${activity.arquivo_html}" target="_blank" class="btn-view">Visualizar</a>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteActivity(id) {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;

    try {
        const response = await fetch(`${API_URL}/activities/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            alert('Atividade excluída com sucesso!');
            loadActivities();
            loadDashboard();
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir atividade');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/pages/login.html';
}