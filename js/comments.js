// ============================================
// ENHANCED COMMENT SYSTEM
// ============================================

// ============================================
// LOAD COMMENTS WITH RANKING
// ============================================
function loadCommentsEnhanced(storyId) {
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
                        <p style="color:#7a9e7e;">💬 No comments yet. Be the first to share your thoughts!</p>
                    </div>
                `;
                return;
            }

            const comments = [];
            snapshot.forEach((doc) => {
                const c = doc.data();
                c.id = doc.id;
                comments.push(c);
            });

            // Sort: Pinned first, then by likes (most liked first)
            comments.sort((a, b) => {
                // Pinned comments first
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // Then by likes (descending)
                return (b.likes || 0) - (a.likes || 0);
            });

            // Find top comment for star badge
            const topComment = comments.length > 0 && !comments[0].isPinned ? comments[0] : 
                              comments.find(c => !c.isPinned) || comments[0];

            let html = '<h3 style="margin-bottom:16px;">💬 Comments</h3>';
            comments.forEach((c) => {
                const isTop = c.id === topComment?.id && !c.isPinned;
                html += renderCommentEnhanced(c, isTop);
            });
            container.innerHTML = html;
        })
        .catch((err) => {
            console.error('Error loading comments:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <p style="color:#c0392b;">⚠️ Error loading comments</p>
                    <button class="btn-primary" onclick="loadCommentsEnhanced('${storyId}')" style="margin-top:10px;padding:8px 20px;font-size:0.9rem;">
                        🔄 Retry
                    </button>
                </div>
            `;
        });
}

// ============================================
// RENDER COMMENT ENHANCED
// ============================================
function renderCommentEnhanced(comment, isTopComment) {
    const author = comment.isAnonymous ? '🕊️ Anonymous' : escapeHTML(comment.authorName || 'Someone');
    const time = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Recently';
    const likes = comment.likes || 0;
    const isOwner = currentUser && comment.userId === currentUser.uid;
    const isAdmin = currentUserData && currentUserData.isAdmin === true;

    let badges = '';
    if (comment.isPinned) {
        badges += '<span class="comment-badge pinned">📌 Pinned</span>';
    }
    if (isTopComment) {
        badges += '<span class="comment-badge star">⭐ Top Comment</span>';
    }

    return `
        <div class="comment" id="comment-${comment.id}">
            <div class="comment-header">
                <div class="comment-author">
                    ✍️ ${author}
                    ${badges}
                </div>
                <div class="comment-time">📅 ${time}</div>
            </div>
            <div class="comment-text">${escapeHTML(comment.text)}</div>
            <div class="comment-actions">
                <button class="comment-like-btn" onclick="likeCommentEnhanced('${comment.id}')">
                    ❤️ <span class="count">${likes}</span>
                </button>
                ${isOwner ? `<button class="comment-delete-btn" onclick="deleteCommentEnhanced('${comment.id}')">🗑️ Delete</button>` : ''}
                ${isAdmin ? `
                    <button class="comment-pin-btn" onclick="pinComment('${comment.id}')">
                        ${comment.isPinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                ` : ''}
                <button class="comment-report-btn" onclick="reportCommentEnhanced('${comment.id}', '${comment.storyId}')">🚩 Report</button>
            </div>
        </div>
    `;
}

// ============================================
// LIKE COMMENT ENHANCED
// ============================================
function likeCommentEnhanced(commentId) {
    if (!currentUser) {
        alert('Please log in to like comments.');
        return;
    }

    db.collection('comments').doc(commentId).update({
        likes: firebase.firestore.FieldValue.increment(1)
    })
    .then(() => {
        const urlParams = new URLSearchParams(window.location.search);
        loadCommentsEnhanced(urlParams.get('id'));
    })
    .catch((err) => {
        console.error('Error liking comment:', err);
        alert('Could not like comment. Please try again.');
    });
}

// ============================================
// DELETE COMMENT ENHANCED
// ============================================
function deleteCommentEnhanced(commentId) {
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
            loadCommentsEnhanced(urlParams.get('id'));
        })
        .catch((err) => {
            console.error('Error deleting comment:', err);
            alert('Could not delete comment: ' + err.message);
        });
}

// ============================================
// PIN COMMENT (Admin only)
// ============================================
function pinComment(commentId) {
    if (!currentUser || !currentUserData?.isAdmin) {
        alert('Only admins can pin comments.');
        return;
    }

    db.collection('comments').doc(commentId).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('Comment not found.');
                return;
            }
            const currentPinned = doc.data().isPinned || false;
            return db.collection('comments').doc(commentId).update({
                isPinned: !currentPinned
            });
        })
        .then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            loadCommentsEnhanced(urlParams.get('id'));
        })
        .catch((err) => {
            console.error('Error pinning comment:', err);
            alert('Error: ' + err.message);
        });
}

// ============================================
// REPORT COMMENT ENHANCED
// ============================================
function reportCommentEnhanced(commentId, storyId) {
    if (!currentUser) {
        alert('Please log in to report.');
        return;
    }

    const reason = prompt('Why are you reporting this comment?');
    if (!reason || reason.trim().length < 3) {
        alert('Please provide a valid reason (minimum 3 characters).');
        return;
    }

    db.collection('comments').doc(commentId).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('Comment not found.');
                return;
            }
            const comment = doc.data();
            return db.collection('reports').add({
                commentId: commentId,
                commentText: comment.text || '',
                commentAuthor: comment.authorName || 'Unknown',
                storyId: storyId,
                reportedBy: currentUser.uid,
                reporterName: currentUserData ? currentUserData.name : 'Anonymous',
                reason: reason.trim(),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'comment'
            });
        })
        .then(() => {
            alert('✅ Thank you! Your report has been submitted.');
        })
        .catch((err) => {
            console.error('Error reporting comment:', err);
            alert('❌ Could not submit report. Please try again.');
        });
}

console.log('💬 Enhanced comment system loaded');
