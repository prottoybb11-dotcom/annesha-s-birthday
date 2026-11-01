/**
 * Cricket Birthday — script.js
 * Screens: Landing → Coin Toss → Cricket Game (Batting + Bowling)
 *
 * Transition system: all screens are position:fixed and stacked.
 * Showing a screen = add .active (opacity:1, pointer-events:auto)
 * Hiding a screen  = remove .active (opacity:0, pointer-events:none)
 * z-index order keeps the outgoing screen on top during the crossfade.
 */

'use strict';

/* =============================================
   REDUCED MOTION PREFERENCE
   ============================================= */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
  `;
  document.head.appendChild(style);
}

/* =============================================
   SCREEN TRANSITION UTILITIES
   ============================================= */

/* =============================================
   SCROLL RESET HELPER
   Resets every scrollable container to top.
   Called before and after each screen transition.
   ============================================= */
function resetAllScrolls() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelectorAll('*').forEach(el => {
    if (el.scrollTop > 0) el.scrollTop = 0;
  });
}

/**
 * transitionTo(nextId, addHistory)
 * Fades out every screen except nextId, fades in nextId.
 *
 * addHistory (default true) — set to false when called from the
 * popstate handler so we don't push a duplicate history entry.
 */
function transitionTo(nextId, addHistory = true) {
  const allScreens = [
    'landing-screen',
    'coin-toss-screen',
    'cricket-game-screen',
    'scoreboard-screen',
    'newspaper-screen',
  ];

  allScreens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === nextId) {
      el.style.zIndex = '50';
      setTimeout(() => {
        el.classList.add('active');
        resetAllScrolls();
        // Extra explicit reset on the target element itself —
        // fixed-position screens track scroll on the element, not window
        el.scrollTop = 0;
        if (el.scrollTo) el.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => {
          resetAllScrolls();
          el.scrollTop = 0;
          if (el.scrollTo) el.scrollTo({ top: 0, behavior: 'instant' });
        });
      }, 50);
    } else {
      el.classList.remove('active');
      setTimeout(() => { el.style.zIndex = ''; }, 750);
    }
  });

  // Also reset immediately before the paint
  resetAllScrolls();

  if (addHistory) {
    history.pushState({ screenId: nextId }, '', '#' + nextId);
  }
}

/* =============================================
   1. INIT LANDING SCREEN
   ============================================= */
function initLanding() {
  const landing = document.getElementById('landing-screen');
  if (!landing) return;
  landing.classList.add('active');
  /*
    NOTE: history.replaceState is intentionally NOT called here.
    The DOMContentLoaded block owns all URL/history setup so that
    initLanding() can be reused without clobbering the saved screen.
  */
}

/* =============================================
   2. VIDEO BACKGROUND
   ============================================= */
function initVideoBackground() {
  const video = document.getElementById('bg-video');
  if (!video) return;
  const p = video.play();
  if (p !== undefined) {
    p.catch(() => console.info('[BG Video] Autoplay blocked — poster shown.'));
  }
  video.addEventListener('error', () =>
    console.info('[BG Video] Source missing — poster shown.')
  );
}

/* =============================================
   3. TOSS THE COIN BUTTON (Landing → Coin Toss)
   ============================================= */
function initTossButton() {
  const btn = document.getElementById('toss-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    btn.disabled = true;
    transitionTo('coin-toss-screen');
  });
}

/* =============================================
   4. COIN TOSS LOGIC
   ============================================= */
function initCoinToss() {
  const startBtn   = document.getElementById('start-toss-btn');
  const coin       = document.getElementById('coin');
  const coinScene  = document.querySelector('.coin-scene');
  const resultEl   = document.getElementById('ct-result');
  const subtitleEl = document.getElementById('ct-subtitle');
  const romanticEl = document.getElementById('ct-romantic');
  const bettingBtn = document.getElementById('start-betting-btn');

  if (!startBtn || !coin) return;

  /* ---- Spin the coin ---- */
  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;

    // Reset any previous result state
    resultEl.classList.remove('show');
    romanticEl.classList.remove('show');
    bettingBtn.classList.remove('show');
    bettingBtn.setAttribute('aria-hidden', 'true');
    resultEl.textContent     = '';
    subtitleEl.style.opacity = '0';

    // Remove old animation classes so they can be re-triggered
    coinScene.classList.remove('tossing');
    coin.classList.remove('spin');

    // Force reflow — lets the browser register the class removal
    // before re-adding, which restarts the CSS animations from 0%
    void coinScene.offsetWidth;

    // Start arc (on scene) + flip (on coin) simultaneously
    coinScene.classList.add('tossing');
    coin.classList.add('spin');

    // Reveal result after animations complete (2.2s + 0.15s buffer)
    setTimeout(revealResult, 2350);
  });

  function revealResult() {
    // Arc is done — restore idle float
    coinScene.classList.remove('tossing');

    resultEl.textContent = 'HEAD';
    resultEl.classList.add('show');

    setTimeout(() => romanticEl.classList.add('show'), 400);

    setTimeout(() => {
      bettingBtn.classList.add('show');
      bettingBtn.removeAttribute('aria-hidden');
    }, 900);
  }

  /* ---- Start Betting → Cricket Game ---- */
  if (bettingBtn) {
    bettingBtn.addEventListener('click', () => {
      bettingBtn.disabled = true;
      transitionTo('cricket-game-screen');
    });
  }
}

/* =============================================
   5. BATTING GAME
   ============================================= */
function initBattingGame() {
  const arena     = document.getElementById('bat-arena');
  const ball      = document.getElementById('cg-ball');
  const bat       = document.getElementById('cg-bat');
  const flashEl   = document.getElementById('score-flash');
  const stack     = document.getElementById('commentary-feed');  // commentary feed
  const stumpsBtn = document.getElementById('hit-stumps-btn');
  const instEl    = document.getElementById('bat-instruction');
  const gameScr   = document.getElementById('cricket-game-screen');

  if (!arena || !ball || !bat || !gameScr) return;

  const ROMANTIC_MSGS = [
    'My Perfect Innings! Every moment with you is worth celebrating ❤️',
    'Straight to the Boundary! You make my heart skip a beat every single time 💗',
    'The Best Catch! Life\'s greatest blessing was catching someone like you ✨',
    'Player of My Life! No matter the match, you\'re always my MVP 🏆',
    'A Lifetime Partnership! Here\'s to a million more innings together ♾️',
  ];

  const MAX_HITS = 5;
  const BALL_R   = 17;  // px  (ball radius — diameter 34px)
  const BAT_W    = 62;
  const BAT_H    = 50;
  const BAT_BOTTOM_OFFSET = 14;

  let ballX, ballY, ballDX, ballDY;
  let ballCurve = 0;
  let ballDXMax = 0;   // cap for swing accumulation — set in resetBall
  let batCX     = 0;
  let hitCount  = 0;
  let active    = false;
  let rafId     = null;   // requestAnimationFrame handle (replaces setInterval)

  /* helpers */
  const W = () => arena.offsetWidth;
  const H = () => arena.offsetHeight;
  const batTopY = () => H() - BAT_BOTTOM_OFFSET - BAT_H;

  function resetBall() {
    const pitchFraction = 0.30 + Math.random() * 0.40;
    ballX = W() * pitchFraction - BALL_R;
    ballY = 8;

    /*
      STRICT UNIFORM SPEED — same every delivery, no randomness,
      no acceleration multipliers. Every ball travels at exactly
      4.5px/frame downward. Horizontal bias toward the bat zone
      but also fixed magnitude.
    */
    const BALL_SPEED   = 5.5;  // px per frame — smooth & readable
    const BALL_SPEED_X = 2.8;  // px per frame horizontal — constant

    ballDY = BALL_SPEED;

    const centreX = W() / 2;
    const aimSign = ballX + BALL_R < centreX ? 1 : -1;
    ballDX = aimSign * BALL_SPEED_X;

    // Cap matches initial speed exactly — no swing growth allowed
    ballDXMax = Math.abs(ballDX) * 1.15;

    // Light swing on 40 % of deliveries only, very small magnitude
    const swingRoll = Math.random();
    if      (swingRoll < 0.40) { ballCurve = 0; }
    else if (swingRoll < 0.70) { ballCurve =  0.03; }
    else                       { ballCurve = -0.03; }

    applyBallPos();
  }

  function applyBallPos() {
    /*
      Move the ball via transform: translate() instead of left/top.
      transform is composited on the GPU — zero layout reflow cost.
      The ball's CSS left/top are fixed at 0; only the transform changes.
    */
    ball.style.transform = `translate(${ballX}px, ${ballY}px)`;
  }

  function resetBat() {
    batCX = W() / 2;
    applyBatPos(batCX);
  }

  function applyBatPos(cx) {
    const half    = BAT_W / 2;
    const clamped = Math.max(half, Math.min(W() - half, cx));
    bat.style.left  = (clamped - half) + 'px';
    bat.style.right = 'auto';
    batCX = clamped;
  }

  function collides() {
    const bL  = batCX - BAT_W / 2;
    const bR  = batCX + BAT_W / 2;
    const bTY = batTopY();
    const bcx = ballX + BALL_R;
    const bcy = ballY + BALL_R;
    return bcx >= bL && bcx <= bR
        && bcy + BALL_R >= bTY && bcy <= bTY + BAT_H;
  }

  function tick() {
    if (!active) return;

    ballX += ballDX;
    ballY += ballDY;     // ballDY is constant — no gravity accumulation

    // Swing drift — clamp so it can't accelerate beyond ballDXMax
    ballDX += ballCurve;
    if (Math.abs(ballDX) > ballDXMax) {
      ballDX = ballDXMax * Math.sign(ballDX);
    }

    // Wall bounces
    if (ballX <= 0 || ballX + BALL_R * 2 >= W()) {
      ballDX    *= -1;
      ballCurve *= -1;
      ballX = Math.max(0, Math.min(W() - BALL_R * 2, ballX));
    }
    if (ballY <= 0) { ballDY = Math.abs(ballDY); ballY = 0; }

    if (collides()) { onHit(); return; }
    if (ballY > H()) resetBall();

    applyBallPos();
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function onHit() {
    if (hitCount >= MAX_HITS) return;
    hitCount++;
    active = false;
    stopLoop();

    // Score flash
    const sixChance = 0.3 + hitCount * 0.1;
    const runs = Math.random() < sixChance ? '6' : '4';
    flashEl.textContent = runs;
    flashEl.classList.remove('pop');
    void flashEl.offsetWidth;
    flashEl.classList.add('pop');

    // Bat glow
    bat.classList.remove('hit');
    void bat.offsetWidth;
    bat.classList.add('hit');

    /*
      Commentary feed — append a new card for each hit.
      Cards slide in from above and stack chronologically.
      Feed auto-scrolls to the latest entry.
    */
    if (stack) {
      const card = document.createElement('div');
      card.className   = 'commentary-card';
      card.textContent = ROMANTIC_MSGS[hitCount - 1];
      stack.appendChild(card);
      // Scroll the feed to reveal the newest card
      stack.scrollTop = stack.scrollHeight;
    }

    instEl.textContent = `Hit ${hitCount} of ${MAX_HITS} — keep going! 🏏`;

    setTimeout(() => {
      if (hitCount < MAX_HITS) {
        resetBall();
        active = true;
        startLoop();
      } else {
        stumpsBtn.classList.add('show');
        stumpsBtn.removeAttribute('aria-hidden');
        instEl.textContent = '🎉 Outstanding innings! Now hit the stumps!';
      }
    }, 1000);
  }

  /* Input — mouse */
  arena.addEventListener('mousemove', (e) => {
    const r = arena.getBoundingClientRect();
    applyBatPos(e.clientX - r.left);
  });

  /* Input — touch */
  arena.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const r = arena.getBoundingClientRect();
    applyBatPos(e.touches[0].clientX - r.left);
  }, { passive: false });

  /* Input — keyboard */
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'ArrowLeft')  applyBatPos(batCX - 18);
    if (e.key === 'ArrowRight') applyBatPos(batCX + 18);
  });

  /* Auto-start when cricket-game-screen gets .active */
  new MutationObserver(() => {
    if (gameScr.classList.contains('active') && hitCount === 0 && !active) {
      resetBall();
      resetBat();
      active = true;
      startLoop();
    }
  }).observe(gameScr, { attributes: true, attributeFilter: ['class'] });

  /* Hit The Stumps → bowling phase */
  stumpsBtn.addEventListener('click', () => {
    stumpsBtn.disabled = true;
    active = false;
    stopLoop();
    transitionToBowling();
  });
}

/* =============================================
   6. BOWLING GAME
   ============================================= */
function initBowlingGame() {
  const battingPhase = document.getElementById('batting-phase');
  const bowlingPhase = document.getElementById('bowling-phase');
  const stumpGroup   = document.querySelector('.stump-group');
  const bowlBall     = document.getElementById('bowl-ball');
  const bowlArena    = document.getElementById('bowl-arena');
  const hintEl       = document.getElementById('bowl-hint');
  const finaleEl     = document.getElementById('bowl-finale');
  const scoreboard   = document.getElementById('view-scoreboard-btn');
  const impactFlash  = document.getElementById('impact-flash');

  if (!bowlBall || !bowlArena) return;

  /* ---- Phase switch — called by batting game ---- */
  window.transitionToBowling = function () {
    battingPhase.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    battingPhase.style.opacity    = '0';
    battingPhase.style.transform  = 'translateY(-20px)';

    setTimeout(() => {
      battingPhase.style.display = 'none';
      battingPhase.setAttribute('aria-hidden', 'true');

      bowlingPhase.style.display  = 'flex';
      bowlingPhase.style.opacity  = '0';
      bowlingPhase.style.transform = 'translateY(20px)';
      bowlingPhase.removeAttribute('aria-hidden');

      requestAnimationFrame(() => requestAnimationFrame(() => {
        bowlingPhase.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        bowlingPhase.style.opacity    = '1';
        bowlingPhase.style.transform  = 'translateY(0)';
      }));
    }, 500);
  };

  /* ---- Drag state ---- */
  let isDragging = false;
  let startY     = 0;
  let startBot   = 0;
  let dragDY     = 0;
  let bowled     = false;

  const THROW_THRESHOLD = 60; // px upward drag required

  function getBallBottom() {
    return parseFloat(bowlBall.style.bottom) || 18;
  }

  function onDown(e) {
    if (bowled) return;
    isDragging = true;
    startY     = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    startBot   = getBallBottom();
    dragDY     = 0;
    bowlBall.classList.add('dragging');
    e.preventDefault();
  }

  function onMove(e) {
    if (!isDragging || bowled) return;
    const cy = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    dragDY = startY - cy;  // positive = dragged upward
    bowlBall.style.bottom = Math.max(18, startBot + dragDY) + 'px';
    e.preventDefault();
  }

  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    bowlBall.classList.remove('dragging');

    if (dragDY >= THROW_THRESHOLD && !bowled) {
      bowled = true;
      hintEl.classList.add('hidden');
      // Fly the ball up to the stumps
      bowlBall.style.transition = 'bottom 0.42s cubic-bezier(0.4,0,0.2,1)';
      bowlBall.style.bottom     = (bowlArena.offsetHeight + 10) + 'px';
      setTimeout(onStumpsHit, 440);
    } else {
      // Snap back
      bowlBall.style.transition = 'bottom 0.3s ease';
      bowlBall.style.bottom     = '18px';
      setTimeout(() => (bowlBall.style.transition = ''), 300);
    }
  }

  function onStumpsHit() {
    bowlBall.style.opacity = '0';
    stumpGroup.classList.add('hit');

    impactFlash.classList.remove('burst');
    void impactFlash.offsetWidth;
    impactFlash.classList.add('burst');

    // Update badge to show stumps broken
    const badgeEl = document.getElementById('bowl-badge');
    if (badgeEl) {
      badgeEl.textContent = 'STUMPS BROKEN: 1 / 1 ⚡';
      badgeEl.classList.remove('update');
      void badgeEl.offsetWidth;
      badgeEl.classList.add('update');
    }

    // Append neon-rose commentary card
    const feedEl = document.getElementById('bowl-commentary-feed');
    if (feedEl) {
      const card = document.createElement('div');
      card.className   = 'commentary-card';
      card.textContent = 'Clean Bowled! You hit my heart\'s target! 🎯💥';
      feedEl.appendChild(card);
    }

    setTimeout(() => finaleEl.classList.add('show'), 500);
    setTimeout(() => {
      scoreboard.classList.add('show');
      scoreboard.removeAttribute('aria-hidden');
    }, 1100);
  }

  bowlBall.addEventListener('mousedown',  onDown);
  bowlBall.addEventListener('touchstart', onDown,  { passive: false });
  document.addEventListener('mousemove',  onMove);
  document.addEventListener('touchmove',  onMove,  { passive: false });
  document.addEventListener('mouseup',    onUp);
  document.addEventListener('touchend',   onUp);

  scoreboard.addEventListener('click', () => {
    scoreboard.disabled = true;
    transitionTo('scoreboard-screen');
  });
}

/* =============================================
   8. SCOREBOARD & TROPHY (Screen 4)
   ============================================= */
function initScoreboard() {
  const continuBtn     = document.getElementById('continue-celebration-btn');
  const cardSection    = document.getElementById('sb-card-section');
  const trophySection  = document.getElementById('sb-trophy-section');
  const liftBtn        = document.getElementById('lift-trophy-btn');
  const trophyWrap     = document.getElementById('trophy-wrap');
  const trophyStage    = document.querySelector('.trophy-stage');
  const trophySpotlight= document.querySelector('.trophy-spotlight');
  const sparklesEl     = document.getElementById('trophy-sparkles');
  const crowdScene     = document.getElementById('crowd-scene');
  const namePopups     = document.getElementById('name-popups');
  const confettiCanvas = document.getElementById('trophy-confetti');
  const breakingBtn    = document.getElementById('breaking-news-btn');
  const eyebrowEl      = document.getElementById('trophy-eyebrow');
  const titleEl        = document.getElementById('trophy-title');

  if (!continuBtn) return;

  /* ---- Continue → show trophy section ---- */
  continuBtn.addEventListener('click', () => {
    continuBtn.disabled = true;

    cardSection.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    cardSection.style.opacity    = '0';
    cardSection.style.transform  = 'translateY(-16px)';

    setTimeout(() => {
      cardSection.style.display = 'none';
      cardSection.setAttribute('aria-hidden', 'true');

      trophySection.style.display = 'flex';
      trophySection.style.opacity = '0';
      trophySection.removeAttribute('aria-hidden');

      requestAnimationFrame(() => requestAnimationFrame(() => {
        trophySection.style.transition = 'opacity 0.55s ease';
        trophySection.style.opacity    = '1';
      }));
    }, 450);
  });

  /* ---- Lift The Trophy ---- */
  liftBtn.addEventListener('click', () => {
    liftBtn.disabled = true;

    // Smoothly hide the lift button
    liftBtn.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    liftBtn.style.opacity    = '0';
    liftBtn.style.transform  = 'translateY(8px)';
    setTimeout(() => { liftBtn.style.display = 'none'; }, 420);

    // 1. Light up the spotlight
    if (trophyStage) trophyStage.classList.add('lit');

    // 2. Animate trophy lift
    trophyWrap.classList.add('lifting');

    // 3. Golden sparkle burst from trophy centre
    setTimeout(() => spawnSparkles(sparklesEl), 80);

    // 4. Show crowd + confetti + popups
    setTimeout(() => {
      crowdScene.removeAttribute('aria-hidden');
      crowdScene.classList.add('active');
      startConfetti(confettiCanvas);
      spawnNamePopups(namePopups, 'ANNESHA', 8);
    }, 350);

    // 5. Update eyebrow + title text dynamically
    setTimeout(() => {
      if (eyebrowEl) eyebrowEl.textContent = '📣  CROWD IS SCREAMING YOUR NAME  📣';
      if (titleEl) {
        titleEl.innerHTML =
          'Tonight the entire<br><span class="sb-title-gold">Stadium Celebrates You ✨</span>';
      }
    }, 700);

    // 6. Peak celebration (1.8s) → fade crowd out, spring birthday card in
    setTimeout(() => {
      // Fade the crowd overlay out
      crowdScene.classList.remove('active');

      // After crowd fades (550ms), show the birthday wish card
      setTimeout(() => {
        const wishCard = document.getElementById('birthday-wish-card');
        const newsBtn  = document.getElementById('breaking-news-btn');
        if (wishCard) {
          wishCard.classList.add('visible');
        }
        // Make the button inside the card interactive
        if (newsBtn) {
          newsBtn.removeAttribute('aria-hidden');
        }
      }, 600);
    }, 1800);
  });

  /* ---- Breaking News → Newspaper ---- */
  if (breakingBtn) {
    breakingBtn.addEventListener('click', () => {
      breakingBtn.disabled = true;

      // Spring the card out
      const wishCard = document.getElementById('birthday-wish-card');
      if (wishCard) {
        wishCard.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        wishCard.style.opacity    = '0';
        wishCard.style.transform  = 'scale(1.06)';
      }

      setTimeout(() => transitionTo('newspaper-screen'), 450);
    });
  }
}

/* ---- Golden sparkle burst ---- */
function spawnSparkles(container) {
  if (!container) return;

  const COLORS = ['#f5e27a','#d4af37','#ffe066','#fff','#ff6b9d','#d4af37'];
  const COUNT  = 28;
  const cx     = container.offsetWidth  / 2 || 75;
  const cy     = container.offsetHeight / 2 || 110;

  for (let i = 0; i < COUNT; i++) {
    const el    = document.createElement('div');
    const angle = (360 / COUNT) * i + (Math.random() * 20 - 10);
    const dist  = 55 + Math.random() * 65;
    const rad   = (angle * Math.PI) / 180;
    const tx    = Math.cos(rad) * dist;
    const ty    = Math.sin(rad) * dist;
    const size  = 4 + Math.random() * 6;
    const dur   = 0.55 + Math.random() * 0.45;
    const delay = Math.random() * 0.18;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    el.className = 'sparkle';
    el.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      background: ${color};
      top:  ${cy}px;
      left: ${cx}px;
      box-shadow: 0 0 ${size * 2}px ${color};
      --tx: ${tx}px;
      --ty: ${ty}px;
      --dur: ${dur}s;
      --delay: ${delay}s;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + 0.1) * 1000);
  }
}

/* ---- Spawn floating name popups ---- */
function spawnNamePopups(container, name, count) {
  const label = name + '!';
  // Spread evenly across width to prevent overlap
  const slots = count;
  const slotW = 82 / slots;
  for (let i = 0; i < slots; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className   = 'name-popup';
      el.textContent = label + ' 🎉';
      // Each popup gets its own horizontal lane + small random jitter
      el.style.left   = (9 + i * slotW + Math.random() * (slotW * 0.6)) + '%';
      el.style.bottom = (18 + Math.random() * 10) + '%';
      container.appendChild(el);
      setTimeout(() => el.remove(), 3400);
    }, i * 300 + Math.random() * 60);
  }
}

/* ---- Trophy Confetti ---- */
function startConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#f5c518','#22c55e','#ef4444','#3b82f6','#a855f7','#ffffff','#ff6b9d'];
  const particles = Array.from({ length: 160 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height * -1,
    r:     Math.random() * 7 + 3,
    dx:    (Math.random() - 0.5) * 2,
    dy:    Math.random() * 3 + 2,
    tilt:  Math.random() * 10 - 5,
    tiltV: (Math.random() * 0.07) + 0.04,
    tiltA: 0,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  let raf;
  let tick = 0;
  const MAX_TICKS = 280; // auto-stop after ~12s

  function draw() {
    tick++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.tiltA += p.tiltV;
      p.y     += p.dy;
      p.x     += p.dx + Math.sin(tick * 0.02) * 0.5;
      p.tilt   = Math.sin(p.tiltA) * 11;

      ctx.beginPath();
      ctx.lineWidth   = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      // Wrap particles that fall off bottom
      if (p.y > canvas.height + 20 && tick < MAX_TICKS) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    if (tick < MAX_TICKS) {
      raf = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  cancelAnimationFrame(raf);
  draw();

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }, { once: true });
}

/* =============================================
   9. FLOODLIGHT PARALLAX (desktop only)
   ============================================= */
function initFloodlightParallax() {
  if (window.matchMedia('(hover: none)').matches) return;
  if (prefersReducedMotion) return;

  const flLeft  = document.querySelector('.fl-left');
  const flRight = document.querySelector('.fl-right');
  if (!flLeft || !flRight) return;

  document.addEventListener('mousemove', (e) => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    flLeft.style.transform  = `translate(${dx * 14}px, ${dy * 7}px)`;
    flRight.style.transform = `translate(${-dx * 14}px, ${dy * 7}px)`;
  });
}

/* =============================================
   10. NEWSPAPER (Screen 5)
   ============================================= */
function initNewspaper() {
  // Fill today's date
  const dateEl = document.getElementById('np-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).toUpperCase();
  }

  // Replay button — reset everything to Screen 1
  const replayBtn = document.getElementById('replay-btn');
  if (!replayBtn) return;

  replayBtn.addEventListener('click', () => {
    replayBtn.disabled = true;

    // Transition back to landing
    transitionTo('landing-screen');

    // After transition completes, do a full page reload to reset all game state
    setTimeout(() => window.location.reload(), 800);
  });
}

/* =============================================
   11. INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Always start fresh from the landing screen.
  // Clear any hash left in the URL from a previous session.
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
  // Clear any stored screen state so nothing redirects away from landing.
  try { localStorage.removeItem('dev_active_screen'); } catch (_) {}

  initVideoBackground();
  initTossButton();
  initCoinToss();
  initBattingGame();
  initBowlingGame();
  initScoreboard();
  initNewspaper();
  initFloodlightParallax();

  initLanding();   // show landing screen
});

/* =============================================
   12. BROWSER BACK / FORWARD (popstate)
   ============================================= */
window.addEventListener('popstate', (event) => {
  const targetId = (event.state && event.state.screenId)
    ? event.state.screenId
    : 'landing-screen';
  transitionTo(targetId, false);
});