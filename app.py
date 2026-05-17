import json
import math
import uuid
import os
import urllib.request
import urllib.parse
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# Configure Gemini if API key is provided
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

# Load dataset
with open("data.json", "r") as f:
    PLAYERS = json.load(f)

# Define boolean features to maximize information gain
RAW_FEATURES = {
    "overseas": lambda p: p.get("overseas", False),
    "batter": lambda p: "Batsman" in p.get("role", ""),
    "bowler": lambda p: "Bowler" in p.get("role", ""),
    "keeper": lambda p: p.get("keeper", False),
    "allrounder": lambda p: p.get("allrounder", False),
    "pace": lambda p: p.get("pace", False) and not p.get("allrounder", False),
    "spin": lambda p: p.get("spin", False) and not p.get("allrounder", False),
    "leftBat": lambda p: p.get("leftBat", False),
    "captain": lambda p: p.get("captain", False),
    "finisher": lambda p: p.get("finisher", False),
    "aggressive": lambda p: p.get("aggressive", False),
    "legend": lambda p: p.get("legend", False),
    "has_title": lambda p: p.get("titles", 0) > 0,
    "multi_titles": lambda p: p.get("titles", 0) >= 3,
    "orangeCap": lambda p: p.get("orangeCap", False),
    "purpleCap": lambda p: p.get("purpleCap", False),
    "active": lambda p: p.get("active", False),
    "earlyEra": lambda p: p.get("earlyEra", False),
    "csk": lambda p: "CSK" in p.get("teams", []),
    "mi": lambda p: "MI" in p.get("teams", []),
    "rcb": lambda p: "RCB" in p.get("teams", []),
    "kkr": lambda p: "KKR" in p.get("teams", []),
    "rr": lambda p: "RR" in p.get("teams", []),
    "srh": lambda p: "SRH" in p.get("teams", []) or "DC" in p.get("teams", []),
    "pbks": lambda p: "PBKS" in p.get("teams", []),
    "dc": lambda p: "DD" in p.get("teams", []) or "DC" in p.get("teams", []) and "SRH" not in p.get("teams", []),
    "gt": lambda p: "GT" in p.get("teams", []) or "GL" in p.get("teams", []),
    "lsg": lambda p: "LSG" in p.get("teams", []) or "RPS" in p.get("teams", []),
    "singleTeam": lambda p: len(p.get("teams", [])) == 1,
}

FEATURES = {}
for k, func in RAW_FEATURES.items():
    def make_feat(f, f_name):
        return lambda p: p["learned_traits"][f_name] if "learned_traits" in p and f_name in p["learned_traits"] else f(p)
    FEATURES[k] = make_feat(func, k)

FEATURE_PROMPTS = {
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
}

sessions = {}

def best_feature(scored_pool, asked_features):
    best_f = None
    min_diff = float('inf')
    
    # Sort candidates by score to find the most likely ones
    sorted_pool = sorted(scored_pool, key=lambda x: x['score'], reverse=True)
    # Consider only top 20 candidates for splitting to ensure questions are relevant to the leaders
    top_candidates = [x['player'] for x in sorted_pool[:20]]
    
    total = len(top_candidates)
    if total <= 1:
        return None
        
    for f_name, f_func in FEATURES.items():
        if f_name in asked_features:
            continue
            
        yes_count = sum(1 for p in top_candidates if f_func(p))
        no_count = total - yes_count
        
        diff = abs(yes_count - no_count)
        # We want to find a feature that splits the top candidates as evenly as possible
        if diff < min_diff and yes_count > 0 and no_count > 0:
            min_diff = diff
            best_f = f_name
            
    return best_f

def generate_dynamic_question(question_text):
    if not api_key:
        return question_text
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Rewrite this Yes/No question to make it sound like a mysterious AI cricket genie asking it in an engaging, conversational way. Keep it short. Question: {question_text}"
        response = model.generate_content(prompt)
        if response.text:
            return response.text.strip().replace('"', '').replace('\n', ' ')
    except Exception as e:
        print("Gemini API error:", e)
    return question_text

