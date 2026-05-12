// Canvas Particle Background
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = Math.random() > 0.5 ? 'rgba(255, 61, 0, 0.5)' : 'rgba(213, 0, 249, 0.5)';
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if(this.x > width) this.x = 0;
        if(this.x < 0) this.x = width;
        if(this.y > height) this.y = 0;
        if(this.y < 0) this.y = height;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    let numParticles = window.innerWidth < 768 ? 50 : 150;
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Draw connecting lines
    for(let i=0; i<particles.length; i++){
        for(let j=i+1; j<particles.length; j++){
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if(dist < 100) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist/1000})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// --- Application Logic & Animations ---

// Register GSAP plugins
gsap.registerPlugin(TextPlugin);

// Elements
const introScreen = document.getElementById('intro-screen');
const appContainer = document.getElementById('app-container');
const startBtn = document.getElementById('start-btn');
const bootText = document.getElementById('boot-text');

// Boot Sequence Text
const bootLines = [
    "Initializing Neural Engine v4.2...",
    "Connecting to IPL Database...",
    "Loading 500+ Player Profiles...",
    "Calibrating Mind Reading Algorithms...",
    "System Ready."
];

// Intro Animation
function runIntroSequence() {
    let tl = gsap.timeline();
    
    bootLines.forEach((line, index) => {
        tl.to(bootText, {
            text: bootLines.slice(0, index + 1).join('\n'),
            duration: 0.5,
            ease: "none"
        });
    });
    
    tl.to(bootText, { opacity: 0, duration: 0.5, delay: 0.5 })
      .fromTo(".intro-title", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)" }, "-=0.2")
      .fromTo(".intro-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.5")
      .fromTo(startBtn, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
}

window.addEventListener('load', () => {
    runIntroSequence();
});

// Start Game Transition
startBtn.addEventListener('click', () => {
    gsap.to(introScreen, {
        opacity: 0,
        scale: 1.1,
        duration: 0.8,
        ease: "power3.inOut",
        onComplete: () => {
            introScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            // App Entrance Animations
            let appTl = gsap.timeline();
            appTl.fromTo(".top-header", {y: -50, opacity: 0}, {y: 0, opacity: 1, duration: 0.6})
                 .fromTo(".left-sidebar", {x: -50, opacity: 0}, {x: 0, opacity: 1, duration: 0.6}, "-=0.4")
                 .fromTo(".right-ai-panel", {x: 50, opacity: 0}, {x: 0, opacity: 1, duration: 0.6}, "-=0.6")
                 .fromTo(".center-game-panel", {scale: 0.9, opacity: 0}, {scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.2)"}, "-=0.4");
                 
            startGameLogic();
        }
    });
});

// Game Logic Integration
let qCount = 1;
let currentQuestionText = "";
let sessionId = "";
let finalGuessedPlayer = ""; // Store the final guess

// --- Game State Management ---
let gameState = JSON.parse(localStorage.getItem('iplAkinatorState')) || {
    totalGames: 0,
    successfulGuesses: 0,
    streak: 0,
    coins: 200,
    recentGuesses: [] // Array of {name: "MS Dhoni", correct: true}
};

function saveState() {
    localStorage.setItem('iplAkinatorState', JSON.stringify(gameState));
    updateSidebarStats();
}

function updateSidebarStats() {
    const accuracy = gameState.totalGames === 0 ? 0 : Math.round((gameState.successfulGuesses / gameState.totalGames) * 100);
    document.getElementById('stat-accuracy').innerText = `${accuracy}%`;
    document.getElementById('stat-streak').innerText = gameState.streak;
    document.getElementById('stat-coins').innerText = gameState.coins;
    
    const list = document.getElementById('recent-guesses-list');
    list.innerHTML = '';
    
    if (gameState.recentGuesses.length === 0) {
        list.innerHTML = '<li style="color: var(--text-secondary); font-style: italic; justify-content: center;">No games played yet.</li>';
    } else {
        gameState.recentGuesses.forEach(guess => {
            const icon = guess.correct ? '<i class="fa-solid fa-check text-green"></i>' : '<i class="fa-solid fa-xmark" style="color: var(--color-neon-pink);"></i>';
            list.innerHTML += `
                <li>
                    <div class="player-avatar" style="background: var(--bg-light); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-user"></i></div>
                    <span>${guess.name}</span>
                    ${icon}
                </li>
            `;
        });
    }
}

// Initialize sidebar on load
updateSidebarStats();

function updateTopCandidatesList(candidates) {
    document.querySelector('.recent-guesses h3').innerText = "AI's Top Suspects";
    const list = document.getElementById('recent-guesses-list');
    list.innerHTML = '';
    
    candidates.forEach(cand => {
        list.innerHTML += `
            <li style="animation: fadeIn 0.3s ease-out; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="player-avatar" style="background: var(--bg-light); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-user-secret" style="color: var(--color-neon-blue);"></i></div>
                    <span>${cand.name}</span>
                </div>
                <span style="color: var(--color-neon-blue); font-weight: bold; font-family: var(--font-primary);">${cand.prob}%</span>
            </li>
        `;
    });
}

const questionText = document.getElementById('question-text');
const qNum = document.getElementById('q-num');
const optionsBtns = document.querySelectorAll('#standard-options .option-btn');
const standardOptions = document.getElementById('standard-options');
const nationalityOptions = document.getElementById('nationality-options');
const roleOptions = document.getElementById('role-options');
const teamOptions = document.getElementById('team-options');
const typingIndicator = document.getElementById('typing-indicator');
const speechBubble = document.getElementById('speech-bubble');



function showAIThinking(text) {
    speechBubble.innerHTML = `<p>${text}</p>`;
    gsap.to(speechBubble, {opacity: 1, scale: 1, duration: 0.3});
    
    setTimeout(() => {
        gsap.to(speechBubble, {opacity: 0, scale: 0.8, duration: 0.3});
    }, 2500);
}

let initialData = {
    is_indian: null,
    role: null,
    team: null
};

async function startGameLogic() {
    qNum.innerText = 1;
    questionText.innerHTML = '';
    standardOptions.style.display = 'none';
    teamOptions.style.display = 'none';
    roleOptions.style.display = 'none';
    nationalityOptions.style.display = 'grid';
    gsap.set(nationalityOptions, {opacity: 0, y: 20});
    
    typingIndicator.style.display = 'block';
    showAIThinking("Connecting to AI Brain...");
    
    setTimeout(() => {
        typingIndicator.style.display = 'none';
        gsap.to(questionText, {
            text: "Is your player from India?",
            duration: 1.5,
            ease: "none",
            onComplete: () => {
                gsap.to(nationalityOptions, {opacity: 1, y: 0, duration: 0.4});
            }
        });
    }, 1000);
}

// Add Ripple Effect
function addRipple(e, btn) {
    let ripple = document.createElement('span');
    ripple.classList.add('ripple');
    btn.appendChild(ripple);
    let rect = btn.getBoundingClientRect();
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    setTimeout(() => ripple.remove(), 600);
}

// 1. Handle Nationality
document.querySelectorAll('.nat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        initialData.is_indian = btn.getAttribute('data-nat') === 'indian';
        addRipple(e, btn);
        
        gsap.to(nationalityOptions, {opacity: 0, y: 20, duration: 0.2, onComplete: () => {
            nationalityOptions.style.display = 'none';
            qNum.innerText = 2;
            roleOptions.style.display = 'grid';
            gsap.set(roleOptions, {opacity: 0, y: 20});
            
            questionText.innerHTML = "What is the player's primary role?";
            gsap.to(roleOptions, {opacity: 1, y: 0, duration: 0.4});
        }});
    });
});

