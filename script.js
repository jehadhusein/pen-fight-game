/**
         * WEB AUDIO SYNTHESIZER
         * Generates sound effects dynamically without external assets
         */
        class SoundFX {
            constructor() {
                this.ctx = null;
                this.enabled = true;
            }

            init() {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioCtx();
                }
            }

            playHit(intensity = 1) {
                if (!this.enabled || !this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(120 * intensity, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

                gain.gain.setValueAtTime(Math.min(intensity * 0.8, 1), this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
            }

            playFlick() {
                if (!this.enabled || !this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.08);
            }

            playFall() {
                if (!this.enabled || !this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.4);

                gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.4);
            }

            playWin() {
                if (!this.enabled || !this.ctx) return;
                const notes = [261.63, 329.63, 392.00, 523.25];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

                    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.25);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(this.ctx.currentTime + idx * 0.08);
                    osc.stop(this.ctx.currentTime + idx * 0.08 + 0.25);
                });
            }
        }

        const audio = new SoundFX();

        /**
         * 2D RIGID BODY PEN CLASS
         */
        class Pen {
            constructor(x, y, length, width, colorTheme, name) {
                this.x = x;
                this.y = y;
                this.length = length;
                this.width = width;
                this.angle = 0; // Direction facing (radians)
                
                // Linear & Angular Velocity
                this.vx = 0;
                this.vy = 0;
                this.va = 0; // Angular velocity

                // Physical properties
                this.mass = 1.2;
                this.inertia = (1 / 12) * this.mass * (this.length * this.length + this.width * this.width);
                this.friction = 0.90; // Version 0.6: stronger, frame-rate-independent slowing
                this.angularFriction = 0.88; // Version 0.6: faster rotational settling

                this.colorTheme = colorTheme; // { body, cap, accent, grip }
                this.name = name;
                this.isOffTable = false;
                this.opacity = 1.0;
                this.scale = 1.0;
            }

            // Get local bounding box vertices in world space
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

            update(tableBounds, frameScale = 1) {
                if (this.isOffTable) {
                    // Fall animation
                    this.scale *= 0.92;
                    this.opacity *= 0.9;
                    this.x += this.vx * 0.5 * frameScale;
                    this.y += this.vy * 0.5 * frameScale;
                    return;
                }

                // Apply velocities
                this.x += this.vx * frameScale;
                this.y += this.vy * frameScale;
                this.angle += this.va * frameScale;

                // Apply time-normalized friction (baseline: 60 FPS)
                this.vx *= Math.pow(this.friction, frameScale);
                this.vy *= Math.pow(this.friction, frameScale);
                this.va *= Math.pow(this.angularFriction, frameScale);

                // Stop small residual drift promptly
                if (Math.hypot(this.vx, this.vy) < 0.18) {
                    this.vx = 0;
                    this.vy = 0;
                }
                if (Math.abs(this.va) < 0.006) {
                    this.va = 0;
                }

                // Check if pen center or vertices fall off table edges
                const vertices = this.getVertices();
                let outCount = 0;
                for (let v of vertices) {
                    if (v.x < tableBounds.x || v.x > tableBounds.x + tableBounds.w ||
                        v.y < tableBounds.y || v.y > tableBounds.y + tableBounds.h) {
                        outCount++;
                    }
                }

                // If more than 2 vertices are off table, pen falls off
                if (outCount >= 2 || 
                    this.x < tableBounds.x - 10 || this.x > tableBounds.x + tableBounds.w + 10 ||
                    this.y < tableBounds.y - 10 || this.y > tableBounds.y + tableBounds.h + 10) {
                    this.isOffTable = true;
                    audio.playFall();
                }
            }

            isMoving() {
                return Math.hypot(this.vx, this.vy) > 0.08 || Math.abs(this.va) > 0.005;
            }

            draw(ctx) {
                if (this.opacity <= 0.01) return;

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.scale(this.scale, this.scale);

                const halfL = this.length / 2;
                const halfW = this.width / 2;

                // Drop Shadow
                if (!this.isOffTable) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                    ctx.shadowBlur = 12;
                    ctx.shadowOffsetX = 6;
                    ctx.shadowOffsetY = 8;
                }

                // Main Pen Barrel
                ctx.fillStyle = this.colorTheme.body;
                ctx.beginPath();
                ctx.roundRect(-halfL + 12, -halfW, this.length - 24, this.width, [3]);
                ctx.fill();

                // Rubber Grip
                ctx.fillStyle = this.colorTheme.grip;
                ctx.fillRect(-halfL + 25, -halfW, 20, this.width);

                // Grip Texture Lines
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                for (let i = -halfL + 28; i < -halfL + 42; i += 4) {
                    ctx.beginPath();
                    ctx.moveTo(i, -halfW);
                    ctx.lineTo(i, halfW);
                    ctx.stroke();
                }

                // Metallic / Plastic Cap
                ctx.fillStyle = this.colorTheme.cap;
                ctx.beginPath();
                ctx.roundRect(-halfL, -halfW, 18, this.width, [4, 0, 0, 4]);
                ctx.fill();

                // Clip on Cap
                ctx.fillStyle = this.colorTheme.accent;
                ctx.fillRect(-halfL + 2, -halfW - 3, 16, 3);

                // Pen Tip (Front)
                ctx.fillStyle = '#d1d5db'; // Metal nib housing
                ctx.beginPath();
                ctx.moveTo(halfL - 12, -halfW);
                ctx.lineTo(halfL - 2, -halfW + 3);
                ctx.lineTo(halfL - 2, halfW - 3);
                ctx.lineTo(halfL - 12, halfW);
                ctx.closePath();
                ctx.fill();

                // Nib Tip Point
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.moveTo(halfL - 2, -halfW + 4);
                ctx.lineTo(halfL + 4, 0);
                ctx.lineTo(halfL - 2, halfW - 4);
                ctx.closePath();
                ctx.fill();

                // Highlight Shine Reflection
                const gradient = ctx.createLinearGradient(0, -halfW, 0, halfW);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

                ctx.fillStyle = gradient;
                ctx.fillRect(-halfL, -halfW, this.length, this.width);

                ctx.restore();
            }
        }

        /**
         * GAME ENGINE & CONTROLLER
         */
        class PenFightGame {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.wrapper = document.getElementById('canvasWrapper');

                // Game Modes & States
                this.isVSComputer = false; // Version 0.5 supports two human players only.
                this.currentPlayer = 1; // 1 or 2
                this.gameState = 'AIMING'; // AIMING, MOVING, GAMEOVER
                this.score = { p1: 0, p2: 0 };

                // Physics Simulation Canvas scale
                this.table = { x: 0, y: 0, w: 0, h: 0 };
                this.pens = [];

                // Dragging / Aiming Mechanics
                this.dragStart = null;
                this.dragCurrent = null;
                this.maxDragDist = 140;

                // UI Elements
                this.turnBadge = document.getElementById('turnBadge');
                this.scoreP1El = document.getElementById('scoreP1');
                this.scoreP2El = document.getElementById('scoreP2');
                this.p2LabelEl = document.getElementById('p2Label');
                this.modal = document.getElementById('winnerModal');
                this.winnerText = document.getElementById('winnerText');
                this.dragPrompt = document.getElementById('dragPrompt');

                this.lastFrameTimestamp = null;
                this.frameScale = 1;
                this.initEvents();
                this.resizeCanvas();
                this.resetGame();

                // Start Render Loop
                requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
            }

            resizeCanvas() {
                const rect = this.wrapper.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;

                // Table margins (Wooden rim border)
                const margin = Math.min(rect.width, rect.height) * 0.06;
                this.table = {
                    x: margin,
                    y: margin,
                    w: rect.width - margin * 2,
                    h: rect.height - margin * 2
                };
            }

            resetGame(resetScores = false) {
                if (resetScores) {
                    this.score = { p1: 0, p2: 0 };
                    this.updateScoreboard();
                }

                this.gameState = 'AIMING';
                this.currentPlayer = 1;
                this.turnBadge.textContent = "Player 1's Turn";
                this.turnBadge.className = "text-xs font-bold px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse mt-0.5";
                this.modal.classList.add('hidden');
                this.dragPrompt.style.opacity = '1';

                // Create Pens
                const penLength = Math.min(this.canvas.width, this.canvas.height) * 0.18;
                const penWidth = penLength * 0.13;

                // Player 1 (Left Side) - Blue Theme
                const p1 = new Pen(
                    this.table.x + this.table.w * 0.25,
                    this.table.y + this.table.h * 0.5,
                    penLength,
                    penWidth,
                    { body: '#0284c7', cap: '#0369a1', accent: '#38bdf8', grip: '#0c4a6e' },
                    'Player 1'
                );
                p1.angle = 0;

                // Player 2 / AI (Right Side) - Red Theme
                const p2 = new Pen(
                    this.table.x + this.table.w * 0.75,
                    this.table.y + this.table.h * 0.5,
                    penLength,
                    penWidth,
                    { body: '#e11d48', cap: '#be123c', accent: '#fb7185', grip: '#881337' },
                    'Player 2'
                );
                p2.angle = Math.PI;

                this.pens = [p1, p2];
            }

            initEvents() {
                window.addEventListener('resize', () => this.resizeCanvas());

                // Pointer Events for Dragging / Aiming
                this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
                window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
                window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
                // AI is displayed as a disabled placeholder until version 1.0.

                document.getElementById('soundBtn').addEventListener('click', () => {
                    audio.init();
                    audio.enabled = !audio.enabled;
                    document.getElementById('soundIcon').className = audio.enabled ? 'fa-solid fa-volume-high text-sm' : 'fa-solid fa-volume-xmark text-sm text-rose-400';
                });

                document.getElementById('resetBtn').addEventListener('click', () => {
                    audio.init();
                    this.resetGame(true);
                });

                document.getElementById('nextRoundBtn').addEventListener('click', () => {
                    audio.init();
                    this.resetGame(false);
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
                audio.init();
                if (this.gameState !== 'AIMING') return;

                const pos = this.getPointerPos(e);
                const activePen = this.pens[this.currentPlayer - 1];

                // Check distance to active pen
                const dist = Math.hypot(pos.x - activePen.x, pos.y - activePen.y);
                if (dist < activePen.length) {
                    this.dragStart = pos;
                    this.dragCurrent = pos;
                }
            }

            handlePointerMove(e) {
                if (!this.dragStart) return;
                this.dragCurrent = this.getPointerPos(e);
            }

            handlePointerUp(e) {
                if (!this.dragStart) return;

                const activePen = this.pens[this.currentPlayer - 1];
                const dx = this.dragStart.x - this.dragCurrent.x;
                const dy = this.dragStart.y - this.dragCurrent.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 15) {
                    // Execute Flick
                    const power = Math.min(dist, this.maxDragDist) / this.maxDragDist;
                    const speed = power * 22;

                    const angle = Math.atan2(dy, dx);
                    activePen.vx = Math.cos(angle) * speed;
                    activePen.vy = Math.sin(angle) * speed;

                    // Offset torque based on drag angle relative to pen angle
                    const torque = Math.sin(angle - activePen.angle) * power * 0.35;
                    activePen.va = torque;

                    audio.playFlick();
                    this.gameState = 'MOVING';
                    this.dragPrompt.style.opacity = '0';
                }

                this.dragStart = null;
                this.dragCurrent = null;
            }

            /**
             * SAT OBB (ORIENTED BOUNDING BOX) COLLISION DETECTION
             */
            checkPenCollision(p1, p2) {
                if (p1.isOffTable || p2.isOffTable) return;

                const poly1 = p1.getVertices();
                const poly2 = p2.getVertices();

                const getAxes = (poly) => {
                    const axes = [];
                    for (let i = 0; i < poly.length; i++) {
                        const pA = poly[i];
                        const pB = poly[(i + 1) % poly.length];
                        const edge = { x: pB.x - pA.x, y: pB.y - pA.y };
                        const normal = { x: -edge.y, y: edge.x };
                        const len = Math.hypot(normal.x, normal.y);
                        axes.push({ x: normal.x / len, y: normal.y / len });
                    }
                    return axes;
                };

                const project = (poly, axis) => {
                    let min = Infinity, max = -Infinity;
                    for (let p of poly) {
                        const dot = p.x * axis.x + p.y * axis.y;
                        if (dot < min) min = dot;
                        if (dot > max) max = dot;
                    }
                    return { min, max };
                };

                const axes = [...getAxes(poly1), ...getAxes(poly2)];
                let minOverlap = Infinity;
                let smallestAxis = null;

                for (let axis of axes) {
                    const proj1 = project(poly1, axis);
                    const proj2 = project(poly2, axis);

                    if (proj1.max < proj2.min || proj2.max < proj1.min) {
                        return; // Separation found -> No collision
                    }

                    const overlap = Math.min(proj1.max - proj2.min, proj2.max - proj1.min);
                    if (overlap < minOverlap) {
                        minOverlap = overlap;
                        smallestAxis = axis;
                    }
                }

                // Resolve Impulse & Collision Response
                if (smallestAxis) {
                    // Center vector
                    const d = { x: p2.x - p1.x, y: p2.y - p1.y };
                    if (d.x * smallestAxis.x + d.y * smallestAxis.y < 0) {
                        smallestAxis.x = -smallestAxis.x;
                        smallestAxis.y = -smallestAxis.y;
                    }

                    // Positional separation
                    p1.x -= smallestAxis.x * minOverlap * 0.5;
                    p1.y -= smallestAxis.y * minOverlap * 0.5;
                    p2.x += smallestAxis.x * minOverlap * 0.5;
                    p2.y += smallestAxis.y * minOverlap * 0.5;

                    // Relative velocity physics impulse
                    const rvx = p2.vx - p1.vx;
                    const rvy = p2.vy - p1.vy;
                    const velAlongNormal = rvx * smallestAxis.x + rvy * smallestAxis.y;

                    if (velAlongNormal < 0) {
                        const restitution = 0.65; // Elasticity
                        let impulse = -(1 + restitution) * velAlongNormal;
                        impulse /= (1 / p1.mass + 1 / p2.mass);

                        const impulseX = impulse * smallestAxis.x;
                        const impulseY = impulse * smallestAxis.y;

                        p1.vx -= (1 / p1.mass) * impulseX;
                        p1.vy -= (1 / p1.mass) * impulseY;
                        p2.vx += (1 / p2.mass) * impulseX;
                        p2.vy += (1 / p2.mass) * impulseY;

                        // Add realistic rotational torque on impact
                        p1.va += (Math.random() - 0.5) * 0.25 * (impulse / p1.mass);
                        p2.va += (Math.random() - 0.5) * 0.25 * (impulse / p2.mass);

                        audio.playHit(Math.min(impulse * 0.2, 1.5));
                    }
                }
            }

            updatePhysics() {
                // Update positions & friction
                this.pens.forEach(pen => pen.update(this.table, this.frameScale || 1));

                // Collision check
                this.checkPenCollision(this.pens[0], this.pens[1]);

                // Handle Turn Transitions when movement stops
                if (this.gameState === 'MOVING') {
                    const anyMoving = this.pens.some(p => p.isMoving());
                    if (!anyMoving) {
                        this.checkRoundEnd();
                    }
                }
            }

            checkRoundEnd() {
                const p1Off = this.pens[0].isOffTable;
                const p2Off = this.pens[1].isOffTable;

                if (p1Off || p2Off) {
                    this.gameState = 'GAMEOVER';

                    if (p1Off && p2Off) {
                        this.showWinner("DRAW MATCH!", "Both pens fell off the table!");
                    } else if (p1Off) {
                        this.score.p2++;
                        this.showWinner(`${this.pens[1].name.toUpperCase()} WINS!`, `${this.pens[0].name}'s pen fell off the wooden table.`);
                    } else if (p2Off) {
                        this.score.p1++;
                        this.showWinner("PLAYER 1 WINS!", `${this.pens[1].name}'s pen fell off the wooden table.`);
                    }

                    this.updateScoreboard();
                    audio.playWin();
                } else {
                    // Switch turn
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                    this.gameState = 'AIMING';

                    const isP1 = this.currentPlayer === 1;
                    this.turnBadge.textContent = isP1 ? "Player 1's Turn" : "Player 2's Turn";
                    this.turnBadge.className = isP1 
                        ? "text-xs font-bold px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse mt-0.5"
                        : "text-xs font-bold px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse mt-0.5";

                }
            }

            updateScoreboard() {
                this.scoreP1El.textContent = this.score.p1;
                this.scoreP2El.textContent = this.score.p2;
            }

            showWinner(title, sub) {
                this.winnerText.textContent = title;
                document.getElementById('winnerSubText').textContent = sub;
                this.modal.classList.remove('hidden');
            }

            /**
             * RENDER GRAPHICS & TABLE BACKGROUND
             */
            drawTable() {
                // Table Outer Border / Wood Bezel
                this.ctx.fillStyle = '#2d1810';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // Wood Grain Surface
                this.ctx.fillStyle = '#4a2810';
                this.ctx.fillRect(this.table.x, this.table.y, this.table.w, this.table.h);

                // Decorative Wooden Planks Lines
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
                this.ctx.lineWidth = 2;
                const plankHeight = this.table.h / 6;
                for (let y = this.table.y + plankHeight; y < this.table.y + this.table.h; y += plankHeight) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.table.x, y);
                    this.ctx.lineTo(this.table.x + this.table.w, y);
                    this.ctx.stroke();
                }

                // Inner Table Border Highlight Line
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(this.table.x, this.table.y, this.table.w, this.table.h);

                // Table Corner Pocket Accents
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                const r = 12;
                [[this.table.x, this.table.y], 
                 [this.table.x + this.table.w, this.table.y], 
                 [this.table.x, this.table.y + this.table.h], 
                 [this.table.x + this.table.w, this.table.y + this.table.h]].forEach(([cx, cy]) => {
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    this.ctx.fill();
                });
            }



            gameLoop(timestamp) {
                // Normalize physics to elapsed time so mobile and desktop behave similarly.
                if (this.lastFrameTimestamp !== null) {
                    const deltaMs = Math.min(timestamp - this.lastFrameTimestamp, 50);
                    this.frameScale = Math.max(0, deltaMs / (1000 / 60));
                }
                this.lastFrameTimestamp = timestamp;

                // Clear Canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // Update Logic
                this.updatePhysics();

                // Render Scene
                this.drawTable();
                this.pens.forEach(pen => pen.draw(this.ctx));

                requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
            }
        }

        // Initialize Game on Load
        window.onload = () => {
            new PenFightGame();
        };
