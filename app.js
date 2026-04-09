// App State
let jobs = [];
let draggingJobId = null;

// DOM Elements
const jobBoard = document.getElementById('job-board');
const addBtn = document.getElementById('add-job-btn');
const settingsBtn = document.getElementById('settings-btn');
const jobModal = document.getElementById('job-modal');
const settingsModal = document.getElementById('settings-modal');
const closeModals = document.querySelectorAll('.close-btn');
const cancelModal = document.getElementById('cancel-modal');
const jobForm = document.getElementById('job-form');
const loadingSpinner = document.getElementById('loading-spinner');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const searchInput = document.getElementById('search-input');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadLocalJobs(); // Critical: Load local cache first before attempting cloud sync
    fetchJobs();
});

// Settings Management
function getApiUrl() {
    return localStorage.getItem('googleSheetsApiUrl') || '';
}

function loadSettings() {
    document.getElementById('api-url').value = getApiUrl();
}

saveSettingsBtn.addEventListener('click', () => {
    localStorage.setItem('googleSheetsApiUrl', document.getElementById('api-url').value.trim());
    settingsModal.classList.remove('active');
    showToast('Settings saved successfully!');
    fetchJobs(); // Refetch if URL changed
});

// Modal Toggles
const syncBtn = document.getElementById('sync-btn');
if(syncBtn) syncBtn.addEventListener('click', manualSync);

addBtn.addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add Job Application';
    jobForm.reset();
    document.getElementById('job-id').value = '';
    // Set Default date
    document.getElementById('dateApplied').value = new Date().toISOString().split('T')[0];
    jobModal.classList.add('active');
});

settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.add('active');
});

closeModals.forEach(btn => btn.addEventListener('click', () => {
    jobModal.classList.remove('active');
    settingsModal.classList.remove('active');
}));

cancelModal.addEventListener('click', () => {
    jobModal.classList.remove('active');
});

/* Backend Integration */
async function fetchJobs() {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        // Use local storage for fallback
        loadLocalJobs();
        return;
    }

    loadingSpinner.classList.add('active');

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success && data.data) {
            const remoteJobs = data.data;
            const remoteIds = new Set(remoteJobs.map(j => j.id));
            const unsyncedLocal = jobs.filter(j => !remoteIds.has(j.id));
            
            jobs = [...remoteJobs, ...unsyncedLocal];
            saveLocalJobs(); 
            renderJobs();
            
            if(unsyncedLocal.length > 0) {
                 showToast(`You have ${unsyncedLocal.length} unsynced records. Click 'Sync Data' to push!`, 'error');
            }
        } else {
            showToast('Failed to load from sheets. Using local cache.', 'error');
            loadLocalJobs();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Network error. Using local cache.', 'error');
        loadLocalJobs();
    } finally {
        loadingSpinner.classList.remove('active');
    }
}

async function sendToBackend(action, jobData) {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        saveLocalAction(action, jobData);
        showToast('Saved locally (Add API URL in Settings to sync to Sheets)');
        return true;
    }

    try {
        const payload = { action, ...jobData };
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                 'Accept': 'application/json',
                 'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Error saving to server. Saved locally.', 'error');
        saveLocalAction(action, jobData);
        return false;
    }
}

async function sendToBackendSilently(action, jobData, apiUrl) {
    try {
        const payload = { action, ...jobData };
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        return data.success;
    } catch (e) {
        return false;
    }
}

async function manualSync() {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
        showToast('Please add the Google Sheets Script URL in Settings first!', 'error');
        settingsModal.classList.add('active');
        return;
    }
    
    if(!confirm("Ready to synchronize? This will securely push all your offline records to the Google Sheet.")) return;
    
    loadingSpinner.classList.add('active');
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const remoteJobs = data.success && data.data ? data.data : [];
        
        const remoteIds = new Set(remoteJobs.map(j => j.id));
        const unsyncedJobs = jobs.filter(j => !remoteIds.has(j.id));
        
        let pushedCount = 0;
        for(const job of unsyncedJobs) {
            const success = await sendToBackendSilently('create', job, apiUrl);
            if(success) pushedCount++;
        }
        
        const finalResponse = await fetch(apiUrl);
        const finalData = await finalResponse.json();
        
        if (finalData.success && finalData.data) {
            jobs = finalData.data;
            saveLocalJobs();
            renderJobs();
            showToast(`Sync complete! Successfully pushed ${pushedCount} offline records.`);
        }
    } catch(err) {
        showToast('Sync failed (Network Error). Try again later.', 'error');
    } finally {
        loadingSpinner.classList.remove('active');
    }
}

// Local Storage Fallback Sync
function loadLocalJobs() {
    const cached = localStorage.getItem('jobTrackerRecords');
    jobs = cached ? JSON.parse(cached) : [];
    renderJobs();
}

function saveLocalJobs() {
    localStorage.setItem('jobTrackerRecords', JSON.stringify(jobs));
}