// 2. Handle Role
document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        initialData.role = btn.getAttribute('data-role');
        addRipple(e, btn);
        
        gsap.to(roleOptions, {opacity: 0, y: 20, duration: 0.2, onComplete: () => {
            roleOptions.style.display = 'none';
            qNum.innerText = 3;
            teamOptions.style.display = 'grid';
            gsap.set(teamOptions, {opacity: 0, y: 20});
            
            questionText.innerHTML = "Which team is the player playing for now?";
            gsap.to(teamOptions, {opacity: 1, y: 0, duration: 0.4});
        }});
    });
});

// 3. Handle Team & Start API
document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        initialData.team = btn.getAttribute('data-team');
        addRipple(e, btn);
        
        gsap.to(teamOptions, {opacity: 0, y: 20, duration: 0.2, onComplete: () => {
            teamOptions.style.display = 'none';
            standardOptions.style.display = 'grid';
            gsap.set(standardOptions, {opacity: 1});
        }});
        
        questionText.innerHTML = '';
        typingIndicator.style.display = 'block';
        showAIThinking("Calculating points & filtering...");
        
        try {
            // Wait a tiny bit to simulate network delay for effect
            await new Promise(r => setTimeout(r, 600));
            const data = window.startEngine(initialData);
            
            sessionId = data.session_id;
            currentQuestionText = data.question;
            qCount = data.question_count; // Will be 4
            if (data.top_candidates) {
                updateTopCandidatesList(data.top_candidates);
            }
            loadQuestion();
        } catch(err) {
            console.error(err);
            questionText.innerHTML = "Error initializing AI Brain.";
            typingIndicator.style.display = 'none';
        }
    });
});

