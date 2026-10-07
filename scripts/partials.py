"""Copy the shared <header> and <footer> from index.html into the other pages.

Run after editing the navigation or footer:  python3 scripts/partials.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
PAGES = {"explore.html": "/explore", "community.html": "/community", "404.html": None}

index = (ROOT / "index.html").read_text()
header = re.search(r'  <header class="site-header">.*?</header>', index, re.S).group(0)
footer = re.search(r'  <footer class="site-footer">.*?</footer>', index, re.S).group(0)
header = header.replace(' aria-current="page"', "")

for name, href in PAGES.items():
    path = ROOT / name
    page = path.read_text()
    h = header
    if href:
        h = h.replace(f'<a href="{href}">', f'<a href="{href}" aria-current="page">', 1)
    page = re.sub(r'  <header class="site-header">.*?</header>', lambda _: h, page, flags=re.S)
    page = re.sub(r'  <footer class="site-footer">.*?</footer>', lambda _: footer, page, flags=re.S)
    path.write_text(page)
    print("updated", name)
