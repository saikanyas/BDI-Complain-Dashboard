"use client";

import { useState } from "react";
import { Loader2, MapPin, Navigation, Crosshair } from "lucide-react";
import dynamic from "next/dynamic";

const RoutingMap = dynamic(() => import("@/components/RoutingMap"), { 
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gray-50 rounded-lg"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
});

interface MockTask {
    cid: string;
    text: string;
    community: string;
    priority: number;
    lat: number | null;
    lng: number | null;
}

interface RouteTask {
    cid: string;
    community: string;
    lat: number;
    lng: number;
    priority: number;
}

interface RouteGeometry {
    type: string;
    coordinates: [number, number][];
}

interface RouteLeg {
    distance: number;
    duration: number;
    geometry: RouteGeometry;
}

interface RouteResult {
    tasks: RouteTask[];
    geometry: RouteGeometry;
    legs: RouteLeg[];
    distance: number;
    duration: number;
}

const mockRouteResult: RouteResult = {
    tasks: [
        { cid: "MOCK-001", community: "ชุมชนจำลอง 01", lat: 0.001, lng: 0.001, priority: 3 },
        { cid: "MOCK-002", community: "ชุมชนจำลอง 01", lat: 0.0012, lng: 0.0011, priority: 2 },
        { cid: "MOCK-003", community: "ชุมชนจำลอง 02", lat: 0.002, lng: 0.0015, priority: 1 },
    ],
    geometry: {
        coordinates: [[0, 0], [0.001, 0.001], [0.0015, 0.002], [0.002, 0.0015]],
        type: "LineString",
    },
    legs: [
        { distance: 150, duration: 30, geometry: { type: "LineString", coordinates: [[0, 0], [0.001, 0.001]] } },
        { distance: 170, duration: 35, geometry: { type: "LineString", coordinates: [[0.001, 0.001], [0.0015, 0.002], [0.002, 0.0015]] } },
    ],
    distance: 320,
    duration: 65,
};

const mockTasks: MockTask[] = [
    { cid: "MOCK-001", text: "ถนนชำรุดจำลอง", community: "ชุมชนจำลอง 01", priority: 3, lat: 0.001, lng: 0.001 },
    { cid: "MOCK-002", text: "ไฟส่องสว่างจำลอง", community: "ชุมชนจำลอง 01", priority: 2, lat: 0.0012, lng: 0.0011 },
    { cid: "MOCK-003", text: "ทางระบายน้ำจำลอง", community: "ชุมชนจำลอง 02", priority: 1, lat: 0.002, lng: 0.0015 },
    { cid: "MOCK-004", text: "พื้นที่สาธารณะจำลอง", community: "ชุมชนจำลอง 03", priority: 1, lat: null, lng: null },
];

export default function RoutingMockPage() {
    const [tasks] = useState<MockTask[]>(mockTasks);
    const [selectedCids, setSelectedCids] = useState<string[]>(["MOCK-001", "MOCK-002", "MOCK-003"]);
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [currentLocation] = useState<{lat: number, lng: number}>({ lat: 0, lng: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingTasks] = useState(false);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [error, setError] = useState("");

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
                            const isUnroutable = task.cid === "MOCK-004";
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
