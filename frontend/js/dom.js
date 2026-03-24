// --- SELECTORS ---
            let $ = document.querySelector.bind(document);
            
            // Screens
            const authScreen = $('#auth-screen');
            const appHeader = $('#app-header');
            const mobileSearchWrapper = $('#mobile-search-wrapper');
            const groupTabBar = $('#group-tab-bar');
            const tileContainer = $('#tile-container');
            const welcomeUser = $('#welcome-user');
            const mainContent = $('#main-content'); // Added for bg color
            
            // Auth
            const authForm = $('#auth-form');
            const authTitle = $('#auth-title');
            const authError = $('#auth-error');
            const authSubmitBtn = $('#auth-submit-btn');
            const authToggleText = $('#auth-toggle-text');
            const authToggleBtn = $('#auth-toggle-btn');
            const usernameInput = $('#username');
            const passwordInput = $('#password');
            
            // Header Buttons
            const logoutBtn = $('#logout-btn');
            const addTileBtn = $('#add-tile-btn');
            const themeToggle = $('#theme-toggle');
            const bgColorPicker = $('#bg-color-picker'); // Added for bg color
            
            // Group Tab Bar
            const groupTabList = $('#group-tab-list');
            const manageGroupsBtn = $('#manage-groups-btn');
            
            // Tile Modal
            const tileModal = $('#tile-modal');
            const modalTitle = $('#modal-title');
            const modalError = $('#modal-error');
            const tileForm = $('#tile-form');
            const tileIdInput = $('#tile-id');
            const tileNameInput = $('#tile-name');
            const tileUrlInput = $('#tile-url');
            const tileIconInput = $('#tile-icon');
            const tileGroupSelect = $('#tile-group');
            const tileTypeSelect = $('#tile-type');
            const tileBorderColorInput = $('#tile-borderColor');
            const tileUseBorderCheck = $('#tile-useBorder');
            const modalCancelBtn = $('#modal-cancel-btn');
            const modalDeleteBtn = $('#modal-delete-btn');
            const modalSubmitBtn = $('#modal-submit-btn');
            
            // Icon Picker
            const openIconPickerBtn = $('#open-icon-picker-btn');
            const iconPickerModal = $('#icon-picker-modal');
            const iconPickerGrid = $('#icon-picker-grid');
            const iconSearchInput = $('#icon-search-input');
            const iconPickerCloseBtn = $('#icon-picker-close-btn');
            
            // Group Management Modal
            const manageGroupsModal = $('#manage-groups-modal');
            const groupModalError = $('#group-modal-error');
            const addGroupForm = $('#add-group-form');
            const newGroupNameInput = $('#new-group-name');
            const groupManageList = $('#group-manage-list');
            const groupModalCloseBtn = $('#group-modal-close-btn');
            
            // Search
            const searchInput = $('#search-input');
            const mobileSearchInput = $('#mobile-search-input');
            const noResultsState = $('#no-results-state');
            const noResultsTerm = $('#no-results-term');

            // Toast
            const toast = $('#toast');
            const toastMessage = $('#toast-message');