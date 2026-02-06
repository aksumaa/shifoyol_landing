
// Function to set the language
async function setLanguage(lang) {
    const response = await fetch(`locales/${lang}/translation.json`);
    const translations = await response.json();

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        // Use a function to navigate nested keys
        const translation = getNestedTranslation(translations, key);
        if (translation) {
            element.innerHTML = translation;
        }
    });

    // Update the lang attribute of the html tag
    document.documentElement.lang = lang;
}

// Helper function to get nested translation values
function getNestedTranslation(translations, key) {
    return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations);
}

// Function to switch language and update active button
function switchLanguage(lang) {
    localStorage.setItem('language', lang);
    setLanguage(lang);

    // Update active state for language switcher buttons
    document.querySelectorAll('.language-switcher button').forEach(button => {
        if (button.dataset.lang === lang) {
            button.classList.add('bg-blue-600', 'text-white');
        } else {
            button.classList.remove('bg-blue-600', 'text-white');
        }
    });
}

// Function to handle dynamic logo color
function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    const logoText = document.querySelector('.logo-text');
    const logoIcon = document.querySelector('.logo-icon');

    if (window.scrollY > 50) {
        navbar.classList.add('bg-white', 'shadow-md');
        logoText.classList.remove('text-white');
        logoText.classList.add('text-blue-600');
        logoIcon.classList.remove('bg-white', 'text-blue-600');
        logoIcon.classList.add('bg-blue-600', 'text-white');
    } else {
        navbar.classList.remove('bg-white', 'shadow-md');
        logoText.classList.remove('text-blue-600');
        logoText.classList.add('text-white');
        logoIcon.classList.remove('bg-blue-600', 'text-white');
        logoIcon.classList.add('bg-white', 'text-blue-600');
    }
}

// Modal handling
function openRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

// Spotlight card effect
function handleSpotlight(event) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty('--spotlight-x', `${x}px`);
    card.style.setProperty('--spotlight-y', `${y}px`);
}

// DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Set initial language
    const savedLang = localStorage.getItem('language') || 'uz';
    switchLanguage(savedLang);

    // Add scroll listener for navbar (only on main page with hero)
    if (document.getElementById('registrationModal')) {
        window.addEventListener('scroll', handleNavbarScroll);
    }

    // Add click listeners for language switcher
    document.querySelectorAll('.language-switcher button').forEach(button => {
        button.addEventListener('click', () => switchLanguage(button.dataset.lang));
    });

    // Modal: close button and overlay
    const closeBtn = document.getElementById('closeRegistrationModal');
    if (closeBtn) closeBtn.addEventListener('click', closeRegistrationModal);
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeRegistrationModal(); });
    }

    // Add mousemove listener for spotlight cards
    document.querySelectorAll('.spotlight-card').forEach(card => {
        card.addEventListener('mousemove', handleSpotlight);
    });

    // Mobile app section: cycle steps and phone mockup slides
    const appSteps = document.querySelectorAll('.app-step');
    const appSlides = document.querySelectorAll('.app-screen-slide');
    if (appSteps.length && appSlides.length) {
        let stepIndex = 0;
        setInterval(() => {
            appSteps.forEach((el, i) => el.classList.toggle('active', i === stepIndex));
            appSlides.forEach((el, i) => el.classList.toggle('active', i === stepIndex));
            stepIndex = (stepIndex + 1) % Math.min(appSteps.length, appSlides.length);
        }, 3200);
    }
});