@app.route("/start", methods=["POST"])
def start():
    data = request.get_json(silent=True) or {}
    
    # Initialize all players with 0 score
    pool = [{"player": p, "score": 0} for p in PLAYERS]
    
    # 1. Nationality
    is_indian = data.get("is_indian")
    if is_indian is not None:
        for item in pool:
            # is_indian means overseas is False
            if item["player"].get("overseas", False) != is_indian:
                item["score"] += 10
            else:
                item["score"] -= 10
                
    # 2. Role
    role = data.get("role")
    if role:
        for item in pool:
            p_role = item["player"].get("role", "").lower()
            p_allrounder = item["player"].get("allrounder", False)
            p_keeper = item["player"].get("keeper", False)
            
            if role == "batter" and "batsman" in p_role:
                item["score"] += 10
            elif role == "bowler" and "bowler" in p_role:
                item["score"] += 10
            elif role == "allrounder" and p_allrounder:
                item["score"] += 10
            elif role == "keeper" and p_keeper:
                item["score"] += 10
            else:
                item["score"] -= 5
                
    # 3. Team
    team_filter = data.get("team")
    if team_filter:
        for item in pool:
            if team_filter == "Not Playing":
                if not item["player"].get("active", False):
                    item["score"] += 10
                else:
                    item["score"] -= 10
            elif team_filter != "ALL":
                if item["player"].get("active", False) and team_filter in item["player"].get("teams", []):
                    item["score"] += 10
                else:
                    item["score"] -= 10

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "pool": pool,
        "asked": ["overseas", "batter", "bowler", "keeper", "allrounder", "csk", "mi", "rcb", "kkr", "rr", "srh", "pbks", "dc", "gt", "lsg", "active"],
        "question_count": 3
    }
    
    first_feature = best_feature(sessions[session_id]["pool"], sessions[session_id]["asked"])
    sessions[session_id]["asked"].append(first_feature)
    sessions[session_id]["current_feature"] = first_feature
    
    q_text = FEATURE_PROMPTS[first_feature]
    q_text = generate_dynamic_question(q_text)
    
    sorted_pool = sorted(sessions[session_id]["pool"], key=lambda x: x['score'], reverse=True)
    top_10 = sorted_pool[:10]
    max_s = top_10[0]['score']
    exps = [math.exp(max(-20, (p['score'] - max_s) / 2.0)) for p in top_10]
    sum_exps = sum(exps)
    top_candidates = []
    for i in range(min(4, len(top_10))):
        prob = int((exps[i] / sum_exps) * 100)
        if prob == 0 and exps[i] > 0.0001: prob = 1
        top_candidates.append({"name": top_10[i]['player']['name'], "prob": prob})
    if top_candidates and sum(c['prob'] for c in top_candidates) < 100:
        top_candidates[0]['prob'] += (100 - sum(c['prob'] for c in top_candidates))
    
    return jsonify({
        "session_id": session_id,
        "question": q_text,
        "question_count": 2,
        "total_players": len(PLAYERS),
        "top_candidates": top_candidates
    })

