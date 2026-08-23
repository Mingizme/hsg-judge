const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.problem.update({
    where: { code: 'TAOXAU' },
    data: {
      pdfUrl: 'https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs/problems/TAOXAU/TAOXAU.pdf',
      pdfStoragePath: 'problems/TAOXAU/TAOXAU.pdf',
    },
  });
  console.log('✅ Updated TAOXAU pdfUrl to correct TAOXAU.pdf');
}

main().finally(() => prisma.$disconnect());
