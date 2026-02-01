/**
 * GuideScribe - Popup Script
 * Handles UI interactions and communication with background script
 */

const CONFIG = {
    API_URL: 'http://localhost:3001/api',
};

// DOM Elements
const views = {
    login: document.getElementById('loginView'),
    ready: document.getElementById('readyView'),
    recording: document.getElementById('recordingView'),
};

const elements = {
    // Login
    loginForm: document.getElementById('loginForm'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),

    // Ready
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    recordForm: document.getElementById('recordForm'),
    guideTitle: document.getElementById('guideTitle'),
    startBtn: document.getElementById('startBtn'),

    // Recording
    stepCount: document.getElementById('stepCount'),
    stopBtn: document.getElementById('stopBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
};

// State
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthAndStatus();
    setupEventListeners();
});

/**
 * Check authentication status and recording state
 */
async function checkAuthAndStatus() {
    try {
        const status = await sendMessage({ type: 'GET_STATUS' });

        if (!status.isAuthenticated) {
            showView('login');
            return;
        }

        // Load user info
        const { authToken } = await chrome.storage.local.get(['authToken']);
        if (authToken) {
            try {
                const response = await fetch(`${CONFIG.API_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                if (response.ok) {
                    currentUser = await response.json();
                    elements.userName.textContent = `Hello, ${currentUser.name}!`;
                }
            } catch (e) {
                console.error('Failed to fetch profile:', e);
            }
        }

        if (status.isRecording) {
            showView('recording');
            elements.stepCount.textContent = status.stepCount;
        } else {
            showView('ready');
        }
    } catch (error) {
        console.error('Failed to check status:', error);
        showView('login');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Login form
    elements.loginForm.addEventListener('submit', handleLogin);

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Record form
    elements.recordForm.addEventListener('submit', handleStartRecording);

    // Stop recording
    elements.stopBtn.addEventListener('click', handleStopRecording);

    // Cancel recording
    elements.cancelBtn.addEventListener('click', handleCancelRecording);
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    elements.loginError.textContent = '';
    elements.loginBtn.disabled = true;
    elements.loginBtn.textContent = 'Signing in...';

    try {
        const email = elements.emailInput.value;
        const password = elements.passwordInput.value;

        const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();

        // Store token
        await sendMessage({ type: 'SET_AUTH_TOKEN', token: data.accessToken });

        currentUser = data.user;
        elements.userName.textContent = `Hello, ${currentUser.name}!`;
        showView('ready');
    } catch (error) {
        elements.loginError.textContent = error.message;
    } finally {
        elements.loginBtn.disabled = false;
        elements.loginBtn.textContent = 'Sign In';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    await sendMessage({ type: 'LOGOUT' });
    currentUser = null;
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
    showView('login');
}

/**
 * Handle start recording
 */
async function handleStartRecording(e) {
    e.preventDefault();
    elements.startBtn.disabled = true;
    elements.startBtn.innerHTML = '<span class="record-dot"></span> Starting...';

    try {
        const title = elements.guideTitle.value || 'Untitled Guide';
        const result = await sendMessage({ type: 'START_RECORDING', guideTitle: title });

        if (result.success) {
            elements.stepCount.textContent = '0';
            showView('recording');
        } else {
            throw new Error(result.error || 'Failed to start recording');
        }
    } catch (error) {
        alert(error.message);
    } finally {
        elements.startBtn.disabled = false;
        elements.startBtn.innerHTML = '<span class="record-dot"></span> Start Recording';
    }
}

/**
 * Handle stop recording
 */
async function handleStopRecording() {
    elements.stopBtn.disabled = true;
    elements.stopBtn.textContent = 'Saving...';

    try {
        const result = await sendMessage({ type: 'STOP_RECORDING' });

        if (result.success) {
            // Editor will be opened by background script
            showView('ready');
            elements.guideTitle.value = '';
        } else {
            throw new Error(result.error || 'Failed to stop recording');
        }
    } catch (error) {
        alert(error.message);
    } finally {
        elements.stopBtn.disabled = false;
        elements.stopBtn.textContent = '✓ Stop & Edit';
    }
}

/**
 * Handle cancel recording
 */
async function handleCancelRecording() {
    if (!confirm('Are you sure you want to cancel? All captured steps will be lost.')) {
        return;
    }

    try {
        await sendMessage({ type: 'CANCEL_RECORDING' });
        showView('ready');
    } catch (error) {
        alert(error.message);
    }
}

/**
 * Show a specific view
 */
function showView(viewName) {
    Object.entries(views).forEach(([name, element]) => {
        if (name === viewName) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

/**
 * Send message to background script
 */
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

// Listen for step count updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STEP_COUNT_UPDATE') {
        elements.stepCount.textContent = message.count;
    }
});
