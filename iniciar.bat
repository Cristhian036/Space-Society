@echo off
setlocal
cd /d "%~dp0"
title Space Society - NISAR Hydro-Lens (Arequipa)

echo ========================================================
echo   🛰️ SPACE SOCIETY - NISAR Hydro-Lens Launcher
echo ========================================================
echo.

:: Check Python installation
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se encontro Python en el PATH.
    echo Por favor instala Python 3.10+ y asegurate de marcar "Add Python to PATH".
    pause
    exit /b 1
)

:: Check required packages
python -c "import numpy, scipy, rasterio, PIL" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Faltan algunas dependencias. Instalando requirements.txt...
    python -m pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo [ADVERTENCIA] Hubo advertencias durante la instalacion de paquetes.
    )
)

echo [1/2] Iniciando Microservicio Hidrologico (Puerto 8050)...
start "NISAR Microservicio (8050)" cmd /k "cd /d "%~dp0" && python backend/hydro_sar_microservice.py"

echo [2/2] Iniciando Servidor Web Local (Puerto 8000)...
start "NISAR Servidor Web (8000)" cmd /k "cd /d "%~dp0" && python -m http.server 8000"

echo.
echo Esperando a que los servicios inicien...
timeout /t 2 >nul

echo Abriendo el visor en tu navegador predeterminado...
start http://localhost:8000

echo.
echo ========================================================
echo   ✅ Aplicacion iniciada correctamente!
echo.
echo   * Visor principal: http://localhost:8000
echo   * Pitch Deck:      http://localhost:8000/pitch_deck.html
echo   * Microservicio:   http://localhost:8050/health
echo.
echo   Para detener los servicios, simplemente cierra las
echo   ventanas de terminal auxiliares o ejecuta detener.bat
echo ========================================================
echo.
pause
