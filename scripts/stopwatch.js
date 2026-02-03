// Study Stopwatch
class StudyStopwatch {
    constructor(username) {
        this.username = username;
        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.lapTimes = [];
        this.currentSubject = 'General';
        this.sessionId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.setupSubjectSelection();
        this.loadPreviousSessions();
    }

    setupEventListeners() {
        document.getElementById('startStopwatch')?.addEventListener('click', () => this.start());
        document.getElementById('pauseStopwatch')?.addEventListener('click', () => this.pause());
        document.getElementById('lapStopwatch')?.addEventListener('click', () => this.recordLap());
        document.getElementById('resetStopwatch')?.addEventListener('click', () => this.stopAndSave());

        // Subject selection
        const subjectInput = document.getElementById('stopwatchSubject');
        if (subjectInput) {
            subjectInput.addEventListener('input', (e) => {
                this.currentSubject = e.target.value || 'General';
            });
        }
    }

    setupSubjectSelection() {
        const subjectTags = document.querySelectorAll('.stopwatch-subject-tag');
        if (subjectTags.length > 0) {
            subjectTags.forEach(tag => {
                tag.addEventListener('click', () => {
                    subjectTags.forEach(t => t.classList.remove('active'));
                    tag.classList.add('active');
                    this.currentSubject = tag.dataset.subject;
                });
            });
            subjectTags[0]?.classList.add('active');
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.updateButtons();
        
        // Start new session
        if (!this.sessionId) {
            this.sessionId = db.startSession(this.username, {
                type: 'stopwatch',
                subject: this.currentSubject
            }).id;
            
            app.showNotification('Study Session Started', `Tracking ${this.currentSubject} study time`, 'info');
        }
        
        this.update();
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.elapsedTime = Date.now() - this.startTime;
        this.updateButtons();
        
        app.showNotification('Session Paused', 'Take a break if needed', 'warning');
    }

    stopAndSave() {
        this.isRunning = false;
        
        // Save session if it exists
        if (this.sessionId) {
            const session = db.endSession(this.sessionId);
            this.sessionId = null;
            
            if (session) {
                this.showSessionSummary(session);
                this.updateUserStats();
                this.checkAchievements();
            }
        }
        
        // Reset stopwatch
        this.elapsedTime = 0;
        this.lapTimes = [];
        this.updateDisplay();
        this.updateLapList();
        this.updateButtons();
        
        app.showNotification('Session Saved', 'Study time recorded successfully', 'success');
    }

    recordLap() {
        if (!this.isRunning) return;
        
        const currentTime = Date.now() - this.startTime;
        const lapTime = this.lapTimes.length > 0 ? 
            currentTime - this.lapTimes[this.lapTimes.length - 1].totalTime : 
            currentTime;
        
        this.lapTimes.push({
            lapNumber: this.lapTimes.length + 1,
            lapTime: lapTime,
            totalTime: currentTime
        });
        
        this.updateLapList();
        
        // Play lap sound
        this.playSound('lap');
    }

    update() {
        if (!this.isRunning) return;
        
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
        
        requestAnimationFrame(() => this.update());
    }

    updateDisplay() {
        const totalSeconds = Math.floor(this.elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((this.elapsedTime % 1000) / 10);
        
        document.getElementById('stopwatchHours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('stopwatchMinutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('stopwatchSeconds').textContent = seconds.toString().padStart(2, '0');
        document.getElementById('stopwatchMilliseconds').textContent = milliseconds.toString().padStart(2, '0');
        
        // Pulse animation when running
        const display = document.querySelector('.stopwatch-display');
        if (this.isRunning && display) {
            display.classList.add('pulsing');
        } else {
            display.classList.remove('pulsing');
        }
    }

    updateLapList() {
        const container = document.getElementById('lapList');
        if (!container) return;
        
        if (this.lapTimes.length === 0) {
            container.innerHTML = `
                <div class="no-laps">
                    <i class="fas fa-flag"></i>
                    <p>No laps recorded yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.lapTimes.map(lap => `
            <div class="lap-item animate-fade-in">
                <div class="lap-number">Lap ${lap.lapNumber}</div>
                <div class="lap-time">${this.formatTime(lap.lapTime)}</div>
                <div class="lap-total">${this.formatTime(lap.totalTime)}</div>
            </div>
        `).join('');
    }

    updateButtons() {
        const startBtn = document.getElementById('startStopwatch');
        const pauseBtn = document.getElementById('pauseStopwatch');
        const resetBtn = document.getElementById('resetStopwatch');
        
        if (startBtn && pauseBtn && resetBtn) {
            startBtn.disabled = this.isRunning;
            pauseBtn.disabled = !this.isRunning;
            
            if (this.isRunning) {
                startBtn.classList.add('disabled');
                pauseBtn.classList.remove('disabled');
                resetBtn.textContent = 'Stop & Save';
            } else {
                startBtn.classList.remove('disabled');
                pauseBtn.classList.add('disabled');
                resetBtn.textContent = this.elapsedTime > 0 ? 'Stop & Save' : 'Reset';
            }
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '
