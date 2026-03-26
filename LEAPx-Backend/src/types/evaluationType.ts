export enum QuestionType {
    TEXT = 'TEXT',                    // ข้อความสั้น
    TEXTAREA = 'TEXTAREA',            // ข้อความยาว
    SINGLE_CHOICE = 'SINGLE_CHOICE',  // เลือกตอบเดียว (Radio)
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // เลือกได้หลายข้อ (Checkbox)
    RATING = 'RATING'                 // คะแนน 1-5
}

export interface QuestionOption {
    label: string;
    label_EN?: string;
    value: string;
    score: number; // คะแนนของตัวเลือกนี้
}

export interface ExcelEvaluationRow {
    'Question Number': number;
    'Question Type (TEXT/TEXTAREA/SINGLE_CHOICE/MULTIPLE_CHOICE/RATING)': string;
    'Question (TH)': string;
    'Question (EN)': string;
    'Is Required (TRUE/FALSE)': string;
    'Options (JSON format - leave empty for TEXT/TEXTAREA)': string;
    'Max Score': number;
}

export interface CreateEvaluationRequest {
    title_TH: string;
    title_EN: string;
    description_TH?: string;
    description_EN?: string;
    isRequired: boolean;
    openAt?: Date;
    closeAt?: Date;
}

export interface SubmitAnswerRequest {
    question_id: number;
    answer: string | string[]; 
}