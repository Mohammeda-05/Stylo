export interface OutfitEvaluation {
    overallScore: number;
    occasionScore: number;
    styleArchetype: string;
    feedback: string;
    strengths: string[];
    improvements: string[];
}

interface OutfitSuggestion {
    name: string;
    description: string;
    items: string[];
    confidence: number;
}

function parseJSON(text: string): unknown {
    // Accept a single fenced JSON response, but reject surrounding prose/partial JSON.
    const cleaned = text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
    return JSON.parse(cleaned);
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isScore = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const isTextList = (value: unknown): value is string[] =>
    Array.isArray(value) && value.length > 0 && value.every(isText);

export function parseEvaluation(text: string): OutfitEvaluation {
    const value = parseJSON(text) as Partial<OutfitEvaluation> | null;
    if (!value || !isScore(value.overallScore) || !isScore(value.occasionScore) ||
        !isText(value.feedback) || !isText(value.styleArchetype) ||
        !isTextList(value.strengths) || !isTextList(value.improvements)) {
        throw new Error('The analysis was incomplete. Please retry.');
    }
    return value as OutfitEvaluation;
}

export function parseOutfits(text: string): { outfits: OutfitSuggestion[] } {
    const value = parseJSON(text) as { outfits?: OutfitSuggestion[] } | null;
    if (!value || !Array.isArray(value.outfits) || value.outfits.length === 0 ||
        !value.outfits.every(outfit => outfit && isText(outfit.name) &&
            isText(outfit.description) && isTextList(outfit.items) && isScore(outfit.confidence))) {
        throw new Error('The outfit suggestions were incomplete. Please retry.');
    }
    return { outfits: value.outfits };
}

// Legacy text-only wardrobe analysis can omit a score; absence is never a score.
export function extractWardrobeScore(text: string): number | null {
    const match = text.match(/(?:OVERALL SCORE|SCORE)\s*[:*\-]*\s*(\d+(?:\.\d+)?)\s*\/\s*10\b/i);
    if (!match) return null;
    const score = Number(match[1]);
    return score >= 0 && score <= 10 ? score : null;
}
