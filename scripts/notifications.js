// Notification System
class NotificationSystem {
    constructor(username) {
        this.username = username;
        this.currentUser = db.getUser(username);
        this.notifications = [];
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.loadNotifications();
        this.setupEventListeners();
        this.updateNotificationBadge();
        this.setupAutoNotifications();
    }

    loadNotifications() {
        this.notifications = db.getNotifications(this.username);
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.displayNotifications();
    }

    displayNotifications() {
        const container = document.getElementById('notificationList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <small>Notifications will appear here</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 data-id="${notification.id}">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${db.formatDate(notification.createdAt)}</span>
                </div>
                ${!notification.read ? '<div class="notification-dot"></div>' : ''}
                <button class="notification-remove" data-id="${notification.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            'achievement': 'trophy',
            'friend': 'user-friends',
            'study': 'book',
            'reminder': 'bell',
            'system': 'cog',
            'error': 'exclamation-circle',
            'success': 'check-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'bell';
    }

    setupEventListeners() {
        // Notification item click
        document.addEventListener('click', (e) => {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                const notificationId = notificationItem.dataset.id;
                this.markAsRead(notificationId);
            }

            // Remove notification
            if (e.target.closest('.notification-remove')) {
                const notificationId = e.target.closest('.notification-remove').dataset.id;
                this.removeNotification(notificationId);
                e.stopPropagation();
            }
        });

        // Mark all as read
        document.getElementById('markAllRead')?.addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Clear all notifications
        document.getElementById('clearAllNotifications')?.addEventListener('click', () => {
            this.clearAllNotifications();
        });

        // Notification settings
        document.getElementById('notificationSettings')?.addEventListener('click', () => {
            this.showNotificationSettings();
        });
    }

    markAsRead(notificationId) {
        const notification = db.markNotificationAsRead(notificationId);
        if (notification) {
            this.loadNotifications();
            this.updateNotificationBadge();
            
            // Trigger notification action if needed
            if (notification.data?.action) {
                this.handleNotificationAction(notification.data.action);
            }
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            if (!notification.read) {
                db.markNotificationAsRead(notification.id);
            }
        });
        
