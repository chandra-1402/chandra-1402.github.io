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

// --- Client-side Game Engine Fallback (for static environments like GitHub Pages) ---
let useLocalEngine = false;
let localPlayersPool = [];
let localSession = {
    pool: [],
    asked: [],
    questionCount: 0,
    currentFeature: null,
    history: []
};

const RAW_FEATURES = {
    "overseas": p => p.overseas || false,
    "batter": p => (p.role || "").includes("Batsman") || (p.role || "").includes("Batter"),
    "bowler": p => (p.role || "").includes("Bowler"),
    "keeper": p => p.keeper || false,
    "allrounder": p => p.allrounder || false,
    "pace": p => (p.pace || false) && !(p.allrounder || false),
    "spin": p => (p.spin || false) && !(p.allrounder || false),
    "leftBat": p => p.leftBat || false,
    "captain": p => p.captain || false,
    "finisher": p => p.finisher || false,
    "aggressive": p => p.aggressive || false,
    "legend": p => p.legend || false,
    "has_title": p => (p.titles || 0) > 0,
    "multi_titles": p => (p.titles || 0) >= 3,
    "orangeCap": p => p.orangeCap || false,
    "purpleCap": p => p.purpleCap || false,
    "active": p => p.active || false,
    "earlyEra": p => p.earlyEra || false,
    "csk": p => (p.teams || []).includes("CSK"),
    "mi": p => (p.teams || []).includes("MI"),
    "rcb": p => (p.teams || []).includes("RCB"),
    "kkr": p => (p.teams || []).includes("KKR"),
    "rr": p => (p.teams || []).includes("RR"),
    "srh": p => (p.teams || []).includes("SRH") || (p.teams || []).includes("DC"),
    "pbks": p => (p.teams || []).includes("PBKS"),
    "dc": p => ((p.teams || []).includes("DD") || (p.teams || []).includes("DC")) && !(p.teams || []).includes("SRH"),
    "gt": p => (p.teams || []).includes("GT") || (p.teams || []).includes("GL"),
    "lsg": p => (p.teams || []).includes("LSG") || (p.teams || []).includes("RPS"),
    "singleTeam": p => (p.teams || []).length === 1
};

const FEATURE_PROMPTS = {
    "overseas": "Is your player from outside India (overseas)?",
    "batter": "Is your player primarily a batsman?",
    "bowler": "Is your player primarily a pure bowler?",
    "keeper": "Does your player regularly keep wickets?",
    "allrounder": "Is your player a genuine all-rounder?",
    "pace": "Is your player primarily a fast or medium pace bowler?",
    "spin": "Is your player primarily a spin bowler?",
    "leftBat": "Does your player bat left-handed?",
    "captain": "Has your player ever captained an IPL franchise?",
    "finisher": "Is your player known as a finisher in the death overs?",
    "aggressive": "Is your player known for highly explosive, aggressive batting?",
    "legend": "Is your player considered an all-time IPL legend?",
    "has_title": "Has your player won at least one IPL championship?",
    "multi_titles": "Has your player won 3 or more IPL titles?",
    "orangeCap": "Has your player ever won the Orange Cap?",
    "purpleCap": "Has your player ever won the Purple Cap?",
    "active": "Is your player currently active in the IPL?",
    "earlyEra": "Was your player prominent in the early years of the IPL (2008-2012)?",
    "csk": "Has your player ever played for Chennai Super Kings (CSK)?",
    "mi": "Has your player ever played for Mumbai Indians (MI)?",
    "rcb": "Has your player ever played for Royal Challengers Bangalore (RCB)?",
    "kkr": "Has your player ever played for Kolkata Knight Riders (KKR)?",
    "rr": "Has your player ever played for Rajasthan Royals (RR)?",
    "srh": "Has your player been associated with Sunrisers Hyderabad or Deccan Chargers?",
    "pbks": "Has your player ever played for Punjab Kings (or KXIP)?",
    "dc": "Has your player ever played for Delhi Capitals (or Daredevils)?",
    "gt": "Has your player ever played for Gujarat Titans or Gujarat Lions?",
    "lsg": "Has your player played for Lucknow Super Giants or Pune Supergiant?",
    "singleTeam": "Has your player played for only ONE franchise their entire IPL career?"
};

