import { appState } from './state.js';

let logoutHandler = () => { console.warn('Logout handler not set'); };

export function setLogoutHandler(handler) {
    logoutHandler = handler;
}

/**
 * Performs a fetch request with auth and error handling
 * @param {string} endpoint - The API endpoint
 * @param {object} [options={}] - Fetch options
 */
export async function apiFetch(endpoint, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${appState.currentToken}`,
    };

    if (options.body instanceof FormData) {
        // Let browser set Content-Type
    } else if (options.body) {
        options.body = JSON.stringify(options.body);
        options.headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(endpoint, options);

    if (resp.status === 401 || resp.status === 403) {
        logoutHandler();
        throw new Error('Session expired');
    }

    const data = await resp.json();

    if (!resp.ok) {
        throw new Error(data.message || 'An API error occurred');
    }

    return data;
}

// --- AUTH ---

export async function login(username, password) {
    const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Login failed');
    return data;
}

export async function signup(username, password) {
    const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Sign up failed');
    return data;
}

export async function checkToken(token) {
    const resp = await fetch('/api/auth/check', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Session expired');
    return await resp.json();
}

// --- DASHBOARD ---

export async function getDashboard() {
    return await apiFetch('/api/dashboard');
}

// --- TILES ---

export async function createTile(tileData) {
    return await apiFetch('/api/tiles', {
        method: 'POST',
        body: tileData
    });
}

export async function updateTile(id, tileData) {
    return await apiFetch(`/api/tiles/${id}`, {
        method: 'PUT',
        body: tileData
    });
}

export async function deleteTile(id) {
    return await apiFetch(`/api/tiles/${id}`, {
        method: 'DELETE'
    });
}

export async function moveTile(tileId, newGroupId, newPosition) {
    return await apiFetch('/api/tiles/move', {
        method: 'PUT',
        body: { tileId, newGroupId, newPosition }
    });
}

export async function saveTileOrder(orderedIds, groupId) {
    return await apiFetch('/api/tiles/order', {
        method: 'PUT',
        body: { orderedIds, groupId }
    });
}

// --- GROUPS ---

export async function createGroup(name) {
    return await apiFetch('/api/groups', {
        method: 'POST',
        body: { name }
    });
}

export async function renameGroup(id, name) {
    return await apiFetch(`/api/groups/${id}`, {
        method: 'PUT',
        body: { name }
    });
}

export async function deleteGroup(id) {
    return await apiFetch(`/api/groups/${id}`, {
        method: 'DELETE'
    });
}

export async function saveGroupOrder(orderedIds) {
    return await apiFetch('/api/groups/order', {
        method: 'PUT',
        body: { orderedIds }
    });
}

// --- BACKGROUNDS ---

export async function getBackgrounds() {
    return await apiFetch('/api/backgrounds');
}

export async function uploadBackground(formData) {
    return await apiFetch('/api/backgrounds/upload', {
        method: 'POST',
        body: formData
    });
}

export async function deleteBackground(filename) {
    return await apiFetch(`/api/backgrounds/${filename}`, {
        method: 'DELETE'
    });
}

// --- BACKUP ---

export async function exportBackup() {
    return await apiFetch('/api/backup/export');
}

export async function importBackup(data) {
    return await apiFetch('/api/backup/import', {
        method: 'POST',
        body: data
    });
}

// --- HEALTH ---

export async function checkServiceHealth(url) {
    return await apiFetch('/api/health/check', {
        method: 'POST',
        body: { url }
    });
}
