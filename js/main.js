
document.documentElement.classList.add('has-reveal');

const API_URL = window.API_URL || 'https://api.shifoyol.uz';
let currentTranslations = null;
let clinicCache = [];
let clinicSliderFrame = 0;
let clinicSliderHover = false;
let clinicSliderPointer = false;
let clinicSliderFocus = false;
let clinicSliderHoldUntil = 0;
let clinicPaintGeneration = 0;

function t(key, fallback) {
    const value = currentTranslations ? getNestedTranslation(currentTranslations, key) : null;
    return value || fallback || '';
}

// Function to set the language
async function setLanguage(lang) {
    let response;
    try {
        response = await fetch(`locales/${lang}/translation.json`);
        if (!response.ok) throw new Error('missing locale');
    } catch {
        if (lang !== 'uz') switchLanguage('uz');
        return;
    }
    const translations = await response.json();
    currentTranslations = translations;

    applyTranslations(translations);
    syncThemeToggle();
    if (clinicCache.length) paintClinics();

    // Update the lang attribute of the html tag
    document.documentElement.lang = lang;
}

function applyTranslations(translations) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getNestedTranslation(translations, key);
        if (translation) {
            element.innerHTML = translation;
        }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
        const translation = getNestedTranslation(translations, element.getAttribute('data-i18n-aria'));
        if (translation) element.setAttribute('aria-label', translation);
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
        const translation = getNestedTranslation(translations, element.getAttribute('data-i18n-alt'));
        if (translation) element.setAttribute('alt', translation);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const translation = getNestedTranslation(translations, element.getAttribute('data-i18n-placeholder'));
        if (translation) element.setAttribute('placeholder', translation);
    });
}

function prepareServiceMarquee() {
    const track = document.querySelector('.service-marquee-track');
    const group = track?.querySelector('.service-marquee-group');
    if (!track || !group) return;
    const seed = Array.from(group.children).map(node => node.cloneNode(true));
    if (!seed.length) return;

    const build = () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        group.replaceChildren();
        track.querySelectorAll('.service-marquee-group[aria-hidden="true"]').forEach(node => node.remove());
        const limit = reduce ? 1 : 8;
        do {
            seed.forEach(node => group.appendChild(node.cloneNode(true)));
        } while (!reduce && group.scrollWidth < window.innerWidth + 48 && group.childElementCount < seed.length * limit);
        if (!reduce) {
            const copy = group.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            track.appendChild(copy);
        }
        if (currentTranslations) applyTranslations(currentTranslations);
    };

    build();
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(build, 160);
    });
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
        const active = button.dataset.lang === lang;
        button.classList.toggle('bg-blue-600', active);
        button.classList.toggle('text-white', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const THEME_KEY = 'theme';

function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#071422' : '#ffffff');
    if (persist) localStorage.setItem(THEME_KEY, theme);
    syncThemeToggle();
}

function syncThemeToggle() {
    const dark = currentTheme() === 'dark';
    const key = dark ? 'theme.toLight' : 'theme.toDark';
    const fallback = dark ? "Kunduzgi mavzuga o'tish" : "Tungi mavzuga o'tish";
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
        button.setAttribute('aria-pressed', dark ? 'true' : 'false');
        const label = button.querySelector('[data-theme-label]');
        if (!label) return;
        label.setAttribute('data-i18n', key);
        label.textContent = t(key, fallback);
    });
}

function bindTheme() {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
        button.addEventListener('click', () => {
            applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
        });
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
        if (!localStorage.getItem(THEME_KEY)) applyTheme(systemTheme(), false);
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onChange);
    syncThemeToggle();
}

function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    navbar.classList.toggle('is-scrolled', window.scrollY > 8);
}

function updateScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.width = `${Math.min(1, Math.max(0, progress)) * 100}%`;
}

function updateShowcaseDrift() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-drift]').forEach(node => {
        const rect = node.getBoundingClientRect();
        const view = window.innerHeight || 1;
        if (rect.bottom < -20 || rect.top > view + 20) return;
        const progress = (rect.top + rect.height * 0.5 - view * 0.5) / view;
        const shift = Math.max(-14, Math.min(14, progress * -18));
        node.style.transform = `translate3d(0, ${shift}px, 0)`;
    });
}

