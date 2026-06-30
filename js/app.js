// ============================================
// THE HARBOR - MAIN APPLICATION
// ============================================

// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyBoYWOijOWqjd3d3_NAiSsiGmQ0HokaRGs",
    authDomain: "the-harbor-community.firebaseapp.com",
    projectId: "the-harbor-community",
    storageBucket: "the-harbor-community.firebasestorage.app",
    messagingSenderId: "634248505303",
    appId: "1:634248505303:web:4eb16e6a9f97903420cd92"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        console.warn('Firestore persistence error:', err);
    });

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let currentUserData = null;
let currentCategory = 'all';
let userReactions = {};
let allStories = [];
let filteredStories = [];
let currentPage = 1;
const STORIES_PER_PAGE = 10;
let currentEditId = null;

// ============================================
// GUEST RESTRICTIONS
// ============================================
function checkGuestRestrictions() {
    const isGuest = !currentUser;
    const guestRestrictedElements = document.querySelectorAll('.guest-restricted');
    
    guestRestrictedElements.forEach(el => {
        if (isGuest) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });

    // Show login required message if guest
    const guestMessage = document.getElementById('guestMessage');
    if (guestMessage) {
        if (isGuest) {
            guestMessage.style.display = 'block';
        } else {
            guestMessage.style.display = 'none';
        }
    }
}

// ============================================
// RESEND VERIFICATION
// ============================================
function resendVerification() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in first.');
        return;
    }
    
    user.sendEmailVerification()
        .then(() => {
            alert(
                '✅ Verification email resent to ' + user.email + '!\n\n' +
                '📧 Please check your inbox and click the verification link.\n\n' +
                '📌 If you don\'t see the email:\n' +
                '   • Check your SPAM or JUNK folder\n' +
                '   • Wait a few minutes and refresh your inbox\n' +
                '   • Add noreply@the-harbor.com to your contacts'
            );
        })
        .catch((err) => {
            alert('❌ Error: ' + err.message);
        });
}