function loadQuestion() {
    qNum.innerText = qCount;
    
    // Hide buttons, show typing
    gsap.to(optionsBtns, {opacity: 0, y: 20, duration: 0.2, stagger: 0.05});
    questionText.innerHTML = '';
    typingIndicator.style.display = 'block';
    
    showAIThinking(qCount === 1 ? "Let's begin..." : "Hmm, interesting...");
    
    setTimeout(() => {
        typingIndicator.style.display = 'none';
        
        // Typewriter effect for question
        gsap.to(questionText, {
            text: currentQuestionText,
            duration: Math.min(1.5, currentQuestionText.length * 0.05),
            ease: "none",
            onComplete: () => {
                // Show options
                gsap.to(optionsBtns, {opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "back.out(1.5)"});
            }
        });
    }, 1000);
}

async function sendAnswer(ans) {
    gsap.to(optionsBtns, {opacity: 0, y: 20, duration: 0.2});
    questionText.innerHTML = '';
    typingIndicator.style.display = 'block';
    
    try {
        await new Promise(r => setTimeout(r, 500));
        const data = window.answerEngine(ans);
        
        if (data.status === "asking") {
            currentQuestionText = data.question;
            qCount = data.question_count;
            if (data.top_candidates) {
                updateTopCandidatesList(data.top_candidates);
            }
            loadQuestion();
        } else if (data.status === "guessed") {
            showResult(data.player);
        } else {
            showResult(null); // failed
        }
    } catch(e) {
        console.error(e);
    }
}

// Option Clicks
optionsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        let ans = btn.getAttribute('data-answer');
        // Add ripple effect
        let ripple = document.createElement('span');
        ripple.classList.add('ripple');
        let rect = btn.getBoundingClientRect();
        ripple.style.left = `${e.clientX - rect.left}px`;
        ripple.style.top = `${e.clientY - rect.top}px`;
        
        // Change mood indicator randomly
        const moods = ["Thinking...", "Intrigued", "Confident", "Analyzing"];
        document.querySelector('.mood-indicator span').innerText = moods[Math.floor(Math.random() * moods.length)];
        
        sendAnswer(ans);
    });
});

// Result Reveal
const resultCard = document.getElementById('result-card');
const playAgainBtn = document.getElementById('play-again-btn');

