
// Global variables
let currentUser = null;
let allFiles = [];
let categories = [];
let currentCategory = 'all';
let currentTheme = localStorage.getItem('theme') || 'light';
let gridSize = localStorage.getItem('gridSize') || 'auto';

// Elements
const authSection = document.getElementById('auth');
const mainNav = document.getElementById('mainNav');
const userInfo = document.getElementById('userInfo');
const fileGrid = document.getElementById('fileGrid');
const searchResults = document.getElementById('searchResults');
const uploadForm = document.getElementById('uploadForm');
const categorySelect = document.getElementById('category');
const progressBar = document.querySelector('.progress-bar');
const progressFill = document.querySelector('.progress-fill');
const settingsModal = document.getElementById('settingsModal');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeTheme();
  initializeGridSize();
  checkAuthStatus();
  setupEventListeners();
  checkInviteCode();
});

// Check for invite code in URL
function checkInviteCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  const email = urlParams.get('email');
  
  if (inviteCode && email) {
    document.getElementById('registerEmail').value = email;
    document.getElementById('registerForm').dataset.inviteCode = inviteCode;
    switchAuthTab('register');
    showStatus('Please complete your registration using the invitation.', 'success', 'authStatus');
  }
}

// Theme management
function initializeTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.classList.toggle('selected', option.dataset.theme === currentTheme);
  });
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.classList.toggle('selected', option.dataset.theme === theme);
  });
}

// Grid size management
function initializeGridSize() {
  document.getElementById('gridSize').value = gridSize;
  updateGridSize(gridSize);
}

function updateGridSize(size) {
  gridSize = size;
  localStorage.setItem('gridSize', size);
  
  const grids = [fileGrid, searchResults];
  grids.forEach(grid => {
    if (size === 'auto') {
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
    } else {
      grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    }
  });
}

// Settings modal
function openSettings() {
  settingsModal.classList.add('active');
  populateDefaultCategorySelect();
}

function closeSettings() {
  settingsModal.classList.remove('active');
}

function populateDefaultCategorySelect() {
  const defaultCategorySelect = document.getElementById('defaultCategory');
  defaultCategorySelect.innerHTML = '<option value="">No Default</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    defaultCategorySelect.appendChild(option);
  });
}