// ============================================
// FOLLOW SYSTEM
// ============================================
function followUser(targetUid) {
    if (!currentUser) {
        alert('Please log in to follow users.');
        return;
    }
    if (targetUid === currentUser.uid) {
        alert('You cannot follow yourself.');
        return;
    }

    const userRef = db.collection('users').doc(currentUser.uid);
    const targetRef = db.collection('users').doc(targetUid);

    db.runTransaction((transaction) => {
        return transaction.get(userRef).then((userDoc) => {
            if (!userDoc.exists) return;
            const userData = userDoc.data();
            const following = userData.following || [];
            
            if (following.includes(targetUid)) {
                // Unfollow
                transaction.update(userRef, {
                    following: firebase.firestore.FieldValue.arrayRemove(targetUid)
                });
                transaction.update(targetRef, {
                    followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
            } else {
                // Follow
                transaction.update(userRef, {
                    following: firebase.firestore.FieldValue.arrayUnion(targetUid)
                });
                transaction.update(targetRef, {
                    followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
            }
        });
    }).then(() => {
        // Reload profile if on profile page
        if (window.location.pathname.includes('profile.html')) {
            loadProfile();
        }
        // Update sidebar
        if (typeof updateSidebarData === 'function') {
            updateSidebarData();
        }
    }).catch((err) => {
        console.error('Error following/unfollowing:', err);
        alert('Error: ' + err.message);
    });
}

function isFollowing(targetUid) {
    if (!currentUserData) return false;
    return currentUserData.following && currentUserData.following.includes(targetUid);
}

// ============================================
// COUNTRY DATA
// ============================================
const countries = [
    { name: 'United States', emergency: '911' },
    { name: 'United Kingdom', emergency: '999' },
    { name: 'Bangladesh', emergency: '999' },
    { name: 'India', emergency: '112' },
    { name: 'Canada', emergency: '911' },
    { name: 'Australia', emergency: '000' },
    { name: 'Germany', emergency: '112' },
    { name: 'France', emergency: '112' },
    { name: 'Italy', emergency: '112' },
    { name: 'Spain', emergency: '112' },
    { name: 'Brazil', emergency: '190' },
    { name: 'Mexico', emergency: '911' }
];

// ============================================
// SECURITY FUNCTIONS
// ============================================
function escapeHTML(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(text).replace(/[&<>"'/`=]/g, function(m) { return map[m]; });
}

function sanitizeInput(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
}

function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;
    const common = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome', 'admin'];
    if (!common.some(pwd => password.toLowerCase().includes(pwd))) score += 10;

    let strength = 'weak', color = '#c0392b';
    if (score >= 90) { strength = 'very-strong'; color = '#27ae60'; }
    else if (score >= 70) { strength = 'strong'; color = '#2ecc71'; }
    else if (score >= 50) { strength = 'medium'; color = '#f39c12'; }
    else if (score >= 30) { strength = 'weak'; color = '#e67e22'; }
    else { strength = 'very-weak'; color = '#c0392b'; }

    return { score, strength, color };
}

// ============================================
// GENDER RESTRICTION CHECKS
// ============================================
function getUserGender() {
    if (!currentUserData) return null;
    return currentUserData.gender;
}

function canSeeCategory(category) {
    const gender = getUserGender();
    
    if (currentUserData?.isAdmin === true) return true;
    
    if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') {
        return true;
    }
    
    if (category === 'men') {
        return gender === '🧔 Man';
    }
    
    if (category === 'women') {
        return gender === '👩 Woman';
    }
    
    return false;
}

function canPostInCategory(category) {
    const gender = getUserGender();
    
    if (currentUserData?.isAdmin === true) return true;
    
    if (category === 'struggles' || category === 'fun' || category === 'learning') {
        return true;
    }
    
    if (category === 'men') {
        return gender === '🧔 Man';
    }
    
    if (category === 'women') {
        return gender === '👩 Woman';
    }
    
    return false;
}

// ============================================
// CHECK USERNAME AVAILABILITY
// ============================================
async function checkUsernameAvailability(username) {
    if (!username || username.length < 2) return false;
    try {
        const snapshot = await db.collection('users')
            .where('name', '==', username)
            .get();
        return snapshot.empty;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// ============================================
// SWITCH CATEGORY
// ============================================
function switchCategory(category) {
    console.log('🔄 Switching to category:', category);
    
    if (!currentUser) {
        // Show login message for guests
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding:50px 20px;background:#fef3c7;border-radius:16px;border-left:4px solid #d97706;">
                    <div class="big-emoji">🔒</div>
                    <h3 style="color:#1a4a4a;">Login Required</h3>
                    <p style="color:#4a5568;">Please log in or join to read and share stories.</p>
                    <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="openModal('login')">🔐 Log In</button>
                        <button class="btn btn-secondary" onclick="openModal('signup')">📝 Join</button>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    if (!canSeeCategory(category)) {
        alert('⚠️ You don\'t have permission to view this category.');
        return;
    }
    
    currentCategory = category;
    
    document.querySelectorAll('.tab').forEach((tab) => {
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    const url = new URL(window.location);
    url.searchParams.set('cat', category);
    window.history.pushState({ category: category }, '', url);
    
    loadStories();
}

// ============================================
// AUTH FUNCTIONS
// ============================================

function openModal(mode) {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const signupFields = document.getElementById('signupFields');
    const switchLink = document.getElementById('authSwitch');
    const error = document.getElementById('authError');
    const success = document.getElementById('authSuccess');

    if (error) error.textContent = '';
    if (success) success.textContent = '';
    
    const fields = ['authEmail', 'authPassword', 'authName', 'authFavorites', 'authCountry'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const strengthDiv = document.getElementById('passwordStrength');
    if (strengthDiv) strengthDiv.innerHTML = '';

    if (mode === 'login') {
        title.textContent = '🔐 Welcome Back';
        submitBtn.textContent = '🚀 Log In';
        if (signupFields) signupFields.style.display = 'none';
        if (switchLink) {
            switchLink.innerHTML = `Don't have an account? <strong>Sign Up</strong>`;
            switchLink.dataset.mode = 'signup';
        }
    } else {
        title.textContent = '📝 Join The Harbor';
        submitBtn.textContent = '🚀 Create Account';
        if (signupFields) signupFields.style.display = 'block';
        populateCountryDatalist();
        if (switchLink) {
            switchLink.innerHTML = `Already have an account? <strong>Log In</strong>`;
            switchLink.dataset.mode = 'login';
        }
    }

    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function toggleAuthMode() {
    const switchLink = document.getElementById('authSwitch');
    if (!switchLink) return;
    const mode = switchLink.dataset.mode;
    closeModal();
    setTimeout(() => openModal(mode), 200);
}

function checkPasswordOnType() {
    const password = document.getElementById('authPassword');
    const strengthDiv = document.getElementById('passwordStrength');
    if (!password || !strengthDiv) return;

    const pwd = password.value;
    if (pwd.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }

    const result = checkPasswordStrength(pwd);
    strengthDiv.innerHTML = `
        <div style="margin-top:6px;font-size:0.85rem;">
            <span>Strength: <span style="color:${result.color};font-weight:700;">${result.strength.replace('-', ' ')}</span></span>
            <div style="width:100%;height:4px;background:var(--border-color);border-radius:4px;margin-top:4px;">
                <div style="width:${result.score}%;height:100%;background:${result.color};border-radius:4px;"></div>
            </div>
        </div>
    `;
}

async function checkUsernameOnType() {
    const nameInput = document.getElementById('authName');
    const statusDiv = document.getElementById('usernameStatus');
    if (!nameInput || !statusDiv) return;

    const username = nameInput.value.trim();
    if (username.length < 2) {
        statusDiv.innerHTML = '';
        return;
    }

    const available = await checkUsernameAvailability(username);
    if (available) {
        statusDiv.innerHTML = `<span style="color:#16a34a;">✅ Username is available!</span>`;
    } else {
        statusDiv.innerHTML = `<span style="color:#dc2626;">❌ Username is taken. Please choose another.</span>`;
    }
}

function updateGenderWarning() {
    const genderSelect = document.getElementById('authGender');
    const warning = document.getElementById('genderWarning');
    const text = document.getElementById('genderWarningText');
    if (!genderSelect) return;
    const gender = genderSelect.value;
    if (gender === '🧔 Man') {
        text.innerHTML = '⚠️ As a <strong>Man</strong>, you will only see <strong>Men\'s Harbor</strong> for gender-specific sections. Women\'s Harbor will be hidden. The Storm, Sunny Skies, and The Compass are open to everyone.';
        warning.classList.add('show');
    } else if (gender === '👩 Woman') {
        text.innerHTML = '⚠️ As a <strong>Woman</strong>, you will only see <strong>Women\'s Harbor</strong> for gender-specific sections. Men\'s Harbor will be hidden. The Storm, Sunny Skies, and The Compass are open to everyone.';
        warning.classList.add('show');
    } else {
        text.innerHTML = '⚠️ You will only see <strong>The Storm, Sunny Skies, and The Compass</strong>. Men\'s and Women\'s Harbors are restricted based on gender.';
        warning.classList.add('show');
    }
}

function handleAuth() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const error = document.getElementById('authError');
    const success = document.getElementById('authSuccess');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!emailInput || !passwordInput || !error || !submitBtn) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    error.textContent = '';
    if (success) success.textContent = '';

    if (!email || !email.includes('@') || !email.includes('.')) {
        error.textContent = 'Please enter a valid email address.';
        return;
    }

    if (!password || password.length < 6) {
        error.textContent = 'Password must be at least 6 characters.';
        return;
    }

    const isLogin = submitBtn.textContent.includes('Log In');

    if (!isLogin) {
        const strength = checkPasswordStrength(password);
        if (strength.score < 30) {
            error.textContent = '⚠️ Password is too weak. Please choose a stronger password.';
            return;
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Please wait...';

    if (isLogin) {
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (!user.emailVerified) {
                    error.innerHTML = `
                        ⚠️ Please verify your email first. Check your inbox (and spam folder)!<br>
                        <button onclick="resendVerification()" style="background:none;border:none;color:#1a4a4a;font-weight:600;cursor:pointer;text-decoration:underline;margin-top:4px;">
                            🔄 Resend verification email
                        </button>
                    `;
                    auth.signOut();
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🚀 Log In';
                    return;
                }
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
                window.location.href = 'welcome.html';
            })
            .catch((err) => {
                error.textContent = err.message;
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
            });
    } else {
        const nameInput = document.getElementById('authName');
        const genderSelect = document.getElementById('authGender');
        const favoritesInput = document.getElementById('authFavorites');
        const countryInput = document.getElementById('authCountry');

        const name = nameInput ? nameInput.value.trim() : '';
        const gender = genderSelect ? genderSelect.value : '🙅 Prefer not to say';
        const favorites = favoritesInput ? favoritesInput.value.trim() : '';
        const country = countryInput ? countryInput.value.trim() : '';

        if (!name || name.length < 2) {
            error.textContent = 'Please enter a username (minimum 2 characters).';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        if (!country) {
            error.textContent = 'Please select your country.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        // Check if Terms & Privacy checkbox is checked
        const termsCheckbox = document.getElementById('termsCheckbox');
        if (termsCheckbox && !termsCheckbox.checked) {
            error.textContent = '⚠️ Please agree to the Terms of Service and Privacy Policy.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        checkUsernameAvailability(name)
            .then((available) => {
                if (!available) {
                    error.textContent = '❌ Username is already taken. Please choose another.';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🚀 Create Account';
                    return Promise.reject('Username taken');
                }
                return auth.createUserWithEmailAndPassword(email, password);
            })
            .then((userCredential) => {
                const user = userCredential.user;
                return user.sendEmailVerification().then(() => user);
            })
            .then((user) => {
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    gender: gender,
                    favorites: favorites || 'Not specified',
                    country: country,
                    emergencyNumber: '911',
                    emailVerified: false,
                    isAdmin: false,
                    isPublic: true,
                    goldBalance: 10,
                    goldReceived: 0,
                    goldGiven: 0,
                    followers: [],
                    following: [],
                    storyCount: 0,
                    commentCount: 0,
                    likesReceived: 0,
                    language: 'en',
                    theme: 'light',
                    avatar: '👤',
                    border: 'default',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
                auth.signOut();
                alert(
                    '✅ Verification email sent to ' + email + '!\n\n' +
                    '📧 Please check your inbox and click the verification link.\n\n' +
                    '📌 If you don\'t see the email:\n' +
                    '   • Check your SPAM or JUNK folder\n' +
                    '   • Wait a few minutes and refresh your inbox\n' +
                    '   • Add noreply@the-harbor.com to your contacts\n\n' +
                    '🔑 After verifying, log in to access The Harbor.\n\n' +
                    '💰 You received 10 🪙 gold as a welcome gift!'
                );
            })
            .catch((err) => {
                if (err !== 'Username taken') {
                    error.textContent = err.message;
                }
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
            });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
        sessionStorage.removeItem('hasSeenWelcome');
        window.location.href = 'index.html';
    }
}

function populateCountryDatalist() {
    const datalist = document.getElementById('country-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    countries.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        datalist.appendChild(option);
    });
}

// ============================================
// UPDATE ADMIN LINK VISIBILITY
// ============================================
function updateAdminLink() {
    const adminLink = document.getElementById('adminNavLink');
    const adminBadge = document.getElementById('adminBadge');
    
    if (currentUser && currentUserData && currentUserData.isAdmin === true) {
        if (adminLink) adminLink.style.display = 'inline-block';
        if (adminBadge) adminBadge.style.display = 'inline-block';
    } else {
        if (adminLink) adminLink.style.display = 'none';
        if (adminBadge) adminBadge.style.display = 'none';
    }
}

// ============================================
// LOAD USER REACTIONS
// ============================================
function loadAllUserReactions() {
    if (!currentUser) return Promise.resolve();
    
    console.log('🔄 Loading user reactions...');
    
    return db.collection('users')
        .doc(currentUser.uid)
        .collection('reactions')
        .get()
        .then((snapshot) => {
            userReactions = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                userReactions[doc.id] = data.emojis || [];
            });
            console.log('✅ Loaded reactions for', Object.keys(userReactions).length, 'stories');
            return userReactions;
        })
        .catch((err) => {
            console.error('Error loading user reactions:', err);
            userReactions = {};
            return userReactions;
        });
}

// ============================================
// REACTION ANIMATION
// ============================================
(function addAnimationStyles() {
    if (!document.getElementById('animationStyles')) {
        const style = document.createElement('style');
        style.id = 'animationStyles';
        style.textContent = `
            @keyframes floatUp {
                0% { opacity: 1; transform: translateY(0) scale(0.5) rotate(0deg); }
                50% { opacity: 1; transform: translateY(-150px) scale(1.3) rotate(20deg); }
                100% { opacity: 0; transform: translateY(-350px) scale(1) rotate(-10deg); }
            }
            @keyframes fireworkBurst {
                0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
                100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
            }
            @keyframes sparkleBurst {
                0% { transform: scale(0) rotate(0deg); opacity: 1; }
                100% { transform: scale(1.5) rotate(720deg); opacity: 0; }
            }
            .floating-emoji {
                position: fixed;
                font-size: 3rem;
                pointer-events: none;
                z-index: 9999;
                animation: floatUp 1.5s ease-out forwards;
            }
            .firework-particle {
                position: fixed;
                pointer-events: none;
                z-index: 9998;
                animation: fireworkBurst 0.8s ease-out forwards;
            }
            .sparkle-particle {
                position: fixed;
                pointer-events: none;
                z-index: 9997;
                animation: sparkleBurst 1s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
    }
})();

function createFloatingEmoji(emoji, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    el.style.left = (x + (Math.random() - 0.5) * 200) + 'px';
    el.style.top = (y + (Math.random() - 0.5) * 100) + 'px';
    el.style.fontSize = (2 + Math.random() * 2) + 'rem';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
    
    createReactionFireworks(x, y);
}

function createReactionFireworks(cx, cy) {
    const colors = ['#ff6b6b', '#feca57', '#54a0ff', '#5f27cd', '#ff9ff3', '#00d2d3', '#ff9f43', '#ee5a24', '#27ae60', '#f39c12'];
    
    for (let burst = 0; burst < 3; burst++) {
        setTimeout(() => {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const count = 15 + Math.floor(Math.random() * 25);
            
            for (let i = 0; i < count; i++) {
                const particle = document.createElement('div');
                particle.className = 'firework-particle';
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 150;
                const size = 4 + Math.random() * 8;
                
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                particle.style.background = color;
                particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                particle.style.boxShadow = `0 0 10px ${color}80`;
                particle.style.left = (cx + (Math.random() - 0.5) * 40) + 'px';
                particle.style.top = (cy + (Math.random() - 0.5) * 40) + 'px';
                particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
                particle.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
                
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 1500);
            }
            
            for (let i = 0; i < 5; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle-particle';
                sparkle.style.width = (2 + Math.random() * 4) + 'px';
                sparkle.style.height = (2 + Math.random() * 4) + 'px';
                sparkle.style.background = 'white';
                sparkle.style.borderRadius = '50%';
                sparkle.style.boxShadow = '0 0 6px rgba(255,255,255,0.8)';
                sparkle.style.left = (cx + (Math.random() - 0.5) * 100) + 'px';
                sparkle.style.top = (cy + (Math.random() - 0.5) * 100) + 'px';
                sparkle.style.animationDuration = (1 + Math.random() * 0.5) + 's';
                
                document.body.appendChild(sparkle);
                setTimeout(() => sparkle.remove(), 1600);
            }
        }, burst * 150);
    }
}

// ============================================
// ADD REACTION
// ============================================
function addReaction(storyId, emoji) {
    if (!currentUser) {
        alert('Please log in to react.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
        return;
    }

    if (!userReactions[storyId]) {
        userReactions[storyId] = [];
    }

    const storyRef = db.collection('stories').doc(storyId);
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);

    const hasReacted = userReactions[storyId].includes(emoji);

    const rect = document.getElementById('storiesContainer')?.getBoundingClientRect() || 
                 document.getElementById('storyCard')?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    
    createFloatingEmoji(emoji, x, y);

    const btn = document.getElementById(`reaction-${storyId}-${emoji}`);
    if (btn) btn.disabled = true;

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((doc) => {
            if (!doc.exists) {
                throw new Error('Story not found');
            }
            
            const data = doc.data();
            const reactions = data.reactions || {};
            
            if (hasReacted) {
                reactions[emoji] = Math.max((reactions[emoji] || 0) - 1, 0);
                userReactions[storyId] = userReactions[storyId].filter(e => e !== emoji);
            } else {
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                userReactions[storyId].push(emoji);
            }
            
            transaction.update(storyRef, { reactions: reactions });
            transaction.set(userReactionRef, { 
                emojis: userReactions[storyId],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                storyId: storyId
            }, { merge: true });
        });
    })
    .then(() => {
        if (btn) btn.disabled = false;
        
        const countSpan = document.getElementById(`count-${storyId}-${emoji}`);
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = hasReacted ? currentCount - 1 : currentCount + 1;
        }
        
        if (btn) {
            if (hasReacted) {
                btn.classList.remove('reacted');
                const checkmark = btn.querySelector('.checkmark');
                if (checkmark) checkmark.remove();
            } else {
                btn.classList.add('reacted');
                if (!btn.querySelector('.checkmark')) {
                    btn.innerHTML += ' <span class="checkmark">✅</span>';
                }
            }
        }
        
        if (typeof loadStories === 'function') {
            loadStories();
        }
    })
    .catch((err) => {
        console.error('Error toggling reaction:', err);
        if (btn) btn.disabled = false;
        let message = 'Could not update reaction. ';
        if (err.message === 'Story not found') {
            message += 'The story may have been deleted.';
        } else if (err.message.includes('permission')) {
            message += 'Permission denied. Please refresh and try again.';
        } else {
            message += 'Please try again.';
        }
        alert(message);
    });
}

// ============================================
// TOGGLE REACTION (for story.html)
// ============================================
function toggleReaction(storyId, emoji) {
    if (!currentUser) {
        alert('Please log in to react.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
        return;
    }

    if (!userReactions[storyId]) {
        userReactions[storyId] = [];
    }

    const storyRef = db.collection('stories').doc(storyId);
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);

    const hasReacted = userReactions[storyId].includes(emoji);

    const rect = document.getElementById('storyCard')?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    
    createFloatingEmoji(emoji, x, y);

    const btn = document.getElementById(`reaction-${storyId}-${emoji}`);
    if (btn) btn.disabled = true;

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((doc) => {
            if (!doc.exists) {
                throw new Error('Story not found');
            }
            
            const data = doc.data();
            const reactions = data.reactions || {};
            
            if (hasReacted) {
                reactions[emoji] = Math.max((reactions[emoji] || 0) - 1, 0);
                userReactions[storyId] = userReactions[storyId].filter(e => e !== emoji);
            } else {
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                userReactions[storyId].push(emoji);
            }
            
            transaction.update(storyRef, { reactions: reactions });
            transaction.set(userReactionRef, { 
                emojis: userReactions[storyId],
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                storyId: storyId
            }, { merge: true });
        });
    })
    .then(() => {
        if (btn) btn.disabled = false;
        
        const countSpan = document.getElementById(`count-${storyId}-${emoji}`);
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = hasReacted ? currentCount - 1 : currentCount + 1;
        }
        
        if (btn) {
            if (hasReacted) {
                btn.classList.remove('reacted');
                const checkmark = btn.querySelector('.checkmark');
                if (checkmark) checkmark.remove();
            } else {
                btn.classList.add('reacted');
                if (!btn.querySelector('.checkmark')) {
                    btn.innerHTML += ' <span class="checkmark">✅</span>';
                }
            }
        }
    })
    .catch((err) => {
        console.error('Error toggling reaction:', err);
        if (btn) btn.disabled = false;
        let message = 'Could not update reaction. ';
        if (err.message === 'Story not found') {
            message += 'The story may have been deleted.';
        } else if (err.message.includes('permission')) {
            message += 'Permission denied. Please refresh and try again.';
        } else {
            message += 'Please try again.';
        }
        alert(message);
    });
}

// ============================================
// LOAD STORIES - WITH GUEST RESTRICTIONS
// ============================================
function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    // Guest restriction - show login message
    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state" style="padding:50px 20px;background:#fef3c7;border-radius:16px;border-left:4px solid #d97706;">
                <div class="big-emoji">🔒</div>
                <h3 style="color:#1a4a4a;">Login Required</h3>
                <p style="color:#4a5568;">Please log in or join to read and share stories.</p>
                <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="openModal('login')">🔐 Log In</button>
                    <button class="btn btn-secondary" onclick="openModal('signup')">📝 Join</button>
                </div>
                <p style="margin-top:12px;font-size:0.9rem;color:#718096;">
                    🌊 The Harbor is a safe community for sharing, healing, and growth.
                </p>
            </div>
        `;
        return;
    }

    if (currentUser && !currentUser.emailVerified) {
        container.innerHTML = `
            <div class="empty-state" style="background:#fef3c7;border-radius:16px;padding:30px;border-left:4px solid #d97706;">
                <div class="big-emoji">📧</div>
                <h3>Email Not Verified</h3>
                <p>Please check your inbox (and spam folder) for the verification link.</p>
                <button class="btn btn-primary" onclick="resendVerification()" style="margin-top:12px;">🔄 Resend Verification</button>
            </div>
        `;
        return;
    }

    if (!canSeeCategory(currentCategory)) {
        container.innerHTML = `
            <div class="empty-state" style="background:#fef3c7;border-radius:16px;padding:30px;border-left:4px solid #d97706;">
                <div class="big-emoji">🔒</div>
                <h3>Access Restricted</h3>
                <p>You don't have permission to view this section.</p>
                <button class="btn btn-primary" onclick="switchCategory('all')" style="margin-top:12px;">← Go to All Stories</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div> Loading stories...</div>';

    const gender = getUserGender();
    
    let query = db.collection('stories').where('approved', '==', true);

    if (currentCategory && currentCategory !== 'all') {
        query = query.where('category', '==', currentCategory);
    } else {
        if (gender === '🧔 Man') {
            query = query.where('category', 'in', ['men', 'struggles', 'fun', 'learning']);
        } else if (gender === '👩 Woman') {
            query = query.where('category', 'in', ['women', 'struggles', 'fun', 'learning']);
        } else {
            query = query.where('category', 'in', ['struggles', 'fun', 'learning']);
        }
    }

    query.get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">🌊</div>
                        <h3>No stories in this category yet</h3>
                        <p>Be the first to share your story!</p>
                        ${canPostInCategory(currentCategory) ? 
                            `<a href="submit.html" class="btn btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">📝 Share Your Story</a>` 
                            : ''
                        }
                    </div>
                `;
                return;
            }

            allStories = [];
            snapshot.forEach((doc) => {
                const story = doc.data();
                story.id = doc.id;
                allStories.push(story);
            });

            applyFilters();
        })
        .catch((err) => {
            console.error('Error loading stories:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚠️</div>
                    <h3>Error Loading Stories</h3>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" onclick="loadStories()" style="margin-top:12px;">🔄 Retry</button>
                </div>
            `;
        });
}

// ============================================
// FILTER & PAGINATE
// ============================================
function applyFilters() {
    // Filter by category
    if (currentCategory === 'all') {
        filteredStories = [...allStories];
    } else {
        filteredStories = allStories.filter(s => s.category === currentCategory);
    }

    // Filter by search
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        filteredStories = filteredStories.filter(s =>
            (s.title && s.title.toLowerCase().includes(searchTerm)) ||
            (s.text && s.text.toLowerCase().includes(searchTerm)) ||
            (s.authorName && s.authorName.toLowerCase().includes(searchTerm))
        );
    }

    renderStories();
}

// ============================================
// RENDER STORIES
// ============================================
function renderStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * STORIES_PER_PAGE;
    const end = start + STORIES_PER_PAGE;
    const pageStories = filteredStories.slice(start, end);

    if (pageStories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">🌊</div>
                <h3>No stories found</h3>
                <p>Be the first to share your story!</p>
            </div>
        `;
    } else {
        container.innerHTML = pageStories.map(story => renderStoryCard(story)).join('');
    }

    renderPagination(totalPages);
}

// ============================================
// RENDER STORY CARD
// ============================================
function renderStoryCard(story) {
    const author = story.isAnonymous ? '🕊️ Anonymous' : escapeHTML(story.authorName || 'Someone');
    const categoryNames = {
        'men': '🧔 Men\'s Harbor',
        'women': '👩 Women\'s Harbor',
        'struggles': '🌊 The Storm',
        'fun': '☀️ Sunny Skies',
        'learning': '🧭 The Compass'
    };
    const categoryDisplay = categoryNames[story.category] || story.category;

    const reactions = story.reactions || {};
    const emojis = ['❤️', '🙏', '😢', '💪', '🤗', '🌊', '🕊️', '👊'];

    let reactionButtons = '';
    emojis.forEach((emoji) => {
        const count = reactions[emoji] || 0;
        const hasReacted = userReactions[story.id] && userReactions[story.id].includes(emoji);
        reactionButtons += `
            <button class="btn-action btn-edit ${hasReacted ? 'reacted' : ''}" 
                    id="reaction-${story.id}-${emoji}" 
                    onclick="addReaction('${story.id}', '${emoji}')">
                ${emoji} <span class="count" id="count-${story.id}-${emoji}">${count}</span>
                ${hasReacted ? '<span class="checkmark">✅</span>' : ''}
            </button>
        `;
    });

    const time = story.createdAt ? story.createdAt.toDate().toLocaleDateString() : 'Recently';
    const storyText = story.text || '';
    const excerpt = storyText.length > 200 ? escapeHTML(storyText.substring(0, 200)) + '...' : escapeHTML(storyText);
    const showReadMore = storyText.length > 200;

    return `
        <div class="story-card" data-story-id="${story.id}">
            <div class="story-header">
                <div class="story-author-info" onclick="viewProfile('${story.userId}')">
                    <div class="story-avatar">${(story.authorName || 'A')[0].toUpperCase()}</div>
                    <div class="story-meta">
                        <span class="story-author-name">${author}</span>
                        <span class="story-date">📅 ${time}</span>
                    </div>
                </div>
                <div class="story-badges">
                    <span class="visibility-badge ${story.visibility === 'public' ? 'badge-public' : 'badge-private'}">
                        ${story.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                    </span>
                    ${story.goldReceived > 0 ? `<span class="gold-badge">${story.goldReceived} 🪙</span>` : ''}
                </div>
            </div>

            <h3 class="story-title">${escapeHTML(story.title || 'Untitled')}</h3>
            <div class="story-content">
                <p>${excerpt}</p>
                ${showReadMore ? `
                    <button class="read-more-btn" onclick="toggleReadMore('${story.id}')">Read More ▼</button>
                    <div class="story-full-content" id="fullContent-${story.id}">
                        ${escapeHTML(storyText.substring(200))}
                        <button class="read-less-btn" onclick="toggleReadMore('${story.id}')">Show Less ▲</button>
                    </div>
                ` : ''}
            </div>

            ${story.tags && story.tags.length ? `
                <div class="story-tags">
                    ${story.tags.map(tag => `<span class="story-tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}

            <div class="story-actions">
                ${reactionButtons}
                <button class="btn-action btn-edit" onclick="openCommentSection('${story.id}')">
                    💬 ${story.commentCount || 0}
                </button>
                ${currentUser && story.userId === currentUser.uid ? `
                    <button class="btn-action btn-edit" onclick="openEditModal('${story.id}')">✏️ Edit</button>
                    <button class="btn-action btn-delete" onclick="deleteStory('${story.id}')">🗑️ Delete</button>
                    <button class="btn-action btn-visibility ${story.visibility === 'private' ? 'private' : ''}" 
                            onclick="toggleVisibility('${story.id}')">
                        ${story.visibility === 'public' ? '🔒 Make Private' : '🌍 Make Public'}
                    </button>
                ` : ''}
                ${currentUser && story.userId !== currentUser.uid ? `
                    <button class="btn-action btn-edit" onclick="openGoldModal('${story.id}')">🪙 Donate Gold</button>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================
// READ MORE TOGGLE
// ============================================
function toggleReadMore(storyId) {
    const fullContent = document.getElementById('fullContent-' + storyId);
    const readMoreBtn = fullContent?.previousElementSibling;
    if (!fullContent) return;

    if (fullContent.style.display === 'block') {
        fullContent.style.display = 'none';
        if (readMoreBtn) readMoreBtn.textContent = 'Read More ▼';
    } else {
        fullContent.style.display = 'block';
        if (readMoreBtn) readMoreBtn.textContent = 'Read Less ▲';
    }
}

function openCommentSection(storyId) {
    // Redirect to story page with comments
    window.location.href = 'story.html?id=' + storyId + '#comments';
}

function viewProfile(userId) {
    if (userId) {
        window.location.href = 'profile.html?uid=' + userId;
    }
}

// ============================================
// PAGINATION
// ============================================
function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ Prev</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="active">${i}</button>`;
        } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            html += `<button onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-info">…</span>`;
        }
    }

    html += `
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ▶</button>
        <span class="page-info">Page ${currentPage} of ${totalPages}</span>
    `;

    container.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderStories();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// CATEGORY SWITCH
// ============================================
function switchCategory(category) {
    if (!currentUser) {
        // Show login message for guests
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding:50px 20px;background:#fef3c7;border-radius:16px;border-left:4px solid #d97706;">
                    <div class="big-emoji">🔒</div>
                    <h3 style="color:#1a4a4a;">Login Required</h3>
                    <p style="color:#4a5568;">Please log in or join to read and share stories.</p>
                    <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="openModal('login')">🔐 Log In</button>
                        <button class="btn btn-secondary" onclick="openModal('signup')">📝 Join</button>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    if (!canSeeCategory(category)) {
        alert('⚠️ You don\'t have permission to view this category.');
        return;
    }
    
    currentCategory = category;
    currentPage = 1;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-category="${category}"]`)?.classList.add('active');
    
    const url = new URL(window.location);
    url.searchParams.set('cat', category);
    window.history.pushState({ category: category }, '', url);
    
    loadStories();
}

// ============================================
// SEARCH
// ============================================
function searchStories() {
    if (!currentUser) {
        alert('⚠️ Please log in to search stories.');
        return;
    }
    currentPage = 1;
    applyFilters();
}

// ============================================
// EDIT FUNCTIONS
// ============================================
function openEditModal(storyId) {
    if (!currentUser) {
        alert('Please log in to edit.');
        return;
    }
    
    const story = allStories.find(s => s.id === storyId);
    if (!story) return;
    
    if (story.userId !== currentUser.uid) {
        alert('You do not have permission to edit this story.');
        return;
    }

    currentEditId = storyId;
    document.getElementById('editTitle').value = story.title || '';
    document.getElementById('editContent').value = story.text || '';
    document.getElementById('editError').textContent = '';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditId = null;
}

function saveEdit() {
    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();

    if (!title || !content) {
        document.getElementById('editError').textContent = '⚠️ Title and content are required.';
        return;
    }

    if (title.length < 3) {
        document.getElementById('editError').textContent = '⚠️ Title must be at least 3 characters.';
        return;
    }

    if (content.length < 10) {
        document.getElementById('editError').textContent = '⚠️ Content must be at least 10 characters.';
        return;
    }

    db.collection('stories').doc(currentEditId).update({
        title: title,
        text: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        closeEditModal();
        loadStories();
        alert('✅ Story updated successfully!');
    }).catch((error) => {
        document.getElementById('editError').textContent = '❌ ' + error.message;
    });
}

// ============================================
// DELETE STORY
// ============================================
function deleteStory(storyId) {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }
    
    const story = allStories.find(s => s.id === storyId);
    if (!story) return;
    
    if (story.userId !== currentUser.uid) {
        alert('You do not have permission to delete this story.');
        return;
    }

    if (!confirm('⚠️ Are you sure you want to delete this story? This cannot be undone.')) return;

    db.collection('stories').doc(storyId).delete()
        .then(() => {
            loadStories();
            alert('✅ Story deleted successfully.');
        })
        .catch((error) => {
            alert('❌ Error deleting story: ' + error.message);
        });
}

// ============================================
// TOGGLE VISIBILITY
// ============================================
function toggleVisibility(storyId) {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }
    
    const story = allStories.find(s => s.id === storyId);
    if (!story) return;
    
    if (story.userId !== currentUser.uid) {
        alert('You do not have permission to change visibility.');
        return;
    }

    const newVisibility = story.visibility === 'public' ? 'private' : 'public';

    db.collection('stories').doc(storyId).update({
        visibility: newVisibility
    }).then(() => {
        loadStories();
        alert(`✅ Story is now ${newVisibility === 'public' ? 'Public' : 'Private'}.`);
    }).catch((error) => {
        alert('❌ Error updating visibility: ' + error.message);
    });
}

// ============================================
// UPDATE CATEGORY TABS BASED ON GENDER
// ============================================
function updateCategoryTabs() {
    const tabs = document.querySelectorAll('.tab');
    const gender = getUserGender();
    
    tabs.forEach(tab => {
        const category = tab.dataset.category;
        if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') {
            tab.style.display = 'inline-flex';
        } else if (category === 'men' && gender === '🧔 Man') {
            tab.style.display = 'inline-flex';
        } else if (category === 'women' && gender === '👩 Woman') {
            tab.style.display = 'inline-flex';
        } else {
            tab.style.display = 'none';
        }
    });
}

// ============================================
// UPDATE EMERGENCY BANNER
// ============================================
function updateEmergencyBanner() {
    const banner = document.getElementById('emergencyBanner');
    if (!banner || !currentUserData) return;

    const country = currentUserData.country;
    const emergency = currentUserData.emergencyNumber || '911';
    
    banner.innerHTML = `
        🆘 <strong>Emergency Number for ${country || 'your country'}:</strong> 
        <a href="tel:${emergency}" style="color: #f5d6b3; font-weight: bold; text-decoration: underline;">${emergency}</a>
        ${country ? `(${country})` : ''}
    `;
    banner.style.display = 'block';
}

// ============================================
// AUTH STATE LISTENER
// ============================================
auth.onAuthStateChanged((user) => {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userGenderBadge = document.getElementById('userGenderBadge');
    const verificationBadge = document.getElementById('verificationBadge');

    if (user) {
        currentUser = user;
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        if (user.emailVerified) {
            if (verificationBadge) {
                verificationBadge.textContent = '✅ Verified';
                verificationBadge.className = 'verification-badge verified';
            }
        } else {
            if (verificationBadge) {
                verificationBadge.textContent = '⏳ Unverified';
                verificationBadge.className = 'verification-badge';
            }
        }

        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserData = doc.data();
                    if (userName) userName.textContent = currentUserData.name || 'Friend';
                    if (userGenderBadge) userGenderBadge.textContent = currentUserData.gender || '';
                    
                    if (user.emailVerified && !currentUserData.emailVerified) {
                        db.collection('users').doc(user.uid).update({ emailVerified: true });
                    }

                    updateEmergencyBanner();
                    updateAdminLink();

                    // Load theme
                    if (currentUserData.theme) {
                        if (currentUserData.theme === 'dark') {
                            document.documentElement.setAttribute('data-theme', 'dark');
                        } else {
                            document.documentElement.removeAttribute('data-theme');
                        }
                    }

                    loadAllUserReactions().then(() => {
                        updateCategoryTabs();
                        
                        if (document.getElementById('storiesContainer')) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const cat = urlParams.get('cat') || 'all';
                            currentCategory = cat;
                            
                            if (!canSeeCategory(cat)) {
                                currentCategory = 'all';
                                const url = new URL(window.location);
                                url.searchParams.set('cat', 'all');
                                window.history.pushState({}, '', url);
                            }
                            
                            document.querySelectorAll('.tab').forEach((tab) => {
                                tab.classList.toggle('active', tab.dataset.category === currentCategory);
                            });
                            
                            loadStories();
                        }
                        
                        if (window.location.pathname.includes('profile.html')) {
                            loadProfile();
                        }

                        if (window.location.pathname.includes('admin.html')) {
                            loadAdminPanel();
                        }
                        
                        if (window.location.pathname.includes('activity.html')) {
                            loadActivity();
                        }
                        
                        if (window.location.pathname.includes('suggest.html')) {
                            loadSuggestions();
                        }
                    });
                }
            })
            .catch((err) => console.error('Error fetching user data:', err));
    } else {
        currentUser = null;
        currentUserData = null;
        userReactions = {};
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        
        const adminLink = document.getElementById('adminNavLink');
        const adminBadge = document.getElementById('adminBadge');
        if (adminLink) adminLink.style.display = 'none';
        if (adminBadge) adminBadge.style.display = 'none';
        
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding:50px 20px;background:#fef3c7;border-radius:16px;border-left:4px solid #d97706;">
                    <div class="big-emoji">🔒</div>
                    <h3 style="color:#1a4a4a;">Login Required</h3>
                    <p style="color:#4a5568;">Please log in or join to read and share stories.</p>
                    <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="openModal('login')">🔐 Log In</button>
                        <button class="btn btn-secondary" onclick="openModal('signup')">📝 Join</button>
                    </div>
                </div>
            `;
        }
        
        // Apply guest restrictions
        checkGuestRestrictions();
    }
});

// ============================================
// LOAD USER REACTIONS (for single story)
// ============================================
function loadUserReactions(storyId) {
    if (!currentUser) return;
    
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);
        
    userReactionRef.get()
        .then((doc) => {
            if (doc.exists) {
                userReactions[storyId] = doc.data().emojis || [];
                const emojis = ['❤️', '🙏', '😢', '💪', '🤗', '🌊', '🕊️', '👊'];
                emojis.forEach((emoji) => {
                    const btn = document.getElementById(`reaction-${storyId}-${emoji}`);
                    if (btn && userReactions[storyId].includes(emoji)) {
                        btn.classList.add('reacted');
                        if (!btn.querySelector('.checkmark')) {
                            btn.innerHTML += ' <span class="checkmark">✅</span>';
                        }
                    }
                });
            }
        })
        .catch((err) => console.error('Error loading user reactions:', err));
}

// ============================================
// INIT - DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready — The Harbor (NEXT-GEN)');
    
    // Guest restrictions
    checkGuestRestrictions();

    // Modal close on outside click
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }

    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) closeEditModal();
        });
    }

    // Password strength
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordOnType);
    }

    const nameInput = document.getElementById('authName');
    if (nameInput) {
        nameInput.addEventListener('input', checkUsernameOnType);
    }

    // Enter key for auth
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const modal = document.getElementById('authModal');
            if (modal && modal.style.display === 'flex') {
                handleAuth();
            }
        }
        if (e.key === 'Escape') {
            closeModal();
            closeEditModal();
        }
    });

    // Character counters for submit
    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');
    const titleCount = document.getElementById('titleCount');
    const textCount = document.getElementById('textCount');
    
    if (titleInput && titleCount) {
        titleInput.addEventListener('input', function() {
            titleCount.textContent = this.value.length;
        });
        titleInput.addEventListener('focus', function() {
            if (this.value.includes('@')) {
                this.value = '';
                titleCount.textContent = '0';
            }
        });
    }
    
    if (textInput && textCount) {
        textInput.addEventListener('input', function() {
            textCount.textContent = this.value.length;
        });
    }

    // Comment character counter
    const commentText = document.getElementById('commentText');
    const commentCount = document.getElementById('commentCount');
    if (commentText && commentCount) {
        commentText.addEventListener('input', function() {
            commentCount.textContent = this.value.length;
        });
    }

    // Search on Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                searchStories();
            }
        });
    }

    // Populate country datalist
    populateCountryDatalist();

    // Load page-specific content
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();
    }

    if (window.location.pathname.includes('story.html')) {
        loadStory();
    }

    if (window.location.pathname.includes('admin.html')) {
        loadAdminPanel();
    }

    if (window.location.pathname.includes('activity.html')) {
        loadActivity();
    }
    
    if (window.location.pathname.includes('suggest.html')) {
        setTimeout(loadSuggestions, 500);
    }

    console.log('✅ All event listeners attached');
});
