import { getVirtualWidth, getVirtualHeight, isMobileDevice } from '../core/viewport.js';

export class StartMenu {
    constructor(game) {
        this.game = game;
        this.isMobile = isMobileDevice();

        // Form state
        this.nickInput = '';
        this.emailInput = '';
        this.activeField = 'nick'; // 'nick' or 'email'
        this.error = '';

        // Load saved player data from localStorage
        this.loadPlayerData();

        // Layout - more compact
        this.width = this.isMobile ? 500 : 420;
        this.height = this.isMobile ? 650 : 520;

        // Start button
        this.startButton = {
            x: 0, y: 0,
            width: this.isMobile ? 200 : 180,
            height: this.isMobile ? 50 : 45,
            isHovered: false
        };

        // Input fields - positioned on right side of labels
        this.nickField = {
            x: 0, y: 0,
            width: this.isMobile ? 220 : 200,
            height: this.isMobile ? 40 : 35,
            active: false,
            labelWidth: 80 // Width reserved for label on left
        };
        this.emailField = {
            x: 0, y: 0,
            width: this.isMobile ? 220 : 200,
            height: this.isMobile ? 40 : 35,
            active: false,
            labelWidth: 80 // Width reserved for label on left
        };

        this.setupLayout();
    }

    setupLayout() {
        const vw = getVirtualWidth();
        const vh = getVirtualHeight();
        const centerX = vw / 2;
        const centerY = vh / 2;

        // Center the form
        const formX = centerX - this.width / 2;
        const formY = centerY - this.height / 2;

        // Input fields positions (label on left, input on right)
        const fieldsStartY = this.isMobile ? formY + 180 : formY + 230;
        const formContentWidth = 300; // Total width for label + input
        const formContentStartX = centerX - formContentWidth / 2;

        // Input fields start after label
        this.nickField.x = formContentStartX + this.nickField.labelWidth + 10;
        this.nickField.y = fieldsStartY;
        this.nickField.labelX = formContentStartX;

        this.emailField.x = formContentStartX + this.emailField.labelWidth + 10;
        this.emailField.y = fieldsStartY + (this.isMobile ? 80 : 70);
        this.emailField.labelX = formContentStartX;

        // Start button position
        this.startButton.x = centerX - this.startButton.width / 2;
        this.startButton.y = fieldsStartY + (this.isMobile ? 180 : 160);
    }

    update(mouseX, mouseY) {
        // Check if mouse is over start button
        if (mouseX >= this.startButton.x && mouseX <= this.startButton.x + this.startButton.width &&
            mouseY >= this.startButton.y && mouseY <= this.startButton.y + this.startButton.height) {
            this.startButton.isHovered = true;
        } else {
            this.startButton.isHovered = false;
        }
    }

    handleClick(mouseX, mouseY) {
        // Check nick field click
        if (mouseX >= this.nickField.x && mouseX <= this.nickField.x + this.nickField.width &&
            mouseY >= this.nickField.y && mouseY <= this.nickField.y + this.nickField.height) {
            this.activeField = 'nick';
            this.nickField.active = true;
            this.emailField.active = false;
            return;
        }

        // Check email field click
        if (mouseX >= this.emailField.x && mouseX <= this.emailField.x + this.emailField.width &&
            mouseY >= this.emailField.y && mouseY <= this.emailField.y + this.emailField.height) {
            this.activeField = 'email';
            this.emailField.active = true;
            this.nickField.active = false;
            return;
        }

        // Check start button click
        if (this.startButton.isHovered) {
            return this.validateAndStart();
        }

        // Click outside - deactivate fields
        this.nickField.active = false;
        this.emailField.active = false;

        return false;
    }

    handleKeyPress(key) {
        if (key === 'Enter') {
            if (this.activeField === 'nick') {
                this.activeField = 'email';
                this.nickField.active = false;
                this.emailField.active = true;
            } else {
                return this.validateAndStart();
            }
            return false;
        }

        if (key === 'Backspace') {
            if (this.activeField === 'nick' && this.nickInput.length > 0) {
                this.nickInput = this.nickInput.slice(0, -1);
            } else if (this.activeField === 'email' && this.emailInput.length > 0) {
                this.emailInput = this.emailInput.slice(0, -1);
            }
            return false;
        }

        // Add character to active field
        if (key.length === 1) {
            if (this.activeField === 'nick' && this.nickInput.length < 20) {
                this.nickInput += key;
            } else if (this.activeField === 'email' && this.emailInput.length < 40) {
                this.emailInput += key;
            }
        }

        return false;
    }

