---
title: "Nutrition Tracker Project - Presentation Summary"
author: "Project Team"
date: "2026"
---

# Nutrition Tracker Project - Presentation Summary
# ملخص عرض مشروع تطبيق التغذية

This document provides a comprehensive overview of the Nutrition Tracker project, tailored for your presentation. It focuses heavily on your role (Backend) while providing necessary overviews for your teammates' roles (Frontend, AI, and Database).

يوفر هذا المستند نظرة عامة شاملة لمشروع تطبيق التغذية، وهو مصمم خصيصًا لعرضك التقديمي. يركز بشكل كبير على دورك (الواجهة الخلفية - Backend) مع توفير لمحة عامة عن أدوار زملائك (الواجهة الأمامية، الذكاء الاصطناعي، وقاعدة البيانات).

---

## 1. Your Part: The Backend (الواجهة الخلفية - دورك الأساسي)

**English:**
As the backend developer, you are the bridge connecting the database, the AI models, and the user interface. Your main responsibilities include:
- **Framework (FastAPI):** Chosen for its high performance and asynchronous capabilities. It handles all HTTP requests and routes them to the correct functions.
- **API Routing:** You designed a structured API (`api.py`) with endpoints for User Authentication, Profile Management, Meal & Water Logging, and AI interactions.
- **Business Logic:** You implemented the core scientific calculations (`nutrition_logic.py`) such as the Mifflin-St Jeor equation to calculate Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) based on user metrics (age, weight, height).
- **Data Validation & Security:** Used **Pydantic** (`schemas.py`) to strictly validate incoming data from the frontend, ensuring no bad data crashes the system. You also implemented password hashing and secure login mechanisms.
- **Notification System:** Created a dynamic notification logic that checks the user's progress against their goals and time of day to trigger reminders (e.g., "Drink more water!").

**Arabic:**
بصفتك مطور الواجهة الخلفية، أنت الجسر الذي يربط قاعدة البيانات بنماذج الذكاء الاصطناعي وواجهة المستخدم. تشمل مسؤولياتك الرئيسية:
- **إطار العمل (FastAPI):** تم اختياره لأدائه العالي وقدراته غير المتزامنة. يعالج جميع طلبات HTTP ويوجهها.
- **توجيه واجهة برمجة التطبيقات (API):** قمت بتصميم مسارات منظمة (`api.py`) للمصادقة، إدارة الملف الشخصي، تسجيل الوجبات والماء، والتفاعل مع الذكاء الاصطناعي.
- **المنطق البرمجي (Business Logic):** قمت بتنفيذ الحسابات العلمية (`nutrition_logic.py`) مثل معادلة "Mifflin-St Jeor" لحساب معدل الأيض (BMR) واحتياجات السعرات الحرارية اليومية (TDEE).
- **التحقق من البيانات والأمان:** استخدمت **Pydantic** (`schemas.py`) للتحقق الصارم من البيانات الواردة من الواجهة الأمامية، مما يمنع تعطل النظام. قمت أيضاً بتنفيذ آليات التشفير وتسجيل الدخول الآمن.
- **نظام الإشعارات:** أنشأت منطقاً ديناميكياً يراقب تقدم المستخدم ويرسل تذكيرات في الوقت المناسب (مثل: "اشرب المزيد من الماء!").

---

## 2. Friend 1: The Frontend (الواجهة الأمامية)

**English:**
- **Technology Stack:** Built using **React.js** and **Vite** for a blazing fast, modern User Interface.
- **State Management & Routing:** Uses React Hooks (`useState`, `useEffect`) to manage user data locally and `react-router-dom` for seamless page navigation without reloading.
- **Data Visualization:** Integrated **Recharts** to draw beautiful, interactive graphs for weight projection and macro-nutrient pie charts on the Dashboard.
- **User Experience (UX):** Created responsive designs with smooth animations, ensuring the app looks great on both mobile and desktop screens.

**Arabic:**
- **التقنيات المستخدمة:** تم بناء الواجهة باستخدام **React.js** و **Vite** لتوفير تجربة مستخدم سريعة وحديثة.
- **إدارة الحالة والتنقل:** استخدام خطافات ريأكت (React Hooks) لإدارة البيانات محلياً، واستخدام `react-router-dom` للتنقل السلس بين الصفحات دون إعادة تحميل.
- **تصوير البيانات:** تم دمج مكتبة **Recharts** لرسم رسوم بيانية تفاعلية لوزن المستخدم وتقسيم العناصر الغذائية (الماكروز).
- **تجربة المستخدم (UX):** تصميم واجهات متجاوبة مع حركات سلسة لضمان عمل التطبيق بشكل ممتاز على الهواتف وأجهزة الكمبيوتر.

---

## 3. Friend 2: AI Models & Chatbot (نماذج الذكاء الاصطناعي والدردشة)

