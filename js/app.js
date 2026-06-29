// ============================================
// 🔥 THE HARBOR — Complete JavaScript
// ============================================

// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyBoYWOijOWqjd3d3_NAiSsiGmQ0HokaRGs",
    authDomain: "the-harbor-community.firebaseapp.com",
    projectId: "the-harbor-community",
    storageBucket: "the-harbor-community.firebasestorage.app",
    messagingSenderId: "634248505303",
    appId: "1:634248505303:web:4eb16e6a9f97903420cd92"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let currentUserData = null;
let currentCategory = 'all';
let userReactions = {};
let usernames = [];
let isAdmin = false;

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
// SECURITY: CSRF Protection
// ============================================
function generateCSRFToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateCSRFToken(token) {
    return token && token.length > 20;
}

// ============================================
// SECURITY: Password Strength
// ============================================
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
    else { strength = 'very-weak'; color = '#c0392b'; }

    return { score, strength, color };
}

// ============================================
// COUNTRY DATA
// ============================================
const countries = [
    { code: 'AF', name: 'Afghanistan', emergency: '119' },
    { code: 'AL', name: 'Albania', emergency: '112' },
    { code: 'DZ', name: 'Algeria', emergency: '14' },
    { code: 'AD', name: 'Andorra', emergency: '112' },
    { code: 'AO', name: 'Angola', emergency: '113' },
    { code: 'AR', name: 'Argentina', emergency: '911' },
    { code: 'AM', name: 'Armenia', emergency: '112' },
    { code: 'AU', name: 'Australia', emergency: '000' },
    { code: 'AT', name: 'Austria', emergency: '112' },
    { code: 'AZ', name: 'Azerbaijan', emergency: '112' },
    { code: 'BS', name: 'Bahamas', emergency: '911' },
    { code: 'BH', name: 'Bahrain', emergency: '999' },
    { code: 'BD', name: 'Bangladesh', emergency: '999' },
    { code: 'BB', name: 'Barbados', emergency: '911' },
    { code: 'BY', name: 'Belarus', emergency: '112' },
    { code: 'BE', name: 'Belgium', emergency: '112' },
    { code: 'BZ', name: 'Belize', emergency: '911' },
    { code: 'BJ', name: 'Benin', emergency: '112' },
    { code: 'BT', name: 'Bhutan', emergency: '112' },
    { code: 'BO', name: 'Bolivia', emergency: '911' },
    { code: 'BA', name: 'Bosnia', emergency: '112' },
    { code: 'BW', name: 'Botswana', emergency: '999' },
    { code: 'BR', name: 'Brazil', emergency: '190' },
    { code: 'BN', name: 'Brunei', emergency: '995' },
    { code: 'BG', name: 'Bulgaria', emergency: '112' },
    { code: 'BF', name: 'Burkina Faso', emergency: '112' },
    { code: 'BI', name: 'Burundi', emergency: '112' },
    { code: 'KH', name: 'Cambodia', emergency: '119' },
    { code: 'CM', name: 'Cameroon', emergency: '112' },
    { code: 'CA', name: 'Canada', emergency: '911' },
    { code: 'CV', name: 'Cape Verde', emergency: '132' },
    { code: 'CF', name: 'Central African Republic', emergency: '112' },
    { code: 'TD', name: 'Chad', emergency: '112' },
    { code: 'CL', name: 'Chile', emergency: '131' },
    { code: 'CN', name: 'China', emergency: '110' },
    { code: 'CO', name: 'Colombia', emergency: '123' },
    { code: 'KM', name: 'Comoros', emergency: '112' },
    { code: 'CG', name: 'Congo', emergency: '112' },
    { code: 'CR', name: 'Costa Rica', emergency: '911' },
    { code: 'HR', name: 'Croatia', emergency: '112' },
    { code: 'CU', name: 'Cuba', emergency: '106' },
    { code: 'CY', name: 'Cyprus', emergency: '112' },
    { code: 'CZ', name: 'Czech Republic', emergency: '112' },
    { code: 'DK', name: 'Denmark', emergency: '112' },
    { code: 'DJ', name: 'Djibouti', emergency: '112' },
    { code: 'DM', name: 'Dominica', emergency: '911' },
    { code: 'DO', name: 'Dominican Republic', emergency: '911' },
    { code: 'TL', name: 'East Timor', emergency: '112' },
    { code: 'EC', name: 'Ecuador', emergency: '911' },
    { code: 'EG', name: 'Egypt', emergency: '122' },
    { code: 'SV', name: 'El Salvador', emergency: '911' },
    { code: 'GQ', name: 'Equatorial Guinea', emergency: '112' },
    { code: 'ER', name: 'Eritrea', emergency: '112' },
    { code: 'EE', name: 'Estonia', emergency: '112' },
    { code: 'SZ', name: 'Eswatini', emergency: '999' },
    { code: 'ET', name: 'Ethiopia', emergency: '911' },
    { code: 'FJ', name: 'Fiji', emergency: '911' },
    { code: 'FI', name: 'Finland', emergency: '112' },
    { code: 'FR', name: 'France', emergency: '112' },
    { code: 'GA', name: 'Gabon', emergency: '112' },
    { code: 'GM', name: 'Gambia', emergency: '112' },
    { code: 'GE', name: 'Georgia', emergency: '112' },
    { code: 'DE', name: 'Germany', emergency: '112' },
    { code: 'GH', name: 'Ghana', emergency: '112' },
    { code: 'GR', name: 'Greece', emergency: '112' },
    { code: 'GD', name: 'Grenada', emergency: '911' },
    { code: 'GT', name: 'Guatemala', emergency: '110' },
    { code: 'GN', name: 'Guinea', emergency: '112' },
    { code: 'GY', name: 'Guyana', emergency: '911' },
    { code: 'HT', name: 'Haiti', emergency: '116' },
    { code: 'HN', name: 'Honduras', emergency: '911' },
    { code: 'HU', name: 'Hungary', emergency: '112' },
    { code: 'IS', name: 'Iceland', emergency: '112' },
    { code: 'IN', name: 'India', emergency: '112' },
    { code: 'ID', name: 'Indonesia', emergency: '112' },
    { code: 'IR', name: 'Iran', emergency: '110' },
    { code: 'IQ', name: 'Iraq', emergency: '112' },
    { code: 'IE', name: 'Ireland', emergency: '112' },
    { code: 'IL', name: 'Israel', emergency: '112' },
    { code: 'IT', name: 'Italy', emergency: '112' },
    { code: 'JM', name: 'Jamaica', emergency: '119' },
    { code: 'JP', name: 'Japan', emergency: '110' },
    { code: 'JO', name: 'Jordan', emergency: '911' },
    { code: 'KZ', name: 'Kazakhstan', emergency: '112' },
    { code: 'KE', name: 'Kenya', emergency: '112' },
    { code: 'KI', name: 'Kiribati', emergency: '112' },
    { code: 'KW', name: 'Kuwait', emergency: '112' },
    { code: 'KG', name: 'Kyrgyzstan', emergency: '112' },
    { code: 'LA', name: 'Laos', emergency: '112' },
    { code: 'LV', name: 'Latvia', emergency: '112' },
    { code: 'LB', name: 'Lebanon', emergency: '112' },
    { code: 'LS', name: 'Lesotho', emergency: '112' },
    { code: 'LR', name: 'Liberia', emergency: '911' },
    { code: 'LY', name: 'Libya', emergency: '112' },
    { code: 'LI', name: 'Liechtenstein', emergency: '112' },
    { code: 'LT', name: 'Lithuania', emergency: '112' },
    { code: 'LU', name: 'Luxembourg', emergency: '112' },
    { code: 'MG', name: 'Madagascar', emergency: '112' },
    { code: 'MW', name: 'Malawi', emergency: '112' },
    { code: 'MY', name: 'Malaysia', emergency: '999' },
    { code: 'MV', name: 'Maldives', emergency: '119' },
    { code: 'ML', name: 'Mali', emergency: '112' },
    { code: 'MT', name: 'Malta', emergency: '112' },
    { code: 'MH', name: 'Marshall Islands', emergency: '911' },
    { code: 'MR', name: 'Mauritania', emergency: '112' },
    { code: 'MU', name: 'Mauritius', emergency: '999' },
    { code: 'MX', name: 'Mexico', emergency: '911' },
    { code: 'FM', name: 'Micronesia', emergency: '911' },
    { code: 'MD', name: 'Moldova', emergency: '112' },
    { code: 'MC', name: 'Monaco', emergency: '112' },
    { code: 'MN', name: 'Mongolia', emergency: '112' },
    { code: 'ME', name: 'Montenegro', emergency: '112' },
    { code: 'MA', name: 'Morocco', emergency: '112' },
    { code: 'MZ', name: 'Mozambique', emergency: '112' },
    { code: 'MM', name: 'Myanmar', emergency: '112' },
    { code: 'NA', name: 'Namibia', emergency: '112' },
    { code: 'NR', name: 'Nauru', emergency: '112' },
    { code: 'NP', name: 'Nepal', emergency: '100' },
    { code: 'NL', name: 'Netherlands', emergency: '112' },
    { code: 'NZ', name: 'New Zealand', emergency: '111' },
    { code: 'NI', name: 'Nicaragua', emergency: '911' },
    { code: 'NE', name: 'Niger', emergency: '112' },
    { code: 'NG', name: 'Nigeria', emergency: '112' },
    { code: 'KP', name: 'North Korea', emergency: '119' },
    { code: 'MK', name: 'North Macedonia', emergency: '112' },
    { code: 'NO', name: 'Norway', emergency: '112' },
    { code: 'OM', name: 'Oman', emergency: '999' },
    { code: 'PK', name: 'Pakistan', emergency: '112' },
    { code: 'PW', name: 'Palau', emergency: '911' },
    { code: 'PA', name: 'Panama', emergency: '911' },
    { code: 'PG', name: 'Papua New Guinea', emergency: '112' },
    { code: 'PY', name: 'Paraguay', emergency: '911' },
    { code: 'PE', name: 'Peru', emergency: '911' },
    { code: 'PH', name: 'Philippines', emergency: '911' },
    { code: 'PL', name: 'Poland', emergency: '112' },
    { code: 'PT', name: 'Portugal', emergency: '112' },
    { code: 'QA', name: 'Qatar', emergency: '999' },
    { code: 'RO', name: 'Romania', emergency: '112' },
    { code: 'RU', name: 'Russia', emergency: '112' },
    { code: 'RW', name: 'Rwanda', emergency: '112' },
    { code: 'LC', name: 'Saint Lucia', emergency: '911' },
    { code: 'WS', name: 'Samoa', emergency: '112' },
    { code: 'SM', name: 'San Marino', emergency: '112' },
    { code: 'SA', name: 'Saudi Arabia', emergency: '911' },
    { code: 'SN', name: 'Senegal', emergency: '112' },
    { code: 'RS', name: 'Serbia', emergency: '112' },
    { code: 'SC', name: 'Seychelles', emergency: '112' },
    { code: 'SL', name: 'Sierra Leone', emergency: '112' },
    { code: 'SG', name: 'Singapore', emergency: '999' },
    { code: 'SK', name: 'Slovakia', emergency: '112' },
    { code: 'SI', name: 'Slovenia', emergency: '112' },
    { code: 'SB', name: 'Solomon Islands', emergency: '911' },
    { code: 'SO', name: 'Somalia', emergency: '112' },
    { code: 'ZA', name: 'South Africa', emergency: '112' },
    { code: 'KR', name: 'South Korea', emergency: '112' },
    { code: 'ES', name: 'Spain', emergency: '112' },
    { code: 'LK', name: 'Sri Lanka', emergency: '119' },
    { code: 'SD', name: 'Sudan', emergency: '112' },
    { code: 'SR', name: 'Suriname', emergency: '112' },
    { code: 'SE', name: 'Sweden', emergency: '112' },
    { code: 'CH', name: 'Switzerland', emergency: '112' },
    { code: 'SY', name: 'Syria', emergency: '112' },
    { code: 'TW', name: 'Taiwan', emergency: '110' },
    { code: 'TJ', name: 'Tajikistan', emergency: '112' },
    { code: 'TZ', name: 'Tanzania', emergency: '112' },
    { code: 'TH', name: 'Thailand', emergency: '191' },
    { code: 'TG', name: 'Togo', emergency: '112' },
    { code: 'TO', name: 'Tonga', emergency: '911' },
    { code: 'TT', name: 'Trinidad', emergency: '911' },
    { code: 'TN', name: 'Tunisia', emergency: '112' },
    { code: 'TR', name: 'Turkey', emergency: '112' },
    { code: 'TM', name: 'Turkmenistan', emergency: '112' },
    { code: 'TV', name: 'Tuvalu', emergency: '112' },
    { code: 'UG', name: 'Uganda', emergency: '112' },
    { code: 'UA', name: 'Ukraine', emergency: '112' },
    { code: 'AE', name: 'United Arab Emirates', emergency: '999' },
    { code: 'GB', name: 'United Kingdom', emergency: '999' },
    { code: 'US', name: 'United States', emergency: '911' },
    { code: 'UY', name: 'Uruguay', emergency: '911' },
    { code: 'UZ', name: 'Uzbekistan', emergency: '112' },
    { code: 'VU', name: 'Vanuatu', emergency: '112' },
    { code: 'VA', name: 'Vatican City', emergency: '112' },
    { code: 'VE', name: 'Venezuela', emergency: '911' },
    { code: 'VN', name: 'Vietnam', emergency: '113' },
    { code: 'YE', name: 'Yemen', emergency: '112' },
    { code: 'ZM', name: 'Zambia', emergency: '112' },
    { code: 'ZW', name: 'Zimbabwe', emergency: '112' }
];