    loadPlayerData() {
        // Load player data from localStorage
        try {
            const saved = localStorage.getItem('spaceInvPlayerData');
            if (saved) {
                const data = JSON.parse(saved);
                this.nickInput = data.nick || '';
                this.emailInput = data.email || '';
            }
        } catch (e) {
            console.error('Error loading player data:', e);
        }
    }

    savePlayerData(nick, email) {
        // Save player data to localStorage
        try {
            localStorage.setItem('spaceInvPlayerData', JSON.stringify({
                nick: nick,
                email: email
            }));
        } catch (e) {
            console.error('Error saving player data:', e);
        }
    }

    validateAndStart() {
        // Validate nick (required)
        if (this.nickInput.trim().length === 0) {
            this.error = 'Nick jest wymagany!';
            return false;
        }

        if (this.nickInput.trim().length < 2) {
            this.error = 'Nick musi mieć min. 2 znaki!';
            return false;
        }

        // Validate email (required, min 1 character, no format validation)
        if (this.emailInput.trim().length === 0) {
            this.error = 'Email jest wymagany!';
            return false;
        }

        this.error = '';

        const playerData = {
            nick: this.nickInput.trim(),
            email: this.emailInput.trim()
        };

        // Save to localStorage
        this.savePlayerData(playerData.nick, playerData.email);

        return playerData;
    }

