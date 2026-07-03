import os
import json
import time
import requests
from pathlib import Path

_CACHE_FILE = Path(__file__).parent / "data" / "geocode_cache.json"

def _load_cache() -> dict:
    if _CACHE_FILE.exists():
        try:
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_cache(cache: dict) -> None:
    _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

_geocode_cache = _load_cache()

def geocode_community(community: str) -> dict:
    """
    รับชื่อชุมชน แล้วแปลงเป็น Latitude/Longitude
    คืนค่า dict รูปแบบ {"lat": float, "lng": float} หรือ None ถ้ายกเลิก/หาไม่เจอ
    """
    if not community or not str(community).strip() or str(community).lower() == "nan":
        return {
            "lat": 16.4322,
            "lng": 102.8236,
            "boundingbox": [16.4312, 16.4332, 102.8226, 102.8246]
        }
        
    community = str(community).strip()
    
    # 1. Check cache
    if community in _geocode_cache:
        return _geocode_cache[community]
    
    # 2. Add context to search
    query = f"{community} อำเภอเมืองขอนแก่น"
    
    # 3. Request Nominatim
    url = f"https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "BDI-Complain-Dashboard-App/1.0"
    }
    
    try:
        # Nominatim rate limit is 1 req/sec
        time.sleep(1) 
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            result = {
                "lat": float(data[0]["lat"]),
                "lng": float(data[0]["lon"]),
                "boundingbox": [float(x) for x in data[0].get("boundingbox", [
                    float(data[0]["lat"]) - 0.001,
                    float(data[0]["lat"]) + 0.001,
                    float(data[0]["lon"]) - 0.001,
                    float(data[0]["lon"]) + 0.001
                ])]
            }
            _geocode_cache[community] = result
            _save_cache(_geocode_cache)
            return result
        else:
            # Fallback for not found or "ไม่ระบุ"
            # Use Khon Kaen center with slight pseudo-random offset based on name length to avoid exact same point
            offset_lat = (len(community) % 10) * 0.001
            offset_lng = (sum(ord(c) for c in community) % 10) * 0.001
            
            result = {
                "lat": 16.4322 + offset_lat,
                "lng": 102.8236 + offset_lng,
                "boundingbox": [
                    16.4322 + offset_lat - 0.001,
                    16.4322 + offset_lat + 0.001,
                    102.8236 + offset_lng - 0.001,
                    102.8236 + offset_lng + 0.001
                ]
            }
            _geocode_cache[community] = result
            _save_cache(_geocode_cache)
            return result
    except Exception as e:
        print(f"Geocoding error for '{community}': {e}")
        # Return fallback even on error
        return {
            "lat": 16.4322,
            "lng": 102.8236,
            "boundingbox": [16.4312, 16.4332, 102.8226, 102.8246]
        }
