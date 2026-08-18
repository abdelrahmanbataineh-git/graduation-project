@echo off
echo ==================================================
echo 🚀 STARTING NUTRITION PROJECT
echo ==================================================
echo.

echo Starting Backend (FastAPI)...
start "Nutrition Backend" cmd /k ".\venv\Scripts\activate && python -m uvicorn backend_api.api:app --reload"

echo Starting Frontend (Vite)...
start "Nutrition Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==================================================
echo ✅ ALL SERVICES STARTED!
echo.
echo   ➜  Frontend URL: http://localhost:5173/
echo   ➜  API Docs:     http://127.0.0.1:8000/docs
echo.
echo ==================================================
echo Note: Two new windows have been opened for the servers.
echo You can safely close this window. To stop the servers, 
echo simply close the two new popup windows.
pause
