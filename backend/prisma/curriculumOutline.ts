/**
 * Sangyin curriculum OUTLINE — topic names and "learners can…" statements written by Sangyin in our own words.
 *
 * Nothing here is copied from an NCDC syllabus or a Cambridge curriculum framework: both are copyright, and
 * reproducing them needs the publisher's permission. Topic names and the order of topics are the structure
 * the AI features align to. Official objective codes and wording are added per school (Curriculum page) or,
 * once permission is granted, centrally.
 *
 * Topic names match the skills Sangyin scores students on (Competency table), so assessments, guidance
 * and the AI prompts can link a gap like "Ratio and Proportion" to its curriculum topic.
 * Teachers should review this outline against the official documents they hold.
 */

export interface OutlineTopic {
  name: string
  description: string
  statements: string[]
}
export interface OutlineLevel {
  id: string
  name: string
  stage: string
  grade: number
}

// How large the numbers are at each grade (P4 / Stage 4 = 4, and so on).
const numbersUpTo = (g: number) => (g <= 4 ? '100 000' : g === 5 ? '1 000 000' : g === 6 ? '10 000 000' : 'any size')

function mathsTopics(framework: 'uganda' | 'cambridge', g: number): OutlineTopic[] {
  const strand = (name: string) => (framework === 'cambridge' ? ` (${name} strand)` : '')
  const topics: (OutlineTopic | false)[] = [
    framework === 'uganda' && {
      name: 'Sets',
      description: 'Grouping things, describing groups and showing them in diagrams.',
      statements: g <= 5
        ? ['Describes and lists the members of a set, including empty and equal sets.', 'Shows sets and their intersection in Venn diagrams.']
        : ['Uses Venn diagrams to find the union, intersection and complement of sets.', 'Solves word problems using two- and three-set Venn diagrams.'],
    },
    {
      name: 'Whole Numbers',
      description: `Place value, reading and writing numbers, and the four operations${strand('Number')}.`,
      statements: [
        `Reads, writes and orders whole numbers up to ${numbersUpTo(g)} using place value.`,
        g <= 5 ? 'Adds, subtracts, multiplies and divides whole numbers, including word problems with money.' : 'Uses factors, multiples, primes, LCM and HCF to solve problems.',
        g >= 6 ? 'Rounds numbers sensibly and estimates answers to check calculations.' : 'Rounds numbers to the nearest ten, hundred and thousand.',
      ],
    },
    g >= 7 && framework === 'cambridge' && {
      name: 'Integers',
      description: 'Positive and negative numbers, powers and roots (Number strand).',
      statements: ['Adds, subtracts, multiplies and divides positive and negative numbers.', 'Uses squares, cubes, square roots and simple powers.'],
    },
    g >= 6 && framework === 'uganda' && {
      name: 'Integers',
      description: 'Positive and negative numbers on a number line.',
      statements: ['Places positive and negative numbers on a number line and compares them.', 'Adds and subtracts integers, including temperature and money problems.'],
    },
    g <= 6 && {
      name: 'Patterns and Sequences',
      description: `Number patterns, sequences and simple rules${strand('Number')}.`,
      statements: ['Continues number and shape patterns and describes the rule in words.', g >= 5 ? 'Finds missing terms and uses a rule to work out later terms.' : 'Counts on and back in steps of 2, 5, 10, 100 and other numbers.'],
    },
    {
      name: 'Fractions',
      description: `Parts of a whole, equivalent fractions and operations on fractions${strand('Number')}.`,
      statements: g <= 4
        ? ['Names, compares and orders simple fractions using diagrams.', 'Finds equivalent fractions and adds fractions with the same denominator.']
        : g <= 6
          ? ['Simplifies fractions and changes between mixed numbers and improper fractions.', 'Adds and subtracts fractions with different denominators.', 'Finds a fraction of a quantity, including word problems.']
          : ['Multiplies and divides fractions and mixed numbers.', 'Solves multi-step problems with fractions in real contexts.'],
    },
    (framework === 'cambridge' || g >= 5) && {
      name: 'Decimals',
      description: `Decimal place value and operations on decimals${strand('Number')}.`,
      statements: [
        g <= 5 ? 'Reads, writes and orders decimals with tenths and hundredths.' : 'Reads, writes and orders decimals with up to three decimal places.',
        g <= 5 ? 'Adds and subtracts decimals, including money.' : 'Multiplies and divides decimals and rounds to a given number of decimal places.',
        'Changes between simple fractions and decimals.',
      ],
    },
    ((framework === 'uganda' && g >= 6) || (framework === 'cambridge' && g >= 5)) && {
      name: 'Percentages',
      description: `Percentages and their link to fractions and decimals${strand('Number')}.`,
      statements: g <= 6
        ? ['Changes between fractions, decimals and percentages.', 'Finds a percentage of a quantity, such as 10% or 25% of an amount.']
        : ['Calculates percentage increase and decrease, discounts and profit or loss.', 'Expresses one quantity as a percentage of another.'],
    },
    g >= 6 && {
      name: 'Ratio and Proportion',
      description: `Comparing quantities and sharing in a ratio${strand('Number')}.`,
      statements: g <= 6
        ? ['Writes the ratio of two quantities in the correct order and simplifies it.', 'Shares a quantity in a given ratio.', 'Solves simple proportion problems, such as recipes and prices.']
        : ['Uses ratio and direct proportion, including map scales and rates.', 'Solves problems involving inverse proportion.'],
    },
    ((framework === 'uganda' && g >= 5) || (framework === 'cambridge' && g >= 7)) && {
      name: 'Algebra',
      description: `Using letters for unknown numbers, expressions and equations${strand('Algebra')}.`,
      statements: g <= 5
        ? ['Uses a letter or box for an unknown number and finds its value.', 'Simplifies expressions by collecting like terms.']
        : ['Forms and simplifies algebraic expressions, including brackets.', 'Solves linear equations and uses formulae in context.'],
    },
    {
      name: 'Geometry',
      description: `Lines, angles, shapes and their properties${strand('Geometry and Measure')}.`,
      statements: g <= 5
        ? ['Identifies and describes 2D shapes and 3D objects by their properties.', 'Recognises right angles and compares angles.']
        : ['Measures and draws angles and uses angle facts on lines and in triangles.', g >= 7 ? 'Uses properties of polygons, transformations and constructions.' : 'Constructs simple shapes using a ruler, protractor and compasses.'],
    },
    {
      name: 'Measurement',
      description: `Length, mass, capacity, time, money, perimeter and area${strand('Geometry and Measure')}.`,
      statements: [
        'Measures and converts between units of length, mass and capacity.',
        g <= 5 ? 'Reads and calculates time, including the 12- and 24-hour clock.' : 'Calculates perimeter, area and volume of common shapes.',
        g >= 6 ? 'Solves problems about time, speed and money in everyday contexts.' : 'Solves problems involving money and simple shopping.',
      ],
    },
    {
      name: framework === 'cambridge' ? 'Statistics' : 'Data Handling',
      description: `Collecting, showing and interpreting data${strand('Statistics and Probability')}.`,
      statements: [g <= 5 ? 'Collects data and shows it in tables, pictographs and bar graphs.' : 'Draws and interprets bar graphs, line graphs and pie charts.', g >= 6 ? 'Finds and compares the mean, median, mode and range.' : 'Answers questions by reading information from graphs and tables.'],
    },
    framework === 'cambridge' && g >= 5 && {
      name: 'Probability',
      description: 'How likely events are (Statistics and Probability strand).',
      statements: [g <= 6 ? 'Describes how likely events are using words such as likely and impossible.' : 'Finds probabilities of simple events as fractions, decimals or percentages.'],
    },
  ]
  return topics.filter((t): t is OutlineTopic => Boolean(t))
}

