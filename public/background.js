let siteData = {}; // Tracks time for each website (key: hostname, value: {time, name})
let activeTabs = {}; // Tracks currently open tabs (key: tabId, value: {hostname, startTime})
let closedTabs = {}; // Tracks closed websites (key: hostname, value: {time, name})
let visitCount = {}; // Tracks visit count for each website
let focusedTabData = {}; // Tracks focused tab time (key: hostname, value: { time, startTime })
let currentFocusedTabId = null; // Tracks the currently focused tab ID


// Helper: Get hostname from a URL
function getHostname(url) {
    try {
        const hostname = new URL(url).hostname;
        // Prevent new tab pages from being tracked (blank or 'about:blank' URLs)
        if (hostname === "" || hostname === "about:blank" || hostname === "chrome://newtab/" || hostname === "newtab") {
            return null;  // Exclude these URLs
        }
        // if hostnme is any set of random characters, return null
        if (hostname.match(/^[a-zA-Z0-9]+$/)) {
            return null;
        }
        // but if hostname is a valid URL or IP address or localhost or some browser specific URL, return the hostname
        if (hostname.match(/^(https?:\/\/)?(www\.)?[a-zA-Z0-9]+\.[a-z]+/)) {
            return hostname;
        }
        return hostname;
    } catch {
        return null;
    }
}

// Helper: Update time for all active tabs
function updateAllTabs() {
    const currentTime = Date.now();
    for (const [tabId, { hostname, startTime }] of Object.entries(activeTabs)) {
        // Delete the new tab page from activeTabs
        if (hostname === null || hostname === "chrome://newtab/" || hostname === "newtab") {
            delete activeTabs[tabId];
            continue;
        }
        if (!siteData[hostname]) siteData[hostname] = { time: 0, name: hostname };
        siteData[hostname].time += currentTime - startTime; // Add elapsed time
        activeTabs[tabId].startTime = currentTime; // Reset start time for next period

        // If the new entry is present in closedTabs, continue the time from where it was left
        if (closedTabs[hostname]) {
            siteData[hostname].time += closedTabs[hostname].time;
            delete closedTabs[hostname];
        }
    }
    // For every closed tab, if it is present in activeTabs, remove it from activeTabs
    for (const [hostname, { time }] of Object.entries(closedTabs)) {
        if (activeTabs[hostname]) {
            delete activeTabs[hostname];
        }
    }
}

// Helper: Handle when a tab is closed
function handleClosedTab(tabId, hostname) {
    const currentTime = Date.now();
    if (!siteData[hostname]) siteData[hostname] = { time: 0, name: hostname };
    siteData[hostname].time += currentTime - activeTabs[tabId].startTime; // Add elapsed time
    delete activeTabs[tabId]; // Remove tab from activeTabs
    closedTabs[hostname] = siteData[hostname]; // Save time for closed tab
    delete siteData[hostname]; // Remove from siteData
    delete siteData[tabId];
}

// Helper: Update focused tab timer
function updateFocusedTabTimer() {
    const currentTime = Date.now();
    // console.log(focusedTabData + " in updateFocusedTabTimer");
    // ISSUE IS HERE
    if (currentFocusedTabId && focusedTabData.hostname) {
        const hostname = getHostname(focusedTabData.hostname);
        // console.log(focusedTabData[hostname]);
        
        if (!focusedTabData[hostname]) {
            focusedTabData[hostname] = { time: 0, startTime: Date.now() };
        }
        // Update timer for the current focused tab
        focusedTabData[hostname].time += currentTime - focusedTabData[hostname].startTime;
        focusedTabData[hostname].startTime = currentTime;
    }
}

// Helper: Pause timer for the currently focused tab
function pauseFocusedTabTimer() {
    const currentTime = Date.now();
    if (currentFocusedTabId && focusedTabData.hostname) {
        const hostname = focusedTabData.hostname;
        if (focusedTabData[hostname]) {
            focusedTabData[hostname].time += currentTime - focusedTabData[hostname].startTime;
            delete focusedTabData[hostname].startTime; // Stop the timer
        }
    }
}

