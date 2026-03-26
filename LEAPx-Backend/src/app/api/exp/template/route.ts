import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";

/**
 * GET /api/exp/template
 * ดาวน์โหลด Excel template สำหรับการอัพโหลดประวัติคะแนน (EXP) แบบ bulk
 * 
 * Authorization: STAFF, ACTIVITY_ADMIN, SUPREME
 * 
 * Features:
 * - สร้าง template พร้อมรายชื่อ users ทั้งหมดในระบบ
 * - มีคอลัมน์ Event ID (optional) สำหรับผูกกับกิจกรรม
 * - มีคอลัมน์ทักษะแยกตามระดับ (Level I-IV)
 * - มีคอลัมน์ Reason สำหรับระบุเหตุผล
 * - มีแผ่นคำแนะนำการใช้งาน
 * - มีแผ่นรายการทักษะอ้างอิง
 */
export async function GET(req: NextRequest) {
    return withActivityAdminAuth(req, async () => {
        try {
            // ดึงข้อมูลทักษะย่อยทั้งหมด
            const subSkills = await prisma.subSkillCategory.findMany({
                select: {
                    id: true,
                    name_TH: true,
                    name_EN: true,
                    mainSkillCategory: {
                        select: {
                            name_TH: true,
                            name_EN: true
                        }
                    }
                },
                orderBy: [
                    { mainSkillCategory: { name_TH: 'asc' } },
                    { name_TH: 'asc' }
                ]
            });

            // สร้างข้อมูล template (แค่ 1 แถวตัวอย่าง)
            const templateData: Array<Record<string, string | number>> = [];

            // แถวตัวอย่าง
            const exampleRow: Record<string, string | number> = {
                "รหัสนักศึกษา": "650619999",
                "Email": "test@cmu.ac.th"
            };

            // เพิ่มคอลัมน์ทักษะ (แต่ละทักษะมี 2 columns: EXP + Level)
            subSkills.forEach(subSkill => {
                exampleRow[subSkill.name_TH] = ""; // กรอกจำนวน EXP
                exampleRow[`${subSkill.name_TH} - Level`] = ""; // กรอก I, II, III, หรือ IV
            });

            templateData.push(exampleRow);

            // สร้าง workbook
            const workbook = XLSX.utils.book_new();

            // Sheet 1: Template (มีหัวตาราง)
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

            // Sheet 2: คำแนะนำ (Instructions)
            const instructions = [
                ["คำแนะนำการใช้งาน Template"],
                [""],
                ["1. รหัสนักศึกษา"],
                ["   - กรอกรหัสนักศึกษา 9 หลัก เช่น 650610001"],
                ["   - ต้องมีอยู่ในระบบ"],
                [""],
                ["2. Email"],
                ["   - กรอก email สำหรับอ้างอิง"],
                [""],
                ["3. คอลัมน์ทักษะ"],
                ["   - แต่ละทักษะมี 2 คอลัมน์: ชื่อทักษะ (กรอก EXP) และ ชื่อทักษะ - Level (กรอก Level)"],
                ["   - คอลัมน์ชื่อทักษะ: กรอกตัวเลข EXP ที่ต้องการให้ เช่น 10, 50, 100"],
                ["   - คอลัมน์ Level: กรอก I, II, III, หรือ IV"],
                ["   - กรอก 0 หรือเว้นว่าง = ไม่ให้คะแนนทักษะนั้น"],
                [""],
                ["4. ระดับ (Levels) และการบันทึก"],
                ["   - Level I: unlock โดยอัตโนมัติ"],
                ["   - Level II-IV: unlock เมื่อระดับก่อนหน้าครบ 5 ดาว"],
                ["   - สามารถให้ EXP ได้แม้ Level ยัง lock อยู่"],
                ["   - ระบบจะบันทึก EXP ไว้ พอ unlock จะมี EXP รออยู่แล้ว"],
                ["   - ถ้า Level ยัง lock: บันทึก EXP ไว้ แต่ไม่ unlock level ถัดไป"],
                ["   - ถ้า Level unlock แล้ว: บันทึก EXP และอาจ unlock level ถัดไปถ้าครบ 5 ดาว"],
                [""],
                ["5. การอัพโหลด"],
                ["   - อัพโหลดไฟล์ผ่าน API: POST /api/exp/upload"],
                ["   - เพิ่มแถวได้ไม่จำกัด"],
                [""],
                ["6. ข้อควรระวัง"],
                ["   - รหัสนักศึกษาต้องมีอยู่ในระบบ"],
                ["   - ค่า EXP ต้องเป็นตัวเลข >= 0"],
                ["   - Level ต้องเป็น I, II, III, หรือ IV"],
                ["   - ถ้า Level ครบ 5 ดาวแล้ว จะไม่เพิ่ม EXP (ข้าม)"],
                [""],
                ["ตัวอย่างข้อมูล:"],
                ["รหัสนักศึกษา | Email | การคิดเชิงวิเคราะห์ | การคิดเชิงวิเคราะห์ - Level | การสื่อสาร | การสื่อสาร - Level"],
                ["650610001 | student@cmu.ac.th | 50 | II | 30 | I"],
                ["650610002 | student2@cmu.ac.th | 100 | III | 50 | II"],
            ];
            const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
            XLSX.utils.book_append_sheet(workbook, instructionsSheet, "คำแนะนำ");

            // Sheet 3: รายการทักษะ (Skills Reference)
            const skillsData = [
                ["Skill ID", "ชื่อทักษะ (TH)", "ชื่อทักษะ (EN)", "หมวดหมู่"],
                ...subSkills.map(skill => [
                    skill.id,
                    skill.name_TH,
                    skill.name_EN,
                    skill.mainSkillCategory.name_TH
                ])
            ];
            const skillsSheet = XLSX.utils.aoa_to_sheet(skillsData);
            XLSX.utils.book_append_sheet(workbook, skillsSheet, "รายการทักษะ");

            // สร้างไฟล์ Excel
            const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

            // ส่งไฟล์กลับ
            const response = new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="EXP_Upload_Template_${Date.now()}.xlsx"`
                }
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Error generating template:", error);
            const response = NextResponse.json(
                {
                    error: "เกิดข้อผิดพลาดในการสร้าง template",
                    details: error instanceof Error ? error.message : "Unknown error"
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
