"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Navigation, Crosshair } from "lucide-react";
import dynamic from "next/dynamic";

const RoutingMap = dynamic(() => import("@/components/RoutingMap"), { 
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-50 rounded-lg"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
});

const mockRouteResult = {"tasks": [{"cid": "4496/69", "community": "\u0e28\u0e23\u0e35\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c\u0e1e\u0e31\u0e12\u0e19\u0e32", "lat": 16.431, "lng": 102.829, "priority": 3}, {"cid": "4762/69", "community": "\u0e28\u0e23\u0e35\u0e08\u0e31\u0e19\u0e17\u0e23\u0e4c\u0e1e\u0e31\u0e12\u0e19\u0e32", "lat": 16.4311, "lng": 102.8291, "priority": 3}, {"cid": "5223/69", "community": "\u0e28\u0e32\u0e25\u0e32\u0e01\u0e25\u0e32\u0e07", "lat": 16.429, "lng": 102.839, "priority": 2}], "geometry": {"coordinates": [[102.827333, 16.44295], [102.827111, 16.441605], [102.826702, 16.441641], [102.826551, 16.440816], [102.826403, 16.440004], [102.826786, 16.439934], [102.827498, 16.439836], [102.827969, 16.439776], [102.828207, 16.439743], [102.828433, 16.439711], [102.828774, 16.439667], [102.82919, 16.439605], [102.8294, 16.439574], [102.830784, 16.43934], [102.830773, 16.439276], [102.830762, 16.439207], [102.830639, 16.438643], [102.830604, 16.438485], [102.830469, 16.437937], [102.830263, 16.437132], [102.830159, 16.436728], [102.829961, 16.436002], [102.829915, 16.43582], [102.829762, 16.435304], [102.829541, 16.434452], [102.829074, 16.432741], [102.828896, 16.432129], [102.828858, 16.431996], [102.828804, 16.43181], [102.828703, 16.43134], [102.82883, 16.431318], [102.829036, 16.431295], [102.829105, 16.431287], [102.829763, 16.431202], [102.83011, 16.431144], [102.830166, 16.431134], [102.830455, 16.431091], [102.830927, 16.431036], [102.831513, 16.430937], [102.831628, 16.430922], [102.83172, 16.430909], [102.831965, 16.430883], [102.832185, 16.430856], [102.832245, 16.430848], [102.832653, 16.430796], [102.832695, 16.430791], [102.833073, 16.430743], [102.833491, 16.430689], [102.833931, 16.43063], [102.834411, 16.430567], [102.83481, 16.430514], [102.834834, 16.43051], [102.835271, 16.430455], [102.83557, 16.430417], [102.836604, 16.430285], [102.837152, 16.43021], [102.837185, 16.430205], [102.837624, 16.430145], [102.83864, 16.430005], [102.839311, 16.429913], [102.839824, 16.429842], [102.840208, 16.429789], [102.839632, 16.429003], [102.839482, 16.428743]], "type": "LineString"}, "legs": [{"distance": 1801.2, "duration": 193.1, "geometry": {"type": "LineString", "coordinates": [[102.827333, 16.44295], [102.827111, 16.441605], [102.826702, 16.441641], [102.826551, 16.440816], [102.826403, 16.440004], [102.826786, 16.439934], [102.827498, 16.439836], [102.827969, 16.439776], [102.828207, 16.439743], [102.828433, 16.439711], [102.828774, 16.439667], [102.82919, 16.439605], [102.8294, 16.439574], [102.830784, 16.43934], [102.830773, 16.439276], [102.830762, 16.439207], [102.830639, 16.438643], [102.830604, 16.438485], [102.830469, 16.437937], [102.830263, 16.437132], [102.830159, 16.436728], [102.829961, 16.436002], [102.829915, 16.43582], [102.829762, 16.435304], [102.829541, 16.434452], [102.829074, 16.432741], [102.828896, 16.432129], [102.828858, 16.431996], [102.828804, 16.43181], [102.828703, 16.43134], [102.82883, 16.431318], [102.829036, 16.431295], [102.829036, 16.431295]]}}, {"distance": 1344.4, "duration": 110.3, "geometry": {"type": "LineString", "coordinates": [[102.829036, 16.431295], [102.829105, 16.431287], [102.829763, 16.431202], [102.83011, 16.431144], [102.830166, 16.431134], [102.830455, 16.431091], [102.830927, 16.431036], [102.831513, 16.430937], [102.831628, 16.430922], [102.83172, 16.430909], [102.831965, 16.430883], [102.832185, 16.430856], [102.832245, 16.430848], [102.832653, 16.430796], [102.832695, 16.430791], [102.833073, 16.430743], [102.833491, 16.430689], [102.833931, 16.43063], [102.834411, 16.430567], [102.83481, 16.430514], [102.834834, 16.43051], [102.835271, 16.430455], [102.83557, 16.430417], [102.836604, 16.430285], [102.837152, 16.43021], [102.837185, 16.430205], [102.837624, 16.430145], [102.83864, 16.430005], [102.839311, 16.429913], [102.839824, 16.429842], [102.840208, 16.429789], [102.839632, 16.429003], [102.839482, 16.428743], [102.839482, 16.428743]]}}], "distance": 3145.6, "duration": 303.4};

export default function RoutingMockPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedCids, setSelectedCids] = useState<string[]>([]);
    const [useCurrentLocation, setUseCurrentLocation] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTasks, setIsFetchingTasks] = useState(true);
    const [routeResult, setRouteResult] = useState<any>(null);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        // Load mock tasks to match the user's image (cid 4496/69, 4762/69, 5223/69 etc.)
        const mockTasks = [
            { cid: "1523/69", text: "ท่อระบายน้ำ (ซอยสีฐาน 3)", community: "ไม่ระบุ", priority: 1, lat: null, lng: null },
            { cid: "4496/69", text: "ท่อระบายน้ำ", community: "ศรีจันทร์พัฒนา", priority: 3, lat: 16.431, lng: 102.829 },
            { cid: "4762/69", text: "ท่อระบายน้ำ", community: "ไม่ระบุ", priority: 3, lat: null, lng: null },
            { cid: "5223/69", text: "งานควบคุมการก่อสร้าง", community: "ไม่ระบุ", priority: 1, lat: null, lng: null },
        ];
        setTasks(mockTasks);
        setSelectedCids(["4496/69", "4762/69", "5223/69"]);
        setUseCurrentLocation(true);
        setIsFetchingTasks(false);
    }, []);

    useEffect(() => {
        let watchId: number;
        if (useCurrentLocation) {
            // Mock current location to match the map top-left point
            setCurrentLocation({
                lat: 16.44295,
                lng: 102.827333
            });
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

    const handleCalculateRoute = () => {
        setIsLoading(true);
        setError("");
        
        setTimeout(() => {
            setRouteResult(mockRouteResult);
            setCurrentLegIndex(0);
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)]">
            <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        Routing System
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">เลือกลำดับงานเพื่อคำนวณเส้นทาง (หน้าจำลอง)</p>
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
                            // Mock logic for unroutable based on user image
                            const isUnroutable = task.cid === "4762/69" || task.cid === "5223/69";
                            return (
                                <div 
                                    key={task.cid} 
                                    onClick={() => {
                                        if (!isUnroutable) toggleTaskSelection(task.cid);
                                    }}
                                    className={`p-3 rounded-lg border transition-colors ${
                                        isUnroutable ? "border-gray-200 bg-gray-50 opacity-60" :
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
                                                <MapPin className="w-3 h-3" /> {task.community}
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
                        disabled={isLoading || (selectedCids.length < 1)}
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
