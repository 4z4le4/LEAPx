import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { withActivityAdminAuth } from "@/middleware/auth";
import { thaiToUTC } from "@/utils/timezone";

interface ExcelQuestionRow {
    'Type': string;
    'Question Number': number;
    'Question Type': string;
    'Question (TH)': string;
    'Question (EN)': string;
    'Is Required': string;
    'Max Score': number;
    'Option Label (TH)': string;
    'Option Label (EN)': string;
    // 'Option Value': string;
    'Option Score': number;
}

interface QuestionOption {
    label: string;
    label_EN: string;
    value: string;
    score: number;
}

interface ParsedQuestion {
    questionNumber: number;
    type: string;
    question_TH: string;
    question_EN: string;
    isRequired: boolean;
    maxScore: number;
    options: QuestionOption[];
    rowNumber: number;
}

interface ValidationError {
    row: number;
    reason: string;
}

export async function OPTIONS(req: NextRequest) {
    return handleCorsPreFlight(req);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ eventId: string }> }
) {
    return withActivityAdminAuth(req, async () => {
        try {
            const { eventId } = await context.params;
            const eventIdNum = parseInt(eventId);

            const event = await prisma.event.findUnique({
                where: { id: eventIdNum }
            });

            if (!event) {
                const response = NextResponse.json(
                    { error: "Event not found" },
                    { status: 404 }
                );
                return addCorsHeaders(response, req);
            }

            const formData = await req.formData();
            const type_evaluation = formData.get("type_evaluation") as string;
            const file = formData.get("file") as File;
            const title_TH = formData.get("title_TH") as string;
            const title_EN = formData.get("title_EN") as string;
            const description_TH = formData.get("description_TH") as string | null;
            const description_EN = formData.get("description_EN") as string | null;
            const isRequired = formData.get("isRequired") === "true";
            const openAtStr = formData.get("openAt") as string | null;
            const closeAtStr = formData.get("closeAt") as string | null;
            const openAt = openAtStr ? thaiToUTC(openAtStr) : null;
            const closeAt = closeAtStr ? thaiToUTC(closeAtStr) : null;

            if (!file) {
                const response = NextResponse.json(
                    { error: "No file uploaded" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if(!type_evaluation || !["PRE_TEST", "POST_TEST"].includes(type_evaluation)) {
                const response = NextResponse.json(
                    { error: "Invalid or missing type_evaluation" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            if (!title_TH || !title_EN) {
                const response = NextResponse.json(
                    { error: "Title is required" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const workbook = XLSX.read(buffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(worksheet) as Partial<ExcelQuestionRow>[];

            if (data.length === 0) {
                const response = NextResponse.json(
                    { error: "Excel file is empty" },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const errors: ValidationError[] = [];
            const questionsMap = new Map<number, ParsedQuestion>();

            for (let i = 0; i < data.length; i++) {
                const row = data[i] as Partial<ExcelQuestionRow>;
                const rowNumber = i + 2; // Excel row number (header is row 1)
                const rowType = row['Type']?.toString().toUpperCase().trim();
                const questionNumber = row['Question Number'];

                if (!rowType && !questionNumber) {
                    continue;
                }

                if (!rowType || !questionNumber) {
                    errors.push({
                        row: rowNumber,
                        reason: "Missing Type or Question Number"
                    });
                    continue;
                }

                if (rowType === 'QUESTION') {

                    const type = row['Question Type']?.toString().trim();
                    const question_TH = row['Question (TH)']?.toString().trim();
                    const question_EN = row['Question (EN)']?.toString().trim();
                    const isRequiredStr = row['Is Required']?.toString().trim();
                    const maxScore = Number(row['Max Score']);

                    if (!type || !question_TH || !question_EN) {
                        errors.push({
                            row: rowNumber,
                            reason: "Missing required question fields (Type, Question TH, Question EN)"
                        });
                        continue;
                    }

                    const validTypes = ['TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING'];
                    if (!validTypes.includes(type)) {
                        errors.push({
                            row: rowNumber,
                            reason: `Invalid question type: ${type}. Must be one of: ${validTypes.join(', ')}`
                        });
                        continue;
                    }

                    if (questionsMap.has(questionNumber)) {
                        errors.push({
                            row: rowNumber,
                            reason: `Duplicate question number: ${questionNumber}`
                        });
                        continue;
                    }

                    questionsMap.set(questionNumber, {
                        questionNumber,
                        type,
                        question_TH,
                        question_EN,
                        isRequired: isRequiredStr?.toUpperCase() === 'TRUE',
                        maxScore: isNaN(maxScore) ? 0 : maxScore,
                        options: [],
                        rowNumber 
                    });

                } else if (rowType === 'OPTION') {
                    const label = row['Option Label (TH)']?.toString().trim();
                    const label_EN = row['Option Label (EN)']?.toString().trim();
                    // const value = row['Option Value']?.toString().trim();
                    const score = Number(row['Option Score']);

                    if (!label ) {
                        errors.push({
                            row: rowNumber,
                            reason: "Missing required option fields (Label TH)"
                        });
                        continue;
                    }

                    if (isNaN(score)) {
                        errors.push({
                            row: rowNumber,
                            reason: "Option Score must be a number"
                        });
                        continue;
                    }

                    const question = questionsMap.get(questionNumber);
                    if (!question) {
                        errors.push({
                            row: rowNumber,
                            reason: `Option references non-existent Question Number ${questionNumber}`
                        });
                        continue;
                    }

                    // Check for duplicate option values in the same question
                    if (question.options.some((opt: QuestionOption) => opt.label === label)) {
                        errors.push({
                            row: rowNumber,
                            reason: `Duplicate option label "${label}" for Question ${questionNumber}`
                        });
                        continue;
                    }

                    question.options.push({
                        label,
                        label_EN: label_EN || label, 
                        value: label.toLowerCase().replace(/\s+/g, '_'),
                        score: score
                    });
                } else {
                    errors.push({
                        row: rowNumber,
                        reason: `Invalid Type: "${rowType}". Must be "QUESTION" or "OPTION"`
                    });
                }
            }

            if (errors.length > 0) {
                const response = NextResponse.json(
                    {
                        error: "Validation errors found in Excel file",
                        errors,
                        totalErrors: errors.length
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            // Validate question types vs options
            const questions = Array.from(questionsMap.values()).sort((a, b) => a.questionNumber - b.questionNumber);
            
            for (const q of questions) {
                if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && q.options.length === 0) {
                    errors.push({
                        row: q.rowNumber,
                        reason: `Question ${q.questionNumber} (${q.type}) requires at least one OPTION row`
                    });
                }

                if ((q.type === 'TEXT' || q.type === 'TEXTAREA' || q.type === 'RATING') && q.options.length > 0) {
                    errors.push({
                        row: q.rowNumber,
                        reason: `Question ${q.questionNumber} (${q.type}) should not have OPTION rows`
                    });
                }
            }

            if (errors.length > 0) {
                const response = NextResponse.json(
                    {
                        error: "Question validation errors",
                        errors,
                        totalErrors: errors.length
                    },
                    { status: 400 }
                );
                return addCorsHeaders(response, req);
            }

            const totalMaxScore = questions.reduce((sum, q) => sum + q.maxScore, 0);

            const evaluation = await prisma.eventEvaluation.create({
                data: {
                    event_id: eventIdNum,
                    type_evaluation: type_evaluation as 'PRE_TEST' | 'POST_TEST',
                    title_TH,
                    title_EN,
                    description_TH,
                    description_EN,
                    isRequired,
                    maxScore: totalMaxScore,
                    openAt,
                    closeAt,
                    questions: {
                        create: questions.map(q => ({
                            questionNumber: q.questionNumber,
                            question_TH: q.question_TH,
                            question_EN: q.question_EN,
                            type: q.type as 'TEXT' | 'TEXTAREA' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING',
                            isRequired: q.isRequired,
                            ...(q.options.length > 0 && { options: JSON.stringify(q.options) }),
                            maxScore: q.maxScore
                        }))
                    }
                },
                include: {
                    questions: {
                        orderBy: { questionNumber: 'asc' }
                    }
                }
            });

            const response = NextResponse.json(
                {
                    success: true,
                    message: "Evaluation created successfully",
                    data: {
                        evaluation: {
                            id: evaluation.id,
                            title_TH: evaluation.title_TH,
                            title_EN: evaluation.title_EN,
                            maxScore: evaluation.maxScore,
                            questionCount: evaluation.questions.length
                        }
                    }
                },
                { status: 201 }
            );

            return addCorsHeaders(response, req);
        } catch (error) {
            console.error("Upload evaluation error:", error);
            const response = NextResponse.json(
                { error: error instanceof Error ? error.message : "Unknown error" },
                { status: 500 }
            );
            return addCorsHeaders(response, req);
        }
    });
}