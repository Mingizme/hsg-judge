const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emu = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'daoducminhpc@gmail.com' },
        { displayName: 'Emu' },
      ],
    },
  });

  if (emu) {
    const res = await prisma.submission.updateMany({
      data: { userId: emu.id },
    });
    console.log(`✅ Successfully linked ${res.count} submissions to user ${emu.displayName} (${emu.email})`);
  } else {
    console.log('User Emu not found');
  }
}

main().finally(() => prisma.$disconnect());
