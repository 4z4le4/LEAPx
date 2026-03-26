import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { transformDatesToThai } from "@/utils/timezone";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withUserAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const userId = await getUserId(req);
            const eventIdNum = parseInt(eventId);

            if (!userId) {
                const response = NextResponse.json(
                    { error: "User not found" },
                    { status: 401 }
                );
                return addCorsHeaders(response, req);
            }

            // ตรวจสอบว่า user ลงทะเบียนและเช็คอินแล้ว
            const registration = await prisma.eventRegistration.findUnique({
                where: {
                    user_id_event_id: {
                        user_id: Number(userId),
                        event_id: eventIdNum
                    }
                }
            });

            if (!registration || !registration.checkedIn) {
                const response = NextResponse.json(
                    { error: "You must register and check-in to access evaluations" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            const now = new Date();

            // ดึงแบบประเมินที่พร้อมให้ทำ
            const evaluations = await prisma.eventEvaluation.findMany({
                where: {
                    event_id: eventIdNum,
                    isActive: true,
                    OR: [
                        { openAt: null }, // ไม่มีการกำหนดเวลาเปิด
                        { openAt: { lte: now } } // ถึงเวลาเปิดแล้ว
                    ],
                    AND: [
                        {
                            OR: [
                                { closeAt: null }, // ไม่มีการกำหนดเวลาปิด
                                { closeAt: { gte: now } } // ยังไม่ปิด
                            ]
                        }
                    ]
                },
                include: {
                    questions: {
                        orderBy: { questionNumber: 'asc' }
                    }
                }
            });

            const userResponses = await prisma.evaluationResponse.findMany({
                where: {
                    user_id: Number(userId),
                    evaluation_id: {
                        in: evaluations.map(e => e.id)
                    }
                }
            });

            const responseMap = new Map(
                userResponses.map(r => [r.evaluation_id, r])
            );

            const availableEvaluations = evaluations.map(evaluation => ({
                id: evaluation.id,
                title_TH: evaluation.title_TH,
                title_EN: evaluation.title_EN,
                description_TH: evaluation.description_TH,
                description_EN: evaluation.description_EN,
                isRequired: evaluation.isRequired,
                maxScore: evaluation.maxScore,
                closeAt: evaluation.closeAt,
                questionCount: evaluation.questions.length,
                isCompleted: responseMap.has(evaluation.id),
                submittedAt: responseMap.get(evaluation.id)?.submittedAt,
                totalScore: responseMap.get(evaluation.id)?.totalScore,
                questions: responseMap.has(evaluation.id) 
                    ? undefined // ไม่ส่งคำถามถ้าทำแล้ว
                    : evaluation.questions.map(q => ({
                        id: q.id,
                        questionNumber: q.questionNumber,
                        question_TH: q.question_TH,
                        question_EN: q.question_EN,
                        type: q.type,
                        isRequired: q.isRequired,
                        options: q.options,
                        maxScore: q.maxScore
                    }))
            }));

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: {
                    evaluations: availableEvaluations,
                    registration: {
                        id: registration.id,
                        checkedIn: registration.checkedIn,
                        checkInTime: registration.checkInTime
                    }
                }
            }));

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get user evaluations error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}