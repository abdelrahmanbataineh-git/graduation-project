"""
CHEAT SHEET FOR PRESENTATION - `api.py` (Backend API Router)
===========================================================
WHAT THIS FILE DOES:
This is the main entry point for the backend server built with FastAPI. It handles all incoming HTTP requests from the frontend (React) and routes them to the correct functions.

KEY SECTIONS:
1. Authentication (`/register`, `/login`, `/verify-email`, `/forgot-password`): Handles user signups, logins, and securely hashing passwords using `utils.py`.
2. User Profile (`/users/...`): Fetches and updates user settings (weight, goals, preferences) and saves weight changes to a history log.
3. AI Food Scanner (`/ai/analyze-food`): Receives images from the frontend, passes them to our YOLOv8 & Gemini AI model in `segmentation.py`, and returns estimated calories/macros.
4. AI Chatbot (`/ai/chat`): Sends user messages to the RAG AI system (`rag.py`) so the AI can provide personalized nutrition advice based on the user's history.
5. Meals & Water Logs (`/meals/...`, `/water/...`): Saves daily food and water intake to the Supabase database.
6. Notifications (`/notifications/...`): Generates dynamic alerts (like "Time to log breakfast!" or "Drink more water!") based on the user's daily progress and current time.
===========================================================
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime, timedelta
from database_core import schemas
from business_logic import utils, nutrition_logic
from database_core.database import supabase
import os

# 1. Initialize the app
app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print("BACKEND SERVER READY!")
    print("  ->  API URL:   http://127.0.0.1:8000")
    print("  ->  API Docs:  http://127.0.0.1:8000/docs")
    print("="*50 + "\n")

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API ROUTES (all under /api prefix) ---
api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health_check():
    return {"message": "Server is running and connected to Supabase!"}


@api_router.post("/register")
def register_user(user: schemas.UserCreate):
    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = utils.hash_password(user.password)
    
    logical_water_goal = int(user.weight * 35) if user.weight else 2500
    
    # Insert user
    result = supabase.table("users").insert({
        "email": user.email,
        "hashed_password": hashed_pwd,
        "full_name": user.full_name,
        "age": user.age,
        "height": user.height,
        "weight": user.weight,
        "goal": user.goal,
        "water_goal_ml": logical_water_goal,
        "is_verified": True
    }).execute()

    return {"id": result.data[0]["id"], "message": "Registration successful."}


@api_router.post("/login")
def login(user: schemas.UserLogin):
    result = supabase.table("users").select("*").eq("email", user.email).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    db_user = result.data[0]
    if not utils.verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {"message": "Login successful", "user_id": db_user["id"]}

@api_router.post("/verify-email")
def verify_email(req: schemas.VerifyEmailRequest):
    result = supabase.table("users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="User not found.")
        
    user = result.data[0]
    if user.get("is_verified"):
        return {"message": "Email is already verified.", "user_id": user["id"]}
        
    if user.get("verification_code") != req.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    supabase.table("users").update({
        "is_verified": True,
        "verification_code": None
    }).eq("email", req.email).execute()
    
    return {"message": "Email verified successfully.", "user_id": user["id"]}


@api_router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest):
    result = supabase.table("users").select("id").eq("email", req.email).execute()
    if not result.data:
        return {"message": "If an account exists, a reset code has been sent."}

    code = utils.generate_reset_code()
    supabase.table("users").update({
        "reset_code": code,
        "reset_code_expires": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
    }).eq("email", req.email).execute()

    if utils.send_reset_email(req.email, code):
        return {"message": "Reset code sent to email."}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email.")


@api_router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest):
    result = supabase.table("users").select("*").eq("email", req.email).execute()
    if not result.data or result.data[0].get("reset_code") != req.code:
        raise HTTPException(status_code=400, detail="Invalid code or email.")

    user = result.data[0]
    expires = user.get("reset_code_expires")
    if expires:
        try:
            if isinstance(expires, str):
                exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            else:
                exp_dt = expires
            # Strip timezone for comparison with utcnow
            if exp_dt.tzinfo is not None:
                exp_dt = exp_dt.replace(tzinfo=None)
            if datetime.utcnow() > exp_dt:
                raise HTTPException(status_code=400, detail="Reset code has expired.")
        except (ValueError, TypeError):
            pass  # If we can't parse, skip expiry check

    supabase.table("users").update({
        "hashed_password": utils.hash_password(req.new_password),
        "reset_code": None,
        "reset_code_expires": None,
    }).eq("email", req.email).execute()

    return {"message": "Password updated successfully."}


@api_router.get("/users/{user_id}")
def get_user_profile(user_id: int):
    result = supabase.table("users").select("email, full_name, age, height, weight, goal, water_goal_ml, activity_level, dietary_preference, measurement_units, water_reminders, meal_reminders, weekly_reports").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@api_router.put("/users/{user_id}")
def update_user_profile(user_id: int, req: schemas.UserUpdate):
    try:
        # Check if user exists and get current weight
        user_check = supabase.table("users").select("id, weight").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = {
            "age": req.age,
            "height": req.height,
            "weight": req.weight,
            "goal": req.goal
        }
        if req.full_name is not None:
            update_data["full_name"] = req.full_name
        # Check if weight changed
        old_weight = user_check.data[0].get("weight")
        
        if req.water_goal_ml is not None:
            update_data["water_goal_ml"] = req.water_goal_ml
        elif old_weight != req.weight and req.weight:
            update_data["water_goal_ml"] = int(req.weight * 35)

        if req.activity_level is not None:
            update_data["activity_level"] = req.activity_level
        if req.dietary_preference is not None:
            update_data["dietary_preference"] = req.dietary_preference
        if req.measurement_units is not None:
            update_data["measurement_units"] = req.measurement_units
        if req.water_reminders is not None:
            update_data["water_reminders"] = req.water_reminders
        if req.meal_reminders is not None:
            update_data["meal_reminders"] = req.meal_reminders
        if req.weekly_reports is not None:
            update_data["weekly_reports"] = req.weekly_reports

        result = supabase.table("users").update(update_data).eq("id", user_id).execute()

        # If weight is different (or it's the first time), log it
        if old_weight != req.weight:
            try:
                supabase.table("weight_logs").insert({"user_id": user_id, "weight": req.weight}).execute()
            except Exception as e:
                print(f"[WARN] Failed to log weight history: {e}")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection error: {str(e)}")

@api_router.get("/users/{user_id}/export")
def export_user_data(user_id: int):
    # Check if user exists
    user_check = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")
    user_profile = user_check.data[0]
    
    six_months_ago = (datetime.utcnow() - timedelta(days=180)).isoformat() + "Z"

    # Fetch last 180 days of meals
    meals = supabase.table("meals").select("*").eq("user_id", user_id).gte("created_at", six_months_ago).execute().data
    
    # Fetch last 180 days of water
    water = supabase.table("water_logs").select("*").eq("user_id", user_id).gte("created_at", six_months_ago).execute().data
    
    # Fetch last 180 days of weight logs
    weights = supabase.table("weight_logs").select("*").eq("user_id", user_id).gte("created_at", six_months_ago).order("created_at").execute().data

    return {
        "user_profile": user_profile,
        "meals": meals,
        "water_logs": water,
        "weight_logs": weights
    }

@api_router.put("/users/{user_id}/email")
def update_user_email(user_id: int, req: schemas.ChangeEmailRequest):
    # Check if email is taken
    existing = supabase.table("users").select("id").eq("email", req.new_email).execute()
    if existing.data and existing.data[0]["id"] != user_id:
        raise HTTPException(status_code=400, detail="Email is already in use by another account.")
        
    result = supabase.table("users").update({"email": req.new_email}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Email updated successfully"}

@api_router.put("/users/{user_id}/password")
def update_user_password(user_id: int, req: schemas.ChangePasswordRequest):
    result = supabase.table("users").select("hashed_password").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user = result.data[0]
    if not utils.verify_password(req.current_password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
        
    hashed_pwd = utils.hash_password(req.new_password)
    supabase.table("users").update({"hashed_password": hashed_pwd}).eq("id", user_id).execute()
    return {"message": "Password updated successfully"}

@api_router.get("/users/{user_id}/targets")
def get_user_targets(user_id: int, gender: str = "male"):
    result = supabase.table("users").select("age, weight, height, goal, activity_level").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    return nutrition_logic.calculate_nutrition(
        age=user["age"], 
        weight=user["weight"], 
        height=user["height"], 
        goal=user["goal"], 
        gender=gender, 
        target_weight=None, 
        activity_level=user.get("activity_level", "sedentary")
    )


@api_router.post("/ai/analyze-food/{user_id}")
async def upload_food(user_id: int, file: UploadFile = File(...)):
    from food_scanner_ai.segmentation import analyze_meal_image

    # Check if user exists and retrieve their goal
    user_check = supabase.table("users").select("id, goal").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    user_goal = user_check.data[0].get("goal", "general health")
    contents = await file.read()
    
    # Run custom YOLOv8 food segmentation model
    result = analyze_meal_image(contents, user_goal=user_goal)
    if not result["success"]:
        raise HTTPException(status_code=422, detail=result.get("error", "YOLOv8 analysis failed"))

    # Map detected food names
    food_names = ", ".join([f["food_name"] for f in result["detected_foods"]])
    if not food_names:
        food_names = "Unidentified Meal"

    # Save analysis to food_scans table (non-fatal — don't crash scan if DB write fails)
    try:
        supabase.table("food_scans").insert({
            "user_id": user_id,
            "detected_food": food_names,
            "calories_estimate": int(round(float(result["total_calories"]))),
            "protein_estimate": int(round(float(result["total_protein_g"]))),
            "carbs_estimate": int(round(float(result["total_carbs_g"]))),
            "fats_estimate": int(round(float(result["total_fat_g"]))),
            "fiber": int(round(float(result.get("total_fiber_g", 0)))),
            "sugar": int(round(float(result.get("total_sugar_g", 0)))),
            "sodium_mg": float(result.get("total_sodium_mg", 0)),
            "potassium_mg": float(result.get("total_potassium_mg", 0)),
            "calcium_mg": float(result.get("total_calcium_mg", 0)),
            "vitamin_c_mg": float(result.get("total_vitamin_c_mg", 0)),
            "vitamin_d_mcg": float(result.get("total_vitamin_d_mcg", 0)),
            "iron_mg": float(result.get("total_iron_mg", 0)),
        }).execute()
    except Exception as db_err:
        print(f"[WARN] food_scans DB insert failed (non-fatal): {db_err}")

    # Return rich prediction metrics to the frontend
    return {
        "food_name": food_names,
        "calories": result["total_calories"],
        "protein": result["total_protein_g"],
        "carbs": result["total_carbs_g"],
        "fat": result["total_fat_g"],
        "fiber": result.get("total_fiber_g", 0),
        "sugar": result.get("total_sugar_g", 0),
        "sodium_mg": result.get("total_sodium_mg", 0),
        "potassium_mg": result.get("total_potassium_mg", 0),
        "calcium_mg": result.get("total_calcium_mg", 0),
        "vitamin_c_mg": result.get("total_vitamin_c_mg", 0),
        "vitamin_d_mcg": result.get("total_vitamin_d_mcg", 0),
        "iron_mg": result.get("total_iron_mg", 0),
        "annotated_image": result["annotated_image_b64"],
        "ai_analysis": result["ai_analysis"]
    }


USER_MEMORIES = {}

def get_or_create_user_profile(user_id: int) -> str:
    user_check = supabase.table("users").select("email").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")
    email = user_check.data[0]["email"]
    
    prof_res = supabase.table("profiles").select("id").eq("email", email).execute()
    if prof_res.data:
        return prof_res.data[0]["id"]
        
    try:
        auth_user = supabase.auth.admin.create_user({
            "email": email,
            "password": utils.generate_reset_code() + "A1!",
            "email_confirm": True
        })
        profile_uuid = auth_user.user.id
        supabase.table("profiles").insert({
            "id": profile_uuid,
            "email": email,
            "full_name": f"User {user_id}"
        }).execute()
        return profile_uuid
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create profile mapping: {e}")

def populate_memory_from_db(user_id: int, profile_uuid: str):
    try:
        import chatbot_ai.rag as rag
    except ImportError:
        return
    try:
        res = supabase.table("chat_messages").select("sender, message").eq("user_id", profile_uuid).order("created_at", desc=True).limit(10).execute()
        msgs = list(reversed(res.data))
        rag_mem = []
        for msg in msgs:
            role = "user" if msg["sender"] == "user" else "assistant"
            rag_mem.append({"role": role, "content": msg["message"]})
        rag.conversation_memory[str(user_id)] = rag_mem
    except Exception as e:
        print(f"[WARN] Failed to populate memory: {e}")

@api_router.post("/ai/chat")
async def chat_with_ai(query: str, user_id: int):
    try:
        import chatbot_ai.rag as rag
    except Exception as import_err:
        print(f"[ERROR] Failed to import Ragchatbot: {import_err}")
        raise HTTPException(status_code=500, detail=f"Chatbot initialization failed: {str(import_err)}")

    profile_uuid = get_or_create_user_profile(user_id)

    if str(user_id) not in rag.conversation_memory:
        populate_memory_from_db(user_id, profile_uuid)

    user_data_res = supabase.table("users").select("*").eq("id", user_id).execute()
    user_data = user_data_res.data[0] if user_data_res.data else {}
    
    # Calculate targets
    targets = nutrition_logic.calculate_nutrition(
        age=user_data.get("age", 25),
        weight=user_data.get("weight", 70.0),
        height=user_data.get("height", 170.0),
        goal=user_data.get("goal", "maintain"),
        gender="male", # default since gender is not in schema
        activity_level=user_data.get("activity_level", "sedentary")
    )
    user_data["targets"] = targets

    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    meals_res = supabase.table("meals").select("food_name, calories, protein, carbs, fat, created_at").eq("user_id", user_id).gte("created_at", seven_days_ago).execute()
    user_data["meals_history"] = meals_res.data or []
    
    today_str = datetime.utcnow().date().isoformat()
    daily_water_res = supabase.table("water_logs").select("amount_ml").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00Z").execute()
    user_data["water_today"] = daily_water_res.data or []

    try:
        supabase.table("chat_messages").insert({
            "user_id": profile_uuid,
            "sender": "user",
            "message": query
        }).execute()
    except Exception as e:
        print(f"[WARN] Failed to save user message: {e}")

    try:
        result = rag.ask_nutribot(
            user_id=str(user_id),
            message=query,
            user_data=user_data
        )
        advice = result["reply"]
    except Exception as chat_err:
        print(f"[ERROR] Chatbot error: {chat_err}")
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(chat_err)}")

    try:
        supabase.table("chat_messages").insert({
            "user_id": profile_uuid,
            "sender": "ai",
            "message": advice
        }).execute()
    except Exception as e:
        print(f"[WARN] Failed to save ai message: {e}")

    return {"response": advice}


@api_router.get("/ai/chat/history/{user_id}", response_model=list[schemas.ChatMessageResponse])
def get_chat_history(user_id: int):
    profile_uuid = get_or_create_user_profile(user_id)
    res = supabase.table("chat_messages").select("*").eq("user_id", profile_uuid).order("created_at").execute()
    return res.data


@api_router.post("/meals/{user_id}")
def log_meal(user_id: int, meal: schemas.MealCreate):
    # Ensure the user exists
    user_check = supabase.table("users").select("id").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    result = supabase.table("meals").insert({
        **meal.model_dump(),
        "user_id": user_id,
    }).execute()

    return result.data[0]


@api_router.get("/meals/history/{user_id}")
def get_meal_history(user_id: int):
    result = supabase.table("meals").select("*").eq("user_id", user_id).execute()
    return result.data


@api_router.delete("/meals/{meal_id}")
def delete_meal(meal_id: int):
    result = supabase.table("meals").delete().eq("id", meal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meal not found or already deleted")
    return {"message": "Meal deleted successfully", "deleted_meal": result.data[0]}

@api_router.post("/water/{user_id}")
def log_water(user_id: int, water: schemas.WaterLogCreate):
    user_check = supabase.table("users").select("id").eq("id", user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    result = supabase.table("water_logs").insert({
        "user_id": user_id,
        "amount_ml": water.amount_ml
    }).execute()
    return result.data[0]

@api_router.get("/water/{user_id}/today")
def get_water_today(user_id: int):
    # Get start of today in UTC to roughly query
    today_str = datetime.utcnow().date().isoformat()
    # Simple query for all logs from this user today
    result = supabase.table("water_logs").select("*").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00Z").execute()
    
    total_ml = sum([log["amount_ml"] for log in result.data]) if result.data else 0
    return {"total_ml": total_ml, "logs": result.data}

@api_router.get("/notifications/{user_id}/check")
def check_and_generate_notifications(user_id: int, local_hour: int = 12, day_of_week: int = 0):
    user_res = supabase.table("users").select("water_goal_ml, water_reminders, meal_reminders, weekly_reports").eq("id", user_id).execute()
    if not user_res.data:
        return {"status": "User not found"}
    user = user_res.data[0]
    
    today_str = datetime.utcnow().date().isoformat()
    
    def alert_exists(msg_type, msg_text=None):
        query = supabase.table("notifications").select("id").eq("user_id", user_id).eq("type", msg_type).gte("created_at", f"{today_str}T00:00:00Z")
        if msg_text:
            query = query.eq("message", msg_text)
        return len(query.execute().data) > 0

    def create_alert(msg_type, msg_text):
        if not alert_exists(msg_type, msg_text):
            supabase.table("notifications").insert({"user_id": user_id, "type": msg_type, "message": msg_text}).execute()

    if user.get("meal_reminders"):
        meals_today = supabase.table("meals").select("food_name").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00Z").execute().data
        meal_names = [m["food_name"].lower() for m in meals_today]
        if local_hour >= 9 and not any("breakfast" in m for m in meal_names):
            create_alert("meal", "Time to log your Breakfast!")
        if local_hour >= 13 and not any("lunch" in m for m in meal_names):
            create_alert("meal", "Time to log your Lunch!")
        if local_hour >= 19 and not any("dinner" in m for m in meal_names):
            create_alert("meal", "Time to log your Dinner!")

    if user.get("water_reminders"):
        if local_hour in [10, 12, 14, 16, 18, 20]:
            water_today = supabase.table("water_logs").select("amount_ml").eq("user_id", user_id).gte("created_at", f"{today_str}T00:00:00Z").execute().data
            total_water = sum(w["amount_ml"] for w in water_today)
            if total_water < user.get("water_goal_ml", 2500):
                create_alert("water", f"You're falling behind your water goal! ({total_water}ml logged)")

    if user.get("weekly_reports") and day_of_week == 0:
        create_alert("report", "Your Weekly Stats Summary is ready!")

    return {"status": "checked"}

@api_router.get("/notifications/{user_id}", response_model=list[schemas.NotificationResponse])
def get_notifications(user_id: int):
    res = supabase.table("notifications").select("*").eq("user_id", user_id).eq("is_read", False).order("created_at", desc=True).execute()
    return res.data

@api_router.put("/notifications/{notif_id}/read")
def read_notification(notif_id: int):
    supabase.table("notifications").update({"is_read": True}).eq("id", notif_id).execute()
    return {"status": "success"}

# Include the API router
app.include_router(api_router)


# --- SERVE FRONTEND ---
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.isdir(FRONTEND_DIR):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    # Serve files from the public/images directory
    IMAGES_DIR = os.path.join(FRONTEND_DIR, "logos_and_assets")
    if os.path.isdir(IMAGES_DIR):
        app.mount("/logos_and_assets", StaticFiles(directory=IMAGES_DIR), name="logos_and_assets")

    # Catch-all: serve index.html for any non-API route (SPA client-side routing)
    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")

        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))