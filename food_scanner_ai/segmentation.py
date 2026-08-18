# ============================================================
#  Food Segmentation & Nutrition Analysis System
#  File: segmentation.py
#
#  Model  : YOLOv8-Seg trained on FoodSeg103 (Roboflow)
#  Files  : last__2_.pt  /  best__3_.pt
#  Task   : Detect & segment food items in a meal photo,
#           then estimate calories + macros via Gemini AI
#
#  Integrates with: prediction.py | recommendation.py | chatbot.py
# ============================================================
"""
CHEAT SHEET FOR PRESENTATION - `segmentation.py` (AI Food Scanner)
===========================================================
WHAT THIS FILE DOES:
This file is the brain behind the "Scan Meal" feature. It takes a picture from the user's phone/webcam and figures out exactly what food is on the plate and how many calories it has.

HOW IT WORKS:
1. When a photo is uploaded, `analyze_meal_image()` sends it to Google's Gemini Vision AI.
2. The AI is prompted to look at the food, identify it (e.g., "Grilled Chicken"), and estimate its nutritional value per 100 grams using USDA standards.
3. It then calculates total calories, protein, carbs, and fats based on the estimated portion size.
4. It also generates a friendly 4-sentence summary (e.g., "Great protein in that chicken!") tailored to the user's weight loss or muscle gain goals.
5. If Gemini fails, it falls back to a locally trained YOLOv8 model (`best (2).pt`) which draws bounding boxes around food items and calculates calories based on pixel area.
===========================================================
"""
# ── Standard library ──────────────────────────────────────────
# ── Standard library ──────────────────────────────────────────
import os
import json
import base64
import warnings
from pathlib import Path
from typing import Union, Optional
from PIL import Image

warnings.filterwarnings("ignore")

# ── Third-party ───────────────────────────────────────────────
import numpy as np
import cv2

# ── Google Gemini ─────────────────────────────────────────────
from google import genai

# ── Ultralytics YOLOv8 ───────────────────────────────────────
from ultralytics import YOLO

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────

# Load .env so the key is always fresh
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

GEMINI_MODEL   = "gemini-2.5-flash"

def _get_gemini_client():
    """Create a fresh Gemini client each time, picking up .env changes."""
    key = os.getenv("GEMINI_API_KEY", "put_your_key_here")
    return genai.Client(api_key=key)

# Default path — override via env var or pass directly to function
PROJECT_ROOT = Path(__file__).parent
DEFAULT_MODEL_PATH = os.getenv(
    "FOOD_SEG_MODEL_PATH",
    str(PROJECT_ROOT / "best (2).pt")
)

CONF_THRESHOLD = 0.25
IOU_THRESHOLD  = 0.45
INFERENCE_SIZE = 640

# ─────────────────────────────────────────────────────────────
#  FoodSeg103 — CLASS LABELS  (103 food ingredient categories)
#  Source: FoodSeg103 benchmark adapted for Roboflow / YOLOv8
# ─────────────────────────────────────────────────────────────

FOOD_CLASSES = {
    0:  "candy",              1:  "egg tart",           2:  "french fries",
    3:  "chocolate",          4:  "biscuit",             5:  "popcorn",
    6:  "pudding",            7:  "ice cream",           8:  "cheese butter",
    9:  "cake",               10: "wine",                11: "milkshake",
    12: "coffee",             13: "juice",               14: "milk",
    15: "tea",                16: "almond",              17: "red beans",
    18: "cashew",             19: "dried cranberries",   20: "soy",
    21: "walnut",             22: "peanut",              23: "egg",
    24: "apple",              25: "date",                26: "apricot",
    27: "avocado",            28: "banana",              29: "strawberry",
    30: "cherry",             31: "blueberry",           32: "raspberry",
    33: "mango",              34: "olives",              35: "peach",
    36: "lemon",              37: "pear",                38: "fig",
    39: "pineapple",          40: "grape",               41: "kiwi",
    42: "melon",              43: "orange",              44: "watermelon",
    45: "steak",              46: "pork",                47: "chicken duck",
    48: "sausage",            49: "fried meat",          50: "lamb",
    51: "sauce",              52: "crab",                53: "fish",
    54: "shellfish",          55: "shrimp",              56: "soup",
    57: "bread",              58: "corn",                59: "hamburg",
    60: "pizza",              61: "hanamaki baozi",      62: "wonton dumplings",
    63: "pasta",              64: "noodles",             65: "rice",
    66: "pie",                67: "tofu",                68: "eggplant",
    69: "potato",             70: "garlic",              71: "cauliflower",
    72: "tomato",             73: "kelp",                74: "seaweed",
    75: "spring onion",       76: "rape",                77: "ginger",
    78: "okra",               79: "lettuce",             80: "pumpkin",
    81: "cucumber",           82: "white radish",        83: "carrot",
    84: "asparagus",          85: "bamboo shoots",       86: "broccoli",
    87: "celery stick",       88: "cilantro mint",       89: "snow peas",
    90: "cabbage",            91: "bean sprouts",        92: "onion",
    93: "pepper",             94: "green beans",         95: "French beans",
    96: "king oyster mushroom",97: "shiitake",           98: "enoki mushroom",
    99: "oyster mushroom",    100: "white button mushroom",
    101: "salad",             102: "other ingredients",
}

# ─────────────────────────────────────────────────────────────
#  NUTRITION DATABASE  (per 100 g — USDA FoodData averages)
#  Keys: cal (kcal), pro (g), carb (g), fat (g)
# ─────────────────────────────────────────────────────────────

