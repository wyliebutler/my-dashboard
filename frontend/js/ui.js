import { appState, categoryColors, faIconList } from './state.js';
import * as API from './api.js';
import { initializeSortables, initGroupTabDragAndDrop, initGroupManageListDragAndDrop } from './dragdrop.js';

// --- SELECTORS ---
const $ = document.querySelector.bind(document);

export const UI = {
    authScreen: $('#auth-screen'),
    appHeader: $('#app-header'),
    mobileSearchWrapper: $('#mobile-search-wrapper'),
    groupTabBar: $('#group-tab-bar'),
    groupTabList: $('#group-tab-list'),
    tileContainer: $('#tile-container'),
    welcomeUser: $('#welcome-user'),
    mainContent: $('#main-content'),

    // Auth
    authForm: $('#auth-form'),
    authTitle: $('#auth-title'),
    authError: $('#auth-error'),
    authSubmitBtn: $('#auth-submit-btn'),
    authToggleText: $('#auth-toggle-text'),
    authToggleBtn: $('#auth-toggle-btn'),
    usernameInput: $('#username'),
    passwordInput: $('#password'),

    // Header
    logoutBtn: $('#logout-btn'),
    addTileBtn: $('#add-tile-btn'),
    themeToggle: $('#theme-toggle'),
    exportBtn: $('#export-btn'),
    importBtn: $('#import-btn'),
    importFileInput: $('#import-file-input'),
    heartbeatBtn: $('#heartbeat-btn'),
    searchInput: $('#search-input'),
    mobileSearchInput: $('#mobile-search-input'),

    // Tile Modal
    tileModal: $('#tile-modal'),
    modalTitle: $('#modal-title'),
    modalError: $('#modal-error'),
    tileForm: $('#tile-form'),
    tileIdInput: $('#tile-id'),
    tileNameInput: $('#tile-name'),
    tileUrlInput: $('#tile-url'),
    tileIconInput: $('#tile-icon'),
    tileGroupSelect: $('#tile-group'),
    modalCancelBtn: $('#modal-cancel-btn'),
    modalDeleteBtn: $('#modal-delete-btn'),
    modalSubmitBtn: $('#modal-submit-btn'),

    // Icon Picker
    openIconPickerBtn: $('#open-icon-picker-btn'),
    iconPickerModal: $('#icon-picker-modal'),
    iconPickerGrid: $('#icon-picker-grid'),
    iconSearchInput: $('#icon-search-input'),
    iconPickerCloseBtn: $('#icon-picker-close-btn'),

    // Group Modal
    manageGroupsBtn: $('#manage-groups-btn'),
    manageGroupsModal: $('#manage-groups-modal'),
    groupModalError: $('#group-modal-error'),
    addGroupForm: $('#add-group-form'),
    newGroupNameInput: $('#new-group-name'),
    groupManageList: $('#group-manage-list'),
    groupModalCloseBtn: $('#group-modal-close-btn'),

    // Background Modal
    manageBgBtn: $('#manage-bg-btn'),
    bgModal: $('#bg-modal'),
    bgModalCloseBtn: $('#bg-modal-close-btn'),
    bgColorPicker: $('#bg-color-picker'),
    bgClearBtn: $('#bg-clear-btn'),
    bgTabColor: $('#bg-tab-color'),
    bgTabImage: $('#bg-tab-image'),
    bgTabContentColor: $('#bg-tab-content-color'),
    bgTabContentImage: $('#bg-tab-content-image'),
    bgUploadInput: $('#bg-upload-input'),
    bgImageGrid: $('#bg-image-grid'),
    bgImageError: $('#bg-image-error'),

    // Search & Toast
    noResultsState: $('#no-results-state'),
    noResultsTerm: $('#no-results-term'),
    toast: $('#toast'),
    toastMessage: $('#toast-message'),
};

// --- TOAST ---
let toastTimer;
export function showToast(message, isError = false) {
    if (!UI.toast || !UI.toastMessage) return;
    UI.toastMessage.textContent = message || 'Done';
    UI.toast.classList.remove('bg-green-500', 'bg-red-600');
    UI.toast.classList.add(isError ? 'bg-red-600' : 'bg-green-500');
    UI.toast.classList.remove('opacity-0', 'translate-y-3');
    UI.toast.classList.add('opacity-100');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        UI.toast.classList.add('opacity-0', 'translate-y-3');
    }, 2500);
}

// --- RENDER FUNCTIONS ---

export function renderAll() {
    renderGroupTabs();
    renderTiles();
    initGroupTabDragAndDrop();
}

