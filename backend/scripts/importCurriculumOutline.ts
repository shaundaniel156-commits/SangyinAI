import { importCurriculumOutline } from '../prisma/importOutline.ts'
import { prisma } from '../src/db/client.ts'

// Loads (or updates) Sangyin's curriculum outline in the database. Run from backend: npm run curriculum:outline
const result = await importCurriculumOutline(prisma)
console.log(`Curriculum outline loaded: ${result.topics} topics, ${result.statements} statements. Removed ${result.removedDemoObjectives} placeholder DEMO objectives and ${result.removedOldTopics} old placeholder topics.`)
await prisma.$disconnect()