function getFeatureValue(p, f_name) {
    if (p.learned_traits && p.learned_traits[f_name] !== undefined) {
        return p.learned_traits[f_name];
    }
    return RAW_FEATURES[f_name](p);
}

async function loadLocalPlayers() {
    try {
        const res = await fetch("data.json");
        const basePlayers = await res.json();
        
        const customPlayers = JSON.parse(localStorage.getItem('iplAkinatorCustomPlayers')) || [];
        localPlayersPool = [...basePlayers];
        
        const learnedTraitsMap = JSON.parse(localStorage.getItem('iplAkinatorLearnedTraits')) || {};
        localPlayersPool.forEach(p => {
            if (learnedTraitsMap[p.name.toLowerCase()]) {
                p.learned_traits = { ...(p.learned_traits || {}), ...learnedTraitsMap[p.name.toLowerCase()] };
            }
        });
        
        customPlayers.forEach(cp => {
            if (!localPlayersPool.some(p => p.name.toLowerCase() === cp.name.toLowerCase())) {
                localPlayersPool.push(cp);
            }
        });
        console.log(`Successfully loaded client-side database: ${localPlayersPool.length} players ready.`);
    } catch(e) {
        console.error("Failed to load local players pool:", e);
    }
}

// Perform pre-load immediately on load
window.addEventListener('DOMContentLoaded', loadLocalPlayers);

function chooseBestLocalFeature(pool, asked) {
    let bestF = null;
    let minDiff = Infinity;
    
    const sortedPool = [...pool].sort((a, b) => b.score - a.score);
    const topCandidates = sortedPool.slice(0, 20).map(x => x.player);
    
    const total = topCandidates.length;
    if (total <= 1) {
        const unasked = Object.keys(RAW_FEATURES).filter(f => !asked.includes(f));
        if (unasked.length > 0) {
            return unasked[Math.floor(Math.random() * unasked.length)];
        }
        return null;
    }
    
    for (const fName in RAW_FEATURES) {
        if (asked.includes(fName)) continue;
        
        let yesCount = 0;
        topCandidates.forEach(p => {
            if (getFeatureValue(p, fName)) yesCount++;
        });
        const noCount = total - yesCount;
        const diff = Math.abs(yesCount - noCount);
        
        if (diff < minDiff && yesCount > 0 && noCount > 0) {
            minDiff = diff;
            bestF = fName;
        }
    }
    
    if (!bestF) {
        const unasked = Object.keys(RAW_FEATURES).filter(f => !asked.includes(f));
        if (unasked.length > 0) {
            bestF = unasked[0];
        }
    }
    
    return bestF;
}

function getLocalTopSuspects(pool) {
    const sortedPool = [...pool].sort((a, b) => b.score - a.score);
    const top10 = sortedPool.slice(0, 10);
    if (top10.length === 0) return [];
    
    const maxScore = top10[0].score;
    const exps = top10.map(item => Math.exp(Math.max(-20, (item.score - maxScore) / 2.0)));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    
    let topCandidates = [];
    for (let i = 0; i < Math.min(4, top10.length); i++) {
        let prob = Math.round((exps[i] / sumExps) * 100);
        if (prob === 0 && exps[i] > 0.0001) prob = 1;
        topCandidates.push({ name: top10[i].player.name, prob: prob });
    }
    
    const totalProb = topCandidates.reduce((sum, c) => sum + c.prob, 0);
    if (topCandidates.length > 0 && totalProb < 100) {
        topCandidates[0].prob += (100 - totalProb);
    }
    
    return topCandidates;
}

