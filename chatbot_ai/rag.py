# ============================================================
#  NutriBot — Ultimate RAG + Sentiment Chatbot
#  File: rag.py
# ============================================================

"""
CHEAT SHEET FOR PRESENTATION - `rag.py` (AI Chatbot)
===========================================================
WHAT THIS FILE DOES:
This file powers the interactive AI Chatbot. It uses RAG (Retrieval-Augmented Generation), which means it gives the AI real user data (context) before asking it to answer a question.

HOW IT WORKS:
1. `ask_nutribot()`: This is the main function. When the user types "Can I eat pizza?", this function grabs the user's weight, goal, and recent meal history.
2. It bundles the user's question AND their personal data into a prompt.
3. It sends that prompt to Google's Gemini AI model.
4. Gemini reads the context ("Ah, this user wants to lose weight and already ate 2000 calories today") and gives a highly personalized answer instead of generic advice.
===========================================================
"""
import os
import json
from pathlib import Path
from collections import Counter

from google import genai
from google.genai import types
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "put_your_key_here")
GEMINI_MODEL   = "gemini-2.5-flash"

PROJECT_ROOT = Path(__file__).parent
FAISS_DIR    = PROJECT_ROOT

# ─────────────────────────────────────────────────────────────
#  GEMINI CLIENT
# ─────────────────────────────────────────────────────────────

client = genai.Client(api_key=GEMINI_API_KEY)

# ─────────────────────────────────────────────────────────────
#  EMBEDDINGS & FAISS INDEX
# ─────────────────────────────────────────────────────────────

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

def load_faiss_index() -> FAISS:
    return FAISS.load_local(
        str(FAISS_DIR),
        embeddings,
        allow_dangerous_deserialization=True
    )

def build_faiss_index(pdf_dir: Path = PROJECT_ROOT) -> FAISS:
    pdf_files = list(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        raise FileNotFoundError(f"No PDF files found in: {pdf_dir}")

    all_docs = []
    for pdf in pdf_files:
        loader = PyPDFLoader(str(pdf))
        docs   = loader.load()
        for doc in docs:
            doc.metadata["source_file"] = pdf.name
        all_docs.extend(docs)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " "]
    )
    chunks = splitter.split_documents(all_docs)
    chunks = [c for c in chunks if c.page_content.strip()]

    if not chunks:
        raise ValueError("No text extracted from PDF files")

    vector_store = FAISS.from_documents(chunks, embeddings)
    FAISS_DIR.mkdir(parents=True, exist_ok=True)
    vector_store.save_local(str(FAISS_DIR))

    return vector_store

def _init_vector_store() -> FAISS:
    if (FAISS_DIR / "index.faiss").exists():
        return load_faiss_index()
    else:
        try:
            return build_faiss_index()
        except FileNotFoundError:
            return None # Return None if no PDFs

vector_store = _init_vector_store()

# ─────────────────────────────────────────────────────────────
#  MEMORY & SENTIMENT STATE
# ─────────────────────────────────────────────────────────────

conversation_memory: dict = {}
sentiment_history: dict = {}

SENTIMENT_PROMPTS = {
    "frustrated": "User is frustrated. Start with empathy. Be gentle and encouraging. Offer ONE simple solution. Avoid criticism.",
    "happy":      "User is happy. Share their excitement! Be energetic. Celebrate with them and give extra motivational tips.",
    "guilty":     "User feels guilty. Reassure them one day doesn't ruin everything. No blame. Remind them consistency > perfection.",
    "motivated":  "User is motivated. Be direct and informative. Give precise numbers. Support their plan.",
    "tired":      "User is tired. Be calm and soothing. Suggest easy simple options. Don't overwhelm with info.",
    "neutral":    "User is neutral. Be helpful and informative. Use the knowledge base. Give specific numbers."
}

# ─────────────────────────────────────────────────────────────
#  SENTIMENT ANALYSIS
# ─────────────────────────────────────────────────────────────

