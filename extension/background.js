/**
 * GuideScribe - Background Service Worker
 * Handles screenshot capture and communication between popup and content script
 */

// Configuration
const CONFIG = {
    API_URL: 'http://localhost:3001/api',
    WEB_EDITOR_URL: 'http://localhost:5173',
    SCREENSHOT_DELAY: 300, // ms to wait after click before screenshot
};

// State
let isRecording = false;
let currentGuideId = null;
let recordedSteps = [];
let authToken = null;

// Re-activate capture when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isRecording && changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURE' })
            .catch(() => {    
                // Ignore errors like content script not allowed         
            });
    }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('GuideScribe extension installed');
    // Load auth token from storage
    chrome.storage.local.get(['authToken'], (result) => {
        authToken = result.authToken || null;
    });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error('Message handler error:', error);
            sendResponse({ success: false, error: error.message });
        });
    return true; // Required for async response
});

async function handleMessage(message, sender) {
    switch (message.type) {
        case 'GET_STATUS':
            return {
                isRecording,
                stepCount: recordedSteps.length,
                isAuthenticated: !!authToken,
            };

        case 'SET_AUTH_TOKEN':
            authToken = message.token;
            await chrome.storage.local.set({ authToken: message.token });
            return { success: true };

        case 'LOGOUT':
            authToken = null;
            await chrome.storage.local.remove(['authToken']);
            return { success: true };

        case 'START_RECORDING':
            return await startRecording(message.guideTitle);

        case 'STOP_RECORDING':
            return await stopRecording();

        case 'CANCEL_RECORDING':
            return cancelRecording();

        case 'CLICK_CAPTURED':
            return await handleClickCapture(message.data, sender.tab);

        default:
            throw new Error(`Unknown message type: ${message.type}`);
    }
}

// Start recording a new guide
async function startRecording(guideTitle) {
    if (isRecording) {
        throw new Error('Already recording');
    }

    if (!authToken) {
        throw new Error('Not authenticated');
    }

    try {
        // Create guide on the backend
        const response = await fetch(`${CONFIG.API_URL}/guides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                title: guideTitle || 'Untitled Guide',
                description: '',
                isPublic: false,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create guide');
        }

        const guide = await response.json();
        currentGuideId = guide._id;
        recordedSteps = [];
        isRecording = true;

        // Inject content script into active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
        }

        // Update badge
        chrome.action.setBadgeText({ text: 'REC' });
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

        return { success: true, guideId: currentGuideId };
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
}

// Stop recording and save to backend
async function stopRecording() {
    if (!isRecording) {
        throw new Error('Not recording');
    }

    try {
        // Stop capture in content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' });
            } catch (e) {
                // Tab might be closed or navigated
            }
        }

        // Upload all steps to backend
        if (recordedSteps.length > 0 && currentGuideId) {
            const response = await fetch(
                `${CONFIG.API_URL}/guides/${currentGuideId}/steps/bulk`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ steps: recordedSteps }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save steps');
            }
        }

        const guideId = currentGuideId;
        const stepCount = recordedSteps.length;

        // Reset state
        isRecording = false;
        recordedSteps = [];
        currentGuideId = null;

        // Clear badge
        chrome.action.setBadgeText({ text: '' });

        // Open editor in new tab
        if (guideId) {
            chrome.tabs.create({
                url: `${CONFIG.WEB_EDITOR_URL}/editor/${guideId}`,
            });
        }

        return { success: true, guideId, stepCount };
    } catch (error) {
        console.error('Failed to stop recording:', error);
        throw error;
    }
}

// Cancel recording without saving
function cancelRecording() {
    isRecording = false;
    recordedSteps = [];
    currentGuideId = null;
    chrome.action.setBadgeText({ text: '' });
    return { success: true };
}

// Handle click capture from content script
async function handleClickCapture(clickData, tab) {
    if (!isRecording || !tab) {
        return { success: false };
    }

    try {
        // Wait for UI to update after click
        await new Promise((resolve) => setTimeout(resolve, CONFIG.SCREENSHOT_DELAY));

        // Capture screenshot of the visible area
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 90,
        });

        // Create step data
        const step = {
            url: clickData.url,
            timestamp: clickData.timestamp,
            screenshotData: screenshotDataUrl,
            elementLabel: clickData.elementLabel || '',
            selector: clickData.selector || '',
            elementTag: clickData.elementTag || '',
            clickX: clickData.clickX,
            clickY: clickData.clickY,
            title: clickData.elementLabel
                ? `Click "${clickData.elementLabel}"`
                : `Click on ${clickData.elementTag || 'element'}`,
        };

        recordedSteps.push(step);

        // Update badge with step count
        chrome.action.setBadgeText({ text: String(recordedSteps.length) });

        return { success: true, stepCount: recordedSteps.length };
    } catch (error) {
        console.error('Failed to capture step:', error);
        return { success: false, error: error.message };
    }
}
