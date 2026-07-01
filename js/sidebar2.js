// ============================================
// SIDEBAR CONTROLS - v2 FINAL
// ============================================

var isSidebarOpen = false;
var sidebarOverlay = null;

function getCurrentTheme() {
    var saved = localStorage.getItem('harbor_theme');
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

function createSidebar() {
    if (document.getElementById('sidebarOverlay')) return;
    var currentTheme = getCurrentTheme();
    var themeLabel = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

    var overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.innerHTML = '<div class="sidebar">'+
        '<div class="sidebar-header"><h2>⚙️ Settings</h2><button class="sidebar-close" onclick="closeSidebar()">✕</button></div>'+
        '<div class="sidebar-content">'+
            '<div class="sidebar-section">'+
                '<h3>👤 Profile</h3>'+
                '<button class="sidebar-btn" onclick="openSettingsModal(\'name\')">✏️ Change Name</button>'+
                '<button class="sidebar-btn" onclick="openSettingsModal(\'password\')">🔑 Change Password</button>'+
                '<button class="sidebar-btn" onclick="openSettingsModal(\'language\')">🌍 Change Language</button>'+
                '<button class="sidebar-btn" id="privacyToggleBtn" onclick="toggleProfilePrivacy()">🔒 Make Private</button>'+
            '</div>'+
            '<div class="sidebar-section">'+
                '<h3>🎨 Appearance</h3>'+
                '<button class="sidebar-btn" id="themeToggleBtn" onclick="toggleTheme()">'+themeLabel+'</button>'+
            '</div>'+
            '<div class="sidebar-section">'+
                '<h3>💰 Harbor Gold</h3>'+
                '<div class="gold-balance">Balance: <span id="sidebarGoldBalance">0</span> 🪙</div>'+
                '<button class="sidebar-btn" onclick="viewGoldHistory()">📊 Transaction History</button>'+
            '</div>'+
            '<div class="sidebar-section">'+
                '<h3>📊 My Stats</h3>'+
                '<div class="stat-item">📝 Stories: <span id="sidebarStoryCount">0</span></div>'+
                '<div class="stat-item">👥 Followers: <span id="sidebarFollowerCount">0</span></div>'+
                '<div class="stat-item">👤 Following: <span id="sidebarFollowingCount">0</span></div>'+
                '<div class="stat-item">🪙 Gold Received: <span id="sidebarGoldReceived">0</span></div>'+
                '<div class="stat-item">❤️ Likes Received: <span id="sidebarLikesReceived">0</span></div>'+
            '</div>'+
            '<div class="sidebar-section sidebar-logout">'+
                '<button class="sidebar-btn btn-danger" onclick="logout()">🚪 Logout</button>'+
            '</div>'+
        '</div></div>';
    document.body.appendChild(overlay);
    sidebarOverlay = overlay;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSidebar(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && isSidebarOpen) closeSidebar(); });
    addSidebarStyles();
}

function addSidebarStyles() {
    if (document.getElementById('sidebarStyles')) return;
    var style = document.createElement('style');
    style.id = 'sidebarStyles';
    style.textContent = '.sidebar-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:flex-end;backdrop-filter:blur(4px)}.sidebar-overlay.active{display:flex}.sidebar{width:25%;min-width:280px;max-width:400px;height:100%;background:var(--bg-card);box-shadow:-8px 0 32px rgba(0,0,0,0.15);overflow-y:auto;display:flex;flex-direction:column}.sidebar-header{padding:20px 24px;border-bottom:2px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;background:var(--primary);color:white;flex-shrink:0}.sidebar-header h2{font-weight:300;font-size:1.3rem;margin:0}.sidebar-close{background:none;border:none;font-size:1.6rem;cursor:pointer;color:white;padding:4px 8px;border-radius:8px;transition:0.2s}.sidebar-close:hover{background:rgba(255,255,255,0.15)}.sidebar-content{padding:16px 20px;flex:1;overflow-y:auto}.sidebar-section{margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border-color)}.sidebar-section:last-child{border-bottom:none;margin-bottom:0}.sidebar-section h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;font-weight:600}.sidebar-btn{display:block;width:100%;padding:9px 12px;margin-bottom:5px;background:var(--bg-secondary);border:none;border-radius:8px;font-size:0.85rem;font-weight:500;color:var(--text-primary);cursor:pointer;transition:all 0.15s;text-align:left;font-family:inherit}.sidebar-btn:hover{background:var(--border-color);transform:translateX(3px)}.sidebar-btn:active{transform:scale(0.98)}.sidebar-btn.btn-danger{background:#dc2626;color:white;text-align:center;font-weight:600}.sidebar-btn.btn-danger:hover{background:#b91c1c}.gold-balance{background:#fef3c7;padding:10px 14px;border-radius:8px;margin-bottom:6px;font-weight:600;color:var(--text-primary);font-size:1rem}.stat-item{padding:3px 0;font-size:0.85rem;color:var(--text-secondary)}.stat-item span{font-weight:600;color:var(--text-primary)}[data-theme="dark"] .sidebar{background:#161b22}[data-theme="dark"] .sidebar-header{background:#0d1117;border-bottom-color:#2d3548}[data-theme="dark"] .sidebar-section{border-bottom-color:#2d3548}[data-theme="dark"] .sidebar-btn{background:#2d3548;color:#e8edf5}[data-theme="dark"] .sidebar-btn:hover{background:#3d4558}[data-theme="dark"] .gold-balance{background:#1a4a4a;color:#e8edf5}@media(max-width:768px){.sidebar{width:80%;min-width:0}}@media(max-width:480px){.sidebar{width:100%}}';
    document.head.appendChild(style);
}

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