function startLocalEngine(initialData) {
    useLocalEngine = true;
    console.log("Starting client-side Game Engine fallback...");
    
    let pool = localPlayersPool.map(p => ({ player: p, score: 0 }));
    
    const isIndian = initialData.is_indian;
    if (isIndian !== null) {
        pool.forEach(item => {
            const pOverseas = item.player.overseas || false;
            if (pOverseas !== isIndian) {
                item.score += 10;
            } else {
                item.score -= 10;
            }
        });
    }
    
    const role = initialData.role;
    if (role) {
        pool.forEach(item => {
            const pRole = (item.player.role || "").toLowerCase();
            const pAllrounder = item.player.allrounder || false;
            const pKeeper = item.player.keeper || false;
            
            if (role === "batter" && pRole.includes("batsman")) {
                item.score += 10;
            } else if (role === "bowler" && pRole.includes("bowler")) {
                item.score += 10;
            } else if (role === "allrounder" && pAllrounder) {
                item.score += 10;
            } else if (role === "keeper" && pKeeper) {
                item.score += 10;
            } else {
                item.score -= 5;
            }
        });
    }
    
    const team = initialData.team;
    if (team) {
        pool.forEach(item => {
            const pActive = item.player.active || false;
            const pTeams = item.player.teams || [];
            
            if (team === "Not Playing") {
                if (!pActive) {
                    item.score += 10;
                } else {
                    item.score -= 10;
                }
            } else if (team !== "ALL") {
                if (pActive && pTeams.includes(team)) {
                    item.score += 10;
                } else {
                    item.score -= 10;
                }
            }
        });
    }
    
    localSession = {
        pool: pool,
        asked: ["overseas", "batter", "bowler", "keeper", "allrounder", "csk", "mi", "rcb", "kkr", "rr", "srh", "pbks", "dc", "gt", "lsg", "active"],
        questionCount: 3,
        history: []
    };
    
    const firstFeature = chooseBestLocalFeature(localSession.pool, localSession.asked);
    if (!firstFeature) {
        showResult(pool[0].player);
        return;
    }
    localSession.asked.push(firstFeature);
    localSession.currentFeature = firstFeature;
    
    currentQuestionText = FEATURE_PROMPTS[firstFeature];
    qCount = 4;
    
    const suspects = getLocalTopSuspects(localSession.pool);
    updateTopCandidatesList(suspects);
    
    typingIndicator.style.display = 'none';
    loadQuestion();
}

function answerLocalEngine(ans) {
    const currF = localSession.currentFeature;
    localSession.history.push({ feature: currF, answer: ans });
    
    localSession.pool.forEach(item => {
        const hasFeature = getFeatureValue(item.player, currF);
        if (ans === "yes") {
            item.score += hasFeature ? 3 : -3;
        } else if (ans === "no") {
            item.score += !hasFeature ? 3 : -3;
        } else if (ans === "probably") {
            item.score += hasFeature ? 1 : -1;
        } else if (ans === "probably_not") {
            item.score += !hasFeature ? 1 : -1;
        }
    });
    
    localSession.questionCount++;
    
    const sortedPool = [...localSession.pool].sort((a, b) => b.score - a.score);
    const topScore = sortedPool[0].score;
    const runnerUpScore = sortedPool.length > 1 ? sortedPool[1].score : -999;
    const scoreDiff = topScore - runnerUpScore;
    
    let confidence = 40;
    if (scoreDiff >= 6) {
        confidence = 90 + scoreDiff;
    } else if (scoreDiff >= 4) {
        confidence = 80;
    } else if (scoreDiff >= 2) {
        confidence = 60;
    }
    confidence = Math.min(99, confidence);
    
    if ((confidence >= 85 && localSession.questionCount >= 9) || localSession.questionCount >= 15) {
        showResult(sortedPool[0].player);
        return;
    }
    
    let nextF = chooseBestLocalFeature(localSession.pool, localSession.asked);
    
    if (!nextF && localSession.questionCount < 9) {
        const available = Object.keys(RAW_FEATURES).filter(f => !localSession.asked.includes(f));
        if (available.length > 0) {
            nextF = available[Math.floor(Math.random() * available.length)];
        }
    }
    
    if (!nextF) {
        showResult(sortedPool[0].player);
        return;
    }
    
    localSession.asked.push(nextF);
    localSession.currentFeature = nextF;
    
    currentQuestionText = FEATURE_PROMPTS[nextF];
    qCount = localSession.questionCount + 1;
    
    const suspects = getLocalTopSuspects(localSession.pool);
    updateTopCandidatesList(suspects);
    
    loadQuestion();
}

