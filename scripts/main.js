// Main Application Controller
class StudyZenApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.isFocusMode = false;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.setupPageNavigation();
        this.loadUserPreferences();
        this.updateOnlineStatus();
        
        // Update online status every minute
        setInterval(() => this.updateOnlineStatus(), 60000);
    }

    checkAuthentication() {
        // Check for saved user session
        const savedUser = localStorage.getItem('studyzen_user') || sessionStorage.getItem('studyzen_user');
        const demoUser = sessionStorage.getItem('studyzen_demo');
        
        if (demoUser) {
            this.currentUser = JSON.parse(demoUser);
            this.showDashboard();
            return;
        }
        
        if (savedUser) {
            const { username } = JSON.parse(savedUser);
            const user = db.getUser(username);
            
            if (user) {
                this.currentUser = user;
                this.showDashboard();
                return;
            }
        }
        
        // Not authenticated, show login page
        window.location.href = 'index.html';
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Focus mode
        document.getElementById('focusModeBtn')?.addEventListener('click', () => this.toggleFocusMode());

        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', () => this.toggleNotifications());
        document.getElementById('closeNotifications')?.addEventListener('click', () => this.toggleNotifications());

        // Quick actions
        document.getElementById('quickStartTimer')?.addEventListener('click', () => this.navigateTo('pomodoro'));
        document.getElementById('quickStartStopwatch')?.addEventListener('click', () => this.navigateTo('stopwatch'));
        document.getElementById('quickAskAI')?.addEventListener('click', () => this.navigateTo('chatbot'));
        document.getElementById('quickJoinCommunity')?.addEventListener('click', () => this.navigateTo('community'));

        // Search
        document.querySelector('.search-bar input')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Click sounds
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                this.playSound('click');
            }
        });
    }

    setupPageNavigation() {
        // Load page based on URL hash
        const hash = window.location.hash.substring(1) || 'dashboard';
        this.navigateTo(hash);
        
        // Update hash on navigation
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1) || 'dashboard';
            if (newHash !== this.currentPage) {
                this.navigateTo(newHash);
            }
        });
    }

    navigateTo(page) {
        this.currentPage = page;
        window.location.hash = page;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Load page content
        this.loadPage(page);
    }

    async loadPage(page) {
        const container = document.getElementById('pageContainer');
        if (!container) return;
        
        // Show loading animation
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading ${page}...</p>
            </div>
        `;
        
        try {
            let content = '';
            
            switch(page) {
                case 'dashboard':
                    content = await this.loadDashboard();
                    break;
                case 'pomodoro':
                    content = await this.loadPomodoro();
                    break;
                case 'stopwatch':
                    content = await this.loadStopwatch();
                    break;
                case 'stats':
                    content = await this.loadStats();
                    break;
                case 'chatbot':
                    content = await this.loadChatbot();
                    break;
                case 'community':
                    content = await this.loadCommunity();
                    break;
                case 'profile':
                    content = await this.loadProfile();
                    break;
                case 'themes':
                    content = await this.loadThemes();
                    break;
                case 'support':
                    content = await this.loadSupport();
                    break;
                default:
                    content = await this.loadDashboard();
            }
            
            container.innerHTML = content;
            this.initializePageScripts(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Oops! Something went wrong</h3>
                    <p>Failed to load page content. Please try again.</p>
                    <button onclick="app.navigateTo('dashboard')">Return to Dashboard</button>
                </div>
            `;
        }
    }

    loadDashboard() {
        return new Promise((resolve) => {
            // This is already loaded in dashboard.html
            const dashboardContent = document.querySelector('.dashboard-content');
            if (dashboardContent) {
                this.updateDashboard();
                resolve(dashboardContent.outerHTML);
            } else {
                resolve('<div class="dashboard-content">Dashboard content will be loaded here</div>');
            }
        });
    }

    updateDashboard() {
        if (!this.currentUser) return;
        
        // Update user info
        document.getElementById('userDisplayName')?.textContent = this.currentUser.displayName;
        document.getElementById('userStreak')?.textContent = `🔥 ${this.currentUser.stats.currentStreak} day streak`;
        document.getElementById('welcomeName')?.textContent = this.currentUser.displayName;
        
        // Update stats
        document.getElementById('currentStreak')?.textContent = `${this.currentUser.stats.currentStreak} days`;
        
        const totalToday = this.getTodayStudyTime();
        const hours = Math.floor(totalToday / 3600);
        const minutes = Math.floor((totalToday % 3600) / 60);
        document.getElementById('totalStudyTime')?.textContent = `${hours}h ${minutes}m`;
        
        document.getElementById('achievementsCount')?.textContent = this.currentUser.achievements?.length || 0;
        document.getElementById('followingCount')?.textContent = this.currentUser.following?.length || 0;
        
        // Update activity list
        this.updateActivityList();
        
        // Update study buddies
        this.updateStudyBuddies();
    }

    getTodayStudyTime() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const today = new Date().toDateString();
        
        return sessions
            .filter(s => s.username === this.currentUser.username && 
                         s.completed && 
                         new Date(s.endTime).toDateString() === today)
            .reduce((total, session) => total + (session.duration || 0), 0);
    }

    updateActivityList() {
        const container = document.getElementById('activityList');
        if (!container) return;
        
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions
            .filter(s => s.username === this.currentUser.username && s.completed)
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
            .slice(0, 5);
        
        if (userSessions.length === 0) {
            container.innerHTML = '<p class="no-activity">No study activity yet. Start your first session!</p>';
            return;
        }
        
        container.innerHTML = userSessions.map(session => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${session.type === 'pomodoro' ? 'clock' : 'stopwatch'}"></i>
                </div>
                <div class="activity-details">
                    <p>Studied ${session.subject} for ${db.formatTime(session.duration)}</p>
                    <span class="activity-time">${db.formatDate(session.endTime)}</span>
                </div>
            </div>
        `).join('');
    }

    updateStudyBuddies() {
        const container = document.getElementById('buddiesGrid');
        if (!container) return;
        
        // Get random online users (simulated)
        const users = JSON.parse(localStorage.getItem('studyzen_users') || '[]')
            .filter(user => user.username !== this.currentUser.username)
            .slice(0, 4);
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-buddies">No other users found. Invite friends to join!</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="buddy-card">
                <div class="buddy-avatar ${user.isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-user"></i>
                </div>
                <div class="buddy-info">
                    <h4>${user.displayName}</h4>
                    <p>${user.stats?.currentStreak || 0} day streak</p>
                    <span class="buddy-status">${user.isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <button class="follow-btn" data-username="${user.username}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `).join('');
    }

    loadPomodoro() {
        return `
            <div class="pomodoro-container">
                <div class="pomodoro-header">
                    <h1><i class="fas fa-clock"></i> Pomodoro Timer</h1>
                    <p>Focus for 25 minutes, break for 5 minutes. Customize as needed!</p>
                </div>
                
                <div class="pomodoro-main">
                    <div class="timer-display">
                        <div class="timer-circle">
                            <svg class="timer-svg" viewBox="0 0 100 100">
                                <circle class="timer-background" cx="50" cy="50" r="45"></circle>
                                <circle class="timer-progress" cx="50" cy="50" r="45"></circle>
                            </svg>
                            <div class="timer-text">
                                <div id="timerMinutes">25</div>
                                <div class="timer-colon">:</div>
                                <div id="timerSeconds">00</div>
                            </div>
                            <div class="timer-label" id="timerLabel">Focus Time</div>
                        </div>
                    </div>
                    
                    <div class="timer-controls">
                        <button class="timer-btn start-btn" id="startTimer">
                            <i class="fas fa-play"></i>
                            <span>Start</span>
                        </button>
                        <button class="timer-btn pause-btn" id="pauseTimer" disabled>
                            <i class="fas fa-pause"></i>
                            <span>Pause</span>
                        </button>
                        <button class="timer-btn reset-btn" id="resetTimer">
                            <i class="fas fa-redo"></i>
                            <span>Reset</span>
                        </button>
                        <button class="timer-btn skip-btn" id="skipTimer">
                            <i class="fas fa-forward"></i>
                            <span>Skip</span>
                        </button>
                    </div>
                    
                    <div class="pomodoro-settings">
                        <h3><i class="fas fa-cog"></i> Timer Settings</h3>
                        <div class="settings-grid">
                            <div class="setting-item">
                                <label for="focusTime">Focus Time (minutes)</label>
                                <input type="number" id="focusTime" min="5" max="60" value="25">
                            </div>
                            <div class="setting-item">
                                <label for="breakTime">Short Break (minutes)</label>
                                <input type="number" id="breakTime" min="1" max="15" value="5">
                            </div>
                            <div class="setting-item">
                                <label for="longBreakTime">Long Break (minutes)</label>
                                <input type="number" id="longBreakTime" min="10" max="30" value="15">
                            </div>
                            <div class="setting-item">
                                <label for="sessionsBeforeLongBreak">Sessions before long break</label>
                                <input type="number" id="sessionsBeforeLongBreak" min="2" max="8" value="4">
                            </div>
                        </div>
                        
                        <div class="subject-selection">
                            <h4>What are you studying?</h4>
                            <div class="subject-tags">
                                <span class="subject-tag" data-subject="Mathematics">Mathematics</span>
                                <span class="subject-tag" data-subject="Programming">Programming</span>
                                <span class="subject-tag" data-subject="Language">Language</span>
                                <span class="subject-tag" data-subject="Science">Science</span>
                                <span class="subject-tag" data-subject="History">History</span>
                                <span class="subject-tag" data-subject="Art">Art</span>
                                <span class="subject-tag" data-subject="Music">Music</span>
                                <span class="subject-tag" data-subject="Other">Other</span>
                            </div>
                            <input type="text" id="customSubject" placeholder="Or enter custom subject...">
                        </div>
                    </div>
                    
                    <div class="pomodoro-stats">
                        <div class="stat-box">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <h3 id="completedSessions">0</h3>
                                <p>Today's Sessions</p>
                            </div>
                        </div>
                        <div class="stat-box">
                            <i class="fas fa-fire"></i>
                            <div>
                                <h3 id="focusStreak">0</h3>
                                <p>Focus Streak</p>
                            </div>
                        </div>
                        <div class="stat-box">
                            <i class="fas fa-brain"></i>
                            <div>
                                <h3 id="totalFocusTime">0h 0m</h3>
                                <p>Total Focus Time</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadStopwatch() {
        return `
            <div class="stopwatch-container">
                <div class="stopwatch-header">
                    <h1><i class="fas fa-stopwatch"></i> Study Stopwatch</h1>
                    <p>Track your exact study time. Start when you begin, stop when you're done!</p>
                </div>
                
                <div class="stopwatch-main">
                    <div class="stopwatch-display">
                        <div class="stopwatch-time">
                            <span id="stopwatchHours">00</span>
                            <span class="time-colon">:</span>
                            <span id="stopwatchMinutes">00</span>
                            <span class="time-colon">:</span>
                            <span id="stopwatchSeconds">00</span>
                        </div>
                        <div class="stopwatch-milliseconds">
                            <span id="stopwatchMilliseconds">00</span>
                        </div>
                    </div>
                    
                    <div class="stopwatch-controls">
                        <button class="stopwatch-btn start-btn" id="startStopwatch">
                            <i class="fas fa-play"></i>
                            <span>Start Studying</span>
                        </button>
                        <button class="stopwatch-btn pause-btn" id="pauseStopwatch" disabled>
                            <i class="fas fa-pause"></i>
                            <span>Pause</span>
                        </button>
                        <button class="stopwatch-btn lap-btn" id="lapStopwatch">
                            <i class="fas fa-flag"></i>
                            <span>Lap</span>
                        </button>
                        <button class="stopwatch-btn reset-btn" id="resetStopwatch">
                            <i class="fas fa-stop"></i>
                            <span>Stop & Save</span>
                        </button>
                    </div>
                    
                    <div class="lap-times">
                        <h3><i class="fas fa-flag-checkered"></i> Session Laps</h3>
                        <div class="lap-list" id="lapList">
                            <!-- Lap times will appear here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initializePageScripts(page) {
        switch(page) {
            case 'pomodoro':
                if (typeof PomodoroTimer !== 'undefined') {
                    new PomodoroTimer(this.currentUser.username);
                }
                break;
            case 'stopwatch':
                if (typeof StudyStopwatch !== 'undefined') {
                    new StudyStopwatch(this.currentUser.username);
                }
                break;
            case 'dashboard':
                this.updateDashboard();
                break;
        }
    }

    toggleTheme() {
        // This will be implemented in themes.js
        console.log('Theme toggle clicked');
    }

    toggleFocusMode() {
        this.isFocusMode = !this.isFocusMode;
        document.body.classList.toggle('focus-mode', this.isFocusMode);
        
        const btn = document.getElementById('focusModeBtn');
        if (btn) {
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            
            if (this.isFocusMode) {
                icon.className = 'fas fa-eye-slash';
                text.textContent = 'Exit Focus Mode';
                this.showNotification('Focus Mode Enabled', 'Distractions minimized. Stay focused!');
            } else {
                icon.className = 'fas fa-eye';
                text.textContent = 'Focus Mode';
                this.showNotification('Focus Mode Disabled', 'All features restored.');
            }
        }
    }

    toggleNotifications() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }

    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        });
    }

    playSound(type) {
        try {
            const sound = document.getElementById(`${type}Sound`);
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Audio play failed:', e));
            }
        } catch (error) {
            console.log('Sound error:', error);
        }
    }

    updateOnlineStatus() {
        if (this.currentUser) {
            localStorage.setItem(`studyzen_last_active_${this.currentUser.username}`, new Date().toISOString());
        }
    }

    logout() {
        // Clear session
        localStorage.removeItem('studyzen_user');
        sessionStorage.removeItem('studyzen_user');
        sessionStorage.removeItem('studyzen_demo');
        
        // Redirect to login
        window.location.href = 'index.html';
    }

    handleSearch(query) {
        if (query.length < 2) return;
        
        const results = db.searchUsers(query);
        console.log('Search results:', results);
        // In a real app, you would display these results
    }

    loadUserPreferences() {
        if (!this.currentUser) return;
        
        const theme = this.currentUser.preferences?.theme || 'default';
        this.applyTheme(theme);
    }

    applyTheme(themeId) {
        const themes = JSON.parse(localStorage.getItem('studyzen_themes') || '[]');
        const theme = themes.find(t => t.id === themeId) || themes[0];
        
        if (theme) {
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--${key}`, value);
            });
            
            if (theme.background) {
                document.body.style.background = theme.background;
            }
            
            // Save theme preference
            if (this.currentUser) {
                this.currentUser.preferences.theme = themeId;
                db.saveUser(this.currentUser);
            }
        }
    }
}

// Initialize app
const app = new StudyZenApp();
