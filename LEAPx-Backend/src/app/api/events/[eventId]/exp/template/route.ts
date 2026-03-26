import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const eventIdNum = parseInt(eventId);

            // ตรวจสอบกิจกรรม
            const event = await prisma.event.findUnique({
                where: { id: eventIdNum },
                include: {
                    registrations: {
                        where: {
                            status: {
                                in: ['REGISTERED', 'ATTENDED', 'COMPLETED', 'LATE']
                            }
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        },
                        take: 100 // ตัวอย่าง 100 คนแรก
                    }
                }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // ดึงทักษะทั้งหมดที่active
            const subSkills = await prisma.subSkillCategory.findMany({
                where: { isActive: true },
                include: {
                    mainSkillCategory: {
                        select: {
                            id: true,
                            name_TH: true,
                            name_EN: true,
                            color: true
                        }
                    }
                },
                orderBy: [
                    { mainSkillCategory_id: 'asc' },
                    { sortOrder: 'asc' }
                ]
            });

            // สร้างหัวตาราง
            const headers: Record<string, string | number> = {
                "User ID": "",
                "Email": "",
                "First Name": "",
                "Last Name": "",
            };

            // เพิ่มคอลัมน์สำหรับแต่ละทักษะและระดับ
            subSkills.forEach(subSkill => {
                const skillName = subSkill.name_TH;
                headers[`${skillName} - Level I`] = "";
                headers[`${skillName} - Level II`] = "";
                headers[`${skillName} - Level III`] = "";
                headers[`${skillName} - Level IV`] = "";
            });

            // สร้างข้อมูลตัวอย่าง
            const templateData: Array<Record<string, string | number>> = [headers];

            // เพิ่มข้อมูล users ที่ลงทะเบียน (ถ้ามี)
            if (event.registrations.length > 0) {
                event.registrations.forEach(reg => {
                    const row: Record<string, string | number> = {
                        "User ID": reg.user.id,
                        "Email": reg.user.email,
                        "First Name": reg.user.firstName,
                        "Last Name": reg.user.lastName,
                    };

                    // เติมคอลัมน์ทักษะด้วยค่าว่าง (ให้ admin กรอก)
                    subSkills.forEach(subSkill => {
                        const skillName = subSkill.name_TH;
                        row[`${skillName} - Level I`] = "";
                        row[`${skillName} - Level II`] = "";
                        row[`${skillName} - Level III`] = "";
                        row[`${skillName} - Level IV`] = "";
                    });

                    templateData.push(row);
                });
            } else {
                // ถ้าไม่มีผู้ลงทะเบียน ให้ตัวอย่าง 2 แถว
                for (let i = 0; i < 2; i++) {
                    const row: Record<string, string | number> = {
                        "User ID": i === 0 ? "640610001" : "640610002",
                        "Email": i === 0 ? "student1@cmu.ac.th" : "student2@cmu.ac.th",
                        "First Name": i === 0 ? "ตัวอย่าง 1" : "ตัวอย่าง 2",
                        "Last Name": i === 0 ? "ทดสอบ" : "ทดสอบ",
                    };

                    subSkills.forEach(subSkill => {
                        const skillName = subSkill.name_TH;
                        row[`${skillName} - Level I`] = i === 0 ? "10" : "";
                        row[`${skillName} - Level II`] = i === 0 ? "5" : "";
                        row[`${skillName} - Level III`] = "";
                        row[`${skillName} - Level IV`] = "";
                    });

                    templateData.push(row);
                }
            }

            // สร้าง worksheet
            const worksheet = XLSX.utils.json_to_sheet(templateData, { 
                skipHeader: true 
            });

            // กำหนดความกว้างคอลัมน์
            const colWidths = [
                { wch: 12 }, // User ID
                { wch: 30 }, // Email
                { wch: 20 }, // First Name
                { wch: 20 }, // Last Name
            ];

            // เพิ่มความกว้างสำหรับคอลัมน์ทักษะ
            subSkills.forEach(() => {
                colWidths.push({ wch: 15 }); // Level I
                colWidths.push({ wch: 15 }); // Level II
                colWidths.push({ wch: 15 }); // Level III
                colWidths.push({ wch: 15 }); // Level IV
            });

            worksheet['!cols'] = colWidths;

            // สร้าง Info Sheet
            const infoData = [
                { "คำแนะนำ": "วิธีการใช้งาน Template นี้" },
                { "คำแนะนำ": "" },
                { "คำแนะนำ": "1. กรอกค่า EXP ที่ต้องการให้แต่ละคนได้รับในคอลัมน์ทักษะและระดับ" },
                { "คำแนะนำ": "2. ถ้าไม่ต้องการให้ทักษะใดก็ปล่อยว่างไว้" },
                { "คำแนะนำ": "3. User ID จะต้องมีอยู่ในระบบ" },
                { "คำแนะนำ": "4. ค่า EXP ต้องเป็นตัวเลขบวกเท่านั้น" },
                { "คำแนะนำ": "5. ระบบจะคำนวณดาวและปลดล็อคระดับอัตโนมัติ" },
                { "คำแนะนำ": "" },
                { "คำแนะนำ": "เกณฑ์ EXP ต่อดาว:" },
                { "คำแนะนำ": "- Level I: 8 EXP = 1 ดาว" },
                { "คำแนะนำ": "- Level II: 16 EXP = 1 ดาว" },
                { "คำแนะนำ": "- Level III: 32 EXP = 1 ดาว" },
                { "คำแนะนำ": "- Level IV: 64 EXP = 1 ดาว" },
            ];

            const infoSheet = XLSX.utils.json_to_sheet(infoData);
            infoSheet['!cols'] = [{ wch: 80 }];

            // สร้าง Skills Reference Sheet
            const skillsRefData = subSkills.map((skill, index) => ({
                "ลำดับ": index + 1,
                "ID": skill.id,
                "ทักษะหลัก": skill.mainSkillCategory.name_TH,
                "ทักษะย่อย": skill.name_TH,
                "ทักษะย่อย (EN)": skill.name_EN,
                "คำอธิบาย": skill.description_TH || "-"
            }));

            const skillsRefSheet = XLSX.utils.json_to_sheet(skillsRefData);
            skillsRefSheet['!cols'] = [
                { wch: 8 },  // ลำดับ
                { wch: 8 },  // ID
                { wch: 25 }, // ทักษะหลัก
                { wch: 30 }, // ทักษะย่อย
                { wch: 30 }, // ทักษะย่อย EN
                { wch: 50 }  // คำอธิบาย
            ];

            // สร้าง workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "EXP Template");
            XLSX.utils.book_append_sheet(workbook, infoSheet, "คำแนะนำ");
            XLSX.utils.book_append_sheet(workbook, skillsRefSheet, "รายการทักษะ");

            // สร้าง buffer
            const buffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            const response = new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="event_${eventId}_exp_template.xlsx"`
                }
            });

            return addCorsHeaders(response, req);

        } catch (error) {
            console.error("Template generation error:", error);
            const response = NextResponse.json(
                { 
                    error: "Failed to generate template",
                    details: error instanceof Error ? error.message : "Unknown error" 
                },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
