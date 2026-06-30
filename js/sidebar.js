// ============================================
// SIDEBAR — COMPLETE FIXED
// ============================================

function toggleSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.classList.toggle('active');
    } else {
        // If sidebar doesn't exist, create it
        createSidebar();
    }
}

function closeSidebar() {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function createSidebar() {
    // Check if sidebar already exists
    if (document.getElementById('sidebarOverlay')) return;

    const sidebarHTML = `
        <div id="sidebarOverlay" class="sidebar-overlay">
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
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', sidebarHTML);

    // Add styles if not present
    if (!document.getElementById('sidebarStyles')) {
        const styles = document.createElement('style');
        styles.id = 'sidebarStyles';
        styles.textContent = `
            .sidebar-overlay {
                display: none;
                position: fixed;
                top: 0;
                right: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                justify-content: flex-end;
                animation: fadeIn 0.3s ease;
            }
            .sidebar-overlay.active {
                display: flex;
            }
            .sidebar {
                background: var(--bg-card, #ffffff);
                width: 320px;
                max-width: 90%;
                height: 100%;
                overflow-y: auto;
                box-shadow: -4px 0 32px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                padding: 20px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .sidebar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 16px;
                border-bottom: 2px solid var(--border-color, #e2e8f0);
                margin-bottom: 16px;
            }
            .sidebar-header h2 {
                color: var(--text-primary, #1a1a2e);
                margin: 0;
                font-size: 1.4rem;
            }
            .sidebar-close {
                background: none;
                border: none;
                font-size: 1.8rem;
                cursor: pointer;
                color: var(--text-muted, #718096);
                padding: 0 8px;
            }
            .sidebar-close:hover {
                color: var(--text-primary, #1a1a2e);
            }
            .sidebar-section {
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
            }
            .sidebar-section:last-child {
                border-bottom: none;
            }
            .sidebar-section h3 {
                color: var(--text-secondary, #4a5568);
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-bottom: 8px;
            }
            .sidebar-btn {
                display: block;
                width: 100%;
                padding: 10px 14px;
                background: var(--bg-secondary, #f0f4f8);
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s ease;
                color: var(--text-secondary, #4a5568);
                text-align: left;
                margin-bottom: 4px;
            }
            .sidebar-btn:hover {
                background: var(--border-color, #e2e8f0);
                transform: translateX(4px);
            }
            .sidebar-btn.btn-danger {
                background: #fee2e2;
                color: #dc2626;
            }
            .sidebar-btn.btn-danger:hover {
                background: #fecaca;
            }
            .gold-balance {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary, #1a1a2e);
                padding: 8px 0;
            }
            .stat-item {
                padding: 4px 0;
                font-size: 0.9rem;
                color: var(--text-secondary, #4a5568);
            }
            .stat-item span {
                font-weight: 600;
                color: var(--text-primary, #1a1a2e);
            }
            .sidebar-logout {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 2px solid var(--border-color, #e2e8f0);
            }
        `;
        document.head.appendChild(styles);
    }

    // Update sidebar with user data
    updateSidebarData();
}

function updateSidebarData() {
    if (!currentUserData) return;

    const goldBalance = document.getElementById('sidebarGoldBalance');
    const storyCount = document.getElementById('sidebarStoryCount');
    const followerCount = document.getElementById('sidebarFollowerCount');
    const followingCount = document.getElementById('sidebarFollowingCount');
    const goldReceived = document.getElementById('sidebarGoldReceived');
    const likesReceived = document.getElementById('sidebarLikesReceived');

    if (goldBalance) goldBalance.textContent = currentUserData.goldBalance || 0;
    if (storyCount) storyCount.textContent = currentUserData.storyCount || 0;
    if (followerCount) followerCount.textContent = (currentUserData.followers || []).length;
    if (followingCount) followingCount.textContent = (currentUserData.following || []).length;
    if (goldReceived) goldReceived.textContent = currentUserData.goldReceived || 0;
    if (likesReceived) likesReceived.textContent = currentUserData.likesReceived || 0;

    // Privacy toggle
    const privacyBtn = document.getElementById('privacyToggleBtn');
    if (privacyBtn) {
        privacyBtn.textContent = currentUserData.isPublic ? '🔒 Make Private' : '🌍 Make Public';
    }

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        const theme = document.documentElement.getAttribute('data-theme');
        themeBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

function toggleProfilePrivacy() {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    const newPrivacy = !currentUserData?.isPublic;
    db.collection('users').doc(currentUser.uid).update({
        isPublic: newPrivacy
    }).then(() => {
        if (currentUserData) currentUserData.isPublic = newPrivacy;
        updateSidebarData();
        alert(`Profile is now ${newPrivacy ? 'Public' : 'Private'}.`);
    }).catch((err) => {
        alert('❌ Error: ' + err.message);
    });
}

function openSettingsModal(type) {
    closeSidebar();
    if (type === 'name') {
        const newName = prompt('Enter new username:', currentUserData?.name || '');
        if (newName && newName.trim().length >= 2) {
            db.collection('users').doc(currentUser.uid).update({
                name: newName.trim()
            }).then(() => {
                if (currentUserData) currentUserData.name = newName.trim();
                document.getElementById('userName').textContent = newName.trim();
                alert('✅ Username updated!');
                updateSidebarData();
            }).catch((err) => {
                alert('❌ Error: ' + err.message);
            });
        }
    } else if (type === 'password') {
        const currentPassword = prompt('Enter current password:');
        if (!currentPassword) return;
        const newPassword = prompt('Enter new password (min 6 characters):');
        if (!newPassword || newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        const confirmPassword = prompt('Confirm new password:');
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        currentUser.reauthenticateWithCredential(credential)
            .then(() => {
                return currentUser.updatePassword(newPassword);
            })
            .then(() => {
                alert('✅ Password updated successfully!');
            })
            .catch((err) => {
                alert('❌ Error: ' + err.message);
            });
    } else if (type === 'language') {
        const lang = prompt('Select language (en, es, fr):', 'en');
        if (lang && ['en', 'es', 'fr'].includes(lang)) {
            db.collection('users').doc(currentUser.uid).update({
                language: lang
            }).then(() => {
                localStorage.setItem('language', lang);
                alert('✅ Language updated!');
                location.reload();
            }).catch((err) => {
                alert('❌ Error: ' + err.message);
            });
        } else if (lang) {
            alert('Invalid language. Use: en, es, fr');
        }
    }
}

function viewGoldHistory() {
    closeSidebar();
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    db.collection('goldTransactions')
        .where('fromUid', '==', currentUser.uid)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                alert('📊 No gold transactions yet.');
                return;
            }
            let message = '📊 Gold Transaction History:\n\n';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const time = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Recently';
                message += `💰 ${data.amount} 🪙 → ${data.toName} (${time})\n`;
                if (data.message) message += `   💬 ${data.message}\n`;
            });
            alert(message);
        })
        .catch((err) => {
            alert('❌ Error: ' + err.message);
        });
}

// Update sidebar data when user data changes
document.addEventListener('DOMContentLoaded', function() {
    // Listen for auth changes to update sidebar
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                setTimeout(updateSidebarData, 500);
            }
        });
    }
});

console.log('✅ Sidebar loaded');