function updateSidebarData() {
    if (!currentUser || !currentUserData) return;
    document.getElementById('sidebarGoldBalance').textContent = currentUserData.goldBalance || 0;
    document.getElementById('sidebarStoryCount').textContent = currentUserData.storyCount || 0;
    document.getElementById('sidebarFollowerCount').textContent = (currentUserData.followers || []).length;
    document.getElementById('sidebarFollowingCount').textContent = (currentUserData.following || []).length;
    document.getElementById('sidebarGoldReceived').textContent = currentUserData.goldReceived || 0;
    
    var privacyBtn = document.getElementById('privacyToggleBtn');
    if (privacyBtn) privacyBtn.textContent = currentUserData.isPublic !== false ? '🔒 Make Private' : '🌍 Make Public';
    
    var themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.textContent = getCurrentTheme() === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

    db.collection('stories').where('userId', '==', currentUser.uid).get()
        .then(function(snap) {
            var total = 0;
            snap.forEach(function(doc) { total += (doc.data().reactions || {})['❤️'] || 0; });
            document.getElementById('sidebarLikesReceived').textContent = total;
        }).catch(function() {});
}

function toggleProfilePrivacy() {
    if (!currentUser || !currentUserData) return;
    var newPrivacy = currentUserData.isPublic !== false;
    db.collection('users').doc(currentUser.uid).update({ isPublic: newPrivacy })
        .then(function() { currentUserData.isPublic = newPrivacy; updateSidebarData(); alert(newPrivacy ? '✅ Profile is now Public' : '🔒 Profile is now Private'); })
        .catch(function(err) { alert('❌ ' + err.message); });
}

function openSettingsModal(type) {
    if (!currentUser || !currentUserData) { alert('Please log in.'); return; }
    if (type === 'name') {
        var newName = prompt('Enter new username:', currentUserData.name || '');
        if (newName && newName.trim().length >= 2) {
            db.collection('users').where('name','==',newName.trim()).get().then(function(snap) {
                if (!snap.empty && snap.docs[0].id !== currentUser.uid) { alert('❌ Username taken.'); return; }
                return db.collection('users').doc(currentUser.uid).update({ name: newName.trim() });
            }).then(function() {
                currentUserData.name = newName.trim();
                document.getElementById('userName').textContent = newName.trim();
                updateSidebarData();
                alert('✅ Username updated!');
            }).catch(function(err) { alert('❌ ' + err.message); });
        }
    } else if (type === 'password') {
        var currentPwd = prompt('Enter current password:');
        if (!currentPwd) return;
        var newPwd = prompt('Enter new password (min 6 chars):');
        if (!newPwd || newPwd.length < 6) { alert('Password must be at least 6 characters.'); return; }
        var confirmPwd = prompt('Confirm new password:');
        if (newPwd !== confirmPwd) { alert('Passwords do not match.'); return; }
        var credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPwd);
        currentUser.reauthenticateWithCredential(credential).then(function() { return currentUser.updatePassword(newPwd); })
            .then(function() { alert('✅ Password updated!'); })
            .catch(function(err) { alert('❌ ' + (err.code === 'auth/wrong-password' ? 'Incorrect current password.' : err.message)); });
    } else if (type === 'language') {
        var lang = prompt('Select language:\n\nen = English\nes = Español\nfr = Français', currentUserData.language || 'en');
        if (lang && ['en','es','fr'].indexOf(lang.toLowerCase()) !== -1) {
            var l = lang.toLowerCase();
            var names = {en:'English',es:'Español',fr:'Français'};
            db.collection('users').doc(currentUser.uid).update({ language: l }).then(function() {
                currentUserData.language = l;
                localStorage.setItem('harbor_language', l);
                alert('✅ Language set to ' + names[l] + '!');
            }).catch(function(err) { alert('❌ ' + err.message); });
        } else if (lang) { alert('❌ Use: en, es, or fr'); }
    }
}

function viewGoldHistory() {
    if (!currentUser || !currentUserData) { alert('Please log in.'); return; }
    db.collection('goldTransactions').where('fromUid', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(10).get()
        .then(function(snap) {
            var msg = '💰 Recent Gold Activity\n\nBalance: '+(currentUserData.goldBalance||0)+' 🪙 | Received: '+(currentUserData.goldReceived||0)+' | Given: '+(currentUserData.goldGiven||0)+'\n\n';
            if (snap.empty) msg += 'No transactions yet.';
            else snap.forEach(function(doc) { var d=doc.data(); msg += '• '+d.amount+'🪙 to '+(d.toName||'Someone')+' — '+(d.createdAt?d.createdAt.toDate().toLocaleDateString():'Recently')+'\n'; });
            alert(msg);
        }).catch(function() { alert('💰 Gold Summary\n\nBalance: '+(currentUserData.goldBalance||0)+' 🪙'); });
}

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
window.toggleProfilePrivacy = toggleProfilePrivacy;
window.openSettingsModal = openSettingsModal;
window.viewGoldHistory = viewGoldHistory;
window.updateSidebarData = updateSidebarData;

console.log('📂 Sidebar v2 loaded');