NUTRITION_PER_100G = {
    "candy":               {"cal": 394, "pro": 0.0,  "carb": 98.0, "fat": 0.0},
    "egg tart":            {"cal": 260, "pro": 6.0,  "carb": 28.0, "fat": 14.0},
    "french fries":        {"cal": 312, "pro": 3.4,  "carb": 41.0, "fat": 15.0},
    "chocolate":           {"cal": 546, "pro": 5.0,  "carb": 60.0, "fat": 31.0},
    "biscuit":             {"cal": 418, "pro": 6.0,  "carb": 63.0, "fat": 16.0},
    "popcorn":             {"cal": 375, "pro": 11.0, "carb": 74.0, "fat": 4.0},
    "pudding":             {"cal": 130, "pro": 3.0,  "carb": 23.0, "fat": 3.0},
    "ice cream":           {"cal": 207, "pro": 3.5,  "carb": 24.0, "fat": 11.0},
    "cheese butter":       {"cal": 350, "pro": 22.0, "carb": 1.0,  "fat": 28.0},
    "cake":                {"cal": 347, "pro": 5.0,  "carb": 53.0, "fat": 13.0},
    "wine":                {"cal": 83,  "pro": 0.1,  "carb": 3.0,  "fat": 0.0},
    "milkshake":           {"cal": 112, "pro": 3.8,  "carb": 18.0, "fat": 3.0},
    "coffee":              {"cal": 2,   "pro": 0.3,  "carb": 0.0,  "fat": 0.0},
    "juice":               {"cal": 45,  "pro": 0.5,  "carb": 11.0, "fat": 0.2},
    "milk":                {"cal": 61,  "pro": 3.2,  "carb": 4.8,  "fat": 3.3},
    "tea":                 {"cal": 1,   "pro": 0.0,  "carb": 0.2,  "fat": 0.0},
    "almond":              {"cal": 579, "pro": 21.0, "carb": 22.0, "fat": 50.0},
    "red beans":           {"cal": 127, "pro": 8.9,  "carb": 23.0, "fat": 0.5},
    "cashew":              {"cal": 553, "pro": 18.0, "carb": 30.0, "fat": 44.0},
    "dried cranberries":   {"cal": 308, "pro": 0.1,  "carb": 82.0, "fat": 1.1},
    "soy":                 {"cal": 446, "pro": 36.0, "carb": 30.0, "fat": 20.0},
    "walnut":              {"cal": 654, "pro": 15.0, "carb": 14.0, "fat": 65.0},
    "peanut":              {"cal": 567, "pro": 26.0, "carb": 16.0, "fat": 49.0},
    "egg":                 {"cal": 155, "pro": 13.0, "carb": 1.1,  "fat": 11.0},
    "apple":               {"cal": 52,  "pro": 0.3,  "carb": 14.0, "fat": 0.2},
    "date":                {"cal": 277, "pro": 1.8,  "carb": 75.0, "fat": 0.2},
    "apricot":             {"cal": 48,  "pro": 1.4,  "carb": 11.0, "fat": 0.4},
    "avocado":             {"cal": 160, "pro": 2.0,  "carb": 9.0,  "fat": 15.0},
    "banana":              {"cal": 89,  "pro": 1.1,  "carb": 23.0, "fat": 0.3},
    "strawberry":          {"cal": 32,  "pro": 0.7,  "carb": 8.0,  "fat": 0.3},
    "cherry":              {"cal": 50,  "pro": 1.0,  "carb": 12.0, "fat": 0.3},
    "blueberry":           {"cal": 57,  "pro": 0.7,  "carb": 14.0, "fat": 0.3},
    "raspberry":           {"cal": 52,  "pro": 1.2,  "carb": 12.0, "fat": 0.7},
    "mango":               {"cal": 60,  "pro": 0.8,  "carb": 15.0, "fat": 0.4},
    "olives":              {"cal": 115, "pro": 0.8,  "carb": 6.0,  "fat": 11.0},
    "peach":               {"cal": 39,  "pro": 0.9,  "carb": 10.0, "fat": 0.3},
    "lemon":               {"cal": 29,  "pro": 1.1,  "carb": 9.0,  "fat": 0.3},
    "pear":                {"cal": 57,  "pro": 0.4,  "carb": 15.0, "fat": 0.1},
    "fig":                 {"cal": 74,  "pro": 0.8,  "carb": 19.0, "fat": 0.3},
    "pineapple":           {"cal": 50,  "pro": 0.5,  "carb": 13.0, "fat": 0.1},
    "grape":               {"cal": 69,  "pro": 0.7,  "carb": 18.0, "fat": 0.2},
    "kiwi":                {"cal": 61,  "pro": 1.1,  "carb": 15.0, "fat": 0.5},
    "melon":               {"cal": 34,  "pro": 0.8,  "carb": 8.0,  "fat": 0.2},
    "orange":              {"cal": 47,  "pro": 0.9,  "carb": 12.0, "fat": 0.1},
    "watermelon":          {"cal": 30,  "pro": 0.6,  "carb": 8.0,  "fat": 0.2},
    "steak":               {"cal": 271, "pro": 26.0, "carb": 0.0,  "fat": 18.0},
    "pork":                {"cal": 242, "pro": 27.0, "carb": 0.0,  "fat": 14.0},
    "chicken duck":        {"cal": 215, "pro": 25.0, "carb": 0.0,  "fat": 12.0},
    "sausage":             {"cal": 301, "pro": 12.0, "carb": 3.0,  "fat": 27.0},
    "fried meat":          {"cal": 290, "pro": 20.0, "carb": 8.0,  "fat": 20.0},
    "lamb":                {"cal": 294, "pro": 25.0, "carb": 0.0,  "fat": 21.0},
    "sauce":               {"cal": 102, "pro": 1.9,  "carb": 20.0, "fat": 2.0},
    "crab":                {"cal": 87,  "pro": 18.0, "carb": 0.0,  "fat": 1.1},
    "fish":                {"cal": 136, "pro": 22.0, "carb": 0.0,  "fat": 5.0},
    "shellfish":           {"cal": 79,  "pro": 14.0, "carb": 3.0,  "fat": 1.0},
    "shrimp":              {"cal": 99,  "pro": 24.0, "carb": 0.2,  "fat": 0.3},
    "soup":                {"cal": 50,  "pro": 3.0,  "carb": 6.0,  "fat": 1.5},
    "bread":               {"cal": 265, "pro": 9.0,  "carb": 49.0, "fat": 3.2},
    "corn":                {"cal": 86,  "pro": 3.2,  "carb": 19.0, "fat": 1.2},
    "hamburg":             {"cal": 295, "pro": 17.0, "carb": 24.0, "fat": 14.0},
    "pizza":               {"cal": 266, "pro": 11.0, "carb": 33.0, "fat": 10.0},
    "hanamaki baozi":      {"cal": 223, "pro": 7.0,  "carb": 38.0, "fat": 5.0},
    "wonton dumplings":    {"cal": 194, "pro": 9.0,  "carb": 26.0, "fat": 6.0},
    "pasta":               {"cal": 131, "pro": 5.0,  "carb": 25.0, "fat": 1.1},
    "noodles":             {"cal": 138, "pro": 4.5,  "carb": 27.0, "fat": 1.0},
    "rice":                {"cal": 130, "pro": 2.7,  "carb": 28.0, "fat": 0.3},
    "pie":                 {"cal": 260, "pro": 4.0,  "carb": 33.0, "fat": 13.0},
    "tofu":                {"cal": 76,  "pro": 8.0,  "carb": 2.0,  "fat": 4.2},
    "eggplant":            {"cal": 25,  "pro": 1.0,  "carb": 6.0,  "fat": 0.2},
    "potato":              {"cal": 77,  "pro": 2.0,  "carb": 17.0, "fat": 0.1},
    "garlic":              {"cal": 149, "pro": 6.4,  "carb": 33.0, "fat": 0.5},
    "cauliflower":         {"cal": 25,  "pro": 1.9,  "carb": 5.0,  "fat": 0.3},
    "tomato":              {"cal": 18,  "pro": 0.9,  "carb": 3.9,  "fat": 0.2},
    "kelp":                {"cal": 43,  "pro": 1.7,  "carb": 10.0, "fat": 0.6},
    "seaweed":             {"cal": 35,  "pro": 5.0,  "carb": 5.0,  "fat": 0.3},
    "spring onion":        {"cal": 32,  "pro": 1.8,  "carb": 7.0,  "fat": 0.2},
    "rape":                {"cal": 25,  "pro": 3.0,  "carb": 3.0,  "fat": 0.5},
    "ginger":              {"cal": 80,  "pro": 1.8,  "carb": 18.0, "fat": 0.8},
    "okra":                {"cal": 33,  "pro": 1.9,  "carb": 7.0,  "fat": 0.2},
    "lettuce":             {"cal": 15,  "pro": 1.4,  "carb": 2.9,  "fat": 0.2},
    "pumpkin":             {"cal": 26,  "pro": 1.0,  "carb": 7.0,  "fat": 0.1},
    "cucumber":            {"cal": 16,  "pro": 0.7,  "carb": 3.6,  "fat": 0.1},
    "white radish":        {"cal": 18,  "pro": 0.6,  "carb": 4.0,  "fat": 0.1},
    "carrot":              {"cal": 41,  "pro": 0.9,  "carb": 10.0, "fat": 0.2},
    "asparagus":           {"cal": 20,  "pro": 2.2,  "carb": 3.9,  "fat": 0.1},
    "bamboo shoots":       {"cal": 27,  "pro": 2.6,  "carb": 5.2,  "fat": 0.3},
    "broccoli":            {"cal": 34,  "pro": 2.8,  "carb": 7.0,  "fat": 0.4},
    "celery stick":        {"cal": 16,  "pro": 0.7,  "carb": 3.0,  "fat": 0.2},
    "cilantro mint":       {"cal": 23,  "pro": 2.1,  "carb": 3.7,  "fat": 0.5},
    "snow peas":           {"cal": 42,  "pro": 2.8,  "carb": 7.6,  "fat": 0.2},
    "cabbage":             {"cal": 25,  "pro": 1.3,  "carb": 6.0,  "fat": 0.1},
    "bean sprouts":        {"cal": 30,  "pro": 3.0,  "carb": 6.0,  "fat": 0.2},
    "onion":               {"cal": 40,  "pro": 1.1,  "carb": 9.0,  "fat": 0.1},
    "pepper":              {"cal": 31,  "pro": 1.0,  "carb": 7.0,  "fat": 0.3},
    "green beans":         {"cal": 31,  "pro": 1.8,  "carb": 7.0,  "fat": 0.1},
    "French beans":        {"cal": 31,  "pro": 1.8,  "carb": 7.0,  "fat": 0.1},
    "king oyster mushroom":{"cal": 35,  "pro": 2.2,  "carb": 6.0,  "fat": 0.4},
    "shiitake":            {"cal": 34,  "pro": 2.2,  "carb": 7.0,  "fat": 0.5},
    "enoki mushroom":      {"cal": 37,  "pro": 2.7,  "carb": 7.0,  "fat": 0.3},
    "oyster mushroom":     {"cal": 33,  "pro": 3.0,  "carb": 6.0,  "fat": 0.3},
    "white button mushroom":{"cal": 22, "pro": 3.1,  "carb": 3.3,  "fat": 0.3},
    "salad":               {"cal": 20,  "pro": 1.5,  "carb": 3.5,  "fat": 0.2},
    "other ingredients":   {"cal": 100, "pro": 3.0,  "carb": 15.0, "fat": 3.0},
}

