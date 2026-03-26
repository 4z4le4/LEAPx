// ---------- Common shared types ----------
export type ChipKind = "audience" | "year" | "skill" | "tag";


export type Chip = {
  id: string;
  kind?: ChipKind;
  label: string;
  value?: string | number;
};