def analyze_sentiment(message: str) -> dict:
    prompt = f"""Analyze the mood of this message and return JSON only, no extra text:

Message: "{message}"

Return exactly this format:
{{
  "sentiment": "frustrated|happy|guilty|motivated|tired|neutral",
  "score": 0.0,
  "reason": "short reason",
  "emoji": "🙂"
}}

- frustrated: complaining, "can't do it", "tired of dieting"
- happy: joy, "lost weight", "feeling great"
- guilty: "ate too much", "broke my diet", "failed"
- motivated: "I will", "determined", "starting today"
- tired: "exhausted", "no energy", "can't today"
- neutral: regular info question"""

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        text = response.text.strip().replace("```json","").replace("```","").strip()
        return json.loads(text)
    except:
        return {"sentiment": "neutral", "score": 0.5, "reason": "could not analyze", "emoji": "🙂"}

def calculate_trend(user_id: str) -> str:
    history = sentiment_history.get(user_id, [])
    if len(history) < 3:
        return "stable"
    positive = ["happy", "motivated"]
    negative = ["frustrated", "guilty", "tired"]
    def s(h): return 1 if h["sentiment"] in positive else -1 if h["sentiment"] in negative else 0
    recent = sum(s(h) for h in history[-3:])
    older  = sum(s(h) for h in history[:-3]) if len(history) > 3 else 0
    if recent > older:   return "improving"
    elif recent < older: return "declining"
    return "stable"

# ─────────────────────────────────────────────────────────────
#  RETRIEVAL
# ─────────────────────────────────────────────────────────────

def retrieve_context(query: str, top_k: int = 5) -> tuple[str, list]:
    if not vector_store:
        return "", []
    
    results = vector_store.similarity_search_with_score(query, k=top_k)
    context_parts = []
    sources       = []

    for i, (doc, score) in enumerate(results, 1):
        similarity = 1 / (1 + score)
        if similarity < 0.20:
            continue
        src = doc.metadata.get("source_file", "Unknown")
        context_parts.append(f"[Excerpt {i} from {src}]\n{doc.page_content}")
        if src not in sources:
            sources.append(src)

    return "\n\n".join(context_parts), sources

# ─────────────────────────────────────────────────────────────
#  GEMINI CALL
# ─────────────────────────────────────────────────────────────

def build_prompt(message, user_id, user_data, sentiment_data, context, sources):
    history = conversation_memory.get(user_id, [])
    
    weight = user_data.get("weight", 70.0)
    goal = user_data.get("goal", "maintain")
    targets = user_data.get("targets", {})
    daily_need = targets.get("calories", 2000)
    
    # Process meals over the last 7 days
    from datetime import datetime
    meals_history = user_data.get("meals_history", [])
    today_str = datetime.utcnow().date().isoformat()
    
    meals_today = []
    history_summary = {}
    
    for m in meals_history:
        # created_at is an ISO string
        date_part = m.get("created_at", "").split("T")[0]
        if not date_part: continue
        
        food_entry = f"{m.get('food_name', 'Unknown')} ({m.get('calories', 0)} kcal, {m.get('protein', 0)}g P, {m.get('carbs', 0)}g C, {m.get('fat', 0)}g F)"
        if date_part == today_str:
            meals_today.append(m)
        
        if date_part not in history_summary:
            history_summary[date_part] = []
        history_summary[date_part].append(food_entry)
        
    calories_today = sum(float(m.get("calories", 0)) for m in meals_today)
    protein_today = sum(float(m.get("protein", 0)) for m in meals_today)
    carbs_today = sum(float(m.get("carbs", 0)) for m in meals_today)
    fat_today = sum(float(m.get("fat", 0)) for m in meals_today)
    water_today = sum(float(w.get("amount_ml", 0)) for w in user_data.get("water_today", []))
    
    # Override water goal with dynamically calculated target from nutrition logic to be 100% accurate
    water_goal = targets.get("water_ml", 2500)
    
    remaining = daily_need - calories_today

    history_text = "".join(
        f"{'User' if m['role']=='user' else 'Assistant'}: {m['content']}\n"
        for m in history[-6:]
    )
    style = SENTIMENT_PROMPTS.get(sentiment_data["sentiment"], SENTIMENT_PROMPTS["neutral"])
    
    meal_names_today = ', '.join([m.get('food_name', 'Unknown') for m in meals_today]) if meals_today else 'None'
    
    # Format the last 7 days history neatly
    history_str_parts = []
    for date, items in sorted(history_summary.items(), reverse=True):
        if date != today_str:
            history_str_parts.append(f"[{date}]: {', '.join(items)}")
    history_str = "\n".join(history_str_parts) if history_str_parts else "No older meals logged in the last 7 days."

    return f"""You are Smarteal, a smart nutrition assistant with emotional intelligence. Always reply in English.

PDF Knowledge Base Context:
{context if context else "No PDF information loaded."}

Sources available: {', '.join(sources) if sources else 'None'}

User Info:
- Profile: {user_data.get('age', 25)} years old, {weight}kg, {user_data.get('height', 170)}cm
- Goal: {goal}
- Activity Level: {user_data.get('activity_level', 'sedentary')}
- Dietary Preference: {user_data.get('dietary_preference', 'none')}

Macro Targets:
- Calories: {daily_need} kcal/day
- Protein: {targets.get('protein_grams', 0)}g | Carbs: {targets.get('carbs_grams', 0)}g | Fat: {targets.get('fat_grams', 0)}g
- Water: {water_goal} ml/day

Today's Log:
- Calories logged: {calories_today:.0f} (Remaining: {remaining:.0f})
- Protein logged: {protein_today:.0f}g | Carbs logged: {carbs_today:.0f}g | Fat logged: {fat_today:.0f}g
- Water logged: {water_today:.0f} ml (Goal: {water_goal} ml)
- Meals eaten today: {meal_names_today}

Past 7 Days History:
{history_str}

User Mood: {sentiment_data["sentiment"]} {sentiment_data["emoji"]} — {sentiment_data["reason"]}
Response style: {style}

Conversation history:
{history_text}

Rules: Use knowledge base if available | Give specific numbers based on the User Info and Macro Targets above | Base your advice on their 7-day meal history patterns if asked | Max 150 words | Stay on nutrition topic | Be supportive

User: {message}
Assistant:"""

