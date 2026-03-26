import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";

// interface ExcelQuestionRow {
//     'Type': string;
//     'Question Number': number;
//     'Question Type': string;
//     'Question (TH)': string;
//     'Question (EN)': string;
//     'Is Required': string;
//     'Max Score': number;
//     'Option Label (TH)': string;
//     'Option Label (EN)': string;
//     // 'Option Value': string;
//     'Option Score': number;
// }

// interface QuestionOption {
//     label: string;
//     label_EN: string;
//     value: string;
//     score: number;
// }

// interface ParsedQuestion {
//     questionNumber: number;
//     type: string;
//     question_TH: string;
//     question_EN: string;
//     isRequired: boolean;
//     maxScore: number;
//     options: QuestionOption[];
//     rowNumber: number;
// }

// interface ValidationError {
//     row: number;
//     reason: string;
// }

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

            const event = await prisma.event.findUnique({
                where: { id: parseInt(eventId) }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const templateData = [
                // Question 1: SINGLE_CHOICE
                {
                    'Type': 'QUESTION',
                    'Question Number': 1,
                    'Question Type': 'SINGLE_CHOICE',
                    'Question (TH)': 'คุณพอใจกับกิจกรรมนี้มากน้อยแค่ไหน?',
                    'Question (EN)': 'How satisfied are you with this event?',
                    'Is Required': 'TRUE',
                    'Max Score': 5,
                    'Option Label (TH)': '',
                    'Option Label (EN)': '',
                    // 'Option Value': '',
                    'Option Score': ''
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 1,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'น้อยมาก',
                    'Option Label (EN)': 'Very Low',
                    // 'Option Value': '1',
                    'Option Score': 1
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 1,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'น้อย',
                    'Option Label (EN)': 'Low',
                    // 'Option Value': '2',
                    'Option Score': 2
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 1,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'ปานกลาง',
                    'Option Label (EN)': 'Medium',
                    // 'Option Value': '3',
                    'Option Score': 3
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 1,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'มาก',
                    'Option Label (EN)': 'High',
                    // 'Option Value': '4',
                    'Option Score': 4
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 1,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'มากที่สุด',
                    'Option Label (EN)': 'Very High',
                    // 'Option Value': '5',
                    'Option Score': 5
                },
                // Question 2: MULTIPLE_CHOICE
                {
                    'Type': 'QUESTION',
                    'Question Number': 2,
                    'Question Type': 'MULTIPLE_CHOICE',
                    'Question (TH)': 'คุณได้เรียนรู้อะไรจากกิจกรรมนี้? (เลือกได้หลายข้อ)',
                    'Question (EN)': 'What did you learn from this event? (Multiple answers)',
                    'Is Required': 'FALSE',
                    'Max Score': 30,
                    'Option Label (TH)': '',
                    'Option Label (EN)': '',
                    // 'Option Value': '',
                    'Option Score': ''
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 2,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'ทักษะการทำงานเป็นทีม',
                    'Option Label (EN)': 'Teamwork skills',
                    // 'Option Value': 'teamwork',
                    'Option Score': 10
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 2,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'ความคิดสร้างสรรค์',
                    'Option Label (EN)': 'Creativity',
                    // 'Option Value': 'creativity',
                    'Option Score': 10
                },
                {
                    'Type': 'OPTION',
                    'Question Number': 2,
                    'Question Type': '',
                    'Question (TH)': '',
                    'Question (EN)': '',
                    'Is Required': '',
                    'Max Score': '',
                    'Option Label (TH)': 'การแก้ปัญหา',
                    'Option Label (EN)': 'Problem solving',
                    // 'Option Value': 'problem_solving',
                    'Option Score': 10
                },
                // Question 3: TEXTAREA (no options)
                {
                    'Type': 'QUESTION',
                    'Question Number': 3,
                    'Question Type': 'TEXTAREA',
                    'Question (TH)': 'ข้อเสนอแนะเพิ่มเติม',
                    'Question (EN)': 'Additional feedback',
                    'Is Required': 'FALSE',
                    'Max Score': 0,
                    'Option Label (TH)': '',
                    'Option Label (EN)': '',
                    // 'Option Value': '',
                    'Option Score': ''
                },
                // Question 4: RATING (no options)
                {
                    'Type': 'QUESTION',
                    'Question Number': 4,
                    'Question Type': 'RATING',
                    'Question (TH)': 'คะแนนโดยรวมของกิจกรรม (1-5)',
                    'Question (EN)': 'Overall rating (1-5)',
                    'Is Required': 'TRUE',
                    'Max Score': 5,
                    'Option Label (TH)': '',
                    'Option Label (EN)': '',
                    // 'Option Value': '',
                    'Option Score': ''
                }
            ];

            const worksheet = XLSX.utils.json_to_sheet(templateData);

            worksheet['!cols'] = [
                { wch: 10 },  // Type
                { wch: 15 },  // Question Number
                { wch: 20 },  // Question Type
                { wch: 50 },  // Question (TH)
                { wch: 50 },  // Question (EN)
                { wch: 15 },  // Is Required
                { wch: 12 },  // Max Score
                { wch: 30 },  // Option Label (TH)
                { wch: 30 },  // Option Label (EN)
                // { wch: 20 },  // Option Value
                { wch: 12 }   // Option Score
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluation");

            // Sheet คำแนะนำ
            const instructions = [
                { Instruction: "HOW TO USE THIS TEMPLATE" },
                { Instruction: "" },
                { Instruction: "STRUCTURE:" },
                { Instruction: "   1. Each question starts with Type = 'QUESTION'" },
                { Instruction: "   2. If the question has options (SINGLE_CHOICE/MULTIPLE_CHOICE)," },
                { Instruction: "      add rows with Type = 'OPTION' below it" },
                { Instruction: "   3. All option rows must have the same Question Number as their parent question" },
                { Instruction: "" },
                { Instruction: "QUESTION TYPES:" },
                { Instruction: "   • TEXT: ข้อความสั้น (no options needed)" },
                { Instruction: "   • TEXTAREA: ข้อความยาว (no options needed)" },
                { Instruction: "   • SINGLE_CHOICE: เลือกตอบเดียว (add option rows)" },
                { Instruction: "   • MULTIPLE_CHOICE: เลือกได้หลายข้อ (add option rows)" },
                { Instruction: "   • RATING: ให้คะแนน 1-5 (no options needed)" },
                { Instruction: "" },
                { Instruction: "EXAMPLE STRUCTURE:" },
                { Instruction: "" },
                { Instruction: "Type      | Q# | Type           | Question (TH)        | ... | Option Label (TH)" },
                { Instruction: "----------|----|--------------------|---------------------|-----|-------------------" },
                { Instruction: "QUESTION  | 1  | SINGLE_CHOICE   | คำถามที่ 1?          | ... | (empty)" },
                { Instruction: "OPTION    | 1  | (empty)         | (empty)             | ... | คำตอบที่ 1" },
                { Instruction: "OPTION    | 1  | (empty)         | (empty)             | ... | คำตอบที่ 2" },
                { Instruction: "OPTION    | 1  | (empty)         | (empty)             | ... | คำตอบที่ 3" },
                { Instruction: "QUESTION  | 2  | TEXTAREA        | คำถามที่ 2?          | ... | (empty)" },
                { Instruction: "" },
                { Instruction: "TIPS:" },
                { Instruction: "   • Type = 'QUESTION': Fill all question columns, leave option columns empty" },
                { Instruction: "   • Type = 'OPTION': Fill only option columns, leave question columns empty" },
                { Instruction: "   • Max Score for SINGLE_CHOICE: highest option score" },
                { Instruction: "   • Max Score for MULTIPLE_CHOICE: sum of all option scores" },
                { Instruction: "   • Max Score for TEXT/TEXTAREA: usually 0" },
                { Instruction: "   • Max Score for RATING: usually 5" },
                { Instruction: "" },
                { Instruction: "IMPORTANT:" },
                { Instruction: "   • Question Number must be continuous (1, 2, 3, ...)" },
                { Instruction: "   • All options for a question must have the same Question Number" },
                { Instruction: "   • Option Value should be unique within each question" }
            ];

            const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
            instructionsSheet['!cols'] = [{ wch: 100 }];
            XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

            const buffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            const response = new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="evaluation_template_event_${eventId}.xlsx"`
                }
            });

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Template generation error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}
