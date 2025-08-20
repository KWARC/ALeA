import { Tristate } from './quiz';

export interface VariableAssignment {
  // special keys:
  // To be documented.
  key: string;
  value: string;
}

export interface Template {
  templateName: string;
  version: string;
  updateMessage: string;

  templateStrs: string[];
  defaultAssignment: VariableAssignment[];
  updater: string;
  updateTime: string;
}

export type PostProcessingStep = 'JSON_TO_STEX' | 'REMOVE_NEWLINES';

export interface CreateGptProblemsRequest {
  dryRun: boolean;
  useTools: boolean;
  templateName: string;
  templateVersion: string;
  templateStrs: string[];
  assignments: VariableAssignment[];
  postProcessingSteps: PostProcessingStep[];
}

export interface GptCompletionData {
  multiAssignment?: VariableAssignment[];
  actualPrompts: string[];
  response: string;
  usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
    cost_USD: number;
  };
}

export interface CreateGptProblemsResponse {
  runId: string;
  runTime: string;
  runner: string;
  completions_tools: GptCompletionData[];
  completions: GptCompletionData[];
}

export interface GptRun {
  request: CreateGptProblemsRequest;
  response: CreateGptProblemsResponse;
}

export type LikertType = 'ambiguous' | 'appropriate' | 'difficult' | 'relevant' | 'useful';

export interface LikertRating {
  label: string;
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  scaleSize: 3 | 4 | 5 | 7;
}

export const LikertLabels: { [key in LikertType]: string[] } = {
  appropriate: [
    // Template: Level of Appropriateness
    'Absolutely inappropriate',
    'Inappropriate',
    'Slightly inappropriate',
    'Neutral',
    'Slightly appropriate',
    'Appropriate',
    'Very appropriate',
  ],
  ambiguous: [
    // Template: Level of Problem
    'Ambiguous',
    'Somewhat ambiguous',
    'Slightly ambiguous',
    'Not at all ambiguous',
  ],
  difficult: [
    // Level of Difficulty
    'Very easy',
    'Easy',
    'Neutral',
    'Difficult',
    'Very difficult',
  ],

  relevant: [
    // Template: Level of Appropriateness
    'Absolutely irrelevant',
    'Irrelevant',
    'Slightly irrelevant',
    'Neutral',
    'Slighlty relevant',
    'Relevant',
    'Very relevant',
  ],
  useful: [
    // Template: Level of Appropriateness
    'Completely useless',
    'Somewhat useless',
    'Slightly useless',
    'Neutral',
    'Slightly useful',
    'Somewhat useful',
    'Very useful',
  ],
};

export const LikertScaleSize: { [key in LikertType]: number } = Object.keys(LikertLabels).reduce(
  (acc, likertTypeStr) => {
    const likertType = likertTypeStr as LikertType;
    acc[likertType] = LikertLabels[likertType].length;
    return acc;
  },
  {} as { [key in LikertType]: number }
);

export interface ProblemEval {
  relevanceToMaterial?: LikertRating;
  difficulty?: LikertRating;
  useful?: LikertRating;
  appropriateForObjective?: LikertRating;

  // Correctness of the content of the problem.
  doesCompile?: Tristate;
  languageCorrect?: Tristate;
  numContentErrors?: number;
  ambiguous?: LikertRating;
  numMissedAnnotations?: number;
  numWrongAnnotations?: number;
  numMissedImports?: number;
  numWrongImports?: number;

  textDescription?: string;
  fixedProblem?: string;
}

export interface CompletionEval {
  runId: string;
  completionIdx: number;
  version: string;
  evaluator: string;

  textDescription?: string;
  problemEvals: ProblemEval[];
  updateTime: string;
}
export type MinorEditType =
  | 'change_data_format'
  | 'change_goal'
  | 'convert_units'
  | 'negate_question_stem'
  | 'substitute_values';
export interface MinorEditVariant {
  variantType: 'minor_edit';
  minorEditType: MinorEditType;
  minorEditInstruction?: string;
}

export interface ReskinVariant {
  variantType: 'reskin';
  theme: string;
  reskinInstruction?: string;
}
export interface LanguageVariant {
  variantType: 'translate';
  language: string;
}
export interface ModifyChoicesVariant {
  variantType: 'modify_choices';
  optionsToModify: string;
  modifyChoiceInstruction?: string;
}

export interface VariantBase {
  mode: 'variant';
  problemId?: number;
  problemUri?: string;
}

export type VariantGenerationParams =
  | (VariantBase & MinorEditVariant)
  | (VariantBase & ReskinVariant)
  | (VariantBase & ModifyChoicesVariant)
  | (VariantBase & LanguageVariant);

interface NewGenerationParams {
  mode: 'new';
  courseId: string;
  startSectionUri: string;
  endSectionUri: string;
}
interface CopyGenerationParams {
  mode: 'copy';
  problemId?: number;
  courseId?: string;
  problemUri?: string;
  sectionUri?: string;
  sectionId?: string;
}

export type GenerationParams = NewGenerationParams | CopyGenerationParams | VariantGenerationParams;

// export interface PossibleVariantsResult {
//   rephrase: {
//     applicable: boolean;
//     types?: string[];
//   };
//   reskin: {
//     applicable: boolean;
//     themes?: string[];
//   };
//   modify_choices: {
//     applicable: boolean;
//     optionsToModify?: string[];
//   };
// }
export interface PossibleVariantsResult {
  current_question_language: string;
  adjust_scaffolding: boolean;
  change_data_format: boolean;
  change_goal: boolean;
  convert_units: boolean;
  modify_choices: boolean;
  negate_question_stem: boolean;
  rephrase_wording: boolean;
  reskin: {
    applicable: boolean;
    themes?: string[];
  };
  substitute_values: boolean;
}