function showResult(playerData) {
    typingIndicator.style.display = 'none';
    gsap.to(questionText, {opacity: 0, duration: 0.3});
    gsap.to(optionsBtns, {opacity: 0, duration: 0.3});
    
    setTimeout(() => {
        standardOptions.style.display = 'none';
        document.getElementById('result-card').classList.remove('hidden');
        
        finalGuessedPlayer = playerData.name;
        document.getElementById('guessed-name').innerText = playerData.name;
        document.getElementById('guessed-team').innerText = playerData.teams ? playerData.teams[0] : "Unknown";
        document.getElementById('guessed-role').innerText = playerData.role || "Unknown";
        
        // Reset validation UI
        document.getElementById('guess-validation').style.display = 'block';
        document.getElementById('play-again-container').style.display = 'none';
        document.querySelector('.result-title').innerText = "IS THIS YOUR PLAYER?";
        
        // Restore Recent Guesses title and content
        document.querySelector('.recent-guesses h3').innerText = "Recent Guesses";
        updateSidebarStats();
        
        gsap.fromTo('#result-card', {scale: 0.8, opacity: 0}, {scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)"});
        showAIThinking("I found them!", "Victorious");
    }, 400);
}

// Handle Yes/No Guess Validation
document.getElementById('guess-yes-btn').addEventListener('click', () => {
    // Win logic
    gameState.totalGames++;
    gameState.successfulGuesses++;
    gameState.streak++;
    gameState.coins += 150;
    
    // Add to recent (keep last 3)
    gameState.recentGuesses.unshift({name: finalGuessedPlayer, correct: true});
    if (gameState.recentGuesses.length > 3) gameState.recentGuesses.pop();
    
    saveState();
    
    document.querySelector('.result-title').innerText = "I GUESSED IT!";
    document.getElementById('guess-validation').style.display = 'none';
    document.getElementById('play-again-container').style.display = 'block';
    
    // Confetti
    for(let i=0; i<50; i++){
        let conf = document.createElement('div');
        conf.classList.add('confetti');
        conf.style.left = Math.random() * 100 + '%';
        conf.style.animationDelay = Math.random() * 2 + 's';
        conf.style.backgroundColor = ['#00F3FF', '#D500F9', '#FFD700', '#00E676'][Math.floor(Math.random()*4)];
        document.querySelector('.confetti-container').appendChild(conf);
    }
});

document.getElementById('guess-no-btn').addEventListener('click', () => {
    // Lose logic
    gameState.totalGames++;
    gameState.streak = 0;
    
    // Add to recent
    gameState.recentGuesses.unshift({name: finalGuessedPlayer, correct: false});
    if (gameState.recentGuesses.length > 3) gameState.recentGuesses.pop();
    
    saveState();
    
    document.querySelector('.result-title').innerText = "YOU DEFEATED ME!";
    document.querySelector('.result-title').style.color = "var(--color-neon-pink)";
    document.querySelector('.result-title').style.textShadow = "0 0 10px rgba(213, 0, 249, 0.5)";
    
    document.getElementById('guess-validation').style.display = 'none';
    document.getElementById('play-again-container').style.display = 'block';
    showAIThinking("You win this round...", "Defeated");
});

function createConfetti() {
    const container = document.querySelector('.confetti-container');
    container.innerHTML = '';
    const colors = ['#ff3d00', '#ffd700', '#00e676', '#d500f9'];
    
    for(let i=0; i<100; i++) {
        let conf = document.createElement('div');
        conf.style.position = 'absolute';
        conf.style.width = Math.random() * 10 + 5 + 'px';
        conf.style.height = Math.random() * 5 + 5 + 'px';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = '50%';
        conf.style.top = '50%';
        
        container.appendChild(conf);
        
        gsap.to(conf, {
            x: (Math.random() - 0.5) * window.innerWidth,
            y: (Math.random() - 0.5) * window.innerHeight,
            rotation: Math.random() * 360,
            opacity: 0,
            duration: Math.random() * 2 + 1,
            ease: "power2.out"
        });
    }
}

        


playAgainBtn.addEventListener('click', () => {
    gsap.to(resultCard, {
        opacity: 0,
        scale: 0.9,
        duration: 0.4,
        onComplete: () => {
            resultCard.classList.add('hidden');
            startGameLogic();
        }
    });
});

// --- 3D Hover & Ambient Glow Effects ---
const ambientGlow = document.getElementById('ambient-glow');
const mainContentArea = document.getElementById('main-content-area');
const panels = document.querySelectorAll('.glass-panel');

document.addEventListener('mousemove', (e) => {
    // Move ambient glow with cursor
    if (ambientGlow) {
        ambientGlow.style.left = `${e.clientX}px`;
        ambientGlow.style.top = `${e.clientY}px`;
    }
    
    // 3D Tilt Effect for Glass Panels
    panels.forEach(panel => {
        const rect = panel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Only tilt if mouse is nearby or inside
        if (x > -100 && x < rect.width + 100 && y > -100 && y < rect.height + 100) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5; // max 5 degrees
            const rotateY = ((x - centerX) / centerX) * 5;
            
            panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
            panel.style.transition = 'transform 0.1s ease-out';
        } else {
            panel.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            panel.style.transition = 'transform 0.5s ease-out';
        }
    });
});

