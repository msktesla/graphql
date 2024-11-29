class ChristmasEffect {
    constructor() {
        this.canvas = document.getElementById('christmas-snow');
        this.ctx = this.canvas.getContext('2d');
        this.snowflakes = [];
        this.icons = ['🎄', '🎅', '🎁', '⛄', '🦌', '🔔', '❄️', '✨'];
        this.isActive = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.generateSnowflakes();
    }

    generateSnowflakes() {
        this.snowflakes = [];
        const numberOfParticles = Math.floor((this.canvas.width * this.canvas.height) / 10000);
        
        for (let i = 0; i < numberOfParticles; i++) {
            this.snowflakes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 1,
                icon: Math.random() < 0.2 ? this.icons[Math.floor(Math.random() * this.icons.length)] : '❄️'
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '20px Arial';
        
        this.snowflakes.forEach(flake => {
            this.ctx.fillStyle = 'white';
            if (flake.icon === '❄️') {
                this.ctx.beginPath();
                this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillText(flake.icon, flake.x, flake.y);
            }
            
            flake.y += flake.speed;
            flake.x += Math.sin(flake.y / 30) * 0.5;

            if (flake.y > this.canvas.height) {
                flake.y = 0;
                flake.x = Math.random() * this.canvas.width;
            }
        });
    }

    toggle() {
        this.isActive = !this.isActive;
        this.canvas.style.display = this.isActive ? 'block' : 'none';
        document.body.classList.toggle('christmas-mode');
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

// Add at the end of christmas.js
window.ChristmasEffect = ChristmasEffect;