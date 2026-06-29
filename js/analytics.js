// ============================================
// GOOGLE ANALYTICS - ONE FILE FOR ALL PAGES
// ============================================
(function() {
    // Check if GA already loaded
    if (document.getElementById('ga-script')) return;
    
    console.log('📊 Loading Google Analytics...');
    
    // Load GA script
    const gaScript = document.createElement('script');
    gaScript.id = 'ga-script';
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-81R2FX47H0';
    document.head.appendChild(gaScript);
    
    // Configure GA
    const gaConfig = document.createElement('script');
    gaConfig.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-81R2FX47H0');
        console.log('✅ Google Analytics initialized');
    `;
    document.head.appendChild(gaConfig);
})();