# Typical serving sizes in grams (used with mask-area estimation)
TYPICAL_PORTION_G = {
    # Dense Mains / Bases (Large portions)
    "rice": 200, "pasta": 200, "noodles": 200, "bread": 60,
    "steak": 200, "chicken duck": 150, "fish": 150, "pork": 150, "lamb": 150,
    "soup": 300, "pizza": 150, "hamburg": 180,
    # Sides / Moderate
    "french fries": 100, "salad": 100, "egg": 60, "shrimp": 100,
    "ice cream": 100, "cake": 100, "chocolate": 40, "pudding": 100,
    "apple": 120, "banana": 120, "orange": 120, "peach": 120, "pear": 120,
    "avocado": 100, "tomato": 100, "cucumber": 100, "broccoli": 100,
    # Garnishes / Nuts / Berries (Tiny portions)
    "almond": 15, "cashew": 15, "peanut": 15, "walnut": 15,
    "strawberry": 30, "cherry": 30, "blueberry": 20, "raspberry": 20,
    "dried cranberries": 15, "garlic": 5, "ginger": 5, "cilantro mint": 2,
    "spring onion": 5, "sesame": 2, "olives": 15,
}
DEFAULT_PORTION_G = 80


# ─────────────────────────────────────────────────────────────
#  MODEL LOADER  (singleton — loaded once per session)
# ─────────────────────────────────────────────────────────────