function updateStageTilt() {
    const stage = document.getElementById('appStage');
    if (!stage || reduceMotion) return;
    const rect = stage.getBoundingClientRect();
    const view = window.innerHeight || 1;
    if (rect.bottom < -40 || rect.top > view + 40) return;
    const progress = (rect.top + rect.height * 0.5 - view * 0.5) / view;
    const ry = Math.max(-6, Math.min(6, progress * -8));
    const rx = Math.max(-3, Math.min(3, progress * 3));
    stage.style.setProperty('--stage-ry', `${ry.toFixed(2)}deg`);
    stage.style.setProperty('--stage-rx', `${rx.toFixed(2)}deg`);
}

function updateHeroScroll() {
    const phone = document.getElementById('heroPhone');
    if (!phone || reduceMotion) return;
    const rect = phone.getBoundingClientRect();
    const view = window.innerHeight || 1;
    const progress = Math.min(1, Math.max(0, (view * 0.55 - rect.top) / (view * 0.85)));
    phone.style.setProperty('--lift', `${(progress * -18).toFixed(1)}px`);
}

function updateParallax() {
    if (reduceMotion || !finePointer) return;
    document.querySelectorAll('[data-parallax]').forEach(layer => {
        const depth = Number(layer.dataset.parallax) || 0.08;
        const rect = layer.getBoundingClientRect();
        const offset = (rect.top - window.innerHeight / 2) * depth;
        layer.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
}

// Modal handling
let registrationReturnFocus = null;

function setModalInert(on) {
    document.querySelector('main')?.toggleAttribute('inert', on);
    document.getElementById('navbar')?.toggleAttribute('inert', on);
    document.querySelector('.site-footer')?.toggleAttribute('inert', on);
    document.body.style.overflow = on ? 'hidden' : '';
}

function openRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (!modal) return;
    registrationReturnFocus = document.activeElement;
    modal.hidden = false;
    setModalInert(true);
    document.getElementById('clinicName')?.focus();
}

function closeRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    setModalInert(false);
    if (registrationReturnFocus && typeof registrationReturnFocus.focus === 'function') {
        registrationReturnFocus.focus();
    }
}

