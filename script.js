// Global Script for Pulse Feeds
// Controls Smart Hub navigation, global UI interactions, and background agents

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateHeader();
    setupNavigation();
    setupSidebar();
    setupTheme();
    startBackgroundAgents();
    setupAI();
}

// 1. Header Intelligence
function updateHeader() {
    const goldIndicator = document.querySelector('.gold-indicator');
    const weatherClock = document.querySelector('.weather-clock');

    // Gold Price Prediction Logic
    const updateGold = () => {
        const predictions = ['⏫', '⏬', '⏭️'];
        const randomPred = predictions[Math.floor(Math.random() * predictions.length)];
        const goldName = 'Gold';
        const seller = 'Best Seller: BullionStar';
        
        if (goldIndicator) {
            goldIndicator.innerHTML = `<span>${goldName}</span> ${randomPred} <span style="font-size: 0.6rem; margin-left: 5px;">${seller}</span>`;
        }
    };

    // Weather & Clock Logic
    const updateClock = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString();
        
        // Weather Simulation
        const weatherStates = [
            { icon: '☀️', color: 'orange', label: 'Hot' },
            { icon: '❄️', color: '#00ffff', label: 'Cold' },
            { icon: '🌧️', color: '#4a90e2', label: 'Rainy' },
            { icon: '⛅', color: 'white', label: 'Cloudy' },
            { icon: '⛈️', color: '#b026ff', label: 'Stormy' }
        ];
        const weather = weatherStates[Math.floor(Math.random() * weatherStates.length)];

        if (weatherClock) {
            weatherClock.innerHTML = `
                <div class="weather-icon" style="color: ${weather.color}; text-shadow: 0 0 5px ${weather.color};">${weather.icon}</div>
                <div class="clock-date">
                    <div>${timeStr}</div>
                    <div style="font-size: 0.6rem; opacity: 0.7;">${dateStr}</div>
                </div>
            `;
        }
    };

    updateGold();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(updateGold, 3600000); // Update gold every hour
}

// 2. Navigation Setup
function setupNavigation() {
    const navItems = [
        { icon: '🏠', color: '#ff4b2b', link: 'index.html', label: 'Home' },
        { icon: '👥', color: '#00d2ff', link: 'groups.html', label: 'Groups' },
        { icon: '✚', color: '#ffffff', link: 'posts.html', label: 'Posts' },
        { icon: '💎', color: '#00ffff', link: 'rewards.html', label: 'Rewards' },
        { icon: '👤', color: '#ffd700', link: 'profile.html', label: 'Profile' },
        { icon: '🛡️', color: '#ff3131', link: 'moderation.html', label: 'Moderation' },
        { icon: '🔔', color: '#ffcc00', link: 'notifications.html', label: 'Notifications' },
        { icon: '📜', color: '#f5f5f5', link: 'terms.html', label: 'Terms' },
        { icon: '🔒', color: '#aaaaaa', link: 'privacy.html', label: 'Privacy' },
        { icon: '🎧', color: '#ff9f43', link: 'support.html', label: 'Support' }
    ];

    const nav = document.querySelector('.bottom-nav');
    if (nav) {
        nav.innerHTML = navItems.map(item => `
            <a href="${item.link}" class="nav-item" style="color: ${item.color};">
                <span>${item.icon}</span>
            </a>
        `).join('');
    }
}

// 3. Sidebar Setup
function setupSidebar() {
    const links = [
        { icon: 'https://cdn.simpleicons.org/whatsapp/white', link: 'https://wa.me/', type: 'WhatsApp' },
        { icon: 'https://cdn.simpleicons.org/facebook/white', link: 'https://facebook.com', type: 'Facebook' },
        { icon: 'https://cdn.simpleicons.org/tiktok/white', link: 'https://tiktok.com', type: 'TikTok' },
        { icon: 'https://cdn.simpleicons.org/youtube/white', link: 'https://youtube.com', type: 'YouTube' },
        { icon: 'https://cdn.simpleicons.org/gmail/white', link: 'mailto:', type: 'Gmail' },
        { icon: 'https://cdn.simpleicons.org/yahoo/white', link: 'https://yahoo.com', type: 'Yahoo' },
        { icon: 'https://cdn.simpleicons.org/googlemaps/white', link: 'https://maps.google.com', type: 'Maps' },
        { icon: 'https://cdn.simpleicons.org/brave/white', link: 'https://brave.com', type: 'Brave' },
        { icon: 'https://cdn.simpleicons.org/googlechrome/white', link: 'https://google.com/chrome', type: 'Chrome' },
        { icon: 'https://cdn.simpleicons.org/googlegemini/white', link: 'https://gemini.google.com', type: 'Gemini' }
    ];

    const sidebar = document.querySelector('.sidebar-links');
    if (sidebar) {
        sidebar.innerHTML = links.map(link => `
            <a href="${link.link}" target="_blank" class="sidebar-icon" title="${link.type}">
                <img src="${link.icon}" alt="${link.type}" onerror="this.src='https://picsum.photos/seed/${link.type}/35/35'">
            </a>
        `).join('');
    }
}

// 4. Theme Engine
function setupTheme() {
    const body = document.body;
    const themeBtn = document.createElement('div');
    themeBtn.className = 'theme-toggle';
    themeBtn.innerHTML = '🌙';
    themeBtn.style.cssText = 'position: fixed; top: 70px; left: 10px; cursor: pointer; font-size: 1.2rem; z-index: 1000;';
    document.body.appendChild(themeBtn);

    let isDark = true;
    body.classList.add('dark');

    themeBtn.onclick = () => {
        isDark = !isDark;
        body.classList.toggle('dark', isDark);
        body.classList.toggle('light', !isDark);
        themeBtn.innerHTML = isDark ? '🌙' : '☀️';
    };
}

// 5. Background Agents (Simulated)
function startBackgroundAgents() {
    console.log('🚀 Pulse Feeds Auto-Sync Started...');
    console.log('💰 Midnight Settlement Engine Initialized...');
    console.log('🛡️ Resource Governor Active...');
    
    // Auto-healing simulation
    setInterval(() => {
        console.log('✨ AI Self-Healing: System Check OK');
    }, 60000);
}

// 6. AI Master & Health
function setupAI() {
    const aiIcon = document.querySelector('.ai-master');
    if (aiIcon) {
        aiIcon.onclick = () => {
            alert('🧠 Master AI: System Healthy. \n💡 Advice: Stay hydrated and take a 5-minute break.');
        };
    }
}

// 7. Fingerprint Health Check
function checkHealth() {
    const reader = document.querySelector('.fingerprint-reader');
    if (reader) {
        reader.onclick = () => {
            reader.style.filter = 'drop-shadow(0 0 15px #39ff14)';
            setTimeout(() => {
                alert('🩺 Health Report:\n- Heart Rate: 72 bpm\n- Stress Level: Low\n- Recommendation: Keep up the good work!');
                reader.style.filter = 'drop-shadow(0 0 5px #39ff14)';
            }, 1500);
        };
    }
}
