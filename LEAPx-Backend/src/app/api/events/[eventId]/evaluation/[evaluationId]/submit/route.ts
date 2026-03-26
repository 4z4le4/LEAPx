import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withUserAuth, getUserId } from "@/middleware/auth";
import { SubmitAnswerRequest, QuestionType, QuestionOption } from "@/types/evaluationType";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; evaluationId: string }> }
) {
    return withUserAuth(req, async () => {
        try {
            const { eventId, evaluationId } = await context.params;
            const userId = await getUserId(req);
            const eventIdNum = parseInt(eventId);
            const evaluationIdNum = parseInt(evaluationId);

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
                    { error: "You must register and check-in to submit evaluations" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            // ตรวจสอบว่าแบบประเมินมีอยู่และพร้อมให้ทำ
            const evaluation = await prisma.eventEvaluation.findUnique({
                where: {
                    id: evaluationIdNum,
                    event_id: eventIdNum,
                    isActive: true
                },
                include: {
                    questions: {
                        orderBy: { questionNumber: 'asc' }
                    }
                }
            });

            if (!evaluation) {
                const response = NextResponse.json(
                    { error: "Evaluation not found or not available" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // ตรวจสอบว่าเปิดให้ทำแล้วหรือยัง
            const now = new Date();
            if (evaluation.openAt && evaluation.openAt > now) {
                const response = NextResponse.json(
                    { error: "Evaluation is not open yet" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            if (evaluation.closeAt && evaluation.closeAt < now) {
                const response = NextResponse.json(
                    { error: "Evaluation is closed" },
                    { status: 403 }
                );
                return addCorsHeaders(response, req);
            }

            // ตรวจสอบว่าทำไปแล้วหรือยัง
            const existingResponse = await prisma.evaluationResponse.findUnique({
                where: {
                    evaluation_id_user_id: {
                        evaluation_id: evaluationIdNum,
                        user_id: Number(userId)
                    }
                }
            });

            if (existingResponse) {
                const response = NextResponse.json(
                    { error: "You have already submitted this evaluation" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // รับคำตอบจาก request
            const { answers } = await req.json() as { answers: SubmitAnswerRequest[] };

            if (!answers || !Array.isArray(answers)) {
                const response = NextResponse.json(
                    { error: "Invalid answers format" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate คำตอบ
            const questionMap = new Map(evaluation.questions.map(q => [q.id, q]));
            const answerMap = new Map(answers.map(a => [a.question_id, a]));

            // ตรวจสอบว่าตอบครบคำถามบังคับหรือยัง
            const missingRequired: number[] = [];
            for (const question of evaluation.questions) {
                if (question.isRequired && !answerMap.has(question.id)) {
                    missingRequired.push(question.questionNumber);
                }
            }

            if (missingRequired.length > 0) {
                const response = NextResponse.json(
                    { 
                        error: "Missing required questions",
                        missingQuestions: missingRequired
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // คำนวณคะแนนและสร้างคำตอบ
            let totalScore = 0;
            const answersToCreate: Array<{
                question_id: number;
                answerText: string | null;
                answerChoices: string[];
                answerRating: number | null;
                score: number;
            }> = [];

            for (const answer of answers) {
                const question = questionMap.get(answer.question_id);
                if (!question) continue;

                let score = 0;
                let answerText: string | null = null;
                let answerChoices: string[] = [];
                let answerRating: number | null = null;

                switch (question.type) {
                    case QuestionType.TEXT:
                    case QuestionType.TEXTAREA:
                        answerText = typeof answer.answer === 'string' ? answer.answer : '';
                        score = 0; // ไม่มีคะแนน
                        break;

                    case QuestionType.SINGLE_CHOICE:
                        answerChoices = [typeof answer.answer === 'string' ? answer.answer : ''];
                        // หาคะแนนจาก options
                        const options = question.options as QuestionOption[] | null;
                        if (options) {
                            const selectedOption = options.find(opt => opt.value === answer.answer);
                            score = selectedOption?.score || 0;
                        }
                        break;

                    case QuestionType.MULTIPLE_CHOICE:
                        answerChoices = Array.isArray(answer.answer) ? answer.answer : [];
                        // รวมคะแนนจากทุกตัวเลือกที่เลือก
                        const multiOptions = question.options as QuestionOption[] | null;
                        if (multiOptions) {
                            score = answerChoices.reduce((sum, choice) => {
                                const opt = multiOptions.find(o => o.value === choice);
                                return sum + (opt?.score || 0);
                            }, 0);
                        }
                        break;

                    case QuestionType.RATING:
                        answerRating = typeof answer.answer === 'string' ? parseInt(answer.answer) : 
                                       typeof answer.answer === 'number' ? answer.answer : 0;
                        
                        // Validate rating 1-5
                        if (answerRating < 1 || answerRating > 5) {
                            answerRating = 0;
                        }
                        score = answerRating;
                        break;
                }

                totalScore += score;
                answersToCreate.push({
                    question_id: question.id,
                    answerText,
                    answerChoices,
                    answerRating,
                    score
                });
            }

            // บันทึกคำตอบ
            const evaluationResponse = await prisma.evaluationResponse.create({
                data: {
                    evaluation_id: evaluationIdNum,
                    user_id: Number(userId),
                    registration_id: registration.id,
                    totalScore,
                    answers: {
                        create: answersToCreate
                    }
                },
                include: {
                    answers: {
                        include: {
                            question: true
                        }
                    }
                }
            });

const response = NextResponse.json(transformDatesToThai({
                success: true,
                message: "Evaluation submitted successfully",
                data: {
                    response: {
                        id: evaluationResponse.id,
                        totalScore: evaluationResponse.totalScore,
                        maxScore: evaluation.maxScore,
                        percentage: evaluation.maxScore > 0 
                            ? ((evaluationResponse.totalScore / evaluation.maxScore) * 100).toFixed(2)
                            : 0,
                        submittedAt: evaluationResponse.submittedAt
                    }
                }
            }));

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Submit evaluation error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}