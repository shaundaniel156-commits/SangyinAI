import type { PrismaClient } from '../src/generated/prisma/client.ts'
import { buildOutline } from './curriculumOutline.ts'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * Loads Sangyin's own curriculum outline (prisma/curriculumOutline.ts) into the curriculum tables.
 * Safe to run again: it adds or updates the outline's levels, topics and statements.
 * It removes old placeholder topics whose only objectives were "DEMO-" codes, and never touches
 * objectives a school added itself.
 */
export async function importCurriculumOutline(prisma: PrismaClient) {
  const outline = buildOutline()
  const topicIds = new Set<string>()
  let topics = 0
  let statements = 0

  for (const { framework, levels } of outline) {
    for (const [li, level] of levels.entries()) {
      await prisma.curriculumLevel.upsert({
        where: { id: level.id },
        update: { framework, name: level.name, stage: level.stage, position: li },
        create: { id: level.id, framework, name: level.name, stage: level.stage, position: li },
      })
      let ti = 0
      for (const [si, subject] of level.subjects.entries()) {
        await prisma.curriculumSubject.upsert({ where: { id: subject.id }, update: { levelId: level.id, name: subject.name, position: si }, create: { id: subject.id, levelId: level.id, name: subject.name, position: si } })
        for (const topic of subject.topics) {
          const topicId = `${subject.id}-${slug(topic.name)}`
          topicIds.add(topicId)
          const data = { levelId: level.id, subjectId: subject.id, name: topic.name, description: topic.description, position: ti++ }
          await prisma.curriculumTopic.upsert({ where: { id: topicId }, update: data, create: { id: topicId, ...data } })
          topics++
          for (const [ci, text] of topic.statements.entries()) {
            const id = `${topicId}-${ci + 1}`
            await prisma.curriculumCompetency.upsert({ where: { id }, update: { name: text, position: ci }, create: { id, topicId, name: text, position: ci } })
            statements++
          }
          // A statement removed from the outline goes too, unless a school has attached objectives to it.
          await prisma.curriculumCompetency.deleteMany({ where: { topicId, position: { gte: topic.statements.length }, objectives: { none: { schoolId: { not: null } } } } })
        }
      }
    }
  }

  // Placeholder demo content: shared "DEMO-" objectives, then old topics that no school uses.
  const demo = await prisma.learningObjective.deleteMany({ where: { schoolId: null, code: { startsWith: 'DEMO-' } } })
  const old = await prisma.curriculumTopic.deleteMany({ where: { id: { notIn: [...topicIds] }, level: { schoolId: null }, competencies: { none: { objectives: { some: { schoolId: { not: null } } } } } } })

  // Levels outside the outline (e.g. Senior 1, IGCSE) stay, listed after the outline's levels.
  for (const { framework, levels } of outline) {
    const extra = await prisma.curriculumLevel.findMany({ where: { framework, schoolId: null, id: { notIn: levels.map((l) => l.id) } }, orderBy: { position: 'asc' } })
    for (const [i, level] of extra.entries()) await prisma.curriculumLevel.update({ where: { id: level.id }, data: { position: levels.length + i } })
  }

  return { topics, statements, removedDemoObjectives: demo.count, removedOldTopics: old.count }
}