_model_cache: Optional[YOLO] = None

def load_model(model_path: str = DEFAULT_MODEL_PATH) -> YOLO:
    """
    Load YOLOv8 food segmentation model. Cached after first call.

    Raises:
        FileNotFoundError: if .pt file does not exist.
    """
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}\n"
            "Upload last__2_.pt to: /content/drive/MyDrive/Nutrition_project/"
        )

    print("[Loading] Food segmentation model...")
    _model_cache = YOLO(model_path)
    print("[OK] Food segmentation model ready.")
    return _model_cache


# ─────────────────────────────────────────────────────────────
#  IMAGE UTILITIES
# ─────────────────────────────────────────────────────────────

def _decode_image(image_input: Union[str, bytes, np.ndarray]) -> np.ndarray:
    """Accept file path / base64 string / bytes / numpy → BGR array."""
    if isinstance(image_input, np.ndarray):
        return image_input

    if isinstance(image_input, (str, Path)):
        path = str(image_input)
        if Path(path).exists():
            img = cv2.imread(path)
            if img is None:
                raise ValueError(f"Cannot read image: {path}")
            return img
        try:
            data = base64.b64decode(path)
            arr  = np.frombuffer(data, np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            raise ValueError(f"Path not found and not valid base64: {path[:80]}")

    if isinstance(image_input, bytes):
        arr = np.frombuffer(image_input, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    raise TypeError(f"Unsupported image type: {type(image_input)}")


def image_to_base64(img: np.ndarray) -> str:
    """BGR numpy array → base64 PNG string."""
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


# ─────────────────────────────────────────────────────────────
#  PORTION ESTIMATION FROM MASK AREA
# ─────────────────────────────────────────────────────────────

def _estimate_portion_grams(
    mask_area_px: float,
    image_area_px: float,
    food_name: str,
    is_base: bool = False
) -> float:
    """
    Estimate portion weight (grams) from how much of the image the mask covers.

    A mask covering the full image → full typical portion.
    """
    coverage  = mask_area_px / image_area_px if image_area_px > 0 else 0.1
    typical_g = TYPICAL_PORTION_G.get(food_name, DEFAULT_PORTION_G)
    
    # Base foods (largest items) get full volume estimation (depth).
    # Toppings/garnishes are heavily penalized because they are a thin surface layer.
    scale_factor = 3.0 if is_base else 1.5
    estimated = typical_g * min(coverage * scale_factor, 1.0)
    
    # Hard max limit to prevent absurd numbers (1.5x typical)
    max_limit = typical_g * 1.5
    
    # Soft minimum limit: 1g (so a tiny almond can weigh 1g instead of 20g)
    return round(max(1.0, min(max_limit, estimated)), 1)


# ─────────────────────────────────────────────────────────────
#  NUTRITION CALCULATION
# ─────────────────────────────────────────────────────────────

def _calc_nutrition(food_name: str, grams: float) -> dict:
    """Return calories and macros for given grams of a food item."""
    db    = NUTRITION_PER_100G.get(food_name, NUTRITION_PER_100G["other ingredients"])
    ratio = grams / 100.0
    return {
        "calories":  round(db["cal"]  * ratio, 1),
        "protein_g": round(db["pro"]  * ratio, 1),
        "carbs_g":   round(db["carb"] * ratio, 1),
        "fat_g":     round(db["fat"]  * ratio, 1),
        "fiber_g":   round(db.get("fiber", 0.0) * ratio, 1),
        "sugar_g":   round(db.get("sugar", 0.0) * ratio, 1),
    }


# ─────────────────────────────────────────────────────────────
#  INFERENCE
# ─────────────────────────────────────────────────────────────

def run_inference(image: np.ndarray, model: YOLO) -> list:
    """
    Run YOLOv8-seg on a BGR image.

    Returns:
        List of dicts: class_id, food_name, confidence,
                       bbox_xyxy, mask (H×W uint8), mask_area_px
    """
    h, w = image.shape[:2]

    results = model.predict(
        source=image,
        conf=CONF_THRESHOLD,
        iou=IOU_THRESHOLD,
        imgsz=INFERENCE_SIZE,
        verbose=False,
    )

    detections = []
    if not results or results[0].masks is None:
        return detections

    result = results[0]
    masks  = result.masks.data.cpu().numpy()
    boxes  = result.boxes

    for mask_raw, box in zip(masks, boxes):
        mask_resized = cv2.resize(
            mask_raw.astype(np.float32), (w, h),
            interpolation=cv2.INTER_LINEAR
        )
        mask_bin  = (mask_resized > 0.5).astype(np.uint8)
        mask_area = float(np.sum(mask_bin))

        class_id   = int(box.cls.item())
        confidence = float(box.conf.item())
        xyxy       = [round(v, 1) for v in box.xyxy[0].cpu().numpy().tolist()]
        food_name  = FOOD_CLASSES.get(class_id, f"food_{class_id}")

        detections.append({
            "class_id":     class_id,
            "food_name":    food_name,
            "confidence":   round(confidence, 3),
            "bbox_xyxy":    xyxy,
            "mask":         mask_bin,
            "mask_area_px": mask_area,
        })

    return detections


# ─────────────────────────────────────────────────────────────
#  ANNOTATION  (draw coloured masks + labels on image)
# ─────────────────────────────────────────────────────────────

_PALETTE = [
    (255,  87,  51), ( 51, 255,  87), ( 51,  87, 255), (255, 215,   0),
    (  0, 206, 209), (255, 105, 180), (127, 255,   0), (255, 140,   0),
    (138,  43, 226), (  0, 191, 255), (255,  69,   0), ( 50, 205,  50),
]

def draw_annotations(
    image: np.ndarray,
    detections: list,
    food_details: list,
) -> np.ndarray:
    """
    Overlay colour masks, contours, and calorie labels on the meal photo.

    Args:
        image       : Original BGR image.
        detections  : Output of run_inference().
        food_details: List with calories per item (same order as detections).

    Returns:
        Annotated BGR image.
    """
    annotated = image.copy()
    overlay   = annotated.copy()

    for i, (det, detail) in enumerate(zip(detections, food_details)):
        colour = _PALETTE[i % len(_PALETTE)]
        mask   = det["mask"]

        # Semi-transparent fill
        overlay[mask > 0] = colour
        cv2.addWeighted(overlay, 0.40, annotated, 0.60, 0, annotated)
        overlay = annotated.copy()

        # Contour
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(annotated, contours, -1, colour, 2)

        # Label with calorie count
        x1, y1 = int(det["bbox_xyxy"][0]), int(det["bbox_xyxy"][1])
        cal    = detail.get("calories", "?")
        label  = f"{det['food_name']}  ~{cal} kcal"

        font  = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.4, annotated.shape[1] / 1600)
        thick = max(1, int(scale * 2))

        (lw, lh), _ = cv2.getTextSize(label, font, scale, thick)
        y_pos = max(y1, lh + 8)
        cv2.rectangle(annotated, (x1, y_pos - lh - 6), (x1 + lw + 4, y_pos), (0, 0, 0), -1)
        cv2.putText(annotated, label, (x1 + 2, y_pos - 3), font, scale, (255, 255, 255), thick)

    return annotated


# ─────────────────────────────────────────────────────────────
#  GEMINI AI MEAL ANALYSIS & LABEL CORRECTION
# ─────────────────────────────────────────────────────────────

def refine_food_labels_with_gemini(image: np.ndarray, detections: list) -> list:
    """
    Uses Gemini Vision to double-check YOLO's classifications.
    If YOLO misclassified an item (e.g., meatball -> pumpkin), Gemini maps it to the correct allowed class.
    """
    if not detections:
        return detections
        
    try:
        original_names = list(set([d["food_name"] for d in detections]))
        
        # Convert image for Gemini
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(img_rgb)
        
        allowed_classes_str = ", ".join(FOOD_CLASSES.values())
        
        prompt = f'''You are an expert food recognition AI. 
An earlier object detection model found the following food items in this image:
{original_names}

Sometimes the model misclassifies items (e.g., detecting meatballs as 'pumpkin' or rice as 'peanut').
Carefully inspect the image. If the detection is completely wrong, provide a corrected label chosen ONLY from this exact allowed list of classes:
[{allowed_classes_str}]

If the detection is generally correct, keep it as is. 
Respond ONLY with a raw JSON object mapping the original names to the corrected names. No markdown formatting or backticks.
Example output format:
{{"pumpkin": "fried meat", "peanut": "rice"}}'''
        
        import time
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = _get_gemini_client().models.generate_content(
                    model=GEMINI_MODEL,
                    contents=[pil_image, prompt]
                )
                break
            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    print(f"[AI Correction] Rate limited (429). Retrying in 20s... (Attempt {attempt+1})")
                    time.sleep(20)
                else:
                    raise e
        
        text = response.text.replace("```json", "").replace("```", "").strip()
        correction_map = json.loads(text)
        
        for det in detections:
            old_name = det["food_name"]
            if old_name in correction_map:
                new_name = correction_map[old_name]
                if new_name in FOOD_CLASSES.values() and new_name != old_name:
                    print(f"[AI Correction] Changed '{old_name}' -> '{new_name}'")
                    det["food_name"] = new_name
                    
    except Exception as e:
        print(f"[WARN] Gemini label correction failed: {e}")
        
    return detections

def generate_ai_analysis(
    food_details:   list,
    total_calories: float,
    total_protein:  float,
    total_carbs:    float,
    total_fat:      float,
    user_goal:      str = "general health",
) -> str:
    """
    Ask Gemini to write a friendly nutrition commentary on the scanned meal.
    """
    goal_map = {
        "lose":     "weight loss",
        "gain":     "muscle gain / bulking",
        "maintain": "weight maintenance",
    }
    goal_str   = goal_map.get(user_goal, user_goal)
    foods_text = "\n".join([
        f"  - {d['food_name']}: ~{d['estimated_grams']}g  →  "
        f"{d['calories']} kcal | protein {d['protein_g']}g | "
        f"carbs {d['carbs_g']}g | fat {d['fat_g']}g"
        for d in food_details
    ])

    prompt = f"""You are a registered dietitian and friendly nutrition coach.

A user photographed their meal and the AI identified these food items:

{foods_text if foods_text else "  (No specific items detected — image may be unclear)"}

Meal totals: {total_calories:.0f} kcal | Protein {total_protein:.1f}g | Carbs {total_carbs:.1f}g | Fat {total_fat:.1f}g
User goal: {goal_str}

Write a warm, practical meal analysis in 4–5 sentences:
1. Comment on what was detected and whether the calorie level fits their goal
2. Highlight one nutritional strength of this meal
3. Mention one thing to improve (specific to their goal)
4. Give one easy, concrete tip for next time
5. Close with a motivating sentence

Keep it conversational — like texting a friend who happens to be a nutritionist."""

    import time
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = _get_gemini_client().models.generate_content(model=GEMINI_MODEL, contents=prompt)
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                print(f"[AI Analysis] Rate limited (429). Retrying in 20s... (Attempt {attempt+1})")
                time.sleep(20)
            elif attempt == max_retries - 1:
                return (
                    f"Meal scanned! Your meal contains approximately {total_calories:.0f} kcal "
                    f"with {total_protein:.0f}g of protein. "
                    f"Keep logging your meals to stay on track for your {goal_str} goal!"
                )


# ─────────────────────────────────────────────────────────────
#  MAIN PUBLIC FUNCTION
# ─────────────────────────────────────────────────────────────

def _gemini_holistic_scan(image: np.ndarray, user_goal: str) -> dict:
    """
    Try Gemini Vision for holistic meal analysis.
    Returns the parsed data dict on success, or raises on failure.
    """
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(img_rgb)

    goal_map = {
        "lose":     "weight loss",
        "gain":     "muscle gain / bulking",
        "maintain": "weight maintenance",
    }
    goal_str = goal_map.get(user_goal, user_goal)

    prompt = f'''You are an expert food recognition AI and registered dietitian.
Carefully inspect the provided image of a meal. Evaluate it as ONE holistic dish.

IMPORTANT — Follow these steps to ensure accurate nutrition data:
1. Identify the food item(s) in the image.
2. Estimate the portion weight in grams. 
   CRITICAL: AI models often massively overestimate food weight in close-up photos. 
   Unless there is a clear reference object showing it's a huge platter, ASSUME A STANDARD PORTION SIZE OF 100 GRAMS.
   Do not estimate 400g-500g for a standard bowl or plate. 
3. Look up the USDA standard nutritional values per 100g for the identified food.
   For example, cooked skinless chicken breast per 100g: 165 kcal, 31g protein, 0g carbs, 3.6g fat.
   For example, meatballs with rice per 100g: ~145 kcal, 8g protein, 17g carbs, 5g fat.
4. Calculate the TOTAL macros based on your estimated portion (which should be ~100g).

Provide the following:
1. "food_name": A descriptive name for the meal (e.g., "Meatballs with Rice", "Grilled Chicken Breast").
2. "calories": Total calories for the estimated portion (float).
3. "protein_g": Total protein for the estimated portion (float).
4. "carbs_g": Total carbohydrates for the estimated portion (float).
5. "fat_g": Total fat for the estimated portion (float).
6. "fiber_g": Total dietary fiber for the estimated portion (float).
7. "sugar_g": Total sugar for the estimated portion (float).
8. "sodium_mg": Total sodium in milligrams (float).
9. "potassium_mg": Total potassium in milligrams (float).
10. "calcium_mg": Total calcium in milligrams (float).
11. "vitamin_c_mg": Total Vitamin C in milligrams (float).
12. "vitamin_d_mcg": Total Vitamin D in micrograms (float).
13. "iron_mg": Total iron in milligrams (float).
14. "estimated_grams": Estimated portion weight in grams (float). MUST be conservative (e.g. 100.0).
15. "ai_analysis": Write a warm, practical meal analysis in 4-5 sentences.
   - Comment on the meal and whether the calorie level fits their "{goal_str}" goal.
   - Highlight one nutritional strength.
   - Mention one thing to improve (specific to their goal).
   - Give one easy, concrete tip for next time.
   - Close with a motivating sentence.

Respond ONLY with a raw JSON object containing these EXACT keys. Do not include markdown formatting or backticks.
Example:
{{"food_name": "Meatballs with Rice", "calories": 145.0, "protein_g": 8.0, "carbs_g": 17.0, "fat_g": 5.0, "fiber_g": 1.5, "sugar_g": 2.0, "sodium_mg": 450.0, "potassium_mg": 200.0, "calcium_mg": 40.0, "vitamin_c_mg": 5.0, "vitamin_d_mcg": 0.5, "iron_mg": 1.2, "estimated_grams": 100.0, "ai_analysis": "Great balanced meal..."}}'''

    import time
    gemini_client = _get_gemini_client()
    max_retries = 3
    response = None
    
    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[pil_image, prompt]
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                print(f"[Scan] Rate limited (429). Retrying in 20s... (Attempt {attempt+1})")
                time.sleep(20)
            else:
                raise e

    text = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)


