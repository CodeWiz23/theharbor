// ============================================
// HARBOR GOLD SYSTEM - FIXED v2
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
        if (currentUserData) {
            currentUserData.goldBalance = (currentUserData.goldBalance || 0) - result.amount;
            currentUserData.goldGiven = (currentUserData.goldGiven || 0) + result.amount;
        }
        if (typeof updateSidebarData === 'function') updateSidebarData();
        if (typeof loadStories === 'function') loadStories();
        // ✅ Show message in alert with gold diamond
        alert(`✅ You donated ${result.amount} 💎!${message ? '\n💬 "' + message + '"' : ''}`);
    }).catch(err => {
        console.error('Gold donation error:', err);
        if (err.message === 'Cannot donate to yourself') alert('⚠️ You cannot donate gold to your own story.');
        else alert('❌ Error: ' + err.message);
    });
}

// Modal helpers (used by story.html and index.html)
let selectedGoldAmount = 0;
let currentStoryId = null;

// ✅ FIX: Darker UI for gold modal with gold diamond
function openGoldModal(storyId) {
    if (!currentUser) { alert('⚠️ Please log in.'); return; }
    if (!currentUserData) { alert('Loading...'); return; }
    const balance = currentUserData.goldBalance || 0;
    if (balance < 1) { alert('⚠️ No gold!'); return; }
    
    // ✅ Create modal if it doesn't exist (for feed)
    let modal = document.getElementById('goldModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'goldModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="background: var(--bg-card); border: 1px solid var(--border-color);">
                <button class="modal-close" onclick="closeGoldModal()" aria-label="Close">&times;</button>
                <h2 style="color: var(--text-primary);">💎 Donate Gold</h2>
                <div class="gold-balance-display" style="padding:12px;background: #2d2d2d;border-radius:var(--radius-sm);margin-bottom:14px;text-align:center;font-weight:600;color:white;">
                    Your Balance: <span id="goldBalanceAmount" style="font-size:1.2rem;color:#f1c40f;">0</span> 💎
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                    <button class="gold-amount-btn" onclick="selectGoldAmount(1)" style="background:#2d2d2d;color:white;border:1px solid #444;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s;">1 💎</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(5)" style="background:#2d2d2d;color:white;border:1px solid #444;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s;">5 💎</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(10)" style="background:#2d2d2d;color:white;border:1px solid #444;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s;">10 💎</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(25)" style="background:#2d2d2d;color:white;border:1px solid #444;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s;">25 💎</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(50)" style="background:#2d2d2d;color:white;border:1px solid #444;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s;">50 💎</button>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-weight:600;display:block;margin-bottom:4px;color:var(--text-secondary);">Custom Amount:</label>
                    <input type="number" id="customGoldAmount" placeholder="Enter amount..." min="1" style="width:100%;padding:8px 12px;border:2px solid #444;border-radius:8px;font-size:1rem;font-family:inherit;background:#2d2d2d;color:white;" />
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-weight:600;display:block;margin-bottom:4px;color:var(--text-secondary);">💬 Message (optional):</label>
                    <textarea id="goldMessage" placeholder="Say something nice to the author..." rows="2" style="width:100%;padding:8px 12px;border:2px solid #444;border-radius:8px;font-family:inherit;resize:vertical;background:#2d2d2d;color:white;"></textarea>
                </div>
                <div id="goldError" class="error-msg"></div>
                <button class="btn-modal" onclick="confirmGoldDonation()" style="background:linear-gradient(135deg,#f1c40f,#f39c12);color:#1a1a2e;font-weight:700;border:none;border-radius:8px;padding:12px;width:100%;font-size:1rem;cursor:pointer;transition:all 0.2s;">💎 Send Gold</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeGoldModal();
        });
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
    document.querySelectorAll('.gold-amount-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = '#2d2d2d';
        b.style.borderColor = '#444';
    });
    if (event && event.target) {
        event.target.classList.add('selected');
        event.target.style.background = '#f1c40f';
        event.target.style.color = '#1a1a2e';
        event.target.style.borderColor = '#f1c40f';
    }
}

function closeGoldModal() { 
    const m = document.getElementById('goldModal'); 
    if (m) m.classList.remove('active'); 
}

function confirmGoldDonation() {
    const customInput = document.getElementById('customGoldAmount');
    const messageInput = document.getElementById('goldMessage');
    const errorDiv = document.getElementById('goldError');
    let amount = selectedGoldAmount;
    if (customInput && customInput.value) { 
        const c = parseInt(customInput.value); 
        if (c > 0) amount = c; 
    }
    const balance = currentUserData?.goldBalance || 0;
    if (!amount || amount < 1) { 
        errorDiv.textContent = 'Enter valid amount.'; 
        return; 
    }
    if (amount > balance) { 
        errorDiv.textContent = 'Not enough gold! Balance: ' + balance; 
        return; 
    }
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

console.log('💰 Gold system loaded (v2 - feed support, darker UI, diamond)');