function trapModalFocus(event) {
    const modal = document.getElementById('registrationModal');
    if (!modal || modal.hidden || event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button, [href], input, textarea, select')]
        .filter(el => !el.disabled && !el.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function clinicInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const letters = [];
    for (const part of parts) {
        const char = [...part].find(ch => /\p{L}/u.test(ch));
        if (char) letters.push(char);
        if (letters.length === 2) break;
    }
    return letters.join('').toLocaleUpperCase() || '•';
}

function safeLogoUrl(url) {
    const value = String(url || '').trim();
    if (/^https?:\/\//i.test(value)) return value;
    return '';
}

function clinicSlide(clinic, hiddenCopy) {
    const name = String(clinic.name || '').trim();
    const logo = safeLogoUrl(clinic.logoUrl);
    const safeName = escapeHtml(name);
    const media = logo
        ? `<img src="${escapeHtml(logo)}" alt="" width="160" height="160" loading="lazy" decoding="async" data-clinic-logo data-clinic-name="${safeName}">`
        : `<div class="clinic-fallback" aria-hidden="true">${escapeHtml(clinicInitials(name))}</div>`;
    const hidden = hiddenCopy ? ' aria-hidden="true"' : '';
    return `<li class="clinic-card clinic-slide"${hidden}>
        <div class="clinic-logo">${media}</div>
        <h3>${safeName}</h3>
    </li>`;
}

function bindClinicLogoFallbacks(root) {
    root.querySelectorAll('img[data-clinic-logo]').forEach(img => {
        if (img.dataset.bound === '1') return;
        img.dataset.bound = '1';
        img.addEventListener('error', () => {
            const fallback = document.createElement('div');
            fallback.className = 'clinic-fallback';
            fallback.setAttribute('aria-hidden', 'true');
            fallback.textContent = clinicInitials(img.getAttribute('data-clinic-name') || '');
            img.replaceWith(fallback);
        });
    });
}

function setClinicsVisible(visible) {
    const section = document.getElementById('clinics');
    if (section) section.hidden = !visible;
    document.querySelectorAll('a[href="#clinics"]').forEach(link => {
        link.hidden = !visible;
    });
}

function stopClinicSlider() {
    if (clinicSliderFrame) cancelAnimationFrame(clinicSliderFrame);
    clinicSliderFrame = 0;
}

function startClinicSlider() {
    if (clinicSliderFrame || reduceMotion) return;
    const tick = () => {
        const section = document.getElementById('clinics');
        const viewport = document.getElementById('clinicViewport');
        const track = document.getElementById('clinicTrack');
        const running = section && !section.hidden && viewport && track && track.dataset.loop === '1';
        if (!running) {
            clinicSliderFrame = 0;
            return;
        }
        clinicSliderFrame = requestAnimationFrame(tick);
        const held = clinicSliderHover || clinicSliderPointer || clinicSliderFocus || Date.now() < clinicSliderHoldUntil;
        if (held || document.hidden) return;
        viewport.scrollLeft += 0.75;
        const half = track.scrollWidth / 2;
        if (half > 0 && viewport.scrollLeft >= half) viewport.scrollLeft -= half;
    };
    clinicSliderFrame = requestAnimationFrame(tick);
}

function nudgeClinicSlider(direction) {
    const viewport = document.getElementById('clinicViewport');
    const card = viewport?.querySelector('.clinic-slide');
    if (!viewport || !card || viewport.closest('[hidden]')) return;
    const delta = (card.getBoundingClientRect().width + 16) * direction;
    clinicSliderHoldUntil = Date.now() + (reduceMotion ? 0 : 700);
    viewport.scrollBy({ left: delta, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => {
        const track = document.getElementById('clinicTrack');
        if (track?.dataset.loop === '1') {
            const half = track.scrollWidth / 2;
            if (half > 0 && viewport.scrollLeft >= half) viewport.scrollLeft -= half;
            if (viewport.scrollLeft < 0) viewport.scrollLeft += half;
        }
    }, reduceMotion ? 0 : 700);
}

function bindClinicSlider() {
    const slider = document.getElementById('clinicSlider');
    const viewport = document.getElementById('clinicViewport');
    if (!slider || !viewport || slider.dataset.bound === '1') return;
    slider.dataset.bound = '1';

    slider.addEventListener('mouseenter', () => { clinicSliderHover = true; });
    slider.addEventListener('mouseleave', () => { clinicSliderHover = false; });
    slider.addEventListener('focusin', () => { clinicSliderFocus = true; });
    slider.addEventListener('focusout', event => {
        if (!slider.contains(event.relatedTarget)) clinicSliderFocus = false;
    });
    viewport.addEventListener('pointerdown', () => { clinicSliderPointer = true; });
    viewport.addEventListener('pointerup', () => {
        window.setTimeout(() => { clinicSliderPointer = false; }, 900);
    });
    viewport.addEventListener('pointercancel', () => { clinicSliderPointer = false; });

    document.getElementById('clinicPrev')?.addEventListener('click', () => nudgeClinicSlider(-1));
    document.getElementById('clinicNext')?.addEventListener('click', () => nudgeClinicSlider(1));

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (clinicCache.length) paintClinics();
        }, 180);
    });
}

function paintClinics() {
    const track = document.getElementById('clinicTrack');
    const viewport = document.getElementById('clinicViewport');
    if (!track || !viewport || !clinicCache.length) return;
    const generation = ++clinicPaintGeneration;
    stopClinicSlider();
    track.dataset.loop = '';
    track.innerHTML = clinicCache.map(clinic => clinicSlide(clinic, false)).join('');
    viewport.scrollLeft = 0;
    bindClinicLogoFallbacks(track);
    setClinicsVisible(true);

    window.requestAnimationFrame(() => {
        if (generation !== clinicPaintGeneration) return;
        const overflows = track.scrollWidth > viewport.clientWidth + 8;
        if (!reduceMotion && overflows && clinicCache.length > 1) {
            track.insertAdjacentHTML('beforeend', clinicCache.map(clinic => clinicSlide(clinic, true)).join(''));
            track.dataset.loop = '1';
            bindClinicLogoFallbacks(track);
        }
        const canSlide = track.scrollWidth > viewport.clientWidth + 8;
        const prev = document.getElementById('clinicPrev');
        const next = document.getElementById('clinicNext');
        if (prev) prev.disabled = !canSlide;
        if (next) next.disabled = !canSlide;
        const status = document.getElementById('clinicStatus');
        if (status) {
            status.textContent = t('clinics_section.results', '{count}').replace('{count}', String(clinicCache.length));
        }
        startClinicSlider();
    });
}

