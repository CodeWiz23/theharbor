// ============================================
// GOLD SYSTEM — COMPLETE FIXED
// ============================================

function getGoldBalance() {
    if (!currentUser || !currentUserData) return 0;
    return currentUserData.goldBalance || 0;
}

function donateGold(storyId, amount, message) {
    if (!currentUser) {
        alert('Please log in to donate gold.');
        return Promise.reject('Not logged in');
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return Promise.reject('User data not loaded');
    }

    const balance = currentUserData.goldBalance || 0;
    if (amount < 1) {
        alert('Amount must be at least 1.');
        return Promise.reject('Invalid amount');
    }

    if (amount > balance) {
        alert('⚠️ You don\'t have enough gold! Balance: ' + balance + ' 🪙');
        return Promise.reject('Insufficient gold');
    }

    const storyRef = db.collection('stories').doc(storyId);
    const userRef = db.collection('users').doc(currentUser.uid);

    return db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((storyDoc) => {
            if (!storyDoc.exists) throw new Error('Story not found');
            const storyData = storyDoc.data();
            const authorId = storyData.userId;

            // Prevent self-donation
            if (authorId === currentUser.uid) {
                throw new Error('You cannot donate gold to your own stories.');
            }

            return transaction.get(db.collection('users').doc(authorId)).then((authorDoc) => {
                if (!authorDoc.exists) throw new Error('Author not found');

                // Update donor's gold
                transaction.update(userRef, {
                    goldBalance: firebase.firestore.FieldValue.increment(-amount),
                    goldGiven: firebase.firestore.FieldValue.increment(amount)
                });

                // Update recipient's gold
                transaction.update(db.collection('users').doc(authorId), {
                    goldBalance: firebase.firestore.FieldValue.increment(amount),
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });

                // Update story's gold received
                transaction.update(storyRef, {
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });

                // Create transaction record
                const transactionRef = db.collection('goldTransactions').doc();
                transaction.set(transactionRef, {
                    fromUid: currentUser.uid,
                    toUid: authorId,
                    storyId: storyId,
                    amount: amount,
                    message: message || '',
                    fromName: currentUserData ? currentUserData.name : 'Anonymous',
                    toName: authorDoc.data().name || 'Someone',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    });
}

function viewGoldTransactions() {
    if (!currentUser) {
        alert('Please log in.');
        return;
    }

    db.collection('goldTransactions')
        .where('fromUid', '==', currentUser.uid)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                alert('📊 No gold transactions yet.');
                return;
            }
            let message = '📊 Gold Transaction History:\n\n';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const time = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Recently';
                message += `💰 ${data.amount} 🪙 → ${data.toName} (${time})\n`;
                if (data.message) message += `   💬 ${data.message}\n`;
            });
            alert(message);
        })
        .catch((err) => {
            alert('❌ Error: ' + err.message);
        });
}

// ============================================
// GOLD REWARDS
// ============================================

function awardGoldForStory() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).update({
        goldBalance: firebase.firestore.FieldValue.increment(5)
    }).then(() => {
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) + 5;
        }
        console.log('💰 Awarded 5 gold for sharing a story!');
    }).catch((err) => console.error('Error awarding gold:', err));
}

function awardGoldForComment() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).update({
        goldBalance: firebase.firestore.FieldValue.increment(1)
    }).then(() => {
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) + 1;
        }
        console.log('💰 Awarded 1 gold for commenting!');
    }).catch((err) => console.error('Error awarding gold:', err));
}

function awardGoldForReaction() {
    // Small chance to award gold for reactions
    if (!currentUser || Math.random() > 0.05) return;

    db.collection('users').doc(currentUser.uid).update({
        goldBalance: firebase.firestore.FieldValue.increment(1)
    }).then(() => {
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) + 1;
        }
        console.log('💰 Awarded 1 gold for reacting!');
    }).catch((err) => console.error('Error awarding gold:', err));
}

// Export functions for global use
window.getGoldBalance = getGoldBalance;
window.donateGold = donateGold;
window.viewGoldTransactions = viewGoldTransactions;
window.awardGoldForStory = awardGoldForStory;
window.awardGoldForComment = awardGoldForComment;
window.awardGoldForReaction = awardGoldForReaction;

console.log('✅ Gold system loaded');
