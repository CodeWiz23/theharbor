// ============================================
// THE HARBOR — MAIN APPLICATION
// ============================================

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBoYWOijOWqjd3d3_NAiSsiGmQ0HokaRGs",
    authDomain: "the-harbor-community.firebaseapp.com",
    projectId: "the-harbor-community",
    storageBucket: "the-harbor-community.firebasestorage.app",
    messagingSenderId: "634248505303",
    appId: "1:634248505303:web:4eb16e6a9f97903420cd92"
};

if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let currentUserData = null;
let allStories = [];
let currentCategory = 'all';
let currentPage = 1;
const STORIES_PER_PAGE = 10;
let userReactions = {};
let selectedGoldAmount = 0;
let currentStoryId = null;

// ============================================
// ESCAPE HTML
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

// ============================================
// SANITIZE INPUT
// ============================================
function sanitizeInput(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
}

// ============================================
// CHECK PASSWORD STRENGTH
// ============================================
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

    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authName').value = '';
    document.getElementById('authCountry').value = '';

    if (mode === 'login') {
        title.textContent = '🔐 Welcome Back';
        submitBtn.textContent = '🚀 Log In';
        signupFields.style.display = 'none';
        switchLink.innerHTML = `Don't have an account? <strong>Sign Up</strong>`;
        switchLink.dataset.mode = 'signup';
    } else {
        title.textContent = '📝 Join The Harbor';
        submitBtn.textContent = '🚀 Create Account';
        signupFields.style.display = 'block';
        switchLink.innerHTML = `Already have an account? <strong>Log In</strong>`;
        switchLink.dataset.mode = 'login';
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
}

function toggleAuthMode() {
    const switchLink = document.getElementById('authSwitch');
    if (!switchLink) return;
    const mode = switchLink.dataset.mode;
    closeModal();
    setTimeout(() => openModal(mode), 200);
}

