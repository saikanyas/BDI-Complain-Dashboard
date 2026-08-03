"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";

interface DistrictPoint {
  district: string;
  total: number;
  pending: number;
  done: number;
  completion_rate: number;
}

// พิกัดโดยประมาณของแต่ละเขตในเทศบาลนครขอนแก่น
// หมายเหตุ: เป็นตำแหน่งประมาณเพื่อกระจายจุดให้เห็นภาพรวมเชิงพื้นที่ — ไม่ใช่ขอบเขตเขตที่เป๊ะตามประกาศจริง
// (ไม่มีไฟล์ขอบเขตเขต/GeoJSON ที่เป็นทางการให้ใช้ตอนนี้)
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "เขต 1": [16.4419, 102.8360],
  "เขต 2": [16.4520, 102.8450],
  "เขต 3": [16.4550, 102.8300],
  "เขต 4": [16.4280, 102.8230],
  "เขต 7": [16.4380, 102.8500],
};

const CENTER: [number, number] = [16.4419, 102.8360];

/**
 * สำหรับเขตที่ไม่มีพิกัดเจาะจงไว้ใน DISTRICT_COORDS (เช่นชื่อเขตจากชุดข้อมูลใหม่ที่ไม่รู้จักล่วงหน้า)
 * กระจายจุดเป็นวงกลมรอบศูนย์กลางเมืองให้เห็นภาพรวมได้ แทนที่จะ "หาย" ไปจากแผนที่เงียบๆ
 * (ก่อนหน้านี้เขตที่ไม่ตรงกับ DISTRICT_COORDS เป๊ะจะไม่ถูกแสดงเลย — แก้ให้ทนทานขึ้นเผื่อข้อมูลชุดใหม่)
 */
function fallbackCoords(index: number, total: number): [number, number] {
  const angle  = (2 * Math.PI * index) / Math.max(total, 1);
  const radius = 0.025; // ~2.5km จากศูนย์กลาง
  return [CENTER[0] + radius * Math.sin(angle), CENTER[1] + radius * Math.cos(angle)];
}

function colorFor(completionRate: number): string {
  if (completionRate >= 95) return "#00B37E";
  if (completionRate >= 85) return "#E8960C";
  return "#E5484D";
}

export default function KhonKaenMap({ data }: { data: DistrictPoint[] }) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const unknownCount = data.filter((d) => !DISTRICT_COORDS[d.district]).length;

  return (
    <MapContainer
      center={CENTER}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "16px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((d, index) => {
        const known = DISTRICT_COORDS[d.district];
        const unknownIndex = data
          .slice(0, index)
          .filter((previous) => !DISTRICT_COORDS[previous.district])
          .length;
        const coords = known ?? fallbackCoords(unknownIndex, unknownCount);
        const radius = 14 + (d.total / maxTotal) * 36; // 14–50px ตามสัดส่วนจำนวนคำร้อง
        return (
          <CircleMarker
            key={d.district}
            center={coords}
            radius={radius}
            pathOptions={{
              color: colorFor(d.completion_rate),
              fillColor: colorFor(d.completion_rate),
              fillOpacity: 0.35,
              weight: 2,
              dashArray: known ? undefined : "4 4", // เส้นประ = ตำแหน่งไม่แน่นอน (เขตที่ไม่รู้จักล่วงหน้า)
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
              <strong>{d.district}</strong>{!known && " (ตำแหน่งประมาณ)"}
            </Tooltip>
            <Popup>
              <div style={{ fontFamily: "inherit", minWidth: 160 }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{d.district}</p>
                <p style={{ fontSize: 13, margin: 0 }}>คำร้องทั้งหมด: <strong>{d.total}</strong></p>
                <p style={{ fontSize: 13, margin: 0 }}>เสร็จแล้ว: <strong>{d.done}</strong> ({d.completion_rate}%)</p>
                <p style={{ fontSize: 13, margin: 0 }}>ค้างดำเนินการ: <strong>{d.pending}</strong></p>
                {!known && <p style={{ fontSize: 11, margin: "4px 0 0", color: "#94A3B8" }}>* ไม่มีพิกัดเจาะจง แสดงตำแหน่งประมาณ</p>}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
