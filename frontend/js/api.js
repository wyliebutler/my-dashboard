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
                    'Content-Type': 'application/json'
                };
                
                if (options.body) {
                    options.body = JSON.stringify(options.body);
                }
                
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