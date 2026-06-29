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
    
    // Admin can see everything
    if (currentUserData?.isAdmin === true) return true;
    
    // Everyone can see these
    if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') {
        return true;
    }
    
    // Men's Harbor - only men
    if (category === 'men') {
        return gender === '🧔 Man';
    }
    
    // Women's Harbor - only women
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
// SWITCH CATEGORY - FIXED WITH GENDER CHECK
// ============================================
function switchCategory(category) {
    console.log('🔄 Switching to category:', category);
    
    // Check permission
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

    if (error) error.textContent = '';
    
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
            <div style="width:100%;height:4px;background:#e8ddd0;border-radius:4px;margin-top:4px;">
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
        statusDiv.innerHTML = `<span style="color:#27ae60;">✅ Username is available!</span>`;
    } else {
        statusDiv.innerHTML = `<span style="color:#c0392b;">❌ Username is taken. Please choose another.</span>`;
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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
                auth.signOut();
                // ✅ SHOW VERIFICATION MESSAGE WITH SPAM FOLDER REMINDER
                alert(
                    '✅ Verification email sent to ' + email + '!\n\n' +
                    '📧 Please check your inbox and click the verification link.\n\n' +
                    '📌 If you don\'t see the email:\n' +
                    '   • Check your SPAM or JUNK folder\n' +
                    '   • Wait a few minutes and refresh your inbox\n' +
                    '   • Add noreply@the-harbor.com to your contacts\n\n' +
                    '🔑 After verifying, log in to access The Harbor.'
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
// REACTION ANIMATION - FIXED
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
// ADD REACTION - WITH ANIMATION
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
            
            if (userReactions[storyId] && userReactions[storyId].length > 0) {
                transaction.set(userReactionRef, { 
                    emojis: userReactions[storyId],
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    storyId: storyId
                });
            } else {
                transaction.delete(userReactionRef);
                delete userReactions[storyId];
            }
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
            
            if (userReactions[storyId] && userReactions[storyId].length > 0) {
                transaction.set(userReactionRef, { 
                    emojis: userReactions[storyId],
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    storyId: storyId
                });
            } else {
                transaction.delete(userReactionRef);
                delete userReactions[storyId];
            }
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
        } else {
            message += 'Please try again.';
        }
        alert(message);
    });
}

