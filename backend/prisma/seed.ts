import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const password = 'test123?';
  const passwordHash = await bcrypt.hash(password, 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: {
      email: 'alice@test.com',
      handle: 'alice',
      passwordHash,
      displayName: 'Alice',
      avatarColor: '#06b6d4',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@test.com' },
    update: {
      passwordHash,
      displayName: 'Bob',
      avatarColor: '#ec4899',
    },
    create: {
      email: 'bob@test.com',
      handle: 'bob',
      passwordHash,
      displayName: 'Bob',
      avatarColor: '#ec4899',
    },
  });

  console.log('Created users:', { user1, user2 });
  console.log('\nTest credentials:');
  console.log('User 1: alice@test.com / test123?');
  console.log('User 2: bob@test.com / test123?');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
