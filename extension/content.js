/**
 * GuideScribe - Content Script
 * Captures user clicks and extracts element metadata
 */

(function () {
    // Avoid duplicate injection
    if (window.__guidescribe_injected) return;
    window.__guidescribe_injected = true;

    let isCapturing = false;

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'START_CAPTURE':
                startCapture();
                sendResponse({ success: true });
                break;
            case 'STOP_CAPTURE':
                stopCapture();
                sendResponse({ success: true });
                break;
            case 'GET_CAPTURE_STATUS':
                sendResponse({ isCapturing });
                break;
        }
        return true;
    });

    function startCapture() {
        if (isCapturing) return;
        isCapturing = true;
        document.addEventListener('click', handleClick, true);
        showNotification('Recording started');
    }

    function stopCapture() {
        if (!isCapturing) return;
        isCapturing = false;
        document.removeEventListener('click', handleClick, true);
        showNotification('Recording stopped');
    }

    function handleClick(event) {
        if (!isCapturing) return;

        const target = event.target;

        // Skip capture for certain elements
        if (shouldSkipElement(target)) return;

        // Extract element metadata
        const clickData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            elementLabel: getElementLabel(target),
            selector: generateSelector(target),
            elementTag: target.tagName.toLowerCase(),
            clickX: event.clientX,
            clickY: event.clientY,
        };

        // Send to background script
        chrome.runtime.sendMessage({
            type: 'CLICK_CAPTURED',
            data: clickData,
        });

        // Visual feedback
        showClickIndicator(event.clientX, event.clientY);
    }

    /**
     * Get human-readable label for an element
     */
    function getElementLabel(element) {
        // Priority order for label extraction
        const sources = [
            // Explicit labels
            () => element.getAttribute('aria-label'),
            () => element.getAttribute('title'),
            () => element.getAttribute('alt'),
            () => element.getAttribute('placeholder'),

            // Button/link text
            () => {
                const text = element.innerText?.trim();
                if (text && text.length < 100) return text;
                return null;
            },

            // Input value for certain types
            () => {
                if (element.tagName === 'INPUT') {
                    const type = element.type;
                    if (['submit', 'button'].includes(type)) {
                        return element.value;
                    }
                }
                return null;
            },

            // Associated label
            () => {
                if (element.id) {
                    const label = document.querySelector(`label[for="${element.id}"]`);
                    return label?.innerText?.trim();
                }
                return null;
            },

            // Parent button or link text
            () => {
                const parent = element.closest('button, a, [role="button"]');
                if (parent && parent !== element) {
                    const text = parent.innerText?.trim();
                    if (text && text.length < 100) return text;
                }
                return null;
            },

            // Data attributes
            () => element.dataset?.label || element.dataset?.name,
        ];

        for (const source of sources) {
            try {
                const label = source();
                if (label) return label.substring(0, 100);
            } catch (e) {
                // Ignore errors
            }
        }

        // Fallback to tag name
        return element.tagName.toLowerCase();
    }

    /**
     * Generate a CSS-like selector for an element
     */
    function generateSelector(element) {
        const parts = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            // Add ID if present
            if (current.id) {
                selector += `#${CSS.escape(current.id)}`;
                parts.unshift(selector);
                break; // ID is unique enough
            }

            // Add relevant classes
            const classes = Array.from(current.classList)
                .filter((c) => !isGeneratedClass(c))
                .slice(0, 3);
            if (classes.length > 0) {
                selector += '.' + classes.map((c) => CSS.escape(c)).join('.');
            }

            // Add relevant attributes
            const attrs = getRelevantAttributes(current);
            if (attrs.length > 0) {
                selector += attrs.join('');
            }

            parts.unshift(selector);
            current = current.parentElement;

            // Limit depth
            if (parts.length >= 5) break;
        }

        return parts.join(' > ');
    }

    /**
     * Check if a class looks auto-generated
     */
    function isGeneratedClass(className) {
        // Common patterns for generated class names
        const patterns = [
            /^[a-z]{1,3}-[a-f0-9]{6,}$/i, // e.g., "css-abc123"
            /^[A-Z][a-z]+_[a-z]+__[a-f0-9]+$/i, // CSS Modules
            /^_[a-f0-9]{6,}$/i, // Styled components
            /^sc-[a-z]+$/i, // Styled components
        ];
        return patterns.some((p) => p.test(className));
    }

    /**
     * Get relevant attributes for selector
     */
    function getRelevantAttributes(element) {
        const attrs = [];
        const relevant = ['type', 'name', 'role', 'data-testid', 'data-cy'];

        for (const attr of relevant) {
            const value = element.getAttribute(attr);
            if (value) {
                attrs.push(`[${attr}="${CSS.escape(value)}"]`);
                if (attrs.length >= 2) break;
            }
        }

        return attrs;
    }

    /**
     * Check if element should be skipped
     */
    function shouldSkipElement(element) {
        // Skip our own UI elements
        if (element.closest('[data-guidescribe]')) return true;

        // Skip invisible elements
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return true;

        return false;
    }

    /**
     * Show visual indicator at click position
     */
    function showClickIndicator(x, y) {
        const indicator = document.createElement('div');
        indicator.setAttribute('data-guidescribe', 'indicator');
        indicator.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      margin-top: -12px;
      background: rgba(124, 58, 237, 0.6);
      border: 2px solid #7c3aed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483647;
      animation: guidescribe-pulse 0.5s ease-out forwards;
    `;

        // Add animation styles if not already present
        if (!document.getElementById('guidescribe-styles')) {
            const style = document.createElement('style');
            style.id = 'guidescribe-styles';
            style.textContent = `
        @keyframes guidescribe-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes guidescribe-notification-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes guidescribe-notification-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
            document.head.appendChild(style);
        }

        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 500);
    }

    /**
     * Show notification toast
     */
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.setAttribute('data-guidescribe', 'notification');
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
      z-index: 2147483647;
      pointer-events: none;
      animation: guidescribe-notification-in 0.3s ease-out forwards;
    `;
        notification.textContent = `📸 ${message}`;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'guidescribe-notification-out 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
})();
