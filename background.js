// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        autoScan: true,
        notifications: true,
        couponHistory: {}
    });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if we're on a shopping site
        if (isShoppingSite(tab.url)) {
            chrome.storage.sync.get(['autoScan'], (result) => {
                if (result.autoScan) {
                    // Inject content script if needed
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    });
                }
            });
        }
    }
});

// Helper function to check if URL is a shopping site
function isShoppingSite(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        const shoppingDomains = [
            'amazon', 'walmart', 'ebay', 'etsy', 'bestbuy',
            'target', 'shop', 'store', 'buy', 'checkout'
        ];
        
        return shoppingDomains.some(keyword => 
            domain.includes(keyword) || 
            url.toLowerCase().includes('/shop') ||
            url.toLowerCase().includes('/store') ||
            url.toLowerCase().includes('/product')
        );
    } catch (e) {
        return false;
    }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "foundCoupons") {
        handleFoundCoupons(request.coupons, sender.tab);
    }
    return true;
});

// Handle found coupons
function handleFoundCoupons(coupons, tab) {
    if (!coupons || coupons.length === 0) return;

    chrome.storage.sync.get(['notifications', 'couponHistory'], (result) => {
        if (result.notifications) {
            // Show notification for new coupons only
            const domain = new URL(tab.url).hostname;
            const history = result.couponHistory[domain] || [];
            const newCoupons = coupons.filter(coupon => 
                !history.includes(coupon.code)
            );

            if (newCoupons.length > 0) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Coupons Found!',
                    message: `Found ${newCoupons.length} new coupons for ${domain}`
                });

                // Update history
                result.couponHistory[domain] = [
                    ...history,
                    ...newCoupons.map(c => c.code)
                ];
                chrome.storage.sync.set({ couponHistory: result.couponHistory });
            }
        }
    });
}
