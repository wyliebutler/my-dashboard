import { appState } from './state.js';
import * as API from './api.js';
import { renderAll, renderTiles, renderGroupTabs, renderGroupManageList, showToast, fetchDashboardData } from './ui.js';

// SortableJS instances
let groupTabSortable = null;
let groupManageListSortable = null;
let tileSortableInstance = null;

export function initializeSortables() {
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

        onEnd: async (evt) => {
            const fromGrid = evt.from;
            const orderedIds = Array.from(fromGrid.children).map(tile => tile.dataset.id);
            const fromGroupIdStr = fromGrid.id.replace('grid-', '');
            const fromGroupId = fromGroupIdStr === 'null' ? null : Number(fromGroupIdStr);

            updateTilePositions(orderedIds, fromGroupId);

            try {
                await API.saveTileOrder(orderedIds.map(Number), fromGroupId);
            } catch (err) {
                console.error('Error saving tile order:', err.message);
                showToast('Failed to save order. Please refresh.', true);
                await fetchDashboardData();
                renderAll();
            }
        },

        onAdd: async (evt) => {
            const tileEl = evt.item;
            const tileId = tileEl.dataset.id;
            const newPosition = evt.newIndex;
            const newGroupId = groupId;

            const tile = appState.tiles.find(t => t.id == tileId);
            if (tile) {
                tile.groupId = newGroupId;
                tile.position = newPosition;
            }

            try {
                await API.moveTile(Number(tileId), newGroupId, newPosition);
                showToast(`Moved to ${newGroupId === null ? 'Uncategorized' : 'a new group'}!`);
            } catch (err) {
                console.error('Error moving tile:', err.message);
                showToast('Failed to move tile. Please refresh.', true);
                await fetchDashboardData();
                renderAll();
            }
        }
    });

    const tileContainer = document.getElementById('tile-container');

    if (appState.activeGroupId !== null) {
        tileContainer.id = `grid-${appState.activeGroupId}`;
        tileSortableInstance = new Sortable(tileContainer, commonSortableOptions(appState.activeGroupId));
    } else {
        tileContainer.id = 'tile-container';
        const instances = [];
        const gridNull = document.getElementById('grid-null');
        if (gridNull) instances.push(new Sortable(gridNull, commonSortableOptions(null)));

        appState.groups.forEach(group => {
            const gridGroup = document.getElementById(`grid-${group.id}`);
            if (gridGroup) instances.push(new Sortable(gridGroup, commonSortableOptions(group.id)));
        });

        tileSortableInstance = instances;
    }
}

export function initGroupTabDragAndDrop() {
    if (groupTabSortable) groupTabSortable.destroy();
    const groupTabList = document.getElementById('group-tab-list');

    groupTabSortable = new Sortable(groupTabList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        filter: '.no-drag',
        group: {
            name: 'groups',
            put: ['tiles']
        },

        onAdd: async (evt) => {
            const tileEl = evt.item;
            const tileId = tileEl.dataset.id;
            const dropTarget = document.elementFromPoint(evt.originalEvent.clientX, evt.originalEvent.clientY);
            const toTabEl = dropTarget.closest('.group-tab');

            if (!toTabEl) {
                await fetchDashboardData();
                renderAll();
                return;
            }

            const newGroupIdStr = toTabEl.dataset.groupId;
            const newGroupId = newGroupIdStr === 'null' ? null : Number(newGroupIdStr);

            if (newGroupIdStr === 'null') {
                showToast('Tile moved to "ALL (Uncategorized)"', false);
            } else {
                showToast(`Moved to ${toTabEl.textContent}`);
            }

            tileEl.remove();

            const tile = appState.tiles.find(t => t.id == tileId);
            if (tile) tile.groupId = newGroupId;

            const targetTiles = appState.tiles.filter(t => t.groupId === newGroupId);
            targetTiles.unshift(tile);
            const orderedIds = targetTiles.map(t => t.id);

            updateTilePositions(orderedIds, newGroupId);

            try {
                await API.moveTile(Number(tileId), newGroupId, 0);
                renderTiles();
            } catch (err) {
                console.error('Error moving tile:', err.message);
                showToast('Failed to move tile. Please refresh.', true);
                await fetchDashboardData();
                renderAll();
            }
        },

        onEnd: async (evt) => {
            const orderedIds = Array.from(groupTabList.children)
                .map(tab => tab.dataset.groupId)
                .filter(id => id !== 'null');

            appState.groups.sort((a, b) => {
                return orderedIds.indexOf(String(a.id)) - orderedIds.indexOf(String(b.id));
            });

            try {
                await API.saveGroupOrder(orderedIds.map(Number));
            } catch (err) {
                console.error('Error saving group order:', err.message);
                showToast('Failed to save group order. Please refresh.', true);
                await fetchDashboardData();
                renderAll();
            }
        }
    });
}

export function initGroupManageListDragAndDrop() {
    if (groupManageListSortable) groupManageListSortable.destroy();
    const groupManageList = document.getElementById('group-manage-list');

    groupManageListSortable = new Sortable(groupManageList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: async (evt) => {
            const orderedIds = Array.from(groupManageList.children).map(item => item.dataset.id);
            appState.groups.sort((a, b) => {
                return orderedIds.indexOf(String(a.id)) - orderedIds.indexOf(String(b.id));
            });

            try {
                await API.saveGroupOrder(orderedIds.map(Number));
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

function updateTilePositions(orderedIds, groupId) {
    orderedIds.forEach((id, index) => {
        const tile = appState.tiles.find(t => t.id == id);
        if (tile) {
            tile.position = index;
            tile.groupId = groupId;
        }
    });
}

export function destroySortables() {
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
}
