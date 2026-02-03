// Dashboard Functionality
class Dashboard {
    constructor(username) {
        this.username = username;
        this.currentUser = db.getUser(username);
        this.init();
    }

    init() {
        this.updateDashboard();
        this.setupEventListeners();
        this.loadMotivationalQuote();
        this.createWeeklyChart();
        this.updateSubjectList();
        this.checkForNewAchievements();
        this.setupStudyPet();
    }

    updateDashboard() {
        if (!this.currentUser) return;

        // Update user info
        document.getElementById('userDisplayName').textContent = this.currentUser.displayName;
        document.getElementById('userStreak').textContent = `🔥 ${this.currentUser.stats.currentStreak} day streak`;
        document.getElementById('welcomeName').textContent = this.currentUser.displayName;

        // Update stats
        document.getElementById('currentStreak').textContent = `${this.currentUser.stats.currentStreak} days`;
        
        const totalToday = this.getTodayStudyTime();
        const hours = Math.floor(totalToday / 3600);
        const minutes = Math.floor((totalToday % 3600) / 60);
        document.getElementById('totalStudyTime').textContent = `${hours}h ${minutes}m`;
        
        document.getElementById('achievementsCount').textContent = this.currentUser.achievements?.length || 0;
        document.getElementById('followingCount').textContent = this.currentUser.following?.length || 0;

        // Update activity list
        this.updateActivityList();

        // Update study buddies
        this.updateStudyBuddies();
    }

    getTodayStudyTime() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const today = new Date().toDateString();
        