def ask_nutribot(user_id: str, message: str, user_data: dict = None) -> dict:
    if user_data is None:
        user_data = {}
    
    sentiment_data = analyze_sentiment(message)

    if user_id not in sentiment_history:
        sentiment_history[user_id] = []
    sentiment_history[user_id].append({
        "sentiment": sentiment_data["sentiment"],
        "score":     sentiment_data["score"]
    })
    if len(sentiment_history[user_id]) > 10:
        sentiment_history[user_id] = sentiment_history[user_id][-10:]

    context, sources = retrieve_context(message)
    prompt = build_prompt(message, user_id, user_data, sentiment_data, context, sources)
    
    max_retries = 3
    reply = ""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
            reply = response.text.strip()
            break
        except Exception as e:
            err_str = str(e)
            if "429" in err_str and attempt < max_retries - 1:
                import time
                print(f"[Nutribot] Rate limited (429). Retrying in 20 seconds... (Attempt {attempt+1}/{max_retries})")
                time.sleep(20)
            else:
                reply = f"Sorry, there was an error: {err_str}"
                break

    if user_id not in conversation_memory:
        conversation_memory[user_id] = []
    conversation_memory[user_id].append({"role": "user",      "content": message})
    conversation_memory[user_id].append({"role": "assistant", "content": reply})
    if len(conversation_memory[user_id]) > 20:
        conversation_memory[user_id] = conversation_memory[user_id][-20:]

    return {
        "reply":           reply,
        "sentiment":       sentiment_data,
        "sentiment_trend": calculate_trend(user_id),
        "sources":         sources
    }

def get_sentiment_summary(user_id: str) -> dict:
    history = sentiment_history.get(user_id, [])
    if not history:
        return {"dominant_mood": "neutral", "trend": "stable", "total_messages": 0}
    moods    = [h["sentiment"] for h in history]
    dominant = Counter(moods).most_common(1)[0][0]
    return {
        "dominant_mood":  dominant,
        "trend":          calculate_trend(user_id),
        "total_messages": len(history),
        "mood_breakdown": dict(Counter(moods))
    }

def clear_history(user_id: str):
    conversation_memory.pop(user_id, None)
    sentiment_history.pop(user_id, None)
