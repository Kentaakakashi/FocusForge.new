// Theme Management System
class ThemeManager {
    constructor(username) {
        this.username = username;
        this.currentUser = db.getUser(username);
        this.themes = JSON.parse(localStorage.getItem('studyzen_themes') || '[]');
        this.currentTheme = this.currentUser?.preferences?.theme || 'default';
        this.init();
    }

    init() {
        this.loadThemes();
        this.setupEventListeners();
        this.applyTheme(this.currentTheme);
        this.updateThemePreview();
    }

    loadThemes() {
        const container = document.getElementById('themesGrid');
        if (!container) return;

        container.innerHTML = this.themes.map(theme => `
            <div class="theme-card ${theme.id === this.currentTheme ? 'active' : ''}" 
                 data-theme="${theme.id}">
                <div class="theme-preview" style="background: ${theme.colors.bg || '#f5f7fa'};">
                    <div class="theme-elements">
                        <div class="theme-element" style="background: ${theme.colors.primary || '#667eea'};"></div>
                        <div class="theme-element" style="background: ${theme.colors.secondary || '#764ba2'};"></div>
                        <div class="theme-element" style="background: ${theme.colors.accent || '#f093fb'};"></div>
                    </div>
                </div>
                <div class="theme-info">
                    <h4>${theme.name}</h4>
                    <p>${this.getThemeDescription(theme.id)}</p>
                    <div class="theme-tags">
                        ${this.getThemeTags(theme.id).map(tag => `<span class="theme-tag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="apply-theme-btn" data-theme="${theme.id}">
                    ${theme.id === this.currentTheme ? '<i class="fas fa-check"></i> Applied' : 'Apply Theme'}
                </button>
            </div>
        `).join('');
    }

    getThemeDescription(themeId) {
        const descriptions = {
            'default': 'Clean and professional study environment',
            'lofi': 'Chill vibes with lofi aesthetics',
            'japanese': 'Peaceful Japanese garden inspired',
            'cozy': 'Warm and comfortable café style',
            'cyberpunk': 'Futuristic neon-lit interface',
            'dark': 'Easy on the eyes dark mode',
            'forest': 'Nature-inspired green theme',
            'sunset': 'Warm sunset color palette'
        };
        return descriptions[themeId] || 'Custom theme';
    }

    getThemeTags(themeId) {
        const tags = {
            'default': ['Professional', 'Clean'],
            'lofi': ['Chill', 'Music', 'Relax'],
            'japanese': ['Calm', 'Minimal', 'Nature'],
            'cozy': ['Warm', 'Comfort', 'Café'],
            'cyberpunk': ['Futuristic', 'Neon', 'Dark'],
            'dark': ['Eye-friendly', 'Modern'],
            'forest': ['Nature', 'Green', 'Fresh'],
            'sunset': ['Warm', 'Orange', 'Relax']
        };
        return tags[themeId] || ['Custom'];
    }

    setupEventListeners() {
        // Theme selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.apply-theme-btn')) {
                const themeId = e.target.closest('.apply-theme-btn').dataset.theme;
                this.applyTheme(themeId);
            }
            
            if (e.target.closest('.theme-card')) {
                const themeCard = e.target.closest('.theme-card');
                const themeId = themeCard.dataset.theme;
                this.previewTheme(themeId);
            }
        });

        // Custom theme creator
        document.getElementById('createCustomTheme')?.addEventListener('click', () => {
            this.showCustomThemeCreator();
        });

        // Reset to default
        document.getElementById('resetTheme')?.addEventListener('click', () => {
            this.applyTheme('default');
        });

        // Save theme preferences
        document.getElementById('saveThemePrefs')?.addEventListener('click', () => {
            this.saveThemePreferences();
        });
    }

    applyTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;

        this.currentTheme = themeId;
        
        // Update CSS variables
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}-color`, value);
        });

        // Update background if theme has one
        if (theme.background) {
            document.body.style.background = theme.background;
        } else {
            document.body.style.background = theme.colors.bg || '#f5f7fa';
        }

        // Update theme cards
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.toggle('active', card.dataset.theme === themeId);
        });

        // Update apply buttons
        document.querySelectorAll('.apply-theme-btn').forEach(btn => {
            if (btn.dataset.theme === themeId) {
                btn.innerHTML = '<i class="fas fa-check"></i> Applied';
                btn.classList.add('applied');
            } else {
                btn.textContent = 'Apply Theme';
                btn.classList.remove('applied');
            }
        });

        // Save to user preferences
        if (this.currentUser) {
            this.currentUser.preferences.theme = themeId;
            db.saveUser(this.currentUser);
        }

        // Show notification
        app.showNotification('Theme Applied', `${theme.name} theme activated`, 'success');

        // Play theme sound if available
        this.playThemeSound(themeId);

        // Add transition effect
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 1000);
    }

    previewTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;

        const preview = document.getElementById('themePreview');
        if (preview) {
            preview.innerHTML = `
                <div class="preview-header">
                    <h3>${theme.name} Preview</h3>
                    <button class="close-preview"><i class="fas fa-times"></i></button>
                </div>
                <div class="preview-content" style="background: ${theme.colors.bg}; color: ${theme.colors.text};">
                    <div class="preview-sidebar" style="background: ${theme.colors.primary};">
                        <div class="preview-logo"></div>
                        <div class="preview-nav">
                            <div class="preview-nav-item"></div>
                            <div class="preview-nav-item"></div>
                            <div class="preview-nav-item"></div>
                        </div>
                    </div>
                    <div class="preview-main">
                        <div class="preview-card" style="background: ${theme.colors.card || theme.colors.bg};">
                            <div class="preview-title" style="color: ${theme.colors.text};"></div>
                            <div class="preview-content" style="color: ${theme.colors.text};"></div>
                            <button class="preview-btn" style="background: ${theme.colors.primary}; color: white;"></button>
                        </div>
                    </div>
                </div>
                <div class="preview-actions">
                    <button class="btn-secondary close-preview">Close</button>
                    <button class="btn-primary" onclick="themeManager.applyTheme('${themeId}')">Apply Theme</button>
                </div>
            `;

            // Close buttons
            preview.querySelectorAll('.close-preview').forEach(btn => {
                btn.addEventListener('click', () => {
                    preview.classList.remove('active');
                });
            });

            preview.classList.add('active');
        }
    }

    playThemeSound(themeId) {
        const sounds = {
            'lofi': 'https://assets.mixkit.co/music/preview/mixkit-chill-abstract-loop-229.mp3',
            'japanese': 'https://assets.mixkit.co/music/preview/mixkit-japanese-temple-231.mp3',
            'cozy': 'https://assets.mixkit.co/music/preview/mixkit-cozy-sunday-230.mp3'
        };

        if (sounds[themeId]) {
            const audio = new Audio(sounds[themeId]);
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Theme sound play failed:', e));
        }
    }

    updateThemePreview() {
        const currentTheme = this.themes.find(t => t.id === this.currentTheme);
        if (!currentTheme) return;

        const preview = document.querySelector('.current-theme-preview');
        if (preview) {
            preview.style.background = currentTheme.colors.bg;
            preview.style.borderColor = currentTheme.colors.primary;
        }

        const themeName = document.querySelector('.current-theme-name');
        if (themeName) {
            themeName.textContent = currentTheme.name;
        }
    }

    showCustomThemeCreator() {
        const creator = document.createElement('div');
        creator.className = 'theme-creator-modal';
        creator.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-palette"></i> Create Custom Theme</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="color-pickers">
                        <div class="color-picker">
                            <label>Primary Color</label>
                            <input type="color" id="primaryColor" value="#667eea">
                        </div>
                        <div class="color-picker">
                            <label>Secondary Color</label>
                            <input type="color" id="secondaryColor" value="#764ba2">
                        </div>
                        <div class="color-picker">
                            <label>Accent Color</label>
                            <input type="color" id="accentColor" value="#f093fb">
                        </div>
                        <div class="color-picker">
                            <label>Background</label>
                            <input type="color" id="backgroundColor" value="#f5f7fa">
                        </div>
                        <div class="color-picker">
                            <label>Text Color</label>
                            <input type="color" id="textColor" value="#333333">
                        </div>
                    </div>
                    
                    <div class="theme-preview" id="customThemePreview">
                        <div class="preview-demo">
                            <div class="demo-sidebar"></div>
                            <div class="demo-main">
                                <div class="demo-card"></div>
                                <div class="demo-button"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="theme-settings">
                        <div class="setting">
                            <label>Theme Name</label>
                            <input type="text" id="themeName" placeholder="My Custom Theme">
                        </div>
                        <div class="setting">
                            <label>Theme Description</label>
                            <textarea id="themeDescription" placeholder="Describe your theme..."></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Cancel</button>
                    <button class="btn-primary" id="saveCustomTheme">Save Theme</button>
                </div>
            </div>
        `;

        document.body.appendChild(creator);

        // Close modal
        creator.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => creator.remove());
        });

        // Update preview when colors change
        const colorInputs = creator.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('input', () => this.updateCustomThemePreview());
        });

        // Save theme
        creator.querySelector('#saveCustomTheme').addEventListener('click', () => {
            this.saveCustomTheme();
            creator.remove();
        });

        // Initial preview update
        this.updateCustomThemePreview();
    }

    updateCustomThemePreview() {
        const preview = document.getElementById('customThemePreview');
        if (!preview) return;

        const primaryColor = document.getElementById('primaryColor')?.value || '#667eea';
        const secondaryColor = document.getElementById('secondaryColor')?.value || '#764ba2';
        const accentColor = document.getElementById('accentColor')?.value || '#f093fb';
        const backgroundColor = document.getElementById('backgroundColor')?.value || '#f5f7fa';
        const textColor = document.getElementById('textColor')?.value || '#333333';

        preview.style.setProperty('--primary-color', primaryColor);
        preview.style.setProperty('--secondary-color', secondaryColor);
        preview.style.setProperty('--accent-color', accentColor);
        preview.style.setProperty('--bg-color', backgroundColor);
        preview.style.setProperty('--text-color', textColor);
    }

    saveCustomTheme() {
        const name = document.getElementById('themeName')?.value || 'Custom Theme';
        const description = document.getElementById('themeDescription')?.value || 'My custom theme';
        
        const newTheme = {
            id: 'custom_' + Date.now(),
            name: name,
            description: description,
            colors: {
                primary: document.getElementById('primaryColor')?.value || '#667eea',
                secondary: document.getElementById('secondaryColor')?.value || '#764ba2',
                accent: document.getElementById('accentColor')?.value || '#f093fb',
                bg: document.getElementById('backgroundColor')?.value || '#f5f7fa',
                text: document.getElementById('textColor')?.value || '#333333'
            },
            isCustom: true
        };

        // Add to themes list
        this.themes.push(newTheme);
        localStorage.setItem('studyzen_themes', JSON.stringify(this.themes));

        // Apply new theme
        this.applyTheme(newTheme.id);

        // Reload themes display
        this.loadThemes();

        app.showNotification('Theme Created', `${name} has been saved`, 'success');
    }

    saveThemePreferences() {
        if (!this.currentUser) return;

        // Save additional theme preferences
        const preferences = {
            autoThemeSwitch: document.getElementById('autoThemeSwitch')?.checked || false,
            darkModeSchedule: document.getElementById('darkModeSchedule')?.value || 'auto',
            animationIntensity: document.getElementById('animationIntensity')?.value || 'medium'
        };

        this.currentUser.preferences.themeSettings = preferences;
        db.saveUser(this.currentUser);

        app.showNotification('Preferences Saved', 'Theme preferences updated', 'success');
    }
}

// Initialize theme manager
let themeManager;
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('studyzen_demo') || 
                                   localStorage.getItem('studyzen_user') || 
                                   sessionStorage.getItem('studyzen_user') || '{}');
    
    if (currentUser.username || currentUser.isDemo) {
        themeManager = new ThemeManager(currentUser.username || 'demo_user');
    }
});
