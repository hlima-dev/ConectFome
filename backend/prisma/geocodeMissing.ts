// Preenche latitude/longitude dos doadores e receptores que já existiam antes
// da geocodificação (ou cujo endereço falhou antes). Uso: npm run db:geocode
// Respeita o limite de 1 requisição por segundo do Nominatim, então com muitos
// cadastros leva alguns minutos.
import { PrismaClient } from '@prisma/client'
import { GeocodingService } from '../src/services/GeocodingService'

const prisma = new PrismaClient()

async function main() {
  const geocoder = new GeocodingService({ enabled: true })

  for (const kind of ['donor', 'recipient'] as const) {
    const rows =
      kind === 'donor'
        ? await prisma.donor.findMany({ where: { active: true, latitude: null } })
        : await prisma.recipient.findMany({ where: { active: true, latitude: null } })

    let ok = 0
    let skipped = 0
    for (const row of rows) {
      const coordinates = await geocoder.geocode(row)
      if (!coordinates) {
        skipped++
        console.log(`  - sem coordenadas: ${row.name} (endereço incompleto ou não encontrado)`)
        continue
      }
      const data = { latitude: coordinates.latitude, longitude: coordinates.longitude }
      if (kind === 'donor') await prisma.donor.update({ where: { id: row.id }, data })
      else await prisma.recipient.update({ where: { id: row.id }, data })
      ok++
    }
    console.log(`${kind}: ${ok} geocodificados, ${skipped} sem coordenadas, de ${rows.length}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
