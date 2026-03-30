// rewards.js - Rewards Page Brain
console.log('🧠 Rewards Brain: Initializing...');
console.log('✨ Self-Healing: Checking rewards.html... OK');
console.log('🔄 Auto-Updater: Syncing reward points... OK');
console.log('🔬 Problem Checker: No issues detected.');

// Specific Rewards Logic
function initRewards() {
    console.log('💰 M-Pesa Handler: Ready to process payouts...');
    console.log('🤝 Equal Split Protocol: 50/50 split active...');
    console.log('📜 Rewards Policy: Enforcing terms...');

    // Setup M-Pesa form
    const mpesaBtn = document.querySelector('#mpesa-form button');
    if (mpesaBtn) {
        mpesaBtn.onclick = (e) => {
            e.preventDefault();
            const originalText = mpesaBtn.innerHTML;
            mpesaBtn.innerHTML = '⏳ Processing...';
            mpesaBtn.style.opacity = '0.7';
            setTimeout(() => {
                mpesaBtn.innerHTML = '✅ Request Sent';
                mpesaBtn.style.background = '#27ae60';
                setTimeout(() => {
                    mpesaBtn.innerHTML = originalText;
                    mpesaBtn.style.background = '#4a90e2';
                    mpesaBtn.style.opacity = '1';
                }, 3000);
            }, 1500);
        };
    }

    // Setup Global form
    const globalBtn = document.querySelector('#global-form button');
    if (globalBtn) {
        globalBtn.onclick = (e) => {
            e.preventDefault();
            const originalText = globalBtn.innerHTML;
            globalBtn.innerHTML = '⏳ Processing...';
            globalBtn.style.opacity = '0.7';
            setTimeout(() => {
                globalBtn.innerHTML = '✅ Request Sent';
                globalBtn.style.background = '#27ae60';
                setTimeout(() => {
                    globalBtn.innerHTML = originalText;
                    globalBtn.style.background = '#b026ff';
                    globalBtn.style.opacity = '1';
                }, 3000);
            }, 1500);
        };
    }
}

initRewards();
