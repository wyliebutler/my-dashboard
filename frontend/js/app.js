document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL APP STATE ---
    let appState = {
        username: '',
        groups: [], // Array of {id, name, position}
        tiles: [],  // Array of {id, name, url, icon, position, groupId}
        activeGroupId: null, // null = "ALL"
        currentToken: null
    };

    // SortableJS instances
    let groupTabSortable = null;
    let groupManageListSortable = null;
    let tileSortableInstance = null; // Can be a single instance or an array

    // --- CATEGORY COLORS ---
    // Subtle background colors for tiles based on their group
    const categoryColors = [
        'bg-rose-50 dark:bg-rose-950/30',
        'bg-blue-50 dark:bg-blue-950/30',
        'bg-green-50 dark:bg-green-950/30',
        'bg-yellow-50 dark:bg-yellow-950/30',
        'bg-purple-50 dark:bg-purple-950/30',
        'bg-indigo-50 dark:bg-indigo-950/30',
        'bg-pink-50 dark:bg-pink-950/30',
        'bg-teal-50 dark:bg-teal-950/30',
    ];

    // --- ICON LIST ---
    const faIconList = [
        'fa-solid fa-globe', 'fa-solid fa-server', 'fa-solid fa-database', 'fa-solid fa-code', 'fa-solid fa-code-branch',
        'fa-solid fa-terminal', 'fa-solid fa-laptop-code', 'fa-solid fa-cloud', 'fa-solid fa-upload', 'fa-solid fa-download',
        'fa-solid fa-folder', 'fa-solid fa-folder-open', 'fa-solid fa-file', 'fa-solid fa-file-code', 'fa-solid fa-file-csv',
        'fa-solid fa-file-image', 'fa-solid fa-file-pdf', 'fa-solid fa-file-video', 'fa-solid fa-file-audio', 'fa-solid fa-file-word',
        'fa-solid fa-file-excel', 'fa-solid fa-file-powerpoint', 'fa-solid fa-file-zipper', 'fa-solid fa-gamepad', 'fa-solid fa-film',
        'fa-solid fa-music', 'fa-solid fa-book', 'fa-solid fa-book-open', 'fa-solid fa-bookmark', 'fa-solid fa-camera',
        'fa-solid fa-video', 'fa-solid fa-microphone', 'fa-solid fa-headphones', 'fa-solid fa-image', 'fa-solid fa-images',
        'fa-solid fa-star', 'fa-solid fa-heart', 'fa-solid fa-thumbs-up', 'fa-solid fa-comment', 'fa-solid fa-comments',
        'fa-solid fa-user', 'fa-solid fa-users', 'fa-solid fa-house', 'fa-solid fa-building', 'fa-solid fa-store',
        'fa-solid fa-shopping-cart', 'fa-solid fa-credit-card', 'fa-solid fa-wallet', 'fa-solid fa-money-bill', 'fa-solid fa-chart-line',
        'fa-solid fa-chart-bar', 'fa-solid fa-chart-pie', 'fa-solid fa-cogs', 'fa-solid fa-cog', 'fa-solid fa-wrench',
        'fa-solid fa-tools', 'fa-solid fa-hammer', 'fa-solid fa-bolt', 'fa-solid fa-lightbulb', 'fa-solid fa-rocket',
        'fa-solid fa-plane', 'fa-solid fa-car', 'fa-solid fa-bus', 'fa-solid fa-train', 'fa-solid fa-motorcycle',
        'fa-solid fa-bicycle', 'fa-solid fa-ship', 'fa-solid fa-anchor', 'fa-solid fa-calendar', 'fa-solid fa-calendar-alt',
        'fa-solid fa-clock', 'fa-solid fa-hourglass', 'fa-solid fa-watch', 'fa-solid fa-map', 'fa-solid fa-map-marker-alt',
        'fa-solid fa-location-dot', 'fa-solid fa-flag', 'fa-solid fa-bell', 'fa-solid fa-envelope', 'fa-solid fa-phone',
        'fa-solid fa-rss', 'fa-solid fa-wifi', 'fa-solid fa-link', 'fa-solid fa-shield-halved', 'fa-solid fa-lock',
        'fa-solid fa-unlock', 'fa-solid fa-key', 'fa-solid fa-bug', 'fa-solid fa-fire', 'fa-solid fa-trophy',
        'fa-solid fa-graduation-cap', 'fa-solid fa-flask', 'fa-solid fa-brain', 'fa-solid fa-atom', 'fa-solid fa-robot',
        'fa-brands fa-docker', 'fa-brands fa-github', 'fa-brands fa-gitlab', 'fa-brands fa-youtube', 'fa-brands fa-reddit',
        'fa-brands fa-discord', 'fa-brands fa-facebook', 'fa-brands fa-twitter', 'fa-brands fa-instagram', 'fa-brands fa-linkedin',
        'fa-brands fa-plex', 'fa-brands fa-linux', 'fa-brands fa-windows', 'fa-brands fa-apple', 'fa-brands fa-android',
        'fa-brands fa-raspberry-pi', 'fa-brands fa-python', 'fa-brands fa-js', 'fa-brands fa-html5', 'fa-brands fa-css3-alt'
    ];

    // --- SELECTORS ---
    let $ = document.querySelector.bind(document);

    // Screens
    const authScreen = $('#auth-screen');
    const appHeader = $('#app-header');
    const mobileSearchWrapper = $('#mobile-search-wrapper');
    const groupTabBar = $('#group-tab-bar');
    const tileContainer = $('#tile-container');
    const welcomeUser = $('#welcome-user');
    const mainContent = $('#main-content'); // Main background element

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
    const exportBtn = $('#export-btn');
    const importBtn = $('#import-btn');
    const importFileInput = $('#import-file-input');
    const heartbeatBtn = $('#heartbeat-btn'); // NEW

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

    // --- NEW: Background Modal Selectors ---
    const manageBgBtn = $('#manage-bg-btn');
    const bgModal = $('#bg-modal');
    const bgModalCloseBtn = $('#bg-modal-close-btn');
    const bgColorPicker = $('#bg-color-picker');
    const bgClearBtn = $('#bg-clear-btn');
    const bgTabColor = $('#bg-tab-color');
    const bgTabImage = $('#bg-tab-image');
    const bgTabContentColor = $('#bg-tab-content-color');
    const bgTabContentImage = $('#bg-tab-content-image');
    const bgUploadInput = $('#bg-upload-input');
    const bgImageGrid = $('#bg-image-grid');
    const bgImageError = $('#bg-image-error');

    // Search
    const searchInput = $('#search-input');
    const mobileSearchInput = $('#mobile-search-input');
    const noResultsState = $('#no-results-state');
    const noResultsTerm = $('#no-results-term');

    // Toast
    const toast = $('#toast');
    const toastMessage = $('#toast-message');

    // --- API HELPERS ---

    /**
     * Performs a fetch request with auth and error handling
     * @param {string} endpoint - The API endpoint
     * @param {object} [options={}] - Fetch options
     */
    async function apiFetch(endpoint, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${appState.currentToken}`,
        };

        // --- MODIFIED: Handle FormData for file uploads ---
        if (options.body instanceof FormData) {
            // Let the browser set the Content-Type header
            // with the correct boundary for multipart/form-data
        } else if (options.body) {
            options.body = JSON.stringify(options.body);
            options.headers['Content-Type'] = 'application/json';
        }
        // --- END MODIFICATION ---

        const resp = await fetch(endpoint, options);

        if (resp.status === 401 || resp.status === 403) {
            handleLogout();
            throw new Error('Session expired');
        }

        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.message || 'An API error occurred');
        }

        return data;
    }

    // --- RENDER FUNCTIONS ---

    /**
     * Re-renders the entire dashboard from appState
     */
    function renderAll() {
        renderGroupTabs();
        renderTiles();     // This now handles grids AND tiles
        initGroupTabDragAndDrop();
        // initializeSortables(); // This is now called *inside* renderTiles()
    }

    /**
     * Renders the group tabs in the tab bar
     */
    function renderGroupTabs() {
        groupTabList.innerHTML = '';

        // 1. Add 'ALL' tab
        groupTabList.appendChild(
            createGroupTab('ALL', null) // 'null' now represents the "ALL" view
        );

        // 2. Add tabs for each group
        appState.groups.forEach(group => {
            groupTabList.appendChild(
                createGroupTab(group.name, group.id)
            );
        });
    }

    /**
     * Creates a single group tab element
     * @param {string} name - The group's name
     * @param {number|null} groupId - The group's ID
     */
    function createGroupTab(name, groupId) {
        const tab = document.createElement('button');
        tab.className = `group-tab flex-shrink-0 py-3 px-5 rounded-lg font-medium transition-colors`;
        tab.textContent = name;
        tab.dataset.groupId = (groupId === null ? 'null' : groupId);

        // The "ALL" tab (groupId: null) is now non-draggable
        if (groupId === null) {
            tab.classList.add('no-drag');
        }

        if (groupId === appState.activeGroupId) {
            tab.className += ' bg-blue-600 text-white';
        } else {
            tab.className += ' bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
        }

        tab.addEventListener('click', () => {
            appState.activeGroupId = groupId;
            renderGroupTabs(); // Re-render tabs to show active state
            renderTiles();     // Re-render tiles to show correct grid(s)
        });

        return tab;
    }


    /**
     * Renders tiles into their correct grids AND sets view mode
     */
    function renderTiles() {
        // 1. Clear container and all search results
        tileContainer.innerHTML = '';
        noResultsState.classList.add('hidden');

        if (appState.activeGroupId !== null) {
            // --- 2. VIEW: SINGLE GROUP (Old Behavior) ---
            // Set main container to the flex-wrap layout
            tileContainer.className = 'flex flex-wrap gap-3 md:gap-4';

            const tilesToShow = appState.tiles.filter(tile => tile.groupId === appState.activeGroupId);

            tilesToShow.forEach(tile => {
                tileContainer.appendChild(createTileElement(tile));
            });

        } else {
            // --- 3. VIEW: "ALL" (New Behavior) ---
            // Set container to a block layout for sections
            tileContainer.className = 'flex flex-col gap-6';

            // a. Create section for Uncategorized tiles
            const uncategorizedTiles = appState.tiles.filter(tile => tile.groupId === null);
            const uncategorizedSection = createGroupSection('ALL (Uncategorized)', 'null', uncategorizedTiles);
            tileContainer.appendChild(uncategorizedSection);

            // b. Create a section for each group
            appState.groups.forEach(group => {
                const groupTiles = appState.tiles.filter(tile => tile.groupId === group.id);
                const groupSection = createGroupSection(group.name, group.id, groupTiles);
                tileContainer.appendChild(groupSection);
            });
        }

        // 4. Apply search filter (will hide/show individual tiles)
        handleSearch(); // This is important to do *before* deciding grid visibility

        // 5. Force a browser reflow to prevent overlapping
        void tileContainer.offsetHeight;

        // 6. Re-initialize drag-and-drop for the new layout
        initializeSortables();
    }

    /**
     * NEW HELPER: Creates a full section for the "ALL" view
     * (e.g., a header + a grid)
     */
    function createGroupSection(name, groupId, tiles) {
        const section = document.createElement('section');
        section.className = 'group-section';

        const header = document.createElement('h2');
        header.className = 'group-header';
        header.textContent = name;
        section.appendChild(header);

        const grid = document.createElement('div');
        // This ID is crucial for SortableJS
        grid.id = `grid-${groupId}`;
        grid.className = 'flex flex-wrap gap-3 md:gap-4';

        tiles.forEach(tile => {
            grid.appendChild(createTileElement(tile));
        });

        section.appendChild(grid);
        return section;
    }


    /**
     * Creates a single tile DOM element
     * @param {Object} tile - Tile data object
     */
    function createTileElement(tile) {
        const tileEl = document.createElement('a');
        tileEl.href = tile.url;
        tileEl.target = '_blank';
        tileEl.rel = 'noopener noreferrer';

        // Store data on the element
        tileEl.dataset.id = tile.id;
        tileEl.dataset.name = tile.name.toLowerCase();
        tileEl.dataset.url = tile.url;
        tileEl.dataset.icon = tile.icon;
        tileEl.dataset.groupId = tile.groupId;

        // --- COLOR LOGIC ---
        let colorClasses = 'bg-white dark:bg-gray-800 hover:brightness-95'; // Default for "ALL (Uncategorized)"
        if (tile.groupId !== null) {
            const groupIndex = appState.groups.findIndex(g => g.id === tile.groupId);
            if (groupIndex > -1) {
                const colorIndex = groupIndex % categoryColors.length;
                colorClasses = `${categoryColors[colorIndex]} hover:brightness-95`;
            }
        }
        // --- END COLOR LOGIC ---

        // --- THIS IS THE UPDATED LINE ---
        // We removed 'border border-orange-500 border-2'
        // We added a subtle default border and a blue hover border
        tileEl.className = `tile-item group ${colorClasses} p-3 rounded-lg shadow-lg flex flex-col items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-black/10 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 h-36 w-36 relative`;

        // Status Indicator (Hidden by default)
        const statusDot = document.createElement('div');
        statusDot.className = 'status-indicator hidden';
        tileEl.appendChild(statusDot);

        tileEl.innerHTML += `
            <i class="${tile.icon} text-3xl sm:text-4xl text-gray-600 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"></i>
            <span class="h-10 text-xs sm:text-sm text-center font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors break-words w-full flex items-center justify-center">${tile.name}</span>
        `;
        // --- END OF UPDATED LINES ---

        const editBtn = document.createElement('button');
        editBtn.className = 'absolute top-2 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity';
        editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';

        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Find the full tile object from state
            const tileData = appState.tiles.find(t => t.id == tile.id);
            if (tileData) {
                showTileModal(tileData);
            }
        });

        tileEl.style.position = 'relative';
        tileEl.appendChild(editBtn);

        return tileEl;
    }

    /**
     * Populates the group management list
     */
    function renderGroupManageList() {
        groupManageList.innerHTML = '';
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

            groupManageList.appendChild(item);
        });

        // Add event listeners for new inputs/buttons
        groupManageList.querySelectorAll('.group-name-input').forEach(input => {
            input.addEventListener('change', handleRenameGroup);
        });
        groupManageList.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteGroup);
        });

        // Init drag-and-drop for the list
        initGroupManageListDragAndDrop();
    }


    // --- DRAG-AND-DROP (SortableJS) ---

    /**
     * Initializes or re-initializes drag-and-drop for all tile grids
     */
    function initializeSortables() {
        // Destroy old instances
        if (tileSortableInstance) {
            if (Array.isArray(tileSortableInstance)) {
                tileSortableInstance.forEach(s => s.destroy());
            } else {
                tileSortableInstance.destroy();
            }
            tileSortableInstance = null;
        }

        const commonSortableOptions = (groupId) => ({
            group: 'tiles', // This allows dragging between all grids
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',

            /**
             * Fires when a drag ends (reordering *within* a grid
             * or finishing a move *out* of this grid)
             */
            onEnd: async (evt) => {
                // We only save the order of the grid we came FROM
                const fromGrid = evt.from;
                const orderedIds = Array.from(fromGrid.children).map(tile => tile.dataset.id);

                // Find which groupId this grid belongs to
                const fromGroupIdStr = fromGrid.id.replace('grid-', '');
                const fromGroupId = fromGroupIdStr === 'null' ? null : Number(fromGroupIdStr);

                // Update local state first
                updateTilePositions(orderedIds, fromGroupId);

                // Send to backend
                try {
                    await apiFetch('/api/tiles/order', {
                        method: 'PUT',
                        body: { orderedIds: orderedIds.map(Number), groupId: fromGroupId }
                    });
                } catch (err) {
                    console.error('Error saving tile order:', err.message);
                    showToast('Failed to save order. Please refresh.', true);
                    await fetchDashboardData();
                    renderAll();
                }
            },

            /**
             * Fires when a tile is dropped *into* this grid from another
             */
            onAdd: async (evt) => {
                const tileEl = evt.item;
                const tileId = tileEl.dataset.id;
                const newPosition = evt.newIndex;

                // The 'groupId' is from the options of *this* instance
                const newGroupId = groupId;

                // Update local state
                const tile = appState.tiles.find(t => t.id == tileId);
                if (tile) {
                    tile.groupId = newGroupId;
                    tile.position = newPosition;
                }

                // Send API call to move
                try {
                    await apiFetch('/api/tiles/move', {
                        method: 'PUT',
                        body: {
                            tileId: Number(tileId),
                            newGroupId,
                            newPosition
                        }
                    });
                    showToast(`Moved to ${newGroupId === null ? 'Uncategorized' : 'a new group'}!`);
                } catch (err) {
                    console.error('Error moving tile:', err.message);
                    showToast('Failed to move tile. Please refresh.', true);
                    await fetchDashboardData();
                    renderAll();
                }
            }
        });


        if (appState.activeGroupId !== null) {
            // --- VIEW: SINGLE GROUP ---
            // Initialize Sortable on the main tileContainer
            // We need to give it the proper ID
            tileContainer.id = `grid-${appState.activeGroupId}`;
            tileSortableInstance = new Sortable(tileContainer, commonSortableOptions(appState.activeGroupId));

        } else {
            // --- VIEW: "ALL" ---
            // Reset container ID
            tileContainer.id = 'tile-container';
            // We must initialize Sortable on *every* grid
            const instances = [];

            // 1. Uncategorized grid
            const gridNull = document.getElementById('grid-null');
            if (gridNull) {
                instances.push(new Sortable(gridNull, commonSortableOptions(null)));
            }

            // 2. All other group grids
            appState.groups.forEach(group => {
                const gridGroup = document.getElementById(`grid-${group.id}`);
                if (gridGroup) {
                    instances.push(new Sortable(gridGroup, commonSortableOptions(group.id)));
                }
            });

            tileSortableInstance = instances; // Store as an array
        }
    }

    /**
     * Initializes drag-and-drop for the group tabs
     */
    function initGroupTabDragAndDrop() {
        if (groupTabSortable) groupTabSortable.destroy();

        groupTabSortable = new Sortable(groupTabList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.no-drag', // Make the "ALL" tab non-draggable
            // Allow dragging tiles *onto* tabs
            group: {
                name: 'groups',
                put: ['tiles'] // Only allow 'tiles' group to be put here
            },

            // Called when a TILE is dropped onto a tab
            onAdd: async (evt) => {
                const tileEl = evt.item;
                const tileId = tileEl.dataset.id;
                // Find the tab we dropped onto
                // We find the element at the drop coordinates
                const dropTarget = document.elementFromPoint(evt.originalEvent.clientX, evt.originalEvent.clientY);
                const toTabEl = dropTarget.closest('.group-tab');

                if (!toTabEl) {
                    // This shouldn't happen, but just in case
                    await fetchDashboardData();
                    renderAll();
                    return;
                }

                const newGroupIdStr = toTabEl.dataset.groupId;
                const newGroupId = newGroupIdStr === 'null' ? null : Number(newGroupIdStr);

                // Prevent dropping tile onto the "ALL" tab
                if (newGroupIdStr === 'null') {
                    showToast('Tile moved to "ALL (Uncategorized)"', false);
                } else {
                    showToast(`Moved to ${toTabEl.textContent}`);
                }

                // 1. Remove tile from its old grid in the DOM
                tileEl.remove();

                // 3. Update local state
                const tile = appState.tiles.find(t => t.id == tileId);
                if (tile) {
                    tile.groupId = newGroupId;
                }

                // We need to get the ordered IDs of the *target* group
                const targetTiles = appState.tiles.filter(t => t.groupId === newGroupId);
                // Manually add the new tile at the beginning
                targetTiles.unshift(tile);
                const orderedIds = targetTiles.map(t => t.id);

                updateTilePositions(orderedIds, newGroupId);

                // 4. Send API call to move
                try {
                    await apiFetch('/api/tiles/move', {
                        method: 'PUT',
                        body: { tileId: Number(tileId), newGroupId, newPosition: 0 } // Move to top
                    });

                    // Re-render to reflect the change
                    renderTiles();

                } catch (err) {
                    console.error('Error moving tile:', err.message);
                    showToast('Failed to move tile. Please refresh.', true);
                    await fetchDashboardData();
                    renderAll();
                }
            },

            // Called when a GROUP TAB is reordered
            onEnd: async (evt) => {
                const orderedIds = Array.from(groupTabList.children)
                    .map(tab => tab.dataset.groupId)
                    .filter(id => id !== 'null'); // Filter out 'ALL' tab

                // Update state
                appState.groups.sort((a, b) => {
                    return orderedIds.indexOf(String(a.id)) - orderedIds.indexOf(String(b.id));
                });

                try {
                    await apiFetch('/api/groups/order', {
                        method: 'PUT',
                        body: { orderedIds: orderedIds.map(Number) }
                    });
                } catch (err) {
                    console.error('Error saving group order:', err.message);
                    showToast('Failed to save group order. Please refresh.', true);
                    await fetchDashboardData();
                    renderAll();
                }
            }
        });
    }

    /**
     * Initializes drag-and-drop for the group management list
     */
    function initGroupManageListDragAndDrop() {
        if (groupManageListSortable) groupManageListSortable.destroy();

        groupManageListSortable = new Sortable(groupManageList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const orderedIds = Array.from(groupManageList.children).map(item => item.dataset.id);

                // Update state
                appState.groups.sort((a, b) => {
                    return orderedIds.indexOf(String(a.id)) - orderedIds.indexOf(String(b.id));
                });

                try {
                    await apiFetch('/api/groups/order', {
                        method: 'PUT',
                        body: { orderedIds: orderedIds.map(Number) }
                    });
                    // Re-render lists to reflect new order
                    renderGroupTabs();
                    renderGroupManageList();
                } catch (err) {
                    console.error('Error saving group order:', err.message);
                    showToast('Failed to save group order. Please refresh.', true);
                    await fetchDashboardData();
                    renderAll();
                }
            }
        });
    }

    /**
     * Helper to update local tile positions after a drag
     */
    function updateTilePositions(orderedIds, groupId) {
        orderedIds.forEach((id, index) => {
            // Find the tile *anywhere* in the state and update its position
            // This is crucial for when we move tiles between groups
            const tile = appState.tiles.find(t => t.id == id);
            if (tile) {
                tile.position = index;
                tile.groupId = groupId; // Ensure its group is also updated
            }
        });
    }

    // --- CORE APP LOGIC ---

    /**
     * Fetches all dashboard data and populates appState
     */
    async function fetchDashboardData() {
        try {
            const data = await apiFetch('/api/dashboard');
            appState.username = data.username;
            appState.groups = data.groups;
            appState.tiles = data.tiles;

            // Set active group to 'null' (ALL) if it doesn't exist anymore
            if (appState.activeGroupId !== null && !appState.groups.find(g => g.id === appState.activeGroupId)) {
                appState.activeGroupId = null;
            }

            return data;
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err.message);
            // Don't logout, just show error
            showToast('Could not load dashboard. Please refresh.', true);
        }
    }

    /**
     * Shows the main dashboard UI
     * @param {string} username - The logged-in user's username
     */
    async function showDashboard(username) {
        authScreen.classList.add('hidden');
        appHeader.classList.remove('hidden');
        mobileSearchWrapper.classList.remove('hidden');
        groupTabBar.classList.remove('hidden');

        welcomeUser.textContent = `Welcome, ${username}!`;

        await fetchDashboardData();
        renderAll(); // This will render with default activeGroupId: null (ALL)
    }

    /**
     * Logs the user out
     */
    function handleLogout() {
        appState = { groups: [], tiles: [], activeGroupId: null, currentToken: null, username: '' }; // Reset to ALL
        localStorage.removeItem('dashboard-token');
        // We keep 'dashboard-bgcolor' and 'theme' on logout for persistence

        // Destroy all sortable instances
        if (groupTabSortable) groupTabSortable.destroy();
        if (groupManageListSortable) groupManageListSortable.destroy();
        if (tileSortableInstance) {
            if (Array.isArray(tileSortableInstance)) {
                tileSortableInstance.forEach(s => s.destroy());
            } else {
                tileSortableInstance.destroy();
            }
        }

        groupTabSortable = null;
        groupManageListSortable = null;
        tileSortableInstance = null;

        // Hide main UI
        authScreen.classList.remove('hidden');
        appHeader.classList.add('hidden');
        mobileSearchWrapper.classList.add('hidden');
        groupTabBar.classList.add('hidden');
        tileContainer.innerHTML = '';
        noResultsState.classList.add('hidden');

        welcomeUser.textContent = '';
        searchInput.value = '';
        mobileSearchInput.value = '';

        resetAuthForm();
        if (isLoginMode === false) {
            toggleAuthMode();
        }

        // Reset background color to theme default on logout screen
        mainContent.style.backgroundColor = '';
        mainContent.style.backgroundImage = 'none';
        mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
    }

    /**
     * Checks for existing token on page load
     */
    async function checkTokenOnLoad() {
        // Apply theme and color *before* checking token
        initThemeToggle();
        initBackground(); // <-- MODIFIED: Renamed from initBgColor

        const token = localStorage.getItem('dashboard-token');
        if (!token) {
            authScreen.classList.remove('hidden'); // Show login
            // Set default bg color for login screen
            mainContent.style.backgroundColor = '';
            mainContent.style.backgroundImage = 'none';
            mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
            return;
        }

        try {
            // Verify token
            const resp = await fetch('/api/auth/check', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) throw new Error('Session expired');

            const data = await resp.json();
            appState.currentToken = token;
            await showDashboard(data.username);

        } catch (err) {
            console.error('Token check failed:', err.message);
            localStorage.removeItem('dashboard-token');
            authScreen.classList.remove('hidden'); // Show login
            // Set default bg color for login screen
            mainContent.style.backgroundColor = '';
            mainContent.style.backgroundImage = 'none';
            mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900');
        }
    }

    // --- TILE MODAL ---

    function showTileModal(tile = null) {
        modalError.classList.add('hidden');
        tileForm.reset();

        // Populate group select
        tileGroupSelect.innerHTML = '<option value="null">ALL (Uncategorized)</option>';
        appState.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            tileGroupSelect.appendChild(option);
        });

        if (tile) {
            // Edit Mode
            currentEditTileId = tile.id;
            modalTitle.textContent = 'Edit Tile';
            tileNameInput.value = tile.name;
            tileUrlInput.value = tile.url;
            tileIconInput.value = tile.icon;
            tileGroupSelect.value = tile.groupId === null ? 'null' : tile.groupId;
            modalDeleteBtn.classList.remove('hidden');
            modalSubmitBtn.textContent = 'Update';
        } else {
            // Add Mode
            currentEditTileId = null;
            modalTitle.textContent = 'Add New Tile';
            tileGroupSelect.value = appState.activeGroupId === null ? 'null' : appState.activeGroupId;
            modalDeleteBtn.classList.add('hidden');
            modalSubmitBtn.textContent = 'Save';
        }

        tileModal.classList.remove('hidden');
    }

    function hideTileModal() {
        tileModal.classList.add('hidden');
        currentEditTileId = null;
        modalError.classList.add('hidden');
        tileForm.reset();
    }

    async function handleTileFormSubmit(e) {
        e.preventDefault();
        modalError.classList.add('hidden');

        const tileData = {
            name: tileNameInput.value,
            url: tileUrlInput.value,
            icon: tileIconInput.value,
            groupId: tileGroupSelect.value === 'null' ? null : Number(tileGroupSelect.value)
        };

        const isEdit = !!currentEditTileId;
        const endpoint = isEdit ? `/api/tiles/${currentEditTileId}` : '/api/tiles';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            if (isEdit) {
                // On PUT, server just sends a message. We use apiFetch
                await apiFetch(endpoint, { method, body: tileData });
                // The tile already exists, we just update its properties in state
                const index = appState.tiles.findIndex(t => t.id == currentEditTileId);
                if (index > -1) {
                    // Important: merge to keep position data
                    appState.tiles[index] = { ...appState.tiles[index], ...tileData };
                }
            } else {
                // On POST, server sends back the full new tile object
                const savedTile = await apiFetch(endpoint, { method, body: tileData });
                // Add the full tile object from the server to our state
                appState.tiles.push(savedTile);
            }

            hideTileModal();
            showToast(isEdit ? 'Tile updated!' : 'Tile added!');

            // Full re-render to place tile correctly
            renderAll();

        } catch (err) {
            modalError.textContent = err.message;
            modalError.classList.remove('hidden');
        }
    }

    async function handleDeleteTile() {
        if (!currentEditTileId) return;

        if (!window.confirm('Are you sure you want to delete this tile?')) {
            return;
        }

        try {
            await apiFetch(`/api/tiles/${currentEditTileId}`, { method: 'DELETE' });

            // Remove tile from state
            appState.tiles = appState.tiles.filter(t => t.id != currentEditTileId);

            hideTileModal();
            showToast('Tile deleted!');
            renderAll(); // Re-render

        } catch (err) {
            modalError.textContent = err.message;
            modalError.classList.remove('hidden');
        }
    }

    // --- GROUP MODAL ---

    function showGroupModal() {
        groupModalError.classList.add('hidden');
        addGroupForm.reset();
        renderGroupManageList();
        manageGroupsModal.classList.remove('hidden');
    }

    function hideGroupModal() {
        manageGroupsModal.classList.add('hidden');
    }

    async function handleAddGroup(e) {
        e.preventDefault();
        groupModalError.classList.add('hidden');
        const name = newGroupNameInput.value;
        if (!name) return;

        try {
            const newGroup = await apiFetch('/api/groups', { method: 'POST', body: { name } });
            appState.groups.push(newGroup);
            // Add the new grid container to the DOM
            // createTileGrids(); // This is no longer needed
            renderGroupTabs();
            renderGroupManageList();
        } catch (err) {
            groupModalError.textContent = err.message;
            groupModalError.classList.remove('hidden');
        }
    }

    async function handleRenameGroup(e) {
        const newName = e.target.value;
        const groupId = e.target.dataset.id;

        try {
            await apiFetch(`/api/groups/${groupId}`, { method: 'PUT', body: { name: newName } });

            // Update state
            const group = appState.groups.find(g => g.id == groupId);
            if (group) group.name = newName;

            showToast('Group renamed!');
            renderGroupTabs(); // Re-render tabs with new name
        } catch (err) {
            showToast(err.message, true);
            await fetchDashboardData(); // Re-fetch to fix UI
            renderAll();
        }
    }

    async function handleDeleteGroup(e) {
        const groupId = e.currentTarget.dataset.id;

        if (!window.confirm('Are you sure you want to delete this group? All tiles in it will be moved to "ALL (Uncategorized)".')) {
            return;
        }

        try {
            await apiFetch(`/api/groups/${groupId}`, { method: 'DELETE' });

            // Remove group from state
            appState.groups = appState.groups.filter(g => g.id != groupId);

            // Update tiles in state
            appState.tiles.forEach(t => {
                if (t.groupId == groupId) {
                    t.groupId = null;
                }
            });

            // If active group was deleted, switch to ALL (null)
            if (appState.activeGroupId == groupId) {
                appState.activeGroupId = null;
            }

            showToast('Group deleted!');
            // createTileGrids(); // No longer needed
            renderAll();
            renderGroupManageList(); // Re-render modal list

        } catch (err) {
            showToast(err.message, true);
        }
    }

    // --- SEARCH ---

    function handleSearch(e) {
        // Sync search bars
        const source = e ? e.target.id : 'search-input';
        const searchTerm = source === 'search-input' ? searchInput.value : mobileSearchInput.value;

        if (source === 'search-input') {
            if (mobileSearchInput) mobileSearchInput.value = searchTerm;
        } else {
            if (searchInput) searchInput.value = searchTerm;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        let totalVisible = 0;

        // Filter all tiles in all grids
        document.querySelectorAll('.tile-item').forEach(tile => {
            const name = tile.dataset.name;
            if (name.includes(lowerSearchTerm)) {
                tile.classList.remove('hidden');
                totalVisible++; // Count all visible tiles across all grids
            } else {
                tile.classList.add('hidden');
            }
        });

        // --- MODIFIED for multi-grid "ALL" view ---
        // Show/hide no-results message
        let visibleInActiveView = 0;
        if (appState.activeGroupId === null) {
            // "ALL" view: count all visible tiles
            visibleInActiveView = totalVisible;

            // Also hide/show group headers based on search
            document.querySelectorAll('.group-section').forEach(section => {
                const visibleTilesInSection = section.querySelectorAll('.tile-item:not(.hidden)').length;
                if (visibleTilesInSection === 0) {
                    section.classList.add('hidden');
                } else {
                    section.classList.remove('hidden');
                }
            });

        } else {
            // Specific group view: count visible tiles in that grid
            const activeGrid = $(`#grid-${appState.activeGroupId}`);
            if (activeGrid) {
                visibleInActiveView = activeGrid.querySelectorAll('.tile-item:not(.hidden)').length;
            }
        }

        if (visibleInActiveView === 0 && lowerSearchTerm.length > 0) {
            noResultsTerm.textContent = searchTerm;
            noResultsState.classList.remove('hidden');
        } else {
            noResultsState.classList.add('hidden');
        }
    }

    // --- THEME ---

    function handleThemeToggle() {
        const isDark = themeToggle.checked;
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }

        // When theme toggles, re-apply background to get default colors
        initBackground();
    }

    function initThemeToggle() {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            themeToggle.checked = true;
        } else {
            themeToggle.checked = false;
        }
    }

    // --- NEW: BACKGROUND MANAGEMENT ---

    function handleSetColorBg(e) {
        const color = e.target.value;
        localStorage.setItem('dashboard-bg-type', 'color');
        localStorage.setItem('dashboard-bg-value', color);
        initBackground();
    }

    function handleSetImageBg(filename) {
        localStorage.setItem('dashboard-bg-type', 'image');
        localStorage.setItem('dashboard-bg-value', filename);
        initBackground();
        renderBgImageGrid(); // Re-render grid to show active state
    }

    function handleClearBg() {
        localStorage.removeItem('dashboard-bg-type');
        localStorage.removeItem('dashboard-bg-value');
        initBackground();
        renderBgImageGrid(); // Re-render grid to remove active state
    }

    function initBackground() {
        const bgType = localStorage.getItem('dashboard-bg-type');
        const bgValue = localStorage.getItem('dashboard-bg-value');

        // Remove default theme colors first
        mainContent.classList.remove('bg-gray-100', 'dark:bg-gray-900');

        if (bgType === 'image' && bgValue) {
            mainContent.style.backgroundImage = `url('/api/backgrounds/${bgValue}')`;
            mainContent.style.backgroundSize = 'cover';
            mainContent.style.backgroundPosition = 'center';
            mainContent.style.backgroundAttachment = 'fixed';
            mainContent.style.backgroundColor = ''; // Clear color
            bgColorPicker.value = '#ffffff'; // Reset picker
        } else if (bgType === 'color' && bgValue) {
            mainContent.style.backgroundColor = bgValue;
            mainContent.style.backgroundImage = 'none';
            bgColorPicker.value = bgValue;
        } else {
            // Default
            mainContent.style.backgroundColor = '';
            mainContent.style.backgroundImage = 'none';
            mainContent.classList.add('bg-gray-100', 'dark:bg-gray-900'); // Add default colors
            bgColorPicker.value = document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6';
        }
    }

    function showBgModal() {
        bgImageError.classList.add('hidden');
        // Set default tab
        switchBgTab('color');
        // Load images into grid
        renderBgImageGrid();
        bgModal.classList.remove('hidden');
    }

    function hideBgModal() {
        bgModal.classList.add('hidden');
    }

    function switchBgTab(tabName) {
        if (tabName === 'color') {
            bgTabColor.classList.add('active');
            bgTabImage.classList.remove('active');
            bgTabContentColor.classList.add('active');
            bgTabContentImage.classList.remove('active');
        } else {
            bgTabColor.classList.remove('active');
            bgTabImage.classList.add('active');
            bgTabContentColor.classList.remove('active');
            bgTabContentImage.classList.add('active');
        }
    }

    async function renderBgImageGrid() {
        try {
            const imageFiles = await apiFetch('/api/backgrounds');
            bgImageGrid.innerHTML = ''; // Clear old grid

            if (imageFiles.length === 0) {
                bgImageGrid.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center">No images uploaded.</p>';
                return;
            }

            const activeBgType = localStorage.getItem('dashboard-bg-type');
            const activeBgValue = localStorage.getItem('dashboard-bg-value');

            imageFiles.forEach(filename => {
                const item = document.createElement('div');
                item.className = 'bg-image-item group';
                if (activeBgType === 'image' && activeBgValue === filename) {
                    item.classList.add('active');
                }

                item.innerHTML = `
                    <img src="/api/backgrounds/${filename}" alt="Background">
                    <button class="delete-bg-btn" data-filename="${filename}">
                        <i class="fa-solid fa-trash fa-xs"></i>
                    </button>
                `;

                // Click on image to set as background
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-bg-btn')) {
                        handleSetImageBg(filename);
                    }
                });

                // Click on delete button
                item.querySelector('.delete-bg-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this image?')) {
                        try {
                            await apiFetch(`/api/backgrounds/${filename}`, { method: 'DELETE' });
                            showToast('Image deleted');
                            // If this was the active image, clear background
                            if (activeBgType === 'image' && activeBgValue === filename) {
                                handleClearBg();
                            }
                            renderBgImageGrid(); // Refresh grid
                        } catch (err) {
                            showToast(err.message, true);
                        }
                    }
                });

                bgImageGrid.appendChild(item);
            });

        } catch (err) {
            bgImageError.textContent = 'Could not load images. ' + err.message;
            bgImageError.classList.remove('hidden');
        }
    }

    // --- HEARTBEAT / HEALTH CHECK ---

    async function handleHeartbeat() {
        const tiles = document.querySelectorAll('.tile-item');
        if (tiles.length === 0) return;

        showToast('Checking service health...', false);

        // Process in parallel
        tiles.forEach(tile => {
            checkTileHealth(tile);
        });
    }

    async function checkTileHealth(tileEl) {
        const url = tileEl.dataset.url;
        // Ignore non-http links (e.g., launch://, file://)
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return;
        }

        const statusDot = tileEl.querySelector('.status-indicator');
        if (!statusDot) return;

        // 1. Show loading state
        statusDot.className = 'status-indicator status-loading';
        statusDot.classList.remove('hidden');

        try {
            // A. Try Backend Check first (Avoids CORS issues for public sites)
            const resp = await apiFetch('/api/health/check', {
                method: 'POST',
                body: { url }
            });

            if (resp.status === 'up') {
                statusDot.className = 'status-indicator status-up';
                return;
            }

            // B. If Backend reports "down", try Client-side Check
            // This handles private IPs/VPNs (like Tailscale) that the backend can't reach
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                // mode: 'no-cors' allows us to send a request to any origin.
                // We won't see the status code (it returns 'opaque'), but if it resolves,
                // it means the server is reachable. If it rejects, it's a network error.
                await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                // If we get here, the browser reached the server
                statusDot.className = 'status-indicator status-up';

            } catch (clientErr) {
                // Both checks failed
                console.warn(`Client-side check failed for ${url}:`, clientErr);
                statusDot.className = 'status-indicator status-down';
            }

        } catch (err) {
            console.error(`Health check failed for ${url}:`, err);
            statusDot.className = 'status-indicator status-down';
        }
    }

    async function handleUploadImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        bgImageError.classList.add('hidden');

        const formData = new FormData();
        formData.append('backgroundFile', file);

        try {
            const data = await apiFetch('/api/backgrounds/upload', {
                method: 'POST',
                body: formData
            });

            showToast('Image uploaded!');
            handleSetImageBg(data.filename); // Set new image as active
            renderBgImageGrid(); // Refresh grid

        } catch (err) {
            bgImageError.textContent = 'Upload failed. ' + err.message;
            bgImageError.classList.remove('hidden');
        } finally {
            // Clear file input to allow re-uploading same file
            bgUploadInput.value = null;
        }
    }

    // --- ICON PICKER ---

    function populateIconPicker(filter = '') {
        iconPickerGrid.innerHTML = '';
        const lowerFilter = filter.toLowerCase();

        faIconList
            .filter(iconClass => iconClass.includes(lowerFilter))
            .forEach(iconClass => {
                const iconBtn = document.createElement('button');
                iconBtn.type = 'button';
                iconBtn.className = 'p-3 rounded-lg flex items-center justify-center aspect-square bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white transition-all';
                iconBtn.dataset.icon = iconClass;
                iconBtn.innerHTML = `<i class="${iconClass} text-2xl"></i>`;
                iconBtn.addEventListener('click', () => {
                    tileIconInput.value = iconClass;
                    hideIconPicker();
                });
                iconPickerGrid.appendChild(iconBtn);
            });
    }

    function showIconPicker() {
        iconSearchInput.value = '';
        populateIconPicker();
        iconPickerModal.classList.remove('hidden');
        iconSearchInput.focus();
    }

    function hideIconPicker() {
        iconPickerModal.classList.add('hidden');
    }

    function handleIconSearch() {
        populateIconPicker(iconSearchInput.value);
    }


    // --- AUTH MODE TOGGLE FUNCTION ---
    let isLoginMode = true; // This is a global variable

    function toggleAuthMode() {
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            authTitle.textContent = "Login";
            authSubmitBtn.textContent = "Login";
            authToggleText.textContent = "Don't have an account?";
            authToggleBtn.textContent = "Sign Up";
        } else {
            authTitle.textContent = "Sign Up";
            authSubmitBtn.textContent = "Create Account";
            authToggleText.textContent = "Already have an account?";
            authToggleBtn.textContent = "Login";
        }

        authError.classList.add('hidden');
        authForm.reset();
    }


    // --- AUTH FORM SUBMIT HANDLER ---
    async function handleAuthSubmit(e) {
        e.preventDefault();
        authError.classList.add('hidden');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            authError.textContent = 'Please enter a username and password.';
            authError.classList.remove('hidden');
            return;
        }

        try {
            // THIS IS THE CORRECT ENDPOINT
            const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await resp.json().catch(() => ({})); // Catch empty/invalid JSON

            if (!resp.ok) {
                throw new Error(data.message || (isLoginMode ? 'Login failed' : 'Sign up failed'));
            }

            if (isLoginMode) {
                // Successful Login
                if (!data.token) throw new Error('No token received from server.');
                localStorage.setItem('dashboard-token', data.token);
                appState.currentToken = data.token;
                const name = data.username || username;
                await showDashboard(name);
                showToast('Logged in!');
            } else {
                // Successful Sign Up
                showToast('Account created! Please log in.');
                toggleAuthMode(); // Switch back to login view
            }

        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    }

    // --- AUTH FORM RESET ---
    function resetAuthForm() {
        if (authForm) authForm.reset();
        if (authError) authError.classList.add('hidden');
    }

    // --- TOAST HELPER ---
    function showToast(message, isError = false) {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message || 'Done';
        // set color
        toast.classList.remove('bg-green-500', 'bg-red-600');
        toast.classList.add(isError ? 'bg-red-600' : 'bg-green-500');
        // show
        toast.classList.remove('opacity-0', 'translate-y-3');
        toast.classList.add('opacity-100');
        // auto-hide
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-3');
        }, 2500);
    }

    // --- BACKUP/RESTORE HANDLERS ---

    async function handleExport() {
        try {
            const data = await apiFetch('/api/backup/export');

            // Create a blob from the JSON data
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Create a link to trigger the download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Format date for filename
            const date = new Date().toISOString().split('T')[0];
            a.download = `dashboard-backup-${date}.json`;

            // Trigger download and revoke URL
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('Backup exported successfully!');
        } catch (err) {
            console.error('Export failed:', err);
            showToast(err.message, true);
        }
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Confirm with the user
        if (!window.confirm('WARNING: This will overwrite all current groups and tiles. This action cannot be undone. Are you sure you want to proceed?')) {
            // Clear the file input so the same file can be selected again
            importFileInput.value = null;
            return;
        }

        // 2. Read the file
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // 3. Basic validation
                if (!data.groups || !data.tiles) {
                    throw new Error('Invalid file format. Missing "groups" or "tiles".');
                }

                // 4. Send to backend
                await apiFetch('/api/backup/import', {
                    method: 'POST',
                    body: data
                });

                showToast('Import successful! Reloading dashboard...');

                // 5. Refresh the dashboard
                await fetchDashboardData();
                renderAll();

            } catch (err) {
                console.error('Import failed:', err);
                showToast(err.message, true);
            } finally {
                // Clear the file input value
                importFileInput.value = null;
            }
        };

        reader.onerror = () => {
            showToast('Error reading file.', true);
            importFileInput.value = null;
        };

        reader.readAsText(file);
    }

    // --- EVENT LISTENERS (AUTH) ---
    authToggleBtn.addEventListener('click', toggleAuthMode);
    authForm.addEventListener('submit', handleAuthSubmit);
    logoutBtn.addEventListener('click', handleLogout);
    themeToggle.addEventListener('change', handleThemeToggle);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => importFileInput.click()); // Trigger hidden file input
    importFileInput.addEventListener('change', handleImport);
    importBtn.addEventListener('click', () => importFileInput.click()); // Trigger hidden file input
    importFileInput.addEventListener('change', handleImport);
    if (heartbeatBtn) {
        heartbeatBtn.addEventListener('click', handleHeartbeat); // NEW
    } else {
        console.warn('Heartbeat button not found in DOM');
    }

    // --- EVENT LISTENERS (TILE MODAL) ---
    addTileBtn.addEventListener('click', () => showTileModal());
    modalCancelBtn.addEventListener('click', hideTileModal);
    tileModal.addEventListener('click', (e) => {
        if (e.target === tileModal) hideTileModal();
    });
    tileForm.addEventListener('submit', handleTileFormSubmit);
    modalDeleteBtn.addEventListener('click', handleDeleteTile);

    // --- EVENT LISTENERS (ICON PICKER) ---
    openIconPickerBtn.addEventListener('click', showIconPicker);
    iconPickerCloseBtn.addEventListener('click', hideIconPicker);
    iconPickerModal.addEventListener('click', (e) => {
        if (e.target === iconPickerModal) hideIconPicker();
    });
    iconSearchInput.addEventListener('input', handleIconSearch);

    // --- EVENT LISTENERS (GROUP MODAL) ---
    manageGroupsBtn.addEventListener('click', showGroupModal);
    groupModalCloseBtn.addEventListener('click', hideGroupModal);
    manageGroupsModal.addEventListener('click', (e) => {
        if (e.target === manageGroupsModal) hideGroupModal();
    });
    addGroupForm.addEventListener('submit', handleAddGroup);

    // --- EVENT LISTENERS (SEARCH) ---
    searchInput.addEventListener('input', handleSearch);
    mobileSearchInput.addEventListener('input', handleSearch);

    // --- NEW: EVENT LISTENERS (BACKGROUND MODAL) ---
    manageBgBtn.addEventListener('click', showBgModal);
    bgModalCloseBtn.addEventListener('click', hideBgModal);
    bgModal.addEventListener('click', (e) => {
        if (e.target === bgModal) hideBgModal();
    });
    bgTabColor.addEventListener('click', () => switchBgTab('color'));
    bgTabImage.addEventListener('click', () => switchBgTab('image'));
    bgColorPicker.addEventListener('input', handleSetColorBg); // 'input' for live preview
    bgClearBtn.addEventListener('click', handleClearBg);
    bgUploadInput.addEventListener('change', handleUploadImage);


    // --- INITIALIZATION ---
    checkTokenOnLoad(); // This now calls initThemeToggle and initBackground
});
