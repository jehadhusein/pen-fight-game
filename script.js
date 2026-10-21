/**
 * Pen Fight Game
 * Basic Gameplay - Version 0.3
 */

class Pen {
    constructor(x, y, length, width, colorTheme, name) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.width = width;
        this.angle = 0;

        this.vx = 0;
        this.vy = 0;
        this.va = 0;

        this.mass = 1.2;
        this.friction = 0.982;
        this.angularFriction = 0.95;

        this.colorTheme = colorTheme;
        this.name = name;
        this.isOffTable = false;
        this.opacity = 1.0;
        this.scale = 1.0;
    }

    getVertices() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const hw = this.length / 2;
        const hh = this.width / 2;

        const localPoints = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];

        return localPoints.map(pt => ({
            x: this.x + pt.x * cos - pt.y * sin,
            y: this.y + pt.x * sin + pt.y * cos
        }));
    }

    update(tableBounds) {
        if (this.isOffTable) {
            this.scale *= 0.92;
            this.opacity *= 0.9;
            this.x += this.vx * 0.5;
            this.y += this.vy * 0.5;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.va;

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.va *= this.angularFriction;

        if (Math.hypot(this.vx, this.vy) < 0.05) {
            this.vx = 0;
            this.vy = 0;
        }

        if (Math.abs(this.va) < 0.002) {
            this.va = 0;
        }

        const vertices = this.getVertices();
        let outCount = 0;

        for (let v of vertices) {
            if (
                v.x < tableBounds.x ||
                v.x > tableBounds.x + tableBounds.w ||
                v.y < tableBounds.y ||
                v.y > tableBounds.y + tableBounds.h
            ) {
                outCount++;
            }
        }

        if (
            outCount >= 2 ||
            this.x < tableBounds.x - 10 ||
            this.x > tableBounds.x + tableBounds.w + 10 ||
            this.y < tableBounds.y - 10 ||
            this.y > tableBounds.y + tableBounds.h + 10
        ) {
            this.isOffTable = true;
        }
    }

    isMoving() {
        return (
            Math.hypot(this.vx, this.vy) > 0.08 ||
            Math.abs(this.va) > 0.005
        );
    }

    draw(ctx) {
        if (this.opacity <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        const halfL = this.length / 2;
        const halfW = this.width / 2;

        if (!this.isOffTable) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 6;
            ctx.shadowOffsetY = 8;
        }

        ctx.fillStyle = this.colorTheme.body;
        ctx.beginPath();
        ctx.roundRect(
            -halfL + 12,
            -halfW,
            this.length - 24,
            this.width,
            [3]
        );
        ctx.fill();

        ctx.fillStyle = this.colorTheme.grip;
        ctx.fillRect(-halfL + 25, -halfW, 20, this.width);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        for (let i = -halfL + 28; i < -halfL + 42; i += 4) {
            ctx.beginPath();
            ctx.moveTo(i, -halfW);
            ctx.lineTo(i, halfW);
            ctx.stroke();
        }

        ctx.fillStyle = this.colorTheme.cap;
        ctx.beginPath();
        ctx.roundRect(-halfL, -halfW, 18, this.width, [4, 0, 0, 4]);
        ctx.fill();

        ctx.fillStyle = this.colorTheme.accent;
        ctx.fillRect(-halfL + 2, -halfW - 3, 16, 3);

        ctx.fillStyle = '#d1d5db';
        ctx.beginPath();
        ctx.moveTo(halfL - 12, -halfW);
        ctx.lineTo(halfL - 2, -halfW + 3);
        ctx.lineTo(halfL - 2, halfW - 3);
        ctx.lineTo(halfL - 12, halfW);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(halfL - 2, -halfW + 4);
        ctx.lineTo(halfL + 4, 0);
        ctx.lineTo(halfL - 2, halfW - 4);
        ctx.closePath();
        ctx.fill();

        const gradient = ctx.createLinearGradient(0, -halfW, 0, halfW);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

        ctx.fillStyle = gradient;
        ctx.fillRect(-halfL, -halfW, this.length, this.width);

        ctx.restore();
    }
}

class PenFightGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.wrapper = document.getElementById('canvasWrapper');

        this.currentPlayer = 1;
        this.gameState = 'AIMING';

        this.table = { x: 0, y: 0, w: 0, h: 0 };
        this.pens = [];

        this.dragStart = null;
        this.dragCurrent = null;
        this.maxDragDist = 140;

        this.initEvents();
        this.resizeCanvas();
        this.resetGame();

        requestAnimationFrame(() => this.gameLoop());
    }

    resizeCanvas() {
        const rect = this.wrapper.getBoundingClientRect();

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        const margin = Math.min(rect.width, rect.height) * 0.06;

        this.table = {
            x: margin,
            y: margin,
            w: rect.width - margin * 2,
            h: rect.height - margin * 2
        };
    }

    resetGame() {
        const penLength = Math.min(this.table.w * 0.18, 110);
        const penWidth = 12;

        const p1 = new Pen(
            this.table.x + this.table.w * 0.25,
            this.table.y + this.table.h * 0.5,
            penLength,
            penWidth,
            {
                body: '#0284c7',
                cap: '#0369a1',
                accent: '#38bdf8',
                grip: '#0c4a6e'
            },
            'Player 1'
        );

        p1.angle = 0;

        const p2 = new Pen(
            this.table.x + this.table.w * 0.75,
            this.table.y + this.table.h * 0.5,
            penLength,
            penWidth,
            {
                body: '#e11d48',
                cap: '#be123c',
                accent: '#fb7185',
                grip: '#881337'
            },
            'Player 2'
        );

        p2.angle = Math.PI;

        this.pens = [p1, p2];
        this.currentPlayer = 1;
        this.gameState = 'AIMING';
        this.dragStart = null;
        this.dragCurrent = null;
    }

    initEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.resetGame();
        });

        this.canvas.addEventListener('pointerdown', e => {
            this.handlePointerDown(e);
        });

        window.addEventListener('pointermove', e => {
            this.handlePointerMove(e);
        });

        window.addEventListener('pointerup', e => {
            this.handlePointerUp(e);
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handlePointerDown(e) {
        if (this.gameState !== 'AIMING') return;

        const pos = this.getPointerPos(e);
        const activePen = this.pens[this.currentPlayer - 1];

        const dist = Math.hypot(
            pos.x - activePen.x,
            pos.y - activePen.y
        );

        if (dist < activePen.length) {
            this.dragStart = pos;
            this.dragCurrent = pos;
        }
    }

    handlePointerMove(e) {
        if (!this.dragStart) return;

        this.dragCurrent = this.getPointerPos(e);
    }

    handlePointerUp() {
        if (!this.dragStart) return;

        const activePen = this.pens[this.currentPlayer - 1];

        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
            const power = Math.min(dist, this.maxDragDist) / this.maxDragDist;
            const speed = power * 22;
            const angle = Math.atan2(dy, dx);

            activePen.vx = Math.cos(angle) * speed;
            activePen.vy = Math.sin(angle) * speed;

            activePen.va = Math.sin(angle - activePen.angle) * power * 0.35;

            this.gameState = 'MOVING';
        }

        this.dragStart = null;
        this.dragCurrent = null;
    }

    drawTable() {
        this.ctx.fillStyle = '#2d1810';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#4a2810';
        this.ctx.fillRect(
            this.table.x,
            this.table.y,
            this.table.w,
            this.table.h
        );

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        this.ctx.lineWidth = 2;

        const plankHeight = this.table.h / 6;

        for (
            let y = this.table.y + plankHeight;
            y < this.table.y + this.table.h;
            y += plankHeight
        ) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.table.x, y);
            this.ctx.lineTo(this.table.x + this.table.w, y);
            this.ctx.stroke();
        }
    }

    updatePhysics() {
        this.pens.forEach(pen => pen.update(this.table));

        if (
            this.gameState === 'MOVING' &&
            !this.pens.some(pen => pen.isMoving())
        ) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.gameState = 'AIMING';
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.updatePhysics();
        this.drawTable();

        this.pens.forEach(pen => pen.draw(this.ctx));

        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = () => {
    new PenFightGame();
};