        return sessions
            .filter(s => s.username === this.username && 
                         s.completed && 
                         new Date(s.endTime).toDateString() === today)
            .reduce((total, session) => total + (session.duration || 0), 0);
    }

    updateActivityList() {
        const container = document.getElementById('activityList');
        if (!container) return;
        
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions
            .filter(s => s.username === this.username && s.completed)
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
            .slice(0, 5);
        
        if (userSessions.length === 0) {
            container.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-book-open"></i>
                    <p>No study activity yet. Start your first session!</p>
                    <button class="btn-primary" onclick="app.navigateTo('pomodoro')">Start Studying</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = userSessions.map(session => `
            <div class="activity-item animate-fade-in">
                <div class="activity-icon">
                    <i class="fas fa-${session.type === 'pomodoro' ? 'clock' : 'stopwatch'}"></i>
                </div>
                <div class="activity-details">
                    <p><strong>${session.subject}</strong> for ${db.formatTime(session.duration)}</p>
                    <span class="activity-time">${db.formatDate(session.endTime)}</span>
                </div>
                <div class="activity-type">
                    <span class="type-badge ${session.type}">${session.type}</span>
                </div>
            </div>
        `).join('');
    }

    updateStudyBuddies() {
        const container = document.getElementById('buddiesGrid');
        if (!container) return;
        
        // Get random users (simulated)
        const users = JSON.parse(localStorage.getItem('studyzen_users') || '[]')
            .filter(user => user.username !== this.username)
            .slice(0, 4)
            .map(user => ({
                ...user,
                isOnline: Math.random() > 0.5 // Simulate online status
            }));
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="no-buddies">
                    <i class="fas fa-users"></i>
                    <p>No other users found. Invite friends to join!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="buddy-card animate-fade-in-up">
                <div class="buddy-avatar ${user.isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-user"></i>
                    <span class="status-dot"></span>
                </div>
                <div class="buddy-info">
                    <h4>${user.displayName}</h4>
                    <p>${user.stats?.currentStreak || 0} day streak</p>
                    <span class="buddy-status">${user.isOnline ? 'Online now' : 'Last seen 2h ago'}</span>
                </div>
                <button class="follow-btn ${this.currentUser.following?.includes(user.username) ? 'following' : ''}" 
                        onclick="dashboard.toggleFollow('${user.username}')">
                    <i class="fas fa-${this.currentUser.following?.includes(user.username) ? 'check' : 'plus'}"></i>
                </button>
            </div>
        `).join('');
    }

    toggleFollow(username) {
        const following = this.currentUser.following || [];
        const index = following.indexOf(username);
        
        if (index === -1) {
            following.push(username);
            app.showNotification('Followed', `You're now following ${username}`, 'success');
        } else {
            following.splice(index, 1);
            app.showNotification('Unfollowed', `You've unfollowed ${username}`, 'info');
        }
        
        this.currentUser.following = following;
        db.saveUser(this.currentUser);
        this.updateStudyBuddies();
    }

    createWeeklyChart() {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        // Generate random data for demo
        const data = days.map(() => Math.floor(Math.random() * 4));
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');
        
        // Draw chart
        ctx.fillStyle = gradient;
        
        const barWidth = 40;
        const spacing = 30;
        const maxHeight = 180;
        const maxData = Math.max(...data, 1);
        
        for (let i = 0; i < data.length; i++) {
            const height = (data[i] / maxData) * maxHeight;
            const x = 50 + i * (barWidth + spacing);
            const y = 200 - height;
            
            // Draw bar
            ctx.fillRect(x, y, barWidth, height);
            
            // Draw day label
            ctx.fillStyle = '#666';
            ctx.font = '12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(days[i], x + barWidth/2, 220);
            
            // Draw value
            ctx.fillStyle = '#333';
            ctx.font = 'bold 14px Poppins';
            ctx.fillText(data[i] + 'h', x + barWidth/2, y - 10);
            
            ctx.fillStyle = gradient;
        }
        
        // Draw axis
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, 200);
        ctx.lineTo(400, 200);
        ctx.stroke();
        
        // Draw grid lines
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = 200 - (i * maxHeight/4);
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(400, y);
            ctx.stroke();
            
            ctx.fillStyle = '#666';
            ctx.font = '12px Poppins';
            ctx.fillText(i + 'h', 30, y + 4);
        }
    }

    updateSubjectList() {
        const container = document.getElementById('subjectList');
        if (!container) return;
        
        const subjects = this.currentUser.stats.subjects || {};
        const subjectList = Object.entries(subjects);
        
        if (subjectList.length === 0) {
            container.innerHTML = `
                <li class="no-subjects">
                    <i class="fas fa-search"></i>
                    <span>No subjects tracked yet</span>
                </li>
            `;
            return;
        }
        
        // Sort by time spent (descending)
        subjectList.sort((a, b) => b[1] - a[1]);
        
        container.innerHTML = subjectList.slice(0, 5).map(([subject, time]) => {
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            
            // Calculate progress bar width (0-100%)
            const totalTime = Object.values(subjects).reduce((a, b) => a + b, 0);
            const percentage = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0;
            
            return `
                <li>
                    <div class="subject-info">
                        <span class="subject-name">${subject}</span>
                        <span class="subject-time">${hours}h ${minutes}m</span>
                    </div>
                    <div class="subject-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="progress-percentage">${percentage}%</span>
                    </div>
                </li>
            `;
        }).join('');
    }

    checkForNewAchievements() {
        const newAchievements = db.checkAchievements(this.username);
        
        if (newAchievements.length > 0) {
            newAchievements.forEach(achievement => {
                this.showAchievementNotification(achievement);
            });
        }
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-toast animate-fade-in-up';
        notification.innerHTML = `
            <div class="achievement-icon">
                <span class="achievement-emoji">${achievement.icon}</span>
            </div>
            <div class="achievement-content">
                <h4>🏆 Achievement Unlocked!</h4>
                <h3>${achievement.title}</h3>
                <p>${achievement.description}</p>
            </div>
            <div class="achievement-sparkles">
                <div class="sparkle"></div>
                <div class="sparkle"></div>
                <div class="sparkle"></div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Play achievement sound
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    loadMotivationalQuote() {
        const quotes = [
            "The secret of getting ahead is getting started. - Mark Twain",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "The future depends on what you do today. - Mahatma Gandhi",
            "It's not that I'm so smart, it's just that I stay with problems longer. - Albert Einstein",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Success is the sum of small efforts, repeated day in and day out. - Robert Collier",
            "The harder you work for something, the greater you'll feel when you achieve it. - Anonymous",
            "Dream big. Start small. Act now. - Robin Sharma",
            "Believe you can and you're halfway there. - Theodore Roosevelt",
            "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const quoteElement = document.getElementById('dailyQuote');
        if (quoteElement) {
            quoteElement.textContent = randomQuote;
        }
    }

    setupStudyPet() {
        const pet = document.getElementById('studyPet');
        if (!pet || !this.currentUser.studyPet) return;
        
        const petData = this.currentUser.studyPet;
        
        // Update pet appearance based on type and level
        pet.innerHTML = this.getPetIcon(petData.type);
        
        // Update happiness bar
        const happinessFill = document.querySelector('.happiness-fill');
        if (happinessFill) {
            happinessFill.style.width = `${petData.happiness}%`;
        }
        
        // Update happiness percentage
        const happinessPercent = document.querySelector('.pet-happiness span');
        if (happinessPercent) {
            happinessPercent.textContent = `${petData.happiness}%`;
        }
        
        // Pet animations
        setInterval(() => {
            if (petData.happiness > 50) {
                pet.classList.add('pet-happy');
                setTimeout(() => pet.classList.remove('pet-happy'), 1000);
            }
        }, 3000);
    }

    getPetIcon(type) {
        const icons = {
            'cat': '🐱',
            'dog': '🐶',
            'owl': '🦉',
            'fox': '🦊',
            'panda': '🐼',
            'rabbit': '🐰',
            'default': '🐾'
        };
        return icons[type] || icons.default;
    }

    setupEventListeners() {
        // Quick start buttons
        document.getElementById('quickStartTimer')?.addEventListener('click', () => {
            app.navigateTo('pomodoro');
        });

        document.getElementById('quickStartStopwatch')?.addEventListener('click', () => {
            app.navigateTo('stopwatch');
        });

        document.getElementById('quickAskAI')?.addEventListener('click', () => {
            app.navigateTo('chatbot');
        });

        document.getElementById('quickJoinCommunity')?.addEventListener('click', () => {
            app.navigateTo('community');
        });

        // Pet interaction
        const pet = document.getElementById('studyPet');
        if (pet) {
            pet.addEventListener('click', () => {
                this.interactWithPet();
            });
        }
    }

    interactWithPet() {
        if (!this.currentUser.studyPet) return;
        
        const pet = this.currentUser.studyPet;
        
        // Increase happiness
        pet.happiness = Math.min(100, pet.happiness + 10);
        
        // Save changes
        this.currentUser.studyPet = pet;
        db.saveUser(this.currentUser);
        
        // Update display
        this.setupStudyPet();
        
        // Show feedback
        const messages = [
            "Yay! Your pet is happy! 🎉",
            "Good job! Pet is energized! ⚡",
            "Your study buddy loves the attention! ❤️",
            "Pet's happiness increased! 😊"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        app.showNotification('Pet Interaction', randomMessage, 'success');
        
        // Animate pet
        const petElement = document.getElementById('studyPet');
        petElement.classList.add('pet-bounce');
        setTimeout(() => petElement.classList.remove('pet-bounce'), 1000);
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('studyzen_demo') || 
                                   localStorage.getItem('studyzen_user') || 
                                   sessionStorage.getItem('studyzen_user') || '{}');
    
    if (currentUser.username || currentUser.isDemo) {
        dashboard = new Dashboard(currentUser.username || 'demo_user');
    }
});
