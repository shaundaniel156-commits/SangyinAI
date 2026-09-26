/**
 * DEMO DATA — illustrative curriculum structure.
 *
 * IMPORTANT: This is NOT official NCDC (Uganda) or Cambridge International
 * content. It is a small, clearly labelled placeholder used only to demonstrate
 * the Framework → Level → Subject → Topic → Competency → Learning Objective
 * hierarchy in the UI. Codes are prefixed "DEMO-". The real, expert-reviewed
 * curriculum mapping will be loaded later.
 */
import type { CurriculumFramework, CurriculumFrameworkData } from '../types'

export const CURRICULUM_DISCLAIMER =
  'Illustrative demo structure only — not official NCDC or Cambridge International curriculum content.'

export const CURRICULUM_FRAMEWORKS: CurriculumFrameworkData[] = [
  {
    id: 'uganda',
    name: 'Uganda National Curriculum',
    shortName: 'NCDC',
    description: 'Competency-based framework used in government-aided and many private schools in Uganda. Guidance maps to NCDC learning outcomes and supports UNEB assessment objectives for exam preparation.',
    levels: [
      {
        id: 'ug-p6',
        name: 'Primary 6',
        stage: 'Primary',
        subjects: [
          {
            id: 'ug-p6-math',
            name: 'Mathematics',
            topics: [
              {
                id: 'ug-p6-math-rp',
                name: 'Ratio and Proportion',
                competencies: [
                  {
                    id: 'ug-p6-rp-1',
                    name: 'Expresses relationships between quantities as ratios',
                    objectives: [
                      { id: 'o1', code: 'DEMO-UG-P6-M-RP-01', text: 'Write a ratio to compare two quantities.' },
                      { id: 'o2', code: 'DEMO-UG-P6-M-RP-02', text: 'Simplify a ratio to its simplest form.' },
                    ],
                  },
                  {
                    id: 'ug-p6-rp-2',
                    name: 'Solves simple proportion problems',
                    objectives: [
                      { id: 'o3', code: 'DEMO-UG-P6-M-RP-03', text: 'Share a quantity in a given ratio.' },
                    ],
                  },
                ],
              },
              {
                id: 'ug-p6-math-pc',
                name: 'Percentages',
                competencies: [
                  {
                    id: 'ug-p6-pc-1',
                    name: 'Relates fractions and percentages',
                    objectives: [
                      { id: 'o4', code: 'DEMO-UG-P6-M-PC-01', text: 'Convert simple fractions to percentages.' },
                      { id: 'o5', code: 'DEMO-UG-P6-M-PC-02', text: 'Find a percentage of a quantity.' },
                    ],
                  },
                ],
              },
              {
                id: 'ug-p6-math-fr',
                name: 'Fractions',
                competencies: [
                  {
                    id: 'ug-p6-fr-1',
                    name: 'Works with equivalent fractions',
                    objectives: [
                      { id: 'o6', code: 'DEMO-UG-P6-M-FR-01', text: 'Identify equivalent fractions.' },
                    ],
                  },
                ],
              },
            ],
          },
          { id: 'ug-p6-eng', name: 'English', topics: [] },
        ],
      },
      { id: 'ug-p7', name: 'Primary 7', stage: 'Primary', subjects: [] },
      { id: 'ug-s1', name: 'Senior 1', stage: 'Lower Secondary', subjects: [] },
    ],
  },
  {
    id: 'cambridge',
    name: 'Cambridge International Curriculum',
    shortName: 'Cambridge',
    description: 'International framework used by schools running Cambridge programmes and examinations (Primary, Lower Secondary and IGCSE). Guidance maps to Cambridge learning and assessment objectives.',
    levels: [
      {
        id: 'cam-ls7',
        name: 'Stage 7',
        stage: 'Lower Secondary',
        subjects: [
          {
            id: 'cam-ls7-math',
            name: 'Mathematics',
            topics: [
              {
                id: 'cam-ls7-math-rp',
                name: 'Ratio and Proportion',
                competencies: [
                  {
                    id: 'cam-ls7-rp-1',
                    name: 'Uses ratio notation',
                    objectives: [
                      { id: 'c1', code: 'DEMO-CAM-7-M-RP-01', text: 'Use ratio notation and simplify ratios.' },
                      { id: 'c2', code: 'DEMO-CAM-7-M-RP-02', text: 'Divide a quantity into a given ratio.' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: 'cam-p6', name: 'Stage 6', stage: 'Primary', subjects: [] },
      { id: 'cam-igcse', name: 'IGCSE', stage: 'Upper Secondary', subjects: [] },
    ],
  },
]

export function getFramework(id: CurriculumFramework): CurriculumFrameworkData {
  return CURRICULUM_FRAMEWORKS.find((f) => f.id === id)!
}

export const FRAMEWORK_LABEL: Record<CurriculumFramework, string> = {
  uganda: 'Uganda National Curriculum',
  cambridge: 'Cambridge International',
}
