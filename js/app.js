// ============================================
// THE HARBOR - MAIN APPLICATION (FINAL v8)
// ============================================

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

db.enablePersistence().catch(err => console.warn('Firestore persistence error:', err));

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
let currentStoryId = null;

const storyCache = {};
const CACHE_DURATION = 30000;
let savedScrollPosition = 0;

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
// UTILITY FUNCTIONS
// ============================================
function escapeHTML(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
    return String(text).replace(/[&<>"'/`=]/g, m => map[m]);
}

function sanitizeInput(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent.replace(/<[^>]*>/g, '');
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
    return { score, strength, color };
}

function getUserGender() {
    if (!currentUserData) return null;
    return currentUserData.gender;
}

function canSeeCategory(category) {
    const gender = getUserGender();
    if (currentUserData?.isAdmin === true) return true;
    if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') return true;
    if (category === 'men') return gender === '🧔 Man';
    if (category === 'women') return gender === '👩 Woman';
    return false;
}

function canPostInCategory(category) {
    const gender = getUserGender();
    if (currentUserData?.isAdmin === true) return true;
    if (category === 'struggles' || category === 'fun' || category === 'learning') return true;
    if (category === 'men') return gender === '🧔 Man';
    if (category === 'women') return gender === '👩 Woman';
    return false;
}

function checkUsernameAvailability(username) {
    if (!username || username.length < 2) return Promise.resolve(false);
    return db.collection('users').where('name', '==', username).get().then(s => s.empty);
}

// ============================================
// RESEND VERIFICATION
// ============================================
function resendVerification() {
    const user = auth.currentUser;
    if (!user) { alert('Please log in first.'); return; }
    user.sendEmailVerification()
        .then(() => alert('✅ Verification email resent to ' + user.email + '!\n\n📧 Check your inbox and spam folder.'))
        .catch(err => alert('❌ Error: ' + err.message));
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function addNotification(toUid, type, data) {
    if (!toUid || toUid === currentUser?.uid) return;
    db.collection('notifications').add({
        toUid,
        fromUid: currentUser?.uid || null,
        fromName: currentUserData?.name || 'Someone',
        type,
        data: data || {},
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.warn('Notification error:', err));
}

// ============================================
// FOLLOW SYSTEM (with notification)
// ============================================
function followUser(targetUid) {
    if (!currentUser) { alert('Please log in to follow users.'); return; }
    if (targetUid === currentUser.uid) { alert('You cannot follow yourself.'); return; }
    const userRef = db.collection('users').doc(currentUser.uid);
    const targetRef = db.collection('users').doc(targetUid);
    db.runTransaction(transaction => {
        return transaction.get(userRef).then(userDoc => {
            if (!userDoc.exists) return;
            const following = userDoc.data().following || [];
            if (following.includes(targetUid)) {
                transaction.update(userRef, { following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
                transaction.update(targetRef, { followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
                return 'unfollowed';
            } else {
                transaction.update(userRef, { following: firebase.firestore.FieldValue.arrayUnion(targetUid) });
                transaction.update(targetRef, { followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                addNotification(targetUid, 'follow', {});
                return 'followed';
            }
        });
    }).then(action => {
        if (currentUserData) {
            if (action === 'followed') {
                if (!currentUserData.following) currentUserData.following = [];
                currentUserData.following.push(targetUid);
            } else {
                currentUserData.following = (currentUserData.following || []).filter(uid => uid !== targetUid);
            }
        }
        if (window.location.pathname.includes('profile.html') && typeof loadProfile === 'function') loadProfile();
        if (typeof updateSidebarData === 'function') updateSidebarData();
    }).catch(err => {
        console.error('Follow error:', err);
    });
}

function isFollowing(targetUid) {
    if (!currentUserData) return false;
    return currentUserData.following && currentUserData.following.includes(targetUid);
}

// ============================================
// REPORT USER
// ============================================
function reportUser(userId) {
    if (!currentUser) { alert('Please log in to report.'); return; }
    if (userId === currentUser.uid) { alert('You cannot report yourself.'); return; }
    const reason = prompt('Why are you reporting this user?');
    if (!reason || reason.trim().length < 3) { alert('Please provide a valid reason (minimum 3 characters).'); return; }
    db.collection('reports').add({
        reportedUser: userId, reportedBy: currentUser.uid,
        reporterName: currentUserData ? currentUserData.name : 'Anonymous',
        reason: reason.trim(), status: 'pending', type: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert('✅ Report submitted. Thank you!'))
      .catch(err => alert('❌ Error: ' + err.message));
}

// ============================================
// REPORT STORY
// ============================================
function reportStory(storyId) {
    if (!currentUser) { alert('Please log in to report.'); return; }
    const reason = prompt('Why are you reporting this story?');
    if (!reason || reason.trim().length < 3) { alert('Please provide a valid reason.'); return; }
    db.collection('reports').add({
        storyId: storyId, reportedBy: currentUser.uid,
        reporterName: currentUserData ? currentUserData.name : 'Anonymous',
        reason: reason.trim(), status: 'pending', type: 'story',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert('✅ Report submitted.'))
      .catch(err => alert('❌ Error: ' + err.message));
}

// ============================================
// LOAD STORIES (WITH SCROLL RESTORE)
// ============================================
function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<div class="empty-state" style="padding:40px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-color);"><div class="big-emoji">🔒</div><h3>Login Required</h3><p style="color:var(--text-muted);">Please log in or join to read and share stories.</p><div style="margin-top:14px;display:flex;gap:10px;justify-content:center;"><button class="btn btn-primary" onclick="openModal(\'login\')">🔐 Log In</button><button class="btn btn-secondary" onclick="openModal(\'signup\')">📝 Join</button></div></div>';
        return;
    }
    if (!currentUser.emailVerified) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-color);"><div class="big-emoji">📧</div><h3>Email Not Verified</h3><p style="color:var(--text-muted);">Please check your inbox for the verification link.</p><button class="btn btn-primary" onclick="resendVerification()" style="margin-top:10px;">🔄 Resend Verification</button></div>';
        return;
    }
    if (!canSeeCategory(currentCategory)) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-color);"><div class="big-emoji">🔒</div><h3>Access Restricted</h3><p style="color:var(--text-muted);">You don\'t have permission to view this section.</p><button class="btn btn-primary" onclick="switchCategory(\'all\')" style="margin-top:10px;">← Go to All Stories</button></div>';
        return;
    }

    // Restore saved state from sessionStorage
    const savedScroll = sessionStorage.getItem('feedScrollPos');
    const savedCat = sessionStorage.getItem('feedCategory');
    const savedPg = sessionStorage.getItem('feedPage');
    if (savedScroll) savedScrollPosition = parseInt(savedScroll);
    if (savedCat) { currentCategory = savedCat; document.querySelectorAll('.feed-tab').forEach(t => t.classList.toggle('active', t.dataset.category === currentCategory)); }
    if (savedPg) currentPage = parseInt(savedPg);
    sessionStorage.removeItem('feedScrollPos');
    sessionStorage.removeItem('feedCategory');
    sessionStorage.removeItem('feedPage');

    const cacheKey = currentCategory;
    const cached = storyCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        allStories = cached.stories;
        applyFilters();
        if (savedScrollPosition) {
            setTimeout(function() { window.scrollTo({ top: savedScrollPosition, behavior: 'instant' }); savedScrollPosition = 0; }, 150);
        }
        return;
    }

    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div> Loading stories...</div>';

    const gender = getUserGender();
    let query = db.collection('stories')
        .where('approved', '==', true)
        .orderBy('createdAt', 'desc');

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

    query.get().then(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><div class="big-emoji">🌊</div><h3>No stories yet</h3><p style="color:var(--text-muted);">Be the first to share!</p>'+(canPostInCategory(currentCategory)?'<a href="submit.html" class="btn btn-primary" style="display:inline-block;text-decoration:none;margin-top:10px;">📝 Share Your Story</a>':'')+'</div>';
            return;
        }
        allStories = [];
        snapshot.forEach(doc => {
            const story = doc.data();
            story.id = doc.id;
            if (story.visibility === 'private' && story.userId !== currentUser.uid) return;
            allStories.push(story);
        });
        storyCache[cacheKey] = { stories: [...allStories], timestamp: Date.now() };
        applyFilters();
        if (savedScrollPosition) {
            setTimeout(function() { window.scrollTo({ top: savedScrollPosition, behavior: 'instant' }); savedScrollPosition = 0; }, 150);
        }
    }).catch(err => {
        console.error('Error loading stories:', err);
        container.innerHTML = '<div class="empty-state"><div class="big-emoji">⚠️</div><h3>Error Loading Stories</h3><p style="color:var(--text-muted);">'+err.message+'</p><button class="btn btn-primary" onclick="loadStories()" style="margin-top:10px;">🔄 Retry</button></div>';
    });
}

function applyFilters() {
    filteredStories = currentCategory === 'all' ? [...allStories] : allStories.filter(s => s.category === currentCategory);
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    if (searchTerm) {
        filteredStories = filteredStories.filter(s =>
            (s.title && s.title.toLowerCase().includes(searchTerm)) ||
            (s.text && s.text.toLowerCase().includes(searchTerm)) ||
            (s.authorName && s.authorName.toLowerCase().includes(searchTerm)) ||
            (s.category && s.category.toLowerCase().includes(searchTerm))
        );
    }
    renderStories();
}

function renderStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * STORIES_PER_PAGE;
    const end = start + STORIES_PER_PAGE;
    const pageStories = filteredStories.slice(start, end);
    container.innerHTML = pageStories.length === 0
        ? '<div class="empty-state"><div class="big-emoji">🌊</div><h3>No stories found</h3></div>'
        : pageStories.map(story => renderStoryCard(story)).join('');
    renderPagination(totalPages);
}

function renderStoryCard(story) {
    const author = story.isAnonymous ? '🕊️ Anonymous' : escapeHTML(story.authorName || 'Someone');
    const initial = (story.authorName || 'A')[0].toUpperCase();
    let timeStr = 'Recently';
    if (story.createdAt) {
        const d = story.createdAt.toDate();
        timeStr = d.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    }
    const catNames = {men:"🧔 Men's Harbor",women:"👩 Women's Harbor",struggles:'🌊 The Storm',fun:'☀️ Sunny Skies',learning:'🧭 The Compass'};
    const catDisp = catNames[story.category] || story.category;
    let badges = '';
    if (story.visibility === 'private') badges += '<span class="badge-visibility private">🔒 Private</span>';
    if (story.goldReceived > 0) badges += '<span class="badge-gold">'+story.goldReceived+' 🪙</span>';
    if (currentUser && story.userId === currentUser.uid) badges += '<span class="badge-yours">👤 Yours</span>';
    const text = story.text || '';
    const showMore = text.length > 200;
    const excerpt = showMore ? escapeHTML(text.substring(0, 200)) + '...' : escapeHTML(text);
    const reactions = story.reactions || {};
    const emojis = ['❤️','🙏','😢','💪','🤗'];
    let reactionBtns = '';
    emojis.forEach(emoji => {
        const count = reactions[emoji] || 0;
        const hasReacted = userReactions[story.id] && userReactions[story.id].includes(emoji);
        reactionBtns += '<button class="reaction-mini'+(hasReacted?' reacted':'')+'" id="reaction-'+story.id+'-'+emoji+'" onclick="addReaction(\''+story.id+'\',\''+emoji+'\')">'+emoji+' <span class="count" id="count-'+story.id+'-'+emoji+'">'+count+'</span></button>';
    });
    const isOwner = currentUser && story.userId === currentUser.uid;
    return '<div class="story-card" data-story-id="'+story.id+'">'+
        '<div class="story-card-top">'+
            '<div class="story-card-avatar" onclick="viewProfile(\''+story.userId+'\')" style="cursor:pointer;">'+initial+'</div>'+
            '<div class="story-card-author-info">'+
                '<div class="story-card-author-name" onclick="viewProfile(\''+story.userId+'\')" style="cursor:pointer;">'+author+'</div>'+
                '<div class="story-card-time">📅 '+timeStr+'</div>'+
            '</div>'+
            '<div class="story-card-badges">'+badges+'</div>'+
        '</div>'+
        '<div class="story-card-title" onclick="window.location.href=\'story.html?id='+story.id+'\'">'+escapeHTML(story.title || 'Untitled')+'</div>'+
        '<span class="story-card-category">'+catDisp+'</span>'+
        '<div class="story-card-excerpt">'+excerpt+'</div>'+
        (showMore ? '<button class="story-card-readmore" onclick="toggleReadMoreCard(\''+story.id+'\')">Read More ▼</button><div class="story-card-full" id="fullContent-'+story.id+'">'+escapeHTML(text.substring(200))+'</div>' : '')+
        '<div class="story-card-actions">'+
            reactionBtns+
            '<a class="card-action-btn card-btn-comment" href="story.html?id='+story.id+'">💬 '+(story.commentCount||0)+'</a>'+
            (currentUser && story.userId !== currentUser.uid ? '<button class="card-action-btn card-btn-gold" onclick="openGoldModal(\''+story.id+'\')">🪙</button>' : '')+
        '</div></div>';
}

function toggleReadMoreCard(storyId) {
    const full = document.getElementById('fullContent-' + storyId);
    const btn = full ? full.previousElementSibling : null;
    if (!full) return;
    if (full.classList.contains('show')) { full.classList.remove('show'); if(btn) btn.textContent = 'Read More ▼'; }
    else { full.classList.add('show'); if(btn) btn.textContent = 'Show Less ▲'; }
}

function viewProfile(userId) { if (userId) window.location.href = 'profile.html?uid=' + userId; }
function searchStories() { if (!currentUser) { alert('⚠️ Please log in to search.'); return; } currentPage = 1; applyFilters(); }

function switchCategory(category) {
    if (!currentUser) {
        const container = document.getElementById('storiesContainer');
        if (container) container.innerHTML = '<div class="empty-state" style="padding:40px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-color);"><div class="big-emoji">🔒</div><h3>Login Required</h3><p style="color:var(--text-muted);">Please log in.</p></div>';
        return;
    }
    if (!canSeeCategory(category)) { alert("⚠️ You don't have permission to view this category."); return; }
    savedScrollPosition = window.scrollY;
    currentCategory = category;
    currentPage = 1;
    document.querySelectorAll('.feed-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.category === category));
    const url = new URL(window.location);
    url.searchParams.set('cat', category);
    window.history.pushState({ category }, '', url);
    loadAllUserReactions().then(() => loadStories());
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container || totalPages <= 1) { if(container) container.innerHTML = ''; return; }
    let html = '<button onclick="goToPage('+(currentPage-1)+')" '+(currentPage===1?'disabled':'')+'>◀ Prev</button>';
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) html += '<button class="active">'+i+'</button>';
        else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) html += '<button onclick="goToPage('+i+')">'+i+'</button>';
        else if (i === currentPage - 3 || i === currentPage + 3) html += '<span class="page-info">…</span>';
    }
    html += '<button onclick="goToPage('+(currentPage+1)+')" '+(currentPage===totalPages?'disabled':'')+'>Next ▶</button> <span class="page-info">Page '+currentPage+' of '+totalPages+'</span>';
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
// EDIT / DELETE / VISIBILITY
// ============================================
function openEditModal(storyId) {
    if (!currentUser) { alert('Please log in.'); return; }
    const story = allStories.find(s => s.id === storyId);
    if (!story || story.userId !== currentUser.uid) { alert('Permission denied.'); return; }
    currentEditId = storyId;
    document.getElementById('editTitle').value = story.title || '';
    document.getElementById('editContent').value = story.text || '';
    document.getElementById('editError').textContent = '';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() { document.getElementById('editModal').classList.remove('active'); currentEditId = null; }

function saveEdit() {
    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();
    const editError = document.getElementById('editError');
    if (!title || !content) { editError.textContent = 'Title and content required.'; return; }
    db.collection('stories').doc(currentEditId).update({
        title, text: content, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        const idx = allStories.findIndex(s => s.id === currentEditId);
        if (idx !== -1) { allStories[idx].title = title; allStories[idx].text = content; }
        closeEditModal();
        applyFilters();
        alert('✅ Story updated!');
    }).catch(err => { editError.textContent = '❌ ' + err.message; });
}

function deleteStory(storyId) {
    if (!currentUser || !confirm('⚠️ Delete this story permanently?')) return;
    db.collection('stories').doc(storyId).delete()
        .then(() => { allStories = allStories.filter(s => s.id !== storyId); applyFilters(); alert('✅ Story deleted.'); })
        .catch(err => alert('❌ ' + err.message));
}

function toggleVisibility(storyId) {
    if (!currentUser) return;
    const story = allStories.find(s => s.id === storyId);
    if (!story || story.userId !== currentUser.uid) return;
    const newVis = story.visibility === 'public' ? 'private' : 'public';
    db.collection('stories').doc(storyId).update({ visibility: newVis })
        .then(() => {
            const idx = allStories.findIndex(s => s.id === storyId);
            if (idx !== -1) allStories[idx].visibility = newVis;
            applyFilters();
            alert('✅ Story is now '+(newVis==='public'?'Public':'Private')+'.');
        }).catch(err => alert('❌ ' + err.message));
}

// ============================================
// REACTIONS (with notification)
// ============================================
function addReaction(storyId, emoji) {
    if (!currentUser) { alert('Please log in to react.'); return; }
    if (!currentUser.emailVerified) { alert('Please verify your email first.'); return; }
    if (!userReactions[storyId]) userReactions[storyId] = [];
    const storyRef = db.collection('stories').doc(storyId);
    const userReactionRef = db.collection('users').doc(currentUser.uid).collection('reactions').doc(storyId);
    const hasReacted = userReactions[storyId].includes(emoji);
    const btn = document.getElementById('reaction-'+storyId+'-'+emoji);
    if (btn) btn.disabled = true;
    db.runTransaction(transaction => {
        return transaction.get(storyRef).then(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            const reactions = data.reactions || {};
            if (hasReacted) {
                reactions[emoji] = Math.max((reactions[emoji]||0)-1, 0);
                userReactions[storyId] = userReactions[storyId].filter(e => e !== emoji);
            } else {
                reactions[emoji] = (reactions[emoji]||0)+1;
                userReactions[storyId].push(emoji);
                if (emoji === '❤️' && data.userId !== currentUser.uid) {
                    addNotification(data.userId, 'like', { storyId });
                }
            }
            transaction.update(storyRef, { reactions });
            transaction.set(userReactionRef, { emojis: userReactions[storyId], timestamp: firebase.firestore.FieldValue.serverTimestamp(), storyId }, { merge: true });
        });
    }).then(() => {
        if (btn) btn.disabled = false;
        const countSpan = document.getElementById('count-'+storyId+'-'+emoji);
        if (countSpan) countSpan.textContent = hasReacted ? (parseInt(countSpan.textContent)||0)-1 : (parseInt(countSpan.textContent)||0)+1;
        if (btn) { if (hasReacted) btn.classList.remove('reacted'); else btn.classList.add('reacted'); }
    }).catch(err => { console.error('Reaction error:', err); if (btn) btn.disabled = false; });
}

function loadAllUserReactions() {
    if (!currentUser) return Promise.resolve();
    return db.collection('users').doc(currentUser.uid).collection('reactions').get()
        .then(snapshot => { userReactions = {}; snapshot.forEach(doc => { userReactions[doc.id] = doc.data().emojis || []; }); return userReactions; })
        .catch(() => { userReactions = {}; return userReactions; });
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
    ['authEmail','authPassword','authName','authFavorites','authCountry'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const sd = document.getElementById('passwordStrength'); if (sd) sd.innerHTML = '';
    if (mode === 'login') {
        title.textContent = '🔐 Welcome Back';
        submitBtn.textContent = '🚀 Log In';
        if (signupFields) signupFields.style.display = 'none';
        if (switchLink) { switchLink.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>'; switchLink.dataset.mode = 'signup'; }
    } else {
        title.textContent = '📝 Join The Harbor';
        submitBtn.textContent = '🚀 Create Account';
        if (signupFields) signupFields.style.display = 'block';
        populateCountryDatalist();
        if (switchLink) { switchLink.innerHTML = 'Already have an account? <strong>Log In</strong>'; switchLink.dataset.mode = 'login'; }
    }
    modal.classList.add('active');
}

function closeModal() { const m = document.getElementById('authModal'); if (m) m.classList.remove('active'); }

function toggleAuthMode() {
    const switchLink = document.getElementById('authSwitch');
    if (!switchLink) return;
    closeModal();
    setTimeout(() => openModal(switchLink.dataset.mode), 200);
}

function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const error = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');
    error.textContent = '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
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
            .then(userCredential => {
                if (!userCredential.user.emailVerified) {
                    error.innerHTML = '⚠️ Please verify your email first.<br><button onclick="resendVerification()" style="background:none;border:none;color:#1a4a4a;font-weight:600;cursor:pointer;text-decoration:underline;">🔄 Resend verification</button>';
                    auth.signOut();
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🚀 Log In';
                    return;
                }
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
            }).catch(err => { error.textContent = err.message; submitBtn.disabled = false; submitBtn.textContent = '🚀 Log In'; });
    } else {
        const name = document.getElementById('authName').value.trim();
        const gender = document.getElementById('authGender')?.value || '🙅 Prefer not to say';
        const favorites = document.getElementById('authFavorites').value.trim();
        const country = document.getElementById('authCountry').value.trim();
        if (!name || name.length < 2) { error.textContent = 'Username must be at least 2 characters.'; submitBtn.disabled = false; submitBtn.textContent = '🚀 Create Account'; return; }
        if (!country) { error.textContent = 'Please select your country.'; submitBtn.disabled = false; submitBtn.textContent = '🚀 Create Account'; return; }
        const termsChecked = document.getElementById('termsCheckbox')?.checked;
        if (!termsChecked) { error.textContent = 'Please agree to the Terms and Privacy Policy.'; submitBtn.disabled = false; submitBtn.textContent = '🚀 Create Account'; return; }

        checkUsernameAvailability(name).then(available => {
            if (!available) { error.textContent = 'Username is taken.'; submitBtn.disabled = false; submitBtn.textContent = '🚀 Create Account'; return Promise.reject('taken'); }
            return auth.createUserWithEmailAndPassword(email, password);
        }).then(userCredential => {
            return userCredential.user.sendEmailVerification().then(() => userCredential.user);
        }).then(user => {
            const countryData = countries.find(c => c.name === country);
            return db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name, email, gender, favorites: favorites || 'Not specified',
                country, emergencyNumber: countryData?.emergency || '911',
                emailVerified: false, isAdmin: false, isPublic: true,
                goldBalance: 100,
                goldReceived: 0, goldGiven: 0,
                followers: [], following: [], storyCount: 0, commentCount: 0, likesReceived: 0,
                language: 'en', avatar: '👤', border: 'default',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            closeModal();
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            auth.signOut();
            alert('✅ Verification email sent to ' + email + '!\n\n📧 Check your inbox and click the verification link.\n💰 You received 100 🪙 gold as a welcome gift!');
        }).catch(err => {
            if (err !== 'taken') error.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('harbor_was_logged_in');
        auth.signOut();
        window.location.href = 'index.html';
    }
}

// ============================================
// AUTH STATE LISTENER (NO FLASH + ADMIN CHECK)
// ============================================
auth.onAuthStateChanged(user => {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const verificationBadge = document.getElementById('verificationBadge');

    if (user) {
        currentUser = user;
        // ✅ IMMEDIATE: Save state to prevent flash
        sessionStorage.setItem('harbor_was_logged_in', 'true');
        
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (user.emailVerified) {
            if (verificationBadge) { verificationBadge.textContent = '✅ Verified'; verificationBadge.className = 'verification-badge verified'; }
        } else {
            if (verificationBadge) { verificationBadge.textContent = '⏳ Unverified'; verificationBadge.className = 'verification-badge'; }
        }

        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                currentUserData = doc.data();
                if (!currentUserData.uid) currentUserData.uid = doc.id;
                if (userName) userName.textContent = currentUserData.name || 'Friend';
                if (user.emailVerified && !currentUserData.emailVerified) {
                    db.collection('users').doc(user.uid).update({ emailVerified: true });
                }
                updateEmergencyBanner();
                updateAdminLink(); // ✅ ONLY shows 👑 if isAdmin === true

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
                        document.querySelectorAll('.feed-tab').forEach(tab => {
                            tab.classList.toggle('active', tab.dataset.category === currentCategory);
                        });
                        loadStories();
                    }
                    if (window.location.pathname.includes('profile.html') && typeof loadProfile === 'function') loadProfile();
                    if (window.location.pathname.includes('admin.html') && typeof loadAdminPanel === 'function') loadAdminPanel();
                    if (window.location.pathname.includes('activity.html') && typeof loadActivity === 'function') loadActivity();
                    if (window.location.pathname.includes('suggest.html') && typeof loadSuggestions === 'function') setTimeout(loadSuggestions, 500);
                });
            }
        }).catch(err => console.error('Error fetching user data:', err));
    } else {
        currentUser = null;
        currentUserData = null;
        userReactions = {};
        // ✅ IMMEDIATE: Clear state on logout
        sessionStorage.removeItem('harbor_was_logged_in');
        
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) adminLink.style.display = 'none'; // ✅ Force hide admin icon
        const container = document.getElementById('storiesContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state" style="padding:40px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-color);"><div class="big-emoji">🔒</div><h3>Login Required</h3><p style="color:var(--text-muted);">Please log in or join.</p><div style="margin-top:14px;display:flex;gap:10px;justify-content:center;"><button class="btn btn-primary" onclick="openModal(\'login\')">🔐 Log In</button><button class="btn btn-secondary" onclick="openModal(\'signup\')">📝 Join</button></div></div>';
        }
    }
});

