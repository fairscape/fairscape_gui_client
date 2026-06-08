import type { Phase } from './types';

export interface PhaseDef {
  id: string;
  label: string;
  blurb: string;
}

/** The six user-facing phases shown in the stepper, in order. */
export const PHASES: PhaseDef[] = [
  { id: 'import', label: 'Import', blurb: 'Bring in the file list and dataset metadata.' },
  { id: 'schemas', label: 'Schemas', blurb: 'Infer column names and types for tabular files.' },
  { id: 'ai-ready', label: 'AI-Ready', blurb: 'Add bias, license, and use-case fields from the paper.' },
  { id: 'provenance', label: 'Provenance', blurb: 'Record the pipeline that produced the data.' },
  { id: 'grading', label: 'Grading', blurb: 'Score against the 28 AI-Ready rubrics.' },
  { id: 'improvements', label: 'Improvements', blurb: 'Close mechanical gaps and re-grade.' },
];

/** How many of the six phases are fully complete, given the wizard's state.phase. */
export function completedCount(phase: Phase | undefined): number {
  switch (phase) {
    case 'imported':
      return 1;
    case 'schemas_done':
      return 2;
    case 'rai_done':
      return 3;
    case 'provenance_tracked':
      return 4;
    case 'graded':
      return 5;
    case 'improved':
      return 6;
    default:
      // init / metadata_captured / manifest_built / undefined => Import still in progress
      return 0;
  }
}

export type StepStatus = 'done' | 'active' | 'todo';

export function stepStatus(phase: Phase | undefined, index: number): StepStatus {
  const done = completedCount(phase);
  if (index < done) return 'done';
  if (index === done) return 'active';
  return 'todo';
}
