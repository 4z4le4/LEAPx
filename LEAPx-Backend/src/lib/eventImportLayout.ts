// =============================================================================
// Row layout constants — ต้องตรงกับ upload parser ทุกรายการ
// =============================================================================
export const TEMPLATE_LAYOUT = {
    SHEET1: {
        // Key-value rows (column A = label, column B = value)
        TITLE_TH_ROW:   2,
        TITLE_EN_ROW:   3,
        DESC_TH_ROW:    4,
        DESC_EN_ROW:    5,
        LOC_TH_ROW:     6,
        LOC_EN_ROW:     7,
        ACT_START_ROW:  8,
        ACT_END_ROW:    9,
        REG_START_ROW:  10,
        REG_END_ROW:    11,
        // Skills table
        SKILLS_SECTION_HEADER_ROW: 13,
        SKILLS_TABLE_HEADER_ROW:   14,
        SKILLS_DATA_START_ROW:     15,
    },
    SHEET2: {
        NOTE_ROW:       1,
        HEADER_ROW:     2,
        DATA_START_ROW: 3,
    },
} as const;