// ============================================
// UI HELPERS
// ============================================
function updateEmergencyBanner() {
    const banner = document.getElementById('emergencyBanner');
    if (!banner || !currentUserData) return;
    banner.innerHTML = '🆘 <strong>Emergency:</strong> <a href="tel:'+(currentUserData.emergencyNumber||'911')+'" style="color:#f5d6b3;font-weight:700;">'+(currentUserData.emergencyNumber||'911')+'</a> ('+(currentUserData.country||'your country')+')';
    banner.style.display = 'block';
}

// ✅ STRICT ADMIN CHECK - Only shows 👑 if isAdmin is exactly true
function updateAdminLink() {
    const adminLink = document.getElementById('adminNavLink');
    if (adminLink) {
        if (currentUser && currentUserData && currentUserData.isAdmin === true) {
            adminLink.style.display = '';
        } else {
            adminLink.style.display = 'none';
        }
    }
}

function updateCategoryTabs() {
    const tabs = document.querySelectorAll('.feed-tab');
    const gender = getUserGender();
    tabs.forEach(tab => {
        const cat = tab.dataset.category;
        if (cat === 'men') tab.style.display = gender === '🧔 Man' ? '' : 'none';
        else if (cat === 'women') tab.style.display = gender === '👩 Woman' ? '' : 'none';
        else tab.style.display = '';
    });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready — The Harbor');

    document.getElementById('authModal')?.addEventListener('click', function(e) { if(e.target===this) closeModal(); });
    document.getElementById('editModal')?.addEventListener('click', function(e) { if(e.target===this) closeEditModal(); });

    document.getElementById('authPassword')?.addEventListener('input', function() {
        const sd = document.getElementById('passwordStrength');
        if (!sd || !this.value) { if(sd) sd.innerHTML = ''; return; }
        const r = checkPasswordStrength(this.value);
        sd.innerHTML = '<div style="margin-top:6px;font-size:0.85rem;">Strength: <span style="color:'+r.color+';font-weight:700;">'+r.strength+'</span></div>';
    });

    document.getElementById('authName')?.addEventListener('input', async function() {
        const status = document.getElementById('usernameStatus');
        if (!status) return;
        const u = this.value.trim();
        if (u.length < 2) { status.innerHTML = ''; return; }
        const avail = await checkUsernameAvailability(u);
        status.innerHTML = avail ? '<span style="color:#16a34a;">✅ Available!</span>' : '<span style="color:#dc2626;">❌ Taken</span>';
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { const m = document.getElementById('authModal'); if(m&&m.classList.contains('active')) handleAuth(); }
        if (e.key === 'Escape') { closeModal(); closeEditModal(); }
    });

    document.getElementById('storyTitle')?.addEventListener('input', function() { document.getElementById('titleCount').textContent = this.value.length; });
    document.getElementById('storyText')?.addEventListener('input', function() { document.getElementById('textCount').textContent = this.value.length; });
    document.getElementById('commentText')?.addEventListener('input', function() { document.getElementById('commentCount').textContent = this.value.length; });

    document.getElementById('searchInput')?.addEventListener('keydown', function(e) { if(e.key==='Enter') searchStories(); });

    populateCountryDatalist();

    if (window.location.pathname.includes('profile.html') && typeof loadProfile === 'function') loadProfile();
    if (window.location.pathname.includes('story.html') && typeof loadStory === 'function') loadStory();
    if (window.location.pathname.includes('admin.html') && typeof loadAdminPanel === 'function') loadAdminPanel();
    if (window.location.pathname.includes('activity.html') && typeof loadActivity === 'function') loadActivity();
    if (window.location.pathname.includes('suggest.html') && typeof loadSuggestions === 'function') setTimeout(loadSuggestions, 500);

    console.log('✅ App ready');
});

// ============================================
// EXPOSE TO GLOBAL SCOPE
// ============================================
window.escapeHTML = escapeHTML;
window.sanitizeInput = sanitizeInput;
window.followUser = followUser;
window.isFollowing = isFollowing;
window.reportStory = reportStory;
window.reportUser = reportUser;
window.loadStories = loadStories;
window.switchCategory = switchCategory;
window.searchStories = searchStories;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
window.deleteStory = deleteStory;
window.toggleVisibility = toggleVisibility;
window.addReaction = addReaction;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.logout = logout;
window.resendVerification = resendVerification;
window.checkPasswordStrength = checkPasswordStrength;
window.populateCountryDatalist = populateCountryDatalist;
window.addNotification = addNotification;

console.log('✅ The Harbor app loaded');
