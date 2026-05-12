// AI Engine ported to JavaScript for purely static hosting (GitHub Pages / InfinityFree)
let PLAYERS = [];

// Fetch data on load
fetch('data.json')
    .then(res => res.json())
    .then(data => { PLAYERS = data; })
    .catch(err => console.error("Error loading player data:", err));

const FEATURES = {
    "overseas": p => p.overseas === true,
    "batter": p => p.role && p.role.toLowerCase().includes("batsman"),
    "bowler": p => p.role && p.role.toLowerCase().includes("bowler"),
    "keeper": p => p.keeper === true,
    "allrounder": p => p.allrounder === true,
    "pace": p => p.pace === true,
    "spin": p => p.spin === true,
    "leftBat": p => p.leftBat === true,
    "captain": p => p.captain === true,
    "finisher": p => p.finisher === true,
    "aggressive": p => p.aggressive === true,
    "legend": p => p.legend === true,
    "has_title": p => p.titles > 0,
    "multi_titles": p => p.titles >= 3,
    "orangeCap": p => p.orangeCap === true,
    "purpleCap": p => p.purpleCap === true,
    "active": p => p.active === true,
    "earlyEra": p => p.earlyEra === true,
    "csk": p => p.teams && p.teams.includes("CSK"),
    "mi": p => p.teams && p.teams.includes("MI"),
    "rcb": p => p.teams && p.teams.includes("RCB"),
    "kkr": p => p.teams && p.teams.includes("KKR"),
    "rr": p => p.teams && p.teams.includes("RR"),
    "srh": p => p.teams && (p.teams.includes("SRH") || p.teams.includes("DC_Deccan")),
    "pbks": p => p.teams && (p.teams.includes("PBKS") || p.teams.includes("KXIP")),
    "dc": p => p.teams && (p.teams.includes("DC") || p.teams.includes("DD")),
    "gt": p => p.teams && (p.teams.includes("GT") || p.teams.includes("GL")),
    "lsg": p => p.teams && (p.teams.includes("LSG") || p.teams.includes("RPS")),
    "singleTeam": p => p.teams && p.teams.length === 1
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

let sessionState = null;

function calculateEntropy(pool, featureName) {
    let yesCount = 0;
    for (let p of pool) {
        if (FEATURES[featureName](p.player)) yesCount++;
    }
    let noCount = pool.length - yesCount;
    if (yesCount === 0 || noCount === 0) return 0;
    
    let pYes = yesCount / pool.length;
    let pNo = noCount / pool.length;
    return -(pYes * Math.log2(pYes) + pNo * Math.log2(pNo));
}

function bestFeature(scoredPool, askedFeatures) {
    let bestF = null;
    let minDiff = Infinity;
    
    // Sort pool by score
    scoredPool.sort((a, b) => b.score - a.score);
    // Take top 20 candidates for splitting
    let topCandidates = scoredPool.slice(0, 20).map(x => x.player);
    let total = topCandidates.length;
    
    if (total <= 1) return null;
    
    for (let fName in FEATURES) {
        if (askedFeatures.includes(fName)) continue;
        
        let yesCount = 0;
        for (let p of topCandidates) {
            if (FEATURES[fName](p)) yesCount++;
        }
        let noCount = total - yesCount;
        let diff = Math.abs(yesCount - noCount);
        
        if (diff < minDiff && yesCount > 0 && noCount > 0) {
            minDiff = diff;
            bestF = fName;
        }
    }
    return bestF;
}

function getTopCandidates(scoredPool) {
    let sorted = [...scoredPool].sort((a, b) => b.score - a.score);
    let top10 = sorted.slice(0, 10);
    let maxS = top10[0].score;
    
    let exps = top10.map(p => Math.exp(Math.max(-20, (p.score - maxS) / 2.0)));
    let sumExps = exps.reduce((a, b) => a + b, 0);
    
    let candidates = [];
    for (let i = 0; i < Math.min(4, top10.length); i++) {
        let prob = Math.floor((exps[i] / sumExps) * 100);
        if (prob === 0 && exps[i] > 0.0001) prob = 1;
        candidates.push({ name: top10[i].player.name, prob: prob });
    }
    
    let currentSum = candidates.reduce((a, c) => a + c.prob, 0);
    if (candidates.length > 0 && currentSum < 100) {
        candidates[0].prob += (100 - currentSum);
    }
    return candidates;
}

window.startEngine = function(data) {
    let pool = PLAYERS.map(p => ({ player: p, score: 0 }));
    
    // 1. Nationality
    if (data.is_indian !== null) {
        pool.forEach(item => {
            let pOverseas = item.player.overseas || false;
            if (pOverseas !== data.is_indian) item.score += 10;
            else item.score -= 10;
        });
    }
    
    // 2. Role
    if (data.role) {
        pool.forEach(item => {
            let pRole = (item.player.role || "").toLowerCase();
            let pAll = item.player.allrounder || false;
            let pKeep = item.player.keeper || false;
            
            if (data.role === "batter" && pRole.includes("batsman")) item.score += 10;
            else if (data.role === "bowler" && pRole.includes("bowler")) item.score += 10;
            else if (data.role === "allrounder" && pAll) item.score += 10;
            else if (data.role === "keeper" && pKeep) item.score += 10;
            else item.score -= 5;
        });
    }
    
    // 3. Team
    if (data.team) {
        pool.forEach(item => {
            if (data.team === "Not Playing") {
                if (!(item.player.active || false)) item.score += 10;
                else item.score -= 10;
            } else if (data.team !== "ALL") {
                if (item.player.active && item.player.teams && item.player.teams.includes(data.team)) item.score += 10;
                else item.score -= 10;
            }
        });
    }
    
    sessionState = {
        pool: pool,
        asked: ["overseas", "batter", "bowler", "keeper", "allrounder", "csk", "mi", "rcb", "kkr", "rr", "srh", "pbks", "dc", "gt", "lsg", "active"],
        questionCount: 3
    };
    
    let firstF = bestFeature(sessionState.pool, sessionState.asked);
    sessionState.asked.push(firstF);
    sessionState.currentFeature = firstF;
    
    return {
        session_id: "local_session",
        question: FEATURE_PROMPTS[firstF],
        question_count: 2,
        total_players: PLAYERS.length,
        top_candidates: getTopCandidates(sessionState.pool)
    };
};

window.answerEngine = function(ans) {
    if (!sessionState) return { error: "No session" };
    
    let pool = sessionState.pool;
    let currF = sessionState.currentFeature;
    
    pool.forEach(item => {
        let hasFeature = FEATURES[currF](item.player);
        if (ans === "yes") item.score += hasFeature ? 3 : -3;
        else if (ans === "no") item.score += !hasFeature ? 3 : -3;
        else if (ans === "probably") item.score += hasFeature ? 1 : -1;
        else if (ans === "probably_not") item.score += !hasFeature ? 1 : -1;
    });
    
    sessionState.questionCount++;
    pool.sort((a, b) => b.score - a.score);
    
    let topScore = pool[0].score;
    let runnerUpScore = pool.length > 1 ? pool[1].score : -999;
    let scoreDiff = topScore - runnerUpScore;
    
    let confidence = 40;
    if (scoreDiff >= 6) confidence = 90 + scoreDiff;
    else if (scoreDiff >= 4) confidence = 80;
    else if (scoreDiff >= 2) confidence = 60;
    
    confidence = Math.min(99, confidence);
    
    if ((confidence >= 85 && sessionState.questionCount >= 9) || sessionState.questionCount >= 15) {
        return {
            status: "guessed",
            player: pool[0].player,
            confidence: confidence >= 85 ? confidence : 78
        };
    }
    
    let nextF = bestFeature(pool, sessionState.asked);
    if (!nextF && sessionState.questionCount < 9) {
        let available = Object.keys(FEATURES).filter(f => !sessionState.asked.includes(f));
        if (available.length > 0) {
            nextF = available[Math.floor(Math.random() * available.length)];
        }
    }
    
    if (!nextF) {
        return {
            status: "guessed",
            player: pool[0].player,
            confidence: 90
        };
    }
    
    sessionState.asked.push(nextF);
    sessionState.currentFeature = nextF;
    
    return {
        status: "asking",
        question: FEATURE_PROMPTS[nextF],
        question_count: sessionState.questionCount + 1,
        remaining_candidates: pool.length,
        top_candidates: getTopCandidates(pool)
    };
};
