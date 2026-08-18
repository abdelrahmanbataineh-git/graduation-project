"""
CHEAT SHEET FOR PRESENTATION - `schemas.py` (Data Validation)
===========================================================
WHAT THIS FILE DOES:
This file uses Pydantic to validate data passing between the React Frontend and the FastAPI Backend. 

WHY IT'S IMPORTANT:
If the frontend tries to send text for the user's age instead of a number, Pydantic catches it here and blocks the request before it crashes the database. It acts as the security/validation layer.
===========================================================
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime

# This defines what the user must send when registering
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    age: int
    height: float
    weight: float
    target_weight: float | None = None
    goal: str
    gender: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    age: int
    height: float
    weight: float
    target_weight: float | None = None
    goal: str
    gender: str | None = None
    full_name: str | None = None
    water_goal_ml: int | None = None
    activity_level: str | None = None
    dietary_preference: str | None = None
    measurement_units: str | None = None
    water_reminders: bool | None = None
    meal_reminders: bool | None = None
    weekly_reports: bool | None = None

# This defines what the API sends back (we hide the password)
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    age: int | None = None
    height: float | None = None
    weight: float | None = None
    goal: str | None = None
    water_goal_ml: int | None = None
    activity_level: str | None = None
    dietary_preference: str | None = None
    measurement_units: str | None = None
    water_reminders: bool | None = None
    meal_reminders: bool | None = None
    weekly_reports: bool | None = None
    gender: str | None = None

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr

class MealCreate(BaseModel):
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0.0
    sugar: float = 0.0
    sodium_mg: float = 0.0
    potassium_mg: float = 0.0
    calcium_mg: float = 0.0
    vitamin_c_mg: float = 0.0
    vitamin_d_mcg: float = 0.0
    iron_mg: float = 0.0

class MealResponse(MealCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class FoodScanResponse(BaseModel):
    id: int
    user_id: int
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0.0
    sugar: float = 0.0
    sodium_mg: float = 0.0
    potassium_mg: float = 0.0
    calcium_mg: float = 0.0
    vitamin_c_mg: float = 0.0
    vitamin_d_mcg: float = 0.0
    iron_mg: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

class ChatMessageResponse(BaseModel):
    id: str
    user_id: str
    sender: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class WaterLogCreate(BaseModel):
    amount_ml: int

class WaterLogResponse(BaseModel):
    id: int
    user_id: int
    amount_ml: int
    created_at: datetime

    class Config:
        from_attributes = True

class WeightLogResponse(BaseModel):
    id: int
    user_id: int
    weight: float
    created_at: datetime

    class Config:
        from_attributes = True

class ExportDataResponse(BaseModel):
    user_profile: dict
    meals: list[MealResponse]
    water_logs: list[WaterLogResponse]
    weight_logs: list[WeightLogResponse]

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