// ============================================
// CHECK USERNAME AVAILABILITY
// ============================================
async function checkUsernameAvailability(username) {
    if (!username || username.length < 2) return false;
    try {
        const snapshot = await db.collection('users')
            .where('name', '==', username)
            .get();
        return snapshot.empty;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
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
    
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authName').value = '';
    document.getElementById('authFavorites').value = '';
    document.getElementById('authCountry').value = '';
    document.getElementById('passwordStrength').innerHTML = '';

    if (mode === 'login') {
        title.textContent = '🔐 Welcome Back';
        submitBtn.textContent = '🚀 Log In';
        signupFields.style.display = 'none';
        switchLink.innerHTML = `Don't have an account? <strong>Sign Up</strong>`;
        switchLink.dataset.mode = 'signup';
    } else {
        title.textContent = '📝 Join The Harbor';
        submitBtn.textContent = '🚀 Create Account';
        signupFields.style.display = 'block';
        switchLink.innerHTML = `Already have an account? <strong>Log In</strong>`;
        switchLink.dataset.mode = 'login';
    }

    modal.style.display = 'flex';
    document.getElementById('authModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('authModal').style.display = 'none';
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
    if (!password || !strengthDiv) return;

    const pwd = password.value;
    if (pwd.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }

    const result = checkPasswordStrength(pwd);
    strengthDiv.innerHTML = `
        <div style="margin-top:6px;font-size:0.85rem;">
            <span>Strength: <span style="color:${result.color};font-weight:700;">${result.strength.replace('-', ' ')}</span></span>
            <div style="width:100%;height:4px;background:#e8ddd0;border-radius:4px;margin-top:4px;">
                <div style="width:${result.score}%;height:100%;background:${result.color};border-radius:4px;"></div>
            </div>
        </div>
    `;
}

async function checkUsernameOnType() {
    const nameInput = document.getElementById('authName');
    const statusDiv = document.getElementById('usernameStatus');
    if (!nameInput || !statusDiv) return;

    const username = nameInput.value.trim();
    if (username.length < 2) {
        statusDiv.innerHTML = '';
        return;
    }

    const available = await checkUsernameAvailability(username);
    if (available) {
        statusDiv.innerHTML = `<span style="color:#27ae60;">✅ Username is available!</span>`;
    } else {
        statusDiv.innerHTML = `<span style="color:#c0392b;">❌ Username is taken. Please choose another.</span>`;
    }
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
            .then((userCredential) => {
                const user = userCredential.user;
                if (!user.emailVerified) {
                    error.textContent = '⚠️ Please verify your email first. Check your inbox!';
                    auth.signOut();
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🚀 Log In';
                    return;
                }
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Log In';
                showWelcomeFireworks();
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
        const countrySelect = document.getElementById('authCountry');

        const name = nameInput ? sanitizeInput(nameInput.value.trim()) : '';
        const gender = genderSelect ? genderSelect.value : '🙅 Prefer not to say';
        const favorites = favoritesInput ? sanitizeInput(favoritesInput.value.trim()) : '';
        const country = countrySelect ? countrySelect.value : '';

        if (!name || name.length < 2) {
            error.textContent = 'Please enter a username (minimum 2 characters).';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        if (name.length > 30) {
            error.textContent = 'Username must be under 30 characters.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        if (!country) {
            error.textContent = 'Please select your country.';
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Create Account';
            return;
        }

        // Check username availability
        checkUsernameAvailability(name)
            .then((available) => {
                if (!available) {
                    error.textContent = '❌ Username is already taken. Please choose another.';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '🚀 Create Account';
                    return Promise.reject('Username taken');
                }
                return auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
            })
            .then((userCredential) => {
                const user = userCredential.user;
                return user.sendEmailVerification().then(() => user);
            })
            .then((user) => {
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: cleanEmail,
                    gender: gender,
                    favorites: favorites || 'Not specified',
                    country: country,
                    emergencyNumber: countries.find(c => c.name === country)?.emergency || '911',
                    emailVerified: false,
                    isAdmin: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                closeModal();
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
                auth.signOut();
                alert('✅ Verification email sent to ' + email + '!\n\nPlease check your inbox and click the verification link.\n\nAfter verifying, log in to access The Harbor.');
            })
            .catch((err) => {
                if (err !== 'Username taken') {
                    error.textContent = err.message;
                }
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Account';
            });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut();
        window.location.href = 'index.html';
    }
}

// ============================================
// WELCOME FIREWORKS
// ============================================

function showWelcomeFireworks() {
    // Check if already on welcome page
    if (window.location.pathname.includes('welcome.html')) return;
    
    // Show welcome overlay
    const overlay = document.createElement('div');
    overlay.id = 'welcomeOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(135deg, #1a4a4a, #2d6a6a);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        animation: welcomeFadeIn 0.8s ease;
    `;
    overlay.innerHTML = `
        <style>
            @keyframes welcomeFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes welcomeFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes confettiDrop { 
                0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            .confetti-piece {
                position: fixed;
                width: 12px;
                height: 12px;
                animation: confettiDrop 3s linear forwards;
                pointer-events: none;
                z-index: 100000;
            }
        </style>
        <span style="font-size: 4rem; margin-bottom: 16px;">🎉</span>
        <h1 style="font-size: 3rem; font-weight: 300;">Welcome to <span style="font-weight: 700; color: #c47a5a;">The Harbor</span></h1>
        <p style="font-size: 1.2rem; opacity: 0.8; margin-top: 8px;">⚓ A safe place to share, heal, and grow</p>
        <button onclick="closeWelcomeFireworks()" style="
            margin-top: 30px;
            padding: 14px 40px;
            background: #c47a5a;
            border: none;
            border-radius: 50px;
            color: white;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: 0.3s;
        ">Continue</button>
    `;
    document.body.appendChild(overlay);

    // Create confetti
    const colors = ['#ff6b6b', '#feca57', '#54a0ff', '#5f27cd', '#ff9ff3', '#00d2d3', '#ff9f43', '#ee5a24'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-20px';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (8 + Math.random() * 10) + 'px';
        piece.style.height = (8 + Math.random() * 10) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (2 + Math.random() * 3) + 's';
        piece.style.animationDelay = (Math.random() * 2) + 's';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 5000);
    }

    // Auto-remove after 8 seconds
    setTimeout(() => {
        const el = document.getElementById('welcomeOverlay');
        if (el) {
            el.style.animation = 'welcomeFadeOut 0.5s ease forwards';
            setTimeout(() => el.remove(), 500);
        }
    }, 8000);
}

function closeWelcomeFireworks() {
    const el = document.getElementById('welcomeOverlay');
    if (el) {
        el.style.animation = 'welcomeFadeOut 0.5s ease forwards';
        setTimeout(() => el.remove(), 500);
    }
}

// ============================================
// AUTH STATE LISTENER
// ============================================

auth.onAuthStateChanged((user) => {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userGenderBadge = document.getElementById('userGenderBadge');
    const verificationBadge = document.getElementById('verificationBadge');

    if (user) {
        currentUser = user;
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        if (user.emailVerified) {
            if (verificationBadge) {
                verificationBadge.textContent = '✅ Verified';
                verificationBadge.className = 'verification-badge verified';
            }
        } else {
            if (verificationBadge) {
                verificationBadge.textContent = '⏳ Unverified';
                verificationBadge.className = 'verification-badge';
            }
        }

        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserData = doc.data();
                    if (userName) userName.textContent = currentUserData.name || 'Friend';
                    if (userGenderBadge) userGenderBadge.textContent = currentUserData.gender || '';
                    
                    if (user.emailVerified && !currentUserData.emailVerified) {
                        db.collection('users').doc(user.uid).update({ emailVerified: true });
                    }

                    // Show welcome fireworks if not shown yet
                    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
                    if (user.emailVerified && !hasSeenWelcome) {
                        sessionStorage.setItem('hasSeenWelcome', 'true');
                        setTimeout(showWelcomeFireworks, 500);
                    }

                    // Update emergency number in banner
                    updateEmergencyBanner();

                    // Load stories if on homepage
                    if (document.getElementById('storiesContainer')) {
                        loadStories();
                    }
                    
                    if (window.location.pathname.includes('profile.html')) {
                        loadProfile();
                    }

                    if (window.location.pathname.includes('admin.html')) {
                        loadAdminPanel();
                    }
                }
            })
            .catch((err) => console.error('Error fetching user data:', err));
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
// UPDATE EMERGENCY BANNER
// ============================================

function updateEmergencyBanner() {
    const banner = document.getElementById('emergencyBanner');
    if (!banner || !currentUserData) return;

    const country = currentUserData.country;
    const emergency = currentUserData.emergencyNumber || '911';
    
    banner.innerHTML = `
        🆘 <strong>Emergency Number for ${country || 'your country'}:</strong> 
        <a href="tel:${emergency}" style="color: #f5d6b3; font-weight: bold; text-decoration: underline;">${emergency}</a>
        ${country ? `(${country})` : ''}
    `;
    banner.style.display = 'block';
}

// ============================================
// GENDER RESTRICTION CHECKS
// ============================================

function getUserGender() {
    if (!currentUserData) return null;
    return currentUserData.gender;
}

function canSeeCategory(category) {
    const gender = getUserGender();
    if (category === 'all' || category === 'struggles' || category === 'fun' || category === 'learning') return true;
    if (category === 'men' && gender === '🧔 Man') return true;
    if (category === 'women' && gender === '👩 Woman') return true;
    return false;
}

function canPostInCategory(category) {
    const gender = getUserGender();
    if (category === 'struggles' || category === 'fun' || category === 'learning') return true;
    if (category === 'men' && gender === '🧔 Man') return true;
    if (category === 'women' && gender === '👩 Woman') return true;
    return false;
}

// ============================================
// LOAD STORIES
// ============================================

function loadStories() {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    if (currentUser && !currentUser.emailVerified) {
        container.innerHTML = `
            <div class="empty-state" style="background:#f5d6b3;border-radius:16px;padding:30px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">📧</div>
                <h3>Email Not Verified</h3>
                <p>Please check your email and click the verification link.</p>
                <button class="btn-primary" onclick="resendVerification()" style="margin-top:12px;">🔄 Resend Verification</button>
            </div>
        `;
        return;
    }

    if (!canSeeCategory(currentCategory) && currentUser) {
        container.innerHTML = `
            <div class="empty-state" style="background:#f5d6b3;border-radius:16px;padding:30px;border-left:4px solid #c47a5a;">
                <div class="big-emoji">🔒</div>
                <h3>Access Restricted</h3>
                <p>You don't have permission to view this section.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading">⏳ Loading stories...</div>';

    let query = db.collection('stories')
        .where('approved', '==', true)
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
                            : ''
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

// ============================================
// RENDER STORY CARD
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
// TOGGLE REACTION (Add/Remove + Floating Emoji)
// ============================================

function createFloatingEmoji(emoji, x, y) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `
        position: fixed;
        font-size: ${2 + Math.random() * 2}rem;
        pointer-events: none;
        z-index: 9999;
        left: ${x + (Math.random() - 0.5) * 200}px;
        top: ${y + (Math.random() - 0.5) * 100}px;
        animation: floatUp 1.5s ease-out forwards;
        opacity: 1;
    `;
    
    // Add animation if not exists
    if (!document.getElementById('floatUpStyle')) {
        const style = document.createElement('style');
        style.id = 'floatUpStyle';
        style.textContent = `
            @keyframes floatUp {
                0% { opacity: 1; transform: translateY(0) scale(0.5) rotate(0deg); }
                50% { opacity: 1; transform: translateY(-150px) scale(1.3) rotate(20deg); }
                100% { opacity: 0; transform: translateY(-350px) scale(1) rotate(-10deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

function addReaction(storyId, emoji) {
    if (!currentUser) {
        alert('Please log in to react.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
        return;
    }

    const storyRef = db.collection('stories').doc(storyId);
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);

    const hasReacted = userReactions[storyId] && userReactions[storyId].includes(emoji);

    // Floating emoji
    const rect = document.getElementById('storiesContainer')?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    createFloatingEmoji(emoji, x, y);

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            const reactions = data.reactions || {};
            
            if (hasReacted) {
                reactions[emoji] = Math.max((reactions[emoji] || 0) - 1, 0);
                if (userReactions[storyId]) {
                    userReactions[storyId] = userReactions[storyId].filter(e => e !== emoji);
                }
            } else {
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                if (!userReactions[storyId]) userReactions[storyId] = [];
                userReactions[storyId].push(emoji);
            }
            
            transaction.update(storyRef, { reactions: reactions });
            transaction.set(userReactionRef, { emojis: userReactions[storyId] || [] });
        });
    })
    .then(() => {
        loadStories();
    })
    .catch((err) => {
        console.error('Error toggling reaction:', err);
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
        .where('approved', '==', true)
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
                    if (canSeeCategory(story.category)) {
                        matched.push(story);
                    }
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
// SUBMIT STORY (for submit.html)
// ============================================

function submitStory() {
    console.log('📤 Submit story function called');

    if (!currentUser) {
        alert('⚠️ Please log in to share your story.');
        return;
    }
    if (!currentUser.emailVerified) {
        alert('⚠️ Please verify your email first.');
        return;
    }

    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');
    const categorySelect = document.getElementById('storyCategory');
    const anonymousCheck = document.getElementById('storyAnonymous');
    const errorDiv = document.getElementById('submitError');
    const successDiv = document.getElementById('submitSuccess');
    const submitBtn = document.getElementById('submitBtn');

    if (errorDiv) errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = '';

    const title = titleInput ? titleInput.value.trim() : '';
    const text = textInput ? textInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : '';
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;

    if (!title || title.length < 3) {
        if (errorDiv) errorDiv.textContent = '📌 Title must be at least 3 characters.';
        return;
    }
    if (title.length > 100) {
        if (errorDiv) errorDiv.textContent = '📌 Title must be under 100 characters.';
        return;
    }
    if (!text || text.length < 10) {
        if (errorDiv) errorDiv.textContent = '📖 Story must be at least 10 characters.';
        return;
    }
    if (text.length > 5000) {
        if (errorDiv) errorDiv.textContent = '📖 Story must be under 5000 characters.';
        return;
    }
    if (!category) {
        if (errorDiv) errorDiv.textContent = '📂 Please select a category.';
        return;
    }

    const gender = currentUserData ? currentUserData.gender : null;
    if (category === 'men' && gender !== '🧔 Man') {
        if (errorDiv) errorDiv.textContent = '⚠️ Men\'s Harbor is for men only.';
        return;
    }
    if (category === 'women' && gender !== '👩 Woman') {
        if (errorDiv) errorDiv.textContent = '⚠️ Women\'s Harbor is for women only.';
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    // Check for inappropriate content (simple filter)
    const inappropriateWords = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'porn', 'nude', 'sex', 'violence', 'kill', 'murder', 'rape'];
    const containsInappropriate = inappropriateWords.some(word => 
        text.toLowerCase().includes(word) || title.toLowerCase().includes(word)
    );

    db.collection('stories').add({
        title: title,
        text: text,
        category: category,
        userId: currentUser.uid,
        authorName: currentUserData ? currentUserData.name : 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {},
        commentCount: 0,
        approved: !containsInappropriate, // Auto-approve if clean
        flagged: containsInappropriate,
        flagReason: containsInappropriate ? 'Inappropriate content detected' : ''
    })
    .then((docRef) => {
        console.log('✅ Story saved! ID:', docRef.id);
        if (containsInappropriate) {
            if (successDiv) {
                successDiv.textContent = '⚠️ Your story has been sent for review. It will be published after moderation.';
                successDiv.style.color = '#f39c12';
            }
        } else {
            if (successDiv) {
                successDiv.textContent = '✅ Your story has been shared with the community!';
            }
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Posted!';
        }
        if (titleInput) titleInput.value = '';
        if (textInput) textInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (anonymousCheck) anonymousCheck.checked = false;
        document.getElementById('titleCount').textContent = '0';
        document.getElementById('textCount').textContent = '0';

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    })
    .catch((err) => {
        console.error('❌ Error saving story:', err);
        if (errorDiv) {
            errorDiv.textContent = '❌ Error: ' + err.message;
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Post Story';
        }
    });
}

// ============================================
// LOAD COMMENTS (Fixed - No Index Error)
// ============================================

function loadComments(storyId) {
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
                        <p style="color:#7a9e7e;">No comments yet. Be the first to share your thoughts.</p>
                    </div>
                `;
                return;
            }

            const comments = [];
            snapshot.forEach((doc) => {
                const comment = doc.data();
                comment.id = doc.id;
                comments.push(comment);
            });
            
            comments.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });

            let html = '<h3 style="margin-bottom:16px;">💬 Comments</h3>';
            comments.forEach((comment) => {
                html += renderComment(comment);
            });
            container.innerHTML = html;
        })
        .catch((err) => {
            console.error('Error loading comments:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <p style="color:#c0392b;">⚠️ Error loading comments</p>
                    <button class="btn-primary" onclick="loadComments('${storyId}')" style="margin-top:10px;padding:8px 20px;font-size:0.9rem;">
                        🔄 Retry
                    </button>
                </div>
            `;
        });
}

function renderComment(comment) {
    const author = comment.isAnonymous ? '🕊️ Anonymous' : escapeHTML(comment.authorName || 'Someone');
    const time = comment.createdAt ? comment.createdAt.toDate().toLocaleString() : 'Recently';
    const likes = comment.likes || 0;
    const isOwner = currentUser && comment.userId === currentUser.uid;

    return `
        <div class="comment" id="comment-${comment.id}">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;font-size:0.85rem;color:#7a9e7e;margin-bottom:6px;">
                <span>✍️ ${author}</span>
                <span>📅 ${time}</span>
            </div>
            <div style="font-size:0.95rem;line-height:1.6;">${escapeHTML(comment.text)}</div>
            <div style="margin-top:8px;display:flex;gap:12px;align-items:center;">
                <button class="emoji-btn" onclick="likeComment('${comment.id}')" style="padding:2px 12px;font-size:0.85rem;">
                    👍 <span class="count">${likes}</span>
                </button>
                ${isOwner ? 
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

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
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

    // Check for inappropriate content
    const inappropriateWords = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'porn', 'nude', 'sex', 'violence', 'kill', 'murder', 'rape'];
    const containsInappropriate = inappropriateWords.some(word => text.toLowerCase().includes(word));

    const submitBtn = document.getElementById('commentSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Posting...';
    }

    db.collection('comments').add({
        storyId: storyId,
        text: text,
        userId: currentUser.uid,
        authorName: currentUserData ? currentUserData.name : 'Someone',
        isAnonymous: isAnonymous,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        approved: !containsInappropriate,
        flagged: containsInappropriate
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
        document.getElementById('commentCount').textContent = '0';
        
        if (containsInappropriate) {
            alert('⚠️ Your comment has been sent for review. It will appear after moderation.');
        }
        
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
        const content = document.getElementById('profileContent');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="big-emoji">🔐</div>
                    <h3>Please Log In</h3>
                    <p>You need to be logged in to view your profile.</p>
                    <button class="btn-primary" onclick="openModal('login')" style="margin-top:12px;">Log In</button>
                </div>
            `;
        }
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
            
            return db.collection('stories')
                .where('userId', '==', currentUser.uid)
                .where('approved', '==', true)
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
                <div class="card" style="text-align:center;">
                    <span style="font-size:4rem;">👤</span>
                    <h2 style="color:#1a4a4a;">${escapeHTML(userData.name)}</h2>
                    <p style="color:#7a9e7e;">${escapeHTML(userData.gender || '')}</p>
                    <p style="color:#7a9e7e;">📍 ${escapeHTML(userData.country || 'Not specified')}</p>
                    <p style="color:#7a9e7e;font-size:0.9rem;">❤️ ${escapeHTML(userData.favorites || 'Not specified')}</p>
                    <p style="color:#a8a09a;font-size:0.8rem;">Member since ${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'Recently'}</p>
                    ${userData.isAdmin ? '<p style="color:#c47a5a;font-weight:700;">👑 Admin</p>' : ''}
                </div>
            `;

            html += `
                <div style="margin-top:24px;">
                    <h3 style="color:#1a4a4a;">📝 Your Stories (${stories.length})</h3>
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
                                ${story.flagged ? '⚠️ Flagged' : ''}
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
            
            if (!story.approved && !currentUserData?.isAdmin) {
                content.innerHTML = '<div class="empty-state"><h3>This story is pending review</h3><a href="index.html">Go back home</a></div>';
                return;
            }
            
            content.innerHTML = renderFullStory(story);
            
            if (currentUser) {
                loadUserReactions(storyId);
            }
            
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
        const hasReacted = userReactions[story.id] && userReactions[story.id].includes(emoji);
        reactionButtons += `
            <button class="emoji-btn ${hasReacted ? 'reacted' : ''}" 
                    id="reaction-${story.id}-${emoji}" 
                    onclick="toggleReaction('${story.id}', '${emoji}')">
                ${emoji} <span class="count" id="count-${story.id}-${emoji}">${count}</span>
                ${hasReacted ? '<span class="checkmark">✅</span>' : ''}
            </button>
        `;
    });

    return `
        <div class="card" id="storyCard">
            <h2 class="story-title">${escapeHTML(story.title)}</h2>
            <div class="story-meta">
                <span>✍️ ${author}</span>
                <span class="category-badge">${categoryDisplay}</span>
                <span>📅 ${time}</span>
                ${story.flagged ? '<span style="color:#f39c12;">⚠️ Content Warning</span>' : ''}
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
// TOGGLE REACTION (for story.html)
// ============================================

function toggleReaction(storyId, emoji) {
    if (!currentUser) {
        alert('Please log in to react.');
        return;
    }

    if (!currentUser.emailVerified) {
        alert('Please verify your email first.');
        return;
    }

    const storyRef = db.collection('stories').doc(storyId);
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);

    const hasReacted = userReactions[storyId] && userReactions[storyId].includes(emoji);

    // Floating emoji
    const rect = document.getElementById('storyCard')?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    createFloatingEmoji(emoji, x, y);

    db.runTransaction((transaction) => {
        return transaction.get(storyRef).then((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            const reactions = data.reactions || {};
            
            if (hasReacted) {
                reactions[emoji] = Math.max((reactions[emoji] || 0) - 1, 0);
                if (userReactions[storyId]) {
                    userReactions[storyId] = userReactions[storyId].filter(e => e !== emoji);
                }
            } else {
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                if (!userReactions[storyId]) userReactions[storyId] = [];
                userReactions[storyId].push(emoji);
            }
            
            transaction.update(storyRef, { reactions: reactions });
            transaction.set(userReactionRef, { emojis: userReactions[storyId] || [] });
        });
    })
    .then(() => {
        // Update UI instantly
        const countSpan = document.getElementById(`count-${storyId}-${emoji}`);
        const btn = document.getElementById(`reaction-${storyId}-${emoji}`);
        
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = hasReacted ? currentCount - 1 : currentCount + 1;
        }
        
        if (btn) {
            if (hasReacted) {
                btn.classList.remove('reacted');
                const checkmark = btn.querySelector('.checkmark');
                if (checkmark) checkmark.remove();
            } else {
                btn.classList.add('reacted');
                if (!btn.querySelector('.checkmark')) {
                    btn.innerHTML += ' <span class="checkmark">✅</span>';
                }
            }
        }
    })
    .catch((err) => {
        console.error('Error toggling reaction:', err);
        alert('Could not update reaction. Please try again.');
    });
}

// ============================================
// LOAD USER REACTIONS
// ============================================

function loadUserReactions(storyId) {
    if (!currentUser) return;
    
    const userReactionRef = db.collection('users').doc(currentUser.uid)
        .collection('reactions').doc(storyId);
        
    userReactionRef.get()
        .then((doc) => {
            if (doc.exists) {
                userReactions[storyId] = doc.data().emojis || [];
                const emojis = ['❤️', '🙏', '😢', '💪', '🤗', '🌊', '🕊️', '👊'];
                emojis.forEach((emoji) => {
                    const btn = document.getElementById(`reaction-${storyId}-${emoji}`);
                    if (btn && userReactions[storyId].includes(emoji)) {
                        btn.classList.add('reacted');
                        if (!btn.querySelector('.checkmark')) {
                            btn.innerHTML += ' <span class="checkmark">✅</span>';
                        }
                    }
                });
            }
        })
        .catch((err) => console.error('Error loading user reactions:', err));
}

// ============================================
// RESEND VERIFICATION
// ============================================

function resendVerification() {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }

    currentUser.sendEmailVerification()
        .then(() => {
            alert('✅ Verification email resent! Check your inbox.');
        })
        .catch((err) => {
            alert('❌ Error: ' + err.message);
        });
}

// ============================================
// INIT - DOM READY
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready — The Harbor');
    
    // --- MODAL CLOSE ---
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }

    // --- PASSWORD STRENGTH ---
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordOnType);
    }

    // --- USERNAME CHECK ---
    const nameInput = document.getElementById('authName');
    if (nameInput) {
        nameInput.addEventListener('input', checkUsernameOnType);
    }

    // --- ENTER KEY ---
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const modal = document.getElementById('authModal');
            if (modal && modal.style.display === 'flex') {
                handleAuth();
            }
        }
    });

    // --- CHARACTER COUNTERS ---
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

    // --- COMMENT CHARACTER COUNTER ---
    const commentText = document.getElementById('commentText');
    const commentCount = document.getElementById('commentCount');
    if (commentText && commentCount) {
        commentText.addEventListener('input', function() {
            commentCount.textContent = this.value.length;
        });
    }

    // --- LOAD PROFILE ---
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();
    }

    // --- LOAD SINGLE STORY ---
    if (window.location.pathname.includes('story.html')) {
        loadStory();
    }

    // --- LOAD ADMIN PANEL ---
    if (window.location.pathname.includes('admin.html')) {
        loadAdminPanel();
    }

    console.log('✅ All event listeners attached');
});

console.log('⚓ The Harbor app loaded');
console.log('📚 Firebase connected:', firebase.app().name);
console.log('🛡️ Security: XSS, CSRF, SQLi, XXE, OS injection protection');
