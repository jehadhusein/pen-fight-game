(() => {
    class PenFightAI {
        constructor() {
            this.difficulty = 'medium';
        }

        setDifficulty(level) {
            if (['easy', 'medium', 'hard'].includes(level)) this.difficulty = level;
        }

        chooseShot(attacker, target, table) {
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const directAngle = Math.atan2(dy, dx);
            const distance = Math.hypot(dx, dy);
            const settings = {
                easy: { spread: 0.48, samples: 7, power: 0.62 },
                medium: { spread: 0.27, samples: 13, power: 0.78 },
                hard: { spread: 0.13, samples: 21, power: 0.94 }
            }[this.difficulty];
            const angles = [directAngle];
            for (let i = 1; i <= settings.samples; i++) {
                const offset = settings.spread * i / settings.samples;
                angles.push(directAngle - offset, directAngle + offset);
            }

            let best = null;
            for (const angle of angles) {
                const aimX = attacker.x + Math.cos(angle) * (attacker.length * 0.42 + target.length * 0.42);
                const aimY = attacker.y + Math.sin(angle) * (attacker.length * 0.42 + target.length * 0.42);
                const hitDistance = Math.hypot(target.x - aimX, target.y - aimY);
                const edgeRisk = this.edgeRisk(target, angle, table);
                const power = Math.min(1, Math.max(0.35, settings.power + (distance / Math.max(table.w, table.h)) * 0.18));
                let score = -hitDistance * (this.difficulty === 'hard' ? 1.4 : 1);
                score -= edgeRisk * (this.difficulty === 'hard' ? 0.8 : 0.25);
                if (this.difficulty === 'easy') score += (Math.random() - 0.5) * distance * 0.5;
                if (!best || score > best.score) best = { angle, power, score };
            }

            if (this.difficulty === 'easy') best.angle += (Math.random() - 0.5) * 0.18;
            const speed = (this.difficulty === 'easy' ? 0.62 : this.difficulty === 'medium' ? 0.78 : 0.9) * 22 * best.power;
            return {
                vx: Math.cos(best.angle) * speed,
                vy: Math.sin(best.angle) * speed,
                va: Math.sin(best.angle - attacker.angle) * best.power * 0.35
            };
        }

        edgeRisk(target, angle, table) {
            const projectedX = target.x + Math.cos(angle) * target.length * 2;
            const projectedY = target.y + Math.sin(angle) * target.length * 2;
            const marginX = Math.min(projectedX - table.x, table.x + table.w - projectedX);
            const marginY = Math.min(projectedY - table.y, table.y + table.h - projectedY);
            return Math.max(0, target.length - Math.min(marginX, marginY));
        }
    }

    window.PenFightAI = PenFightAI;
})();