export function renderGroupTabs() {
    UI.groupTabList.innerHTML = '';
    UI.groupTabList.appendChild(createGroupTab('ALL', null));
    appState.groups.forEach(group => {
        UI.groupTabList.appendChild(createGroupTab(group.name, group.id));
    });
}

function createGroupTab(name, groupId) {
    const tab = document.createElement('button');
    tab.className = `group-tab flex-shrink-0 py-3 px-5 rounded-lg font-medium transition-colors`;
    tab.textContent = name;
    tab.dataset.groupId = (groupId === null ? 'null' : groupId);

    if (groupId === null) tab.classList.add('no-drag');

    if (groupId === appState.activeGroupId) {
        tab.className += ' bg-blue-600 text-white';
    } else {
        tab.className += ' bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
    }

    tab.addEventListener('click', () => {
        appState.activeGroupId = groupId;
        renderGroupTabs();
        renderTiles();
    });

    return tab;
}

export function renderTiles() {
    UI.tileContainer.innerHTML = '';
    UI.noResultsState.classList.add('hidden');

    if (appState.activeGroupId !== null) {
        UI.tileContainer.className = 'flex flex-wrap gap-3 md:gap-4';
        const tilesToShow = appState.tiles.filter(tile => tile.groupId === appState.activeGroupId);
        tilesToShow.forEach(tile => UI.tileContainer.appendChild(createTileElement(tile)));
    } else {
        UI.tileContainer.className = 'flex flex-col gap-6';
        const uncategorizedTiles = appState.tiles.filter(tile => tile.groupId === null);
        UI.tileContainer.appendChild(createGroupSection('ALL (Uncategorized)', 'null', uncategorizedTiles));
        appState.groups.forEach(group => {
            const groupTiles = appState.tiles.filter(tile => tile.groupId === group.id);
            UI.tileContainer.appendChild(createGroupSection(group.name, group.id, groupTiles));
        });
    }

    handleSearch(); // Filter visibility
    void UI.tileContainer.offsetHeight; // Force reflow
    initializeSortables();
}

function createGroupSection(name, groupId, tiles) {
    const section = document.createElement('section');
    section.className = 'group-section';

    const header = document.createElement('h2');
    header.className = 'group-header';
    header.textContent = name;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.id = `grid-${groupId}`;
    grid.className = 'flex flex-wrap gap-3 md:gap-4';

    tiles.forEach(tile => grid.appendChild(createTileElement(tile)));
    section.appendChild(grid);
    return section;
}

function createTileElement(tile) {
    const tileEl = document.createElement('a');
    tileEl.href = tile.url;
    tileEl.target = '_blank';
    tileEl.rel = 'noopener noreferrer';

    tileEl.dataset.id = tile.id;
    tileEl.dataset.name = tile.name.toLowerCase();
    tileEl.dataset.url = tile.url;
    tileEl.dataset.icon = tile.icon;
    tileEl.dataset.groupId = tile.groupId;

    let colorClasses = 'bg-white dark:bg-gray-800 hover:brightness-95';
    if (tile.groupId !== null) {
        const groupIndex = appState.groups.findIndex(g => g.id === tile.groupId);
        if (groupIndex > -1) {
            const colorIndex = groupIndex % categoryColors.length;
            colorClasses = `${categoryColors[colorIndex]} hover:brightness-95`;
        }
    }

    tileEl.className = `tile-item group ${colorClasses} p-3 rounded-lg shadow-lg flex flex-col items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-black/10 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 h-36 w-36 relative`;

    const statusDot = document.createElement('div');
    statusDot.className = 'status-indicator hidden';
    tileEl.appendChild(statusDot);

    tileEl.innerHTML += `
        <i class="${tile.icon} text-3xl sm:text-4xl text-gray-600 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"></i>
        <span class="h-10 text-xs sm:text-sm text-center font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors break-words w-full flex items-center justify-center">${tile.name}</span>
    `;

    const editBtn = document.createElement('button');
    editBtn.className = 'absolute top-2 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity';
    editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';

    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tileData = appState.tiles.find(t => t.id == tile.id);
        if (tileData) showTileModal(tileData);
    });

    tileEl.style.position = 'relative';
    tileEl.appendChild(editBtn);

    return tileEl;
}

// --- MODALS & FORMS ---

let currentEditTileId = null;