function hideClinics() {
    clinicPaintGeneration += 1;
    stopClinicSlider();
    clinicCache = [];
    const track = document.getElementById('clinicTrack');
    if (track) track.innerHTML = '';
    setClinicsVisible(false);
}

async function loadClinics() {
    const track = document.getElementById('clinicTrack');
    if (!track) return;
    try {
        const response = await fetch(`${API_URL}/v1/landing/clinics`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) throw new Error(`GET /v1/landing/clinics failed (${response.status})`);
        const data = await response.json();
        if (data?.success === false) throw new Error('GET /v1/landing/clinics returned success:false');
        const clinics = data?.data?.clinics;
        if (!Array.isArray(clinics)) throw new Error('GET /v1/landing/clinics payload missing clinics');
        clinicCache = clinics.filter(clinic => clinic && String(clinic.name || '').trim());
        if (!clinicCache.length) {
            hideClinics();
            return;
        }
        paintClinics();
    } catch (error) {
        console.error(error);
        hideClinics();
    }
}

function bindCursorLight() {
    const node = document.getElementById('cursorLight');
    if (!node || !finePointer || reduceMotion) return;
    node.hidden = false;
    window.addEventListener('pointermove', event => {
        node.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    }, { passive: true });
}

function bindTilt(cards) {
    if (!finePointer || reduceMotion) return;
    cards.forEach(card => {
        card.addEventListener('mousemove', event => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            const rotateY = (px - 0.5) * 8;
            const rotateX = (0.5 - py) * 8;
            card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

function bindHeroTilt() {
    const stage = document.getElementById('heroStage');
    const phone = document.getElementById('heroPhone');
    if (!stage || !phone || !finePointer || reduceMotion) return;
    stage.addEventListener('mousemove', event => {
        const rect = stage.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        if (!window.matchMedia('(min-width: 1024px)').matches) return;
        phone.style.setProperty('--ry', `${-8 + (px - 0.5) * -6}deg`);
        phone.style.setProperty('--rx', `${4 + (py - 0.5) * 4}deg`);
        stage.querySelectorAll('[data-depth]').forEach(layer => {
            const depth = Number(layer.dataset.depth) || 12;
            layer.style.transform = `translate3d(${(px - 0.5) * depth}px, ${(py - 0.5) * depth}px, 0)`;
        });
    });
    stage.addEventListener('mouseleave', () => {
        phone.style.removeProperty('--ry');
        phone.style.removeProperty('--rx');
        stage.querySelectorAll('[data-depth]').forEach(layer => {
            layer.style.transform = '';
        });
    });
}

function bindMagnetic() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('.magnetic').forEach(button => {
        button.addEventListener('mousemove', event => {
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            button.style.transform = `translate(${x * 0.12}px, ${y * 0.16}px)`;
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
        button.addEventListener('blur', () => {
            button.style.transform = '';
        });
    });
}

function bindFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        if (!trigger) return;
        trigger.addEventListener('click', () => {
            const willOpen = !item.classList.contains('is-open');
            items.forEach(other => {
                other.classList.remove('is-open');
                other.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false');
            });
            if (willOpen) {
                item.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function bindMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;
    const setOpen = (open) => {
        menu.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    menu.querySelectorAll('a, button').forEach(element => {
        element.addEventListener('click', () => setOpen(false));
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            setOpen(false);
            closeRegistrationModal();
        }
    });
}

function bindStory() {
    const beats = [...document.querySelectorAll('.beat')];
    if (!beats.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const links = [...document.querySelectorAll('[data-story-link]')];
    const setShot = (name) => {
        const phone = document.getElementById('storyPhone');
        if (phone) {
            phone.querySelectorAll('.shot').forEach(img => {
                const on = img.getAttribute('data-shot') === name;
                img.classList.toggle('is-active', on);
                img.toggleAttribute('aria-hidden', !on);
            });
        }
        document.querySelectorAll('[data-shot-label]').forEach(label => {
            label.hidden = label.getAttribute('data-shot-label') !== name;
        });
    };
    const setActive = (id) => {
        links.forEach(link => {
            const on = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', on);
            if (on) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
        const beat = document.getElementById(id);
        if (beat?.dataset.shot) setShot(beat.dataset.shot);
    };

    if (!reduce) document.documentElement.classList.add('motion', 'story-ready');

    const revealVisible = () => {
        beats.forEach(beat => {
            const rect = beat.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.88 && rect.bottom > 40) beat.classList.add('is-in');
        });
    };

    if (reduce || !('IntersectionObserver' in window)) {
        beats.forEach(beat => beat.classList.add('is-in'));
        if (beats[0]) setActive(beats[0].id);
        return;
    }

    const syncStory = () => {
        const focus = window.innerHeight * 0.42;
        let active = null;
        beats.forEach(beat => {
            const rect = beat.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.82 && rect.bottom > 64) beat.classList.add('is-in');
            if (rect.top <= focus && rect.bottom >= focus) active = beat;
        });
        if (active) setActive(active.id);
    };

    const reveal = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            reveal.unobserve(entry.target);
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    window.requestAnimationFrame(() => {
        revealVisible();
        syncStory();
        beats.forEach(beat => {
            if (!beat.classList.contains('is-in')) reveal.observe(beat);
        });
    });
    window.addEventListener('scroll', syncStory, { passive: true });
    window.addEventListener('resize', syncStory);
}

function bindBenefitsReveal() {
    const section = document.getElementById('benefits');
    if (!section) return;

    const items = [...section.querySelectorAll('[data-benefit-order]')];
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
        items.forEach(item => item.classList.add('is-in'));
        return;
    }

    document.documentElement.classList.add('motion');

    const queue = [];
    let playing = false;
    let previous = null;

    const revealNext = () => {
        const item = queue.shift();
        if (!item) {
            playing = false;
            return;
        }
        playing = true;
        const sameGroup = previous && previous.dataset.benefitGroup === item.dataset.benefitGroup;
        const delay = previous ? (sameGroup ? 200 : 240) : 0;
        previous = item;
        window.setTimeout(() => {
            item.classList.add('is-in');
            revealNext();
        }, delay);
    };

    const enqueue = (item) => {
        if (item.dataset.benefitQueued === '1') return;
        item.dataset.benefitQueued = '1';
        queue.push(item);
        queue.sort((a, b) => Number(a.dataset.benefitOrder) - Number(b.dataset.benefitOrder));
        if (!playing) revealNext();
    };

    section.classList.add('benefits-ready');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            enqueue(entry.target);
        });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

    const revealVisible = () => {
        const viewBottom = window.innerHeight * 0.62;
        items.forEach(item => {
            if (item.dataset.benefitQueued === '1') return;
            const rect = item.getBoundingClientRect();
            if (rect.top > viewBottom || rect.bottom < 24) return;
            observer.unobserve(item);
            enqueue(item);
        });
        if (items.every(item => item.dataset.benefitQueued === '1')) {
            window.removeEventListener('scroll', revealVisible);
            window.removeEventListener('resize', revealVisible);
        }
    };

    items.forEach(item => observer.observe(item));
    window.addEventListener('scroll', revealVisible, { passive: true });
    window.addEventListener('resize', revealVisible, { passive: true });
    window.requestAnimationFrame(revealVisible);
}

function bindReveal() {
    const targets = [...document.querySelectorAll('.reveal, .faq-item, .device, #contact .section-head, #clinics .section-head')];
    if (!targets.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
        targets.forEach(target => target.classList.add('is-in'));
        return;
    }
    document.documentElement.classList.add('motion');

    let batch = [];
    let batchTimer = 0;
    const flush = () => {
        const items = batch.splice(0).sort((a, b) => {
            if (a === b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        items.forEach((el, index) => {
            el.style.setProperty('--reveal-delay', `${Math.min(index, 2) * 200}ms`);
            el.classList.add('is-in');
        });
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            batch.push(entry.target);
        });
        if (!batch.length) return;
        window.clearTimeout(batchTimer);
        batchTimer = window.setTimeout(flush, 40);
    }, { threshold: 0.22, rootMargin: '0px 0px -12% 0px' });

    targets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const seen = rect.top < window.innerHeight * 0.4 && rect.bottom > 24;
        if (seen) target.classList.add('is-in');
        else observer.observe(target);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.toggle('reduced-motion', reduceMotion);

    if (typeof amplitude !== 'undefined') {
        amplitude.track('landing_visit');
    }

    prepareServiceMarquee();

    // Set initial language
    const savedLang = localStorage.getItem('language') || 'uz';
    switchLanguage(savedLang);

    if (document.getElementById('navbar')) {
        let ticking = false;
        const onScroll = () => {
            handleNavbarScroll();
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateScrollProgress();
                updateShowcaseDrift();
                updateStageTilt();
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();
    }

    // Add click listeners for language switcher
    document.querySelectorAll('.language-switcher button').forEach(button => {
        button.addEventListener('click', () => switchLanguage(button.dataset.lang));
    });

    document.querySelectorAll('a.clinic-register, button.open-registration').forEach(control => {
        control.addEventListener('click', event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            openRegistrationModal();
        });
    });

    document.querySelector('.logo-text')?.addEventListener('click', event => {
        const path = window.location.pathname;
        const onHome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
        if (!onHome || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (window.location.hash) history.pushState(null, '', path);
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // Clinic registration form submit
    const clinicForm = document.getElementById('clinicRegistrationForm');
    if (clinicForm) {
        clinicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clinicName = document.getElementById('clinicName')?.value?.trim();
            const phoneNumber = document.getElementById('clinicPhone')?.value?.trim();

            if (!clinicName || !phoneNumber) return;

            const submitBtn = clinicForm.querySelector('button[type="submit"]');
            const successMsg = document.getElementById('successMessage');
            const hideFields = () => {
                const nameError = document.getElementById('clinicNameError');
                const phoneError = document.getElementById('clinicPhoneError');
                if (nameError) nameError.hidden = true;
                if (phoneError) phoneError.hidden = true;
            };

            hideFields();
            submitBtn.disabled = true;

            try {
                const res = await fetch(`${API_URL}/v1/landing/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clinicName, phoneNumber })
                });

                if (res.ok) {
                    clinicForm.reset();
                    if (successMsg) successMsg.hidden = false;
                    setTimeout(() => {
                        if (successMsg) successMsg.hidden = true;
                        closeRegistrationModal();
                    }, 2000);
                } else {
                    const err = document.getElementById('clinicPhoneError');
                    if (err) { err.textContent = t('modal.error.generic', 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.'); err.hidden = false; }
                }
            } catch {
                const err = document.getElementById('clinicPhoneError');
                if (err) { err.textContent = t('modal.error.network', 'Tarmoq xatosi. Qaytadan urinib ko\'ring.'); err.hidden = false; }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Modal: close button and overlay
    const closeBtn = document.getElementById('closeRegistrationModal');
    if (closeBtn) closeBtn.addEventListener('click', closeRegistrationModal);
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeRegistrationModal(); });
        document.addEventListener('keydown', trapModalFocus);
    }

    bindCursorLight();
    bindTheme();
    bindStory();
    bindClinicSlider();

    if (finePointer) {
        document.querySelectorAll('.spotlight-card').forEach(card => {
            card.addEventListener('mousemove', handleSpotlight);
        });
    }
    bindTilt(document.querySelectorAll('.tilt-card, .spotlight-card'));
    bindHeroTilt();
    bindMagnetic();
    bindFaq();
    bindMobileMenu();
    bindReveal();
    bindBenefitsReveal();
    loadClinics();

    // Add click listener for details button tracking
    const detailsButton = document.getElementById('details-button');
    if (detailsButton) {
        detailsButton.addEventListener('click', () => {
            if (typeof amplitude !== 'undefined') {
                amplitude.track('clicked_details_button');
            }
        });
    }

    // Mobile app section: cycle steps and phone mockup slides
    const appSteps = document.querySelectorAll('.app-step');
    const appSlides = document.querySelectorAll('.app-screen-slide');
    if (!reduceMotion && appSteps.length) {
        let stepIndex = 0;
        setInterval(() => {
            appSteps.forEach((el, i) => el.classList.toggle('active', i === stepIndex));
            if (appSlides.length) {
                appSlides.forEach((el, i) => el.classList.toggle('active', i === stepIndex));
            }
            stepIndex = (stepIndex + 1) % appSteps.length;
        }, 3200);
    }
});
