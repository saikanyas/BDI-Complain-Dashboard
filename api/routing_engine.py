import pandas as pd
import requests
from typing import List, Dict, Any
from geocoding import geocode_community
from pathlib import Path

def resolve_priority(cids: List[str]) -> Dict[str, int]:
    """
    รับรายการรหัสคำร้อง (CID) และคืนค่า dict ที่เก็บความสำคัญของแต่ละคำร้อง
    (3 = สูงสุด, 2 = กลาง, 1 = ต่ำ)
    """
    try:
        # Load result.xlsx which contains the priority for all complaints
        result_path = Path(__file__).parent.parent / "models" / "result.xlsx"
        if not result_path.exists():
            return {cid: 1 for cid in cids}
            
        df = pd.read_excel(result_path)
        # We need to match 'เลขคำร้อง' with cid
        df['เลขคำร้อง'] = df['เลขคำร้อง'].astype(str)
        
        # Filter only what we need
        filtered = df[df['เลขคำร้อง'].isin(cids)]
        
        priority_map = {}
        for _, row in filtered.iterrows():
            cid = str(row['เลขคำร้อง'])
            code = 1
            if 'predicted_priority_code' in df.columns:
                try:
                    code = int(row['predicted_priority_code'])
                except (ValueError, TypeError):
                    pass
            priority_map[cid] = code
            
        # Default priority 1 if not found
        for cid in cids:
            if cid not in priority_map:
                priority_map[cid] = 1
                
        return priority_map
    except Exception as e:
        print(f"Error resolving priority: {e}")
        return {cid: 1 for cid in cids}

def calculate_route(tasks: List[Dict[str, Any]], start_point: Dict[str, float] = None) -> Dict[str, Any]:
    """
    tasks: [{"cid": "1/63", "community": "ดอนหญ้านาง 3", ...}]
    start_point: {"lat": float, "lng": float} (optional)
    """
    if not tasks:
        return {"error": "No tasks provided"}

    # 1. Geocode all tasks
    locations = []
    cids = []
    for t in tasks:
        loc = geocode_community(t.get("community", ""))
        if loc:
            locations.append({"lat": loc["lat"], "lng": loc["lng"], "boundingbox": loc.get("boundingbox"), "cid": t["cid"], "community": t.get("community", "")})
            cids.append(t["cid"])
            
    if not locations:
        return {"error": "Could not geocode any tasks"}

    # 2. Get Priority map
    priority_map = resolve_priority(cids)
    
    # Add priority to locations
    for loc in locations:
        loc["priority"] = priority_map.get(loc["cid"], 1)

    # We will format points for OSRM
    # Group by identical coordinates to avoid TSP splitting identical points
    group_map = {}
    for loc in locations:
        key = (round(loc["lat"], 6), round(loc["lng"], 6))
        if key not in group_map:
            group_map[key] = []
        group_map[key].append(loc)
        
    unique_locations = [g[0] for g in group_map.values()]
    
    coords_list = []
    
    if start_point:
        coords_list.append(f"{start_point['lng']},{start_point['lat']}")
        
    for loc in unique_locations:
        coords_list.append(f"{loc['lng']},{loc['lat']}")
        
    if len(coords_list) < 2:
        return {"error": "Need at least 2 points (including start) to route"}

    # 3. Call OSRM Trip API (for ordering only, no steps since it conflicts with roundtrip=false)
    coords_str = ";".join(coords_list)
    base_url_trip = f"http://router.project-osrm.org/trip/v1/driving/{coords_str}"
    params_trip = {
        "roundtrip": "false",
        "geometries": "geojson",
        "overview": "full",
        "source": "first",
        "destination": "any"
    }
        
    try:
        response = requests.get(base_url_trip, params=params_trip, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != "Ok":
            return {"error": f"OSRM trip routing failed: {data.get('code')}"}
            
        waypoints = data.get("waypoints", [])
        
        # Sort locations based on waypoint order
        sorted_unique = []
        
        # Enumerate to keep track of original index before sorting
        for idx, wp in enumerate(waypoints):
            wp["original_index"] = idx
            
        # Map waypoint index back to our unique_locations list
        for wp in sorted(waypoints, key=lambda x: x["waypoint_index"]):
            original_idx = wp["original_index"]
            # original_idx corresponds to index in coords_list
            if start_point:
                if original_idx == 0:
                    continue # Skip start point in tasks list
                loc = unique_locations[original_idx - 1]
            else:
                loc = unique_locations[original_idx]
                
            sorted_unique.append(loc)
            
        # 4. Expand unique locations back to original groups and apply offset
        final_tasks = []
        for rep_loc in sorted_unique:
            key = (round(rep_loc["lat"], 6), round(rep_loc["lng"], 6))
            group = group_map[key]
            # Sort group by priority descending
            group.sort(key=lambda x: x["priority"], reverse=True)
            
            # Anti-overlap logic (Offset markers side-by-side)
            n = len(group)
            if n > 1:
                step = 0.00015 # Approx 15 meters
                start_offset = - (n - 1) * step / 2
                for i, t in enumerate(group):
                    t["lng"] += (start_offset + i * step)
                    
            final_tasks.extend(group)
            
        # 5. Call OSRM Route API with sorted coordinates to get steps
        sorted_coords = []
        if start_point:
            sorted_coords.append(f"{start_point['lng']},{start_point['lat']}")
        for loc in final_tasks:
            sorted_coords.append(f"{loc['lng']},{loc['lat']}")
            
        route_str = ";".join(sorted_coords)
        base_url_route = f"http://router.project-osrm.org/route/v1/driving/{route_str}"
        params_route = {
            "geometries": "geojson",
            "overview": "full",
            "steps": "true"
        }
        
        route_res = requests.get(base_url_route, params=params_route, timeout=10)
        route_res.raise_for_status()
        route_data = route_res.json()
        
        if route_data.get("code") != "Ok" or not route_data.get("routes"):
            return {"error": f"OSRM route detailed failed: {route_data.get('code')}"}
            
        route = route_data["routes"][0]
        
        # 6. Extract Legs and combine step geometries
        legs_data = []
        for leg in route.get("legs", []):
            leg_coords = []
            for step in leg.get("steps", []):
                coords = step.get("geometry", {}).get("coordinates", [])
                if coords:
                    if not leg_coords:
                        leg_coords.extend(coords)
                    else:
                        leg_coords.extend(coords[1:])
            
            legs_data.append({
                "distance": leg.get("distance", 0),
                "duration": leg.get("duration", 0),
                "geometry": {
                    "type": "LineString",
                    "coordinates": leg_coords
                } if leg_coords else None
            })

        return {
            "tasks": final_tasks,
            "geometry": route.get("geometry"),
            "legs": legs_data,
            "distance": route.get("distance", 0), # in meters
            "duration": route.get("duration", 0)  # in seconds
        }
        
    except Exception as e:
        print(f"Routing engine error: {e}")
        return {"error": str(e)}
