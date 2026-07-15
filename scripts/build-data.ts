import { ingestXC1 } from './ingest/xc1.ts'
import { ingestXC2 } from './ingest-xc2.ts'

async function main() {
  await ingestXC1()
  await ingestXC2()
}

main().catch((err) => {
  console.error('Data ingestion failed:', err)
  process.exit(1)
})