function englishTopics(framework: 'uganda' | 'cambridge', g: number): OutlineTopic[] {
  const strand = (name: string) => (framework === 'cambridge' ? ` (${name} strand)` : '')
  return [
    {
      name: 'Reading Comprehension',
      description: `Understanding and responding to what is read${strand('Reading')}.`,
      statements: [
        'Finds information and main ideas in a text and answers questions about it.',
        g <= 5 ? 'Explains why something happened in a story using clues in the text.' : 'Makes inferences about characters, feelings and the writer’s purpose.',
        g >= 7 ? 'Compares texts and explains how language and structure affect the reader.' : 'Reads aloud with accuracy and expression.',
      ],
    },
    {
      name: 'Grammar',
      description: `Sentence structure, tenses and punctuation${strand('Writing')}.`,
      statements: [
        g <= 5 ? 'Uses correct tenses, subject–verb agreement and basic punctuation.' : 'Uses a range of tenses, conjunctions and complex sentences correctly.',
        g >= 6 ? 'Changes sentences between direct and reported speech and active and passive voice.' : 'Joins sentences using common linking words.',
      ],
    },
    {
      name: 'Composition Writing',
      description: `Planning and writing stories, letters and other texts${strand('Writing')}.`,
      statements: [
        'Plans and writes organised texts with a beginning, middle and end.',
        g <= 5 ? 'Writes simple letters, descriptions and short stories.' : 'Writes letters, reports, compositions and persuasive texts for a purpose and audience.',
        g >= 6 ? 'Uses paragraphs and varied vocabulary to make writing clear and interesting.' : 'Uses capital letters, full stops and paragraphs.',
      ],
    },
    {
      name: 'Vocabulary and Spelling',
      description: `Building and using words accurately${strand('Writing')}.`,
      statements: ['Learns and uses new words in context, including synonyms and opposites.', g <= 5 ? 'Spells common words correctly using spelling patterns.' : 'Uses prefixes, suffixes and dictionaries to spell and understand words.'],
    },
    {
      name: 'Listening and Speaking',
      description: `Listening carefully and speaking clearly${strand('Speaking and Listening')}.`,
      statements: ['Listens to instructions and stories and responds appropriately.', g <= 5 ? 'Speaks clearly to describe, explain and ask questions.' : 'Takes part in discussions and debates, giving reasons for views.'],
    },
  ]
}

