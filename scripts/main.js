// Main Application Controller
class StudyZenApp {
    constructor() {
        this.currentUser = null;
        this.isFocusMode = false;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
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
            // We're already on the correct page
            return;
        }
        
        if (savedUser) {
            const { username } = JSON.parse(savedUser);
            const user = db.getUser(username);
            
            if (user) {
                this.currentUser = user;
                // We're already on the correct page
                return;
            }
        }
        
        // Not authenticated, redirect to login
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
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
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const themeManager = window.themeManager;
            if (themeManager) {
                const currentTheme = themeManager.currentTheme;
                const newTheme = currentTheme === 'dark' ? 'default' : 'dark';
                themeManager.applyTheme(newTheme);
            }
        });

        // Focus mode
        document.getElementById('focusModeBtn')?.addEventListener('click', () => this.toggleFocusMode());

        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('notificationPanel');
            if (panel) {
                panel.classList.toggle('active');
            }
        });
    }

    navigateTo(page) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Navigate to page
        window.location.href = `pages/${page}.html`;
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
        window.location.href = '../index.html';
    }
}

// Initialize app
const app = new StudyZenApp();