// ============================================
// LOAD STORIES - FIXED WITH GENDER CHECK
// ============================================
function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state" style="padding:50px 20px;background:#f5d6b3;border-radius:16px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">🔒</div>
                <h3 style="color:#1a4a4a;">Login Required</h3>
                <p style="color:#2d3a3a;">Please log in or join to read and share stories.</p>
                <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn-primary" onclick="openModal('login')" style="background:#c47a5a;border:none;border-radius:50px;padding:12px 28px;color:white;font-weight:700;cursor:pointer;">🔐 Log In</button>
                    <button class="btn-secondary" onclick="openModal('signup')" style="background:transparent;border:2px solid #c47a5a;border-radius:50px;padding:12px 28px;color:#c47a5a;font-weight:700;cursor:pointer;">📝 Join</button>
                </div>
            </div>
        `;
        return;
    }

    if (currentUser && !currentUser.emailVerified) {
        container.innerHTML = `
            <div class="empty-state" style="background:#f5d6b3;border-radius:16px;padding:30px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">📧</div>
                <h3>Email Not Verified</h3>
                <p>Please check your inbox (and spam folder) for the verification link.</p>
                <button class="btn-primary" onclick="resendVerification()" style="margin-top:12px;">🔄 Resend Verification</button>
            </div>
        `;
        return;
    }

    // Check gender permission
    if (!canSeeCategory(currentCategory)) {
        container.innerHTML = `
            <div class="empty-state" style="background:#f5d6b3;border-radius:16px;padding:30px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">🔒</div>
                <h3>Access Restricted</h3>
                <p>You don't have permission to view this section.</p>
                <a href="?cat=all" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">← Go to All Stories</a>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading">⏳ Loading stories...</div>';

    let query = db.collection('stories')
        .where('approved', '==', true);

    if (currentCategory && currentCategory !== 'all') {
        query = query.where('category', '==', currentCategory);
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
                            `<a href="submit.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">📝 Share Your Story</a>` 
                            : ''
                        }
                    </div>
                `;
                return;
            }

            let stories = [];
            snapshot.forEach((doc) => {
                const story = doc.data();
                story.id = doc.id;
                stories.push(story);
            });

            stories.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            stories = stories.slice(0, 50);

            let html = '';
            stories.forEach((story) => {
                html += renderStoryCard(story);
            });
            container.innerHTML = html;
            
            console.log(`✅ Loaded ${stories.length} stories for category: ${currentCategory}`);
        })
        .catch((err) => {
            console.error('Error loading stories:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚠️</div>
                    <h3>Error Loading Stories</h3>
                    <p>${err.message}</p>
                    <button class="btn-primary" onclick="loadStories()" style="margin-top:12px;">🔄 Retry</button>
                </div>
            `;
        });
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
            <button class="emoji-btn ${hasReacted ? 'reacted' : ''}" 
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

    return `
        <div class="story-card" data-story-id="${story.id}">
            <div class="story-title">${escapeHTML(story.title || 'Untitled')}</div>
            <div class="story-meta">
                <span>✍️ ${author}</span>
                <span class="category-badge">${categoryDisplay}</span>
                <span>📅 ${time}</span>
            </div>
            <div class="story-text">${excerpt}</div>
            <div class="story-actions">
                ${reactionButtons}
                <a class="comment-link" href="story.html?id=${story.id}">💬 ${story.commentCount || 0} comments</a>
            </div>
        </div>
    `;
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

                    loadAllUserReactions().then(() => {
                        // Update category tabs based on gender
                        updateCategoryTabs();
                        
                        if (document.getElementById('storiesContainer')) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const cat = urlParams.get('cat') || 'all';
                            currentCategory = cat;
                            
                            // Check if user can see this category
                            if (!canSeeCategory(cat)) {
                                currentCategory = 'all';
                                // Update URL
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
        
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding:50px 20px;background:#f5d6b3;border-radius:16px;border-left:4px solid #c47a5a;">
                    <div class="big-emoji">🔒</div>
                    <h3 style="color:#1a4a4a;">Login Required</h3>
                    <p style="color:#2d3a3a;">Please log in or join to read and share stories.</p>
                    <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn-primary" onclick="openModal('login')" style="background:#c47a5a;border:none;border-radius:50px;padding:12px 28px;color:white;font-weight:700;cursor:pointer;">🔐 Log In</button>
                        <button class="btn-secondary" onclick="openModal('signup')" style="background:transparent;border:2px solid #c47a5a;border-radius:50px;padding:12px 28px;color:#c47a5a;font-weight:700;cursor:pointer;">📝 Join</button>
                    </div>
                </div>
            `;
        }
    }
});

// ============================================
// UPDATE CATEGORY TABS BASED ON GENDER
// ============================================
function updateCategoryTabs() {
    const tabs = document.querySelectorAll('.tab');
    const gender = getUserGender();
    
    tabs.forEach(tab => {
        const category = tab.dataset.category;
        if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') {
            tab.style.display = 'inline-block';
        } else if (category === 'men' && gender === '🧔 Man') {
            tab.style.display = 'inline-block';
        } else if (category === 'women' && gender === '👩 Woman') {
            tab.style.display = 'inline-block';
        } else if (category === 'men' && gender !== '🧔 Man') {
            tab.style.display = 'none';
        } else if (category === 'women' && gender !== '👩 Woman') {
            tab.style.display = 'none';
        } else {
            tab.style.display = 'inline-block';
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
// LOAD ACTIVITY
// ============================================
function loadActivity() {
    const container = document.getElementById('activityContainer');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">🔐</div>
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your activity.</p>
                <button class="btn-primary" onclick="openModal('login')" style="margin-top:12px;">Log In</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading">⏳ Loading activity...</div>';

    const storiesPromise = db.collection('stories')
        .where('userId', '==', currentUser.uid)
        .where('approved', '==', true)
        .get();

    const commentsPromise = db.collection('comments')
        .where('userId', '==', currentUser.uid)
        .where('approved', '==', true)
        .get();

    const reactionsPromise = db.collection('users')
        .doc(currentUser.uid)
        .collection('reactions')
        .get();

    Promise.all([storiesPromise, commentsPromise, reactionsPromise])
        .then((results) => {
            const storiesSnapshot = results[0];
            const commentsSnapshot = results[1];
            const reactionsSnapshot = results[2];
            const activities = [];

            storiesSnapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                data.type = 'story';
                data.timestamp = data.createdAt ? data.createdAt.toDate() : new Date();
                data.title = data.title || 'Untitled';
                data.text = data.text || '';
                activities.push(data);
            });

            commentsSnapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                data.type = 'comment';
                data.timestamp = data.createdAt ? data.createdAt.toDate() : new Date();
                data.text = data.text || '';
                data.storyId = data.storyId || '';
                activities.push(data);
            });

            const reactionPromises = [];
            reactionsSnapshot.forEach((doc) => {
                const data = doc.data();
                data.storyId = doc.id;
                data.type = 'reaction';
                data.timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                data.emojis = data.emojis || [];
                
                const storyPromise = db.collection('stories').doc(data.storyId).get()
                    .then((storyDoc) => {
                        if (storyDoc.exists) {
                            const storyData = storyDoc.data();
                            data.storyTitle = storyData.title || 'Untitled';
                            data.storyApproved = storyData.approved || false;
                        } else {
                            data.storyTitle = 'Deleted Story';
                            data.storyApproved = false;
                        }
                        return data;
                    })
                    .catch(() => {
                        data.storyTitle = 'Unknown Story';
                        data.storyApproved = false;
                        return data;
                    });
                reactionPromises.push(storyPromise);
            });

            return Promise.all(reactionPromises).then((reactionsWithTitles) => {
                activities.push(...reactionsWithTitles);
                
                activities.sort((a, b) => {
                    const ta = a.timestamp ? a.timestamp.getTime() : 0;
                    const tb = b.timestamp ? b.timestamp.getTime() : 0;
                    return tb - ta;
                });

                document.getElementById('countAll').textContent = activities.length;
                document.getElementById('countStories').textContent = storiesSnapshot.size;
                document.getElementById('countComments').textContent = commentsSnapshot.size;
                document.getElementById('countReactions').textContent = reactionsSnapshot.size;

                window.allActivities = activities;
                
                const currentTab = document.querySelector('.activity-tab.active')?.dataset.tab || 'all';
                renderActivities(currentTab);
            });
        })
        .catch((err) => {
            console.error('Error loading activity:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚠️</div>
                    <h3>Error Loading Activity</h3>
                    <p>${err.message}</p>
                    <button class="btn-primary" onclick="loadActivity()" style="margin-top:12px;">🔄 Retry</button>
                </div>
            `;
        });
}