export function showTileModal(tile = null) {
    UI.modalError.classList.add('hidden');
    UI.tileForm.reset();
    UI.tileGroupSelect.innerHTML = '<option value="null">ALL (Uncategorized)</option>';
    appState.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        UI.tileGroupSelect.appendChild(option);
    });

    if (tile) {
        currentEditTileId = tile.id;
        UI.modalTitle.textContent = 'Edit Tile';
        UI.tileNameInput.value = tile.name;
        UI.tileUrlInput.value = tile.url;
        UI.tileIconInput.value = tile.icon;
        UI.tileGroupSelect.value = tile.groupId === null ? 'null' : tile.groupId;
        UI.modalDeleteBtn.classList.remove('hidden');
        UI.modalSubmitBtn.textContent = 'Update';
    } else {
        currentEditTileId = null;
        UI.modalTitle.textContent = 'Add New Tile';
        UI.tileGroupSelect.value = appState.activeGroupId === null ? 'null' : appState.activeGroupId;
        UI.modalDeleteBtn.classList.add('hidden');
        UI.modalSubmitBtn.textContent = 'Save';
    }
    UI.tileModal.classList.remove('hidden');
}

export function hideTileModal() {
    UI.tileModal.classList.add('hidden');
    currentEditTileId = null;
    UI.modalError.classList.add('hidden');
    UI.tileForm.reset();
}

export async function handleTileFormSubmit(e) {
    e.preventDefault();
    UI.modalError.classList.add('hidden');

    const tileData = {
        name: UI.tileNameInput.value,
        url: UI.tileUrlInput.value,
        icon: UI.tileIconInput.value,
        groupId: UI.tileGroupSelect.value === 'null' ? null : Number(UI.tileGroupSelect.value)
    };

    const isEdit = !!currentEditTileId;

    try {
        if (isEdit) {
            await API.updateTile(currentEditTileId, tileData);
            const index = appState.tiles.findIndex(t => t.id == currentEditTileId);
            if (index > -1) appState.tiles[index] = { ...appState.tiles[index], ...tileData };
        } else {
            const savedTile = await API.createTile(tileData);
            appState.tiles.push(savedTile);
        }
        hideTileModal();
        showToast(isEdit ? 'Tile updated!' : 'Tile added!');
        renderAll();
    } catch (err) {
        UI.modalError.textContent = err.message;
        UI.modalError.classList.remove('hidden');
    }
}

export async function handleDeleteTile() {
    if (!currentEditTileId) return;
    if (!window.confirm('Are you sure you want to delete this tile?')) return;

    try {
        await API.deleteTile(currentEditTileId);
        appState.tiles = appState.tiles.filter(t => t.id != currentEditTileId);
        hideTileModal();
        showToast('Tile deleted!');
        renderAll();
    } catch (err) {
        UI.modalError.textContent = err.message;
        UI.modalError.classList.remove('hidden');
    }
}

// --- GROUP MANAGEMENT ---

export function showGroupModal() {
    UI.groupModalError.classList.add('hidden');
    UI.addGroupForm.reset();
    renderGroupManageList();
    UI.manageGroupsModal.classList.remove('hidden');
}

export function hideGroupModal() {
    UI.manageGroupsModal.classList.add('hidden');
}

export async function handleAddGroup(e) {
    e.preventDefault();
    UI.groupModalError.classList.add('hidden');
    const name = UI.newGroupNameInput.value;
    if (!name) return;

    try {
        const newGroup = await API.createGroup(name);
        appState.groups.push(newGroup);
        renderGroupTabs();
        renderGroupManageList();
    } catch (err) {
        UI.groupModalError.textContent = err.message;
        UI.groupModalError.classList.remove('hidden');
    }
}

