class MatrixEffect {
    constructor() {
        this.canvas = document.getElementById('matrix-rain');
        this.ctx = this.canvas.getContext('2d');
        
        // Japanese katakana
        this.katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
        
        // Latin characters (including more special characters)
        this.latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
                    'abcdefghijklmnopqrstuvwxyz' + 
                    '0123456789' + 
                    '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        
        // Cyrillic characters
        this.cyrillic = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' + 
                       'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
        
        // Arabic characters (basic set)
        this.arabic = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' + 
                     'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْ';

        // Combine all character sets
        this.characters = this.katakana + this.latin + this.cyrillic + this.arabic;
        
        this.fontSize = 16;
        this.columns = 0;
        this.drops = [];
        this.isActive = false;

        // Add different colors for variety
        this.colors = [
            '#0F0',     // Classic Matrix green
            '#00FF41', // Brighter green
            '#008F11', // Darker green
            '#003B00', // Even darker green
            '#00FF00'  // Pure green
        ];

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width/this.fontSize);
        this.drops = Array(this.columns).fill(1);
        this.charColors = Array(this.columns).fill(0).map(() => 
            this.colors[Math.floor(Math.random() * this.colors.length)]
        );
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for(let i = 0; i < this.drops.length; i++) {
            // Randomly select character set
            let charSet;
            const rand = Math.random();
            if (rand < 0.4) {
                charSet = this.katakana; // 40% chance for katakana
            } else if (rand < 0.7) {
                charSet = this.latin;    // 30% chance for latin
            } else if (rand < 0.85) {
                charSet = this.cyrillic; // 15% chance for cyrillic
            } else {
                charSet = this.arabic;   // 15% chance for arabic
            }

            const char = charSet[Math.floor(Math.random() * charSet.length)];
            
            // Use the color assigned to this column
            this.ctx.fillStyle = this.charColors[i];
            this.ctx.font = `${this.fontSize}px monospace`;
            
            // Add a glow effect for some characters
            if (Math.random() < 0.1) {
                this.ctx.shadowColor = this.charColors[i];
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.shadowBlur = 0;
            }

            this.ctx.fillText(char, i * this.fontSize, this.drops[i] * this.fontSize);

            // Reset drop when it reaches bottom or randomly
            if(this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
                // Assign new random color when drop resets
                this.charColors[i] = this.colors[Math.floor(Math.random() * this.colors.length)];
            }
            this.drops[i]++;
        }
    }

    toggle() {
        this.isActive = !this.isActive;
        this.canvas.style.display = this.isActive ? 'block' : 'none';
        document.body.classList.toggle('matrix-mode');
        if (this.isActive) {
            this.animate();
        }
    }

    animate() {
        if (this.isActive) {
            this.draw();
            requestAnimationFrame(() => this.animate());
        }
    }
}

window.MatrixEffect = MatrixEffect;