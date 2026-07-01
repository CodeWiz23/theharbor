// ============================================
// HARBOR GOLD SYSTEM - FIXED v3 (MATCH IMAGE)
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
        alert(`✅ You donated ${result.amount} 🪙!${message ? '\n💬 "' + message + '"' : ''}`);
    }).catch(err => {
        console.error('Gold donation error:', err);
        if (err.message === 'Cannot donate to yourself') alert('⚠️ You cannot donate gold to your own story.');
        else alert('❌ Error: ' + err.message);
    });
}

// Modal helpers
let selectedGoldAmount = 0;
let currentStoryId = null;

// ✅ EXACT MATCH TO IMAGE
function openGoldModal(storyId) {
    if (!currentUser) { alert('⚠️ Please log in.'); return; }
    if (!currentUserData) { alert('Loading...'); return; }
    const balance = currentUserData.goldBalance || 0;
    if (balance < 1) { alert('⚠️ No gold!'); return; }
    
    let modal = document.getElementById('goldModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'goldModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 24px;
                max-width: 420px;
                width: 100%;
                box-shadow: var(--shadow-xl);
                position: relative;
            ">
                <button class="modal-close" onclick="closeGoldModal()" style="
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-muted);
                ">&times;</button>
                
                <h2 style="
                    font-size: 1.4rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                ">💰 Donate Gold</h2>
                
                <div style="
                    padding: 10px 14px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-sm);
                    margin: 12px 0 16px;
                    text-align: center;
                    font-weight: 600;
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                ">
                    Your Balance: <span id="goldBalanceAmount" style="color: var(--secondary); font-weight: 700;">0</span> 🪙
                </div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
                    <button class="gold-amount-btn" onclick="selectGoldAmount(1)" style="
                        flex: 1;
                        min-width: 40px;
                        padding: 8px 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        color: var(--text-primary);
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    ">1</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(5)" style="
                        flex: 1;
                        min-width: 40px;
                        padding: 8px 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        color: var(--text-primary);
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    ">5</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(10)" style="
                        flex: 1;
                        min-width: 40px;
                        padding: 8px 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        color: var(--text-primary);
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    ">10</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(25)" style="
                        flex: 1;
                        min-width: 40px;
                        padding: 8px 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        color: var(--text-primary);
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    ">25</button>
                    <button class="gold-amount-btn" onclick="selectGoldAmount(50)" style="
                        flex: 1;
                        min-width: 40px;
                        padding: 8px 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        cursor: pointer;
                        font-weight: 600;
                        color: var(--text-primary);
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    ">50</button>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="
                        font-weight: 600;
                        display: block;
                        margin-bottom: 4px;
                        color: var(--text-secondary);
                        font-size: 0.85rem;
                    ">Custom Amount:</label>
                    <input type="number" id="customGoldAmount" placeholder="Enter amount..." min="1" style="
                        width: 100%;
                        padding: 10px 14px;
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        font-size: 0.95rem;
                        font-family: inherit;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        transition: border 0.2s;
                    ">
                </div>
                
                <div style="margin-bottom: 14px;">
                    <label style="
                        font-weight: 600;
                        display: block;
                        margin-bottom: 4px;
                        color: var(--text-secondary);
                        font-size: 0.85rem;
                    ">Message (optional):</label>
                    <textarea id="goldMessage" placeholder="Say something nice to the author..." rows="2" style="
                        width: 100%;
                        padding: 10px 14px;
                        border: 2px solid var(--border-color);
                        border-radius: var(--radius-sm);
                        font-family: inherit;
                        font-size: 0.9rem;
                        resize: vertical;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        transition: border 0.2s;
                    "></textarea>
                </div>
                
                <div id="goldError" class="error-msg" style="
                    color: var(--danger);
                    font-size: 0.85rem;
                    text-align: center;
                    margin-bottom: 8px;
                "></div>
                
                <button class="btn-modal" onclick="confirmGoldDonation()" style="
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #f1c40f, #f39c12);
                    color: #1a1a2e;
                    font-weight: 700;
                    border: none;
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                ">Send Gold</button>
            </div>
        `;
        document.body.appendChild(modal);
        
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
    document.querySelectorAll('.gold-amount-btn').forEach(b => {
        b.style.background = 'var(--bg-secondary)';
        b.style.borderColor = 'var(--border-color)';
        b.style.color = 'var(--text-primary)';
    });
}

function selectGoldAmount(amount) {
    selectedGoldAmount = amount;
    document.getElementById('customGoldAmount').value = amount;
    document.querySelectorAll('.gold-amount-btn').forEach(b => {
        b.style.background = 'var(--bg-secondary)';
        b.style.borderColor = 'var(--border-color)';
        b.style.color = 'var(--text-primary)';
    });
    if (event && event.target) {
        event.target.style.background = 'var(--primary)';
        event.target.style.borderColor = 'var(--primary)';
        event.target.style.color = 'white';
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
    errorDiv.textContent = '';
    closeGoldModal();
    donateGold(currentStoryId, amount, message);
}

// Expose
window.openGoldModal = openGoldModal;
window.selectGoldAmount = selectGoldAmount;
window.closeGoldModal = closeGoldModal;
window.confirmGoldDonation = confirmGoldDonation;
window.donateGold = donateGold;

console.log('💰 Gold system loaded (v3 - EXACT match to image)');