@app.route("/answer", methods=["POST"])
def answer():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    ans = data.get("answer", "").lower()
    
    if session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400
        
    session = sessions[session_id]
    pool = session["pool"]
    curr_f = session["current_feature"]
    
    if "history" not in session:
        session["history"] = []
    session["history"].append({"feature": curr_f, "answer": ans})
    
    # Update scores instead of eliminating
    for item in pool:
        p = item["player"]
        has_feature = FEATURES[curr_f](p)
        
        if ans == "yes":
            item["score"] += 3 if has_feature else -3
        elif ans == "no":
            item["score"] += 3 if not has_feature else -3
        elif ans == "probably":
            item["score"] += 1 if has_feature else -1
        elif ans == "probably_not":
            item["score"] += 1 if not has_feature else -1
    
    session["pool"] = pool
    session["question_count"] += 1
    
    # Sort to evaluate confidence
    sorted_pool = sorted(pool, key=lambda x: x['score'], reverse=True)
    top_score = sorted_pool[0]['score']
    runner_up_score = sorted_pool[1]['score'] if len(sorted_pool) > 1 else -999
    
    score_diff = top_score - runner_up_score
    
    # Confidence Engine
    confidence = 0
    if score_diff >= 6:
        confidence = 90 + score_diff
    elif score_diff >= 4:
        confidence = 80
    elif score_diff >= 2:
        confidence = 60
    else:
        confidence = 40
        
    confidence = min(99, confidence)
        
    # Make final guess if confidence >= 85 and min questions reached, or max 15 questions reached
    if (confidence >= 85 and session["question_count"] >= 9) or session["question_count"] >= 15:
        guessed_player = sorted_pool[0]['player']
        return jsonify({
            "status": "guessed",
            "player": guessed_player,
            "confidence": confidence if confidence >= 85 else 78
        })
            
    next_f = best_feature(pool, session["asked"])
    
    # If we haven't reached question 9 but best_feature returns None, keep asking other questions
    if not next_f and session["question_count"] < 9:
        import random
        available = [f for f in FEATURES.keys() if f not in session["asked"]]
        if available:
            next_f = random.choice(available)
            
    if not next_f:
        return jsonify({
            "status": "guessed",
            "player": sorted_pool[0]['player'],
            "confidence": 90
        })
        
    session["asked"].append(next_f)
    session["current_feature"] = next_f
    
    q_text = FEATURE_PROMPTS[next_f]
    q_text = generate_dynamic_question(q_text)
    top_10 = sorted_pool[:10]
    max_s = top_10[0]['score']
    exps = [math.exp(max(-20, (p['score'] - max_s) / 2.0)) for p in top_10]
    sum_exps = sum(exps)
    top_candidates = []
    for i in range(min(4, len(top_10))):
        prob = int((exps[i] / sum_exps) * 100)
        if prob == 0 and exps[i] > 0.0001: prob = 1
        top_candidates.append({"name": top_10[i]['player']['name'], "prob": prob})
    if top_candidates and sum(c['prob'] for c in top_candidates) < 100:
        top_candidates[0]['prob'] += (100 - sum(c['prob'] for c in top_candidates))
        
    return jsonify({
        "status": "asking",
        "question": q_text,
        "question_count": session["question_count"] + 1,
        "remaining_candidates": len(pool),
        "top_candidates": top_candidates
    })

@app.route("/learn", methods=["POST"])
def learn():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    correct_name = data.get("correct_player", "").strip()
    
    if not session_id or session_id not in sessions or not correct_name:
        return jsonify({"success": False}), 400
        
    session = sessions[session_id]
    history = session.get("history", [])
    
    # 1. Try to find the player
    player_idx = next((i for i, p in enumerate(PLAYERS) if p["name"].lower() == correct_name.lower()), -1)
    
    if player_idx == -1:
        # Create a new barebones player
        new_player = {
            "name": correct_name.title(),
            "teams": [],
            "role": "Unknown",
            "country": "Unknown",
            "learned_traits": {}
        }
        PLAYERS.append(new_player)
        player_idx = len(PLAYERS) - 1
        
    # 2. Update their traits based on the history
    player = PLAYERS[player_idx]
    if "learned_traits" not in player:
        player["learned_traits"] = {}
        
    for item in history:
        feat = item["feature"]
        ans = item["answer"]
        if ans == "yes":
            player["learned_traits"][feat] = True
        elif ans == "no":
            player["learned_traits"][feat] = False
            
    # 3. Save back to data.json
    try:
        with open("data.json", "w") as f:
            json.dump(PLAYERS, f, indent=4)
    except Exception as e:
        print("Failed to save learning:", e)
        
    return jsonify({"success": True})

@app.route("/get_image", methods=["GET"])
def get_image():
    name = request.args.get("name")
    if not name:
        return jsonify({"url": ""})
        
    query = urllib.parse.quote(name + " cricketer profile")
    url = f"https://www.bing.com/images/search?q={query}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        import ssl
        context = ssl._create_unverified_context()
        html = urllib.request.urlopen(req, context=context).read().decode('utf-8')
        match = re.search(r'murl&quot;:&quot;(.*?)&quot;', html)
        if match:
            img_url = match.group(1)
            return jsonify({"url": img_url})
    except Exception as e:
        print("Error fetching image for", name, e)
        
    fallback = f"https://ui-avatars.com/api/?name={urllib.parse.quote(name)}&background=101020&color=00F3FF&size=200"
    return jsonify({"url": fallback})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
