/**
 * DEMO DATA — question bank the simulated AI generator draws from, keyed by
 * competency name. When a real model is connected it will write questions
 * instead; the shape (AiQuestion without id/competency) stays the same.
 */
import type { AiQuestion } from '../types'

export type BankQuestion = Omit<AiQuestion, 'id' | 'competency'>

const mc = (sourceId: string, difficulty: BankQuestion['difficulty'], prompt: string, options: string[], answer: string, explanation: string): BankQuestion => ({
  sourceId,
  type: 'multiple_choice',
  difficulty,
  prompt,
  options,
  answer,
  explanation,
})

const sa = (sourceId: string, difficulty: BankQuestion['difficulty'], prompt: string, answer: string, explanation: string): BankQuestion => ({
  sourceId,
  type: 'short_answer',
  difficulty,
  prompt,
  answer,
  explanation,
})

export const AI_QUESTION_BANK: Record<string, BankQuestion[]> = {
  'Ratio and Proportion': [
    mc('rp-1', 'foundation', 'In a bag there are 2 red beads for every 3 blue beads. What is the ratio of red to blue beads?', ['2 : 3', '3 : 2', '2 : 5', '5 : 2'], '2 : 3', 'The ratio keeps the order given: red first (2), then blue (3).'),
    mc('rp-2', 'foundation', 'Which ratio is the same as 4 : 8 in its simplest form?', ['1 : 2', '2 : 1', '4 : 2', '1 : 4'], '1 : 2', 'Divide both parts by 4, the highest common factor.'),
    sa('rp-3', 'core', 'A recipe uses 3 cups of flour for every 1 cup of sugar. How many cups of flour are needed for 4 cups of sugar?', '12', 'Multiply both parts of 3 : 1 by 4 to get 12 : 4.'),
    mc('rp-4', 'core', 'Share 20 sweets between Amina and Tom in the ratio 3 : 2. How many does Amina get?', ['12', '8', '10', '15'], '12', '3 + 2 = 5 parts; 20 ÷ 5 = 4 per part; Amina gets 3 × 4 = 12.'),
    sa('rp-5', 'stretch', 'A map scale is 1 : 50 000. Two villages are 6 cm apart on the map. How far apart are they in kilometres?', '3', '6 × 50 000 = 300 000 cm = 3 000 m = 3 km.'),
    mc('rp-6', 'stretch', 'If 5 exercise books cost 4 500 shillings, how much do 8 books cost?', ['7 200', '6 000', '9 000', '5 600'], '7 200', 'One book costs 4 500 ÷ 5 = 900; 8 × 900 = 7 200 shillings.'),
  ],
  Percentages: [
    mc('pc-1', 'foundation', 'What is 50% of 30?', ['15', '20', '5', '25'], '15', '50% means one half; half of 30 is 15.'),
    mc('pc-2', 'foundation', 'Which fraction is equal to 25%?', ['1/4', '1/2', '1/5', '2/5'], '1/4', '25 out of 100 simplifies to 1/4.'),
    sa('pc-3', 'core', 'Find 10% of 450.', '45', 'Divide by 10 to find 10%.'),
    mc('pc-4', 'core', 'A shirt costs 20 000 shillings. It is reduced by 20%. What is the new price?', ['16 000', '18 000', '4 000', '12 000'], '16 000', '20% of 20 000 is 4 000; 20 000 − 4 000 = 16 000.'),
    sa('pc-5', 'stretch', 'Out of 40 pupils, 26 walk to school. What percentage walk?', '65', '26 ÷ 40 = 0.65 = 65%.'),
    mc('pc-6', 'stretch', 'A price rises from 800 to 1 000 shillings. What is the percentage increase?', ['25%', '20%', '200%', '80%'], '25%', 'Increase 200 ÷ original 800 = 0.25 = 25%.'),
  ],
  Fractions: [
    mc('fr-1', 'foundation', 'Which fraction is equivalent to 1/2?', ['3/6', '2/3', '1/3', '2/5'], '3/6', 'Multiply top and bottom of 1/2 by 3.'),
    sa('fr-2', 'foundation', 'Write 6/8 in its simplest form.', '3/4', 'Divide numerator and denominator by 2.'),
    mc('fr-3', 'core', 'What is 1/3 + 1/6?', ['1/2', '2/9', '1/9', '2/6'], '1/2', '1/3 = 2/6; 2/6 + 1/6 = 3/6 = 1/2.'),
    sa('fr-4', 'core', 'What is 3/4 of 24?', '18', '24 ÷ 4 = 6; 6 × 3 = 18.'),
    mc('fr-5', 'stretch', 'Which is largest: 2/3, 3/5 or 5/8?', ['2/3', '3/5', '5/8', 'They are equal'], '2/3', 'As decimals: 0.667, 0.6, 0.625.'),
    sa('fr-6', 'stretch', 'Calculate 2 1/2 × 1/5. Give your answer as a fraction.', '1/2', '2 1/2 = 5/2; 5/2 × 1/5 = 5/10 = 1/2.'),
  ],
  Decimals: [
    mc('de-1', 'foundation', 'What is the value of the digit 7 in 3.47?', ['7 hundredths', '7 tenths', '7 ones', '7 thousandths'], '7 hundredths', 'The second place after the point is hundredths.'),
    sa('de-2', 'foundation', 'Write 0.5 as a fraction in its simplest form.', '1/2', '0.5 = 5/10 = 1/2.'),
    mc('de-3', 'core', 'What is 2.4 + 1.75?', ['4.15', '3.99', '4.05', '3.15'], '4.15', 'Line up the decimal points: 2.40 + 1.75 = 4.15.'),
    sa('de-4', 'core', 'Round 6.382 to one decimal place.', '6.4', 'The hundredths digit is 8, so round the tenths up.'),
    mc('de-5', 'stretch', 'What is 0.3 × 0.4?', ['0.12', '1.2', '0.012', '0.7'], '0.12', '3 × 4 = 12, with two decimal places in total.'),
    sa('de-6', 'stretch', 'Order from smallest to largest: 0.45, 0.405, 0.5', '0.405, 0.45, 0.5', 'Compare with the same number of places: 0.405, 0.450, 0.500.'),
  ],
  'Whole Numbers': [
    mc('wn-1', 'foundation', 'What is the value of 6 in 46 215?', ['6 000', '600', '60 000', '60'], '6 000', '6 is in the thousands place.'),
    sa('wn-2', 'foundation', 'Round 3 748 to the nearest hundred.', '3 700', 'The tens digit is 4, so round down.'),
    mc('wn-3', 'core', 'What is 125 × 8?', ['1 000', '800', '1 250', '925'], '1 000', '125 × 8 = 1 000.'),
    sa('wn-4', 'core', 'Find the product of the first three prime numbers.', '30', '2 × 3 × 5 = 30.'),
    mc('wn-5', 'stretch', 'What is the lowest common multiple of 6 and 8?', ['24', '48', '14', '12'], '24', 'Multiples of 8: 8, 16, 24 — 24 is also a multiple of 6.'),
    sa('wn-6', 'stretch', 'A school has 1 248 pupils shared equally into 32 classes. How many pupils are in each class?', '39', '1 248 ÷ 32 = 39.'),
  ],
  Measurement: [
    mc('me-1', 'foundation', 'How many centimetres are in 2 metres?', ['200', '20', '2 000', '0.2'], '200', '1 m = 100 cm.'),
    sa('me-2', 'foundation', 'Convert 3 kg to grams.', '3 000', '1 kg = 1 000 g.'),
    mc('me-3', 'core', 'A rectangle is 8 cm long and 5 cm wide. What is its perimeter?', ['26 cm', '40 cm', '13 cm', '18 cm'], '26 cm', '2 × (8 + 5) = 26 cm.'),
    sa('me-4', 'core', 'Find the area of a square with sides of 7 cm (in cm²).', '49', '7 × 7 = 49 cm².'),
    mc('me-5', 'stretch', 'A tank holds 2.5 litres. How many 250 ml cups can it fill?', ['10', '100', '25', '5'], '10', '2.5 L = 2 500 ml; 2 500 ÷ 250 = 10.'),
    sa('me-6', 'stretch', 'A journey starts at 9:45 am and takes 2 hours 30 minutes. What time does it end?', '12:15 pm', '9:45 + 2:30 = 12:15.'),
  ],
  'Reading Comprehension': [
    mc('rc-1', 'foundation', '“Musa ran to the shop because it was about to close.” Why did Musa run?', ['The shop was about to close', 'He was late for school', 'He liked running', 'It was raining'], 'The shop was about to close', 'The word “because” gives the reason.'),
    mc('rc-2', 'foundation', 'Which word means the same as “enormous”?', ['huge', 'tiny', 'quick', 'quiet'], 'huge', 'Enormous means very large.'),
    sa('rc-3', 'core', '“The sky darkened and the wind began to howl.” What do you think will happen next?', 'It will rain / a storm will come', 'Dark skies and strong wind are clues that predict a storm.'),
    mc('rc-4', 'core', 'In a story, the main character helps a lost child find her mother. What is the main message?', ['Kindness to others', 'Always be fast', 'Never go shopping', 'Stay indoors'], 'Kindness to others', 'The theme is what the character’s actions teach us.'),
    sa('rc-5', 'stretch', '“Her smile did not reach her eyes.” What does this tell you about how she feels?', 'She is not really happy', 'The phrase suggests the smile is forced — an inference beyond the literal words.'),
    mc('rc-6', 'stretch', 'Which sentence is an opinion, not a fact?', ['Football is the best sport', 'Kampala is in Uganda', 'Water boils at 100 °C', 'A week has seven days'], 'Football is the best sport', 'An opinion cannot be proved true or false.'),
  ],
  Grammar: [
    mc('gr-1', 'foundation', 'Choose the correct word: “She ___ to school every day.”', ['walks', 'walk', 'walking', 'walked'], 'walks', 'A singular subject (she) takes “walks” in the present tense.'),
    mc('gr-2', 'foundation', 'Which word is a noun in “The tall boy kicked the ball”?', ['ball', 'tall', 'kicked', 'the'], 'ball', 'A noun names a thing.'),
    sa('gr-3', 'core', 'Write the past tense of “go”.', 'went', '“Go” is an irregular verb.'),
    mc('gr-4', 'core', 'Which sentence is punctuated correctly?', ['Where are you going?', 'where are you going?', 'Where are you going.', 'Where, are you going?'], 'Where are you going?', 'A capital letter to start and a question mark for a question.'),
    sa('gr-5', 'stretch', 'Join with “although”: “It was raining. We played outside.”', 'Although it was raining, we played outside.', '“Although” introduces the contrasting clause, followed by a comma.'),
    mc('gr-6', 'stretch', 'Change to reported speech: He said, “I am tired.”', ['He said that he was tired.', 'He said that I am tired.', 'He says he is tired.', 'He said he is tired now.'], 'He said that he was tired.', 'Pronoun and tense shift back in reported speech.'),
  ],
  'Composition Writing': [
    mc('wr-1', 'foundation', 'What should the first paragraph of a story do?', ['Introduce the characters and setting', 'Tell the ending', 'List new words', 'Give the moral only'], 'Introduce the characters and setting', 'Openings set the scene for the reader.'),
    sa('wr-2', 'foundation', 'Write one sentence that describes a market using at least two senses.', 'Answers will vary', 'Look for sight, sound, smell, taste or touch words.'),
    mc('wr-3', 'core', 'Which linking word shows time order?', ['Afterwards', 'However', 'Because', 'Although'], 'Afterwards', 'Time connectives help sequence events.'),
    sa('wr-4', 'core', 'Write a topic sentence for a paragraph about why we should keep our school clean.', 'Answers will vary', 'A topic sentence states the main idea of the paragraph.'),
    mc('wr-5', 'stretch', 'Which ending best suits a persuasive letter?', ['A clear call to action', 'A new character', 'A list of spellings', 'A question with no answer'], 'A clear call to action', 'Persuasive writing ends by asking the reader to act.'),
    sa('wr-6', 'stretch', 'Rewrite to make it more vivid: “The dog was big.”', 'Answers will vary', 'Use precise adjectives, comparisons or action verbs.'),
  ],
}
