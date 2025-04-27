// content_script.js

console.log("VULMS Skipper CS: Content script loaded.");

let initialCheckInterval = null;
let initialAttemptCounter = 0;
const MAX_INITIAL_ATTEMPTS = 15;
const CHECK_DELAY = 1000; // ms between initial checks
let debounceTimer = null; // Timer for debouncing mutation events
const DEBOUNCE_DELAY = 500; // ms to wait after tab change detection before acting

// --- Function to request skip check from background ---
// Now called on initial load AND on tab change
function requestSkipCheckFromBackground() {
    console.log("VULMS Skipper CS: Requesting skip check from background script.");
    chrome.storage.local.get(['isAutoSkipEnabled'], (result) => {
        if (result.isAutoSkipEnabled === false) {
            console.log("VULMS Skipper CS: Auto-skip disabled, skipping background request.");
            return;
        }

        chrome.runtime.sendMessage({ action: "requestAutoSkip" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("VULMS Skipper CS: Error sending message:", chrome.runtime.lastError.message);
            } else {
                console.log("VULMS Skipper CS: Background response:", response);
            }
        });
    });
}

// --- Function to set up the observer watching for tab changes ---
function setupTabChangeObserver() {
    const targetNode = document.getElementById('hfActiveTab');
    if (!targetNode) {
        console.warn("VULMS Skipper CS: Cannot find #hfActiveTab to observe. Subsequent tab changes won't trigger auto-skip.");
        return;
    }

    const config = { attributes: true, attributeFilter: ['value'] };

    const callback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                console.log('VULMS Skipper CS: Detected #hfActiveTab value changed to:', targetNode.value);

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log("VULMS Skipper CS: Debounce timer expired, triggering skip check.");
                    requestSkipCheckFromBackground(); // Video auto-skip
                }, DEBOUNCE_DELAY);
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    console.log("VULMS Skipper CS: MutationObserver set up to watch #hfActiveTab for value changes.");
}

// --- Initial Check Logic (runs only once on page load) ---
function performInitialCheck() {
    initialAttemptCounter++;
    console.log(`VULMS Skipper CS: Initial readiness check ${initialAttemptCounter}/${MAX_INITIAL_ATTEMPTS}`);
    const readyElement = document.getElementById('hfActiveTab');

    if (readyElement && readyElement.value) {
        console.log("VULMS Skipper CS: Initial page ready.");
        clearInterval(initialCheckInterval);

        requestSkipCheckFromBackground();
        setupTabChangeObserver();

    } else if (initialAttemptCounter >= MAX_INITIAL_ATTEMPTS) {
        //console.warn("VULMS Skipper CS: Max initial attempts reached. Key element #hfActiveTab not found. Auto-skip might not work correctly.");
        clearInterval(initialCheckInterval);
    }
}

// --- Main execution ---
chrome.storage.local.get(['isAutoSkipEnabled'], (result) => {
    if (result.isAutoSkipEnabled !== false) {
        console.log("VULMS Skipper CS: Auto-skip is ENABLED. Starting initial readiness checks.");
        initialCheckInterval = setInterval(performInitialCheck, CHECK_DELAY);
    } else {
        console.log("VULMS Skipper CS: Auto-skip is DISABLED in settings. No checks or observers will run.");
    }
});
