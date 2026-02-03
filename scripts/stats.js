// Statistics Dashboard
class StudyStats {
    constructor(username) {
        this.username = username;
        this.currentUser = db.getUser(username);
        this.init();
    }

    init() {
        this.loadStats();
        this.setupCharts();
        this.setupEventListeners();
        this.loadAchievements();
        this.loadStudyPatterns();
    }

    loadStats() {
        if (!this.currentUser) return;

        // Update main stats
        document.getElementById('totalStudyHours').textContent = 
            Math.floor(this.currentUser.stats.totalStudyTime / 3600);
        
        document.getElementById('currentStreakStats').textContent = 
            this.currentUser.stats.currentStreak;
        
        document.getElementById('longestStreak').textContent = 
            this.currentUser.stats.longestStreak;
        
        document.getElementById('pomodoroSessions').textContent = 
            this.currentUser.stats.pomodoroSessions || 0;

        // Update subject breakdown
        this.updateSubjectBreakdown();

        // Update weekly summary
        this.updateWeeklySummary();

        // Update productivity score
        this.updateProductivityScore();
    }

    updateSubjectBreakdown() {
        const subjects = this.currentUser.stats.subjects || {};
        const subjectList = Object.entries(subjects);
        
        if (subjectList.length === 0) {
            document.getElementById('subjectBreakdown').innerHTML = `
                <div class="no-data">
                    <i class="fas fa-book-open"></i>
                    <p>No subject data yet. Start studying to see stats!</p>
                </div>
            `;
            return;
        }

        // Sort by time spent
        subjectList.sort((a, b) => b[1] - a[1]);
        const totalTime = subjectList.reduce((sum, [_, time]) => sum + time, 0);

        const breakdownHTML = subjectList.map(([subject, time]) => {
            const percentage = Math.round((time / totalTime) * 100);
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            
            return `
                <div class="subject-item">
                    <div class="subject-header">
                        <span class="subject-name">${subject}</span>
                        <span class="subject-percentage">${percentage}%</span>
                    </div>
                    <div class="subject-bar">
                        <div class="subject-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="subject-time">${hours}h ${minutes}m</div>
                </div>
            `;
        }).join('');

        document.getElementById('subjectBreakdown').innerHTML = breakdownHTML;
    }

    updateWeeklySummary() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions.filter(s => 
            s.username === this.username && s.completed
        );

        // Group by day of week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayStats = days.map(() => 0);
        
        userSessions.forEach(session => {
            const day = new Date(session.endTime).getDay();
            dayStats[day] += session.duration || 0;
        });

        // Find best and worst days
        const dayHours = dayStats.map(seconds => Math.floor(seconds / 3600));
        const maxHours = Math.max(...dayHours);
        const minHours = Math.min(...dayHours.filter(h => h > 0));
        
        const bestDayIndex = dayHours.indexOf(maxHours);
        const worstDayIndex = dayHours.indexOf(minHours);

