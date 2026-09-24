(() => {
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const overlay = document.getElementById('overlay');
      const overlayTitle = document.getElementById('overlayTitle');
      const overlayInstruction = document.getElementById('overlayInstruction');
      const overlaySubcopy = document.getElementById('overlaySubcopy');
      const bubble = document.getElementById('bubbleText');
      const startButton = document.getElementById('startButton');
      const scoreValue = document.getElementById('scoreValue');
      const bestValue = document.getElementById('bestValue');
      const soundButton = document.getElementById('soundButton');

      const W = canvas.width;
      const H = canvas.height;
      const groundY = H - 76;

      const state = {
        running: false,
        started: false,
        gameOver: false,
        score: 0,
        best: Number(localStorage.getItem('elevated-avian-best') || 0),
        frame: 0,
        pipeTimer: 0,
        goose: {
          x: 106,
          y: H / 2 - 20,
          vy: 0,
          radius: 17,
          wing: 0,
          bob: 0,
        },
        pipes: [],
        particles: [],
        lastTime: 0,
        soundEnabled: localStorage.getItem('elevated-avian-sound') !== 'off',
        audioCtx: null,
      };

      bestValue.textContent = `Best: ${state.best}`;

      function syncSoundUI() {
        soundButton.textContent = state.soundEnabled ? '🔊' : '🔇';
        soundButton.setAttribute('aria-pressed', String(state.soundEnabled));
        soundButton.title = state.soundEnabled ? 'Mute sound' : 'Unmute sound';
      }

      function ensureAudio() {
        if (!state.soundEnabled) return null;
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return null;
          if (!state.audioCtx) state.audioCtx = new AudioCtx();
          if (state.audioCtx.state === 'suspended') {
            state.audioCtx.resume();
          }
          return state.audioCtx;
        } catch (error) {
          return null;
        }
      }

      function playTone({ frequency = 440, frequencyEnd = frequency, type = 'sine', duration = 0.12, volume = 0.05, delay = 0 } = {}) {
        if (!state.soundEnabled) return;
        const audioCtx = ensureAudio();
        if (!audioCtx) return;

        const now = audioCtx.currentTime + delay;
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequencyEnd), now + duration);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gain);
        gain.connect(audioCtx.destination);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.03);
      }

      function playFlap() {
        if (state.soundEnabled) {
          const faaahSound = document.getElementById('faaahSound');
          faaahSound.currentTime = 0;
          faaahSound.play().catch(err => console.log('Audio play failed:', err));
        }
      }

      function playScore() {
        playTone({ frequency: 680, frequencyEnd: 760, type: 'sine', duration: 0.09, volume: 0.04 });
        playTone({ frequency: 900, frequencyEnd: 980, type: 'sine', duration: 0.12, volume: 0.03, delay: 0.06 });
      }

      function playCrash() {
        playTone({ frequency: 240, frequencyEnd: 80, type: 'sawtooth', duration: 0.22, volume: 0.055 });
        playTone({ frequency: 140, frequencyEnd: 60, type: 'triangle', duration: 0.26, volume: 0.04, delay: 0.02 });
      }

      function playStart() {
        playTone({ frequency: 520, frequencyEnd: 620, type: 'triangle', duration: 0.1, volume: 0.035 });
        playTone({ frequency: 700, frequencyEnd: 860, type: 'triangle', duration: 0.12, volume: 0.03, delay: 0.06 });
      }

      function resetGame() {
        state.running = false;
        state.started = false;
        state.gameOver = false;
        state.score = 0;
        state.frame = 0;
        state.pipeTimer = 0;
        state.pipes = [];
        state.particles = [];
        state.goose.y = H / 2 - 20;
        state.goose.vy = 0;
        state.goose.wing = 0;
        state.goose.bob = 0;
        scoreValue.textContent = '0';
        bubble.textContent = 'PREPARE FOR MAXIMUM HONKAGE';
        overlayTitle.textContent = 'GET READY!';
        overlayInstruction.textContent = 'Tap to HONK and FLY!';
        overlaySubcopy.textContent = 'Avoid the reeds, flap like a professional goose, and try not to bonk.';
        startButton.textContent = 'START 🪿';
        overlay.classList.remove('hidden');
      }

      function startGame() {
        if (state.running) return;
        if (state.gameOver) {
          resetGame();
        }
        ensureAudio();
        playStart();
        state.running = true;
        state.started = true;
        state.gameOver = false;
        overlay.classList.add('hidden');
        bubble.textContent = 'HONK RESPONSIBLY';
        flap();
      }

      function flap() {
        if (!state.started) return;
        state.goose.vy = -6.9;
        state.goose.wing = 1;
        playFlap();
        for (let i = 0; i < 5; i++) {
          state.particles.push({
            x: state.goose.x - 12,
            y: state.goose.y + Math.random() * 12 - 6,
            vx: -1.2 - Math.random() * 1.6,
            vy: (Math.random() - 0.5) * 1.6,
            size: 3 + Math.random() * 3,
            life: 24 + Math.random() * 12,
          });
        }
      }

      function endGame() {
        if (state.gameOver) return;
        state.running = false;
        state.gameOver = true;
        playCrash();
        state.best = Math.max(state.best, state.score);
        localStorage.setItem('elevated-avian-best', String(state.best));
        bestValue.textContent = `Best: ${state.best}`;
        overlay.classList.remove('hidden');
        overlayTitle.textContent = 'BONK!';
        overlayInstruction.textContent = `You honked ${state.score} ${state.score === 1 ? 'time' : 'times'}`;
        overlaySubcopy.textContent = state.score >= 10
          ? 'That was suspiciously competent for a goose.'
          : 'A noble effort. The reeds remain undefeated.';
        startButton.textContent = 'TRY AGAIN 🪿';
        bubble.textContent = state.score >= 10 ? 'ELITE HONK ENERGY' : 'REGROUP THE FLOCK';
      }

      function spawnPipe() {
        const gap = 158;
        const minTop = 96;
        const maxTop = groundY - gap - 96;
        const topHeight = minTop + Math.random() * (maxTop - minTop);
        state.pipes.push({
          x: W + 40,
          width: 74,
          gapY: topHeight,
          gap,
          scored: false,
        });
      }

      function update(dt) {
        state.frame += dt * 60;
        state.goose.bob += dt * 4;

        if (!state.running) {
          state.goose.y = H / 2 - 20 + Math.sin(state.goose.bob) * 8;
          return;
        }

        state.pipeTimer += dt;
        if (state.pipeTimer > 1.4) {
          state.pipeTimer = 0;
          spawnPipe();
        }

        state.goose.vy += 0.34 * dt * 60;
        state.goose.vy = Math.min(state.goose.vy, 8.5);
        state.goose.y += state.goose.vy * dt * 60;
        state.goose.wing = Math.max(0, state.goose.wing - dt * 3.4);

        state.pipes.forEach(pipe => {
          pipe.x -= 2.8 * dt * 60;
          if (!pipe.scored && pipe.x + pipe.width < state.goose.x) {
            pipe.scored = true;
            state.score += 1;
            playScore();
            scoreValue.textContent = String(state.score);
            bubble.textContent = state.score < 5 ? 'SOLID HONKING' : state.score < 10 ? 'GOOSE MODE: LOCKED IN' : 'ABSURDLY MAJESTIC';
          }
        });

        state.pipes = state.pipes.filter(pipe => pipe.x + pipe.width > -30);

        state.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 1;
          p.size *= 0.985;
        });
        state.particles = state.particles.filter(p => p.life > 0 && p.size > 0.5);

        if (state.goose.y + state.goose.radius > groundY || state.goose.y - state.goose.radius < 0) {
          endGame();
        }

        for (const pipe of state.pipes) {
          const gx = state.goose.x;
          const gy = state.goose.y;
          const r = state.goose.radius + 7;
          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + pipe.width;
          const inPipeX = gx + r > pipeLeft && gx - r < pipeRight;
          const hitTop = gy - r < pipe.gapY;
          const hitBottom = gy + r > pipe.gapY + pipe.gap;
          if (inPipeX && (hitTop || hitBottom)) {
            endGame();
            break;
          }
        }
      }

      function drawCloud(x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.beginPath();
        ctx.arc(0, 12, 20, 0, Math.PI * 2);
        ctx.arc(22, 4, 24, 0, Math.PI * 2);
        ctx.arc(48, 14, 18, 0, Math.PI * 2);
        ctx.arc(30, 22, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#d5f0ff');
        sky.addColorStop(0.48, '#effaff');
        sky.addColorStop(0.481, '#d7f0c9');
        sky.addColorStop(1, '#cce9b7');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        drawCloud(38 + Math.sin(state.frame * 0.008) * 6, 66, 0.85);
        drawCloud(260 - Math.sin(state.frame * 0.006) * 8, 112, 1.1);
        drawCloud(180 + Math.sin(state.frame * 0.01) * 5, 36, 0.68);

        ctx.fillStyle = '#a7d58d';
        ctx.beginPath();
        ctx.moveTo(-50, H - 118);
        ctx.quadraticCurveTo(72, H - 190, 180, H - 132);
        ctx.quadraticCurveTo(280, H - 82, W + 40, H - 132);
        ctx.lineTo(W + 40, H);
        ctx.lineTo(-50, H);
        ctx.fill();

        ctx.fillStyle = '#89c56d';
        ctx.beginPath();
        ctx.moveTo(-50, H - 90);
        ctx.quadraticCurveTo(80, H - 148, 190, H - 90);
        ctx.quadraticCurveTo(310, H - 42, W + 40, H - 96);
        ctx.lineTo(W + 40, H);
        ctx.lineTo(-50, H);
        ctx.fill();

        ctx.fillStyle = '#6eb25e';
        ctx.fillRect(0, groundY, W, H - groundY);

        for (let i = 0; i < W; i += 18) {
          const bladeH = 10 + ((i * 13) % 18);
          ctx.strokeStyle = i % 3 === 0 ? '#3e8d36' : '#4d9d43';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(i, groundY + 18);
          ctx.quadraticCurveTo(i + 4, groundY + 8 - bladeH / 2, i + 3, groundY + 2);
          ctx.stroke();
        }
      }

      function drawPipe(pipe) {
        const topHeight = pipe.gapY;
        const bottomY = pipe.gapY + pipe.gap;
        const capH = 18;
        const bodyGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
        bodyGradient.addColorStop(0, '#7acb5c');
        bodyGradient.addColorStop(1, '#4b9d43');

        ctx.fillStyle = bodyGradient;
        roundRect(pipe.x, 0, pipe.width, topHeight, 18);
        ctx.fill();
        roundRect(pipe.x, bottomY, pipe.width, H - bottomY, 18);
        ctx.fill();

        ctx.fillStyle = '#95e172';
        roundRect(pipe.x - 4, topHeight - capH, pipe.width + 8, capH + 4, 16);
        ctx.fill();
        roundRect(pipe.x - 4, bottomY - 4, pipe.width + 8, capH + 4, 16);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pipe.x + 14, 10);
        ctx.lineTo(pipe.x + 14, topHeight - 10);
        ctx.moveTo(pipe.x + 14, bottomY + 14);
        ctx.lineTo(pipe.x + 14, H - 18);
        ctx.stroke();
      }

      function drawParticles() {
        state.particles.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / 36);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      function drawGoose() {
        const g = state.goose;
        const rot = Math.max(-0.65, Math.min(0.65, g.vy * 0.05));
        const wingLift = Math.sin(state.frame * 0.32 + g.wing * 6) * 6 + g.wing * 12;

        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(rot);

        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.ellipse(0, 26, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffef8';
        ctx.strokeStyle = 'rgba(45,47,47,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 6, 26, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.quadraticCurveTo(33, -8, 28, 12);
        ctx.quadraticCurveTo(23, 8, 19, 8);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.quadraticCurveTo(-18, -34, -4, -48);
        ctx.quadraticCurveTo(4, -54, 10, -46);
        ctx.quadraticCurveTo(2, -26, 8, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(2, 0);
        ctx.rotate((-0.3 + wingLift * 0.02));
        ctx.fillStyle = '#f2f2ea';
        ctx.beginPath();
        ctx.ellipse(6, 3, 15, 11, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#fffef8';
        ctx.beginPath();
        ctx.arc(6, -48, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(15, -48);
        ctx.lineTo(34, -42);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1c1f1f';
        ctx.beginPath();
        ctx.arc(8, -51, 2.1, 0, Math.PI * 2);
        ctx.fill();

        if (state.score >= 10) {
          ctx.fillStyle = '#ffcf4d';
          ctx.beginPath();
          ctx.moveTo(-4, -66);
          ctx.lineTo(1, -58);
          ctx.lineTo(6, -66);
          ctx.lineTo(11, -58);
          ctx.lineTo(16, -66);
          ctx.lineTo(16, -52);
          ctx.lineTo(-4, -52);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      function drawReadyHint() {
        if (state.started) return;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.66)';
        ctx.beginPath();
        ctx.roundRect(105, 420, 190, 44, 22);
        ctx.fill();
        ctx.fillStyle = '#874e00';
        ctx.font = '700 18px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('Tap anywhere to flap', 200, 448);
        ctx.restore();
      }

      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }

      function draw() {
        drawBackground();
        state.pipes.forEach(drawPipe);
        drawParticles();
        drawGoose();
        drawReadyHint();
      }

      function loop(timestamp) {
        if (!state.lastTime) state.lastTime = timestamp;
        const dt = Math.min((timestamp - state.lastTime) / 1000, 0.032);
        state.lastTime = timestamp;
        update(dt);
        draw();
        requestAnimationFrame(loop);
      }

      function interact() {
        ensureAudio();
        if (!state.started) {
          startGame();
        } else if (state.gameOver) {
          resetGame();
        } else {
          flap();
        }
      }

      startButton.addEventListener('click', () => {
        ensureAudio();
        if (state.gameOver) {
          resetGame();
          return;
        }
        startGame();
      });

      soundButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('elevated-avian-sound', state.soundEnabled ? 'on' : 'off');
        syncSoundUI();
        if (state.soundEnabled) {
          ensureAudio();
          playTone({ frequency: 720, frequencyEnd: 840, type: 'sine', duration: 0.08, volume: 0.03 });
        }
      });

      window.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.code === 'ArrowUp') {
          event.preventDefault();
          interact();
        }
        if (event.code === 'KeyM') {
          event.preventDefault();
          state.soundEnabled = !state.soundEnabled;
          localStorage.setItem('elevated-avian-sound', state.soundEnabled ? 'on' : 'off');
          syncSoundUI();
          if (state.soundEnabled) {
            ensureAudio();
            playTone({ frequency: 720, frequencyEnd: 840, type: 'sine', duration: 0.08, volume: 0.03 });
          }
        }
      }, { passive: false });

      canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        interact();
      });

      overlay.addEventListener('pointerdown', (event) => {
        if (event.target === startButton || event.target === soundButton) return;
        event.preventDefault();
        interact();
      });

      syncSoundUI();
      resetGame();
      requestAnimationFrame(loop);
    })();
