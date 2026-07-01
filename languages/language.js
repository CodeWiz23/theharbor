// ============================================
// HARBOR LANGUAGE MODULE (Instant Switching)
// ============================================

const supportedLangs = ['en', 'es', 'fr'];
let currentLang = localStorage.getItem('harbor_language') || 'en';
let translations = {};

// Load translation file for a given language
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
        if (lang !== 'en') {
            return loadTranslations('en');
        }
        translations = {};
        return {};
    }
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            // If the element has a placeholder attribute, update it
            if (el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', translations[key]);
            } else if (el.tagName === 'INPUT' && el.type === 'submit' || el.tagName === 'BUTTON') {
                // For buttons, set textContent
                el.textContent = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });
    
    // Update document title if it has a translation
    if (translations.app_name) {
        // Optionally update title based on page, but for simplicity, we can leave the existing title.
    }
}

// Change language and apply immediately
async function changeLanguage(lang) {
    if (!supportedLangs.includes(lang)) {
        console.warn(`Language ${lang} not supported`);
        return;
    }
    await loadTranslations(lang);
    applyTranslations();
    // Update sidebar data (if open) to reflect new language
    if (typeof updateSidebarData === 'function') {
        updateSidebarData();
    }
    // Update user preference in Firestore if logged in
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
        db.collection('users').doc(currentUser.uid).update({ language: lang }).catch(() => {});
    }
}

// Initialize: load saved language on page load
(async function initLanguage() {
    await loadTranslations(currentLang);
    document.addEventListener('DOMContentLoaded', () => {
        applyTranslations();
    });
    // Also apply immediately if DOM already loaded
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        applyTranslations();
    }
})();

// Expose globally
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLang;
