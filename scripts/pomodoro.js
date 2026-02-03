// Pomodoro Timer
class PomodoroTimer {
    constructor(username) {
        this.username = username;
        this.isRunning = false;
        this.isBreak = false;
        this.currentSession = 0;
        this.timer = null;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.settings = this.loadSettings();
        this.currentSubject = 'General';
        this.init();
    }

    init() {
        this.loadStats();
        this.setupEventListeners();
        this.updateDisplay();
        this.setupSubjectSelection();
    }

    loadSettings() {
        const user = db.getUser(this.username);
        return {
            focusTime: user?.preferences?.pomodoro?.focusTime || 25,
            breakTime: user?.preferences?.pomodoro?.breakTime || 5,
            longBreakTime: user?.preferences?.pomodoro?.longBreakTime || 15,
            sessionsBeforeLongBreak: user?.preferences?.pomodoro?.sessionsBeforeLongBreak || 4,
            autoStartBreaks: user?.preferences?.pomodoro?.autoStartBreaks || false,
            soundEnabled: user?.preferences?.pomodoro?.soundEnabled || true
        };
    }

    setupEventListeners() {
        // Timer controls
        document.getElementById('startTimer')?.addEventListener('click', () => this.startTimer());
        document.getElementById('pauseTimer')?.addEventListener('click', () => this.pauseTimer());
        document.getElementById('resetTimer')?.addEventListener('click', () => this.resetTimer());
        document.getElementById('skipTimer')?.addEventListener('click', () => this.skipTimer());

        // Settings inputs
        document.getElementById('focusTime')?.addEventListener('change', (e) => {
            this.settings.focusTime = parseInt(e.target.value);
            if (!this.isRunning) {
                this.timeLeft = this.settings.focusTime * 60;
                this.updateDisplay();
            }
        });

        document.getElementById('breakTime')?.addEventListener('change', (e) => {
            this.settings.breakTime = parseInt(e.target.value);
        });

        document.getElementById('longBreakTime')?.addEventListener('change', (e) => {
            this.settings.longBreakTime = parseInt(e.target.value);
        });

        document.getElementById('sessionsBeforeLongBreak')?.addEventListener('change', (e) => {
            this.settings.sessionsBeforeLongBreak = parseInt(e.target.value);
        });

        // Save settings when leaving page
        window.addEventListener('beforeunload', () => {
            this.saveSettings();
        });
    }

    setupSubjectSelection() {
        const tags = document.querySelectorAll('.subject-tag');
        tags.forEach(tag => {
            tag.addEventListener('click', () => {
                // Remove active class from all tags
                tags.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tag
                tag.classList.add('active');
                this.currentSubject = tag.dataset.subject;
            });
        });

        const customInput = document.getElementById('customSubject');
        if (customInput) {
            customInput.addEventListener('input', (e) => {
                this.currentSubject = e.target.value || 'General';
                // Remove active class from all tags
                tags.forEach(t => t.classList.remove('active'));
            });
        }

        // Set default active
        tags[0]?.classList.add('active');
    }

    startTimer() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateButtons();
        
