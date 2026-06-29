// ============================================
// 🔥 FIREBASE CONFIG
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

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let currentUserData = null;
let currentCategory = 'all';

// ============================================
// SECURITY: Input Sanitization
// ============================================
function sanitizeInput(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
}

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
// SECURITY: Password Strength Checker
// ============================================
function checkPasswordStrength(password) {
    let score = 0;
    let checks = {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        noCommon: false
    };

    if (password.length >= 8) {
        checks.length = true;
        score += 20;
    } else if (password.length >= 6) {
        score += 10;
    }

    if (/[A-Z]/.test(password)) {
        checks.uppercase = true;
        score += 20;
    }

    if (/[a-z]/.test(password)) {
        checks.lowercase = true;
        score += 20;
    }

    if (/[0-9]/.test(password)) {
        checks.number = true;
        score += 20;
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        checks.special = true;
        score += 20;
    }

    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome', 'admin'];
    if (!commonPasswords.some(pwd => password.toLowerCase().includes(pwd))) {
        checks.noCommon = true;
        score += 10;
    }

    let strength = 'weak';
    let color = '#c0392b';
    if (score >= 90) {
        strength = 'very-strong';
        color = '#27ae60';
    } else if (score >= 70) {
        strength = 'strong';
        color = '#2ecc71';
    } else if (score >= 50) {
        strength = 'medium';
        color = '#f39c12';
    } else if (score >= 30) {
        strength = 'weak';
        color = '#e67e22';
    } else {
        strength = 'very-weak';
        color = '#c0392b';
    }

    return {
        score: score,
        strength: strength,
        color: color,
        checks: checks
    };
}

function getPasswordRequirementsHTML(password) {
    const checks = checkPasswordStrength(password).checks;
    const requirements = [
        { key: 'length', label: 'At least 8 characters', emoji: '📏' },
        { key: 'uppercase', label: 'Uppercase letter (A-Z)', emoji: '🔠' },
        { key: 'lowercase', label: 'Lowercase letter (a-z)', emoji: '🔡' },
        { key: 'number', label: 'Number (0-9)', emoji: '🔢' },
        { key: 'special', label: 'Special character (!@#$%)', emoji: '🔣' },
        { key: 'noCommon', label: 'Not a common password', emoji: '🛡️' }
    ];

    let html = '<div style="margin-top:8px;font-size:0.85rem;">';
    requirements.forEach(req => {
        const met = checks[req.key] || false;
        html += `<div style="color:${met ? '#27ae60' : '#c0392b'};padding:2px 0;">
            ${met ? '✅' : '❌'} ${req.emoji} ${req.label}
        </div>`;
    });
    html += '</div>';
    return html;
}

// ============================================
// AUTH: Login, Signup, Logout
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
    
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const nameInput = document.getElementById('authName');
    const favoritesInput = document.getElementById('authFavorites');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (nameInput) nameInput.value = '';
    if (favoritesInput) favoritesInput.value = '';

    if (mode === 'login') {
        if (title) title.textContent = '🔐 Welcome Back';
        if (submitBtn) submitBtn.textContent = '🚀 Log In';
        if (signupFields) signupFields.style.display = 'none';
        if (switchLink) {
            switchLink.innerHTML = `Don't have an account? <strong>Sign Up</strong>`;
            switchLink.dataset.mode = 'signup';
        }
    } else {
        if (title) title.textContent = '📝 Join The Harbor';
        if (submitBtn) submitBtn.textContent = '🚀 Create Account';
        if (signupFields) signupFields.style.display = 'block';
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
    const checksDiv = document.getElementById('passwordChecks');
    
    if (!password || !strengthDiv || !checksDiv) return;

    const pwd = password.value;

    if (pwd.length === 0) {
        strengthDiv.innerHTML = '';
        checksDiv.innerHTML = '';
        return;
    }

    const result = checkPasswordStrength(pwd);
    
    strengthDiv.innerHTML = `
        <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
                <span>Password Strength:</span>
                <span style="color:${result.color};font-weight:700;text-transform:capitalize;">${result.strength.replace('-', ' ')}</span>
            </div>
            <div style="width:100%;height:6px;background:#e8ddd0;border-radius:10px;margin-top:4px;overflow:hidden;">
                <div style="width:${result.score}%;height:100%;background:${result.color};border-radius:10px;transition:width 0.3s;"></div>
            </div>
            <div style="font-size:0.7rem;color:#7a9e7e;margin-top:2px;">Score: ${result.score}/100</div>
        </div>
    `;

    checksDiv.innerHTML = getPasswordRequirementsHTML(pwd);
}

