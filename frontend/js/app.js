import { appState } from './state.js';
import * as API from './api.js';
import {
    UI, showToast, renderAll, fetchDashboardData, initBackground,
    handleHeartbeat, handleSearch, showTileModal, hideTileModal,
    handleTileFormSubmit, handleDeleteTile, showGroupModal, hideGroupModal,
    handleAddGroup, showBgModal, hideBgModal, handleSetColorBg,
    handleClearBg, handleUploadImage, switchBgTab, showIconPicker,
    hideIconPicker, handleIconSearch
} from './ui.js';
import { destroySortables } from './dragdrop.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- INITIALIZATION ---
    API.setLogoutHandler(handleLogout);
    checkTokenOnLoad();

    // --- AUTH ---
    let isLoginMode = true;

    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            UI.authTitle.textContent = "Login";
            UI.authSubmitBtn.textContent = "Login";
            UI.authToggleText.textContent = "Don't have an account?";
            UI.authToggleBtn.textContent = "Sign Up";
        } else {
            UI.authTitle.textContent = "Sign Up";
            UI.authSubmitBtn.textContent = "Create Account";
            UI.authToggleText.textContent = "Already have an account?";
            UI.authToggleBtn.textContent = "Login";
        }
        UI.authError.classList.add('hidden');
        UI.authForm.reset();
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        UI.authError.classList.add('hidden');
        const username = UI.usernameInput.value.trim();
        const password = UI.passwordInput.value;

        if (!username || !password) {
            UI.authError.textContent = 'Please enter a username and password.';
            UI.authError.classList.remove('hidden');
            return;
        }

        try {
            let data;
            if (isLoginMode) {
                data = await API.login(username, password);
                if (!data.token) throw new Error('No token received.');
                localStorage.setItem('dashboard-token', data.token);
                appState.currentToken = data.token;
                await showDashboard(data.username || username);
                showToast('Logged in!');
            } else {
                await API.signup(username, password);
                showToast('Account created! Please log in.');
                toggleAuthMode();
            }
        } catch (err) {
            UI.authError.textContent = err.message;
            UI.authError.classList.remove('hidden');
        }
    }

    function handleLogout() {
        appState.groups = [];
        appState.tiles = [];
        appState.activeGroupId = null;
        appState.currentToken = null;
        appState.username = '';

        localStorage.removeItem('dashboard-token');
        destroySortables();

        UI.authScreen.classList.remove('hidden');
        UI.appHeader.classList.add('hidden');
        UI.mobileSearchWrapper.classList.add('hidden');
        UI.groupTabBar.classList.add('hidden');
        UI.tileContainer.innerHTML = '';
        UI.noResultsState.classList.add('hidden');
        UI.welcomeUser.textContent = '';
        UI.searchInput.value = '';
        UI.mobileSearchInput.value = '';

        if (UI.authForm) UI.authForm.reset();
        if (!isLoginMode) toggleAuthMode();

        UI.mainContent.style.backgroundColor = '';
        UI.mainContent.style.backgroundImage = 'none';
        UI.mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
    }

    async function checkTokenOnLoad() {
        initThemeToggle();
        initBackground();

        const token = localStorage.getItem('dashboard-token');
        if (!token) {
            UI.authScreen.classList.remove('hidden');
            UI.mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
            return;
        }

        try {
            const data = await API.checkToken(token);
            appState.currentToken = token;
            await showDashboard(data.username);
        } catch (err) {
            console.error('Token check failed:', err.message);
            handleLogout();
        }
    }

    async function showDashboard(username) {
        UI.authScreen.classList.add('hidden');
        UI.appHeader.classList.remove('hidden');
        UI.mobileSearchWrapper.classList.remove('hidden');
        UI.groupTabBar.classList.remove('hidden');
        UI.welcomeUser.textContent = `Welcome, ${username}!`;

        await fetchDashboardData();
        renderAll();
    }

    // --- THEME ---
    function initThemeToggle() {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            UI.themeToggle.checked = true;
            document.documentElement.classList.add('dark');
        } else {
            UI.themeToggle.checked = false;
            document.documentElement.classList.remove('dark');
        }
    }

    UI.themeToggle.addEventListener('change', () => {
        if (UI.themeToggle.checked) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
        initBackground();
    });

    // --- IMPORT/EXPORT ---
    async function handleExport() {
        try {
            const data = await API.exportBackup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup exported successfully!');
        } catch (err) {
            showToast(err.message, true);
        }
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.confirm('WARNING: This will overwrite all current groups and tiles. Proceed?')) {
            UI.importFileInput.value = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.groups || !data.tiles) throw new Error('Invalid file format.');
                await API.importBackup(data);
                showToast('Import successful! Reloading...');
                await fetchDashboardData();
                renderAll();
            } catch (err) {
                showToast(err.message, true);
            } finally {
                UI.importFileInput.value = null;
            }
        };
        reader.readAsText(file);
    }

    // --- EVENT LISTENERS ---

    // Auth
    UI.authToggleBtn.addEventListener('click', toggleAuthMode);
    UI.authForm.addEventListener('submit', handleAuthSubmit);
    UI.logoutBtn.addEventListener('click', handleLogout);

    // Header
    UI.exportBtn.addEventListener('click', handleExport);
    UI.importBtn.addEventListener('click', () => UI.importFileInput.click());
    UI.importFileInput.addEventListener('change', handleImport);
    if (UI.heartbeatBtn) UI.heartbeatBtn.addEventListener('click', handleHeartbeat);

    // Search
    UI.searchInput.addEventListener('input', handleSearch);
    UI.mobileSearchInput.addEventListener('input', handleSearch);

    // Tile Modal
    UI.addTileBtn.addEventListener('click', () => showTileModal());
    UI.modalCancelBtn.addEventListener('click', hideTileModal);
    UI.tileModal.addEventListener('click', (e) => { if (e.target === UI.tileModal) hideTileModal(); });
    UI.tileForm.addEventListener('submit', handleTileFormSubmit);
    UI.modalDeleteBtn.addEventListener('click', handleDeleteTile);

    // Icon Picker
    UI.openIconPickerBtn.addEventListener('click', showIconPicker);
    UI.iconPickerCloseBtn.addEventListener('click', hideIconPicker);
    UI.iconPickerModal.addEventListener('click', (e) => { if (e.target === UI.iconPickerModal) hideIconPicker(); });
    UI.iconSearchInput.addEventListener('input', handleIconSearch);

    // Group Modal
    UI.manageGroupsBtn.addEventListener('click', showGroupModal);
    UI.groupModalCloseBtn.addEventListener('click', hideGroupModal);
    UI.manageGroupsModal.addEventListener('click', (e) => { if (e.target === UI.manageGroupsModal) hideGroupModal(); });
    UI.addGroupForm.addEventListener('submit', handleAddGroup);

    // Background Modal
    UI.manageBgBtn.addEventListener('click', showBgModal);
    UI.bgModalCloseBtn.addEventListener('click', hideBgModal);
    UI.bgModal.addEventListener('click', (e) => { if (e.target === UI.bgModal) hideBgModal(); });
    UI.bgTabColor.addEventListener('click', () => switchBgTab('color'));
    UI.bgTabImage.addEventListener('click', () => switchBgTab('image'));
    UI.bgColorPicker.addEventListener('input', handleSetColorBg);
    UI.bgClearBtn.addEventListener('click', handleClearBg);
    UI.bgUploadInput.addEventListener('change', handleUploadImage);
});
