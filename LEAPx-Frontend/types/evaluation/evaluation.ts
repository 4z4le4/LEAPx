export type EvaluationQuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "RATING";

export type EvaluationOption = {
  id: string;
  labelTH: string;
  value: string;
};

export type EvaluationQuestion = {
  id: string;
  titleTH: string;
  descriptionTH?: string;
  required: boolean;
  type: EvaluationQuestionType;
  options?: EvaluationOption[];
};

export type Evaluation = {
  id: string;
  titleTH: string;
  eventTitle: string;
  type: "PRE" | "POST";
  startAt: string;
  endAt: string;
  questions: EvaluationQuestion[];
};

export type EvaluationAnswerValue = string | string[] | number;