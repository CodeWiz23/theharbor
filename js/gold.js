// ============================================
// HARBOR GOLD SYSTEM - FIXED
// ============================================

function donateGold(storyId, amount, message) {
    if (!currentUser) { alert('⚠️ Please log in to donate gold.'); return; }
    if (!currentUser.emailVerified) { alert('⚠️ Please verify your email first.'); return; }
    if (!amount || amount < 1) { alert('Please enter a valid amount (minimum 1).'); return; }
    amount = Math.floor(amount);

    const userRef = db.collection('users').doc(currentUser.uid);

    userRef.get().then(doc => {
        if (!doc.exists) { alert('User data not found.'); return; }
        const balance = doc.data().goldBalance || 0;
        if (balance < amount) { alert('⚠️ Insufficient gold! You have ' + balance + ' 🪙'); return; }

        return db.runTransaction(transaction => {
            return transaction.get(db.collection('stories').doc(storyId)).then(storyDoc => {
                if (!storyDoc.exists) throw new Error('Story not found');
                const authorId = storyDoc.data().userId;
                if (authorId === currentUser.uid) throw new Error('Cannot donate to yourself');

                transaction.update(userRef, {
                    goldBalance: firebase.firestore.FieldValue.increment(-amount),
                    goldGiven: firebase.firestore.FieldValue.increment(amount)
                });
                transaction.update(db.collection('users').doc(authorId), {
                    goldBalance: firebase.firestore.FieldValue.increment(amount),
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });
                transaction.update(db.collection('stories').doc(storyId), {
                    goldReceived: firebase.firestore.FieldValue.increment(amount)
                });

                const txRef = db.collection('goldTransactions').doc();
                transaction.set(txRef, {
                    fromUid: currentUser.uid, toUid: authorId, storyId,
                    amount, message: message || '',
                    fromName: currentUserData?.name || 'Anonymous',
                    toName: 'Someone',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                return { amount, authorId };
            });
        });
    }).then(result => {
        // FIX #25: Only update balance on success
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) - result.amount;
            currentUserData.goldGiven = (currentUserData.goldGiven || 0) + result.amount;
        }
        if (typeof updateSidebarData === 'function') updateSidebarData();
        if (typeof loadStories === 'function') loadStories();
        alert(`✅ You donated ${result.amount} 🪙!${message ? '\n💬 "' + message + '"' : ''}`);
    }).catch(err => {
        console.error('Gold donation error:', err);
        if (err.message === 'Cannot donate to yourself') alert('⚠️ You cannot donate gold to your own story.');
        else alert('❌ Error: ' + err.message + '\n\nThis may be due to Firestore security rules. Make sure rules allow gold transfers between users.');
    });
}

// Modal helpers (used by story.html and index.html)
let selectedGoldAmount = 0;

function openGoldModal(storyId) {
    if (!currentUser) { alert('⚠️ Please log in.'); return; }
    if (!currentUserData) { alert('Loading...'); return; }
    const balance = currentUserData.goldBalance || 0;
    if (balance < 1) { alert('⚠️ No gold!'); return; }
    const modal = document.getElementById('goldModal');
    if (!modal) {
        // Fallback for pages without gold modal HTML
        const amount = prompt('Enter amount to donate (Balance: ' + balance + ' 🪙):');
        if (amount && parseInt(amount) > 0 && parseInt(amount) <= balance) {
            const msg = prompt('Message (optional):') || '';
            donateGold(storyId, parseInt(amount), msg);
        }
        return;
    }
    document.getElementById('goldBalanceAmount').textContent = balance;
    modal.classList.add('active');
    currentStoryId = storyId;
    selectedGoldAmount = 0;
    document.getElementById('customGoldAmount').value = '';
    document.getElementById('goldMessage').value = '';
    document.getElementById('goldError').textContent = '';
    document.querySelectorAll('.gold-amount-btn').forEach(b => b.classList.remove('selected'));
}

function selectGoldAmount(amount) {
    selectedGoldAmount = amount;
    document.getElementById('customGoldAmount').value = amount;
    document.querySelectorAll('.gold-amount-btn').forEach(b => b.classList.remove('selected'));
    if (event && event.target) event.target.classList.add('selected');
}

function closeGoldModal() { const m = document.getElementById('goldModal'); if (m) m.classList.remove('active'); }

function confirmGoldDonation() {
    const customInput = document.getElementById('customGoldAmount');
    const messageInput = document.getElementById('goldMessage');
    const errorDiv = document.getElementById('goldError');
    let amount = selectedGoldAmount;
    if (customInput && customInput.value) { const c = parseInt(customInput.value); if (c > 0) amount = c; }
    const balance = currentUserData?.goldBalance || 0;
    if (!amount || amount < 1) { errorDiv.textContent = 'Enter valid amount.'; return; }
    if (amount > balance) { errorDiv.textContent = 'Not enough gold! Balance: ' + balance; return; }
    const message = messageInput?.value.trim() || '';
    closeGoldModal();
    donateGold(currentStoryId, amount, message);
}

// Expose
window.openGoldModal = openGoldModal;
window.selectGoldAmount = selectGoldAmount;
window.closeGoldModal = closeGoldModal;
window.confirmGoldDonation = confirmGoldDonation;
window.donateGold = donateGold;

console.log('💰 Gold system loaded');
