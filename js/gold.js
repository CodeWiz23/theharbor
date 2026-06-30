// ============================================
// HARBOR GOLD SYSTEM
// ============================================

// ============================================
// INITIALIZE GOLD FOR NEW USER
// ============================================
function initGold(userId) {
    return db.collection('users').doc(userId).set({
        goldBalance: 10,
        goldReceived: 0,
        goldGiven: 0
    }, { merge: true });
}

// ============================================
// DONATE GOLD TO STORY
// ============================================
function donateGold(storyId, amount, message) {
    if (!currentUser) {
        alert('⚠️ Please log in to donate gold.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('⚠️ Please verify your email first.');
        return;
    }

    if (!amount || amount < 1) {
        alert('Please enter a valid amount (minimum 1).');
        return;
    }

    amount = Math.floor(amount);

    const userRef = db.collection('users').doc(currentUser.uid);

    userRef.get().then((doc) => {
        if (!doc.exists) {
            alert('User data not found.');
            return;
        }

        const userData = doc.data();
        const balance = userData.goldBalance || 0;

        if (balance < amount) {
            alert('⚠️ Insufficient gold! You have ' + balance + ' 🪙');
            return;
        }

        // Start transaction
        return db.runTransaction((transaction) => {
            // 1. Get story
            return transaction.get(db.collection('stories').doc(storyId)).then((storyDoc) => {
                if (!storyDoc.exists) {
                    throw new Error('Story not found');
                }

                const storyData = storyDoc.data();
                const authorId = storyData.userId;

                // 2. Get author data
                return transaction.get(db.collection('users').doc(authorId)).then((authorDoc) => {
                    if (!authorDoc.exists) {
                        throw new Error('Author not found');
                    }

                    const authorData = authorDoc.data();

                    // 3. Update sender
                    transaction.update(userRef, {
                        goldBalance: firebase.firestore.FieldValue.increment(-amount),
                        goldGiven: firebase.firestore.FieldValue.increment(amount)
                    });

                    // 4. Update author
                    transaction.update(db.collection('users').doc(authorId), {
                        goldBalance: firebase.firestore.FieldValue.increment(amount),
                        goldReceived: firebase.firestore.FieldValue.increment(amount)
                    });

                    // 5. Update story
                    transaction.update(db.collection('stories').doc(storyId), {
                        goldReceived: firebase.firestore.FieldValue.increment(amount)
                    });

                    // 6. Create transaction record
                    const transactionRef = db.collection('goldTransactions').doc();
                    transaction.set(transactionRef, {
                        fromUid: currentUser.uid,
                        toUid: authorId,
                        storyId: storyId,
                        amount: amount,
                        message: message || '',
                        fromName: currentUserData ? currentUserData.name : 'Anonymous',
                        toName: authorData.name || 'Someone',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // 7. Create notification (if author != sender)
                    if (authorId !== currentUser.uid) {
                        const notifRef = db.collection('notifications').doc();
                        transaction.set(notifRef, {
                            uid: authorId,
                            type: 'gold',
                            fromUid: currentUser.uid,
                            fromName: currentUserData ? currentUserData.name : 'Anonymous',
                            storyId: storyId,
                            amount: amount,
                            message: message || '',
                            read: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    return { amount, authorId, authorName: authorData.name };
                });
            });
        }).then((result) => {
            // Update local data
            if (currentUserData) {
                currentUserData.goldBalance = (currentUserData.goldBalance || 0) - amount;
                currentUserData.goldGiven = (currentUserData.goldGiven || 0) + amount;
            }

            // Update sidebar
            if (typeof updateSidebarData === 'function') {
                updateSidebarData();
            }

            // Show success message
            const msg = message ? `\n💬 "${message}"` : '';
            alert(`✅ You donated ${amount} 🪙 to ${result.authorName}!${msg}`);

            // Reload stories to update display
            if (typeof loadStories === 'function') {
                loadStories();
            }

            return result;
        }).catch((err) => {
            console.error('Gold donation error:', err);
            alert('❌ Error donating gold: ' + err.message);
        });
    }).catch((err) => {
        console.error('Error checking balance:', err);
        alert('❌ Error: ' + err.message);
    });
}

// ============================================
// OPEN GOLD DONATION MODAL
// ============================================
function openGoldModal(storyId) {
    if (!currentUser) {
        alert('⚠️ Please log in to donate gold.');
        return;
    }

    if (!currentUserData) {
        alert('Loading user data...');
        return;
    }

    const balance = currentUserData.goldBalance || 0;

    if (balance < 1) {
        alert('⚠️ You don\'t have any gold! Join the community and share stories to earn gold.');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'goldModal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeGoldModal()">&times;</button>
            <h2>💰 Donate Gold</h2>

            <div class="gold-balance-display" style="padding:12px;background:#f5d6b3;border-radius:8px;margin-bottom:16px;">
                Your Balance: <strong>${balance} 🪙</strong>
            </div>

            <div class="gold-amounts" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <button class="gold-amount-btn" onclick="selectGoldAmount(1)" style="padding:8px 16px;background:#e8ddd0;border:2px solid #d4c8b8;border-radius:8px;cursor:pointer;font-weight:600;">1 🪙</button>
                <button class="gold-amount-btn" onclick="selectGoldAmount(5)" style="padding:8px 16px;background:#e8ddd0;border:2px solid #d4c8b8;border-radius:8px;cursor:pointer;font-weight:600;">5 🪙</button>
                <button class="gold-amount-btn" onclick="selectGoldAmount(10)" style="padding:8px 16px;background:#e8ddd0;border:2px solid #d4c8b8;border-radius:8px;cursor:pointer;font-weight:600;">10 🪙</button>
                <button class="gold-amount-btn" onclick="selectGoldAmount(25)" style="padding:8px 16px;background:#e8ddd0;border:2px solid #d4c8b8;border-radius:8px;cursor:pointer;font-weight:600;">25 🪙</button>
                <button class="gold-amount-btn" onclick="selectGoldAmount(50)" style="padding:8px 16px;background:#e8ddd0;border:2px solid #d4c8b8;border-radius:8px;cursor:pointer;font-weight:600;">50 🪙</button>
            </div>

            <div class="custom-gold" style="margin-bottom:12px;">
                <label for="customGoldAmount" style="font-weight:600;display:block;margin-bottom:4px;">Custom Amount:</label>
                <input type="number" id="customGoldAmount" placeholder="Enter amount..." min="1" max="${balance}" style="width:100%;padding:8px 12px;border:2px solid #d4c8b8;border-radius:8px;font-size:1rem;" />
            </div>

            <div class="gold-message" style="margin-bottom:12px;">
                <label for="goldMessage" style="font-weight:600;display:block;margin-bottom:4px;">Message (optional):</label>
                <textarea id="goldMessage" placeholder="Say something nice..." rows="2" style="width:100%;padding:8px 12px;border:2px solid #d4c8b8;border-radius:8px;font-family:inherit;resize:vertical;"></textarea>
            </div>

            <div id="goldError" class="error-msg"></div>
            <button class="btn-modal" onclick="confirmGoldDonation('${storyId}')" style="background:#c47a5a;color:white;border:none;border-radius:30px;padding:12px;font-weight:700;width:100%;cursor:pointer;">💎 Send Gold</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeGoldModal();
    });
}

// ============================================
// SELECT GOLD AMOUNT
// ============================================
let selectedGoldAmount = 0;

function selectGoldAmount(amount) {
    selectedGoldAmount = amount;
    const customInput = document.getElementById('customGoldAmount');
    if (customInput) {
        customInput.value = amount;
    }

    // Highlight selected button
    document.querySelectorAll('.gold-amount-btn').forEach(btn => {
        btn.style.borderColor = 'var(--sidebar-border, #d4c8b8)';
        btn.style.background = 'var(--sidebar-btn-bg, #e8ddd0)';
    });
    event.target.style.borderColor = '#c47a5a';
    event.target.style.background = '#f5d6b3';
}

// ============================================
// CONFIRM GOLD DONATION
// ============================================
function confirmGoldDonation(storyId) {
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
        errorDiv.textContent = 'Please select or enter a valid amount (minimum 1).';
        return;
    }

    if (amount > balance) {
        errorDiv.textContent = '⚠️ You don\'t have enough gold! Balance: ' + balance + ' 🪙';
        return;
    }

    const message = messageInput ? messageInput.value.trim() : '';

    closeGoldModal();
    donateGold(storyId, amount, message);
}

// ============================================
// CLOSE GOLD MODAL
// ============================================
function closeGoldModal() {
    const modal = document.getElementById('goldModal');
    if (modal) {
        modal.remove();
    }
    selectedGoldAmount = 0;
}

// ============================================
// ADD GOLD BUTTON TO STORY CARDS
// ============================================
function addGoldButtonToCard(storyId) {
    // This function is called from renderStoryCard
    // The button is already added in the HTML
    // Just attach the click handler
    const btn = document.querySelector(`[data-gold-btn="${storyId}"]`);
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openGoldModal(storyId);
        });
    }
}

console.log('💰 Gold system loaded');
