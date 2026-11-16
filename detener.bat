@echo off
setlocal
cd /d "%~dp0"
title Space Society - Detener Servicios

echo ========================================================
echo   🛑 Deteniendo servicios NISAR Hydro-Lens (8000, 8050)
echo ========================================================
echo.

powershell -NoProfile -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 8000, 8050 -State Listen -ErrorAction SilentlyContinue; " ^
    "if ($conns) { " ^
    "    $conns | ForEach-Object { " ^
    "        try { " ^
    "            $p = Get-Process -Id $_.OwningProcess -ErrorAction Stop; " ^
    "            Write-Host ('[OK] Deteniendo proceso {0} (PID {1}) en puerto {2}' -f $p.ProcessName, $p.Id, $_.LocalPort) -ForegroundColor Green; " ^
    "            Stop-Process -Id $p.Id -Force; " ^
    "        } catch { } " ^
    "    } " ^
    "} else { " ^
    "    Write-Host '[INFO] No hay procesos activos en los puertos 8000 o 8050.' -ForegroundColor Yellow; " ^
    "}"

echo.
echo Puertos liberados.
timeout /t 2 >nul