function saveLocalAction(action, jobData) {
    if (action === 'create') {
        jobs.push(jobData);
    } else if (action === 'update') {
        const index = jobs.findIndex(j => j.id === jobData.id);
        if (index > -1) jobs[index] = jobData;
    } else if (action === 'delete') {
        jobs = jobs.filter(j => j.id !== jobData.id);
    }
    saveLocalJobs();
    renderJobs();
}

function generateId() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Submitting Form
jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idInput = document.getElementById('job-id').value;
    const isEdit = !!idInput;
    
    const jobData = {
        id: isEdit ? idInput : generateId(),
        company: document.getElementById('company').value,
        position: document.getElementById('position').value,
        status: document.getElementById('status').value,
        dateApplied: document.getElementById('dateApplied').value,
        notes: document.getElementById('notes').value
    };

    jobModal.classList.remove('active');
    
    // Optimistic UI update
    saveLocalAction(isEdit ? 'update' : 'create', jobData);
    showToast(isEdit ? 'Record updated!' : 'Record added!');
    
    // Sync to backend silently
    await sendToBackend(isEdit ? 'update' : 'create', jobData);
});

async function handleDelete(id) {
    if(!confirm("Are you sure you want to delete this record?")) return;
    
    saveLocalAction('delete', { id });
    showToast('Record deleted');
    await sendToBackend('delete', { id });
}

function handleEdit(id) {
    const job = jobs.find(j => j.id === id);
    if(!job) return;

    document.getElementById('modal-title').textContent = 'Edit Job Application';
    document.getElementById('job-id').value = job.id;
    document.getElementById('company').value = job.company;
    document.getElementById('position').value = job.position;
    document.getElementById('status').value = job.status;
    document.getElementById('dateApplied').value = job.dateApplied || '';
    document.getElementById('notes').value = job.notes || '';
    
    jobModal.classList.add('active');
}

// Rendering UI
function renderJobs(filterText = '') {
    // Clear columns
    const columns = {
        'Applied': document.getElementById('list-applied'),
        'Interviewing': document.getElementById('list-interviewing'),
        'Offer': document.getElementById('list-offer'),
        'Rejected': document.getElementById('list-rejected')
    };

    Object.values(columns).forEach(col => col.innerHTML = '');
    
    const count = { 'Applied': 0, 'Interviewing': 0, 'Offer': 0, 'Rejected': 0 };

    jobs.forEach(job => {
        if(filterText && 
           !job.company.toLowerCase().includes(filterText) && 
           !job.position.toLowerCase().includes(filterText)) {
            return;
        }

        const statusStr = job.status || 'Applied';
        const col = columns[statusStr];
        
        if (col) {
            count[statusStr]++;
            const card = document.createElement('div');
            card.className = 'job-card';
            card.draggable = true;
            card.dataset.id = job.id;
            
            // Format nice date
            const dateStr = job.dateApplied ? new Date(job.dateApplied).toLocaleDateString() : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="job-company">${job.company}</div>
                    <div class="job-actions">
                        <button onclick="handleEdit('${job.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="handleDelete('${job.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="job-position">${job.position}</div>
                <div class="card-footer">
                    <span class="status-badge status-${statusStr.toLowerCase()}">${statusStr}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                </div>
            `;
            
            // Drag Events
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            
            col.appendChild(card);
        }
    });

    // Update Counts
    document.getElementById('count-applied').textContent = count['Applied'];
    document.getElementById('count-interviewing').textContent = count['Interviewing'];
    document.getElementById('count-offer').textContent = count['Offer'];
    document.getElementById('count-rejected').textContent = count['Rejected'];
    
    document.getElementById('stat-applied').textContent = count['Applied'];
    document.getElementById('stat-interviewing').textContent = count['Interviewing'];
    document.getElementById('stat-offer').textContent = count['Offer'];
    document.getElementById('stat-rejected').textContent = count['Rejected'];
}

// Search
searchInput.addEventListener('input', (e) => {
    renderJobs(e.target.value.toLowerCase());
});

// Drag and Drop Logic
const dropzones = document.querySelectorAll('.column-content');

function handleDragStart(e) {
    draggingJobId = this.dataset.id;
    this.classList.add('dragging');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggingJobId = null;
}

dropzones.forEach(zone => {
    zone.addEventListener('dragover', e => {
        e.preventDefault(); // needed to allow drop
    });

    zone.addEventListener('drop', async e => {
        e.preventDefault();
        const targetListId = zone.id; // e.g. "list-interviewing"
        const newStatus = targetListId.replace('list-', ''); // "interviewing" -> need correct casing
        
        let formattedStatus = 'Applied';
        if(newStatus === 'interviewing') formattedStatus = 'Interviewing';
        if(newStatus === 'offer') formattedStatus = 'Offer';
        if(newStatus === 'rejected') formattedStatus = 'Rejected';

        if (draggingJobId) {
            const job = jobs.find(j => j.id === draggingJobId);
            if(job && job.status !== formattedStatus) {
                job.status = formattedStatus;
                // optimistic
                saveLocalAction('update', job);
                showToast(`Moved to ${formattedStatus}`);
                // sync
                await sendToBackend('update', job);
            }
        }
    });
});

// Toast Notifications
function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
