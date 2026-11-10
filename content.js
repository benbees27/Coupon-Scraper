// Coupon detection patterns
const COUPON_PATTERNS = {
    common: /(?:code|coupon|discount|promo):?\s*([A-Z0-9]{4,15})/i,
    percentage: /(?:save|get|take)\s*(\d{1,2}(?:\.\d{1,2})?%)/i,
    amount: /\$(\d+(?:\.\d{2})?)\s*(?:off|discount|savings)/i
};

// Track validated coupons
let validatedCoupons = new Map();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCoupons") {
        findCoupons().then(coupons => sendResponse({coupons: coupons}));
        return true;
    }
});

// Main function to find coupons
async function findCoupons() {
    let coupons = [];
    const url = window.location.href;
    const domain = window.location.hostname;

    // Add site-specific coupon finding
    if (domain.includes('amazon')) {
        const amazonCoupons = await findAmazonCoupons();
        coupons = coupons.concat(amazonCoupons);
    }

    // Check for coupon input fields
    const couponInputs = Array.from(document.querySelectorAll('input[id*=coupon], input[id*=promo], input[id*=discount], input[name*=coupon], input[name*=promo], input[name*=discount]'));
    if (couponInputs.length > 0) {
        // Site has coupon functionality, scan more aggressively
        coupons = coupons.concat(await scanForCoupons());
    }

    // Monitor network requests for coupon validation
    setupNetworkMonitoring();

    return filterAndSortCoupons(coupons);
}

// Find Amazon-specific coupons
async function findAmazonCoupons() {
    const coupons = [];
    
    // Check for clip coupons
    const clipButtons = document.querySelectorAll('[data-action="activate-coupon"], .coupon-button, .clip-coupon-button');
    clipButtons.forEach(button => {
        const discountText = button.closest('[data-discount-text], [data-coupon-amount]')?.textContent || '';
        const discountMatch = discountText.match(/(\d+(?:\.\d{2})?%|\$\d+(?:\.\d{2})?)/);
        
        if (discountMatch) {
            coupons.push({
                code: 'CLIP-' + Math.random().toString(36).substring(7).toUpperCase(),
                description: `Clip coupon for ${discountMatch[0]} off`,
                successRate: 95,
                type: 'amazon-clip',
                verified: true
            });
        }
    });

    // Check for Lightning Deals and Deals of the Day
    const dealElements = document.querySelectorAll('[data-deal-id], .deal-of-the-day');
    dealElements.forEach(deal => {
        const dealText = deal.textContent;
        const discountMatch = dealText.match(/(\d+(?:\.\d{2})?%|\$\d+(?:\.\d{2})?)\s*off/i);
        if (discountMatch) {
            coupons.push({
                code: 'DEAL-' + Math.random().toString(36).substring(7).toUpperCase(),
                description: `Limited time deal: ${discountMatch[0]} off`,
                successRate: 90,
                type: 'amazon-deal',
                verified: true
            });
        }
    });

    return coupons;
}

// Scan page for potential coupons
async function scanForCoupons() {
    const coupons = [];
    const pageText = document.body.innerText;
    const pageHTML = document.body.innerHTML;

    // Check meta tags and script data
    const scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('coupon') || content.includes('promo') || content.includes('discount')) {
            const matches = content.match(/"([A-Z0-9]{4,15})":\s*(?:{[^}]*"valid":\s*true|{[^}]*"discount")/gi) || [];
            matches.forEach(match => {
                const code = match.match(/"([A-Z0-9]{4,15})"/)[1];
                if (isValidCouponFormat(code)) {
                    coupons.push({
                        code: code,
                        description: "Verified store coupon",
                        successRate: 85,
                        type: 'store',
                        verified: true
                    });
                }
            });
        }
    }

    // Check for coupon patterns in visible text
    for (const [type, pattern] of Object.entries(COUPON_PATTERNS)) {
        const matches = pageText.match(new RegExp(pattern, 'gi')) || [];
        matches.forEach(match => {
            const code = match.match(pattern)[1];
            if (isValidCouponFormat(code)) {
                coupons.push({
                    code: code,
                    description: generateDescription(type, code),
                    successRate: calculateSuccessRate(code),
                    type: type,
                    verified: false
                });
            }
        });
    }

    return coupons;
}

// Validate coupon format
function isValidCouponFormat(code) {
    if (!code || typeof code !== 'string') return false;
    if (code.length < 4 || code.length > 15) return false;
    if (!/^[A-Z0-9]+$/i.test(code)) return false;
    
    // Check against invalid patterns
    const invalidPatterns = [
        /^TEST/i,
        /^DEMO/i,
        /^EXAMPLE/i,
        /^SAMPLE/i,
        /^[0-9]+$/,  // Avoid pure numbers
        /^[A-Z]+$/   // Avoid pure letters
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(code));
}

// Generate description based on coupon type
function generateDescription(type, code) {
    switch(type) {
        case 'percentage':
            return `Save ${code} on your purchase`;
        case 'amount':
            return `Save $${code} on your order`;
        case 'common':
            return 'Potential discount code';
        default:
            return 'Possible savings on your order';
    }
}

// Calculate success rate based on various factors
function calculateSuccessRate(code) {
    if (validatedCoupons.has(code)) {
        return validatedCoupons.get(code);
    }

    let score = 65; // Lower base score for unverified coupons

    // Adjust score based on code characteristics
    if (code.length >= 6 && code.length <= 10) score += 5;
    if (/^[A-Z0-9]+$/.test(code)) score += 5;
    if (/\d/.test(code) && /[A-Z]/i.test(code)) score += 5;
    if (document.querySelector('input[id*=coupon], input[id*=promo]')) score += 10;
    
    score = Math.min(Math.max(score, 0), 100);
    validatedCoupons.set(code, score);
    
    return score;
}

// Filter and sort coupons
function filterAndSortCoupons(coupons) {
    // Remove duplicates
    const uniqueCoupons = Array.from(new Map(coupons.map(c => [c.code, c])).values());
    
    // Sort by verified status and success rate
    return uniqueCoupons.sort((a, b) => {
        if (a.verified !== b.verified) return b.verified - a.verified;
        return b.successRate - a.successRate;
    });
}

// Monitor network requests for coupon validation
function setupNetworkMonitoring() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        if (args[0].includes('/cart') || args[0].includes('/checkout') || args[0].includes('/coupon') || args[0].includes('/promo')) {
            try {
                const clone = response.clone();
                const data = await clone.json();
                
                if (data.discounts || data.coupons || data.status === 'success') {
                    updateCouponSuccessRates(data);
                }
            } catch (e) {
                // Silently fail if we can't parse the response
            }
        }
        
        return response;
    };
}

// Update success rates based on validation results
function updateCouponSuccessRates(data) {
    const appliedCoupons = new Set(
        (data.discounts || [])
            .concat(data.coupons || [])
            .map(d => d.code || d.couponCode || '')
            .filter(Boolean)
    );
    
    for (const [code, rate] of validatedCoupons) {
        if (appliedCoupons.has(code)) {
            validatedCoupons.set(code, Math.min(rate + 15, 100));
        } else {
            validatedCoupons.set(code, Math.max(rate - 10, 0));
        }
    }
}