def _yolo_fallback_scan(image: np.ndarray, model_path: str, user_goal: str) -> dict:
    """
    Fallback: use the local YOLO model when Gemini is unavailable.
    """
    h, w = image.shape[:2]
    image_area = h * w

    model = load_model(model_path)
    detections = run_inference(image, model)

    # Try Gemini label correction (best-effort, ignore failures)
    try:
        detections = refine_food_labels_with_gemini(image, detections)
    except Exception:
        pass

    detections = sorted(detections, key=lambda d: d["mask_area_px"], reverse=True)
    food_details = []

    for i, det in enumerate(detections):
        coverage = det["mask_area_px"] / image_area if image_area > 0 else 0

        xmin, ymin, xmax, ymax = det["bbox_xyxy"]
        cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
        img_cx, img_cy = w / 2, h / 2
        dist = ((cx - img_cx)**2 + (cy - img_cy)**2)**0.5
        max_dist = ((w/2)**2 + (h/2)**2)**0.5
        dist_ratio = dist / max_dist if max_dist > 0 else 0

        if coverage < 0.015 and dist_ratio > 0.6:
            continue

        is_base = (i == 0) or (coverage > 0.20)
        grams = _estimate_portion_grams(det["mask_area_px"], image_area, det["food_name"], is_base=is_base)
        nutr = _calc_nutrition(det["food_name"], grams)
        food_details.append({
            "food_name": det["food_name"],
            "confidence": det["confidence"],
            "estimated_grams": grams,
            **nutr,
        })

    total_cal  = sum(d["calories"]  for d in food_details)
    total_pro  = sum(d["protein_g"] for d in food_details)
    total_carb = sum(d["carbs_g"]   for d in food_details)
    total_fat  = sum(d["fat_g"]     for d in food_details)
    total_fiber = sum(d["fiber_g"]  for d in food_details)
    total_sugar = sum(d["sugar_g"]  for d in food_details)

    goal_map = {"lose": "weight loss", "gain": "muscle gain / bulking", "maintain": "weight maintenance"}
    goal_str = goal_map.get(user_goal, user_goal)
    ai_text = (
        f"Meal scanned! Your meal contains approximately {total_cal:.0f} kcal "
        f"with {total_pro:.0f}g of protein. "
        f"Keep logging your meals to stay on track for your {goal_str} goal!"
    )

    annotated_b64 = None
    if detections:
        ann = draw_annotations(image, detections, food_details)
        scale = min(800 / max(h, w), 1.0)
        if scale < 1.0:
            ann = cv2.resize(ann, (int(w * scale), int(h * scale)))
        annotated_b64 = image_to_base64(ann)

    return {
        "food_details": food_details,
        "total_cal": total_cal, "total_pro": total_pro,
        "total_carb": total_carb, "total_fat": total_fat,
        "total_fiber": total_fiber, "total_sugar": total_sugar,
        "ai_text": ai_text, "annotated_b64": annotated_b64,
    }


