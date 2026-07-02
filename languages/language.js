// ============================================
// HARBOR LANGUAGE MODULE (v4 - Working Translation)
// ============================================

const supportedLangs = ['en', 'es', 'fr'];
const langNames = { en: 'English', es: 'Español', fr: 'Français' };
const langFlags = { en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷' };

let currentLang = localStorage.getItem('harbor_language') || 'en';
let translations = {};

async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error('Failed to load');
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('harbor_language', lang);
        document.documentElement.setAttribute('lang', lang);
        return translations;
    } catch (err) {
        console.warn(`Could not load ${lang} translations, falling back to en`);
        if (lang !== 'en') return loadTranslations('en');
        translations = {};
        return {};
    }
}

function applyTranslations() {
    if (!translations || Object.keys(translations).length === 0) return;

    // 1. Elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', translations[key]);
            } else {
                el.textContent = translations[key];
            }
        }
    });

    // 2. Translate common UI elements by known patterns
    // Header buttons
    var loginBtns = document.querySelectorAll('.btn-login, [onclick*="login"]');
    loginBtns.forEach(function(btn) {
        if (btn.textContent.includes('Log In') || btn.textContent.includes('Iniciar') || btn.textContent.includes('Connecter')) {
            btn.textContent = '🔐 ' + (translations.login || 'Log In');
        }
    });
    
    var signupBtns = document.querySelectorAll('.btn-signup, [onclick*="signup"]');
    signupBtns.forEach(function(btn) {
        if (btn.textContent.includes('Join') || btn.textContent.includes('Unirse') || btn.textContent.includes('Rejoindre')) {
            btn.textContent = '📝 ' + (translations.signup || 'Join');
        }
    });

    // Footer
    var footers = document.querySelectorAll('.footer');
    footers.forEach(function(f) {
        if (translations.app_name) {
            var firstDiv = f.querySelector('div:first-child');
            if (firstDiv && firstDiv.textContent.includes('Harbor')) {
                firstDiv.textContent = '⚓ ' + translations.app_name + ' — A community for sharing, healing, and growing.';
            }
        }
    });

    // Sidebar language indicator
    var langEl = document.getElementById('sidebarCurrentLang');
    if (langEl) {
        langEl.textContent = (langFlags[currentLang] || '') + ' ' + (langNames[currentLang] || currentLang);
    }

    // Update document title if app_name available
    if (translations.app_name && document.title.includes('Harbor')) {
        var pageTitle = document.title.split('—')[1] || '';
        document.title = translations.app_name + (pageTitle ? ' —' + pageTitle : '');
    }
}

async function changeLanguage(lang) {
    if (!supportedLangs.includes(lang)) {
        console.warn('Language ' + lang + ' not supported');
        return;
    }
    await loadTranslations(lang);
    applyTranslations();
    
    if (typeof updateSidebarData === 'function') {
        updateSidebarData();
    }
    
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
        db.collection('users').doc(currentUser.uid).update({ language: lang }).catch(function() {});
    }
}

// Initialize
(async function initLanguage() {
    await loadTranslations(currentLang);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        applyTranslations();
    }
    document.addEventListener('DOMContentLoaded', function() {
        applyTranslations();
    });
})();

window.changeLanguage = changeLanguage;
window.getCurrentLanguage = function() { return currentLang; };