function handleAuth() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const error = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    error.textContent = '';

    if (!email || !email.includes('@') || !email.includes('.')) {
        error.textContent = 'Please enter a valid email address.';
        return;
    }
    if (!password || password.length < 6) {
        error.textContent = 'Password must be at least 6 characters.';
        return;
    }

    const isLogin = submitBtn.textContent.includes('Log In');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Please wait...';

    if (isLogin) {
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (!user.emailVerified) {
                    error.innerHTML = `
                        ⚠️ Please verify your email first.<br>
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
                location.reload();
            })
            .catch((err) => {
                error.textContent = err.message;
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
            });
    } else {
        const nameInput = document.getElementById('authName');
        const countryInput = document.getElementById('authCountry');
        const genderSelect = document.getElementById('authGender');

        const name = nameInput ? nameInput.value.trim() : '';
        const country = countryInput ? countryInput.value.trim() : '';
        const gender = genderSelect ? genderSelect.value : '🙅 Prefer not to say';

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

        const termsChecked = document.getElementById('termsCheckbox').checked;
        if (!termsChecked) {
            error.textContent = 'You must agree to the Terms and Privacy Policy.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        // Check username availability
        db.collection('users').where('name', '==', name).get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    error.textContent = '❌ Username is already taken.';
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
                const countryData = countries.find(c => c.name === country);
                // CRITICAL FIX: Add uid field
                return db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: name,
                    email: email,
                    gender: gender,
                    favorites: 'Not specified',
                    country: country,
                    emergencyNumber: countryData?.emergency || '911',
                    emailVerified: false,
                    isAdmin: false,
                    isPublic: true,
                    theme: 'light',
                    goldBalance: 10,
                    goldReceived: 0,
                    goldGiven: 0,
                    followers: [],
                    following: [],
                    storyCount: 0,
                    commentCount: 0,
                    likesReceived: 0,
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

function resendVerification() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in first.');
        return;
    }

    user.sendEmailVerification()
        .then(() => {
            alert('✅ Verification email resent to ' + user.email + '!');
        })
        .catch((err) => {
            alert('❌ Error: ' + err.message);
        });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
        window.location.href = 'index.html';
    }
}

// ============================================
// UPDATE GENDER WARNING
// ============================================
function updateGenderWarning() {
    const genderSelect = document.getElementById('authGender');
    const warning = document.getElementById('genderWarning');
    const text = document.getElementById('genderWarningText');
    if (!genderSelect || !warning || !text) return;

    const gender = genderSelect.value;
    if (gender === '🧔 Man') {
        text.innerHTML = '⚠️ As a <strong>Man</strong>, you will only see <strong>Men\'s Harbor</strong> for gender-specific sections.';
        warning.style.display = 'flex';
    } else if (gender === '👩 Woman') {
        text.innerHTML = '⚠️ As a <strong>Woman</strong>, you will only see <strong>Women\'s Harbor</strong> for gender-specific sections.';
        warning.style.display = 'flex';
    } else {
        text.innerHTML = '⚠️ You will only see <strong>The Storm, Sunny Skies, and The Compass</strong>.';
        warning.style.display = 'flex';
    }
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
// THEME MANAGEMENT
// ============================================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    if (newTheme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }

    localStorage.setItem('theme', newTheme);

    // Save to Firestore if logged in
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            theme: newTheme
        }).catch(() => {});
    }

    // Update button text
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    console.log('🌓 Theme changed to:', newTheme);
}

function applyTheme() {
    // Check localStorage first
    let theme = localStorage.getItem('theme');

    // If no saved theme, check Firestore (if logged in)
    if (!theme && currentUserData?.theme) {
        theme = currentUserData.theme;
    }

    // If still no theme, check system preference
    if (!theme) {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }
    }

    // Apply theme
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    // Update button
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    console.log('🌓 Theme applied:', theme);
}

// ============================================
// LOAD STORIES (FIXED)
// ============================================
function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

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
            </div>
        `;
        return;
    }

    if (!currentUser.emailVerified) {
        container.innerHTML = `
            <div class="empty-state" style="padding:30px;background:#fef3c7;border-radius:16px;border-left:4px solid #d97706;">
                <div class="big-emoji">📧</div>
                <h3>Email Not Verified</h3>
                <p>Please verify your email to read stories.</p>
                <button class="btn btn-primary" onclick="resendVerification()" style="margin-top:12px;">🔄 Resend Verification</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div> Loading stories...</div>';

    const gender = currentUserData?.gender || '';
    let allowedCategories = ['struggles', 'fun', 'learning'];

    if (gender === '🧔 Man') allowedCategories.push('men');
    else if (gender === '👩 Woman') allowedCategories.push('women');
    else allowedCategories.push('men', 'women');

    if (currentCategory !== 'all') {
        allowedCategories = [currentCategory];
    }

    // ===== FIXED: Separate public and private queries =====
    // Query 1: Public stories
    const publicQuery = db.collection('stories')
        .where('visibility', '==', 'public')
        .where('category', 'in', allowedCategories);

    // Query 2: User's own private stories (if they exist)
    const ownQuery = db.collection('stories')
        .where('userId', '==', currentUser.uid)
        .where('visibility', '==', 'private')
        .where('category', 'in', allowedCategories);

    Promise.all([publicQuery.get(), ownQuery.get()])
        .then(([publicSnap, ownSnap]) => {
            const stories = [];

            publicSnap.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                stories.push(data);
            });

            ownSnap.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                stories.push(data);
            });

            if (stories.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">📭</div>
                        <h3>No stories in this category</h3>
                        <p>Be the first to share your story!</p>
                        <a href="submit.html" class="btn btn-primary" style="text-decoration:none;display:inline-block;margin-top:12px;">📝 Share Your Story</a>
                    </div>
                `;
                return;
            }

            stories.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            allStories = stories;
            renderStoriesPage(1);
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
// RENDER STORIES PAGE
// ============================================
function renderStoriesPage(page) {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    currentPage = page;
    const start = (page - 1) * STORIES_PER_PAGE;
    const end = start + STORIES_PER_PAGE;
    const pageStories = allStories.slice(start, end);

    if (pageStories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">📭</div>
                <h3>No stories on this page</h3>
            </div>
        `;
        return;
    }

    let html = '';
    pageStories.forEach((story) => {
        html += renderStoryCard(story);
    });

    container.innerHTML = html;

    // Render pagination
    renderPagination();
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

    const time = story.createdAt ? story.createdAt.toDate().toLocaleDateString() : 'Recently';
    const storyText = story.text || '';
    const excerpt = storyText.length > 300 ? escapeHTML(storyText.substring(0, 300)) + '...' : escapeHTML(storyText);

    const isOwner = currentUser && story.userId === currentUser.uid;

    return `
        <div class="story-card" data-story-id="${story.id}" onclick="window.location.href='story.html?id=${story.id}'">
            <div class="story-title">${escapeHTML(story.title || 'Untitled')}</div>
            <div class="story-meta">
                <span>✍️ ${author}</span>
                <span class="category-badge">${categoryDisplay}</span>
                <span>📅 ${time}</span>
                ${isOwner ? '<span style="color:#c47a5a;">👤 Your Story</span>' : ''}
                ${story.visibility === 'private' ? '<span style="color:#d97706;">🔒 Private</span>' : ''}
            </div>
            <div class="story-content">${excerpt}</div>
            <div class="story-actions">
                ${renderReactions(story.id, reactions)}
                <span class="comment-link">💬 ${story.commentCount || 0}</span>
                ${!isOwner && currentUser ? `<button class="btn-action btn-gold" onclick="event.stopPropagation(); openGoldModal('${story.id}')">🪙</button>` : ''}
            </div>
        </div>
    `;
}

function renderReactions(storyId, reactions) {
    const emojis = ['❤️', '🙏', '😢', '💪', '🤗', '🌊', '🕊️', '👊'];
    let html = '';
    emojis.forEach((emoji) => {
        const count = reactions[emoji] || 0;
        html += `
            <button class="reaction-btn" onclick="event.stopPropagation(); addReaction('${storyId}', '${emoji}')">
                ${emoji} <span class="count">${count}</span>
            </button>
        `;
    });
    return html;
}

// ============================================
// ADD REACTION
// ============================================
function addReaction(storyId, emoji) {
    if (!currentUser) {
        alert('Please log in to react.');
        return;
    }

    const storyRef = db.collection('stories').doc(storyId);

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            const reactions = data.reactions || {};
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            transaction.update(storyRef, { reactions: reactions });
        });
    })
    .then(() => {
        loadStories();
    })
    .catch((err) => {
        console.error('Error adding reaction:', err);
        alert('Could not add reaction. Please try again.');
    });
}

// ============================================
// RENDER PAGINATION
// ============================================
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const totalPages = Math.ceil(allStories.length / STORIES_PER_PAGE);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="renderStoriesPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            ← Previous
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="${i === currentPage ? 'active' : ''}" onclick="renderStoriesPage(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button onclick="renderStoriesPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            Next →
        </button>
        <span class="page-info">${currentPage}/${totalPages}</span>
    `;

    container.innerHTML = html;
}

// ============================================
// SWITCH CATEGORY
// ============================================
function switchCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    loadStories();
}

// ============================================
// SEARCH STORIES
// ============================================
function searchStories() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!query) {
        loadStories();
        return;
    }

    const filtered = allStories.filter((story) => {
        const title = (story.title || '').toLowerCase();
        const text = (story.text || '').toLowerCase();
        return title.includes(query) || text.includes(query);
    });

    const container = document.getElementById('storiesContainer');
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">🔍</div>
                <h3>No stories found</h3>
                <p>Try a different search term.</p>
            </div>
        `;
        return;
    }

    allStories = filtered;
    renderStoriesPage(1);
}

// ============================================
// FOLLOW USER
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
                transaction.update(userRef, {
                    following: firebase.firestore.FieldValue.arrayRemove(targetUid)
                });
                transaction.update(targetRef, {
                    followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
                return 'unfollowed';
            } else {
                transaction.update(userRef, {
                    following: firebase.firestore.FieldValue.arrayUnion(targetUid)
                });
                transaction.update(targetRef, {
                    followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
                return 'followed';
            }
        });
    }).then((action) => {
        if (action === 'followed') {
            alert('✅ You are now following this user!');
        } else {
            alert('✅ You have unfollowed this user.');
        }
        if (typeof loadProfile === 'function') loadProfile();
    }).catch((err) => {
        console.error('Error following/unfollowing:', err);
        alert('❌ Error: ' + err.message);
    });
}

// ============================================
// IS FOLLOWING
// ============================================
function isFollowing(targetUid) {
    if (!currentUserData) return false;
    return currentUserData.following && currentUserData.following.includes(targetUid);
}

// ============================================
// GOLD SYSTEM
// ============================================
function openGoldModal(storyId) {
    if (!currentUser) {
        alert('Please log in to donate gold.');
        return;
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return;
    }

    const balance = currentUserData.goldBalance || 0;
    if (balance < 1) {
        alert('⚠️ You don\'t have any gold!');
        return;
    }

    const modal = document.getElementById('goldModal');
    if (!modal) {
        alert('Gold system is loading...');
        return;
    }

    document.getElementById('goldBalanceAmount').textContent = balance;
    modal.classList.add('active');
    currentStoryId = storyId;
    selectedGoldAmount = 0;
    document.getElementById('customGoldAmount').value = '';
    document.getElementById('goldMessage').value = '';
    document.getElementById('goldError').textContent = '';

    document.querySelectorAll('.gold-amount-btn').forEach(btn => {
        btn.style.borderColor = '#d4c8b8';
        btn.style.background = '#e8ddd0';
    });
}

function closeGoldModal() {
    const modal = document.getElementById('goldModal');
    if (modal) modal.classList.remove('active');
}

function selectGoldAmount(amount) {
    selectedGoldAmount = amount;
    document.getElementById('customGoldAmount').value = amount;

    document.querySelectorAll('.gold-amount-btn').forEach(btn => {
        btn.style.borderColor = '#d4c8b8';
        btn.style.background = '#e8ddd0';
    });
    event.target.style.borderColor = '#c47a5a';
    event.target.style.background = '#f5d6b3';
}

function confirmGoldDonation() {
    const customInput = document.getElementById('customGoldAmount');
    const messageInput = document.getElementById('goldMessage');
    const errorDiv = document.getElementById('goldError');

    let amount = selectedGoldAmount;
    if (customInput && customInput.value) {
        const custom = parseInt(customInput.value);
        if (custom > 0) amount = custom;
    }

    const balance = currentUserData ? currentUserData.goldBalance || 0 : 0;

    if (!amount || amount < 1) {
        errorDiv.textContent = 'Please select or enter a valid amount.';
        return;
    }

    if (amount > balance) {
        errorDiv.textContent = '⚠️ You don\'t have enough gold! Balance: ' + balance + ' 🪙';
        return;
    }

    const message = messageInput ? messageInput.value.trim() : '';

    closeGoldModal();

    const storyRef = db.collection('stories').doc(currentStoryId);
    const userRef = db.collection('users').doc(currentUser.uid);

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((storyDoc) => {
            if (!storyDoc.exists) throw new Error('Story not found');
            const storyData = storyDoc.data();
            const authorId = storyData.userId;

            return transaction.get(db.collection('users').doc(authorId)).then((authorDoc) => {
                if (!authorDoc.exists) throw new Error('Author not found');

                transaction.update(userRef, {
                    goldBalance: firebase.firestore.FieldValue.increment(-amount),
                    goldGiven: firebase.firestore.FieldValue.increment(amount)
                });

                transaction.update(db.collection('users').doc(authorId), {
                    goldBalance: firebase.firestore.FieldValue.increment(amount),
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });

                transaction.update(storyRef, {
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });

                const transactionRef = db.collection('goldTransactions').doc();
                transaction.set(transactionRef, {
                    fromUid: currentUser.uid,
                    toUid: authorId,
                    storyId: currentStoryId,
                    amount: amount,
                    message: message || '',
                    fromName: currentUserData ? currentUserData.name : 'Anonymous',
                    toName: authorDoc.data().name || 'Someone',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    }).then(() => {
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) - amount;
        }
        alert(`✅ You donated ${amount} 🪙!`);
        loadStories();
    }).catch((err) => {
        console.error('Gold donation error:', err);
        alert('❌ Error donating gold: ' + err.message);
    });
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

                    // Apply theme from user data
                    applyTheme();

                    // Show admin link if admin
                    const adminLink = document.getElementById('adminNavLink');
                    if (adminLink && currentUserData.isAdmin) {
                        adminLink.style.display = 'inline-block';
                    }

                    // Load stories after auth
                    if (document.getElementById('storiesContainer')) {
                        loadStories();
                    }
                } else {
                    // Create user document if it doesn't exist
                    db.collection('users').doc(user.uid).set({
                        uid: user.uid,
                        name: user.displayName || 'Friend',
                        email: user.email,
                        gender: '🙅 Prefer not to say',
                        favorites: 'Not specified',
                        country: 'Not specified',
                        emergencyNumber: '911',
                        emailVerified: user.emailVerified || false,
                        isAdmin: false,
                        isPublic: true,
                        theme: 'light',
                        goldBalance: 10,
                        goldReceived: 0,
                        goldGiven: 0,
                        followers: [],
                        following: [],
                        storyCount: 0,
                        commentCount: 0,
                        likesReceived: 0,
                        avatar: '👤',
                        border: 'default',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        if (userName) userName.textContent = 'Friend';
                        applyTheme();
                        if (document.getElementById('storiesContainer')) {
                            loadStories();
                        }
                    });
                }
            })
            .catch((err) => console.error('Error fetching user data:', err));
    } else {
        currentUser = null;
        currentUserData = null;
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';

        // Show guest message
        const guestMsg = document.getElementById('guestMessage');
        if (guestMsg) {
            guestMsg.style.display = 'block';
        }

        // Apply theme (system preference)
        applyTheme();

        // Load stories for guest (if container exists)
        if (document.getElementById('storiesContainer')) {
            loadStories();
        }
    }
});

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 The Harbor app initializing...');

    // Modal close on outside click
    document.getElementById('authModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    document.getElementById('goldModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeGoldModal();
    });

    // Password strength
    document.getElementById('authPassword')?.addEventListener('input', function() {
        const pwd = this.value;
        const strengthDiv = document.getElementById('passwordStrength');
        if (!strengthDiv) return;
        if (pwd.length === 0) { strengthDiv.innerHTML = ''; return; }
        const result = checkPasswordStrength(pwd);
        strengthDiv.innerHTML = `
            <div style="margin-top:6px;font-size:0.85rem;">
                Strength: <span style="color:${result.color};font-weight:700;">${result.strength}</span>
            </div>
        `;
    });

    // Username availability check
    document.getElementById('authName')?.addEventListener('input', function() {
        const username = this.value.trim();
        const statusDiv = document.getElementById('usernameStatus');
        if (!statusDiv) return;
        if (username.length < 2) { statusDiv.innerHTML = ''; return; }
        db.collection('users').where('name', '==', username).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    statusDiv.innerHTML = `<span style="color:#27ae60;">✅ Username available!</span>`;
                } else {
                    statusDiv.innerHTML = `<span style="color:#c0392b;">❌ Username taken</span>`;
                }
            })
            .catch(() => {
                statusDiv.innerHTML = '';
            });
    });

    // Enter key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const modal = document.getElementById('authModal');
            if (modal && modal.classList.contains('active')) handleAuth();
        }
        if (e.key === 'Escape') {
            closeModal();
            closeGoldModal();
        }
    });

    populateCountryDatalist();

    console.log('✅ The Harbor app initialized');
});
