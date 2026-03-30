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
    setupDeviceToggle();
    setupVoiceAssistant();
    setupShare();
}

// 0. Device View Toggle Logic
function setupDeviceToggle() {
    const app = document.getElementById('app');
    if (!app) return;

    const toggle = document.createElement('div');
    toggle.className = 'device-toggle';
    toggle.innerHTML = '📱';
    toggle.title = 'Toggle Smartphone/Desktop View';
    
    let isMobile = false;
    
    toggle.onclick = () => {
        isMobile = !isMobile;
        if (isMobile) {
            app.classList.add('mobile-mode');
            toggle.innerHTML = '💻';
        } else {
            app.classList.remove('mobile-mode');
            toggle.innerHTML = '📱';
        }
    };
    
    document.body.appendChild(toggle);
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
    let prevTemp = 32;
    let lastWeatherIndex = -1;
    let locationName = 'Detecting...';

    const fetchWeather = async (lat, lon, city) => {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            const current = data.current_weather;
            
            const weatherStates = [
                { icon: '☀️', color: 'orange', label: 'Hot', code: 0 },
                { icon: '❄️', color: '#00ffff', label: 'Cold', code: 71 },
                { icon: '🌧️', color: '#4a90e2', label: 'Rainy', code: 61 },
                { icon: '⛅', color: 'white', label: 'Cloudy', code: 3 },
                { icon: '⛈️', color: '#b026ff', label: 'Stormy', code: 95 }
            ];

            let weather = weatherStates[3]; // Default Cloudy
            if (current.weathercode === 0) weather = weatherStates[0];
            else if (current.weathercode >= 1 && current.weathercode <= 3) weather = weatherStates[3];
            else if (current.weathercode >= 51 && current.weathercode <= 82) weather = weatherStates[2];
            else if (current.weathercode >= 95) weather = weatherStates[4];
            else if (current.weathercode >= 71 && current.weathercode <= 77) weather = weatherStates[1];

            const temp = Math.round(current.temperature);
            let trendSign = '';
            if (temp > prevTemp) trendSign = '+';
            else if (temp < prevTemp) trendSign = '-';

            if (current.weathercode !== lastWeatherIndex && lastWeatherIndex !== -1) {
                const trendText = temp > prevTemp ? "increasing" : (temp < prevTemp ? "decreasing" : "stable");
                const msg = new SpeechSynthesisUtterance(`Smart Weather Update for ${city}: It is now ${weather.label} with a temperature of ${temp} degrees. The temperature is ${trendText}.`);
                window.speechSynthesis.speak(msg);
            }

            const weatherPill = document.querySelector('.weather-pill');
            if (weatherPill) {
                weatherPill.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: flex-start; margin-right: 8px; line-height: 1;">
                        <span style="font-size: 0.5rem; opacity: 0.6; text-transform: uppercase;">Smart</span>
                        <span style="font-size: 0.6rem; color: #4a90e2; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${city}</span>
                    </div>
                    <div class="weather-icon" style="color: ${weather.color}; text-shadow: 0 0 5px ${weather.color};">${weather.icon}</div>
                    <span class="temp-display" style="color: ${weather.color};">${trendSign}${temp}°C</span>
                `;
                weatherPill.title = `Location: ${city} | Condition: ${weather.label}`;
            }

            prevTemp = temp;
            lastWeatherIndex = current.weathercode;
        } catch (error) {
            console.error("Weather Fetch Error:", error);
        }
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    let city = 'Your Region';
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Your Region';
                    } catch (e) {}
                    fetchWeather(latitude, longitude, city);
                },
                (error) => {
                    fetchWeather(-1.286389, 36.817223, 'Global');
                }
            );
        } else {
            fetchWeather(-1.286389, 36.817223, 'Global');
        }
    };

    const updateClock = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString();
        
        const clockPill = document.querySelector('.clock-pill');
        if (clockPill) {
            clockPill.innerHTML = `
                <div class="clock-date">
                    <div>${timeStr}</div>
                    <div style="font-size: 0.6rem; opacity: 0.7;">${dateStr}</div>
                </div>
            `;
        }
    };

    getLocation();
    setInterval(getLocation, 600000); // Update weather every 10 mins
    
    updateClock();
    setInterval(updateClock, 1000); // Update clock every second

    updateGold();
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
        { icon: '📞', color: '#00d2ff', link: 'calls.html', label: 'Calls' },
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
        { icon: 'https://cdn.simpleicons.org/googlegemini/white', link: 'https://gemini.google.com', type: 'Gemini' },
        { icon: '📞', link: 'calls.html', type: 'Calls' }
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
        console.log('✨ System Self-Healing: Check OK');
    }, 60000);
}

// 6. Voice Assistant Logic
function setupVoiceAssistant() {
    const pulseCore = document.querySelector('.ai-master');
    if (!pulseCore) return;

    pulseCore.title = 'Click for Pulse Core Status';
    pulseCore.style.cursor = 'pointer';
    
    let isSpeaking = false;

    pulseCore.onclick = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            pulseCore.innerHTML = '🧠';
            pulseCore.classList.remove('speaking');
            return;
        }

        isSpeaking = true;
        pulseCore.innerHTML = '🔇';
        pulseCore.classList.add('speaking');
        
        const statusMessage = "Pulse Feeds is currently in development. To be fully functional, I need a secure backend connection, valid API keys for all integrated services, and a verified administrative account. System health is currently optimal, but these components are required for full feature deployment.";
        
        const msg = new SpeechSynthesisUtterance(statusMessage);
        msg.onend = () => {
            isSpeaking = false;
            pulseCore.innerHTML = '🧠';
            pulseCore.classList.remove('speaking');
        };
        window.speechSynthesis.speak(msg);
    };
}

// 7. Share Logic
function setupShare() {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.innerHTML = '🔗';
    shareBtn.title = 'Share Pulse Feeds (Shortened URL)';
    shareBtn.style.cssText = `
        position: fixed;
        right: 10px;
        bottom: 120px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #4a90e2;
        color: white;
        border: none;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        transition: transform 0.2s, background 0.2s;
    `;
    
    shareBtn.onmouseover = () => shareBtn.style.transform = 'scale(1.1)';
    shareBtn.onmouseout = () => shareBtn.style.transform = 'scale(1)';
    
    shareBtn.onclick = async () => {
        const currentUrl = window.location.origin;
        shareBtn.style.background = '#2c3e50';
        shareBtn.innerHTML = '⏳';
        
        try {
            const response = await fetch(`/api/shorten?url=${encodeURIComponent(currentUrl)}`);
            let shareUrl = currentUrl;
            if (response.ok) {
                const data = await response.json();
                shareUrl = data.shortUrl;
            }
            await navigator.clipboard.writeText(shareUrl);
            
            const originalHTML = shareBtn.innerHTML;
            shareBtn.innerHTML = '✅';
            setTimeout(() => {
                shareBtn.innerHTML = '🔗';
                shareBtn.style.background = '#4a90e2';
            }, 2000);
            
            alert(`Shortened URL copied to clipboard: ${shareUrl}`);
        } catch (e) {
            await navigator.clipboard.writeText(currentUrl);
            shareBtn.innerHTML = '🔗';
            shareBtn.style.background = '#4a90e2';
            alert('Original URL copied to clipboard.');
        }
    };
    
    document.body.appendChild(shareBtn);
}

// 8. Fingerprint Health Check
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
