const API_URL = window.API_URL || 'https://api.shifoyol.uz';
const TOKEN_KEY = 'shifoyol_landing_admin_token';
const LOGIN_PATH = '/admin/';
const DASHBOARD_PATH = '/admin/dashboard';

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
    return /^https?:\/\//i.test(value) ? value : '';
}

function readToken() {
    try {
        return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
        return '';
    }
}

function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        /* storage unavailable */
    }
}

function writeToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders(token) {
    return {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
    };
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_URL}/v1/landing/admin/me`, {
            headers: authHeaders(token),
            signal: AbortSignal.timeout(12000)
        });
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        if (response.status === 401 || response.status === 403 || data?.success === false) {
            return { ok: false, unauthorized: true };
        }
        if (!response.ok) return { ok: false, unauthorized: false };
        return { ok: true, unauthorized: false };
    } catch (error) {
        console.error(error);
        return { ok: false, unauthorized: false, network: true };
    }
}

function forceLogin() {
    clearToken();
    location.replace(LOGIN_PATH);
}

async function adminFetch(token, path, options = {}) {
    const headers = {
        ...authHeaders(token),
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
    };
    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method: options.method || 'GET',
            headers,
            body: options.body,
            signal: AbortSignal.timeout(12000)
        });
    } catch (error) {
        console.error(error);
        return { network: true };
    }
    if (response.status === 401 || response.status === 403) {
        forceLogin();
        return null;
    }
    return response;
}

function bindLogoFallbacks(root) {
    root.querySelectorAll('img[data-clinic-logo]').forEach(img => {
        img.addEventListener('error', () => {
            const fallback = document.createElement('span');
            fallback.setAttribute('aria-hidden', 'true');
            fallback.textContent = clinicInitials(img.getAttribute('data-clinic-name') || '');
            img.replaceWith(fallback);
        });
    });
}

function showToast(message, kind) {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.hidden = !message;
    toast.dataset.kind = kind || 'ok';
    toast.textContent = message || '';
}

function renderClinicList(clinics) {
    const list = document.getElementById('clinicList');
    if (!list) return;
    if (!clinics.length) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = clinics.map(clinic => {
        const name = String(clinic.name || '').trim() || 'Clinic';
        const logo = safeLogoUrl(clinic.logoUrl);
        const id = String(clinic.id ?? '');
        const media = logo
            ? `<img src="${escapeHtml(logo)}" alt="" data-clinic-logo data-clinic-name="${escapeHtml(name)}">`
            : `<span aria-hidden="true">${escapeHtml(clinicInitials(name))}</span>`;
        return `<li>
            <label class="admin-clinic">
                <span class="admin-logo">${media}</span>
                <span class="admin-name">${escapeHtml(name)}</span>
                <input type="checkbox" value="${escapeHtml(id)}" ${clinic.selected === true ? 'checked' : ''} aria-label="${escapeHtml(name)}">
            </label>
        </li>`;
    }).join('');
    bindLogoFallbacks(list);
}

async function initLogin() {
    const form = document.getElementById('loginForm');
    const status = document.getElementById('adminStatus');
    const error = document.getElementById('loginError');
    const token = readToken();

    const showForm = (message) => {
        if (status) status.hidden = true;
        if (form) form.hidden = false;
        if (error) {
            error.hidden = !message;
            error.textContent = message || '';
        }
        document.getElementById('username')?.focus();
    };

    if (token) {
        if (status) status.textContent = 'Checking session…';
        const result = await verifyToken(token);
        if (result.ok) {
            location.replace(DASHBOARD_PATH);
            return;
        }
        if (result.unauthorized) clearToken();
        showForm(result.network ? 'Could not reach the server. Try again.' : '');
    } else {
        showForm('');
    }

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        const username = document.getElementById('username')?.value?.trim() || '';
        const password = document.getElementById('password')?.value || '';
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        if (error) error.hidden = true;

        try {
            const response = await fetch(`${API_URL}/v1/auth/loginAdmin`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                signal: AbortSignal.timeout(12000)
            });
            let data = null;
            try {
                data = await response.json();
            } catch {
                data = null;
            }
            const nextToken = data?.data?.token;
            if (!response.ok || data?.success === false || typeof nextToken !== 'string' || !nextToken) {
                showForm('Username or password is incorrect.');
                return;
            }
            clearToken();
            writeToken(nextToken);
            location.replace(DASHBOARD_PATH);
        } catch (err) {
            console.error(err);
            showForm('Could not reach the server. Try again.');
        } finally {
            if (submit) submit.disabled = false;
        }
    });
}

async function loadDashboardClinics(token) {
    const empty = document.getElementById('clinicEmpty');
    const save = document.getElementById('saveClinics');
    const loading = document.getElementById('clinicLoading');
    const stopLoading = () => {
        if (loading) loading.hidden = true;
    };
    showToast('', 'ok');
    const response = await adminFetch(token, '/v1/landing/admin/clinics');
    if (!response) return;
    if (response.network) {
        stopLoading();
        showToast('Could not load clinics.', 'error');
        if (save) save.disabled = true;
        return;
    }
    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        console.error(error);
        data = null;
    }
    const clinics = data?.data?.clinics;
    if (!response.ok || data?.success === false || !Array.isArray(clinics)) {
        stopLoading();
        showToast('Could not load clinics.', 'error');
        if (save) save.disabled = true;
        return;
    }
    renderClinicList(clinics);
    const hasRows = clinics.length > 0;
    stopLoading();
    if (empty) empty.hidden = hasRows;
    if (save) save.disabled = !hasRows;
}

async function initDashboard() {
    const token = readToken();
    if (!token) {
        location.replace(LOGIN_PATH);
        return;
    }

    const status = document.getElementById('adminStatus');
    const retry = document.getElementById('adminRetry');
    const dashboard = document.getElementById('dashboard');
    if (status) status.textContent = 'Checking session…';

    const result = await verifyToken(token);
    if (result.unauthorized || !result.ok) {
        if (result.unauthorized) {
            forceLogin();
            return;
        }
        if (status) status.textContent = 'Could not verify this session.';
        if (retry) retry.hidden = false;
        retry?.addEventListener('click', () => location.reload());
        return;
    }

    if (status) status.hidden = true;
    if (retry) retry.hidden = true;
    const bar = document.getElementById('adminBar');
    if (bar) bar.hidden = false;
    if (dashboard) dashboard.hidden = false;

    document.getElementById('logoutButton')?.addEventListener('click', () => {
        clearToken();
        location.replace(LOGIN_PATH);
    });

    const save = document.getElementById('saveClinics');
    save?.addEventListener('click', async () => {
        const current = readToken();
        if (!current) {
            forceLogin();
            return;
        }
        const clinicIds = [...document.querySelectorAll('#clinicList input[type="checkbox"]:checked')]
            .map(input => input.value)
            .filter(Boolean);
        save.disabled = true;
        showToast('', 'ok');
        const response = await adminFetch(current, '/v1/landing/admin/clinics', {
            method: 'PUT',
            body: JSON.stringify({ clinicIds })
        });
        if (!response) return;
        if (response.network) {
            showToast('Could not save clinics.', 'error');
            save.disabled = false;
            return;
        }
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        if (!response.ok || data?.success === false) {
            showToast('Could not save clinics.', 'error');
            save.disabled = false;
            return;
        }
        showToast('Saved.', 'ok');
        save.disabled = false;
    });

    retry?.addEventListener('click', () => location.reload());
    await loadDashboardClinics(token);
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.admin;
    if (page === 'login') initLogin();
    if (page === 'dashboard') initDashboard();
});