function handleAuth() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const error = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!emailInput || !passwordInput || !error || !submitBtn) return;

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

    if (!isLogin) {
        const strength = checkPasswordStrength(password);
        if (strength.score < 30) {
            error.textContent = '⚠️ Password is too weak. Please choose a stronger password.';
            return;
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Please wait...';

    const cleanEmail = sanitizeInput(email);
    const cleanPassword = sanitizeInput(password);

    if (isLogin) {
        auth.signInWithEmailAndPassword(cleanEmail, cleanPassword)
            .then(() => {
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
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

        const name = nameInput ? sanitizeInput(nameInput.value.trim()) : '';
        const gender = genderSelect ? genderSelect.value : '🙅 Prefer not to say';
        const favorites = favoritesInput ? sanitizeInput(favoritesInput.value.trim()) : '';

        if (!name || name.length < 2) {
            error.textContent = 'Please enter your name (minimum 2 characters).';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        if (name.length > 50) {
            error.textContent = 'Name must be under 50 characters.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword)
            .then((userCredential) => {
                const user = userCredential.user;
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: cleanEmail,
                    gender: gender,
                    favorites: favorites || 'Not specified',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
                alert('✅ Welcome to The Harbor! Your account has been created.');
            })
            .catch((err) => {
                error.textContent = err.message;
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
            });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
}

// ============================================
// AUTH STATE LISTENER
// ============================================

auth.onAuthStateChanged((user) => {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userGenderDisplay = document.getElementById('userGenderDisplay');

    if (user) {
        currentUser = user;
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserData = doc.data();
                    if (userName) userName.textContent = currentUserData.name || 'Friend';
                    if (userGenderDisplay) userGenderDisplay.textContent = currentUserData.gender || '';
                    db.collection('users').doc(user.uid).update({
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            })
            .catch((err) => {
                console.error('Error fetching user data:', err);
            });

        if (document.getElementById('storiesContainer')) {
            loadStories();
        }
        
        // Update profile page if on profile
        if (window.location.pathname.includes('profile.html')) {
            loadProfile();
        }
    } else {
        currentUser = null;
        currentUserData = null;
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚓</div>
                    <h3>Welcome to The Harbor</h3>
                    <p>Log in or join to read and share stories.</p>
                </div>
            `;
        }
    }
});

// ============================================
// LOAD STORIES FROM FIRESTORE
// ============================================

function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Loading stories...</div>';

    let query = db.collection('stories')
        .orderBy('createdAt', 'desc')
        .limit(50);

    if (currentCategory && currentCategory !== 'all') {
        query = query.where('category', '==', currentCategory);
    }

    query.get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">🌊</div>
                        <h3>No stories yet</h3>
                        <p>Be the first to share your story!</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach((doc) => {
                const story = doc.data();
                story.id = doc.id;
                html += renderStoryCard(story);
            });

            container.innerHTML = html;
        })
        .catch((err) => {
            console.error('Error loading stories:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">⚠️</div>
                    <h3>Oops!</h3>
                    <p>Could not load stories. Please try again.</p>
                </div>
            `;
        });
}

// ============================================
// RENDER A SINGLE STORY CARD
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
        reactionButtons += `
            <button class="emoji-btn" onclick="addReaction('${story.id}', '${emoji}')">
                ${emoji} <span class="count">${count}</span>
            </button>
        `;
    });

    const time = story.createdAt ? story.createdAt.toDate().toLocaleDateString() : 'Recently';
    const excerpt = story.text.length > 200 ? escapeHTML(story.text.substring(0, 200)) + '...' : escapeHTML(story.text);

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
// EMOJI REACTIONS
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
// CATEGORY SWITCHING
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
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        loadStories();
        return;
    }

    const container = document.getElementById('storiesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Searching...</div>';

    db.collection('stories')
        .orderBy('createdAt', 'desc')
        .limit(100)
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
                if (searchText.includes(query)) {
                    matched.push(story);
                }
            });

            if (matched.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="big-emoji">🔍</div>
                        <h3>No stories match "${escapeHTML(query)}"</h3>
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
            loadStories();
        });
}

// ============================================
// SUBMIT STORY
// ============================================

