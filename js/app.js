// ============================================
// GENDER RESTRICTION CHECKS
// ============================================

function canReadCategory(category) {
    if (!currentUser || !currentUserData) {
        // Not logged in - can only read public categories
        return category === 'struggles' || category === 'fun' || category === 'learning' || category === 'all';
    }

    const gender = currentUserData.gender;

    // Public categories (everyone can read)
    if (category === 'struggles' || category === 'fun' || category === 'learning' || category === 'all') {
        return true;
    }

    // Men's section - only men can read
    if (category === 'men' && gender === '🧔 Man') {
        return true;
    }

    // Women's section - only women can read
    if (category === 'women' && gender === '👩 Woman') {
        return true;
    }

    // Non-binary or prefer not to say - can only read public categories
    return false;
}

function canPostInCategory(category) {
    if (!currentUser || !currentUserData) {
        return false;
    }

    const gender = currentUserData.gender;

    // Public categories (everyone can post)
    if (category === 'struggles' || category === 'fun' || category === 'learning') {
        return true;
    }

    // Men's section - only men can post
    if (category === 'men' && gender === '🧔 Man') {
        return true;
    }

    // Women's section - only women can post
    if (category === 'women' && gender === '👩 Woman') {
        return true;
    }

    return false;
}

function getCategoryRestrictionNote(category) {
    if (!currentUser || !currentUserData) {
        return '🔒 Please log in to access this section.';
    }

    const gender = currentUserData.gender;

    if (category === 'men' && gender !== '🧔 Man') {
        return '⚠️ This section is for <strong>Men only</strong>. Please visit The Storm, Sunny Skies, or The Compass.';
    }

    if (category === 'women' && gender !== '👩 Woman') {
        return '⚠️ This section is for <strong>Women only</strong>. Please visit The Storm, Sunny Skies, or The Compass.';
    }

    return null; // No restriction
}

// ============================================
// OVERRIDE LOAD STORIES WITH RESTRICTIONS
// ============================================

// Replace the existing loadStories function with this one
function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    // Check if user can read this category
    if (!canReadCategory(currentCategory)) {
        const gender = currentUserData ? currentUserData.gender : 'Guest';
        const restrictionNote = getCategoryRestrictionNote(currentCategory);
        
        container.innerHTML = `
            <div class="empty-state" style="padding:40px 20px;background:#f5d6b3;border-radius:16px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">🔒</div>
                <h3 style="color:#1a4a4a;">Access Restricted</h3>
                <p style="color:#2d3a3a;">${restrictionNote || 'You do not have permission to view this section.'}</p>
                <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <a href="category.html?cat=struggles" class="btn-primary" style="text-decoration:none;display:inline-block;padding:10px 24px;font-size:0.9rem;">🌊 The Storm</a>
                    <a href="category.html?cat=fun" class="btn-primary" style="text-decoration:none;display:inline-block;padding:10px 24px;font-size:0.9rem;">☀️ Sunny Skies</a>
                    <a href="category.html?cat=learning" class="btn-primary" style="text-decoration:none;display:inline-block;padding:10px 24px;font-size:0.9rem;">🧭 The Compass</a>
                </div>
            </div>
        `;
        return;
    }

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
                        ${canPostInCategory(currentCategory) ? 
                            `<a href="submit.html" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:12px;">📝 Share Your Story</a>` 
                            : 
                            `<p style="font-size:0.85rem;color:#7a9e7e;">You can share in The Storm, Sunny Skies, or The Compass.</p>`
                        }
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
