"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Navigation, Crosshair } from "lucide-react";
import dynamic from "next/dynamic";

// โหลด RoutingMap แบบ dynamic เพื่อไม่ให้ server-side rendering พัง (เพราะ leaflet ต้องรันบน browser)
const RoutingMap = dynamic(() => import("@/components/RoutingMap"), { 
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-50 rounded-lg"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
});

export default function RoutingPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedCids, setSelectedCids] = useState<string[]>([]);
    const [useCurrentLocation, setUseCurrentLocation] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTasks, setIsFetchingTasks] = useState(true);
    const [routeResult, setRouteResult] = useState<any>(null);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [error, setError] = useState("");

    // โหลดรายการคำร้องทั้งหมดที่ยังไม่เสร็จ
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // Fetch up to 100 pending tasks for selection
                const res = await fetch("http://127.0.0.1:8000/pending-predictions?limit=100");
                const data = await res.json();
                setTasks(data.items || []);
            } catch (err) {
                console.error("Failed to load tasks", err);
                setError("ไม่สามารถโหลดรายการคำร้องได้");
            } finally {
                setIsFetchingTasks(false);
            }
        };
        fetchTasks();
    }, []);

    // ติดตามพิกัด GPS ปัจจุบันเมื่อเปิดสวิตช์ (Live Tracking)
    useEffect(() => {
        let watchId: number;
        if (useCurrentLocation) {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        setCurrentLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (err) => {
                        console.error("Geolocation error:", err);
                        setError("ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
                        setUseCurrentLocation(false);
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                setError("เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน");
                setUseCurrentLocation(false);
            }
        } else {
            setCurrentLocation(null);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [useCurrentLocation]);

    const toggleTaskSelection = (cid: string) => {
        setSelectedCids(prev => 
            prev.includes(cid) 
                ? prev.filter(id => id !== cid)
                : [...prev, cid]
        );
    };

    const handleCalculateRoute = async () => {
        if (selectedCids.length < 2 && !useCurrentLocation) {
            setError("กรุณาเลือกคำร้องอย่างน้อย 2 รายการ หรือเลือก 1 รายการพร้อมจุดเริ่มต้น (GPS)");
            return;
        }
        if (selectedCids.length < 1 && useCurrentLocation) {
            setError("กรุณาเลือกคำร้องอย่างน้อย 1 รายการ");
            return;
        }

        setError("");
        setIsLoading(true);
        setRouteResult(null);

        try {
            // ดึง admin user/token จาก localStorage
            const username = localStorage.getItem("bdi_admin_user") || "สมชาย";
            const token = localStorage.getItem("bdi_admin_token") || "dummy"; // You might need to adjust auth handling

            const payload: any = { cids: selectedCids };
            if (useCurrentLocation && currentLocation) {
                payload.start_lat = currentLocation.lat;
                payload.start_lng = currentLocation.lng;
            }

            const res = await fetch("http://127.0.0.1:8000/routing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-user": encodeURIComponent(username),
                    "x-admin-token": token
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "เกิดข้อผิดพลาดในการคำนวณเส้นทาง");
            }

            const data = await res.json();
            setRouteResult(data);
            setCurrentLegIndex(0);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "ไม่สามารถคำนวณเส้นทางได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)]">
            {/* Sidebar: เลือกคำร้อง */}
            <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        Routing System
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">เลือกลำดับงานเพื่อคำนวณเส้นทาง</p>
                </div>

                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded"
                            checked={useCurrentLocation}
                            onChange={(e) => setUseCurrentLocation(e.target.checked)}
                        />
                        <Crosshair className="w-4 h-4 text-gray-500" />
                        เริ่มจากตำแหน่งปัจจุบัน
                    </label>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        เลือกแล้ว {selectedCids.length} จุด
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isFetchingTasks ? (
                        <div className="flex justify-center items-center h-20 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            ไม่พบคำร้องที่รอดำเนินการ
                        </div>
                    ) : (
                        tasks.map((task) => {
                            const isUnroutable = !task.community || task.community.toLowerCase() === "nan" || task.community === "ไม่ระบุ";
                            return (
                                <div 
                                    key={task.cid} 
                                    onClick={() => {
                                        if (!isUnroutable) toggleTaskSelection(task.cid);
                                    }}
                                    className={`p-3 rounded-lg border transition-colors ${
                                        isUnroutable ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed" :
                                        selectedCids.includes(task.cid) 
                                            ? "border-blue-500 bg-blue-50 cursor-pointer" 
                                            : "border-gray-200 hover:border-gray-300 cursor-pointer"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 w-4 h-4 text-blue-600 rounded disabled:opacity-50"
                                            checked={selectedCids.includes(task.cid)}
                                            disabled={isUnroutable}
                                            readOnly
                                        />
                                        <div>
                                            <div className="font-semibold text-sm flex items-center gap-2">
                                                คำร้อง #{task.cid}
                                                {isUnroutable && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-normal">
                                                        จัดเส้นทางไม่ได้
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{task.text}</div>
                                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" /> {task.community && task.community.toLowerCase() !== "nan" ? task.community : "ไม่ระบุชุมชน"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button 
                        onClick={handleCalculateRoute}
                        disabled={isLoading || (selectedCids.length < 2 && !useCurrentLocation)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังคำนวณ...</>
                        ) : (
                            "คำนวณเส้นทาง"
                        )}
                    </button>
                    {error && <div className="mt-3 text-red-500 text-sm text-center">{error}</div>}
                </div>
            </div>

            {/* แผนที่และระบบนำทาง */}
            <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {routeResult && routeResult.legs && (
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-blue-900">
                                {currentLegIndex < routeResult.legs.length 
                                    ? `กำลังเดินทางไปยังจุดที่ ${currentLegIndex + 1}` 
                                    : "สิ้นสุดการเดินทาง"}
                            </h3>
                            <p className="text-sm text-blue-700">
                                {currentLegIndex < routeResult.legs.length 
                                    ? `ระยะทาง: ${(routeResult.legs[currentLegIndex].distance / 1000).toFixed(2)} กม. | เวลาโดยประมาณ: ${Math.round(routeResult.legs[currentLegIndex].duration / 60)} นาที`
                                    : "เดินทางครบทุกจุดแล้ว"}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentLegIndex(Math.max(0, currentLegIndex - 1))}
                                disabled={currentLegIndex === 0}
                                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                ถอยกลับ
                            </button>
                            <button 
                                onClick={() => setCurrentLegIndex(Math.min(routeResult.legs.length, currentLegIndex + 1))}
                                disabled={currentLegIndex >= routeResult.legs.length}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                                <MapPin className="w-4 h-4" />
                                มาถึงจุดนี้แล้ว
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex-1">
                    <RoutingMap 
                        routeResult={routeResult} 
                        currentLocation={useCurrentLocation ? currentLocation : null} 
                        currentLegIndex={currentLegIndex}
                    />
                </div>
            </div>
        </div>
    );
}
