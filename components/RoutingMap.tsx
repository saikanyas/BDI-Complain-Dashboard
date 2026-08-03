"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface RoutingTask {
    cid: string;
    community: string;
    lat: number;
    lng: number;
    priority?: number;
    boundingbox?: [number, number, number, number];
}

interface GroupedRoutingTask extends RoutingTask {
    originalIndex: number;
}

interface RoutingGeometry {
    type: string;
    coordinates: [number, number][];
}

interface RoutingLeg {
    distance: number;
    duration: number;
    geometry?: RoutingGeometry;
}

export interface RoutingRouteResult {
    tasks: RoutingTask[];
    geometry?: RoutingGeometry;
    legs: RoutingLeg[];
    distance: number;
    duration: number;
    error?: string;
}

// Fix Leaflet's default icon path issues in Next.js
const defaultIconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon สำหรับมาร์คเกอร์ที่มีตัวเลข (ลำดับ)
const createNumberedIcon = (number: number | string, color = "#2563eb") => {
    return L.divIcon({
        className: "custom-numbered-icon",
        html: `
            <div style="
                background-color: ${color};
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">
                ${number}
            </div>
            <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${color};
                margin: 0 auto;
                margin-top: -2px;
            "></div>
        `,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -40]
    });
};

const gpsIcon = L.divIcon({
    className: "gps-icon",
    html: `
        <div style="
            background-color: #ef4444;
            color: white;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
        "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});


function ChangeView({ bounds }: { bounds: L.LatLngBounds | null }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}


// คำนวณหาระยะที่ใกล้ที่สุดจากจุด (p) ไปยังเส้นตรง (v-w)
function getDistanceToSegment(p: {lat: number, lng: number}, v: {lat: number, lng: number}, w: {lat: number, lng: number}) {
    const l2 = (v.lat - w.lat) ** 2 + (v.lng - w.lng) ** 2;
    if (l2 === 0) return { dist2: (p.lat - v.lat) ** 2 + (p.lng - v.lng) ** 2, point: [v.lat, v.lng] as [number, number] };
    
    let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
    t = Math.max(0, Math.min(1, t));
    
    const projLat = v.lat + t * (w.lat - v.lat);
    const projLng = v.lng + t * (w.lng - v.lng);
    
    return {
        dist2: (p.lat - projLat) ** 2 + (p.lng - projLng) ** 2,
        point: [projLat, projLng] as [number, number]
    };
}

interface RoutingMapProps {
    routeResult: RoutingRouteResult | null;
    currentLocation: {lat: number, lng: number} | null;
    currentLegIndex?: number;
}

export default function RoutingMap({ routeResult, currentLocation, currentLegIndex = 0 }: RoutingMapProps) {
    const mapCenter = { lat: 16.4322, lng: 102.8236 }; // ศูนย์กลางอำเภอเมืองขอนแก่น
    
    // แปลง GeoJSON geometry (LineString: [[lng, lat], ...]) กลับเป็นรูปแบบที่ Leaflet Polyline ใช้ ([[lat, lng], ...])
    let routeCoords: [number, number][] = [];
    let bounds: L.LatLngBounds | null = null;
    
    if (routeResult && routeResult.geometry) {
        routeCoords = routeResult.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]);
        if (routeCoords.length > 0) {
            bounds = L.latLngBounds(routeCoords);
        }
    } else if (currentLocation) {
        bounds = L.latLngBounds([[currentLocation.lat, currentLocation.lng]]);
    }

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ width: "100%", height: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* วาดเส้นทางแบบแยก Leg */}
                {routeResult && routeResult.legs ? (
                    routeResult.legs.map((leg, idx) => {
                        if (idx < currentLegIndex) return null; // ซ่อนเส้นทางที่ผ่านไปแล้วตามที่ผู้ใช้ต้องการ
                        
                        if (!leg.geometry || !leg.geometry.coordinates) return null;
                        
                        let legCoords: [number, number][] = leg.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]);
                        const isActive = idx === currentLegIndex;
                        
                        // ถ้านี่คือเส้นทางปัจจุบันที่กำลังไป และมีพิกัด GPS -> ให้หั่นท่อนที่เดินผ่านมาแล้วทิ้ง
                        if (isActive && currentLocation && legCoords.length > 1) {
                            let minDist2 = Infinity;
                            let closestSegIndex = 0;
                            let projectedPoint: [number, number] = legCoords[0];
                            
                            for (let i = 0; i < legCoords.length - 1; i++) {
                                const v = { lat: legCoords[i][0], lng: legCoords[i][1] };
                                const w = { lat: legCoords[i+1][0], lng: legCoords[i+1][1] };
                                
                                const res = getDistanceToSegment(currentLocation, v, w);
                                if (res.dist2 < minDist2) {
                                    minDist2 = res.dist2;
                                    closestSegIndex = i;
                                    projectedPoint = res.point;
                                }
                            }
                            
                            // วาดเส้นทางเฉพาะจุดที่ยังไม่ถึง (หั่นอดีตทิ้ง)
                            // เริ่มจากจุดปัจจุบัน (projectedPoint) แล้วต่อด้วยจุดที่เหลือของเส้น
                            legCoords = [projectedPoint, ...legCoords.slice(closestSegIndex + 1)];
                        }
                        
                        return (
                            <div key={`leg-container-${idx}`}>
                                {!isActive && (
                                    <Polyline 
                                        positions={legCoords}  
                                        color="#d1d5db" 
                                        weight={6}
                                        opacity={0.8}
                                    />
                                )}
                                <Polyline 
                                    key={`leg-${idx}`}
                                    positions={legCoords}  
                                    color={isActive ? "#2563eb" : "#f97316"} // น้ำเงินสำหรับ active, ส้มสำหรับอนาคต
                                    weight={isActive ? 6 : 4}
                                    opacity={isActive ? 0.9 : 0.8}
                                    dashArray={isActive ? undefined : "8, 8"} // เส้นประสำหรับอนาคต
                                />
                            </div>
                        );
                    })
                ) : routeCoords.length > 0 && (
                    /* Fallback เผื่อไม่มี legs */
                    <Polyline 
                        positions={routeCoords} 
                        color="#3b82f6" 
                        weight={5}
                        opacity={0.7}
                    />
                )}
                
                {/* จุด GPS ปัจจุบัน */}
                {currentLocation && (
                    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={gpsIcon}>
                        <Popup>ตำแหน่งปัจจุบันของคุณ</Popup>
                    </Marker>
                )}
                
                {/* จัดกลุ่มและวาด Bounding Box (วาดแค่ 1 กล่องต่อ 1 พื้นที่เพื่อไม่ให้ซ้อนกันหรือเบี้ยว) */}
                {routeResult && routeResult.tasks && (() => {
                    const groups: Record<string, GroupedRoutingTask[]> = {};
                    
                    // จัดกลุ่ม task ตามชุมชน
                    routeResult.tasks.forEach((task, idx) => {
                        const comm = task.community || "unknown";
                        if (!groups[comm]) groups[comm] = [];
                        groups[comm].push({ ...task, originalIndex: idx });
                    });
                    
                    return Object.entries(groups).map(([comm, tasksInGroup]) => {
                        // หาสีที่มีความสำคัญสูงสุดในกลุ่ม
                        const maxPriority = Math.max(...tasksInGroup.map(t => t.priority || 1));
                        const priorityColor = maxPriority === 3 ? "#ef4444" : maxPriority === 2 ? "#eab308" : "#22c55e";
                        
                        let bboxElement = null;
                        const firstTask = tasksInGroup[0];
                        if (firstTask.boundingbox && firstTask.boundingbox.length === 4 && comm !== "unknown") {
                            const latMin = firstTask.boundingbox[0];
                            const latMax = firstTask.boundingbox[1];
                            const lonMin = firstTask.boundingbox[2];
                            const lonMax = firstTask.boundingbox[3];
                            const rectBounds: [[number, number], [number, number]] = [[latMin, lonMin], [latMax, lonMax]];
                            bboxElement = (
                                <Rectangle 
                                    bounds={rectBounds} 
                                    pathOptions={{ color: priorityColor, weight: 2, fillOpacity: 0.05, dashArray: "4" }} 
                                />
                            );
                        }
                        
                        // ถลุ่มเดียวกันมีหลายจุด วาดพื้นหลังเชื่อมให้เห็นชัดเจน
                        let groupConnector = null;
                        if (tasksInGroup.length > 1) {
                            // วาดเส้นเชื่อมให้เห็นกลุ่มจุดที่อยู่ในพื้นที่เดียวกัน
                            const connectCoords: [number, number][] = tasksInGroup.map(t => [t.lat, t.lng]);
                            groupConnector = (
                                <Polyline 
                                    positions={connectCoords}
                                    color={priorityColor}
                                    weight={20}
                                    opacity={0.2}
                                    lineCap="round"
                                    lineJoin="round"
                                />
                            );
                        }
                        
                        return (
                            <div key={`group-${comm}`}>
                                {bboxElement}
                                {groupConnector}
                                {tasksInGroup.map(task => {
                                    const tColor = task.priority === 3 ? "#ef4444" : task.priority === 2 ? "#eab308" : "#22c55e";
                                    const pText = task.priority === 3 ? "สูง" : task.priority === 2 ? "ปานกลาง" : "ต่ำ";
                                    return (
                                        <Marker 
                                            key={`task-${task.cid}-${task.originalIndex}`}
                                            position={[task.lat, task.lng]}
                                            icon={createNumberedIcon(task.originalIndex + 1, tColor)}
                                        >
                                            <Popup>
                                                <div className="p-1">
                                                    <h3 className="font-bold text-blue-800">จุดที่ {task.originalIndex + 1} (คำร้อง #{task.cid})</h3>
                                                    <p className="text-sm font-semibold mt-1 mb-1 bg-gray-100 p-1 rounded inline-block">{task.community}</p>
                                                    {tasksInGroup.length > 1 && (
                                                        <p className="text-xs text-orange-600 font-semibold mb-1">* อยู่ในพื้นที่เดียวกับจุดอื่นอีก {tasksInGroup.length - 1} จุด</p>
                                                    )}
                                                    <div className="text-sm mt-1">
                                                        <span className="font-semibold text-gray-700">ความสำคัญ: </span>
                                                        <span style={{color: tColor, fontWeight: 'bold'}}>{pText}</span>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </div>
                        );
                    });
                })()}
                
                <ChangeView bounds={bounds} />
            </MapContainer>
            
            {/* กล่องแสดงรายละเอียดสรุป */}
            {routeResult && !routeResult.error && (
                <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-[1000] max-w-xs">
                    <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">สรุปเส้นทาง</h3>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">ระยะทางรวม:</span>
                        <span className="font-semibold">{(routeResult.distance / 1000).toFixed(2)} กม.</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">เวลาโดยประมาณ:</span>
                        <span className="font-semibold">{Math.round(routeResult.duration / 60)} นาที</span>
                    </div>
                </div>
            )}
        </div>
    );
}
