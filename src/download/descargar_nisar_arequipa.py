#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
  Script Oficial de Descarga de Archivos Científicos NISAR L2 GCOV (.h5)
  Zona: Región Arequipa (Perú) | Período: Últimos 6 meses
  Colección: NISAR_L2_GCOV_PROVISIONAL_V1 (Release P05023)
================================================================================
"""

import argparse
import getpass
import json
import os
from pathlib import Path
import sys
import time
import requests

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CATALOG_PATH = ROOT_DIR / "AREQUIPA_NISAR_H5_ULTIMOS_6_MESES.json"

ZONE_ALIASES = {
    "chili": "Arequipa Centro / Río Chili / Uchumayo / Yura",
    "arequipa": "Arequipa Centro / Río Chili / Uchumayo / Yura",
    "camana": "Camaná / Valle de Majes / Quilca",
    "majes": "Majes / La Joya / Siguas / Santa Rita",
    "misti": "Arequipa Oriental / Misti / Chiguata / Tambo Alto",
    "tambo": "Arequipa Oriental / Misti / Chiguata / Tambo Alto",
    "ocona": "Ocoña / Caravelí / Camaná Oeste",
    "caraveli": "Ocoña / Caravelí / Camaná Oeste",
    "costa": "Costa Occidental / Atico / Chala / Ocoña",
    "atico": "Costa Occidental / Atico / Chala / Ocoña",
    "nazca": "Límite Occidental Caravelí / Nazca",
    "all": "all"
}


class EarthdataSession(requests.Session):
    AUTH_HOST = 'urs.earthdata.nasa.gov'

    def __init__(self, username=None, password=None, token=None):
        super().__init__()
        self.username = username
        self.password = password
        self.token = token
        self.headers.update({"User-Agent": "NASA-NISAR-Downloader/1.0 (Earthdata-Python)"})

    def rebuild_auth(self, prepared_request, response):
        headers = prepared_request.headers
        url = prepared_request.url
        parsed = requests.utils.urlparse(url)

        if parsed.hostname == self.AUTH_HOST:
            if self.token:
                prepared_request.headers['Authorization'] = f'Bearer {self.token}'
            elif self.username and self.password:
                prepared_request.headers['Authorization'] = requests.auth._basic_auth_str(
                    self.username, self.password
                )


def load_catalog():
    if not CATALOG_PATH.exists():
        print(f"[-] Error: No se encontró el catálogo en: {CATALOG_PATH}")
        sys.exit(1)
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_netrc_credentials():
    netrc_file = Path.home() / ("_netrc" if sys.platform == "win32" else ".netrc")
    if netrc_file.exists():
        try:
            with open(netrc_file, "r") as f:
                lines = f.read().split()
                if "urs.earthdata.nasa.gov" in lines:
                    idx = lines.index("urs.earthdata.nasa.gov")
                    user = lines[lines.index("login", idx) + 1]
                    pwd = lines[lines.index("password", idx) + 1]
                    return user, pwd
        except Exception:
            pass
    return None, None


def download_h5_file(session, url, dest_path, expected_size_mb=None):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")
    filename = dest_path.name

    if dest_path.exists():
        current_size_mb = dest_path.stat().st_size / (1024 * 1024)
        if expected_size_mb and abs(current_size_mb - expected_size_mb) < 5:
            print(f"  [✓] Ya descargado: {filename} ({current_size_mb:.1f} MB)")
            return True
        elif current_size_mb > 500:
            print(f"  [✓] Ya existe: {filename} ({current_size_mb:.1f} MB)")
            return True

    downloaded_bytes = 0
    headers = {}
    if temp_path.exists():
        downloaded_bytes = temp_path.stat().st_size
        headers['Range'] = f'bytes={downloaded_bytes}-'
        print(f"  [↻] Reanudando {filename} desde {downloaded_bytes / (1024*1024):.1f} MB...")
    else:
        print(f"  [↓] Descargando {filename}...")

    try:
        with session.get(url, stream=True, headers=headers, timeout=30) as r:
            if r.status_code in (401, 403):
                print(f"  [-] Error {r.status_code}: Credenciales de Earthdata Login inválidas o no autorizadas.")
                return False
            
            content_type = r.headers.get('Content-Type', '')
            if 'html' in content_type.lower():
                print(f"  [-] Error: La respuesta es una página web (HTML), posible fallo de autorización.")
                return False

            total_size = int(r.headers.get('Content-Length', 0))
            if r.status_code == 206:
                total_size += downloaded_bytes
            elif r.status_code == 200:
                downloaded_bytes = 0
                temp_mode = 'wb'
            else:
                r.raise_for_status()

            temp_mode = 'ab' if downloaded_bytes > 0 else 'wb'
            chunk_size = 1024 * 1024
            start_time = time.time()
            bytes_since_start = 0

            with open(temp_path, temp_mode) as f:
                for chunk in r.iter_content(chunk_size=chunk_size):
                    if not chunk:
                        continue
                    f.write(chunk)
                    downloaded_bytes += len(chunk)
                    bytes_since_start += len(chunk)

                    elapsed = time.time() - start_time
                    speed_mb_s = (bytes_since_start / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    percent = (downloaded_bytes / total_size * 100) if total_size > 0 else 0
                    mb_down = downloaded_bytes / (1024 * 1024)
                    mb_tot = total_size / (1024 * 1024)

                    print(f"\r      {percent:5.1f}% [{mb_down:7.1f} / {mb_tot:7.1f} MB] @ {speed_mb_s:5.1f} MB/s", end="", flush=True)

            print()
            temp_path.rename(dest_path)
            print(f"  [+] Guardado exitoso: {dest_path}")
            return True

    except KeyboardInterrupt:
        print(f"\n  [!] Descarga pausada por el usuario. El progreso parcial se guardó en {temp_path.name}")
        sys.exit(0)
    except Exception as e:
        print(f"\n  [-] Error durante la descarga: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Descargador de escenas científicas NISAR L2 GCOV HDF5 (.h5) para Arequipa"
    )
    parser.add_argument("--list", action="store_true", help="Listar las zonas y archivos disponibles")
    parser.add_argument("--zone", type=str, default="chili",
                        help="Zona a descargar: 'chili', 'camana', 'majes', 'misti', 'ocona', 'all' (defecto: chili)")
    parser.add_argument("--date", type=str, default="",
                        help="Filtrar por fecha específica (ej: 2026-10-15 o 2026-10)")
    parser.add_argument("--dest", type=str, default="data/nisar",
                        help="Carpeta destino de los archivos .h5 (defecto: data/nisar)")
    parser.add_argument("--export-txt", type=str, default="",
                        help="Exportar lista de URLs a un archivo de texto (para wget, curl o aria2c)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Mostrar archivos seleccionados sin realizar descargas")
    parser.add_argument("--user", type=str, default="", help="Usuario NASA Earthdata Login")
    parser.add_argument("--password", type=str, default="", help="Contraseña NASA Earthdata Login")
    parser.add_argument("--token", type=str, default="", help="Token Bearer de NASA Earthdata")

    args = parser.parse_args()
    catalog = load_catalog()

    if args.list:
        print("=" * 80)
        print("  CATÁLOGO NISAR L2 GCOV (.h5) - ÚLTIMOS 6 MESES - AREQUIPA")
        print("=" * 80)
        counts = {}
        for item in catalog:
            z = item["zone"]
            counts[z] = counts.get(z, 0) + 1
        for z, c in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  • {z}: {c} escenas")
        print(f"\nTotal general: {len(catalog)} archivos científicos .h5")
        return

    z_key = args.zone.lower().strip()
    if z_key != "all":
        resolved_zone = ZONE_ALIASES.get(z_key)
        if resolved_zone:
            items = [item for item in catalog if item["zone"] == resolved_zone]
        else:
            items = [item for item in catalog if z_key in item["zone"].lower()]
    else:
        items = catalog

    if args.date:
        items = [item for item in items if item["date"].startswith(args.date)]

    if not items:
        print(f"[-] No se encontraron escenas con el filtro indicado (zona='{args.zone}', date='{args.date}')")
        return

    total_gb = sum(i["size_mb"] for i in items) / 1024.0
    print(f"\n[+] Escenas seleccionadas: {len(items)} archivos .h5 (~{total_gb:.2f} GB)")
    print(f"    Zona: {args.zone.upper()} | Destino: {args.dest}\n")

    if args.export_txt:
        txt_path = Path(args.export_txt)
        with open(txt_path, "w", encoding="utf-8") as tf:
            for item in items:
                tf.write(f"{item['h5_url']}\n")
        print(f"[+] Lista de URLs exportada a: {txt_path.resolve()}")
        if not args.dry_run and not args.user:
            return

    for idx, item in enumerate(items, 1):
        print(f"  {idx:2d}. {item['date']} | Track {item['track']} Frame {item['frame']} | {item['granule_id']} ({item['size_mb']:.1f} MB)")

    if args.dry_run:
        print("\n[i] Modo --dry-run activado. No se descargó ningún archivo.")
        return

    user = args.user or os.environ.get("EARTHDATA_USER")
    pwd = args.password or os.environ.get("EARTHDATA_PASSWORD")
    token = args.token or os.environ.get("EARTHDATA_TOKEN")

    if not (user and pwd) and not token:
        net_u, net_p = get_netrc_credentials()
        if net_u and net_p:
            user, pwd = net_u, net_p
            print("[i] Credenciales de Earthdata cargadas desde archivo .netrc.")

    if not (user and pwd) and not token:
        print("\n" + "=" * 70)
        print("  AUTENTICACIÓN REQUERIDA (NASA Earthdata Login)")
        print("  Registro gratuito en: https://urs.earthdata.nasa.gov/")
        print("=" * 70)
        user = input("Usuario Earthdata: ").strip()
        pwd = getpass.getpass("Contraseña: ").strip()

    session = EarthdataSession(username=user, password=pwd, token=token)
    dest_dir = Path(args.dest)

    print(f"\n[+] Iniciando descarga de {len(items)} gránulos...")
    exitos = 0
    for i, item in enumerate(items, 1):
        print(f"\n[{i}/{len(items)}] {item['date']} - Track {item['track']} Frame {item['frame']}")
        url = item["h5_url"]
        fname = Path(requests.utils.urlparse(url).path).name
        target = dest_dir / fname
        if download_h5_file(session, url, target, expected_size_mb=item.get("size_mb")):
            exitos += 1

    print(f"\n[+] Proceso finalizado: {exitos}/{len(items)} gránulos listos en '{dest_dir}'.")


if __name__ == "__main__":
    main()
