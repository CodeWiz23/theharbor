// ============================================
// NOTIFICATIONS BADGE COUNTER
// ============================================

let unreadCount = 0;
let badgeUnsubscribe = null;

function initNotificationBadge() {
    if (!currentUser) {
        updateBadge(0);
        return;
    }

    if (badgeUnsubscribe) badgeUnsubscribe();

    badgeUnsubscribe = db.collection('notifications')
        .where('toUid', '==', currentUser.uid)
        .where('read', '==', false)
        .onSnapshot(snapshot => {
            unreadCount = snapshot.size;
            updateBadge(unreadCount);
        }, err => {
            console.warn('Badge listener error:', err);
            updateBadge(0);
        });
}

function updateBadge(count) {
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });

    const title = document.title.replace(/^\(\d+\) /, '');
    document.title = count > 0 ? '(' + count + ') ' + title : title;
}

if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(user => {
        if (user) {
            initNotificationBadge();
        } else {
            updateBadge(0);
        }
    });
}