        // Start session if not already started
        if (!this.sessionId) {
            this.sessionId = db.startSession(this.username, {
                type: 'pomodoro',
                subject: this.currentSubject
            }).id;
        }
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 0) {
                this.completeTimer();
            }
        }, 1000);
        
        // Update UI
        document.querySelector('.timer-circle').classList.add('running');
        this.updateTimerLabel();
        
        // Show notification
        if (!this.isBreak) {
            app.showNotification('Focus Time Started', `Focus on ${this.currentSubject} for ${this.settings.focusTime} minutes`, 'info');
        }
    }

    pauseTimer() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.timer);
        this.updateButtons();
        
        document.querySelector('.timer-circle').classList.remove('running');
        app.showNotification('Timer Paused', 'Take a moment if needed', 'warning');
    }

    resetTimer() {
        this.pauseTimer();
        this.isBreak = false;
        this.timeLeft = this.settings.focusTime * 60;
        this.updateDisplay();
        this.updateTimerLabel();
        
        // Clear session if exists
        if (this.sessionId) {
            this.sessionId = null;
        }
        
        document.querySelector('.timer-circle').classList.remove('running');
        app.showNotification('Timer Reset', 'Ready for a fresh start', 'info');
    }

    skipTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        }
        
        this.isBreak = !this.isBreak;
        this.currentSession++;
        
        if (this.isBreak) {
            // Determine break type
            const isLongBreak = this.currentSession % this.settings.sessionsBeforeLongBreak === 0;
            const breakMinutes = isLongBreak ? this.settings.longBreakTime : this.settings.breakTime;
            
            this.timeLeft = breakMinutes * 60;
            
            // Complete focus session
            if (this.sessionId) {
                db.endSession(this.sessionId);
                this.sessionId = null;
                this.updateStats();
                this.checkAchievements();
            }
            
            app.showNotification(
                isLongBreak ? 'Long Break Time!' : 'Break Time!',
                `Take a ${breakMinutes} minute break`,
                'success'
            );
        } else {
            this.timeLeft = this.settings.focusTime * 60;
            app.showNotification('Back to Work!', 'Focus time starting', 'info');
        }
        
        this.updateDisplay();
        this.updateTimerLabel();
        
        // Auto-start if enabled
        if (this.settings.autoStartBreaks) {
            setTimeout(() => this.startTimer(), 1000);
        }
    }

    completeTimer() {
        this.pauseTimer();
        
        if (!this.isBreak) {
            // Complete focus session
            if (this.sessionId) {
                db.endSession(this.sessionId);
                this.sessionId = null;
                this.updateStats();
                this.checkAchievements();
            }
            
            // Start break automatically
            this.skipTimer();
            
            // Play completion sound
            this.playCompletionSound();
            
            // Show celebration
            this.showCompletionCelebration();
        } else {
            // Break completed, back to focus
            this.skipTimer();
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        document.getElementById('timerMinutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('timerSeconds').textContent = seconds.toString().padStart(2, '0');
        
        // Update progress circle
        const totalTime = this.isBreak ? 
            (this.currentSession % this.settings.sessionsBeforeLongBreak === 0 ? 
                this.settings.longBreakTime : this.settings.breakTime) * 60 : 
            this.settings.focusTime * 60;
        
        const progress = ((totalTime - this.timeLeft) / totalTime) * 100;
        this.updateProgressCircle(progress);
    }

    updateProgressCircle(progress) {
        const circle = document.querySelector('.timer-progress');
        if (circle) {
            const radius = 45;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (progress / 100) * circumference;
            
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }
    }

    updateTimerLabel() {
        const label = document.getElementById('timerLabel');
        if (label) {
            if (this.isBreak) {
                const isLongBreak = this.currentSession % this.settings.sessionsBeforeLongBreak === 0;
                label.textContent = isLongBreak ? 'Long Break' : 'Short Break';
                label.style.color = '#4CAF50';
            } else {
                label.textContent = 'Focus Time';
                label.style.color = '#667eea';
            }
        }
    }

    updateButtons() {
        const startBtn = document.getElementById('startTimer');
        const pauseBtn = document.getElementById('pauseTimer');
        
        if (startBtn && pauseBtn) {
            startBtn.disabled = this.isRunning;
            pauseBtn.disabled = !this.isRunning;
            
            if (this.isRunning) {
                startBtn.classList.add('disabled');
                pauseBtn.classList.remove('disabled');
            } else {
                startBtn.classList.remove('disabled');
                pauseBtn.classList.add('disabled');
            }
        }
    }

    updateStats() {
        const user = db.getUser(this.username);
        if (!user) return;
        
        user.stats.pomodoroSessions = (user.stats.pomodoroSessions || 0) + 1;
        db.saveUser(user);
        
        // Update display
        document.getElementById('completedSessions').textContent = user.stats.pomodoroSessions;
        document.getElementById('focusStreak').textContent = user.stats.currentStreak;
        document.getElementById('totalFocusTime').textContent = db.formatTime(user.stats.totalStudyTime);
    }

    checkAchievements() {
        const achievements = db.checkAchievements(this.username);
        achievements.forEach(achievement => {
            app.showNotification(
                'Achievement Unlocked!',
                achievement.title,
                'success'
            );
        });
    }

    loadStats() {
        const user = db.getUser(this.username);
        if (!user) return;
        
        document.getElementById('completedSessions').textContent = user.stats.pomodoroSessions || 0;
        document.getElementById('focusStreak').textContent = user.stats.currentStreak || 0;
        document.getElementById('totalFocusTime').textContent = db.formatTime(user.stats.totalStudyTime || 0);
    }

    saveSettings() {
        const user = db.getUser(this.username);
        if (!user) return;
        
        if (!user.preferences.pomodoro) {
            user.preferences.pomodoro = {};
        }
        
        user.preferences.pomodoro = {
            ...user.preferences.pomodoro,
            ...this.settings
        };
        
        db.saveUser(user);
    }

    playCompletionSound() {
        if (!this.settings.soundEnabled) return;
        
        try {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (error) {
            console.log('Sound error:', error);
        }
    }

    showCompletionCelebration() {
        // Create confetti
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 30);
        }
        
        // Flash effect
        document.querySelector('.timer-circle').classList.add('celebrate');
        setTimeout(() => {
            document.querySelector('.timer-circle').classList.remove('celebrate');
        }, 1000);
    }

    createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 10 + 5 + 'px';
        
        document.querySelector('.timer-display').appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => confetti.remove(), 5000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('studyzen_demo') || 
                                   localStorage.getItem('studyzen_user') || 
                                   sessionStorage.getItem('studyzen_user') || '{}');
    
    if (currentUser.username || currentUser.isDemo) {
        window.pomodoroTimer = new PomodoroTimer(currentUser.username || 'demo_user');
    }
});