        this.loadNotifications();
        this.updateNotificationBadge();
        app.showNotification('All notifications marked as read', '', 'success');
    }

    removeNotification(notificationId) {
        const notifications = JSON.parse(localStorage.getItem('studyzen_notifications') || '[]');
        const filtered = notifications.filter(n => n.id !== notificationId);
        localStorage.setItem('studyzen_notifications', JSON.stringify(filtered));
        
        this.loadNotifications();
        this.updateNotificationBadge();
    }

    clearAllNotifications() {
        const notifications = JSON.parse(localStorage.getItem('studyzen_notifications') || '[]');
        const filtered = notifications.filter(n => n.username !== this.username);
        localStorage.setItem('studyzen_notifications', JSON.stringify(filtered));
        
        this.loadNotifications();
        this.updateNotificationBadge();
        app.showNotification('All notifications cleared', '', 'info');
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-count');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    createNotification(notificationData) {
        const notification = db.createNotification(this.username, notificationData);
        this.loadNotifications();
        this.updateNotificationBadge();
        this.showDesktopNotification(notification);
        return notification;
    }

    showDesktopNotification(notification) {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            return;
        }

        // Check if permission is already granted
        if (Notification.permission === "granted") {
            this.displayDesktopNotification(notification);
        } 
        // Otherwise, ask for permission
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.displayDesktopNotification(notification);
                }
            });
        }
    }

    displayDesktopNotification(notification) {
        const options = {
            body: notification.message,
            icon: '/assets/icons/notification-icon.png',
            badge: '/assets/icons/badge.png',
            tag: 'studynotification',
            renotify: true,
            silent: false
        };

        const desktopNotification = new Notification(notification.title, options);
        
        desktopNotification.onclick = () => {
            window.focus();
            this.markAsRead(notification.id);
            desktopNotification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => desktopNotification.close(), 5000);
    }

    setupAutoNotifications() {
        // Daily study reminder
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(19, 0, 0, 0); // 7 PM
        
        if (now < reminderTime) {
            setTimeout(() => {
                this.createDailyReminder();
            }, reminderTime - now);
        }

        // Streak reminder (check daily at 8 AM)
        const streakTime = new Date();
        streakTime.setHours(8, 0, 0, 0);
        if (now < streakTime) {
            setTimeout(() => {
                this.checkStreakReminder();
            }, streakTime - now);
        }

        // Weekly summary (every Sunday at 9 PM)
        if (now.getDay() === 0) { // Sunday
            const weeklyTime = new Date();
            weeklyTime.setHours(21, 0, 0, 0); // 9 PM
            if (now < weeklyTime) {
                setTimeout(() => {
                    this.createWeeklySummary();
                }, weeklyTime - now);
            }
        }
    }

    createDailyReminder() {
        const todaySessions = this.getTodaySessions();
        if (todaySessions.length === 0) {
            this.createNotification({
                type: 'reminder',
                title: '📚 Daily Study Reminder',
                message: 'You haven\'t studied today! Start a session to keep your streak alive!',
                data: { action: 'start_study' }
            });
        }
    }

    checkStreakReminder() {
        const user = db.getUser(this.username);
        if (user && user.stats.currentStreak >= 3) {
            this.createNotification({
                type: 'achievement',
                title: '🔥 Streak Alert!',
                message: `You're on a ${user.stats.currentStreak}-day streak! Keep it going!`,
                data: { action: 'view_stats' }
            });
        }
    }

    createWeeklySummary() {
        const sessions = this.getWeekSessions();
        const totalTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
        const hours = Math.floor(totalTime / 3600);
        
        this.createNotification({
            type: 'study',
            title: '📊 Weekly Study Summary',
            message: `You studied for ${hours} hours this week! Great job!`,
            data: { action: 'view_stats' }
        });
    }

    getTodaySessions() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const today = new Date().toDateString();
        
        return sessions.filter(s => 
            s.username === this.username && 
            s.completed && 
            new Date(s.endTime).toDateString() === today
        );
    }

    getWeekSessions() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return sessions.filter(s => 
            s.username === this.username && 
            s.completed && 
            new Date(s.endTime) >= weekAgo
        );
    }

    handleNotificationAction(action) {
        switch(action) {
            case 'start_study':
                app.navigateTo('pomodoro');
                break;
            case 'view_stats':
                app.navigateTo('stats');
                break;
            case 'view_achievements':
                // Navigate to achievements section
                break;
        }
    }

    showNotificationSettings() {
        const settings = document.createElement('div');
        settings.className = 'notification-settings-modal';
        settings.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> Notification Settings</h3>
                    <button class="close-settings"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="settings-group">
                        <h4>Notification Types</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="studyReminders" checked>
                                <span>Study Reminders</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="achievementAlerts" checked>
                                <span>Achievement Alerts</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="friendActivities" checked>
                                <span>Friend Activities</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="streakReminders" checked>
                                <span>Streak Reminders</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Notification Schedule</h4>
                        <div class="setting-item">
                            <label>Daily Reminder Time</label>
                            <input type="time" id="dailyReminderTime" value="19:00">
                        </div>
                        <div class="setting-item">
                            <label>Quiet Hours</label>
                            <div class="time-range">
                                <input type="time" id="quietStart" value="22:00">
                                <span>to</span>
                                <input type="time" id="quietEnd" value="08:00">
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Sound & Vibration</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="notificationSound" checked>
                                <span>Play Sound</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="desktopNotifications" checked>
                                <span>Desktop Notifications</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>Sound Volume</label>
                            <input type="range" id="notificationVolume" min="0" max="100" value="50">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-settings">Cancel</button>
                    <button class="btn-primary" id="saveNotificationSettings">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(settings);

        // Load current settings
        this.loadNotificationSettings(settings);

        // Close modal
        settings.querySelector('.close-settings').addEventListener('click', () => settings.remove());

        // Save settings
        settings.querySelector('#saveNotificationSettings').addEventListener('click', () => {
            this.saveNotificationSettings(settings);
            settings.remove();
        });
    }

    loadNotificationSettings(modal) {
        const user = db.getUser(this.username);
        const settings = user.preferences.notificationSettings || {};
        
        // Set checkbox values
        const checkboxes = ['studyReminders', 'achievementAlerts', 'friendActivities', 'streakReminders', 'notificationSound', 'desktopNotifications'];
        checkboxes.forEach(id => {
            const checkbox = modal.querySelector(`#${id}`);
            if (checkbox) {
                checkbox.checked = settings[id] !== false;
            }
        });

        // Set time values
        if (settings.dailyReminderTime) {
            modal.querySelector('#dailyReminderTime').value = settings.dailyReminderTime;
        }
        if (settings.quietStart) {
            modal.querySelector('#quietStart').value = settings.quietStart;
        }
        if (settings.quietEnd) {
            modal.querySelector('#quietEnd').value = settings.quietEnd;
        }
        if (settings.notificationVolume) {
            modal.querySelector('#notificationVolume').value = settings.notificationVolume;
        }
    }

    saveNotificationSettings(modal) {
        const user = db.getUser(this.username);
        if (!user.preferences.notificationSettings) {
            user.preferences.notificationSettings = {};
        }

        // Get checkbox values
        const settings = user.preferences.notificationSettings;
        const checkboxes = ['studyReminders', 'achievementAlerts', 'friendActivities', 'streakReminders', 'notificationSound', 'desktopNotifications'];
        checkboxes.forEach(id => {
            const checkbox = modal.querySelector(`#${id}`);
            if (checkbox) {
                settings[id] = checkbox.checked;
            }
        });

        // Get time values
        settings.dailyReminderTime = modal.querySelector('#dailyReminderTime').value;
        settings.quietStart = modal.querySelector('#quietStart').value;
        settings.quietEnd = modal.querySelector('#quietEnd').value;
        settings.notificationVolume = modal.querySelector('#notificationVolume').value;

        // Save user
        db.saveUser(user);
        
        app.showNotification('Settings Saved', 'Notification preferences updated', 'success');
        
        // Update auto notifications based on new settings
        this.setupAutoNotifications();
    }
}

// Initialize notification system
let notificationSystem;
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('studyzen_demo') || 
                                   localStorage.getItem('studyzen_user') || 
                                   sessionStorage.getItem('studyzen_user') || '{}');
    
    if (currentUser.username || currentUser.isDemo) {
        notificationSystem = new NotificationSystem(currentUser.username || 'demo_user');
    }
});
