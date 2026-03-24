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
                        
                        // Initialize background with server preferences
                        initBgColor({
                            activeBackgroundColor: data.activeBackgroundColor,
                            activeBackgroundId: data.activeBackgroundId
                        });

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