function submitStory() {
    if (!currentUser) {
        alert('Please log in to share your story.');
        return;
    }

    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');
    const categorySelect = document.getElementById('storyCategory');
    const anonymousCheck = document.getElementById('storyAnonymous');
    const error = document.getElementById('submitError');

    if (!titleInput || !textInput || !categorySelect || !error) return;

    const title = sanitizeInput(titleInput.value.trim());
    const text = sanitizeInput(textInput.value.trim());
    const category = categorySelect.value;
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;

    error.textContent = '';

    if (!title || title.length < 3) {
        error.textContent = 'Title must be at least 3 characters.';
        return;
    }
    if (title.length > 100) {
        error.textContent = 'Title must be under 100 characters.';
        return;
    }
    if (!text || text.length < 10) {
        error.textContent = 'Story must be at least 10 characters.';
        return;
    }
    if (text.length > 5000) {
        error.textContent = 'Story must be under 5000 characters.';
        return;
    }
    if (!category) {
        error.textContent = 'Please select a category.';
        return;
    }

    // Check gender restrictions
    if (category === 'men' && currentUserData.gender !== '🧔 Man') {
        error.textContent = '⚠️ This section is for men only.';
        return;
    }
    if (category === 'women' && currentUserData.gender !== '👩 Woman') {
        error.textContent = '⚠️ This section is women only.';
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    db.collection('stories').add({
        title: title,
        text: text,
        category: category,
        userId: currentUser.uid,
        authorName: currentUserData.name || 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {},
        commentCount: 0
    })
    .then(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Posted!';
        }
        alert('✅ Your story has been shared!');
        window.location.href = 'index.html';
    })
    .catch((err) => {
        error.textContent = err.message;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Post Story';
        }
    });
}

// ============================================
// LOAD SINGLE STORY (for story.html)
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
            content.innerHTML = renderFullStory(story);
            loadComments(storyId);
        })
        .catch((err) => {
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
        reactionButtons += `
            <button class="emoji-btn" onclick="addReaction('${story.id}', '${emoji}')">
                ${emoji} <span class="count">${count}</span>
            </button>
        `;
    });

    return `
        <div class="card">
            <h2 class="story-title">${escapeHTML(story.title)}</h2>
            <div class="story-meta">
                <span>✍️ ${author}</span>
                <span class="category-badge">${categoryDisplay}</span>
                <span>📅 ${time}</span>
            </div>
            <div class="story-text" style="font-size:1.1rem;line-height:1.8;white-space:pre-wrap;">${escapeHTML(story.text)}</div>
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
// COMMENTS
// ============================================

function loadComments(storyId) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Loading comments...</div>';

    db.collection('comments')
        .where('storyId', '==', storyId)
        .orderBy('createdAt', 'desc')
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

            let html = '<h3 style="margin-bottom:16px;">💬 Comments</h3>';
            snapshot.forEach((doc) => {
                const comment = doc.data();
                comment.id = doc.id;
                html += renderComment(comment);
            });
            container.innerHTML = html;
        })
        .catch((err) => {
            container.innerHTML = `<div class="empty-state"><p>Error loading comments: ${err.message}</p></div>`;
        });
}

function renderComment(comment) {
    const author = comment.isAnonymous ? '🕊️ Anonymous' : escapeHTML(comment.authorName || 'Someone');
    const time = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Recently';
    const likes = comment.likes || 0;

    return `
        <div class="comment" style="background:#f5f0eb;padding:14px 18px;border-radius:12px;margin-bottom:12px;border:1px solid #e8ddd0;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;font-size:0.85rem;color:#7a9e7e;margin-bottom:6px;">
                <span>✍️ ${author}</span>
                <span>📅 ${time}</span>
            </div>
            <div style="font-size:0.95rem;line-height:1.6;">${escapeHTML(comment.text)}</div>
            <div style="margin-top:8px;display:flex;gap:12px;align-items:center;">
                <button class="emoji-btn" onclick="likeComment('${comment.id}')" style="padding:2px 12px;font-size:0.85rem;">
                    👍 <span class="count">${likes}</span>
                </button>
                ${currentUser && comment.userId === currentUser.uid ? 
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

    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    const textInput = document.getElementById('commentText');
    const anonymousCheck = document.getElementById('commentAnonymous');
    const error = document.getElementById('commentError');

    if (!textInput || !error) return;

    const text = sanitizeInput(textInput.value.trim());
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

    const submitBtn = document.getElementById('commentSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    db.collection('comments').add({
        storyId: storyId,
        text: text,
        userId: currentUser.uid,
        authorName: currentUserData.name || 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0
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
    });
}

