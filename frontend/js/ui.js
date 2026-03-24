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

                // 7. Fire manual ping update
                runPingCycle();
            }

            /**
             * NEW HELPER: Creates a full section for the "ALL" view
             * (e.g., a header + a grid)
             */
            function createGroupSection(name, groupId, tiles) {
                const section = document.createElement('section');
                section.className = 'group-section';
                // Pick up the dynamic background color so the border gap looks natural
                section.style.backgroundColor = 'transparent';
                
                const group = appState.groups.find(g => g.id === groupId);
                if (group && group.borderColor) {
                    section.style.borderColor = group.borderColor;
                    section.style.borderWidth = '2px';
                }
                
                const header = document.createElement('h2');
                header.className = 'group-header bg-gray-100 dark:bg-gray-900';
                // Dynamically apply background color to hide the border behind text
                const currentBg = document.documentElement.style.getPropertyValue('--bg-color') || (document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6');
                header.style.backgroundColor = currentBg;
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
                // --- CUSTOM STATS TILE ---
                if (tile.type === 'stats') {
                    const tileEl = document.createElement('div');
                    tileEl.dataset.id = tile.id;
                    
                    let colorClasses = 'bg-white/60 dark:bg-gray-800/60 hover:brightness-105'; 
                    if (tile.groupId !== null) {
                        const groupIndex = appState.groups.findIndex(g => g.id === tile.groupId);
                        if (groupIndex > -1) {
                            const colorIndex = groupIndex % categoryColors.length;
                            colorClasses = `${categoryColors[colorIndex]} hover:brightness-95`;
                        }
                    }

                    tileEl.className = `stats-tile group ${colorClasses} backdrop-blur-sm p-2 md:p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-default border border-white/40 dark:border-white/20 relative h-24 w-24 md:h-28 md:w-28`;
                    if (tile.borderColor) { tileEl.style.borderColor = tile.borderColor; tileEl.style.borderWidth = '2px'; }
                    
                    tileEl.innerHTML = `
                        <div class="text-[10px] md:text-xs font-bold text-gray-500 mb-1 w-full text-center uppercase tracking-wide truncate pointer-events-none">${tile.name}</div>
                        <div class="text-[8px] md:text-[9px] font-mono text-gray-400 mb-1 w-full text-center pointer-events-none" id="st-uptime-${tile.id}">0h</div>
                        <div class="w-full flex-1 flex flex-col justify-center gap-1 md:gap-2 pointer-events-none">
                            <div class="w-full">
                                <div class="flex justify-between text-[8px] md:text-[9px] font-bold text-gray-600 dark:text-gray-300">
                                    <span>CPU</span><span id="st-cpu-val-${tile.id}">--%</span>
                                </div>
                                <div class="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 mt-0.5 overflow-hidden">
                                    <div id="st-cpu-bar-${tile.id}" class="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="w-full">
                                <div class="flex justify-between text-[8px] md:text-[9px] font-bold text-gray-600 dark:text-gray-300">
                                    <span>RAM</span><span id="st-ram-val-${tile.id}">--%</span>
                                </div>
                                <div class="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 mt-0.5 overflow-hidden">
                                    <div id="st-ram-bar-${tile.id}" class="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    `;

                    // Add edit button logic identical to link tile
                    const editBtn = document.createElement('button');
                    editBtn.className = 'absolute top-1 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10';
                    editBtn.innerHTML = '<i class="fa-solid fa-pencil text-[10px]"></i>';
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

                const isWidget = tile.type === 'weather' || tile.type === 'calendar';
                const tileEl = document.createElement(isWidget ? 'div' : 'a');
                if (!isWidget && tile.url) {
                    tileEl.href = tile.url;
                    tileEl.target = '_blank';
                    tileEl.rel = 'noopener noreferrer';
                }
                
                // Store data on the element
                tileEl.dataset.id = tile.id;
                tileEl.dataset.name = tile.name.toLowerCase();
                tileEl.dataset.url = tile.url || '';
                tileEl.dataset.icon = tile.icon || '';
                tileEl.dataset.groupId = tile.groupId;
                
                // --- COLOR LOGIC ---
                let colorClasses = 'bg-white/60 dark:bg-gray-800/60 hover:brightness-105'; 
                if (tile.groupId !== null) {
                    const groupIndex = appState.groups.findIndex(g => g.id === tile.groupId);
                    if (groupIndex > -1) {
                        const colorIndex = groupIndex % categoryColors.length;
                        colorClasses = `${categoryColors[colorIndex]} hover:brightness-95`;
                    }
                }
                // --- END COLOR LOGIC ---
                
                // Handle image urls safely
                const safeIcon = tile.icon || '';
                const isImageURL = safeIcon.startsWith('http') || safeIcon.startsWith('/') || safeIcon.includes('.') || safeIcon.startsWith('data:image/');
                const iconHTML = isImageURL 
                    ? `<img src="${safeIcon}" class="w-8 h-8 md:w-10 md:h-10 object-contain mx-auto" alt="${tile.name} icon">`
                    : `<i class="${safeIcon} text-2xl sm:text-3xl text-gray-600 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"></i>`;
                
                // Normal Link tile (Compressed Size)
                tileEl.className = `tile-item group ${colorClasses} backdrop-blur-sm p-2 md:p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer border border-white/40 dark:border-white/20 hover:border-blue-400 relative h-24 w-24 md:h-28 md:w-28`;
                if (tile.borderColor) { tileEl.style.borderColor = tile.borderColor; tileEl.style.borderWidth = '2px'; }
                tileEl.innerHTML = `
                    ${iconHTML}
                    <span class="mt-2 h-7 md:h-8 text-[10px] md:text-xs text-center font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors break-words w-full flex items-center justify-center leading-tight pointer-events-none">${tile.name}</span>
                    <div class="heartbeat-dot absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-400 hidden pointer-events-none animate-pulse shadow-sm" id="hb-${tile.id}" title="Checking Service..."></div>
                `;
                
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
                        <div class="flex items-center flex-1 space-x-2">
                            <i class="fa-solid fa-grip-vertical drag-handle text-gray-400"></i>
                            <input type="color" class="w-8 h-8 rounded shrink-0 cursor-pointer group-color-picker" data-id="${group.id}" value="${group.borderColor || '#3b82f6'}" title="Group Border Color">
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
                groupManageList.querySelectorAll('.group-color-picker').forEach(input => {
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