function learnLocalEngine(correctName) {
    const history = localSession.history;
    
    let playerIdx = localPlayersPool.findIndex(p => p.name.toLowerCase() === correctName.toLowerCase());
    
    if (playerIdx === -1) {
        const newPlayer = {
            name: correctName.trim().replace(/\b\w/g, c => c.toUpperCase()),
            teams: [],
            role: "Unknown",
            country: "Unknown",
            learned_traits: {}
        };
        
        history.forEach(item => {
            const feat = item.feature;
            const ans = item.answer;
            if (ans === "yes") {
                newPlayer.learned_traits[feat] = true;
            } else if (ans === "no") {
                newPlayer.learned_traits[feat] = false;
            }
        });
        
        localPlayersPool.push(newPlayer);
        
        const customPlayers = JSON.parse(localStorage.getItem('iplAkinatorCustomPlayers')) || [];
        customPlayers.push(newPlayer);
        localStorage.setItem('iplAkinatorCustomPlayers', JSON.stringify(customPlayers));
    } else {
        const player = localPlayersPool[playerIdx];
        if (!player.learned_traits) player.learned_traits = {};
        
        const learnedTraitsMap = JSON.parse(localStorage.getItem('iplAkinatorLearnedTraits')) || {};
        const pNameLower = player.name.toLowerCase();
        if (!learnedTraitsMap[pNameLower]) learnedTraitsMap[pNameLower] = {};
        
        history.forEach(item => {
            const feat = item.feature;
            const ans = item.answer;
            if (ans === "yes") {
                player.learned_traits[feat] = true;
                learnedTraitsMap[pNameLower][feat] = true;
            } else if (ans === "no") {
                player.learned_traits[feat] = false;
                learnedTraitsMap[pNameLower][feat] = false;
            }
        });
        
        localStorage.setItem('iplAkinatorLearnedTraits', JSON.stringify(learnedTraitsMap));
    }
    
    showAIThinking("Got it! I will remember this player next time.", "Satisfied");
    document.getElementById('learning-container').style.display = 'none';
    document.getElementById('play-again-container').style.display = 'block';
}

let initialData = {
    is_indian: null,
    role: null,
    team: null
};

async function startGameLogic() {
    useLocalEngine = false; // Reset to try server first
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
            const res = await fetch("http://127.0.0.1:5001/start", { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initialData)
            });
            const data = await res.json();
            sessionId = data.session_id;
            currentQuestionText = data.question;
            qCount = data.question_count; // Will be 4
            if (data.top_candidates) {
                updateTopCandidatesList(data.top_candidates);
            }
            loadQuestion();
        } catch(err) {
            console.error("Failed to connect to local app.py. Falling back to local engine...", err);
            startLocalEngine(initialData);
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
    if (useLocalEngine) {
        answerLocalEngine(ans);
        return;
    }
    
    gsap.to(optionsBtns, {opacity: 0, y: 20, duration: 0.2});
    questionText.innerHTML = '';
    typingIndicator.style.display = 'block';
    
    try {
        const res = await fetch("http://127.0.0.1:5001/answer", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, answer: ans })
        });
        const data = await res.json();
        
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
        console.error("Server answer API failed. Falling back to local engine mid-game...", e);
        startLocalEngine(initialData);
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

