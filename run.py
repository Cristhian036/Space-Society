#!/usr/bin/env python3
"""
SPACE SOCIETY - NISAR Hydro-Lens Runner
======================================
Script unificado para iniciar y gestionar los servicios de la aplicación:
  1. Microservicio Hidrológico (puerto 8050)
  2. Servidor Web Local (puerto 8000)
  3. Apertura automática en el navegador
  4. Cierre ordenado y limpio de procesos con Ctrl+C.
"""

import argparse
import os
import signal
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MICROSERVICE_SCRIPT = os.path.join(ROOT_DIR, "backend", "hydro_sar_microservice.py")


def wait_for_service(url, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False


def main():
    parser = argparse.ArgumentParser(description="Lanzador Space Society NISAR Hydro-Lens")
    parser.add_argument("--port", type=int, default=8000, help="Puerto del servidor web (defecto: 8000)")
    parser.add_argument("--api-port", type=int, default=8050, help="Puerto de la API hidrológica (defecto: 8050)")
    parser.add_argument("--no-browser", action="store_true", help="No abrir el navegador automáticamente")
    args = parser.parse_args()

    print("=" * 60)
    print("  🛰️ SPACE SOCIETY - NISAR Hydro-Lens")
    print("=" * 60)

    processes = []

    def shutdown(signum=None, frame=None):
        print("\n\n[INFO] Deteniendo servicios...")
        for p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("[INFO] Todos los servicios han sido detenidos correctamente.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    # 1. Start Microservice
    print(f"[1/2] Iniciando Microservicio Hidrológico en puerto {args.api_port}...")
    p_micro = subprocess.Popen(
        [sys.executable, MICROSERVICE_SCRIPT],
        cwd=ROOT_DIR
    )
    processes.append(p_micro)

    # 2. Start Web Server
    print(f"[2/2] Iniciando Servidor Web Estático en puerto {args.port}...")
    p_web = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(args.port)],
        cwd=ROOT_DIR
    )
    processes.append(p_web)

    # Verify health
    print("  -> Comprobando estado de los servicios...")
    healthy = wait_for_service(f"http://127.0.0.1:{args.api_port}/health", timeout=6)
    if healthy:
        print("  -> Microservicio online y listo.")
    else:
        print("  -> Advertencia: El microservicio tardó en responder, pero continúa iniciando.")

    web_url = f"http://localhost:{args.port}"
    pitch_url = f"http://localhost:{args.port}/pitch_deck.html"

    print("\n" + "=" * 60)
    print("  ✅ Aplicación iniciada con éxito!")
    print(f"  * Visor principal: {web_url}")
    print(f"  * Pitch Deck:      {pitch_url}")
    print(f"  * Microservicio:   http://localhost:{args.api_port}/health")
    print("=" * 60)
    print("  Presiona Ctrl+C en cualquier momento para detener todo.\n")

    if not args.no_browser:
        time.sleep(0.5)
        webbrowser.open(web_url)

    # Keep alive waiting for Ctrl+C or process exit
    try:
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"\n[ADVERTENCIA] Uno de los procesos secundarios terminó inesperadamente (código {p.returncode}).")
                    shutdown()
            time.sleep(0.5)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