function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    db.collection('comments').doc(commentId).delete()
        .then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            loadComments(urlParams.get('id'));
        })
        .catch((err) => {
            console.error('Error deleting comment:', err);
            alert('Could not delete comment.');
        });
}

// ============================================
// PROFILE PAGE
// ============================================

function loadProfile() {
    if (!currentUser) {
        document.getElementById('profileContent').innerHTML = `
            <div class="empty-state">
                <div class="big-emoji">🔐</div>
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your profile.</p>
                <button class="btn-primary" onclick="openModal('login')" style="margin-top:12px;">Log In</button>
            </div>
        `;
        return;
    }

    const content = document.getElementById('profileContent');
    content.innerHTML = '<div class="loading">⏳ Loading profile...</div>';

    db.collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (!doc.exists) {
                content.innerHTML = '<div class="empty-state"><h3>Profile not found</h3></div>';
                return;
            }

            const userData = doc.data();
            
            // Get user's stories
            return db.collection('stories')
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get()
                .then((storiesSnapshot) => {
                    const stories = [];
                    storiesSnapshot.forEach((s) => {
                        stories.push(s.data());
                    });
                    return { userData, stories };
                });
        })
        .then((result) => {
            const { userData, stories } = result;
            
            let html = `
                <div class="card">
                    <div style="text-align:center;padding:10px 0;">
                        <span style="font-size:4rem;">👤</span>
                        <h2 style="color:#1a4a4a;">${escapeHTML(userData.name)}</h2>
                        <p style="color:#7a9e7e;">${escapeHTML(userData.gender || '')}</p>
                        <p style="color:#7a9e7e;font-size:0.9rem;">❤️ ${escapeHTML(userData.favorites || 'Not specified')}</p>
                        <p style="color:#a8a09a;font-size:0.8rem;">Member since ${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'Recently'}</p>
                    </div>
                </div>

                <div style="margin-top:24px;">
                    <h3 style="color:#1a4a4a;">📝 Your Stories (${stories.length})</h3>
                    <div id="userStories">
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
                            </div>
                            <div class="story-text">${escapeHTML(story.text.substring(0, 150))}${story.text.length > 150 ? '...' : ''}</div>
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
            content.innerHTML = `<div class="empty-state"><h3>Error loading profile</h3><p>${err.message}</p></div>`;
        });
}

// ============================================
// CLOSE MODAL ON CLICK OUTSIDE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordOnType);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const modal = document.getElementById('authModal');
            if (modal && modal.style.display === 'flex') {
                handleAuth();
            }
        }
    });

    // Character counters for submit page
    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');
    const titleCount = document.getElementById('titleCount');
    const textCount = document.getElementById('textCount');
    
    if (titleInput && titleCount) {
        titleInput.addEventListener('input', function() {
            titleCount.textContent = this.value.length;
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

    // Category restriction check
    const categorySelect = document.getElementById('storyCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', checkCategoryRestriction);
    }

    // Load profile if on profile page
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();
    }

    // Load single story if on story page
    if (window.location.pathname.includes('story.html')) {
        loadStory();
    }
});

function checkCategoryRestriction() {
    const category = document.getElementById('storyCategory');
    const notice = document.getElementById('genderRestrictionNotice');
    const message = document.getElementById('restrictionMessage');
    
    if (!category || !notice || !message) return;
    
    const cat = category.value;

    if (!currentUser || !currentUserData) {
        notice.style.display = 'block';
        message.textContent = 'Please log in to share your story.';
        notice.className = 'gender-restriction-notice warning';
        return;
    }

    const gender = currentUserData.gender;

    if (cat === 'men' && gender !== '🧔 Man') {
        notice.style.display = 'block';
        message.textContent = '⚠️ This section is for men only. Please select a different category.';
        notice.className = 'gender-restriction-notice warning';
    } else if (cat === 'women' && gender !== '👩 Woman') {
        notice.style.display = 'block';
        message.textContent = '⚠️ This section is for women only. Please select a different category.';
        notice.className = 'gender-restriction-notice warning';
    } else {
        notice.style.display = 'none';
    }
}

console.log('⚓ The Harbor is ready!');
console.log('🛡️ Security features: Input sanitization, XSS protection, Password strength checking');
console.log('📚 Firebase connected:', firebase.app().name);
