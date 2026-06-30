// ============================================
// SIDEBAR CONTROLS - COMPLETE FIXED
// ============================================

let isSidebarOpen = false;
let sidebarOverlay = null;
let sidebarPanel = null;

// ============================================
// CREATE SIDEBAR HTML
// ============================================
function createSidebar() {
    // Check if sidebar already exists
    if (document.getElementById('sidebarOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.innerHTML = `
        <div class="sidebar">
            <div class="sidebar-header">
                <h2>⚙️ Settings</h2>
                <button class="sidebar-close" onclick="closeSidebar()">✕</button>
            </div>
            <div class="sidebar-content">
                <!-- Profile Section -->
                <div class="sidebar-section">
                    <h3>👤 Profile</h3>
                    <button class="sidebar-btn" onclick="openSettingsModal('name')">✏️ Change Name</button>
                    <button class="sidebar-btn" onclick="openSettingsModal('password')">🔑 Change Password</button>
                    <button class="sidebar-btn" onclick="openSettingsModal('language')">🌍 Change Language</button>
                    <button class="sidebar-btn" id="privacyToggleBtn" onclick="toggleProfilePrivacy()">
                        🔒 Make Private
                    </button>
                </div>

                <!-- Appearance Section -->
                <div class="sidebar-section">
                    <h3>🎨 Appearance</h3>
                    <button class="sidebar-btn" id="themeToggleBtn" onclick="toggleTheme()">
                        🌙 Dark Mode
                    </button>
                </div>

                <!-- Gold Section -->
                <div class="sidebar-section">
                    <h3>💰 Harbor Gold</h3>
                    <div class="gold-balance">
                        Balance: <span id="sidebarGoldBalance">0</span> 🪙
                    </div>
                    <button class="sidebar-btn" onclick="viewGoldHistory()">📊 Transaction History</button>
                </div>

                <!-- Stats Section -->
                <div class="sidebar-section">
                    <h3>📊 My Stats</h3>
                    <div class="stat-item">📝 Stories: <span id="sidebarStoryCount">0</span></div>
                    <div class="stat-item">👥 Followers: <span id="sidebarFollowerCount">0</span></div>
                    <div class="stat-item">👤 Following: <span id="sidebarFollowingCount">0</span></div>
                    <div class="stat-item">🪙 Gold Received: <span id="sidebarGoldReceived">0</span></div>
                    <div class="stat-item">❤️ Likes Received: <span id="sidebarLikesReceived">0</span></div>
                </div>

                <!-- Logout -->
                <div class="sidebar-section sidebar-logout">
                    <button class="sidebar-btn btn-danger" onclick="logout()">🚪 Logout</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    sidebarOverlay = overlay;
    sidebarPanel = overlay.querySelector('.sidebar');

    // Close on outside click
    overlay.addEventListener('click', function(e) {
        if (e.target === this) closeSidebar();
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isSidebarOpen) {
            closeSidebar();
        }
    });

    // Add CSS for sidebar
    addSidebarStyles();

    console.log('✅ Sidebar created');
}

// ============================================
// SIDEBAR STYLES
// ============================================
function addSidebarStyles() {
    if (document.getElementById('sidebarStyles')) return;

    const style = document.createElement('style');
    style.id = 'sidebarStyles';
    style.textContent = `
        /* Sidebar Overlay */
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            justify-content: flex-end;
            backdrop-filter: blur(4px);
            animation: sidebarFadeIn 0.3s ease;
        }
        .sidebar-overlay.active {
            display: flex;
        }

        @keyframes sidebarFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Sidebar Panel - 25% of screen */
        .sidebar {
            width: 25%;
            min-width: 280px;
            max-width: 420px;
            height: 100%;
            background: var(--sidebar-bg, #ffffff);
            box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
            overflow-y: auto;
            animation: sidebarSlideIn 0.3s ease;
            padding: 0;
            display: flex;
            flex-direction: column;
        }

        @keyframes sidebarSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        /* Sidebar Header */
        .sidebar-header {
            padding: 20px 24px;
            border-bottom: 2px solid var(--sidebar-border, #e2e8f0);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--sidebar-header-bg, #1a4a4a);
            color: var(--sidebar-header-text, white);
            flex-shrink: 0;
        }
        .sidebar-header h2 {
            font-weight: 300;
            font-size: 1.4rem;
            margin: 0;
            color: var(--sidebar-header-text, white);
        }
        .sidebar-close {
            background: none;
            border: none;
            font-size: 1.8rem;
            cursor: pointer;
            color: var(--sidebar-header-text, white);
            transition: 0.3s;
            padding: 4px 8px;
            border-radius: 8px;
        }
        .sidebar-close:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: rotate(90deg);
        }

        /* Sidebar Content */
        .sidebar-content {
            padding: 16px 20px;
            flex: 1;
            overflow-y: auto;
        }

        /* Sidebar Sections */
        .sidebar-section {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--sidebar-border, #e8ddd0);
        }
        .sidebar-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .sidebar-section h3 {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--sidebar-text-secondary, #7a9e7e);
            margin-bottom: 10px;
            font-weight: 600;
        }

        /* Sidebar Buttons */
        .sidebar-btn {
            display: block;
            width: 100%;
            padding: 10px 14px;
            margin-bottom: 6px;
            background: var(--sidebar-btn-bg, #f0f4f8);
            border: none;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--sidebar-text, #1a4a4a);
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        .sidebar-btn:hover {
            background: var(--sidebar-btn-hover, #e2e8f0);
            transform: translateX(4px);
        }
        .sidebar-btn:active {
            transform: scale(0.98);
        }
        .sidebar-btn.btn-danger {
            background: #dc2626;
            color: white;
            text-align: center;
            font-weight: 600;
        }
        .sidebar-btn.btn-danger:hover {
            background: #b91c1c;
        }

        /* Gold Balance */
        .gold-balance {
            background: var(--sidebar-gold-bg, #fef3c7);
            padding: 10px 14px;
            border-radius: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--sidebar-text, #1a4a4a);
            font-size: 1.1rem;
        }
        .gold-balance span {
            font-size: 1.3rem;
            color: #c47a5a;
        }

        /* Stats Items */
        .stat-item {
            padding: 4px 0;
            font-size: 0.9rem;
            color: var(--sidebar-text, #2d3a3a);
        }
        .stat-item span {
            font-weight: 600;
            color: var(--sidebar-text-bold, #1a4a4a);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                width: 80%;
                min-width: 0;
                max-width: 100%;
            }
        }
        @media (max-width: 480px) {
            .sidebar {
                width: 100%;
            }
            .sidebar-header h2 {
                font-size: 1.2rem;
            }
            .sidebar-btn {
                padding: 8px 12px;
                font-size: 0.85rem;
            }
        }

        /* Dark Mode Support */
        [data-theme="dark"] .sidebar {
            background: #161b22;
        }
        [data-theme="dark"] .sidebar-header {
            background: #0d1117;
            border-bottom-color: #2d3548;
        }
        [data-theme="dark"] .sidebar-header h2 {
            color: #e8edf5;
        }
        [data-theme="dark"] .sidebar-close {
            color: #9aa3b8;
        }
        [data-theme="dark"] .sidebar-section {
            border-bottom-color: #2d3548;
        }
        [data-theme="dark"] .sidebar-section h3 {
            color: #9aa3b8;
        }
        [data-theme="dark"] .sidebar-btn {
            background: #2d3548;
            color: #e8edf5;
        }
        [data-theme="dark"] .sidebar-btn:hover {
            background: #3d4558;
        }
        [data-theme="dark"] .gold-balance {
            background: #1a4a4a;
            color: #e8edf5;
        }
        [data-theme="dark"] .gold-balance span {
            color: #f5d6b3;
        }
        [data-theme="dark"] .stat-item {
            color: #9aa3b8;
        }
        [data-theme="dark"] .stat-item span {
            color: #e8edf5;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// OPEN / CLOSE SIDEBAR - FIXED: Guest check
// ============================================
function openSidebar() {
    // FIXED: Only allow if user is logged in
    if (!currentUser) {
        alert('Please log in to access settings.');
        return;
    }

    if (!sidebarOverlay) createSidebar();
    if (!sidebarOverlay) return;

    // Update sidebar data before opening
    updateSidebarData();

    sidebarOverlay.classList.add('active');
    isSidebarOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        isSidebarOpen = false;
        document.body.style.overflow = '';
    }
}

function toggleSidebar() {
    if (isSidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// ============================================
// UPDATE SIDEBAR DATA - FIXED: Safe checks
// ============================================
function updateSidebarData() {
    // FIXED: Check if user is logged in
    if (!currentUser || !currentUserData) {
        console.warn('Cannot update sidebar: User not logged in');
        return;
    }

    // Update gold balance
    const goldBalance = document.getElementById('sidebarGoldBalance');
    if (goldBalance) {
        goldBalance.textContent = currentUserData.goldBalance || 0;
    }

    // Update stats
    const storyCount = document.getElementById('sidebarStoryCount');
    if (storyCount) {
        storyCount.textContent = currentUserData.storyCount || 0;
    }

    const followerCount = document.getElementById('sidebarFollowerCount');
    if (followerCount) {
        followerCount.textContent = currentUserData.followers ? currentUserData.followers.length : 0;
    }

    const followingCount = document.getElementById('sidebarFollowingCount');
    if (followingCount) {
        followingCount.textContent = currentUserData.following ? currentUserData.following.length : 0;
    }

    const goldReceived = document.getElementById('sidebarGoldReceived');
    if (goldReceived) {
        goldReceived.textContent = currentUserData.goldReceived || 0;
    }

    const likesReceived = document.getElementById('sidebarLikesReceived');
    if (likesReceived) {
        likesReceived.textContent = currentUserData.likesReceived || 0;
    }

    // Update privacy toggle button
    const privacyBtn = document.getElementById('privacyToggleBtn');
    if (privacyBtn) {
        if (currentUserData.isPublic !== false) {
            privacyBtn.textContent = '🔒 Make Private';
        } else {
            privacyBtn.textContent = '🌍 Make Public';
        }
    }

    // Update theme toggle button
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

// ============================================
// TOGGLE THEME - FIXED: Works without sidebar
// ============================================
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';

    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }

    // Update button text
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    }

    // Update sidebar data
    updateSidebarData();

    console.log(`✅ Theme switched to: ${isDark ? 'Light' : 'Dark'}`);
}

// ============================================
// TOGGLE PROFILE PRIVACY - FIXED
// ============================================
function toggleProfilePrivacy() {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return;
    }

    const newPrivacy = currentUserData.isPublic === false ? true : false;

    db.collection('users').doc(currentUser.uid).update({
        isPublic: newPrivacy
    }).then(() => {
        currentUserData.isPublic = newPrivacy;
        updateSidebarData();
        
        // Update privacy badge on profile if visible
        const privacyBadge = document.querySelector('.privacy-badge');
        if (privacyBadge) {
            privacyBadge.textContent = newPrivacy ? '🌍 Public Profile' : '🔒 Private Profile';
            privacyBadge.className = `privacy-badge ${newPrivacy ? 'public' : 'private'}`;
        }
        
        alert(newPrivacy ? '✅ Profile is now Public' : '🔒 Profile is now Private');
    }).catch((err) => {
        alert('❌ Error: ' + err.message);
    });
}

// ============================================
// SETTINGS MODALS - FIXED
// ============================================
function openSettingsModal(type) {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return;
    }

    if (type === 'name') {
        const newName = prompt('Enter new username:', currentUserData.name || '');
        if (newName && newName.trim().length >= 2) {
            // Check if username is taken
            db.collection('users').where('name', '==', newName.trim()).get()
                .then((snapshot) => {
                    if (!snapshot.empty && snapshot.docs[0].id !== currentUser.uid) {
                        alert('❌ Username is already taken. Please choose another.');
                        return;
                    }
                    return db.collection('users').doc(currentUser.uid).update({
                        name: newName.trim()
                    });
                })
                .then(() => {
                    if (!currentUserData) return;
                    currentUserData.name = newName.trim();
                    
                    // Update header
                    const userNameEl = document.getElementById('userName');
                    if (userNameEl) userNameEl.textContent = newName.trim();
                    
                    updateSidebarData();
                    alert('✅ Username updated!');
                })
                .catch((err) => {
                    alert('❌ Error: ' + err.message);
                });
        }
    } else if (type === 'password') {
        const currentPwd = prompt('Enter current password:');
        if (!currentPwd) return;

        const newPwd = prompt('Enter new password (min 6 characters):');
        if (!newPwd || newPwd.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        const confirmPwd = prompt('Confirm new password:');
        if (newPwd !== confirmPwd) {
            alert('Passwords do not match.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Please log in again.');
            return;
        }

        // Re-authenticate
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPwd);
        user.reauthenticateWithCredential(credential)
            .then(() => {
                return user.updatePassword(newPwd);
            })
            .then(() => {
                alert('✅ Password updated successfully!');
            })
            .catch((err) => {
                if (err.code === 'auth/wrong-password') {
                    alert('❌ Current password is incorrect.');
                } else {
                    alert('❌ Error: ' + err.message);
                }
            });
    } else if (type === 'language') {
        const lang = prompt('Select language (en/es/fr):', currentUserData.language || 'en');
        if (lang && ['en', 'es', 'fr'].includes(lang)) {
            db.collection('users').doc(currentUser.uid).update({
                language: lang
            }).then(() => {
                currentUserData.language = lang;
                localStorage.setItem('language', lang);
                alert('✅ Language updated to ' + lang + '!');
            }).catch((err) => {
                alert('❌ Error: ' + err.message);
            });
        } else if (lang) {
            alert('Invalid language. Use: en, es, fr');
        }
    }
}

// ============================================
// VIEW GOLD HISTORY - FIXED
// ============================================
function viewGoldHistory() {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return;
    }

    // Show gold transaction modal or alert
    alert(
        '💰 Gold History\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━\n' +
        'Current Balance: ' + (currentUserData.goldBalance || 0) + ' 🪙\n' +
        'Total Received: ' + (currentUserData.goldReceived || 0) + ' 🪙\n' +
        'Total Given: ' + (currentUserData.goldGiven || 0) + ' 🪙\n' +
        '━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '📊 Full transaction history coming soon!'
    );
}

// ============================================
// INIT SIDEBAR ON PAGE LOAD - FIXED
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Create sidebar on page load
    createSidebar();

    // Add gear icon to header if not exists
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('.btn-settings')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn btn-settings';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = 'Settings';
        settingsBtn.onclick = toggleSidebar;
        settingsBtn.style.fontSize = '1.4rem';
        settingsBtn.style.padding = '4px 10px';
        settingsBtn.style.background = 'transparent';
        settingsBtn.style.border = 'none';
        settingsBtn.style.cursor = 'pointer';
        settingsBtn.style.color = 'var(--text-secondary, #4a5568)';
        settingsBtn.style.transition = 'transform 0.3s ease, background 0.2s ease';
        settingsBtn.style.borderRadius = '8px';

        // Find where to insert (before auth buttons)
        const authButtons = document.getElementById('authButtons');
        if (authButtons) {
            headerRight.insertBefore(settingsBtn, authButtons);
        } else {
            headerRight.appendChild(settingsBtn);
        }
    }

    console.log('✅ Sidebar initialized');
});

// ============================================
// GLOBAL EXPOSURE - Make functions accessible
// ============================================
window.toggleSidebar = toggleSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.toggleTheme = toggleTheme;
window.toggleProfilePrivacy = toggleProfilePrivacy;
window.openSettingsModal = openSettingsModal;
window.viewGoldHistory = viewGoldHistory;

console.log('📂 Sidebar module loaded successfully');