// Helper: Start or resume timer for a specific hostname
function startResumeFocusedTab(hostname) {
    if (!focusedTabData[hostname]) {
        focusedTabData[hostname] = { time: 0, startTime: Date.now() };
    } else {
        focusedTabData[hostname].startTime = Date.now(); // Resume timer
    }
}

// Listen for tab focus changes (switching tabs within the same window)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Pause timer for the previous focused tab
    if (currentFocusedTabId) pauseFocusedTabTimer();

    // Update current focused tab
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
        const hostname = getHostname(tab.url);
        if (hostname) {
            currentFocusedTabId = activeInfo.tabId;
            focusedTabData.hostname = hostname;
            startResumeFocusedTab(hostname); // Start/resume the timer for the new focused tab
        }
    }
});

// Listen for tab updates (e.g., URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tabId === currentFocusedTabId) {
        const hostname = getHostname(tab.url);
        if (hostname) {
            if (focusedTabData.hostname !== hostname) {
                // Pause timer for the previous hostname
                pauseFocusedTabTimer();
                // Start/resume timer for the new hostname
                focusedTabData.hostname = hostname;
                startResumeFocusedTab(hostname);
            }
        }
    }
});

// Listen for window focus changes (switching windows)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus, pause all timers
        pauseFocusedTabTimer();
        currentFocusedTabId = null; // No tab is focused
    } else {
        // Browser regained focus, find the active tab in the focused window
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab && activeTab.url) {
            const hostname = getHostname(activeTab.url);
            if (hostname) {
                currentFocusedTabId = activeTab.id;
                focusedTabData.hostname = hostname;
                startResumeFocusedTab(hostname);
            }
        }
    }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    updateAllTabs(); // Update time for all tabs
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
        const hostname = getHostname(tab.url);
        if (hostname) {
            // Update visit count
            if (!visitCount[hostname]) {
                visitCount[hostname] = 0;
            }
            visitCount[hostname]++; // Increment the visit count for the site

            // Store visit count
            chrome.storage.local.set({ visitCount });

            activeTabs[activeInfo.tabId] = { hostname, startTime: Date.now() };
        }
    }
});

// Listen for tab updates (e.g., URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        const hostname = getHostname(tab.url);
        // add the old hostname to closedTabs if it is not already present
        const oldTab = activeTabs[tabId];
        if (oldTab && oldTab.hostname && oldTab.hostname !== hostname) {
            handleClosedTab(tabId, oldTab.hostname);
        }
        if (hostname) {
            updateAllTabs(); // Update time for all tabs

            // Update visit count
            if (!visitCount[hostname]) {
                visitCount[hostname] = 0;
            }
            visitCount[hostname]++; // Increment the visit count for the site

            // Store visit count
            chrome.storage.local.set({ visitCount });

            activeTabs[tabId] = { hostname, startTime: Date.now() };
        }
    }
});

// Listen for window focus changes (switching windows)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    updateAllTabs(); // Update time for all tabs
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab && activeTab.url) {
            const hostname = getHostname(activeTab.url);
            if (hostname) {
                activeTabs[activeTab.id] = { hostname, startTime: Date.now() };
            }
        }
    }
});

// Listen for tab closures
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    const tab = activeTabs[tabId];
    if (tab) {
        const { hostname } = tab;
        // Only remove the tab if it was not already in the closedTabs
        if (!closedTabs[hostname]) {
            handleClosedTab(tabId, hostname); // Save time for closed tab
        }
    }
});

// Periodically save site data to storage
setInterval(() => {
    updateAllTabs(); // Ensure all tabs are up-to-date
    updateFocusedTabTimer(); // Update focused tab timer
    // console.log('Active Tabs:', activeTabs);
    // console.log('Focused Tab Data:', focusedTabData);
    // console.log('Site Data:', siteData);

    chrome.storage.local.set({ siteData, closedTabs, visitCount, focusedTabData }); // Store both active and closed tabs, and visit count
}, 500); // Save every second
