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
                    appState.todos = typeof data.todos === 'string' ? JSON.parse(data.todos || '[]') : (data.todos || []);
                    
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
                
                document.getElementById('top-widgets-row').classList.remove('hidden');
                document.getElementById('top-widgets-row').classList.add('grid');
                initStaticWidgets();
                
                fetchAndRenderRSS();
                // Set a lightweight 2-minute polling interval to keep headlines fresh
                setInterval(fetchAndRenderRSS, 120000);
            }

            /**
             * Logs the user out
             */
            function handleLogout() {
                appState = { groups: [], tiles: [], activeGroupId: null, currentToken: null, username: '' }; // Reset to ALL
                localStorage.removeItem('dashboard-token');
                // We keep 'dashboard-bgcolor' and 'theme' on logout for persistence
                
                document.getElementById('top-widgets-row').classList.add('hidden');
                document.getElementById('top-widgets-row').classList.remove('grid');
                
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
            }

            // --- STATIC WIDGETS ---
            let tickerInterval;
            async function fetchTickerData() {
                try {
                    const [sysRes, tickRes] = await Promise.all([
                        fetch('/api/system/stats'),
                        fetch('/api/ticker')
                    ]);
                    const sys = await sysRes.json();
                    let tick = null;
                    if (tickRes.ok) {
                        tick = await tickRes.json();
                    }

                    let html = '';

                    // Add Ticker Stats
                    if (tick && tick.items) {
                        tick.items.forEach(item => {
                            const isPos = item.change >= 0;
                            const sign = isPos ? '+' : '';
                            const colorClass = isPos ? 'positive' : 'negative';
                            const icon = isPos ? 'fa-caret-up' : 'fa-caret-down';
                            html += `
                                <span class="ticker-item">
                                    <span class="ticker-label">${item.name}</span>
                                    <span class="ticker-value">$${item.price.toFixed(2)}${item.currency ? ' ' + item.currency : ''}</span>
                                    <span class="ticker-change ${colorClass}">
                                        <i class="fa-solid ${icon} mr-1"></i>${sign}${item.change.toFixed(2)} (${sign}${item.percentChange.toFixed(2)}%)
                                    </span>
                                </span>
                            `;
                        });
                    }

                    const tickerContent = document.getElementById('unified-ticker-content');
                    if (tickerContent && html) {
                        // Repeat enough times to fill standard 4k screens fully for smooth CSS translation
                        tickerContent.innerHTML = html.repeat(6); 
                    }
                } catch (err) {
                    console.error('Ticker fetch error:', err);
                }
            }

            function initTicker() {
                fetchTickerData();
                if (tickerInterval) clearInterval(tickerInterval);
                tickerInterval = setInterval(fetchTickerData, 60000); // refresh every minute
            }

            let statsTileInterval;
            async function updateStatsTiles() {
                const statTiles = document.querySelectorAll('.stats-tile');
                if (statTiles.length === 0) return; // Skip fetch if no stats tiles exist

                try {
                    const res = await fetch('/api/system/stats');
                    if (!res.ok) return;
                    const sys = await res.json();
                    
                    statTiles.forEach(tileEl => {
                        const tid = tileEl.dataset.id;
                        const cpuVal = document.getElementById(`st-cpu-val-${tid}`);
                        const cpuBar = document.getElementById(`st-cpu-bar-${tid}`);
                        const ramVal = document.getElementById(`st-ram-val-${tid}`);
                        const ramBar = document.getElementById(`st-ram-bar-${tid}`);
                        const uptime = document.getElementById(`st-uptime-${tid}`);
                        
                        if (cpuVal) cpuVal.textContent = `${sys.cpu}%`;
                        if (cpuBar) cpuBar.style.width = `${sys.cpu}%`;
                        if (ramVal) ramVal.textContent = `${sys.mem}%`;
                        if (ramBar) ramBar.style.width = `${sys.mem}%`;
                        if (uptime) uptime.textContent = `${Math.floor(sys.uptime / 3600)}h uptime`;
                    });
                } catch (err) {
                    console.error('Stats Tile update err:', err);
                }
            }

            function initStatsTilePolling() {
                updateStatsTiles(); // run immediately
                if (statsTileInterval) clearInterval(statsTileInterval);
                statsTileInterval = setInterval(updateStatsTiles, 5000); // 5 seconds
            }

            function initStaticWidgets() {
                initTicker();
                initStatsTilePolling();
                initCalendarWidget();
                
                // Initialize the 1 unified weather module
                const wContainer = document.getElementById('weather-row-container');
                wContainer.innerHTML = ''; // Clear existing
                initWeatherWidget(1, wContainer, 'London, UK');
                
                initTodoWidget();
            }

            function initCalendarWidget() {
                const monthEl = document.getElementById('static-month');
                const gridEl = document.getElementById('static-cal-grid');
                const prevBtn = document.getElementById('cal-prev');
                const nextBtn = document.getElementById('cal-next');
                
                let viewDate = new Date();
                viewDate.setDate(1); // Force to 1st of month to avoid overflow bugs

                const renderCalendar = async () => {
                    const today = new Date();
                    monthEl.textContent = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    const year = viewDate.getFullYear();
                    const month = viewDate.getMonth();
                    
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    
                    // Fetch events from backend
                    let monthEvents = [];
                    try {
                        gridEl.style.opacity = '0.5'; // Visual loading state
                        monthEvents = await window.apiFetch('/api/calendar/events');
                    } catch (err) {
                        console.error('Failed to fetch calendar events:', err);
                    } finally {
                        gridEl.style.opacity = '1';
                    }
                    
                    // Generate a map of day -> ['work', 'personal'] dots
                    const eventMap = {};
                    if (Array.isArray(monthEvents)) {
                        monthEvents.forEach(ev => {
                            const evDate = new Date(ev.date);
                            if (evDate.getFullYear() === year && evDate.getMonth() === month) {
                                const d = evDate.getDate();
                                if (!eventMap[d]) eventMap[d] = [];
                                const timeStr = evDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                eventMap[d].push({ type: ev.type, title: ev.title, time: timeStr });
                            }
                        });
                    }

                    gridEl.innerHTML = '';
                    
                    // Pad empty days at start
                    for (let i = 0; i < firstDay; i++) {
                        gridEl.innerHTML += `<div></div>`;
                    }
                    
                    // Fill calendar days
                    for (let d = 1; d <= daysInMonth; d++) {
                        const isToday = (d === today.getDate() && month === today.getMonth() && year === today.getFullYear());
                        const baseClasses = 'h-5 sm:h-6 md:h-8 flex flex-col items-center justify-center rounded transition-colors relative cursor-default cursor-pointer';
                        const activeClasses = isToday ? 'bg-blue-500 text-white font-bold shadow' : 'hover:bg-black/5 dark:hover:bg-white/5';
                        
                        let dotHTML = '';
                        let tooltipText = '';
                        if (eventMap[d] && eventMap[d].length > 0) {
                            const hasWork = eventMap[d].some(e => e.type === 'work');
                            const hasPersonal = eventMap[d].some(e => e.type === 'personal');
                            tooltipText = eventMap[d].map(e => `${e.type === 'work' ? '[Work] ' : '[Pers] '}${e.time} - ${e.title}`).join('&#10;');
                            
                            dotHTML = `<div class="flex space-x-[2px] absolute bottom-0.5 md:bottom-1">`;
                            if (hasWork) dotHTML += `<div class="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-400 shadow-sm"></div>`;
                            if (hasPersonal) dotHTML += `<div class="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-400 shadow-sm"></div>`;
                            dotHTML += `</div>`;
                        }

                        gridEl.innerHTML += `<div class="${baseClasses} ${activeClasses}" ${tooltipText ? `title="${tooltipText}"` : ''}>
                            <span class="z-10">${d}</span>
                            ${dotHTML}
                        </div>`;
                    }
                };

                // Navigation Handlers
                const newPrev = prevBtn.cloneNode(true);
                prevBtn.parentNode.replaceChild(newPrev, prevBtn);
                const newNext = nextBtn.cloneNode(true);
                nextBtn.parentNode.replaceChild(newNext, nextBtn);

                newPrev.addEventListener('click', () => {
                    viewDate.setMonth(viewDate.getMonth() - 1);
                    renderCalendar();
                });
                newNext.addEventListener('click', () => {
                    viewDate.setMonth(viewDate.getMonth() + 1);
                    renderCalendar();
                });

                // Settings Modal Logic
                const configBtn = document.getElementById('cal-config');
                const modal = document.getElementById('cal-settings-modal');
                const closeBtn = document.getElementById('close-cal-settings');
                const form = document.getElementById('cal-settings-form');
                const workInput = document.getElementById('work-cal-url');
                const personalInput = document.getElementById('personal-cal-url');
                const btnSpinner = document.getElementById('cal-spinner');

                const showModal = () => {
                    modal.classList.remove('hidden');
                    setTimeout(() => {
                        modal.classList.remove('opacity-0');
                        modal.querySelector('.transform').classList.remove('scale-95');
                    }, 10);
                };

                const hideModal = () => {
                    modal.classList.add('opacity-0');
                    modal.querySelector('.transform').classList.add('scale-95');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                };

                if (configBtn) configBtn.addEventListener('click', showModal);
                if (closeBtn) closeBtn.addEventListener('click', hideModal);
                
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        btnSpinner.classList.remove('hidden');
                        
                        try {
                            await window.apiFetch('/api/calendar/urls', {
                                method: 'POST',
                                body: {
                                    workUrl: workInput.value.trim(),
                                    personalUrl: personalInput.value.trim()
                                }
                            });
                            hideModal();
                            renderCalendar();
                        } catch (err) {
                            document.getElementById('cal-modal-error').textContent = err.message || 'Failed to save.';
                            document.getElementById('cal-modal-error').classList.remove('hidden');
                        } finally {
                            btnSpinner.classList.add('hidden');
                        }
                    });
                }

                renderCalendar();
            }

            function initWeatherWidget(widgetId, containerEl, defaultCity) {
                // Generate the HTML Shell for this specific widget instance
                const widgetHTML = `
                    <div class="bg-indigo-50 dark:bg-indigo-950/30 p-2 sm:p-3 rounded-xl shadow flex flex-col relative border border-black/10 dark:border-white/10 group h-full">
                        <div class="flex items-center justify-between text-gray-500 text-[10px] md:text-xs uppercase font-bold tracking-widest mb-1 pointer-events-none">
                            <span>Forecast</span>
                            <div class="flex space-x-2 pointer-events-auto">
                                <button id="w-config-btn-${widgetId}" class="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Configure Location text-sm md:text-base">
                                    <i class="fa-solid fa-gear"></i>
                                </button>
                                <i class="fa-solid fa-cloud-sun text-gray-400 text-sm md:text-base"></i>
                            </div>
                        </div>
                        
                        <!-- Display Mode -->
                        <div id="w-display-${widgetId}" class="flex flex-col items-center justify-center flex-1 w-full">
                            <div id="w-temp-${widgetId}" class="text-3xl font-light text-gray-800 dark:text-white">--°</div>
                            <div id="w-desc-${widgetId}" class="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center px-1 h-6 flex items-center justify-center leading-tight">Loading...</div>
                            <div id="w-loc-${widgetId}" class="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 truncate w-full text-center px-2">Select City</div>
                            
                            <!-- 3 Day Forecast Grid -->
                            <div class="grid grid-cols-3 w-full gap-1 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                                <div class="flex flex-col items-center justify-center text-center">
                                    <span class="text-[8px] text-gray-400 uppercase font-bold truncate w-full" id="w-d1-lbl-${widgetId}">TOM</span>
                                    <i id="w-d1-ico-${widgetId}" class="fa-solid fa-temperature-half text-gray-300 text-[10px] my-0.5"></i>
                                    <span class="text-[9px] font-bold text-gray-700 dark:text-gray-300" id="w-d1-tmp-${widgetId}">--°</span>
                                    <span class="text-[8px] text-blue-400" id="w-d1-pre-${widgetId}">0%<i class="fa-solid fa-droplet text-[8px] ml-0.5"></i></span>
                                </div>
                                <div class="flex flex-col items-center justify-center text-center border-l border-r border-black/10 dark:border-white/10 px-1">
                                    <span class="text-[8px] text-gray-400 uppercase font-bold truncate w-full" id="w-d2-lbl-${widgetId}">XYZ</span>
                                    <i id="w-d2-ico-${widgetId}" class="fa-solid fa-temperature-half text-gray-300 text-[10px] my-0.5"></i>
                                    <span class="text-[9px] font-bold text-gray-700 dark:text-gray-300" id="w-d2-tmp-${widgetId}">--°</span>
                                    <span class="text-[8px] text-blue-400" id="w-d2-pre-${widgetId}">0%<i class="fa-solid fa-droplet text-[8px] ml-0.5"></i></span>
                                </div>
                                <div class="flex flex-col items-center justify-center text-center">
                                    <span class="text-[8px] text-gray-400 uppercase font-bold truncate w-full" id="w-d3-lbl-${widgetId}">ABC</span>
                                    <i id="w-d3-ico-${widgetId}" class="fa-solid fa-temperature-half text-gray-300 text-[10px] my-0.5"></i>
                                    <span class="text-[9px] font-bold text-gray-700 dark:text-gray-300" id="w-d3-tmp-${widgetId}">--°</span>
                                    <span class="text-[8px] text-blue-400" id="w-d3-pre-${widgetId}">0%<i class="fa-solid fa-droplet text-[8px] ml-0.5"></i></span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Config Mode -->
                        <div id="w-config-${widgetId}" class="hidden flex-col items-center justify-center flex-1 w-full space-y-2 mt-2">
                            <label class="text-xs font-bold text-gray-500 text-left w-full">Search City:</label>
                            <input type="text" id="w-input-${widgetId}" class="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. New York, London...">
                            <button id="w-save-${widgetId}" class="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2 rounded transition-colors mt-2">Search &amp; Save</button>
                        </div>
                    </div>
                `;
                
                const wrapper = document.createElement('div');
                wrapper.innerHTML = widgetHTML;
                containerEl.appendChild(wrapper.firstElementChild);

                const displayEl = document.getElementById(`w-display-${widgetId}`);
                const configEl = document.getElementById(`w-config-${widgetId}`);
                const configBtn = document.getElementById(`w-config-btn-${widgetId}`);
                const saveBtn = document.getElementById(`w-save-${widgetId}`);
                const inputEl = document.getElementById(`w-input-${widgetId}`);
                
                // Get cached city configuration for this region
                const lsKey = `dashboard-weather-city-${widgetId}`;
                const lsLatKey = `dashboard-weather-lat-${widgetId}`;
                const lsLonKey = `dashboard-weather-lon-${widgetId}`;
                
                let city = localStorage.getItem(lsKey) || defaultCity;
                let lat = localStorage.getItem(lsLatKey);
                let lon = localStorage.getItem(lsLonKey);
                
                // Helper to get formatted short Day name (e.g. MON)
                const getDayLabel = (dateStr) => {
                    const d = new Date(dateStr + 'T12:00:00Z'); // Append noon to avoid timezone shift
                    return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                };

                // Helper to map WMO code to FA icon class
                const getWmoIcon = (code) => {
                    if (code <= 3) return 'fa-cloud-sun text-yellow-500';
                    if (code <= 48) return 'fa-cloud text-gray-400';
                    if (code <= 67) return 'fa-cloud-rain text-blue-400';
                    if (code <= 77) return 'fa-snowflake text-blue-200';
                    if (code <= 82) return 'fa-cloud-showers-heavy text-blue-500';
                    if (code <= 86) return 'fa-snowflake text-blue-300';
                    if (code >= 95) return 'fa-bolt text-yellow-400';
                    return 'fa-cloud text-gray-400';
                };

                const executeWeatherFetch = () => {
                    if (!lat || !lon) return;

                    document.getElementById(`w-temp-${widgetId}`).textContent = '--°';
                    document.getElementById(`w-desc-${widgetId}`).textContent = 'Loading...';
                    document.getElementById(`w-loc-${widgetId}`).textContent = city;

                    // Fetch Current AND Daily (3-day) exactly using Environment Canada's official GEM engine
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=4&models=gem_seamless`;
                    
                    fetch(url)
                        .then(res => res.json())
                        .then(data => {
                            const c = data.current;
                            const d = data.daily;
                            
                            // Map Current Data
                            document.getElementById(`w-temp-${widgetId}`).textContent = `${Math.round(c.temperature_2m)}°`;
                            document.getElementById(`w-desc-${widgetId}`).textContent = `Wind: ${c.wind_speed_10m} km/h`;
                            
                            // Map 3 Tiny Columns (Using indexes 1, 2, 3 to skip "Today(0)")
                            for(let i=1; i<=3; i++) {
                                document.getElementById(`w-d${i}-lbl-${widgetId}`).textContent = i===1 ? 'TOM' : getDayLabel(d.time[i]);
                                document.getElementById(`w-d${i}-tmp-${widgetId}`).textContent = `${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°`;
                                document.getElementById(`w-d${i}-pre-${widgetId}`).innerHTML = `${Math.round(d.precipitation_probability_max[i])}%<i class="fa-solid fa-droplet text-[8px] ml-0.5"></i>`;
                                document.getElementById(`w-d${i}-ico-${widgetId}`).className = `fa-solid ${getWmoIcon(d.weather_code[i])} text-xs my-1`;
                            }
                        })
                        .catch(err => {
                            document.getElementById(`w-temp-${widgetId}`).textContent = 'Err';
                            document.getElementById(`w-desc-${widgetId}`).textContent = 'API Blocked/Failed';
                        });
                };

                const resolveCityAndFetch = (targetCity) => {
                    document.getElementById(`w-desc-${widgetId}`).textContent = 'Geocoding...';
                    
                    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(targetCity)}&format=json&limit=1`)
                        .then(res => res.json())
                        .then(geo => {
                            if (!geo || geo.length === 0) {
                                document.getElementById(`w-desc-${widgetId}`).textContent = 'City Not Found';
                                return;
                            }
                            
                            let hit = geo[0];
                            
                            city = hit.name || hit.display_name.split(',')[0];
                            lat = hit.lat;
                            lon = hit.lon;
                            
                            // Save perfectly resolved data
                            localStorage.setItem(lsKey, city);
                            localStorage.setItem(lsLatKey, lat);
                            localStorage.setItem(lsLonKey, lon);
                            
                            executeWeatherFetch();
                        })
                        .catch(() => {
                            document.getElementById(`w-desc-${widgetId}`).textContent = 'Geocode Error';
                        });
                };

                // Initialization behavior
                if (lat && lon) {
                    executeWeatherFetch();
                } else {
                    resolveCityAndFetch(city);
                }

                // Bind UI Actions
                configBtn.addEventListener('click', () => {
                    inputEl.value = city;
                    displayEl.classList.add('hidden');
                    configEl.classList.remove('hidden');
                    configEl.classList.add('flex');
                    inputEl.focus();
                });

                saveBtn.addEventListener('click', () => {
                    const newCity = inputEl.value.trim();
                    if (!newCity) return;
                    
                    configEl.classList.add('hidden');
                    configEl.classList.remove('flex');
                    displayEl.classList.remove('hidden');
                    
                    document.getElementById(`w-temp-${widgetId}`).textContent = '--°';
                    document.getElementById(`w-loc-${widgetId}`).textContent = 'Searching...';
                    
                    resolveCityAndFetch(newCity);
                });
            }

            function initTodoWidget() {
                const todoList = document.getElementById('todo-list');
                const todoForm = document.getElementById('todo-form');
                const todoInput = document.getElementById('todo-input');
                
                // One-time migration strategy: trust local storage if server is empty, but only once!
                let todos = appState.todos || [];
                if (!localStorage.getItem('dashboard-todos-migrated')) {
                    let localTodos = JSON.parse(localStorage.getItem('dashboard-todos') || '[]');
                    if (todos.length === 0 && localTodos.length > 0) {
                        todos = localTodos;
                        if (appState.currentToken) {
                            apiFetch('/api/todos', { method: 'PUT', body: { todos: todos } }).catch(e => console.error(e));
                        }
                    }
                    localStorage.setItem('dashboard-todos-migrated', 'true');
                }
                
                const renderTodos = () => {
                    todoList.innerHTML = '';
                    if (todos.length === 0) {
                        todoList.innerHTML = '<li class="text-xs text-gray-400 text-center italic mt-4">All caught up!</li>';
                        return;
                    }
                    todos.forEach((todo, index) => {
                        const li = document.createElement('li');
                        li.className = 'flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors group';
                        
                        const labelWrap = document.createElement('label');
                        labelWrap.className = 'flex items-center space-x-2 cursor-pointer flex-1 overflow-hidden pr-2';
                        
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.className = 'rounded text-orange-500 focus:ring-orange-500 shrink-0';
                        cb.checked = todo.done;
                        
                        const text = document.createElement('span');
                        text.textContent = todo.text;
                        text.className = `truncate ${todo.done ? 'line-through opacity-50' : ''}`;
                        
                        cb.addEventListener('change', () => {
                            todos[index].done = cb.checked;
                            saveTodos();
                            renderTodos();
                        });
                        
                        const delBtn = document.createElement('button');
                        delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                        delBtn.className = 'text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0';
                        delBtn.addEventListener('click', () => {
                            todos.splice(index, 1);
                            saveTodos();
                            renderTodos();
                        });
                        
                        labelWrap.appendChild(cb);
                        labelWrap.appendChild(text);
                        li.appendChild(labelWrap);
                        li.appendChild(delBtn);
                        todoList.appendChild(li);
                    });
                };
                
                const saveTodos = () => {
                    localStorage.setItem('dashboard-todos', JSON.stringify(todos));
                    appState.todos = todos; // keep state in sync
                    // Save to server asynchronously
                    apiFetch('/api/todos', { method: 'PUT', body: { todos: todos } }).catch(err => {
                        console.error('Failed to save todos to server:', err);
                    });
                };
                
                // Replace clone to prevent listener duplication
                const newTodoForm = todoForm.cloneNode(true);
                todoForm.parentNode.replaceChild(newTodoForm, todoForm);
                const newTodoInput = document.getElementById('todo-input'); // Re-query after clone
                
                newTodoForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const text = newTodoInput.value.trim();
                    if (!text) return;
                    todos.push({ text, done: false });
                    saveTodos();
                    newTodoInput.value = '';
                    renderTodos();
                    
                    // Scroll to bottom
                    setTimeout(() => {
                        document.getElementById('todo-list').scrollTop = document.getElementById('todo-list').scrollHeight;
                    }, 10);
                });
                
                renderTodos();
            }

            async function fetchAndRenderRSS() {
                const list = document.getElementById('rss-news-list');
                if (!list) return;
                
                try {
                    const rssArray = await apiFetch('/api/rss');
                    if (rssArray && rssArray.length > 0) {
                        list.innerHTML = '';
                        rssArray.forEach(item => {
                            let sourceColor = 'text-gray-500';
                            if (item.source === 'VOCM') sourceColor = 'text-yellow-500 dark:text-yellow-400';
                            else if (item.source === 'BBC') sourceColor = 'text-red-600 dark:text-red-500';
                            else if (item.source === 'CBC') sourceColor = 'text-blue-600 dark:text-blue-400';
                            else if (item.source === 'TechCrunch') sourceColor = 'text-green-600 dark:text-green-500';

                            const li = document.createElement('li');
                            li.className = 'flex items-start w-full relative mb-1 leading-snug';
                            li.innerHTML = `
                                <span class="font-bold text-[9px] mr-1 shrink-0 mt-0.5 ${sourceColor}">[${item.source}]</span>
                                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="truncate hover:text-blue-500 hover:underline dark:text-gray-300 text-gray-700 block w-full whitespace-nowrap overflow-hidden text-ellipsis">${item.title}</a>
                            `;
                            list.appendChild(li);
                        });
                    }
                } catch (err) {
                    console.error('Failed to load RSS feed list:', err);
                    if (list.innerHTML.includes('Loading')) {
                        list.innerHTML = '<li class="text-center text-red-500/80 text-[10px] mt-2">Feed Error</li>';
                    }
                }
            }
            
            /**
             * Checks for existing token on page load
             */
            async function checkTokenOnLoad() {
                // Apply theme and color *before* checking token
                initThemeToggle();
                // We will init the background color *after* the token check to sync
                
                const token = localStorage.getItem('dashboard-token');
                if (!token) {
                    authScreen.classList.remove('hidden'); // Show login
                    // Set default bg color for login screen
                    mainContent.style.backgroundColor = '';
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
                    
                    // Initialize background with server preferences
                    initBgColor({
                        activeBackgroundColor: data.activeBackgroundColor,
                        activeBackgroundId: data.activeBackgroundId
                    });
                    
                    await showDashboard(data.username);
                    
                } catch (err) {
                    console.error('Token check failed:', err.message);
                    localStorage.removeItem('dashboard-token');
                    authScreen.classList.remove('hidden'); // Show login
                    // Set default bg color for login screen
                    mainContent.style.backgroundColor = '';
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
                    tileUrlInput.value = tile.url || '';
                    tileIconInput.value = tile.icon;
                    tileGroupSelect.value = tile.groupId === null ? 'null' : tile.groupId;
                    tileTypeSelect.value = tile.type || 'link';
                    if (tile.borderColor) {
                        tileUseBorderCheck.checked = true;
                        tileBorderColorInput.value = tile.borderColor;
                    } else {
                        tileUseBorderCheck.checked = false;
                        tileBorderColorInput.value = '#3b82f6';
                    }
                    modalDeleteBtn.classList.remove('hidden');
                    modalSubmitBtn.textContent = 'Update';
                } else {
                    // Add Mode
                    currentEditTileId = null;
                    modalTitle.textContent = 'Add New Tile';
                    tileGroupSelect.value = appState.activeGroupId === null ? 'null' : appState.activeGroupId;
                    tileTypeSelect.value = 'link';
                    tileUseBorderCheck.checked = false;
                    tileBorderColorInput.value = '#3b82f6';
                    modalDeleteBtn.classList.add('hidden');
                    modalSubmitBtn.textContent = 'Save';
                }
                
                // Trigger change event to set required attributes correctly based on type
                tileTypeSelect.dispatchEvent(new Event('change'));
                
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
                    groupId: tileGroupSelect.value === 'null' ? null : Number(tileGroupSelect.value),
                    type: tileTypeSelect.value,
                    borderColor: tileUseBorderCheck.checked ? tileBorderColorInput.value : null,
                    widgetData: null
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
                const colorInput = document.getElementById('new-group-color');
                const borderColor = colorInput ? colorInput.value : '#3b82f6';
                if (!name) return;
                
                try {
                    const newGroup = await apiFetch('/api/groups', { method: 'POST', body: { name, borderColor } });
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
                const groupId = e.target.dataset.id;
                const group = appState.groups.find(g => g.id == groupId);
                if (!group) return;

                const item = e.target.closest('.group-list-item');
                const nameInput = item.querySelector('.group-name-input');
                const colorInput = item.querySelector('.group-color-picker');

                const newName = nameInput.value;
                const newColor = colorInput.value;
                
                try {
                    await apiFetch(`/api/groups/${groupId}`, { method: 'PUT', body: { name: newName, borderColor: newColor } });
                    
                    // Update state
                    group.name = newName;
                    group.borderColor = newColor;
                    
                    showToast('Group updated!');
                    renderGroupTabs(); // Re-render tabs with new name
                    renderAll(); // Re-render dashboard
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
            
            // --- EXPORT / IMPORT LOGIC ---
            
            const exportBtn = document.getElementById('export-dashboard-btn');
            const importBtn = document.getElementById('import-dashboard-btn');
            const importInput = document.getElementById('import-file-input');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    const data = { groups: appState.groups, tiles: appState.tiles };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dashboard_export_${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }

            if (importBtn && importInput) {
                importBtn.addEventListener('click', () => importInput.click());
                importInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            if (data.groups && data.tiles) {
                                if (!confirm("This will wipe your current dashboard and replace it with the imported layout! Are you absolutely sure?")) {
                                    e.target.value = '';
                                    return;
                                }
                                
                                document.body.style.cursor = 'wait';
                                showToast('Importing... please wait', false);
                                
                                // Delete existing tiles and groups
                                for (const t of appState.tiles) {
                                    await apiFetch(`/api/tiles/${t.id}`, { method: 'DELETE' }).catch(()=>null);
                                }
                                for (const g of appState.groups) {
                                    await apiFetch(`/api/groups/${g.id}`, { method: 'DELETE' }).catch(()=>null);
                                }
                                
                                // Import new groups
                                const groupIdMap = {};
                                for (const g of data.groups) {
                                    const newG = await apiFetch('/api/groups', { method: 'POST', body: { name: g.name, borderColor: g.borderColor } });
                                    groupIdMap[g.id] = newG.id;
                                }
                                
                                // Import new tiles
                                for (const t of data.tiles) {
                                    const payload = {
                                        name: t.name,
                                        url: t.url,
                                        icon: t.icon,
                                        groupId: t.groupId !== null ? (groupIdMap[t.groupId] || null) : null,
                                        type: t.type || 'link'
                                    };
                                    await apiFetch('/api/tiles', { method: 'POST', body: payload });
                                }
                                
                                window.location.reload();
                            } else {
                                alert("Invalid backup file format.");
                            }
                        } catch (err) {
                            alert("Failed to parse JSON backup file. Error: " + err.message);
                            console.error(err);
                        } finally {
                            document.body.style.cursor = 'default';
                        }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                });
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
                // Preserve the custom background image or color!
                if (appState.activeBackgroundId) {
                    mainContent.style.backgroundColor = 'transparent';
                    document.documentElement.style.setProperty('--bg-color', 'transparent');
                    document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = 'transparent');
                } else if (appState.activeBackgroundColor) {
                    mainContent.style.backgroundColor = appState.activeBackgroundColor;
                    document.documentElement.style.setProperty('--bg-color', appState.activeBackgroundColor);
                    document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = appState.activeBackgroundColor);
                } else {
                    mainContent.style.backgroundColor = ''; 
                    const defaultColor = isDark ? '#111827' : '#f3f4f6';
                    bgColorPicker.value = defaultColor;
                    document.documentElement.style.setProperty('--bg-color', defaultColor);
                    document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = defaultColor);
                }
            }
            
            function initThemeToggle() {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    themeToggle.checked = true;
                } else {
                    themeToggle.checked = false;
                }
            }

            // --- BACKGROUND STYLES & SERVER GALLERY ---
            const bgGalleryBtn = document.getElementById('bg-gallery-btn');
            const bgGalleryModal = document.getElementById('bg-gallery-modal');
            const bgGalleryCloseBtn = document.getElementById('bg-gallery-close-btn');
            const bgGalleryUploadBtn = document.getElementById('bg-gallery-upload-btn');
            const bgGalleryClearBtn = document.getElementById('bg-gallery-clear-btn');
            const bgGalleryGrid = document.getElementById('bg-gallery-grid');
            const bgFileInput = document.getElementById('bg-file-input');

            function applyBgImage(url) {
                if (url) {
                    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${url}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundAttachment = 'fixed';
                    
                    // Clear the hardcoded background colors from body and mainContent so the image shows
                    mainContent.style.backgroundColor = 'transparent';
                    document.documentElement.style.setProperty('--bg-color', 'transparent');
                    document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = 'transparent');
                } else {
                    document.body.style.backgroundImage = '';
                    document.body.style.backgroundSize = '';
                    document.body.style.backgroundPosition = '';
                    document.body.style.backgroundAttachment = '';
                    
                    // Fall back to server's solid color, or default
                    const color = mainContent.style.backgroundColor || (document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6');
                    mainContent.style.backgroundColor = color;
                    document.documentElement.style.setProperty('--bg-color', color);
                    document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = color);
                }
            }

            function handleBgColorChange(e) {
                const color = e.target.value;
                mainContent.style.backgroundColor = color;
                document.documentElement.style.setProperty('--bg-color', color);
                document.querySelectorAll('.group-header').forEach(el => el.style.backgroundColor = color);
                
                // Save to server
                if (appState.currentToken) {
                    appState.activeBackgroundId = null; // Clear image active state
                    applyBgImage(null); // Clear image to show solid color
                    renderBgGallery(); // Update visual state if Gallery open
                    
                    apiFetch('/api/users/settings', { 
                        method: 'PUT', 
                        body: { activeBackgroundColor: color, activeBackgroundId: null } 
                    }).catch(console.error);
                }
            }

            async function renderBgGallery() {
                bgGalleryGrid.innerHTML = '<div class="col-span-12 text-center text-gray-500 py-8"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';
                try {
                    const bgs = await apiFetch('/api/backgrounds');
                    bgGalleryGrid.innerHTML = '';
                    
                    if (bgs.length === 0) {
                        bgGalleryGrid.innerHTML = '<div class="col-span-12 text-center text-gray-500 py-8 text-sm">No uploaded backgrounds yet. Click "Upload" above!</div>';
                        return;
                    }
                    
                    const activeId = appState.activeBackgroundId;

                    bgs.forEach(bg => {
                        const tile = document.createElement('div');
                        const isActive = activeId === bg.id;
                        tile.className = `relative aspect-video rounded-lg shadow-sm border-2 overflow-hidden group cursor-pointer transition-transform hover:scale-105 ${isActive ? 'border-blue-500 scale-105 shadow-md' : 'border-black/10 dark:border-white/10'}`;
                        
                        tile.innerHTML = `
                            <img src="${bg.dataUrl}" class="w-full h-full object-cover">
                            ${isActive ? '<div class="absolute top-2 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVE</div>' : ''}
                            <button class="bg-delete-btn absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        `;

                        // Activate background on click
                        tile.addEventListener('click', async () => {
                            appState.activeBackgroundId = bg.id;
                            applyBgImage(bg.dataUrl);
                            renderBgGallery(); // update active outline visual
                            
                            await apiFetch('/api/users/settings', { 
                                method: 'PUT', 
                                body: { activeBackgroundId: bg.id, activeBackgroundColor: null } 
                            }).catch(console.error);
                        });

                        // Delete button
                        const deleteBtn = tile.querySelector('.bg-delete-btn');
                        deleteBtn.addEventListener('click', async (evt) => {
                            evt.stopPropagation();
                            if(confirm("Delete this background?")) {
                                try {
                                    await apiFetch(`/api/backgrounds/${bg.id}`, { method: 'DELETE' });
                                    if (activeId === bg.id) {
                                        appState.activeBackgroundId = null;
                                        applyBgImage(null);
                                        await apiFetch('/api/users/settings', { method: 'PUT', body: { activeBackgroundId: null, activeBackgroundColor: null } }).catch(console.error);
                                    }
                                    renderBgGallery();
                                } catch(e) {
                                    alert(e.message);
                                }
                            }
                        });

                        bgGalleryGrid.appendChild(tile);
                    });

                } catch(e) {
                    bgGalleryGrid.innerHTML = '<div class="col-span-12 text-red-500 text-center py-4 text-sm">Error reading server gallery.</div>';
                }
            }

            // Bind Modal Events
            if (bgGalleryBtn) {
                bgGalleryBtn.addEventListener('click', () => {
                    bgGalleryModal.classList.remove('hidden');
                    renderBgGallery();
                });
            }
            if (bgGalleryCloseBtn) {
                bgGalleryCloseBtn.addEventListener('click', () => { bgGalleryModal.classList.add('hidden'); });
            }
            if (bgGalleryUploadBtn && bgFileInput) {
                bgGalleryUploadBtn.addEventListener('click', () => bgFileInput.click());
                bgFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    // Simple size check (15MB limit to prevent browser freeze)
                    if (file.size > 15 * 1024 * 1024) {
                        alert("File is too large! Please choose an image under 15MB.");
                        e.target.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const base64Data = event.target.result;
                        
                        try {
                            const newBg = await apiFetch('/api/backgrounds', { method: 'POST', body: { dataUrl: base64Data } });
                            appState.activeBackgroundId = newBg.id;
                            applyBgImage(base64Data);
                            
                            await apiFetch('/api/users/settings', { 
                                method: 'PUT', 
                                body: { activeBackgroundId: newBg.id, activeBackgroundColor: null } 
                            });
                            
                            e.target.value = ''; // Reset input
                            renderBgGallery();
                        } catch(err) {
                            alert("Failed to save image to server. " + err.message);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }

            if (bgGalleryClearBtn) {
                bgGalleryClearBtn.addEventListener('click', async () => {
                    appState.activeBackgroundId = null;
                    applyBgImage(null);
                    renderBgGallery();
                    
                    await apiFetch('/api/users/settings', { 
                        method: 'PUT', 
                        body: { activeBackgroundId: null, activeBackgroundColor: null } 
                    }).catch(console.error);
                });
            }

            function initBgColor(settings = {}) {
                let color = settings.activeBackgroundColor || (document.documentElement.classList.contains('dark') ? '#111827' : '#f3f4f6');
                
                mainContent.style.backgroundColor = color;
                document.documentElement.style.setProperty('--bg-color', color);
                bgColorPicker.value = color;
                
                appState.activeBackgroundId = settings.activeBackgroundId || null;
                
                if (appState.activeBackgroundId) {
                    apiFetch('/api/backgrounds').then(bgs => {
                        const activeBg = bgs.find(b => b.id === appState.activeBackgroundId);
                        if (activeBg) {
                            applyBgImage(activeBg.dataUrl);
                        } else {
                            applyBgImage(null);
                        }
                    }).catch(() => applyBgImage(null));
                } else {
                    applyBgImage(null);
                }
            }

            // --- ICON PICKER LOGIC ---
            const tabDashboardIcons = document.getElementById('tab-dashboard-icons');
            const tabFontAwesome = document.getElementById('tab-fontawesome');
            const faHelpPanel = document.getElementById('icon-picker-fa-help');
            const iconLoadingMsg = document.getElementById('icon-picker-loading');
            
            let dashIconsCache = [];
            let iconActiveTab = 'dashboard';

            function populateIconPicker(filter = '') {
                iconPickerGrid.innerHTML = '';
                const lowerFilter = filter.toLowerCase();
                
                if (iconActiveTab === 'fontawesome') {
                    // (Old implementation ignored - now we just use a helper panel)
                } else if (iconActiveTab === 'dashboard') {
                    // Render Dashboard Icons
                    if (iconLoadingMsg) iconLoadingMsg.style.display = 'none';
                    const filtered = dashIconsCache.filter(ic => ic.name.toLowerCase().includes(lowerFilter));
                    const toRender = filtered.slice(0, 150);
                    
                    toRender.forEach(icon => {
                        const iconBtn = document.createElement('button');
                        iconBtn.type = 'button';
                        iconBtn.className = 'p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex flex-col items-center justify-center transition-all bg-white dark:bg-gray-800 shadow-sm hover:shadow-md';
                        iconBtn.innerHTML = `<img src="${icon.url}" loading="lazy" class="w-8 h-8 object-contain mb-2" alt="${icon.name}">
                                             <span class="text-[10px] text-gray-500 truncate w-full text-center">${icon.name.replace(/-/g, ' ')}</span>`;
                        iconBtn.addEventListener('click', async () => {
                            iconBtn.disabled = true;
                            const originalHTML = iconBtn.innerHTML;
                            iconBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i>`;
                            
                            try {
                                const response = await fetch(icon.url);
                                if (!response.ok) throw new Error("Fetch failed");
                                const blob = await response.blob();
                                
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    tileIconInput.value = reader.result;
                                    hideIconPicker();
                                    iconBtn.innerHTML = originalHTML;
                                    iconBtn.disabled = false;
                                };
                                reader.readAsDataURL(blob);
                            } catch (e) {
                                console.error("Could not cache icon:", e);
                                tileIconInput.value = icon.url; // fallback
                                hideIconPicker();
                                iconBtn.innerHTML = originalHTML;
                                iconBtn.disabled = false;
                            }
                        });
                        iconPickerGrid.appendChild(iconBtn);
                    });
                    
                    if (filtered.length === 0) {
                        iconPickerGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No icons found.</div>';
                    } else if (filtered.length > 150) {
                        const moreMsg = document.createElement('div');
                        moreMsg.className = 'col-span-full text-center text-xs text-gray-400 py-2';
                        moreMsg.textContent = `Showing 150 of ${filtered.length} icons.`;
                        iconPickerGrid.appendChild(moreMsg);
                    }
                }
            }
            
            async function loadDashboardIcons() {
                try {
                    const localCache = localStorage.getItem('dashboard-icons-cache-v2');
                    const cacheTime = localStorage.getItem('dashboard-icons-time-v2');
                    const now = new Date().getTime();
                    
                    if (localCache && cacheTime && now - parseInt(cacheTime) < 86400000) {
                        dashIconsCache = JSON.parse(localCache);
                        populateIconPicker(iconSearchInput.value);
                        return;
                    }

                    const res = await fetch('https://api.github.com/repos/homarr-labs/dashboard-icons/git/trees/main?recursive=1');
                    if (res.ok) {
                        const data = await res.json();
                        dashIconsCache = data.tree
                            .filter(file => file.path.startsWith('png/') && file.path.endsWith('.png'))
                            .map(file => {
                                const fileName = file.path.replace('png/', '');
                                return {
                                    name: fileName.replace('.png', ''),
                                    url: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/png/${fileName}`
                                };
                            });
                        localStorage.setItem('dashboard-icons-cache-v2', JSON.stringify(dashIconsCache));
                        localStorage.setItem('dashboard-icons-time-v2', now.toString());
                        populateIconPicker(iconSearchInput.value);
                    } else {
                        if (iconLoadingMsg) iconLoadingMsg.textContent = 'Failed to load icons from GitHub API. Rate limit exceeded.';
                    }
                } catch(err) {
                    console.error("Icon fetch error:", err);
                    if (iconLoadingMsg) iconLoadingMsg.textContent = 'Error loading icons.';
                }
            }

            if (tabDashboardIcons && tabFontAwesome) {
                tabDashboardIcons.addEventListener('click', () => {
                    iconActiveTab = 'dashboard';
                    tabDashboardIcons.className = "px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500";
                    tabFontAwesome.className = "px-4 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 transition-colors";
                    iconPickerGrid.classList.remove('hidden');
                    if(faHelpPanel) faHelpPanel.classList.add('hidden');
                    populateIconPicker(iconSearchInput.value);
                });

                tabFontAwesome.addEventListener('click', () => {
                    iconActiveTab = 'fontawesome';
                    tabFontAwesome.className = "px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500";
                    tabDashboardIcons.className = "px-4 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 transition-colors";
                    iconPickerGrid.classList.add('hidden');
                    if(faHelpPanel) {
                        faHelpPanel.classList.remove('hidden');
                        faHelpPanel.classList.add('flex');
                    }
                });
            }

            function showIconPicker() {
                iconSearchInput.value = '';
                populateIconPicker();
                iconPickerModal.classList.remove('hidden');
                iconSearchInput.focus();
                if (dashIconsCache.length === 0 && iconActiveTab === 'dashboard') {
                    loadDashboardIcons();
                }
            }
            
            function hideIconPicker() {
                iconPickerModal.classList.add('hidden');
            }
            
            function handleIconSearch(e) {
                if (iconActiveTab === 'fontawesome') {
                    tileIconInput.value = e.target.value;
                } else {
                    populateIconPicker(e.target.value);
                }
            }
            if (iconSearchInput) {
                iconSearchInput.addEventListener('input', handleIconSearch);
            }
            
            // --- HEARTBEAT & PING LOGIC ---
            function runPingCycle() {
                const linkTiles = appState.tiles.filter(t => t.type === 'link' || !t.type);
                linkTiles.forEach(tile => {
                    const dot = document.getElementById(`hb-${tile.id}`);
                    if (!dot) return;
                    
                    if (!tile.url || tile.url.trim() === '') {
                        dot.classList.add('hidden');
                        return;
                    }
                    
                    dot.classList.remove('hidden');
                    dot.className = "heartbeat-dot absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-yellow-400 pointer-events-none animate-pulse shadow-sm";
                    
                    // Fire-and-forget ping using no-cors to prevent preflight rejects
                    fetch(tile.url, { mode: 'no-cors', cache: 'no-store' })
                        .then(() => {
                            dot.className = "heartbeat-dot absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-green-500 pointer-events-none shadow-sm shadow-green-400/50";
                            dot.title = "Online";
                        })
                        .catch(() => {
                            dot.className = "heartbeat-dot absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 pointer-events-none shadow-sm shadow-red-400/50";
                            dot.title = "Offline";
                        });
                });
            }

            // Start heartbeat at fixed intervals
            setInterval(runPingCycle, 60000);

            // Trigger one cycle right after grid render (hooked below)
            
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

            // --- EVENT LISTENERS (AUTH) ---
            authToggleBtn.addEventListener('click', toggleAuthMode);
            authForm.addEventListener('submit', handleAuthSubmit);
            logoutBtn.addEventListener('click', handleLogout);
            themeToggle.addEventListener('change', handleThemeToggle);
            bgColorPicker.addEventListener('input', handleBgColorChange); // Added for bg color
            
            // --- EVENT LISTENERS (TILE MODAL) ---
            tileTypeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'stats') {
                    tileUrlInput.removeAttribute('required');
                    tileIconInput.removeAttribute('required');
                    tileUrlInput.parentElement.classList.add('hidden');
                    tileIconInput.parentElement.classList.add('hidden');
                } else {
                    tileUrlInput.setAttribute('required', 'true');
                    tileIconInput.setAttribute('required', 'true');
                    tileUrlInput.parentElement.classList.remove('hidden');
                    tileIconInput.parentElement.classList.remove('hidden');
                }
            });

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

            // --- INITIALIZATION ---
            checkTokenOnLoad(); // This now calls initThemeToggle and initBgColor
        