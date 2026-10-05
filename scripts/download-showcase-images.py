import json
import os
import urllib.request
import time

MANIFEST_PATH = os.path.join(os.getcwd(), "src", "data", "totemImagesManifest.json")
with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
    items = json.load(f)

# Select top items per category and color
selected = []
categories = ["countertop", "floor", "wall", "led"]

for cat in categories:
    cat_items = [it for it in items if it["category"] == cat]
    # pick up to 3 white, 3 black, 3 dual-tone
    for color in ["white", "black", "black-white"]:
        color_matches = [it for it in cat_items if it["color"] == color][:3]
        selected.extend(color_matches)

print(f"Selected {len(selected)} showcase images for download.")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

downloaded = 0
for idx, item in enumerate(selected, 1):
    local_path = os.path.join(os.getcwd(), "public", item["localPath"].lstrip("/"))
    if os.path.exists(local_path) and os.path.getsize(local_path) > 10000:
        # Already downloaded
        continue
    
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    file_id = item["id"]
    url = f"https://lh3.googleusercontent.com/d/{file_id}"
    req = urllib.request.Request(url, headers=headers)
    
    print(f"[{idx}/{len(selected)}] Downloading {item['category']} ({item['color']}): {item['title']}...")
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            with open(local_path, "wb") as out_f:
                out_f.write(content)
            downloaded += 1
            time.sleep(0.2)
    except Exception as e:
        print(f"  Failed to download {item['title']}: {e}")

print(f"\nShowcase download complete! {downloaded} new files downloaded.")
