document.addEventListener('DOMContentLoaded', function() {
    const couponList = document.getElementById('couponList');
    const status = document.getElementById('status');
    const autoScan = document.getElementById('autoScan');
    const notifications = document.getElementById('notifications');
    const adContent = document.getElementById('adContent');

    // Load settings
    chrome.storage.sync.get(['autoScan', 'notifications'], function(result) {
        autoScan.checked = result.autoScan !== false;
        notifications.checked = result.notifications !== false;
    });

    // Save settings when changed
    autoScan.addEventListener('change', function() {
        chrome.storage.sync.set({ autoScan: this.checked });
    });

    notifications.addEventListener('change', function() {
        chrome.storage.sync.set({ notifications: this.checked });
    });

    // Get current tab and refresh coupons
    function refreshCoupons() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            const domain = new URL(currentTab.url).hostname;

            status.textContent = 'Scanning for coupons...';
            
            chrome.tabs.sendMessage(currentTab.id, {action: "getCoupons"}, function(response) {
                if (response && response.coupons && response.coupons.length > 0) {
                    displayCoupons(response.coupons);
                    status.textContent = `Found ${response.coupons.length} coupons for ${domain}`;
                } else {
                    status.textContent = `No coupons found for ${domain}`;
                    showRelevantAd(domain);
                }
            });
        });
    }

    function displayCoupons(coupons) {
        couponList.innerHTML = '';
        coupons.forEach(coupon => {
            const couponElement = document.createElement('div');
            couponElement.className = 'coupon-item';
            
            // Add verified badge if coupon is verified
            const verifiedBadge = coupon.verified ? 
                '<span class="verified-badge">Verified</span>' : '';
            
            couponElement.innerHTML = `
                <div class="coupon-code">
                    ${coupon.code}${verifiedBadge}
                    <span class="copy-button">Copy</span>
                </div>
                <div class="coupon-description">${coupon.description}</div>
                <div class="success-rate">Success rate: ${coupon.successRate}%</div>
            `;
            
            couponElement.addEventListener('click', function() {
                navigator.clipboard.writeText(coupon.code).then(() => {
                    const copyBtn = this.querySelector('.copy-button');
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 1500);
                });
            });

            couponList.appendChild(couponElement);
        });
    }

    // Ad management
    function showRelevantAd(domain) {
        // Example ad content - In real implementation, this would come from your ad network
        const ads = {
            'amazon.com': {
                title: 'Amazon Prime Special Offer',
                description: 'Get 3 months free trial!',
                url: 'https://amazon.com/prime'
            },
            'default': {
                title: 'Find More Deals',
                description: 'Check out today\'s top offers',
                url: '#deals'
            }
        };

        const ad = ads[domain] || ads.default;
        adContent.innerHTML = `
            <div class="ad-content">
                <h3>${ad.title}</h3>
                <p>${ad.description}</p>
            </div>
        `;
    }

    // Initial load
    refreshCoupons();
});