        document.getElementById('bestDay').textContent = days[bestDayIndex];
        document.getElementById('worstDay').textContent = days[worstDayIndex];
        document.getElementById('avgDailyStudy').textContent = 
            Math.floor(dayHours.reduce((a, b) => a + b, 0) / 7) + 'h';
    }

    updateProductivityScore() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions.filter(s => 
            s.username === this.username && s.completed
        );

        if (userSessions.length === 0) {
            document.getElementById('productivityScore').textContent = 'N/A';
            return;
        }

        // Simple productivity calculation
        const totalTime = this.currentUser.stats.totalStudyTime || 0;
        const streakBonus = this.currentUser.stats.currentStreak * 5;
        const subjectBonus = Object.keys(this.currentUser.stats.subjects || {}).length * 10;
        
        let score = Math.floor(totalTime / 3600) + streakBonus + subjectBonus;
        score = Math.min(score, 100); // Cap at 100

        document.getElementById('productivityScore').textContent = score;
        
        // Update score indicator
        const scoreElement = document.querySelector('.productivity-score-circle');
        if (scoreElement) {
            const progress = (score / 100) * 283; // Circumference
            scoreElement.style.strokeDasharray = `${progress} 283`;
            
            // Set color based on score
            if (score >= 80) {
                scoreElement.style.stroke = '#4CAF50';
            } else if (score >= 60) {
                scoreElement.style.stroke = '#FFC107';
            } else {
                scoreElement.style.stroke = '#FF5722';
            }
        }
    }

    setupCharts() {
        this.createDailyChart();
        this.createSubjectChart();
        this.createProductivityChart();
    }

    createDailyChart() {
        const canvas = document.getElementById('dailyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        // Get session data for last 7 days
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const now = new Date();
        const dailyData = days.map(() => 0);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            const daySessions = sessions.filter(s => 
                s.username === this.username && 
                s.completed &&
                new Date(s.endTime) >= dayStart &&
                new Date(s.endTime) <= dayEnd
            );
            
            const dayTotal = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            dailyData[6 - i] = Math.floor(dayTotal / 3600); // Convert to hours
        }
        
        // Draw chart
        const maxData = Math.max(...dailyData, 1);
        const barWidth = 40;
        const spacing = 30;
        const maxHeight = 150;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bars with gradient
        dailyData.forEach((value, index) => {
            const x = 50 + index * (barWidth + spacing);
            const height = (value / maxData) * maxHeight;
            const y = 200 - height;
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(0, y, 0, 200);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0.2)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, height);
            
            // Draw value
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(value + 'h', x + barWidth/2, y - 10);
            
            // Draw day label
            ctx.fillStyle = '#666';
            ctx.font = '12px Poppins';
            ctx.fillText(days[index], x + barWidth/2, 220);
        });
        
        // Draw axis
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 50);
        ctx.lineTo(40, 200);
        ctx.lineTo(400, 200);
        ctx.stroke();
    }

    createSubjectChart() {
        const canvas = document.getElementById('subjectChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const subjects = Object.entries(this.currentUser.stats.subjects || {});
        
        if (subjects.length === 0) return;
        
        // Sort and take top 5
        subjects.sort((a, b) => b[1] - a[1]);
        const topSubjects = subjects.slice(0, 5);
        const totalTime = topSubjects.reduce((sum, [_, time]) => sum + time, 0);
        
        // Draw pie chart
        let startAngle = 0;
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4CAF50', '#FFC107'];
        const centerX = 150;
        const centerY = 100;
        const radius = 80;
        
        topSubjects.forEach(([subject, time], index) => {
            const percentage = time / totalTime;
            const endAngle = startAngle + (percentage * 2 * Math.PI);
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            // Draw label
            const angle = startAngle + (endAngle - startAngle) / 2;
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 11px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(subject, labelX, labelY);
            
            // Draw percentage
            ctx.fillStyle = '#666';
            ctx.font = '10px Poppins';
            ctx.fillText(Math.round(percentage * 100) + '%', labelX, labelY + 15);
            
            startAngle = endAngle;
        });
    }

    createProductivityChart() {
        const canvas = document.getElementById('productivityChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const hours = Array.from({length: 24}, (_, i) => i);
        
        // Get session data by hour
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions.filter(s => 
            s.username === this.username && s.completed
        );
        
        const hourlyData = hours.map(() => 0);
        userSessions.forEach(session => {
            const hour = new Date(session.endTime).getHours();
            hourlyData[hour] += session.duration || 0;
        });
        
        // Convert to hours and find max
        const hourlyHours = hourlyData.map(seconds => Math.floor(seconds / 3600));
        const maxHours = Math.max(...hourlyHours, 1);
        
        // Draw line chart
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        hourlyHours.forEach((value, hour) => {
            const x = 50 + (hour * 15);
            const y = 150 - (value / maxHours) * 100;
            
            if (hour === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw data points
        hourlyHours.forEach((value, hour) => {
            const x = 50 + (hour * 15);
            const y = 150 - (value / maxHours) * 100;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#667eea';
            ctx.fill();
            
            // Draw hour label
            ctx.fillStyle = '#666';
            ctx.font = '10px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(hour.toString().padStart(2, '0') + ':00', x, 170);
        });
        
        // Draw axis
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 50);
        ctx.lineTo(40, 150);
        ctx.lineTo(410, 150);
        ctx.stroke();
    }

    loadAchievements() {
        const achievements = this.currentUser.achievements || [];
        const container = document.getElementById('achievementsList');
        
        if (!container) return;
        
        if (achievements.length === 0) {
            container.innerHTML = `
                <div class="no-achievements">
                    <i class="fas fa-trophy"></i>
                    <p>No achievements yet. Keep studying to unlock!</p>
                </div>
            `;
            return;
        }
        
        const achievementHTML = achievements.map(achievementId => {
            const achievement = this.getAchievementInfo(achievementId);
            return `
                <div class="achievement-card">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.title}</h4>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = achievementHTML;
    }

    getAchievementInfo(id) {
        const achievements = {
            'first_hour': {
                title: 'First Hour',
                description: 'Complete 1 hour of total study time',
                icon: '⏰'
            },
            'week_streak': {
                title: 'Weekly Warrior',
                description: 'Maintain a 7-day study streak',
                icon: '🔥'
            },
            'subject_explorer': {
                title: 'Subject Explorer',
                description: 'Study 3 different subjects',
                icon: '📚'
            }
        };
        
        return achievements[id] || {
            title: 'Achievement',
            description: 'Unlocked achievement',
            icon: '🏆'
        };
    }

    loadStudyPatterns() {
        const sessions = JSON.parse(localStorage.getItem('studyzen_sessions') || '[]');
        const userSessions = sessions.filter(s => 
            s.username === this.username && s.completed
        );
        
        if (userSessions.length === 0) return;
        
        // Calculate average session length
        const totalDuration = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSessionMinutes = Math.floor((totalDuration / userSessions.length) / 60);
        
        // Find most productive time
        const hourlyData = Array.from({length: 24}, () => 0);
        userSessions.forEach(session => {
            const hour = new Date(session.endTime).getHours();
            hourlyData[hour] += session.duration || 0;
        });
        
        const mostProductiveHour = hourlyData.indexOf(Math.max(...hourlyData));
        
        // Update UI
        document.getElementById('avgSessionLength').textContent = avgSessionMinutes + ' minutes';
        document.getElementById('mostProductiveTime').textContent = 
            mostProductiveHour.toString().padStart(2, '0') + ':00';
        
        // Calculate consistency score
        const daysStudied = new Set(userSessions.map(s => 
            new Date(s.endTime).toDateString()
        )).size;
        
        const totalDays = Math.floor(
            (new Date() - new Date(userSessions[0].endTime)) / (1000 * 60 * 60 * 24)
        ) + 1;
        
        const consistencyScore = Math.round((daysStudied / Math.min(totalDays, 30)) * 100);
        document.getElementById('consistencyScore').textContent = consistencyScore + '%';
    }

    setupEventListeners() {
        // Export buttons
        document.getElementById('exportStats')?.addEventListener('click', () => this.exportStats());
        document.getElementById('shareStats')?.addEventListener('click', () => this.shareStats());
        
        // Time range selector
        document.getElementById('timeRange')?.addEventListener('change', (e) => {
            this.updateTimeRange(e.target.value);
        });
        
        // Refresh button
        document.getElementById('refreshStats')?.addEventListener('click', () => {
            this.init();
            app.showNotification('Stats Refreshed', 'Updated with latest data', 'info');
        });
    }

    exportStats() {
        const stats = {
            user: this.currentUser.username,
            displayName: this.currentUser.displayName,
            totalStudyHours: Math.floor(this.currentUser.stats.totalStudyTime / 3600),
            currentStreak: this.currentUser.stats.currentStreak,
            longestStreak: this.currentUser.stats.longestStreak,
            subjects: this.currentUser.stats.subjects,
            achievements: this.currentUser.achievements,
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(stats, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `StudyZen_Stats_${this.currentUser.username}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        app.showNotification('Stats Exported', 'Download started successfully', 'success');
    }

    shareStats() {
        const totalHours = Math.floor(this.currentUser.stats.totalStudyTime / 3600);
        const streak = this.currentUser.stats.currentStreak;
        
        const shareText = `I've studied for ${totalHours} hours with a ${streak}-day streak on StudyZen! 🚀\n\nCheck out my progress and join me at StudyZen!`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            app.showNotification('Copied to Clipboard', 'Share your stats with friends!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            app.showNotification('Copied to Clipboard', 'Share your stats with friends!', 'success');
        });
    }

    updateTimeRange(range) {
        // This would filter data based on time range
        // For now, just reload stats
        this.init();
        app.showNotification('Time Range Updated', `Showing data for ${range}`, 'info');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('studyzen_demo') || 
                                   localStorage.getItem('studyzen_user') || 
                                   sessionStorage.getItem('studyzen_user') || '{}');
    
    if (currentUser.username || currentUser.isDemo) {
        window.studyStats = new StudyStats(currentUser.username || 'demo_user');
    }
});
