import {
  ingestFutureRedeemed,
  ingestTorna,
  ingestXC2,
  ingestXC3,
} from './ingest-multi.ts'

async function main() {
  await ingestXC2()
  await ingestTorna()
  await ingestXC3()
  await ingestFutureRedeemed()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
