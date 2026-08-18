"""
CHEAT SHEET FOR PRESENTATION - `models.py` (Database Tables)
===========================================================
WHAT THIS FILE DOES:
This file defines the Database Schema using SQLAlchemy. Each class here represents exactly one table in our Supabase/SQL database.

TABLES:
1. `User`: Stores user profiles, hashed passwords, physical stats, and goals.
2. `Meal`: Stores the history of everything the user has eaten.
3. `FoodScan`: Stores records of every picture the AI scanner has analyzed.
4. `WaterLog`: Stores how much water the user drinks each day.
5. `Notification`: Stores the alerts (like "Drink water!") that show up in the dashboard bell icon.
6. `WeightLog`: Stores a history of the user's weight changes over time so we can graph their progress.
===========================================================
"""
# models.py — correct version
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from database_core.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    age = Column(Integer)
    height = Column(Float)
    weight = Column(Float)
    goal = Column(String)
    water_goal_ml = Column(Integer, default=2500)
    dietary_preference = Column(String, default="none")
    activity_level = Column(String, default="sedentary")
    measurement_units = Column(String, default="metric")
    water_reminders = Column(Boolean, default=True)
    meal_reminders = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=True)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)

class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_name = Column(String)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    fiber = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FoodScan(Base):
    __tablename__ = "food_scans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_name = Column(String)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    fiber = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WaterLog(Base):
    __tablename__ = "water_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    amount_ml = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    type = Column(String, nullable=False)  # 'meal', 'water', 'report'
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WeightLog(Base):
    __tablename__ = "weight_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    weight = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())