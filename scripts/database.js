// Database System for StudyZen
class StudyZenDB {
    constructor() {
        this.init();
    }

    init() {
        // Initialize localStorage databases
        if (!localStorage.getItem('studyzen_users')) {
            localStorage.setItem('studyzen_users', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('studyzen_sessions')) {
            localStorage.setItem('studyzen_sessions', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('studyzen_achievements')) {
            localStorage.setItem('studyzen_achievements', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('studyzen_forums')) {
            localStorage.setItem('studyzen_forums', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('studyzen_notifications')) {
            localStorage.setItem('studyzen_notifications', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('studyzen_themes')) {
            this.initializeThemes();
        }
    }

    initializeThemes() {
        const themes = [
            {
                id: 'default',
                name: 'Default',
                colors: {
                    primary: '#667eea',
                    secondary: '#764ba2',
                    accent: '#f093fb',
                    bg: '#f5f7fa',
                    text: '#333333'
                }
            },
            {
                id: 'lofi',
                name: 'Lofi Beats',
                colors: {
                    primary: '#8BC6EC',
                    secondary: '#9599E2',
                    accent: '#FF9A9E',
                    bg: '#1a1a2e',
                    text: '#e6e6e6'
                },
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                music: 'lofi'
            },
            {
                id: 'japanese',
                name: 'Japanese Garden',
                colors: {
                    primary: '#FF9A9E',
                    secondary: '#FAD0C4',
                    accent: '#A1C4FD',
                    bg: '#fff5f5',
                    text: '#5a3e36'
                },
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)',
                elements: ['sakura', 'lanterns']
            },
            {
                id: 'cozy',
                name: 'Cozy Café',
                colors: {
                    primary: '#A1C4FD',
                    secondary: '#C2E9FB',
                    accent: '#FF9A9E',
                    bg: '#fdf6e3',
                    text: '#5d4037'
                }
            },
            {
                id: 'cyberpunk',
                name: 'Cyberpunk',
                colors: {
                    primary: '#00DBDE',
                    secondary: '#FC00FF',
                    accent: '#00ff88',
                    bg: '#0a0a0f',
                    text: '#00ffea'
                }
            },
            {
                id: 'dark',
                name: 'Dark Mode',
                colors: {
                    primary: '#7289da',
                    secondary: '#99aab5',
                    accent: '#43b581',
                    bg: '#2c2f33',
                    text: '#ffffff'
                }
            },
            {
                id: 'forest',
                name: 'Forest Study',
                colors: {
                    primary: '#2E8B57',
                    secondary: '#3CB371',
                    accent: '#98FB98',
                    bg: '#F5FFFA',
                    text: '#2F4F4F'
                }
            },
            {
                id: 'sunset',
                name: 'Sunset Glow',
                colors: {
                    primary: '#FF6B6B',
                    secondary: '#FFD93D',
                    accent: '#6BCF7F',
                    bg: '#FFF9C4',
                    text: '#5D4037'
                }
            }
        ];
        
        localStorage.setItem('studyzen_themes', JSON.stringify(themes));
        return themes;
    }

    // User Management
    getUser(username) {
        const users = JSON.parse(localStorage.getItem('studyzen_users') || '[]');
        return users.find(user => user.username === username);
    }

    saveUser(user) {
        const users = JSON.parse(localStorage.getItem('studyzen_users') || '[]');
        const index = users.findIndex(u => u.username === user.username);
        
        if (index !== -1) {
            users[index] = user;
        } else {
            users.push(user);
        }
        
        localStorage.setItem('studyzen_users', JSON.stringify(users));
        return user;
    }

    updateUserStats(username, updates) {
        const user = this.getUser(username);
        if (!user) return null;

        Object.keys(updates).forEach(key => {
            if (user.stats[key] !== undefined) {
                user.stats[key] = updates[key];
            }
        });

        return this.saveUser(user);
    }

    // Session Tracking
    startSession(username, data) {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const session = {
            id: this.generateId(),
            username: username,
            startTime: new Date().toISOString(),
            type: data.type || 'pomodoro',
            subject: data.subject || 'General',
            duration: 0,
            completed: false
        };
        
        sessions.push(session);
        localStorage.setItem('studyzen_sessions', JSON.stringify(sessions));
        return session;
    }

    endSession(sessionId) {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const session = sessions.find(s => s.id === sessionId);
        
        if (session) {
            session.endTime = new Date().toISOString();
            session.duration = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000);
            session.completed = true;
            localStorage.setItem('studyzen_sessions', JSON.stringify(sessions));
            
            // Update user stats
            const user = this.getUser(session.username);
            if (user) {
                user.stats.totalStudyTime += session.duration;
                
                // Update subject time
                if (!user.stats.subjects[session.subject]) {
                    user.stats.subjects[session.subject] = 0;
                }
                user.stats.subjects[session.subject] += session.duration;
                
                // Update streak
                this.updateStreak(user);
                
                this.saveUser(user);
            }
        }
        
        return session;
    }

    updateStreak(user) {
        const today = new Date().toDateString();
        const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate).toDateString() : null;
        
        if (lastStudy === today) {
            // Already studied today
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastStudy === yesterday.toDateString()) {
            // Studied yesterday, continue streak
            user.stats.currentStreak += 1;
        } else {
            // Break in streak, start over
            user.stats.currentStreak = 1;
        }
        
        if (user.stats.currentStreak > user.stats.longestStreak) {
            user.stats.longestStreak = user.stats.currentStreak;
        }
        
        user.lastStudyDate = new Date().toISOString();
    }

    // Achievements
    checkAchievements(username) {
        const user = this.getUser(username);
        if (!user) return [];
        
        const achievements = JSON.parse(localStorage.getItem('studyzen_achievements') || '[]');
        const userAchievements = user.achievements || [];
        const newAchievements = [];
        
        // Check for new achievements
        const totalMinutes = Math.floor(user.stats.totalStudyTime / 60);
        
        if (totalMinutes >= 60 && !userAchievements.includes('first_hour')) {
            newAchievements.push({
                id: 'first_hour',
                title: 'First Hour',
                description: 'Complete 1 hour of total study time',
                icon: '⏰',
                unlocked: new Date().toISOString()
            });
            userAchievements.push('first_hour');
        }
        
        if (user.stats.currentStreak >= 7 && !userAchievements.includes('week_streak')) {
            newAchievements.push({
                id: 'week_streak',
                title: 'Weekly Warrior',
                description: 'Maintain a 7-day study streak',
                icon: '🔥',
                unlocked: new Date().toISOString()
            });
            userAchievements.push('week_streak');
        }
        
        if (Object.keys(user.stats.subjects).length >= 3 && !userAchievements.includes('subject_explorer')) {
            newAchievements.push({
                id: 'subject_explorer',
                title: 'Subject Explorer',
                description: 'Study 3 different subjects',
                icon: '📚',
                unlocked: new Date().toISOString()
            });
            userAchievements.push('subject_explorer');
        }
        
        // Save updated achievements
        if (newAchievements.length > 0) {
            user.achievements = userAchievements;
            this.saveUser(user);
            
            // Add to global achievements list
            const allAchievements = JSON.parse(localStorage.getItem('studyzen_achievements') || '[]');
            newAchievements.forEach(achievement => {
                if (!allAchievements.find(a => a.id === achievement.id && a.username === username)) {
                    allAchievements.push({
                        ...achievement,
                        username: username
                    });
                }
            });
            localStorage.setItem('studyzen_achievements', JSON.stringify(allAchievements));
        }
        
        return newAchievements;
    }

    // Community & Forums
    createForumPost(username, post) {
        const forums = JSON.parse(localStorage.getItem('studyzen_forums') || '[]');
        const forumPost = {
            id: this.generateId(),
            username: username,
            title: post.title,
            content: post.content,
            subject: post.subject || 'General',
            tags: post.tags || [],
            createdAt: new Date().toISOString(),
            likes: 0,
            comments: [],
            isHelpful: false
        };
        
        forums.push(forumPost);
        localStorage.setItem('studyzen_forums', JSON.stringify(forums));
        return forumPost;
    }

    getForumPosts(filter = {}) {
        const forums = JSON.parse(localStorage.getItem('studyzen_forums') || '[]');
        
        if (filter.subject) {
            return forums.filter(post => post.subject === filter.subject);
        }
        
        if (filter.username) {
            return forums.filter(post => post.username === filter.username);
        }
        
        return forums.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Notifications
    createNotification(username, notification) {
        const notifications = JSON.parse(localStorage.getItem('studyzen_notifications') || '[]');
        const notif = {
            id: this.generateId(),
            username: username,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            read: false,
            createdAt: new Date().toISOString(),
            data: notification.data || {}
        };
        
        notifications.push(notif);
        localStorage.setItem('studyzen_notifications', JSON.stringify(notifications));
        return notif;
    }

    getNotifications(username) {
        const notifications = JSON.parse(localStorage.getItem('studyzen_notifications') || '[]');
        return notifications
            .filter(n => n.username === username)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    markNotificationAsRead(notificationId) {
        const notifications = JSON.parse(localStorage.getItem('studyzen_notifications') || '[]');
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification) {
            notification.read = true;
            localStorage.setItem('studyzen_notifications', JSON.stringify(notifications));
        }
        
        return notification;
    }

    // Search Users
    searchUsers(query) {
        const users = JSON.parse(localStorage.getItem('studyzen_users') || '[]');
        return users.filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.displayName.toLowerCase().includes(query.toLowerCase())
        ).map(user => ({
            username: user.username,
            displayName: user.displayName,
            stats: user.stats,
            isOnline: this.isUserOnline(user.username)
        }));
    }

    isUserOnline(username) {
        // Simple online check - in a real app, this would use WebSockets
        const lastActive = localStorage.getItem(`studyzen_last_active_${username}`);
        if (!lastActive) return false;
        
        const lastActiveTime = new Date(lastActive);
        const now = new Date();
        const diffMinutes = (now - lastActiveTime) / (1000 * 60);
        
        return diffMinutes < 5; // Consider online if active within last 5 minutes
    }

    // Helper Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize database
const db = new StudyZenDB();