def analyze_meal_image(
    image_input:            Union[str, bytes, np.ndarray],
    model_path:             str  = DEFAULT_MODEL_PATH,
    user_goal:              str  = "general health",
    return_annotated_image: bool = True,
) -> dict:
    """
    Hybrid pipeline: tries Gemini Vision first for holistic analysis.
    If Gemini is unavailable (quota/key issues), falls back to local YOLO model.
    """
    try:
        image = _decode_image(image_input)
        h, w = image.shape[:2]
    except (FileNotFoundError, ValueError) as e:
        return _error_response(str(e))
    except Exception as e:
        return _error_response(f"Image decode failed: {e}")

    # ── STRATEGY 1: Gemini Vision (preferred and ONLY strategy now) ──────────────
    try:
        print("[Scan] Trying Gemini Vision holistic analysis...")
        data = _gemini_holistic_scan(image, user_goal)

        food_name = data.get("food_name", "Unidentified Meal")
        cal  = float(data.get("calories", 0.0))
        pro  = float(data.get("protein_g", 0.0))
        carb = float(data.get("carbs_g", 0.0))
        fat  = float(data.get("fat_g", 0.0))
        fiber = float(data.get("fiber_g", 0.0))
        sugar = float(data.get("sugar_g", 0.0))
        sodium = float(data.get("sodium_mg", 0.0))
        potassium = float(data.get("potassium_mg", 0.0))
        calcium = float(data.get("calcium_mg", 0.0))
        vit_c = float(data.get("vitamin_c_mg", 0.0))
        vit_d = float(data.get("vitamin_d_mcg", 0.0))
        iron = float(data.get("iron_mg", 0.0))
        est_g = float(data.get("estimated_grams", 300.0))
        ai_text = data.get("ai_analysis", "Enjoy your meal!")

        food_details = [{
            "food_name": food_name, "confidence": 1.0,
            "estimated_grams": est_g,
            "calories": cal, "protein_g": pro,
            "carbs_g": carb, "fat_g": fat,
            "fiber_g": fiber, "sugar_g": sugar,
            "sodium_mg": sodium, "potassium_mg": potassium,
            "calcium_mg": calcium, "vitamin_c_mg": vit_c,
            "vitamin_d_mcg": vit_d, "iron_mg": iron,
        }]

        annotated_b64 = None
        if return_annotated_image:
            scale = min(800 / max(h, w), 1.0)
            if scale < 1.0:
                annotated_b64 = image_to_base64(cv2.resize(image, (int(w * scale), int(h * scale))))
            else:
                annotated_b64 = image_to_base64(image)

        print(f"[Scan] Gemini OK -> {food_name} ({cal:.0f} kcal)")
        return {
            "success": True, "detected_foods": food_details,
            "total_calories": round(cal, 1), "total_protein_g": round(pro, 1),
            "total_carbs_g": round(carb, 1), "total_fat_g": round(fat, 1),
            "total_fiber_g": round(fiber, 1), "total_sugar_g": round(sugar, 1),
            "total_sodium_mg": round(sodium, 1), "total_potassium_mg": round(potassium, 1),
            "total_calcium_mg": round(calcium, 1), "total_vitamin_c_mg": round(vit_c, 1),
            "total_vitamin_d_mcg": round(vit_d, 1), "total_iron_mg": round(iron, 1),
            "num_detections": 1, "ai_analysis": ai_text,
            "meal_log": {
                "total_calories": round(cal, 1), "total_protein": round(pro, 1),
                "total_carbs": round(carb, 1), "total_fat": round(fat, 1),
                "total_fiber": round(fiber, 1), "total_sugar": round(sugar, 1),
                "total_sodium": round(sodium, 1), "total_potassium": round(potassium, 1),
                "total_calcium": round(calcium, 1), "total_vitamin_c": round(vit_c, 1),
                "total_vitamin_d": round(vit_d, 1), "total_iron": round(iron, 1),
                "foods_detected": [food_name], "num_items": 1,
            },
            "annotated_image_b64": annotated_b64, "error": None,
        }

    except Exception as gemini_err:
        print(f"[Scan] Gemini failed: {gemini_err}")
        err_str = str(gemini_err)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "API_KEY_INVALID" in err_str:
            return _error_response("API Key Expired or Quota Exceeded. Please update your Gemini API key in the server configuration to continue scanning.")
        return _error_response(f"Gemini API Error: {err_str}")