// ============================================
// RENDER ACTIVITIES
// ============================================
function renderActivities(tab) {
    const container = document.getElementById('activityContainer');
    if (!container) return;

    const allActivities = window.allActivities || [];
    
    let filtered = allActivities;

    if (tab === 'stories') {
        filtered = allActivities.filter(a => a.type === 'story');
    } else if (tab === 'comments') {
        filtered = allActivities.filter(a => a.type === 'comment');
    } else if (tab === 'reactions') {
        filtered = allActivities.filter(a => a.type === 'reaction');
    }

    if (filtered.length === 0) {
        const messages = {
            'all': 'No activity yet. Start sharing your stories!',
            'stories': 'You haven\'t shared any stories yet.',
            'comments': 'You haven\'t commented on any stories yet.',
            'reactions': 'You haven\'t reacted to any stories yet.'
        };
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">📭</div>
                <h3>No Activity</h3>
                <p>${messages[tab] || 'No activity found.'}</p>
                <a href="submit.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">📝 Share Your Story</a>
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach((item) => {
        html += renderActivityItem(item);
    });
    container.innerHTML = html;
}

// ============================================
// RENDER ACTIVITY ITEM
// ============================================
function renderActivityItem(item) {
    let icon = '📋';
    let badge = '';
    let title = '';
    let meta = '';
    let excerpt = '';
    let storyId = '';

    const time = item.timestamp ? item.timestamp.toLocaleString() : 'Recently';

    if (item.type === 'story') {
        icon = '📝';
        badge = '<span class="badge badge-story">Story</span>';
        title = escapeHTML(item.title || 'Untitled');
        meta = '✍️ Published on ' + time;
        excerpt = escapeHTML((item.text || '').substring(0, 120)) + (item.text && item.text.length > 120 ? '...' : '');
        storyId = item.id;
    } else if (item.type === 'comment') {
        icon = '💬';
        badge = '<span class="badge badge-comment">Comment</span>';
        title = 'Commented on a story';
        meta = '💬 Posted on ' + time;
        excerpt = escapeHTML((item.text || '').substring(0, 120)) + (item.text && item.text.length > 120 ? '...' : '');
        storyId = item.storyId;
    } else if (item.type === 'reaction') {
        icon = '❤️';
        badge = '<span class="badge badge-reaction">Reaction</span>';
        const emojis = item.emojis || [];
        const storyTitle = item.storyTitle || 'a story';
        title = 'Reacted to "' + escapeHTML(storyTitle) + '"';
        meta = '❤️ ' + emojis.join(' ') + ' · ' + time;
        excerpt = 'You reacted to this story with ' + emojis.length + ' emoji' + (emojis.length > 1 ? 's' : '');
        storyId = item.storyId;
    }

    const viewButton = (storyId && item.type !== 'reaction') || (storyId && item.storyApproved !== false) ? 
        `<a href="story.html?id=${storyId}" class="go-link">🔗 View Story</a>` : 
        (item.type === 'reaction' && item.storyApproved === false ? 
            '<span class="go-link" style="opacity:0.5;cursor:default;">🔗 Story pending</span>' : 
            '');

    return `
        <div class="activity-item" onclick="goToStory('${storyId}')">
            <div class="icon">${icon}</div>
            <div class="content">
                <div class="title">${title} ${badge}</div>
                <div class="meta">${meta}</div>
                <div class="excerpt">${excerpt}</div>
            </div>
            ${viewButton}
        </div>
    `;
}

// ============================================
// SWITCH ACTIVITY TAB
// ============================================
function switchTab(tab) {
    document.querySelectorAll('.activity-tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderActivities(tab);
}

// ============================================
// GO TO STORY
// ============================================
function goToStory(storyId) {
    if (storyId) {
        window.location.href = 'story.html?id=' + storyId;
    }
}

// ============================================
// SEARCH STORIES
// ============================================
function searchStories() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    if (!currentUser) {
        alert('Please log in to search stories.');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        loadStories();
        return;
    }

    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Searching...</div>';

    const searchTermLower = searchTerm.toLowerCase();
    
    db.collection('stories')
        .where('approved', '==', true)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">🔍</div>
                        <h3>No stories found</h3>
                        <p>Try different keywords.</p>
                    </div>
                `;
                return;
            }

            let matched = [];
            snapshot.forEach((doc) => {
                const story = doc.data();
                story.id = doc.id;
                const searchText = (story.title + ' ' + story.text + ' ' + story.authorName).toLowerCase();
                if (searchText.includes(searchTermLower)) {
                    if (canSeeCategory(story.category)) {
                        matched.push(story);
                    }
                }
            });

            matched.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            if (matched.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">🔍</div>
                        <h3>No stories match "${escapeHTML(searchTerm)}"</h3>
                        <p>Try different keywords.</p>
                    </div>
                `;
                return;
            }

            let html = '';
            matched.forEach((story) => {
                html += renderStoryCard(story);
            });
            container.innerHTML = html;
        })
        .catch((err) => {
            console.error('Search error:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚠️</div>
                    <h3>Search Error</h3>
                    <p>Could not complete search. Please try again.</p>
                    <button class="btn-primary" onclick="loadStories()" style="margin-top:12px;">🔄 Back to Stories</button>
                </div>
            `;
        });
}

// ============================================
// SUBMIT STORY
// ============================================
function submitStory() {
    console.log('📤 Submit story function called');

    if (!currentUser) {
        alert('⚠️ Please log in to share your story.');
        window.location.href = 'index.html';
        return;
    }
    if (!currentUser.emailVerified) {
        alert('⚠️ Please verify your email first. Check your inbox and spam folder.');
        return;
    }

    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');
    const categorySelect = document.getElementById('storyCategory');
    const anonymousCheck = document.getElementById('storyAnonymous');
    const errorDiv = document.getElementById('submitError');
    const successDiv = document.getElementById('submitSuccess');
    const submitBtn = document.getElementById('submitBtn');

    if (errorDiv) errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = '';

    const title = titleInput ? titleInput.value.trim() : '';
    const text = textInput ? textInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : '';
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;

    if (!title || title.length < 3) {
        if (errorDiv) errorDiv.textContent = '📌 Title must be at least 3 characters.';
        return;
    }
    if (title.length > 100) {
        if (errorDiv) errorDiv.textContent = '📌 Title must be under 100 characters.';
        return;
    }
    if (!text || text.length < 10) {
        if (errorDiv) errorDiv.textContent = '📖 Story must be at least 10 characters.';
        return;
    }
    if (text.length > 5000) {
        if (errorDiv) errorDiv.textContent = '📖 Story must be under 5000 characters.';
        return;
    }
    if (!category) {
        if (errorDiv) errorDiv.textContent = '📂 Please select a category.';
        return;
    }

    const gender = currentUserData ? currentUserData.gender : null;
    if (category === 'men' && gender !== '🧔 Man') {
        if (errorDiv) errorDiv.textContent = '⚠️ Men\'s Harbor is for men only.';
        return;
    }
    if (category === 'women' && gender !== '👩 Woman') {
        if (errorDiv) errorDiv.textContent = '⚠️ Women\'s Harbor is for women only.';
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    const inappropriateWords = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'porn', 'nude', 'sex', 'violence', 'kill', 'murder', 'rape'];
    const containsInappropriate = inappropriateWords.some(word => 
        text.toLowerCase().includes(word) || title.toLowerCase().includes(word)
    );

    db.collection('stories').add({
        title: title,
        text: text,
        category: category,
        userId: currentUser.uid,
        authorName: currentUserData ? currentUserData.name : 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {},
        commentCount: 0,
        approved: !containsInappropriate,
        flagged: containsInappropriate,
        flagReason: containsInappropriate ? 'Inappropriate content detected' : ''
    })
    .then((docRef) => {
        console.log('✅ Story saved! ID:', docRef.id);
        if (containsInappropriate) {
            if (successDiv) {
                successDiv.textContent = '⚠️ Your story has been sent for review. It will be published after moderation.';
                successDiv.style.color = '#f39c12';
            }
        } else {
            if (successDiv) {
                successDiv.textContent = '✅ Your story has been shared with the community!';
                successDiv.style.color = '#27ae60';
            }
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Posted!';
        }
        if (titleInput) titleInput.value = '';
        if (textInput) textInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (anonymousCheck) anonymousCheck.checked = false;
        
        const titleCount = document.getElementById('titleCount');
        const textCount = document.getElementById('textCount');
        if (titleCount) titleCount.textContent = '0';
        if (textCount) textCount.textContent = '0';

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    })
    .catch((err) => {
        console.error('❌ Error saving story:', err);
        if (errorDiv) {
            errorDiv.textContent = '❌ Error: ' + err.message;
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Post Story';
        }
    });
}

// ============================================
// LOAD COMMENTS
// ============================================
function loadComments(storyId) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading">⏳ Loading comments...</div>';

    db.collection('comments')
        .where('storyId', '==', storyId)
        .where('approved', '==', true)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:20px;">
                        <p style="color:#7a9e7e;">No comments yet. Be the first to share your thoughts.</p>
                    </div>
                `;
                return;
            }

            const comments = [];
            snapshot.forEach((doc) => {
                const comment = doc.data();
                comment.id = doc.id;
                comments.push(comment);
            });
            
            comments.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            let html = '<h3 style="margin-bottom:16px;">💬 Comments</h3>';
            comments.forEach((comment) => {
                html += renderComment(comment);
            });
            container.innerHTML = html;
        })
        .catch((err) => {
            console.error('Error loading comments:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <p style="color:#c0392b;">⚠️ Error loading comments</p>
                    <button class="btn-primary" onclick="loadComments('${storyId}')" style="margin-top:10px;padding:8px 20px;font-size:0.9rem;">
                        🔄 Retry
                    </button>
                </div>
            `;
        });
}

function renderComment(comment) {
    const author = comment.isAnonymous ? '🕊️ Anonymous' : escapeHTML(comment.authorName || 'Someone');
    const time = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Recently';
    const likes = comment.likes || 0;
    const isOwner = currentUser && comment.userId === currentUser.uid;

    return `
        <div class="comment" id="comment-${comment.id}">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;font-size:0.85rem;color:#7a9e7e;margin-bottom:6px;">
                <span>✍️ ${author}</span>
                <span>📅 ${time}</span>
            </div>
            <div style="font-size:0.95rem;line-height:1.6;">${escapeHTML(comment.text)}</div>
            <div style="margin-top:8px;display:flex;gap:12px;align-items:center;">
                <button class="emoji-btn" onclick="likeComment('${comment.id}')" style="padding:2px 12px;font-size:0.85rem;">
                    👍 <span class="count">${likes}</span>
                </button>
                ${isOwner ? 
                    `<button onclick="deleteComment('${comment.id}')" style="background:#c0392b;color:white;border:none;border-radius:20px;padding:2px 14px;cursor:pointer;font-size:0.75rem;">Delete</button>` 
                    : ''}
            </div>
        </div>
    `;
}

function postComment() {
    if (!currentUser) {
        alert('Please log in to comment.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    const textInput = document.getElementById('commentText');
    const anonymousCheck = document.getElementById('commentAnonymous');
    const error = document.getElementById('commentError');

    if (!textInput || !error) return;

    const text = textInput.value.trim();
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;

    error.textContent = '';

    if (!text || text.length < 1) {
        error.textContent = 'Please write a comment.';
        return;
    }
    if (text.length > 1000) {
        error.textContent = 'Comment must be under 1000 characters.';
        return;
    }

    const inappropriateWords = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'porn', 'nude', 'sex', 'violence', 'kill', 'murder', 'rape'];
    const containsInappropriate = inappropriateWords.some(word => text.toLowerCase().includes(word));

    const submitBtn = document.getElementById('commentSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    db.collection('comments').add({
        storyId: storyId,
        text: text,
        userId: currentUser.uid,
        authorName: currentUserData ? currentUserData.name : 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        approved: !containsInappropriate,
        flagged: containsInappropriate
    })
    .then(() => {
        db.collection('stories').doc(storyId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💬 Post Comment';
        }
        if (textInput) textInput.value = '';
        const commentCount = document.getElementById('commentCount');
        if (commentCount) commentCount.textContent = '0';
        
        if (containsInappropriate) {
            alert('⚠️ Your comment has been sent for review. It will appear after moderation.');
        }
        
        loadComments(storyId);
    })
    .catch((err) => {
        error.textContent = err.message;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💬 Post Comment';
        }
    });
}

function likeComment(commentId) {
    if (!currentUser) {
        alert('Please log in to like comments.');
        return;
    }

    db.collection('comments').doc(commentId).update({
        likes: firebase.firestore.FieldValue.increment(1)
    })
    .then(() => {
        const urlParams = new URLSearchParams(window.location.search);
        loadComments(urlParams.get('id'));
    })
    .catch((err) => {
        console.error('Error liking comment:', err);
        alert('Could not like comment. Please try again.');
    });
}

function deleteComment(commentId) {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    if (!confirm('Are you sure you want to delete this comment?')) return;

    db.collection('comments').doc(commentId).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('Comment not found.');
                return;
            }
            
            const commentData = doc.data();
            if (commentData.userId !== currentUser.uid && !currentUserData?.isAdmin) {
                alert('You do not have permission to delete this comment.');
                return;
            }
            
            return db.collection('comments').doc(commentId).delete();
        })
        .then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            loadComments(urlParams.get('id'));
        })
        .catch((err) => {
            console.error('Error deleting comment:', err);
            alert('Could not delete comment: ' + err.message);
        });
}

// ============================================
// PROFILE PAGE
// ============================================
function loadProfile() {
    if (!currentUser) {
        const content = document.getElementById('profileContent');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">🔐</div>
                    <h3>Please Log In</h3>
                    <p>You need to be logged in to view your profile.</p>
                    <button class="btn-primary" onclick="openModal('login')" style="margin-top:12px;">Log In</button>
                </div>
            `;
        }
        return;
    }

    const content = document.getElementById('profileContent');
    if (!content) return;
    
    content.innerHTML = '<div class="loading">⏳ Loading profile...</div>';

    db.collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (!doc.exists) {
                content.innerHTML = '<div class="empty-state"><h3>Profile not found</h3></div>';
                return;
            }

            const userData = doc.data();
            
            return db.collection('stories')
                .where('userId', '==', currentUser.uid)
                .where('approved', '==', true)
                .get()
                .then((storiesSnapshot) => {
                    const stories = [];
                    storiesSnapshot.forEach((s) => {
                        const storyData = s.data();
                        storyData.id = s.id;
                        stories.push(storyData);
                    });
                    stories.sort((a, b) => {
                        const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                        const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                        return timeB - timeA;
                    });
                    return { userData, stories };
                });
        })
        .then((result) => {
            const { userData, stories } = result;
            
            let html = `
                <div class="card" style="text-align:center;">
                    <span style="font-size:4rem;">👤</span>
                    <h2 style="color:#1a4a4a;">${escapeHTML(userData.name)}</h2>
                    <p style="color:#7a9e7e;">${escapeHTML(userData.gender || '')}</p>
                    <p style="color:#7a9e7e;">📍 ${escapeHTML(userData.country || 'Not specified')}</p>
                    <p style="color:#7a9e7e;font-size:0.9rem;">❤️ ${escapeHTML(userData.favorites || 'Not specified')}</p>
                    <p style="color:#a8a09a;font-size:0.8rem;">Member since ${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'Recently'}</p>
                    ${userData.isAdmin ? '<p style="color:#c47a5a;font-weight:700;">👑 Admin</p>' : ''}
                </div>
            `;

            html += `
                <div style="margin-top:24px;">
                    <h3 style="color:#1a4a4a;">📝 Your Stories (${stories.length})</h3>
            `;

            if (stories.length === 0) {
                html += `
                    <div class="empty-state" style="padding:20px;">
                        <p>You haven't shared any stories yet.</p>
                        <a href="submit.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:10px;">📝 Write Your First Story</a>
                    </div>
                `;
            } else {
                stories.forEach((story) => {
                    const categoryNames = {
                        'men': '🧔 Men\'s Harbor',
                        'women': '👩 Women\'s Harbor',
                        'struggles': '🌊 The Storm',
                        'fun': '☀️ Sunny Skies',
                        'learning': '🧭 The Compass'
                    };
                    const categoryDisplay = categoryNames[story.category] || story.category;
                    const time = story.createdAt ? story.createdAt.toDate().toLocaleDateString() : 'Recently';
                    
                    html += `
                        <div class="story-card" style="margin-bottom:12px;">
                            <div class="story-title">${escapeHTML(story.title)}</div>
                            <div class="story-meta">
                                <span class="category-badge">${categoryDisplay}</span>
                                <span>📅 ${time}</span>
                                <span>💬 ${story.commentCount || 0} comments</span>
                                ${story.isAnonymous ? '🕊️ Anonymous' : '👤 Public'}
                                ${story.flagged ? '⚠️ Flagged' : ''}
                            </div>
                            <div class="story-text">${escapeHTML((story.text || '').substring(0, 150))}${(story.text || '').length > 150 ? '...' : ''}</div>
                            <div style="margin-top:8px;">
                                <a href="story.html?id=${story.id}" class="comment-link">Read more →</a>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
                <div style="text-align:center;margin-top:24px;">
                    <button class="btn-secondary" onclick="logout()" style="border-color:#c0392b;color:#c0392b;">🚪 Logout</button>
                </div>
            `;

            content.innerHTML = html;
        })
        .catch((err) => {
            console.error('Profile load error:', err);
            content.innerHTML = `<div class="empty-state"><h3>Error loading profile</h3><p>${err.message}</p></div>`;
        });
}

// ============================================
// LOAD SINGLE STORY
// ============================================
function loadStory() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    const content = document.getElementById('storyContent');
    
    if (!content) return;
    
    if (!storyId) {
        content.innerHTML = '<div class="empty-state"><h3>No story selected</h3><a href="index.html">Go back home</a></div>';
        return;
    }

    content.innerHTML = '<div class="loading">⏳ Loading story...</div>';

    db.collection('stories').doc(storyId).get()
        .then((doc) => {
            if (!doc.exists) {
                content.innerHTML = '<div class="empty-state"><h3>Story not found</h3><a href="index.html">Go back home</a></div>';
                return;
            }

            const story = doc.data();
            story.id = doc.id;
            
            if (!story.approved && !currentUserData?.isAdmin) {
                content.innerHTML = '<div class="empty-state"><h3>This story is pending review</h3><a href="index.html">Go back home</a></div>';
                return;
            }
            
            content.innerHTML = renderFullStory(story);
            
            if (currentUser) {
                loadUserReactions(storyId);
            }
            
            loadComments(storyId);
        })
        .catch((err) => {
            console.error('Story load error:', err);
            content.innerHTML = `<div class="empty-state"><h3>Error loading story</h3><p>${err.message}</p></div>`;
        });
}

function renderFullStory(story) {
    const author = story.isAnonymous ? '🕊️ Anonymous' : escapeHTML(story.authorName || 'Someone');
    const categoryNames = {
        'men': '🧔 Men\'s Harbor',
        'women': '👩 Women\'s Harbor',
        'struggles': '🌊 The Storm',
        'fun': '☀️ Sunny Skies',
        'learning': '🧭 The Compass'
    };
    const categoryDisplay = categoryNames[story.category] || story.category;
    const time = story.createdAt ? story.createdAt.toDate().toLocaleString() : 'Recently';

    const reactions = story.reactions || {};
    const emojis = ['❤️', '🙏', '😢', '💪', '🤗', '🌊', '🕊️', '👊'];

    let reactionButtons = '';
    emojis.forEach((emoji) => {
        const count = reactions[emoji] || 0;
        const hasReacted = userReactions[story.id] && userReactions[story.id].includes(emoji);
        reactionButtons += `
            <button class="emoji-btn ${hasReacted ? 'reacted' : ''}" 
                    id="reaction-${story.id}-${emoji}" 
                    onclick="toggleReaction('${story.id}', '${emoji}')">
                ${emoji} <span class="count" id="count-${story.id}-${emoji}">${count}</span>
                ${hasReacted ? '<span class="checkmark">✅</span>' : ''}
            </button>
        `;
    });

    return `
        <div class="card" id="storyCard">
            <h2 class="story-title">${escapeHTML(story.title)}</h2>
            <div class="story-meta">
                <span>✍️ ${author}</span>
                <span class="category-badge">${categoryDisplay}</span>
                <span>📅 ${time}</span>
                ${story.flagged ? '<span style="color:#f39c12;">⚠️ Content Warning</span>' : ''}
            </div>
            <div class="story-text" style="font-size:1.1rem;line-height:1.8;white-space:pre-wrap;">${escapeHTML(story.text || '')}</div>
            <div class="story-actions" style="margin-top:20px;padding-top:20px;border-top:2px solid #d4c8b8;">
                ${reactionButtons}
            </div>
            <div style="margin-top:16px;">
                <a href="index.html" class="btn-secondary" style="display:inline-block;text-decoration:none;">← Back to Home</a>
            </div>
        </div>
    `;
}

// ============================================
// ADMIN PANEL
// ============================================
function loadAdminPanel() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    if (!currentUser || !currentUserData?.isAdmin) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">🔒</div>
                <h3>Admin Access Required</h3>
                <p>You don't have permission to view this page.</p>
                <a href="index.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">← Back to Home</a>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div class="card">
            <h2>👑 Admin Panel</h2>
            <p>Welcome, ${escapeHTML(currentUserData.name)}!</p>
            <hr style="margin:20px 0;border-color:#d4c8b8;">
            <h3>📊 Dashboard</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-top:16px;">
                <div style="background:#f5f0eb;padding:20px;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;">📝</div>
                    <div id="totalStories">Loading...</div>
                </div>
                <div style="background:#f5f0eb;padding:20px;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;">💬</div>
                    <div id="totalComments">Loading...</div>
                </div>
                <div style="background:#f5f0eb;padding:20px;border-radius:12px;text-align:center;">
                    <div style="font-size:2rem;">👥</div>
                    <div id="totalUsers">Loading...</div>
                </div>
            </div>
        </div>
    `;
    
    db.collection('stories').where('approved', '==', true).get()
        .then((snapshot) => {
            const el = document.getElementById('totalStories');
            if (el) el.textContent = snapshot.size;
        });
    
    db.collection('comments').where('approved', '==', true).get()
        .then((snapshot) => {
            const el = document.getElementById('totalComments');
            if (el) el.textContent = snapshot.size;
        });
    
    db.collection('users').get()
        .then((snapshot) => {
            const el = document.getElementById('totalUsers');
            if (el) el.textContent = snapshot.size;
        });
}

// ============================================
// EMERGENCY SEARCH
// ============================================
function setupEmergencySearch() {
    const input = document.getElementById('emergencySearch');
    if (!input) return;
    
    const resultDiv = document.getElementById('emergencyResult');
    const noResult = document.getElementById('noResult');
    const resultCountry = document.getElementById('resultCountry');
    const resultNumber = document.getElementById('resultNumber');
    const resultNote = document.getElementById('resultNote');
    
    const emergencyList = document.getElementById('emergency-list');
    if (emergencyList) {
        emergencyList.innerHTML = '';
        const emergencyCountries = [
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
        emergencyCountries.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            emergencyList.appendChild(opt);
        });
    }

    input.addEventListener('input', function() {
        const query = this.value.trim();
        if (!query) {
            resultDiv.style.display = 'none';
            noResult.style.display = 'none';
            return;
        }

        const emergencyCountries = [
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

        let found = emergencyCountries.find(c => c.name.toLowerCase() === query.toLowerCase());
        if (!found) {
            found = emergencyCountries.find(c => c.name.toLowerCase().includes(query.toLowerCase()));
        }
        if (found) {
            resultCountry.textContent = found.name;
            resultNumber.textContent = found.emergency;
            resultNote.textContent = '📞 Emergency Services';
            resultDiv.style.display = 'block';
            noResult.style.display = 'none';
        } else {
            resultDiv.style.display = 'none';
            noResult.style.display = 'block';
        }
    });

    setTimeout(() => {
        const defaultCountry = { name: 'United States', emergency: '911' };
        if (resultDiv) {
            resultCountry.textContent = defaultCountry.name;
            resultNumber.textContent = defaultCountry.emergency;
            resultNote.textContent = '📞 Emergency Services';
            resultDiv.style.display = 'block';
        }
    }, 500);
}

// ============================================
// INIT - DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready — The Harbor (FIXED)');
    
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }

    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordOnType);
    }

    const nameInput = document.getElementById('authName');
    if (nameInput) {
        nameInput.addEventListener('input', checkUsernameOnType);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const modal = document.getElementById('authModal');
            if (modal && modal.style.display === 'flex') {
                handleAuth();
            }
        }
    });

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

    const commentText = document.getElementById('commentText');
    const commentCount = document.getElementById('commentCount');
    if (commentText && commentCount) {
        commentText.addEventListener('input', function() {
            commentCount.textContent = this.value.length;
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                searchStories();
            }
        });
    }

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

    populateCountryDatalist();
    setupEmergencySearch();

    console.log('✅ All event listeners attached');
});
