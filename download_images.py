import json
import os
import urllib.request
import urllib.parse
import ssl
import time
from concurrent.futures import ThreadPoolExecutor

# Ignore SSL certificate errors on macOS
ssl._create_default_https_context = ssl._create_unverified_context

def download_image(player_name):
    try:
        # Step 1: Search Wikipedia for the exact page title
        search_query = urllib.parse.quote(player_name + " cricketer")
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={search_query}&utf8=&format=json"
        
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            search_data = json.loads(response.read())
            
        if not search_data['query']['search']:
            print(f"No Wikipedia page found for: {player_name}")
            return
            
        title = search_data['query']['search'][0]['title']
        
        # Step 2: Get the main image thumbnail for the page
        title_encoded = urllib.parse.quote(title)
        img_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={title_encoded}&prop=pageimages&format=json&pithumbsize=300"
        
        req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            img_data = json.loads(response.read())
            
        pages = img_data['query']['pages']
        page_id = list(pages.keys())[0]
        
        if page_id == "-1" or "thumbnail" not in pages[page_id]:
            print(f"No image found on Wikipedia for: {player_name}")
            return
            
        image_source = pages[page_id]['thumbnail']['source']
        
        # Step 3: Download the image
        img_path = os.path.join("assets", "players", f"{player_name}.jpg")
        
        req = urllib.request.Request(image_source, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(img_path, 'wb') as out_file:
                out_file.write(response.read())
                
        print(f"Downloaded: {player_name}")
    except Exception as e:
        print(f"Error downloading {player_name}: {e}")

def main():
    os.makedirs(os.path.join("assets", "players"), exist_ok=True)
    
    try:
        with open("data.json", "r") as f:
            players = json.load(f)
    except Exception as e:
        print("Failed to read data.json:", e)
        return
        
    names = [p["name"] for p in players]
    print(f"Found {len(names)} players. Starting download...")
    
    # Download concurrently
    with ThreadPoolExecutor(max_workers=10) as executor:
        executor.map(download_image, names)
        
    print("Download complete!")

if __name__ == "__main__":
    main()