def _error_response(msg: str) -> dict:
    print(f"[!] {msg}")
    return {
        "success": False, "detected_foods": [], "total_calories": 0.0,
        "total_protein_g": 0.0, "total_carbs_g": 0.0, "total_fat_g": 0.0,
        "num_detections": 0,
        "ai_analysis": "Could not analyse the image. Please upload a clear meal photo.",
        "meal_log": {}, "annotated_image_b64": None, "error": msg,
    }


# ─────────────────────────────────────────────────────────────
#  INTEGRATION HELPERS  (shortcuts for other modules)
# ─────────────────────────────────────────────────────────────

def get_meal_calories(
    image_input: Union[str, bytes, np.ndarray],
    model_path:  str = DEFAULT_MODEL_PATH,
) -> float:
    """
    Quick helper — returns ONLY total calories from a meal photo.
    Feed this into prediction.py's avg_daily_calories parameter.

    Example:
        from segmentation import get_meal_calories
        from prediction import predict_weight

        breakfast_cal = get_meal_calories("breakfast.jpg")
        lunch_cal     = get_meal_calories("lunch.jpg")
        total_today   = breakfast_cal + lunch_cal

        result = predict_weight(..., avg_daily_calories=total_today)
    """
    result = analyze_meal_image(image_input, model_path, return_annotated_image=False)
    return result["total_calories"]


