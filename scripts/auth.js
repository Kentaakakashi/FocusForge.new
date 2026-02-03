// Authentication System for StudyZen

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadSavedUser();
        this.setupEventListeners();
        this.checkForAutoLogin();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Login button
        document.getElementById('loginBtn')?.addEventListener('click', () => this.login());
        document.getElementById('signupBtn')?.addEventListener('click', () => this.signup());
        document.getElementById('demoBtn')?.addEventListener('click', () => this.demoLogin());

        // Enter key support
        ['loginUsername', 'loginPassword', 'signupUsername', 'displayName', 'signupPassword', 'confirmPassword'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (id.startsWith('login')) {
                            this.login();
                        } else {
                            this.signup();
                        }
                    }
                });
            }
        });
    }

    switchTab(tab) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Show active form
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}Form`);
        });
    }

    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked;

        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const users = this.getUsers();
            const user = users.find(u => u.username === username);

            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }

            if (user.password !== password) {
                this.showMessage('Incorrect password', 'error');
                return;
            }

            this.currentUser = user;
            
            if (rememberMe) {
                localStorage.setItem('studyzen_user', JSON.stringify({
                    username: user.username,
                    remember: true
                }));
            } else {
                sessionStorage.setItem('studyzen_user', JSON.stringify({
                    username: user.username,
                    remember: false
                }));
            }

            this.showMessage('Login successful! Redirecting...', 'success');
            this.createConfetti();
            await this.delay(1500);
            this.redirectToDashboard();
            
        } catch (error) {
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    async signup() {
        const username = document.getElementById('signupUsername').value.trim();
        const displayName = document.getElementById('displayName').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!username || !displayName || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        if (username.length < 3) {
            this.showMessage('Username must be at least 3 characters', 'error');
            return;
        }

        try {
            const users = this.getUsers();
            
            // Check if username exists
            if (users.some(u => u.username === username)) {
                this.showMessage('Username already exists', 'error');
                return;
            }

            // Create new user
            const newUser = {
                id: this.generateId(),
                username: username,
                displayName: displayName,
                password: password,
                createdAt: new Date().toISOString(),
                stats: {
                    totalStudyTime: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    pomodoroSessions: 0,
                    subjects: {}
                },
                preferences: {
                    theme: 'default',
                    notifications: true,
                    privacy: {
                        showOnlineStatus: true,
                        showStreak: true,
                        showStudyTime: true
                    }
                },
                followers: [],
                following: [],
                achievements: [],
                studyPet: {
                    type: 'default',
                    level: 1,
                    happiness: 100
                }
            };

            // Save user
            users.push(newUser);
            localStorage.setItem('studyzen_users', JSON.stringify(users));

            // Auto login
            this.currentUser = newUser;
            sessionStorage.setItem('studyzen_user', JSON.stringify({
                username: newUser.username,
                remember: false
            }));

            this.showMessage('Account created successfully!', 'success');
            this.createConfetti();
            await this.delay(1500);
            this.redirectToDashboard();
            
        } catch (error) {
            this.showMessage('Signup failed. Please try again.', 'error');
        }
    }

    demoLogin() {
        const demoUser = {
            id: 'demo_123',
            username: 'demo_user',
            displayName: 'Demo Explorer',
            isDemo: true,
            stats: {
                totalStudyTime: 3600,
                currentStreak: 3,
                longestStreak: 7,
                pomodoroSessions: 12,
                subjects: {
                    'Mathematics': 1200,
                    'Programming': 1800,
                    'Language': 600
                }
            },
            preferences: {
                theme: 'lofi',
                notifications: true,
                privacy: {
                    showOnlineStatus: true,
                    showStreak: true,
                    showStudyTime: true
                }
            },
            followers: ['user1', 'user2'],
            following: ['study_buddy', 'math_wizard'],
            achievements: ['first_study', 'week_streak'],
            studyPet: {
                type: 'cat',
                level: 2,
                happiness: 85
            }
        };

        this.currentUser = demoUser;
        sessionStorage.setItem('studyzen_demo', JSON.stringify(demoUser));
        
        this.showMessage('Entering Demo Mode...', 'success');
        this.createConfetti();
        setTimeout(() => this.redirectToDashboard(), 1000);
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('studyzen_users') || '[]');
    }

    loadSavedUser() {
        const saved = localStorage.getItem('studyzen_user') || sessionStorage.getItem('studyzen_user');
        if (saved) {
            const { username, remember } = JSON.parse(saved);
            if (remember || sessionStorage.getItem('