**English:**
- **Food Scanner (Computer Vision):** Combines a custom-trained **YOLOv8** model for object detection (drawing bounding boxes around food) with **Google Gemini Vision** to analyze the nutritional content (calories, protein, carbs, fats) per 100 grams.
- **RAG Chatbot (NLP):** An interactive chatbot built using **Retrieval-Augmented Generation (RAG)**. It fetches the user's historical data (weight, goals, past meals) and injects it into the prompt before asking the Gemini language model. This makes the AI's advice highly personalized rather than generic.

**Arabic:**
- **ماسح الطعام (الرؤية الحاسوبية):** يجمع بين نموذج **YOLOv8** المدرب محلياً للتعرف على الأشياء (تحديد الطعام في الصورة) و **Google Gemini Vision** لتحليل المحتوى الغذائي (السعرات، البروتين، الكربوهيدرات، الدهون).
- **بوت الدردشة (معالجة اللغات الطبيعية):** روبوت دردشة تفاعلي مبني بتقنية **RAG**. يقوم بجلب بيانات المستخدم التاريخية (الوزن، الأهداف، الوجبات السابقة) ودمجها مع السؤال قبل إرساله لنموذج Gemini، مما يجعل النصائح مخصصة ودقيقة جداً.

---

## 4. Friend 3: Database (قاعدة البيانات)

**English:**
- **Platform:** Hosted on **Supabase** (a powerful PostgreSQL-based platform), ensuring scalable and real-time database capabilities.
- **ORM (SQLAlchemy):** Used Object-Relational Mapping to represent database tables as Python classes (`models.py`), making it extremely safe and easy to query data.
- **Schema Design:** Designed interconnected tables with Foreign Keys: `Users` (profiles & goals), `Meals` (food history), `WaterLogs`, `WeightLogs`, and `Notifications`.
- **Data Integrity:** Ensured cascading deletes and proper indexing so that queries remain fast even as the user base grows.

**Arabic:**
- **المنصة:** مستضافة على **Supabase** (منصة قوية مبنية على PostgreSQL)، مما يضمن قابلية التوسع والمزامنة.
- **ORM (SQLAlchemy):** استخدام تقنية الربط الكائني العلائقي لتمثيل جداول قاعدة البيانات كفئات برمجية (Classes) في بايثون، مما يسهل الاستعلام عن البيانات بأمان.
- **تصميم المخطط:** تصميم جداول مترابطة: `Users` (المستخدمين والأهداف)، `Meals` (تاريخ الوجبات)، `WaterLogs`، `WeightLogs`، و `Notifications`.
- **تكامل البيانات:** ضمان الحذف المتتالي (Cascading deletes) والفهرسة الصحيحة لضمان سرعة الاستعلامات حتى مع زيادة عدد المستخدمين.

---

## 5. Limitations (القيود الحالية)

**English:**
- **AI Scanning Accuracy:** The YOLOv8 model's accuracy drops if the lighting is poor or if multiple mixed ingredients (like a complex stew) are scanned.
- **API Rate Limits:** Heavy reliance on external APIs (Gemini) means if the API goes down or hits rate limits, the chatbot and scanning features are temporarily disabled.
- **Manual Data Entry Dependency:** While AI helps, users still need to manually correct portion sizes if the AI misjudges the scale of the image.

**Arabic:**
- **دقة مسح الذكاء الاصطناعي:** تنخفض دقة نموذج YOLOv8 إذا كانت الإضاءة ضعيفة أو إذا كان الطعام عبارة عن مكونات مختلطة معقدة (مثل اليخنات).
- **حدود واجهة برمجة التطبيقات (API):** الاعتماد الكبير على واجهات خارجية (Gemini) يعني أنه في حال تعطلها أو تجاوز حد الطلبات المسموح، ستتوقف ميزات الذكاء الاصطناعي مؤقتاً.
- **الاعتماد على الإدخال اليدوي:** على الرغم من مساعدة الذكاء الاصطناعي، قد يحتاج المستخدم لتعديل حجم الحصة يدوياً إذا أخطأ الذكاء الاصطناعي في تقدير حجم الصورة.

---

## 6. Future Work (العمل المستقبلي)

**English:**
- **Barcode Scanner:** Implement barcode scanning for packaged foods using open-source nutrition databases (like Open Food Facts).
- **Wearable Integration:** Connect with Apple Health and Google Fit to automatically import steps, heart rate, and burned calories.
- **Social & Gamification:** Add leaderboards, friends lists, and achievement badges to motivate users.
- **Offline Mode:** Allow users to log meals and water locally, syncing to the database once the internet connection is restored.

**Arabic:**
- **مسح الباركود:** إضافة ميزة مسح الباركود للأطعمة المعلبة باستخدام قواعد بيانات مفتوحة المصدر.
- **التكامل مع الأجهزة القابلة للارتداء:** الربط مع Apple Health و Google Fit لاستيراد الخطوات والسعرات المحروقة تلقائياً.
- **التفاعل الاجتماعي والتحفيز:** إضافة لوحات الشرف، قوائم الأصدقاء، وشارات الإنجاز لتحفيز المستخدمين.
- **وضع عدم الاتصال (Offline Mode):** السماح للمستخدمين بتسجيل وجباتهم بدون إنترنت، ومزامنتها لاحقاً عند توفر الاتصال.