    drawKey(x, y, size, label) {
        // Draw a keyboard key
        push();

        // Key background with gradient effect
        fill(40, 40, 60);
        stroke(100, 120, 255);
        strokeWeight(2);
        rect(x - size/2, y - size/2, size, size, 5);

        // Inner highlight
        noFill();
        stroke(80, 100, 180, 80);
        strokeWeight(1);
        rect(x - size/2 + 3, y - size/2 + 3, size - 6, size - 6, 3);

        // Key label
        fill(150, 180, 255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(this.isMobile ? 20 : 16);
        textStyle(BOLD);
        textFont('Rajdhani, Arial, sans-serif');
        text(label, x, y);

        pop();
    }

    draw() {
        const vw = getVirtualWidth();
        const vh = getVirtualHeight();
        const centerX = vw / 2;
        const centerY = vh / 2;

        // Background overlay
        push();
        fill(0, 0, 0, 200);
        noStroke();
        rect(0, 0, vw, vh);
        pop();

        // Main container with gradient effect
        push();
        const formX = centerX - this.width / 2;
        const formY = centerY - this.height / 2;

        // Container background
        fill(20, 20, 40);
        stroke(100, 100, 255);
        strokeWeight(2);
        rect(formX, formY, this.width, this.height, 10);

        // Title with futuristic font (smaller on desktop)
        fill(255, 255, 255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(this.isMobile ? 40 : 28);
        textStyle(BOLD);
        textFont('Orbitron, Impact, sans-serif');
        text('SPACE INVADERS', centerX, formY + 35);

        // Subtitle
        textSize(this.isMobile ? 15 : 13);
        textStyle(NORMAL);
        textFont('Rajdhani, Arial, sans-serif');
        fill(180, 180, 220);
        text('Wpisz swoje dane, aby rozpocząć', centerX, formY + 60);

        // Controls info with keyboard visualization - CENTERED HORIZONTAL LAYOUT
        const controlsY = formY + 110;

        if (this.isMobile) {
            textAlign(CENTER, CENTER);
            textSize(12);
            fill(150, 150, 200);
            text('Sterowanie: Dotknij ekranu po bokach', centerX, controlsY);
            text('Lewo/Prawo - ruch | Prawo - strzał', centerX, controlsY + 18);
        } else {
            // Desktop controls - all keys centered
            textAlign(CENTER, CENTER);
            textSize(12);
            fill(200, 200, 255);
            textStyle(BOLD);
            textFont('Orbitron, Arial, sans-serif');
            text('STEROWANIE', centerX, controlsY);
            textStyle(NORMAL);

            // All keys centered in one horizontal line
            const keySize = 32;
            const keysY = controlsY + 35;
            const keySpacing = 65;
            const spaceWidth = 80;

            // Calculate total width and center everything
            const totalWidth = keySize + keySpacing + keySize + keySpacing + spaceWidth;
            const startX = centerX - totalWidth / 2 + keySize / 2;

            // Left arrow
            const leftX = startX;
            this.drawKey(leftX, keysY, keySize, '←');

            // Right arrow
            const rightX = leftX + keySize / 2 + keySpacing + keySize / 2;
            this.drawKey(rightX, keysY, keySize, '→');

            // Spacebar (wider)
            const spaceX = rightX + keySize / 2 + keySpacing + spaceWidth / 2;
            const spaceHeight = 32;

            fill(40, 40, 60);
            stroke(100, 120, 255);
            strokeWeight(2);
            rect(spaceX - spaceWidth/2, keysY - spaceHeight/2, spaceWidth, spaceHeight, 5);

            fill(150, 180, 255);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(10);
            textFont('Rajdhani, Arial, sans-serif');
            text('SPACJA', spaceX, keysY);

            // Descriptions under keys
            textSize(10);
            fill(150, 150, 200);
            textFont('Rajdhani, Arial, sans-serif');
            const descY = keysY + 28;

            textAlign(CENTER, CENTER);
            text('Ruch w lewo', leftX, descY);
            text('Ruch w prawo', rightX, descY);
            text('Strzał', spaceX, descY);
        }

        // Nick label (LEFT side)
        textAlign(RIGHT, CENTER);
        fill(255, 255, 255);
        textSize(this.isMobile ? 16 : 14);
        textFont('Rajdhani, Arial, sans-serif');
        textStyle(BOLD);
        text('Nick:', this.nickField.labelX + this.nickField.labelWidth, this.nickField.y + this.nickField.height / 2);
        textStyle(NORMAL);

        // Nick input field (RIGHT side)
        if (this.nickField.active) {
            stroke(100, 150, 255);
            strokeWeight(2);
        } else {
            stroke(80, 80, 120);
            strokeWeight(1);
        }
        fill(30, 30, 50);
        rect(this.nickField.x, this.nickField.y, this.nickField.width, this.nickField.height, 5);

        // Nick text
        fill(255);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(this.isMobile ? 16 : 14);
        textFont('Rajdhani, Arial, sans-serif');
        const nickDisplay = this.nickInput || (this.nickField.active ? '|' : 'Twój nick...');
        const nickColor = this.nickInput ? color(255, 255, 255) : color(120, 120, 150);
        fill(nickColor);
        text(nickDisplay, this.nickField.x + 10, this.nickField.y + this.nickField.height / 2);

        // Email label (LEFT side)
        textAlign(RIGHT, CENTER);
        fill(255, 255, 255);
        textSize(this.isMobile ? 16 : 14);
        textFont('Rajdhani, Arial, sans-serif');
        textStyle(BOLD);
        text('Email:', this.emailField.labelX + this.emailField.labelWidth, this.emailField.y + this.emailField.height / 2);
        textStyle(NORMAL);

        // Email input field (RIGHT side)
        if (this.emailField.active) {
            stroke(100, 150, 255);
            strokeWeight(2);
        } else {
            stroke(80, 80, 120);
            strokeWeight(1);
        }
        fill(30, 30, 50);
        rect(this.emailField.x, this.emailField.y, this.emailField.width, this.emailField.height, 5);

        // Email text
        fill(255);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(this.isMobile ? 16 : 14);
        textFont('Rajdhani, Arial, sans-serif');
        const emailDisplay = this.emailInput || (this.emailField.active ? '|' : 'twoj@email.pl');
        const emailColor = this.emailInput ? color(255, 255, 255) : color(120, 120, 150);
        fill(emailColor);
        text(emailDisplay, this.emailField.x + 10, this.emailField.y + this.emailField.height / 2);

        // Info about email - more visible with better color
        textAlign(CENTER, CENTER);
        textSize(this.isMobile ? 12 : 11);
        textFont('Rajdhani, Arial, sans-serif');
        textStyle(ITALIC);
        fill(180, 200, 255); // Lighter blue for better visibility
        text('Email służy jako hasło do odebrania nagrody', centerX, this.emailField.y + 45);
        textStyle(NORMAL);

        // Error message
        if (this.error) {
            textAlign(CENTER, CENTER);
            textSize(this.isMobile ? 13 : 11);
            textFont('Rajdhani, Arial, sans-serif');
            textStyle(BOLD);
            fill(255, 100, 100);
            text(this.error, centerX, this.startButton.y - 22);
            textStyle(NORMAL);
        }

        // Start button with better styling
        if (this.startButton.isHovered) {
            fill(80, 120, 255);
            stroke(120, 150, 255);
        } else {
            fill(50, 80, 200);
            stroke(80, 100, 220);
        }
        strokeWeight(2);
        rect(this.startButton.x, this.startButton.y, this.startButton.width, this.startButton.height, 8);

        // Button text
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(this.isMobile ? 20 : 17);
        textStyle(BOLD);
        textFont('Orbitron, Arial, sans-serif');
        text('START GAME', this.startButton.x + this.startButton.width / 2,
             this.startButton.y + this.startButton.height / 2);

        pop();
    }
}