export function renderGroupManageList() {
    UI.groupManageList.innerHTML = '';
    appState.groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'group-list-item';
        item.dataset.id = group.id;
        item.innerHTML = `
            <div class="flex items-center flex-1">
                <i class="fa-solid fa-grip-vertical drag-handle"></i>
                <input type="text" value="${group.name}" class="group-name-input bg-transparent w-full focus:outline-none focus:bg-white dark:focus:bg-gray-800 p-1 rounded-md" data-id="${group.id}">
            </div>
            <button class="delete-group-btn text-red-500 hover:text-red-700 ml-4" data-id="${group.id}">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        UI.groupManageList.appendChild(item);
    });

    UI.groupManageList.querySelectorAll('.group-name-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const newName = e.target.value;
            const groupId = e.target.dataset.id;
            try {
                await API.renameGroup(groupId, newName);
                const group = appState.groups.find(g => g.id == groupId);
                if (group) group.name = newName;
                showToast('Group renamed!');
                renderGroupTabs();
            } catch (err) {
                showToast(err.message, true);
                await fetchDashboardData();
                renderAll();
            }
        });
    });

    UI.groupManageList.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const groupId = e.currentTarget.dataset.id;
            if (!window.confirm('Delete group? Tiles will be moved to Uncategorized.')) return;
            try {
                await API.deleteGroup(groupId);
                appState.groups = appState.groups.filter(g => g.id != groupId);
                appState.tiles.forEach(t => { if (t.groupId == groupId) t.groupId = null; });
                if (appState.activeGroupId == groupId) appState.activeGroupId = null;
                showToast('Group deleted!');
                renderAll();
                renderGroupManageList();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    });

    initGroupManageListDragAndDrop();
}

// --- SEARCH ---

export function handleSearch(e) {
    const source = e ? e.target.id : 'search-input';
    const searchTerm = source === 'search-input' ? UI.searchInput.value : UI.mobileSearchInput.value;

    if (source === 'search-input') {
        if (UI.mobileSearchInput) UI.mobileSearchInput.value = searchTerm;
    } else {
        if (UI.searchInput) UI.searchInput.value = searchTerm;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    let totalVisible = 0;

    document.querySelectorAll('.tile-item').forEach(tile => {
        const name = tile.dataset.name;
        if (name.includes(lowerSearchTerm)) {
            tile.classList.remove('hidden');
            totalVisible++;
        } else {
            tile.classList.add('hidden');
        }
    });

    let visibleInActiveView = 0;
    if (appState.activeGroupId === null) {
        visibleInActiveView = totalVisible;
        document.querySelectorAll('.group-section').forEach(section => {
            const visibleTiles = section.querySelectorAll('.tile-item:not(.hidden)').length;
            if (visibleTiles === 0) section.classList.add('hidden');
            else section.classList.remove('hidden');
        });
    } else {
        const activeGrid = $(`#grid-${appState.activeGroupId}`);
        if (activeGrid) visibleInActiveView = activeGrid.querySelectorAll('.tile-item:not(.hidden)').length;
    }

    if (visibleInActiveView === 0 && lowerSearchTerm.length > 0) {
        UI.noResultsTerm.textContent = searchTerm;
        UI.noResultsState.classList.remove('hidden');
    } else {
        UI.noResultsState.classList.add('hidden');
    }
}

// --- ICON PICKER ---

export function showIconPicker() {
    UI.iconSearchInput.value = '';
    populateIconPicker();
    UI.iconPickerModal.classList.remove('hidden');
    UI.iconSearchInput.focus();
}

export function hideIconPicker() {
    UI.iconPickerModal.classList.add('hidden');
}

export function handleIconSearch() {
    populateIconPicker(UI.iconSearchInput.value);
}

function populateIconPicker(filter = '') {
    UI.iconPickerGrid.innerHTML = '';
    const lowerFilter = filter.toLowerCase();
    faIconList.filter(icon => icon.includes(lowerFilter)).forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'p-3 rounded-lg flex items-center justify-center aspect-square bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white transition-all';
        btn.innerHTML = `<i class="${iconClass} text-2xl"></i>`;
        btn.addEventListener('click', () => {
            UI.tileIconInput.value = iconClass;
            hideIconPicker();
        });
        UI.iconPickerGrid.appendChild(btn);
    });
}

// --- BACKGROUNDS ---

export function showBgModal() {
    UI.bgImageError.classList.add('hidden');
    switchBgTab('color');
    renderBgImageGrid();
    UI.bgModal.classList.remove('hidden');
}

export function hideBgModal() {
    UI.bgModal.classList.add('hidden');
}

export function switchBgTab(tabName) {
    if (tabName === 'color') {
        UI.bgTabColor.classList.add('active');
        UI.bgTabImage.classList.remove('active');
        UI.bgTabContentColor.classList.add('active');
        UI.bgTabContentImage.classList.remove('active');
    } else {
        UI.bgTabColor.classList.remove('active');
        UI.bgTabImage.classList.add('active');
        UI.bgTabContentColor.classList.remove('active');
        UI.bgTabContentImage.classList.add('active');
    }
}

export function handleSetColorBg(e) {
    const color = e.target.value;
    localStorage.setItem('dashboard-bg-type', 'color');
    localStorage.setItem('dashboard-bg-value', color);
    initBackground();
}

export function handleClearBg() {
    localStorage.removeItem('dashboard-bg-type');
    localStorage.removeItem('dashboard-bg-value');
    initBackground();
    renderBgImageGrid();
}

export async function handleUploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    UI.bgImageError.classList.add('hidden');
    const formData = new FormData();
    formData.append('backgroundFile', file);

    try {
        const data = await API.uploadBackground(formData);
        showToast('Image uploaded!');
        localStorage.setItem('dashboard-bg-type', 'image');
        localStorage.setItem('dashboard-bg-value', data.filename);
        initBackground();
        renderBgImageGrid();
    } catch (err) {
        UI.bgImageError.textContent = 'Upload failed. ' + err.message;
        UI.bgImageError.classList.remove('hidden');
    } finally {
        UI.bgUploadInput.value = null;
    }
}

