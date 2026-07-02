// ============================================
// SIDEBAR CONTROLS - FINAL FIXED (v4 - Clean Modals)
// ============================================

let isSidebarOpen = false;
let sidebarOverlay = null;
let settingsModalCallback = null;

// ============================================
// THEME MANAGEMENT
// ============================================
function getCurrentTheme() {
    const saved = localStorage.getItem('harbor_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('harbor_theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('harbor_theme', 'light');
    }
    var themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
    updateSidebarData();
}

// ============================================
// CREATE SETTINGS MODAL (One modal for all settings)
// ============================================
function createSettingsModal() {
    if (document.getElementById('settingsModalOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'settingsModalOverlay';
    overlay.className = 'settings-modal-overlay';
    overlay.innerHTML = `
        <div class="settings-modal">
            <div class="settings-modal-header">
                <h3 id="settingsModalTitle">Settings</h3>
                <button class="settings-modal-close" onclick="closeSettingsModal()">✕</button>
            </div>
            <div class="settings-modal-body" id="settingsModalBody"></div>
            <div class="settings-modal-footer">
                <button class="settings-btn-cancel" onclick="closeSettingsModal()">Cancel</button>
                <button class="settings-btn-confirm" id="settingsConfirmBtn" onclick="submitSettingsModal()">Save</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    addSettingsModalStyles();
    overlay.addEventListener('click', function(e) { if (e.target === this) closeSettingsModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeSettingsModal(); });
}

function addSettingsModalStyles() {
    if (document.getElementById('settingsModalStyles')) return;
    var style = document.createElement('style');
    style.id = 'settingsModalStyles';
    style.textContent = `
        .settings-modal-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:4000; justify-content:center; align-items:center; backdrop-filter:blur(4px); }
        .settings-modal-overlay.active { display:flex; }
        .settings-modal { background:var(--bg-card); border-radius:var(--radius-lg); max-width:420px; width:92%; box-shadow:var(--shadow-xl); border:1px solid var(--border-color); overflow:hidden; animation:modalSlideIn 0.3s ease; }
        @keyframes modalSlideIn { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        .settings-modal-header { padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--primary); color:white; }
        .settings-modal-header h3 { margin:0; font-size:1.1rem; font-weight:500; }
        .settings-modal-close { background:none; border:none; font-size:1.3rem; cursor:pointer; color:white; padding:2px 6px; border-radius:4px; }
        .settings-modal-close:hover { background:rgba(255,255,255,0.2); }
        .settings-modal-body { padding:20px; }
        .settings-modal-body label { display:block; font-weight:600; color:var(--text-secondary); margin-bottom:6px; font-size:0.85rem; }
        .settings-modal-body input, .settings-modal-body select { width:100%; padding:10px 14px; border:2px solid var(--border-color); border-radius:var(--radius-md); font-size:0.95rem; font-family:inherit; background:var(--bg-primary); color:var(--text-primary); margin-bottom:14px; transition:border 0.2s; }
        .settings-modal-body input:focus, .settings-modal-body select:focus { outline:none; border-color:var(--primary); }
        .settings-modal-body .lang-option { display:flex; align-items:center; gap:10px; padding:10px 14px; border:2px solid var(--border-color); border-radius:var(--radius-md); margin-bottom:8px; cursor:pointer; transition:all 0.2s; }
        .settings-modal-body .lang-option:hover { border-color:var(--primary-light); background:var(--bg-secondary); }
        .settings-modal-body .lang-option.selected { border-color:var(--primary); background:var(--bg-secondary); }
        .settings-modal-body .lang-option .flag { font-size:1.5rem; }
        .settings-modal-body .lang-option .name { font-weight:600; color:var(--text-primary); }
        .settings-modal-footer { padding:14px 20px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:8px; }
        .settings-btn-cancel { padding:8px 18px; border:1px solid var(--border-color); border-radius:9999px; background:var(--bg-secondary); color:var(--text-primary); cursor:pointer; font-family:inherit; font-size:0.85rem; }
        .settings-btn-confirm { padding:8px 18px; border:none; border-radius:9999px; background:var(--primary); color:white; cursor:pointer; font-family:inherit; font-size:0.85rem; font-weight:600; }
        .settings-btn-confirm:hover { background:var(--primary-light); }
        .settings-error { color:var(--danger); font-size:0.8rem; margin-top:-8px; margin-bottom:10px; }
    `;
    document.head.appendChild(style);
}

function openSettingsModal(type) {
    if (!currentUser || !currentUserData) { alert('Please log in.'); return; }
    createSettingsModal();
    
    var overlay = document.getElementById('settingsModalOverlay');
    var title = document.getElementById('settingsModalTitle');
    var body = document.getElementById('settingsModalBody');
    var confirmBtn = document.getElementById('settingsConfirmBtn');
    
    if (type === 'name') {
        title.textContent = '✏️ Change Username';
        body.innerHTML = '<label>👤 New Username</label><input type="text" id="settingsInput" value="' + (currentUserData.name || '') + '" placeholder="Enter new username..." maxlength="30"><div class="settings-error" id="settingsError"></div>';
        settingsModalCallback = function() {
            var newName = document.getElementById('settingsInput').value.trim();
            var errEl = document.getElementById('settingsError');
            if (!newName || newName.length < 2) { errEl.textContent = 'Username must be at least 2 characters.'; return; }
            db.collection('users').where('name','==',newName).get().then(function(snap) {
                if (!snap.empty && snap.docs[0].id !== currentUser.uid) { errEl.textContent = 'Username already taken.'; return; }
                return db.collection('users').doc(currentUser.uid).update({ name: newName });
            }).then(function() {
                if (!currentUserData) return;
                currentUserData.name = newName;
                var el = document.getElementById('userName');
                if (el) el.textContent = newName;
                updateSidebarData();
                closeSettingsModal();
                alert('✅ Username updated!');
            }).catch(function(err) { errEl.textContent = err.message; });
        };
    } else if (type === 'password') {
        title.textContent = '🔑 Change Password';
        body.innerHTML = '<label>Current Password</label><input type="password" id="settingsCurrentPwd" placeholder="Enter current password..."><label>New Password</label><input type="password" id="settingsNewPwd" placeholder="Min 6 characters..."><label>Confirm New Password</label><input type="password" id="settingsConfirmPwd" placeholder="Re-enter new password..."><div class="settings-error" id="settingsError"></div>';
        settingsModalCallback = function() {
            var cp = document.getElementById('settingsCurrentPwd').value;
            var np = document.getElementById('settingsNewPwd').value;
            var cmp = document.getElementById('settingsConfirmPwd').value;
            var errEl = document.getElementById('settingsError');
            if (!cp) { errEl.textContent = 'Enter current password.'; return; }
            if (!np || np.length < 6) { errEl.textContent = 'New password must be 6+ characters.'; return; }
            if (np !== cmp) { errEl.textContent = 'Passwords do not match.'; return; }
            var credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, cp);
            currentUser.reauthenticateWithCredential(credential)
                .then(function() { return currentUser.updatePassword(np); })
                .then(function() { closeSettingsModal(); alert('✅ Password updated!'); })
                .catch(function(err) { errEl.textContent = err.code === 'auth/wrong-password' ? 'Incorrect current password.' : err.message; });
        };
    } else if (type === 'language') {
        title.textContent = '🌍 Select Language';
        var currentLang = localStorage.getItem('harbor_language') || 'en';
        var langs = [
            { code: 'en', flag: '🇺🇸', name: 'English' },
            { code: 'es', flag: '🇪🇸', name: 'Español' },
            { code: 'fr', flag: '🇫🇷', name: 'Français' }
        ];
        body.innerHTML = langs.map(function(l) {
            return '<div class="lang-option' + (l.code === currentLang ? ' selected' : '') + '" data-lang="' + l.code + '" onclick="selectLangOption(\'' + l.code + '\')"><span class="flag">' + l.flag + '</span><span class="name">' + l.name + '</span></div>';
        }).join('');
        confirmBtn.textContent = 'Apply';
        settingsModalCallback = function() {
            var selected = document.querySelector('.lang-option.selected');
            if (selected) {
                var lang = selected.getAttribute('data-lang');
                if (typeof changeLanguage === 'function') {
                    changeLanguage(lang);
                } else {
                    localStorage.setItem('harbor_language', lang);
                }
                var langEl = document.getElementById('sidebarCurrentLang');
                if (langEl) {
                    var ln = { en: 'English', es: 'Español', fr: 'Français' };
                    var lf = { en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷' };
                    langEl.textContent = (lf[lang] || '') + ' ' + (ln[lang] || lang);
                }
                closeSettingsModal();
            }
        };
    }
    
    overlay.classList.add('active');
}

function selectLangOption(code) {
    document.querySelectorAll('.lang-option').forEach(function(el) { el.classList.remove('selected'); });
    var el = document.querySelector('.lang-option[data-lang="' + code + '"]');
    if (el) el.classList.add('selected');
}

function submitSettingsModal() {
    if (settingsModalCallback) settingsModalCallback();
}

function closeSettingsModal() {
    var overlay = document.getElementById('settingsModalOverlay');
    if (overlay) overlay.classList.remove('active');
    settingsModalCallback = null;
}

// ============================================
// CREATE SIDEBAR
// ============================================
function createSidebar() {
    if (document.getElementById('sidebarOverlay')) return;
    var currentTheme = getCurrentTheme();
    var currentLang = localStorage.getItem('harbor_language') || 'en';
    var langNames = { en: 'English', es: 'Español', fr: 'Français' };
    var langFlags = { en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷' };

    var overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.innerHTML = `
        <div class="sidebar">
            <div class="sidebar-header">
                <h2>⚙️ Settings</h2>
                <button class="sidebar-close" onclick="closeSidebar()">✕</button>
            </div>
            <div class="sidebar-content">
                <div class="sidebar-section">
                    <h3>👤 Profile</h3>
                    <button class="sidebar-btn" onclick="openSettingsModal('name')">✏️ Change Name</button>
                    <button class="sidebar-btn" onclick="openSettingsModal('password')">🔑 Change Password</button>
                    <button class="sidebar-btn" onclick="openSettingsModal('language')">🌍 Language: <span id="sidebarCurrentLang">${langFlags[currentLang]} ${langNames[currentLang]}</span></button>
                    <button class="sidebar-btn" onclick="window.location.href='suggest.html'">💡 Suggest</button>
                </div>
                <div class="sidebar-section">
                    <h3>🎨 Appearance</h3>
                    <button class="sidebar-btn" id="themeToggleBtn" onclick="toggleTheme()">${currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                </div>
                <div class="sidebar-section">
                    <h3>💰 Harbor Gold</h3>
                    <div class="gold-balance">Balance: <span id="sidebarGoldBalance">0</span> 🪙</div>
                    <button class="sidebar-btn" onclick="viewGoldHistory()">📊 Transaction History</button>
                </div>
                <div class="sidebar-section">
                    <h3>📊 My Stats</h3>
                    <div class="stat-item">📝 Stories: <span id="sidebarStoryCount">0</span></div>
                    <div class="stat-item">👥 Followers: <span id="sidebarFollowerCount">0</span></div>
                    <div class="stat-item">👤 Following: <span id="sidebarFollowingCount">0</span></div>
                    <div class="stat-item">🪙 Gold Received: <span id="sidebarGoldReceived">0</span></div>
                    <div class="stat-item">❤️ Likes Received: <span id="sidebarLikesReceived">0</span></div>
                </div>
                <div class="sidebar-section sidebar-logout">
                    <button class="sidebar-btn btn-danger" onclick="logout()">🚪 Logout</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    sidebarOverlay = overlay;

    overlay.addEventListener('click', function(e) { if (e.target === this) closeSidebar(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && isSidebarOpen) closeSidebar(); });
    addSidebarStyles();
}

function addSidebarStyles() {
    if (document.getElementById('sidebarStyles')) return;
    var style = document.createElement('style');
    style.id = 'sidebarStyles';
    style.textContent = `
        .sidebar-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; justify-content:flex-end; backdrop-filter:blur(4px); }
        .sidebar-overlay.active { display:flex; }
        .sidebar { width:25%; min-width:280px; max-width:400px; height:100%; background:var(--bg-card); box-shadow:-8px 0 32px rgba(0,0,0,0.15); overflow-y:auto; display:flex; flex-direction:column; }
        .sidebar-header { padding:20px 24px; border-bottom:2px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--primary); color:white; flex-shrink:0; }
        .sidebar-header h2 { font-weight:300; font-size:1.3rem; margin:0; }
        .sidebar-close { background:none; border:none; font-size:1.6rem; cursor:pointer; color:white; padding:4px 8px; border-radius:8px; transition:0.2s; }
        .sidebar-close:hover { background:rgba(255,255,255,0.15); }
        .sidebar-content { padding:16px 20px; flex:1; overflow-y:auto; }
        .sidebar-section { margin-bottom:18px; padding-bottom:14px; border-bottom:1px solid var(--border-color); }
        .sidebar-section:last-child { border-bottom:none; margin-bottom:0; }
        .sidebar-section h3 { font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:8px; font-weight:600; }
        .sidebar-btn { display:block; width:100%; padding:9px 12px; margin-bottom:5px; background:var(--bg-secondary); border:none; border-radius:8px; font-size:0.85rem; font-weight:500; color:var(--text-primary); cursor:pointer; transition:all 0.15s; text-align:left; font-family:inherit; }
        .sidebar-btn:hover { background:var(--border-color); transform:translateX(3px); }
        .sidebar-btn:active { transform:scale(0.98); }
        .sidebar-btn.btn-danger { background:#dc2626; color:white; text-align:center; font-weight:600; }
        .sidebar-btn.btn-danger:hover { background:#b91c1c; }
        .gold-balance { background:#fef3c7; padding:10px 14px; border-radius:8px; margin-bottom:6px; font-weight:600; color:var(--text-primary); font-size:1rem; }
        .stat-item { padding:3px 0; font-size:0.85rem; color:var(--text-secondary); }
        .stat-item span { font-weight:600; color:var(--text-primary); }
        [data-theme="dark"] .sidebar { background:#161b22; }
        [data-theme="dark"] .sidebar-header { background:#0d1117; border-bottom-color:#2d3548; }
        [data-theme="dark"] .sidebar-section { border-bottom-color:#2d3548; }
        [data-theme="dark"] .sidebar-btn { background:#2d3548; color:#e8edf5; }
        [data-theme="dark"] .sidebar-btn:hover { background:#3d4558; }
        [data-theme="dark"] .gold-balance { background:#1a4a4a; color:#e8edf5; }
        @media (max-width:768px) { .sidebar { width:80%; min-width:0; } }
        @media (max-width:480px) { .sidebar { width:100%; } }`;
    document.head.appendChild(style);
}

// ============================================
// OPEN / CLOSE
// ============================================
function openSidebar() {
    if (!currentUser) { alert('Please log in to access settings.'); return; }
    if (!sidebarOverlay) createSidebar();
    updateSidebarData();
    sidebarOverlay.classList.add('active');
    isSidebarOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    if (sidebarOverlay) { sidebarOverlay.classList.remove('active'); isSidebarOpen = false; document.body.style.overflow = ''; }
}

function toggleSidebar() { isSidebarOpen ? closeSidebar() : openSidebar(); }

// ============================================
// UPDATE DATA
// ============================================
function updateSidebarData() {
    if (!currentUser || !currentUserData) return;
    
    var goldEl = document.getElementById('sidebarGoldBalance');
    if (goldEl) goldEl.textContent = currentUserData.goldBalance || 0;
    var storyEl = document.getElementById('sidebarStoryCount');
    if (storyEl) storyEl.textContent = currentUserData.storyCount || 0;
    var followerEl = document.getElementById('sidebarFollowerCount');
    if (followerEl) followerEl.textContent = (currentUserData.followers || []).length;
    var followingEl = document.getElementById('sidebarFollowingCount');
    if (followingEl) followingEl.textContent = (currentUserData.following || []).length;
    var goldRecEl = document.getElementById('sidebarGoldReceived');
    if (goldRecEl) goldRecEl.textContent = currentUserData.goldReceived || 0;
    var themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.textContent = getCurrentTheme() === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

    db.collection('stories').where('userId', '==', currentUser.uid).get()
        .then(function(snap) {
            var total = 0;
            snap.forEach(function(doc) {
                var reactions = doc.data().reactions || {};
                total += (reactions['❤️'] || 0);
            });
            var likesEl = document.getElementById('sidebarLikesReceived');
            if (likesEl) likesEl.textContent = total;
        })
        .catch(function() {
            var likesEl = document.getElementById('sidebarLikesReceived');
            if (likesEl) likesEl.textContent = currentUserData.likesReceived || 0;
        });
}

// ============================================
// GOLD HISTORY
// ============================================
function viewGoldHistory() {
    if (!currentUser || !currentUserData) { alert('Please log in.'); return; }
    db.collection('goldTransactions')
        .where('fromUid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
        .then(function(snap) {
            var msg = '💰 Recent Gold Activity\n\n';
            msg += 'Balance: ' + (currentUserData.goldBalance||0) + ' 🪙 | Received: ' + (currentUserData.goldReceived||0) + ' | Given: ' + (currentUserData.goldGiven||0) + '\n\n';
            if (snap.empty) { msg += 'No transactions yet.'; }
            else {
                snap.forEach(function(doc) {
                    var d = doc.data();
                    var time = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : 'Recently';
                    msg += '• ' + d.amount + '🪙 to ' + (d.toName||'Someone') + ' — ' + time + '\n  "' + (d.message||'No message') + '"\n\n';
                });
            }
            alert(msg);
        })
        .catch(function() {
            alert('💰 Gold Summary\n\nBalance: '+(currentUserData.goldBalance||0)+' 🪙\nReceived: '+(currentUserData.goldReceived||0)+' 🪙\nGiven: '+(currentUserData.goldGiven||0)+' 🪙');
        });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    createSidebar();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(function(user) {
            setTimeout(function() {
                var btn = document.querySelector('.btn-settings');
                if (btn) btn.style.display = user ? '' : 'none';
            }, 200);
        });
    }
});

window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.openSettingsModal = openSettingsModal;
window.viewGoldHistory = viewGoldHistory;
window.updateSidebarData = updateSidebarData;
window.selectLangOption = selectLangOption;
window.submitSettingsModal = submitSettingsModal;
window.closeSettingsModal = closeSettingsModal;

console.log('📂 Sidebar module loaded (v4, clean modals)');
