#!/usr/bin/env python3
# ================================================================
# Generador de QR para Paola Peluquería
# Uso:
#   python3 tools/make_qr.py https://TU-SITIO.netlify.app
# Genera en qr/:
#   qr-web.png / qr-web.svg     -> raíz del sitio
#   qr-citas.png / qr-citas.svg -> /booking.html
# ================================================================
import sys, os
import segno

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://paola-peluqueria.netlify.app").rstrip("/")

OUT = os.path.join(os.path.dirname(__file__), "..", "qr")
os.makedirs(OUT, exist_ok=True)

targets = {
    "qr-web":   BASE + "/",
    "qr-citas": BASE + "/booking.html",
}

# Color cobre de la marca para la versión SVG (opcional, el PNG va en negro
# puro que es lo más fiable para escanear).
COPPER = "#C08552"

for name, url in targets.items():
    qr = segno.make(url, error="h")  # error correction alto (admite logo encima)
    png = os.path.join(OUT, name + ".png")
    svg = os.path.join(OUT, name + ".svg")
    qr.save(png, scale=20, border=4, dark="#000000", light="#FFFFFF")
    qr.save(svg, scale=20, border=4, dark="#000000", light="#FFFFFF")
    print(f"{name:9} -> {url}")
    print(f"           {png}")
    print(f"           {svg}")

print("\nURL base usada:", BASE)