export function initBackground() {
    const bgType = localStorage.getItem('dashboard-bg-type');
    const bgValue = localStorage.getItem('dashboard-bg-value');
    UI.mainContent.classList.remove('bg-gray-100', 'dark:bg-gray-900');

    if (bgType === 'image' && bgValue) {
        UI.mainContent.style.backgroundImage = `url('/api/backgrounds/${bgValue}')`;
        UI.mainContent.style.backgroundSize = 'cover';
        UI.mainContent.style.backgroundPosition = 'center';
        UI.mainContent.style.backgroundAttachment = 'fixed';
        UI.mainContent.style.backgroundColor = '';
        UI.bgColorPicker.value = '#ffffff';
    } else if (bgType === 'color' && bgValue) {
        UI.mainContent.style.backgroundColor = bgValue;
        UI.mainContent.style.backgroundImage = 'none';
        UI.bgColorPicker.value = bgValue;
    } else {
        UI.mainContent.style.backgroundColor = '';
        UI.mainContent.style.backgroundImage = 'none';
        UI.mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
        UI.bgColorPicker.value = document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6';
    }
}

async function renderBgImageGrid() {
    try {
        const imageFiles = await API.getBackgrounds();
        UI.bgImageGrid.innerHTML = '';
        if (imageFiles.length === 0) {
            UI.bgImageGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center">No images uploaded.</p>';
            return;
        }

        const activeBgType = localStorage.getItem('dashboard-bg-type');
        const activeBgValue = localStorage.getItem('dashboard-bg-value');

        imageFiles.forEach(filename => {
            const item = document.createElement('div');
            item.className = 'bg-image-item group';
            if (activeBgType === 'image' && activeBgValue === filename) item.classList.add('active');
            item.innerHTML = `
                <img src="/api/backgrounds/${filename}" alt="Background">
                <button class="delete-bg-btn" data-filename="${filename}">
                    <i class="fa-solid fa-trash fa-xs"></i>
                </button>
            `;
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-bg-btn')) {
                    localStorage.setItem('dashboard-bg-type', 'image');
                    localStorage.setItem('dashboard-bg-value', filename);
                    initBackground();
                    renderBgImageGrid();
                }
            });
            item.querySelector('.delete-bg-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!window.confirm('Delete image?')) return;
                try {
                    await API.deleteBackground(filename);
                    showToast('Image deleted');
                    if (activeBgType === 'image' && activeBgValue === filename) handleClearBg();
                    else renderBgImageGrid();
                } catch (err) {
                    showToast(err.message, true);
                }
            });
            UI.bgImageGrid.appendChild(item);
        });
    } catch (err) {
        UI.bgImageError.textContent = 'Could not load images. ' + err.message;
        UI.bgImageError.classList.remove('hidden');
    }
}

// --- HEARTBEAT ---

export async function handleHeartbeat() {
    const tiles = document.querySelectorAll('.tile-item');
    if (tiles.length === 0) return;
    showToast('Checking service health...', false);
    tiles.forEach(tile => checkTileHealth(tile));
}

async function checkTileHealth(tileEl) {
    const url = tileEl.dataset.url;
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

    const statusDot = tileEl.querySelector('.status-indicator');
    if (!statusDot) return;

    statusDot.className = 'status-indicator status-loading';
    statusDot.classList.remove('hidden');

    try {
        const resp = await API.checkServiceHealth(url);
        if (resp.status === 'up') {
            statusDot.className = 'status-indicator status-up';
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
            clearTimeout(timeoutId);
            statusDot.className = 'status-indicator status-up';
        } catch (clientErr) {
            console.warn(`Client-side check failed for ${url}:`, clientErr);
            statusDot.className = 'status-indicator status-down';
        }
    } catch (err) {
        console.error(`Health check failed for ${url}:`, err);
        statusDot.className = 'status-indicator status-down';
    }
}

export async function fetchDashboardData() {
    try {
        const data = await API.getDashboard();
        appState.username = data.username;
        appState.groups = data.groups;
        appState.tiles = data.tiles;
        if (appState.activeGroupId !== null && !appState.groups.find(g => g.id === appState.activeGroupId)) {
            appState.activeGroupId = null;
        }
        return data;
    } catch (err) {
        console.error('Failed to fetch dashboard data:', err.message);
        showToast('Could not load dashboard. Please refresh.', true);
    }
}