async function fetchPlayerImage(name) {
    try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.player && data.player.length > 0 && data.player[0].strThumb) {
            return data.player[0].strThumb;
        }
    } catch (e) {
        console.error("Error fetching image:", e);
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=101020&color=00F3FF&size=200`;
}

function showResult(playerData) {
    typingIndicator.style.display = 'none';
    gsap.to(questionText, {opacity: 0, duration: 0.3});
    gsap.to(optionsBtns, {opacity: 0, duration: 0.3});
    
    setTimeout(async () => {
        standardOptions.style.display = 'none';
        document.getElementById('result-card').classList.remove('hidden');
        
        finalGuessedPlayer = playerData.name;
        document.getElementById('guessed-name').innerText = playerData.name;
        document.getElementById('guessed-team').innerText = playerData.teams ? playerData.teams[0] : "Unknown";
        document.getElementById('guessed-role').innerText = playerData.role || "Unknown";
        
        const imgEl = document.getElementById('guessed-player-img');
        const placeholder = document.getElementById('player-placeholder');
        imgEl.style.display = 'none';
        placeholder.style.display = 'flex';
        
        const imgSrc = await fetchPlayerImage(playerData.name);
        imgEl.src = imgSrc;
        
        // Add error handler to fallback to UI avatar
        imgEl.onerror = function() {
            this.onerror = null;
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerData.name)}&background=101020&color=00F3FF&size=200`;
        };

        imgEl.onload = () => {
            placeholder.style.display = 'none';
            imgEl.style.display = 'block';
            gsap.fromTo(imgEl, {scale: 0.5, opacity: 0}, {scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)"});
        };
        
        // Reset validation UI
        document.getElementById('guess-validation').style.display = 'block';
        document.getElementById('play-again-container').style.display = 'none';
        document.getElementById('learning-container').style.display = 'none';
        
        const resTitle = document.querySelector('.result-title');
        resTitle.innerText = "IS THIS YOUR PLAYER?";
        resTitle.style.color = "";
        resTitle.style.textShadow = "";
        
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
    
    // Show learning container so user can teach the AI
    const learnContainer = document.getElementById('learning-container');
    if (learnContainer) {
        learnContainer.style.display = 'block';
        gsap.fromTo(learnContainer, {opacity: 0, y: 10}, {opacity: 1, y: 0, duration: 0.4});
    } else {
        document.getElementById('play-again-container').style.display = 'block';
    }
    
    showAIThinking("You win this round... Teach me your player!", "Defeated");
});

// Wire up Learning Submission to Teach the AI
const learnSubmitBtn = document.getElementById('learning-submit-btn');
if (learnSubmitBtn) {
    learnSubmitBtn.addEventListener('click', async () => {
        const inputEl = document.getElementById('learning-input');
        const correctPlayer = inputEl ? inputEl.value.trim() : "";
        if (!correctPlayer) {
            alert("Please enter the player's name!");
            return;
        }
        
        learnSubmitBtn.disabled = true;
        const btnText = learnSubmitBtn.querySelector('span');
        if (btnText) btnText.innerText = "TEACHING AI Brain...";
        
        try {
            if (useLocalEngine) {
                learnLocalEngine(correctPlayer);
                return;
            }
            
            const res = await fetch("http://127.0.0.1:5001/learn", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    correct_player: correctPlayer
                })
            });
            const data = await res.json();
            if (data.success) {
                showAIThinking("Got it! I will remember this player next time.", "Satisfied");
                document.getElementById('learning-container').style.display = 'none';
                document.getElementById('play-again-container').style.display = 'block';
                if (inputEl) inputEl.value = "";
            } else {
                alert("Failed to teach AI. Please try again.");
            }
        } catch(e) {
            console.error(e);
            alert("Error communicating with AI learning system.");
        } finally {
            learnSubmitBtn.disabled = false;
            if (btnText) btnText.innerText = "SUBMIT AND TEACH AI";
        }
    });
}

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