function exportData() {
  if (!currentUser) return;
  
  const userData = {
    user: currentUser,
    uploadedFiles: allFiles.filter(f => f.uploaded_by === currentUser.username),
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `edulibrary-data-${currentUser.username}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate invite link
function generateInviteLink() {
  const baseUrl = window.location.origin;
  const inviteCode = currentUser ? btoa(currentUser.username) : 'general';
  const inviteUrl = `${baseUrl}?invite=${inviteCode}`;
  document.getElementById('inviteLink').textContent = inviteUrl;
}

function copyInviteLink() {
  const inviteLink = document.getElementById('inviteLink').textContent;
  navigator.clipboard.writeText(inviteLink).then(() => {
    showStatus('Invite link copied to clipboard!', 'success', 'inviteStatus');
  }).catch(() => {
    showStatus('Failed to copy link', 'error', 'inviteStatus');
  });
}

// Check if user is logged in
async function checkAuthStatus() {
  try {
    const response = await fetch('/user-info');
    const data = await response.json();
    
    if (data.logged_in) {
      currentUser = data.user;
      showMainApp();
      loadFiles();
      generateInviteLink();
    } else {
      showAuthScreen();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showAuthScreen();
  }
}

// Switch between auth tabs
function switchAuthTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Auth forms
  document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
  document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
  
  // Navigation
  document.querySelectorAll('nav button').forEach(button => {
    button.addEventListener('click', () => switchSection(button.dataset.section));
  });
  
  // Upload form
  uploadForm.addEventListener('submit', handleUpload);
  
  // Search
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  
  // Invite form
  document.getElementById('inviteForm').addEventListener('submit', handleInvite);
  
  // Support form
  document.getElementById('supportForm').addEventListener('submit', handleSupportTicket);
  
  // Close modal on backdrop click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
}

// Handle support ticket submission
async function handleSupportTicket(e) {
  e.preventDefault();
  const title = document.getElementById('supportTitle').value;
  const description = document.getElementById('supportDescription').value;
  const priority = document.getElementById('supportPriority').value;
  
  try {
    const response = await fetch('/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showStatus('Support ticket submitted successfully!', 'success', 'supportStatus');
      document.getElementById('supportForm').reset();
      loadSupportTickets();
    } else {
      showStatus(data.error || 'Failed to submit ticket', 'error', 'supportStatus');
    }
  } catch (error) {
    showStatus('Failed to submit ticket. Please try again.', 'error', 'supportStatus');
  }
}

// Load support tickets
async function loadSupportTickets() {
  try {
    const response = await fetch('/support/tickets');
    const data = await response.json();
    
    const container = document.getElementById('supportTickets');
    if (data.tickets.length === 0) {
      container.innerHTML = '<p>No support tickets yet.</p>';
      return;
    }
    
    container.innerHTML = data.tickets.map(ticket => `
      <div class="ticket-card">
        <div class="ticket-header">
          <h4>${ticket.title}</h4>
          <div>
            <span class="ticket-status ${ticket.status}">${ticket.status}</span>
            <span class="ticket-priority ${ticket.priority}">${ticket.priority}</span>
          </div>
        </div>
        <p>${ticket.description}</p>
        <div class="ticket-meta">
          Created: ${formatDate(ticket.created_date)}
          ${ticket.resolved_date ? `• Resolved: ${formatDate(ticket.resolved_date)}` : ''}
        </div>
        ${ticket.admin_response ? `
          <div style="margin-top: 1rem; padding: 1rem; background: var(--surface-elevated); border-radius: 8px;">
            <strong>Admin Response:</strong><br>
            ${ticket.admin_response}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load support tickets:', error);
  }
}

// Handle invite
async function handleInvite(e) {
  e.preventDefault();
  const email = document.getElementById('inviteEmail').value;
  const message = document.getElementById('inviteMessage').value;
  
  try {
    const response = await fetch('/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showStatus('Invitation sent successfully!', 'success', 'inviteStatus');
      document.getElementById('inviteForm').reset();
    } else {
      showStatus(data.error || 'Failed to send invitation', 'error', 'inviteStatus');
    }
  } catch (error) {
    showStatus('Failed to send invitation. Please try again.', 'error', 'inviteStatus');
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentUser = data.user;
      showStatus('Login successful!', 'success', 'authStatus');
      setTimeout(() => {
        showMainApp();
        loadFiles();
        generateInviteLink();
      }, 1000);
    } else {
      showStatus(data.error, 'error', 'authStatus');
    }
  } catch (error) {
    showStatus('Login failed. Please try again.', 'error', 'authStatus');
  }
}

// Handle registration
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const inviteCode = document.getElementById('registerForm').dataset.inviteCode || '';
  
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, invite_code: inviteCode })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showStatus('Registration successful! Please login.', 'success', 'authStatus');
      switchAuthTab('login');
    } else {
      showStatus(data.error, 'error', 'authStatus');
    }
  } catch (error) {
    showStatus('Registration failed. Please try again.', 'error', 'authStatus');
  }
}

// Show main app
function showMainApp() {
  authSection.style.display = 'none';
  mainNav.style.display = 'flex';
  
  // Show admin nav if user is admin
  const adminNavBtn = document.getElementById('adminNavBtn');
  if (currentUser.is_admin) {
    adminNavBtn.style.display = 'block';
  }
  
  // Update user info
  userInfo.innerHTML = `
    <button class="settings-btn" onclick="openSettings()" title="Settings">
      ⚙️
    </button>
    <div class="user-stats">
      📤 ${currentUser.uploads_count} uploads • 📥 ${currentUser.downloads_count} downloads
      ${currentUser.is_admin ? ' • 👑 Admin' : ''}
    </div>
    <span>Welcome, ${currentUser.username}!</span>
    <button class="btn btn-secondary" onclick="logout()">Logout</button>
  `;
  
  // Show browse section by default
  switchSection('browse');
}

// Show auth screen
function showAuthScreen() {
  authSection.style.display = 'block';
  mainNav.style.display = 'none';
  document.querySelectorAll('main section:not(#auth)').forEach(s => s.style.display = 'none');
}

// Logout
async function logout() {
  try {
    await fetch('/logout', { method: 'POST' });
    currentUser = null;
    showAuthScreen();
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Switch sections
function switchSection(sectionName) {
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
  
  document.querySelectorAll('main section:not(#auth)').forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none';
  });
  
  document.getElementById(sectionName).style.display = 'block';
  document.getElementById(sectionName).classList.add('active');
  
  if (sectionName === 'browse') {
    loadFiles();
  } else if (sectionName === 'support') {
    loadSupportTickets();
  } else if (sectionName === 'admin' && currentUser.is_admin) {
    loadAdminData();
  }
}

// Load files
async function loadFiles() {
  try {
    const response = await fetch('/files');
    const data = await response.json();
    allFiles = data.files || [];
    categories = data.categories || [];
    
    updateCategoryFilters();
    populateCategorySelect();
    renderFiles();
  } catch (error) {
    console.error('Failed to load files:', error);
  }
}

// Update category filters
function updateCategoryFilters() {
  const filterContainer = document.querySelector('.category-filter');
  const existingButtons = filterContainer.querySelectorAll('.category-btn:not([data-category="all"])');
  existingButtons.forEach(btn => btn.remove());
  
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.category = category;
    btn.textContent = category;
    btn.onclick = () => filterByCategory(category);
    filterContainer.appendChild(btn);
  });
}

// Populate category select
function populateCategorySelect() {
  categorySelect.innerHTML = '<option value="">Select a category</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Filter by category
function filterByCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-category="${category}"]`).classList.add('active');
  renderFiles();
}

// Render files
function renderFiles(filesToRender = null) {
  const container = filesToRender ? searchResults : fileGrid;
  const files = filesToRender || (currentCategory === 'all' ? allFiles : allFiles.filter(f => f.category === currentCategory));
  
  container.innerHTML = '';
  
  if (files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📁</div>
        <h3>No files found</h3>
        <p>${filesToRender ? 'Try a different search term' : 'Upload some PDFs to get started!'}</p>
      </div>
    `;
    return;
  }
  
  files.forEach(file => {
    const card = createFileCard(file);
    container.appendChild(card);
  });
}

// Create file card
function createFileCard(file) {
  const card = document.createElement('div');
  card.className = 'file-card';
  
  card.innerHTML = `
    <div class="file-header">
      <div class="file-icon">PDF</div>
      <div class="file-info">
        <h3 title="${file.filename}">
          ${file.original_name}
          ${file.is_featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
        </h3>
        <div class="file-meta">
          ${file.size_mb}MB • ${formatDate(file.upload_date)}<br>
          👤 ${file.uploaded_by} • 📥 ${file.download_count} downloads
        </div>
        <span class="file-category">${file.category}</span>
      </div>
    </div>
    ${file.description ? `<div class="file-description">${file.description}</div>` : ''}
    ${file.tags && file.tags.length ? `<div class="file-tags">${file.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
    <div class="file-actions">
      <button class="btn btn-warning" onclick="previewFile(${file.id})">Preview</button>
      <button class="btn" onclick="downloadFile(${file.id})">Download</button>
      ${file.uploaded_by === currentUser.username || currentUser.is_admin ? 
        `<button class="btn btn-danger" onclick="deleteFile(${file.id})">Delete</button>` : ''}
    </div>
  `;
  
  return card;
}

// Handle upload
async function handleUpload(e) {
  e.preventDefault();
  const files = document.getElementById('pdfFile').files;
  const category = categorySelect.value;
  const description = document.getElementById('description').value;
  const tags = document.getElementById('tags') ? document.getElementById('tags').value : '';
  
  if (!files.length || !category) {
    showStatus('Please select file(s) and category.', 'error', 'uploadStatus');
    return;
  }
  
  uploadForm.classList.add('loading');
  progressBar.style.display = 'block';
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('tags', tags);
      
      const progress = ((i + 1) / files.length) * 100;
      progressFill.style.width = `${progress}%`;
      
      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      showStatus(`Successfully uploaded ${successCount} file(s).`, 'success', 'uploadStatus');
      uploadForm.reset();
      loadFiles();
      // Update user stats
      currentUser.uploads_count += successCount;
    } else {
      showStatus('All uploads failed. Please try again.', 'error', 'uploadStatus');
    }
    
  } catch (error) {
    showStatus('Upload failed. Please try again.', 'error', 'uploadStatus');
  } finally {
    uploadForm.classList.remove('loading');
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
  }
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  
  if (!query) {
    searchResults.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <h3>Search PDFs</h3>
        <p>Enter keywords to search through the library</p>
      </div>
    `;
    return;
  }
  
  const filtered = allFiles.filter(file => 
    file.original_name.toLowerCase().includes(query) ||
    file.category.toLowerCase().includes(query) ||
    file.description.toLowerCase().includes(query) ||
    file.uploaded_by.toLowerCase().includes(query) ||
    (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query)))
  );
  
  renderFiles(filtered);
}

// File actions
function previewFile(fileId) {
  window.open(`/preview/${fileId}`, '_blank');
}

async function downloadFile(fileId) {
  try {
    const link = document.createElement('a');
    link.href = `/download/${fileId}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Update download count and user stats
    currentUser.downloads_count++;
    setTimeout(loadFiles, 1000);
  } catch (error) {
    alert('Download failed. Please make sure you are logged in.');
  }
}

async function deleteFile(fileId) {
  const file = allFiles.find(f => f.id === fileId);
  if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/delete/${fileId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadFiles();
      if (file.uploaded_by === currentUser.username) {
        currentUser.uploads_count = Math.max(0, currentUser.uploads_count - 1);
      }
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete file.');
    }
  } catch (error) {
    alert('Failed to delete file.');
  }
}

// Admin functions
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="switchAdminTab('${tab}')"]`).classList.add('active');
  
  document.querySelectorAll('.admin-content').forEach(content => {
    content.style.display = 'none';
  });
  
  document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).style.display = 'block';
  
  if (tab === 'users') loadAdminUsers();
  else if (tab === 'files') loadAdminFiles();
  else if (tab === 'support') loadAdminSupport();
  else if (tab === 'analytics') loadAnalytics();
}

async function loadAdminData() {
  loadAdminUsers();
}

async function loadAdminUsers() {
  try {
    const response = await fetch('/admin/users');
    const data = await response.json();
    
    const container = document.getElementById('usersList');
    container.innerHTML = data.users.map(user => `
      <div class="user-card">
        <div class="user-info">
          <h4>${user.username} ${user.is_admin ? '👑' : ''}</h4>
          <div class="user-meta">
            ${user.email} • Joined: ${formatDate(user.join_date)}<br>
            Uploads: ${user.uploads_count} • Downloads: ${user.downloads_count}
          </div>
        </div>
        <div class="user-actions">
          ${!user.is_admin ? `
            <button class="btn ${user.is_active ? 'btn-warning' : 'btn-secondary'}" 
                    onclick="toggleUserStatus(${user.id})">
              ${user.is_active ? 'Deactivate' : 'Activate'}
            </button>
          ` : '<span>Admin User</span>'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function toggleUserStatus(userId) {
  try {
    const response = await fetch(`/admin/users/${userId}/toggle-status`, {
      method: 'POST'
    });
    
    if (response.ok) {
      loadAdminUsers();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to update user status');
    }
  } catch (error) {
    alert('Failed to update user status');
  }
}

async function loadAdminFiles() {
  try {
    const response = await fetch('/files');
    const data = await response.json();
    
    const container = document.getElementById('adminFilesList');
    container.innerHTML = data.files.map(file => `
      <div class="admin-file-card">
        <div class="file-info">
          <h4>${file.original_name} ${file.is_featured ? '⭐' : ''}</h4>
          <div class="file-meta">
            ${file.category} • ${file.size_mb}MB • ${file.download_count} downloads<br>
            Uploaded by: ${file.uploaded_by}
          </div>
        </div>
        <div class="file-actions">
          <button class="btn ${file.is_featured ? 'btn-warning' : 'btn-secondary'}" 
                  onclick="toggleFeatured(${file.id})">
            ${file.is_featured ? 'Unfeature' : 'Feature'}
          </button>
          <button class="btn btn-danger" onclick="deleteFile(${file.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load files:', error);
  }
}

async function toggleFeatured(fileId) {
  try {
    const response = await fetch(`/admin/files/featured/${fileId}`, {
      method: 'POST'
    });
    
    if (response.ok) {
      loadAdminFiles();
      loadFiles(); // Refresh main file list
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to update file status');
    }
  } catch (error) {
    alert('Failed to update file status');
  }
}

async function loadAdminSupport() {
  try {
    const response = await fetch('/support/tickets');
    const data = await response.json();
    
    const container = document.getElementById('adminTicketsList');
    container.innerHTML = data.tickets.map(ticket => `
      <div class="ticket-card">
        <div class="ticket-header">
          <h4>${ticket.title}</h4>
          <div>
            <span class="ticket-status ${ticket.status}">${ticket.status}</span>
            <span class="ticket-priority ${ticket.priority}">${ticket.priority}</span>
          </div>
        </div>
        <p><strong>User:</strong> ${ticket.user}</p>
        <p>${ticket.description}</p>
        <div class="ticket-meta">
          Created: ${formatDate(ticket.created_date)}
        </div>
        ${ticket.status !== 'resolved' ? `
          <div style="margin-top: 1rem;">
            <textarea id="response-${ticket.id}" placeholder="Admin response..." rows="3" style="width: 100%; margin-bottom: 0.5rem;"></textarea>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="respondToTicket(${ticket.id}, 'in-progress')">Mark In Progress</button>
              <button class="btn" onclick="respondToTicket(${ticket.id}, 'resolved')">Resolve</button>
            </div>
          </div>
        ` : ''}
        ${ticket.admin_response ? `
          <div style="margin-top: 1rem; padding: 1rem; background: var(--surface-elevated); border-radius: 8px;">
            <strong>Admin Response:</strong><br>
            ${ticket.admin_response}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load tickets:', error);
  }
}

async function respondToTicket(ticketId, status) {
  const response = document.getElementById(`response-${ticketId}`).value.trim();
  
  if (!response) {
    alert('Please enter a response');
    return;
  }
  
  try {
    const res = await fetch(`/admin/tickets/${ticketId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, status })
    });
    
    if (res.ok) {
      loadAdminSupport();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to respond to ticket');
    }
  } catch (error) {
    alert('Failed to respond to ticket');
  }
}

