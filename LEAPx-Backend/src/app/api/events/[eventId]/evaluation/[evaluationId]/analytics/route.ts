import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth,  } from "@/middleware/auth";
import { QuestionType  } from "@/types/evaluationType";
import type { QuestionType as PrismaQuestionType } from "@prisma/client";
import { transformDatesToThai } from "@/utils/timezone";

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ eventId: string; evaluationId: string }> }
) {
    return withActivityAdminAuth(req, async () => {
        try {
            const { evaluationId } = await context.params;
            const evaluationIdNum = parseInt(evaluationId);

            const evaluation = await prisma.eventEvaluation.findUnique({
                where: { id: evaluationIdNum },
                include: {
                    questions: {
                        orderBy: { questionNumber: 'asc' }
                    },
                    responses: {
                        include: {
                            answers: {
                                include: {
                                    question: true
                                }
                            },
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            if (!evaluation) {
                const response = NextResponse.json(
                    { error: "Evaluation not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            // สถิติรวม
            const totalResponses = evaluation.responses.length;
            const averageScore = totalResponses > 0
                ? evaluation.responses.reduce((sum, r) => sum + r.totalScore, 0) / totalResponses
                : 0;

            // สถิติแต่ละคำถาม
            const questionAnalytics = evaluation.questions.map(question => {
                const questionAnswers = evaluation.responses
                    .flatMap(r => r.answers)
                    .filter(a => a.question_id === question.id);
                const analytics: {
                    id: number;
                    questionNumber: number;
                    question_TH: string;
                    question_EN: string;
                    type: QuestionType | PrismaQuestionType;
                    responseCount: number;
                    averageScore?: number;
                    choiceDistribution?: Record<string, number>;
                    ratingDistribution?: Record<number, number>;
                    textAnswers?: string[];
                } = {
                    id: question.id,
                    questionNumber: question.questionNumber,
                    question_TH: question.question_TH,
                    question_EN: question.question_EN,
                    type: question.type,
                    responseCount: questionAnswers.length
                };

                if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) {
                    const distribution: Record<string, number> = {};
                    questionAnswers.forEach(answer => {
                        answer.answerChoices.forEach(choice => {
                            distribution[choice] = (distribution[choice] || 0) + 1;
                        });
                    });
                    analytics.choiceDistribution = distribution;
                    analytics.averageScore = questionAnswers.reduce((sum, a) => sum + a.score, 0) / questionAnswers.length;
                }

                if (question.type === QuestionType.RATING) {
                    const distribution: Record<number, number> = {};
                    questionAnswers.forEach(answer => {
                        if (answer.answerRating) {
                            distribution[answer.answerRating] = (distribution[answer.answerRating] || 0) + 1;
                        }
                    });
                    analytics.ratingDistribution = distribution;
                    analytics.averageScore = questionAnswers.reduce((sum, a) => sum + (a.answerRating || 0), 0) / questionAnswers.length;
                }

                if (question.type === QuestionType.TEXT || question.type === QuestionType.TEXTAREA) {
                    analytics.textAnswers = questionAnswers
                        .map(a => a.answerText)
                        .filter((text): text is string => text !== null);
                }

                return analytics;
            });

            const response = NextResponse.json(transformDatesToThai({
                success: true,
                data: {
                    evaluation: {
                        id: evaluation.id,
                        title_TH: evaluation.title_TH,
                        title_EN: evaluation.title_EN,
                        maxScore: evaluation.maxScore
                    },
                    summary: {
                        totalResponses,
                        averageScore: Number(averageScore.toFixed(2)),
                        percentage: evaluation.maxScore > 0 
                            ? Number(((averageScore / evaluation.maxScore) * 100).toFixed(2))
                            : 0
                    },
                    questions: questionAnalytics,
                    responses: evaluation.responses.map(r => ({
                        id: r.id,
                        user: r.user,
                        totalScore: r.totalScore,
                        submittedAt: r.submittedAt,
                        answers: r.answers.map(a => ({
                            questionNumber: a.question.questionNumber,
                            question_TH: a.question.question_TH,
                            answerText: a.answerText,
                            answerChoices: a.answerChoices,
                            answerRating: a.answerRating,
                            score: a.score
                        }))
                    }))
                }
            }));

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Get analytics error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}