export const FRAMEWORK_META = {
  uganda: { levels: [
    { id: 'ug-p4', name: 'Primary 4', stage: 'Primary', grade: 4 },
    { id: 'ug-p5', name: 'Primary 5', stage: 'Primary', grade: 5 },
    { id: 'ug-p6', name: 'Primary 6', stage: 'Primary', grade: 6 },
    { id: 'ug-p7', name: 'Primary 7', stage: 'Primary', grade: 7 },
  ] satisfies OutlineLevel[] },
  cambridge: { levels: [
    { id: 'cam-p4', name: 'Stage 4', stage: 'Primary', grade: 4 },
    { id: 'cam-p5', name: 'Stage 5', stage: 'Primary', grade: 5 },
    { id: 'cam-p6', name: 'Stage 6', stage: 'Primary', grade: 6 },
    { id: 'cam-ls7', name: 'Stage 7', stage: 'Lower Secondary', grade: 7 },
    { id: 'cam-ls8', name: 'Stage 8', stage: 'Lower Secondary', grade: 8 },
    { id: 'cam-ls9', name: 'Stage 9', stage: 'Lower Secondary', grade: 9 },
  ] satisfies OutlineLevel[] },
} as const

/** The full outline: per framework and level, Mathematics and English topics. */
export function buildOutline() {
  return (['uganda', 'cambridge'] as const).map((framework) => ({
    framework,
    levels: FRAMEWORK_META[framework].levels.map((level) => ({
      ...level,
      subjects: [
        { id: `${level.id}-math`, name: 'Mathematics', topics: mathsTopics(framework, level.grade) },
        { id: `${level.id}-eng`, name: 'English', topics: englishTopics(framework, level.grade) },
      ],
    })),
  }))
}