async function loadAnalytics() {
  try {
    const response = await fetch('/analytics');
    const data = await response.json();
    
    const container = document.getElementById('analyticsData');
    container.innerHTML = `
      <div class="analytics-grid">
        <div class="stat-card">
          <div class="stat-number">${data.stats.total_users}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.stats.active_users}</div>
          <div class="stat-label">Active Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.stats.total_files}</div>
          <div class="stat-label">Total Files</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.stats.total_downloads}</div>
          <div class="stat-label">Total Downloads</div>
        </div>
      </div>
      
      <h3>Category Distribution</h3>
      <div class="category-stats">
        ${data.categories.map(cat => `
          <div class="stat-item">
            ${cat.category}: ${cat.count} files
          </div>
        `).join('')}
      </div>
      
      <h3>Recent Uploads</h3>
      <div class="recent-uploads">
        ${data.recent_uploads.map(file => `
          <div class="upload-item">
            ${file.original_name} by ${file.uploaded_by} (${formatDate(file.upload_date)})
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Utility functions
function formatDate(isoString) {
  if (!isoString || isoString === 'Unknown') return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showStatus(message, type, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Initialize category filter
document.addEventListener('DOMContentLoaded', function() {
  const allCategoryBtn = document.querySelector('[data-category="all"]');
  if (allCategoryBtn) {
    allCategoryBtn.onclick = () => filterByCategory('all');
  }
});
