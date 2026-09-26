/**
 * DEMO DATA — prerequisite links between curriculum topics (the knowledge graph
 * the diagnostic engine uses to trace a gap back to earlier foundations).
 * Illustrative only; the expert-reviewed graph will be loaded later.
 */
export const TOPIC_PREREQUISITES: Record<string, string[]> = {
  Fractions: ['Whole Numbers'],
  Decimals: ['Whole Numbers', 'Fractions'],
  Percentages: ['Fractions', 'Decimals'],
  'Ratio and Proportion': ['Fractions', 'Whole Numbers'],
  Measurement: ['Whole Numbers', 'Decimals'],
  Grammar: ['Reading Comprehension'],
  'Composition Writing': ['Grammar', 'Reading Comprehension'],
}