def get_detected_food_names(
    image_input: Union[str, bytes, np.ndarray],
    model_path:  str = DEFAULT_MODEL_PATH,
) -> list:
    """
    Returns list of food name strings detected in the image.
    Useful for cross-referencing with recommendation.py.

    Example:
        foods = get_detected_food_names("dinner.jpg")
        # ["rice", "chicken duck", "broccoli"]
    """
    result = analyze_meal_image(image_input, model_path, return_annotated_image=False)
    return [d["food_name"] for d in result["detected_foods"]]


# ─────────────────────────────────────────────────────────────
#  CLI ENTRY POINT  (quick test without frontend)
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Food Segmentation & Nutrition Analyser")
    parser.add_argument("image",    help="Path to meal photo")
    parser.add_argument("--model",  default=DEFAULT_MODEL_PATH, help="Path to .pt model")
    parser.add_argument("--goal",   default="general health",   help="lose | gain | maintain")
    parser.add_argument("--no-img", action="store_true",        help="Skip annotated image")
    args = parser.parse_args()

    print("\n[Scanning meal...]\n")
    result = analyze_meal_image(
        args.image, args.model, args.goal,
        return_annotated_image=not args.no_img,
    )

    if result["success"]:
        print("[OK] Detected food items:")
        for f in result["detected_foods"]:
            print(f"   • {f['food_name']:28s} ~{f['estimated_grams']:>5}g  "
                  f"→  {f['calories']:>6} kcal  |  "
                  f"P {f['protein_g']}g  C {f['carbs_g']}g  F {f['fat_g']}g")
        print(f"\n[Meal Total:]")
        print(f"    Calories : {result['total_calories']} kcal")
        print(f"    Protein  : {result['total_protein_g']} g")
        print(f"    Carbs    : {result['total_carbs_g']} g")
        print(f"    Fat      : {result['total_fat_g']} g")
        print(f"\n[AI Analysis:]\n{result['ai_analysis']}")
    else:
        print(f"[ERROR] {result['error']}")
