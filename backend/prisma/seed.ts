// ============================================
// Prisma Seed — Default data for HSG Judge
// ============================================

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Seed Categories (Phân loại thuật toán) ──────

  const categories = [
    {
      name: 'Greedy',
      nameVi: 'Tham lam',
      slug: 'greedy',
      color: '#10B981',
      icon: 'Zap',
      sortOrder: 1,
    },
    {
      name: 'Dynamic Programming',
      nameVi: 'Quy hoạch động',
      slug: 'dynamic-programming',
      color: '#8B5CF6',
      icon: 'Layers',
      sortOrder: 2,
    },
    {
      name: 'Graph',
      nameVi: 'Đồ thị',
      slug: 'graph',
      color: '#3B82F6',
      icon: 'GitBranch',
      sortOrder: 3,
    },
    {
      name: 'Data Structures',
      nameVi: 'Cấu trúc dữ liệu',
      slug: 'data-structures',
      color: '#F59E0B',
      icon: 'Database',
      sortOrder: 4,
    },
    {
      name: 'String',
      nameVi: 'Xử lý chuỗi',
      slug: 'string',
      color: '#EC4899',
      icon: 'Type',
      sortOrder: 5,
    },
    {
      name: 'Math',
      nameVi: 'Toán học',
      slug: 'math',
      color: '#6366F1',
      icon: 'Calculator',
      sortOrder: 6,
    },
    {
      name: 'Sorting & Searching',
      nameVi: 'Sắp xếp & Tìm kiếm',
      slug: 'sorting-searching',
      color: '#14B8A6',
      icon: 'ArrowUpDown',
      sortOrder: 7,
    },
    {
      name: 'Divide and Conquer',
      nameVi: 'Chia để trị',
      slug: 'divide-and-conquer',
      color: '#F97316',
      icon: 'Scissors',
      sortOrder: 8,
    },
    {
      name: 'Recursion & Backtracking',
      nameVi: 'Đệ quy & Quay lui',
      slug: 'recursion-backtracking',
      color: '#EF4444',
      icon: 'RotateCcw',
      sortOrder: 9,
    },
    {
      name: 'Number Theory',
      nameVi: 'Số học',
      slug: 'number-theory',
      color: '#84CC16',
      icon: 'Hash',
      sortOrder: 10,
    },
    {
      name: 'Geometry',
      nameVi: 'Hình học',
      slug: 'geometry',
      color: '#06B6D4',
      icon: 'Triangle',
      sortOrder: 11,
    },
    {
      name: 'Two Pointers',
      nameVi: 'Hai con trỏ',
      slug: 'two-pointers',
      color: '#A855F7',
      icon: 'Pointer',
      sortOrder: 12,
    },
    {
      name: 'Binary Search',
      nameVi: 'Tìm kiếm nhị phân',
      slug: 'binary-search',
      color: '#0EA5E9',
      icon: 'Search',
      sortOrder: 13,
    },
    {
      name: 'Tree',
      nameVi: 'Cây',
      slug: 'tree',
      color: '#22C55E',
      icon: 'Network',
      sortOrder: 14,
    },
    {
      name: 'Segment Tree & BIT',
      nameVi: 'Segment Tree & BIT',
      slug: 'segment-tree-bit',
      color: '#E11D48',
      icon: 'BarChart3',
      sortOrder: 15,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log(`  ✅ ${categories.length} categories seeded`);

  // ── 2. Seed Demo Users ─────────────────────────────

  const demoTeacher = await prisma.user.upsert({
    where: { email: 'teacher@hsgjudge.local' },
    update: {},
    create: {
      supabaseId: 'demo-teacher-supabase-id',
      email: 'teacher@hsgjudge.local',
      displayName: 'Thầy Giáo Demo',
      role: UserRole.TEACHER,
    },
  });
  console.log(`  ✅ Demo teacher: ${demoTeacher.email}`);

  const demoStudent = await prisma.user.upsert({
    where: { email: 'student@hsgjudge.local' },
    update: {},
    create: {
      supabaseId: 'demo-student-supabase-id',
      email: 'student@hsgjudge.local',
      displayName: 'Học Sinh Demo',
      role: UserRole.STUDENT,
    },
  });
  console.log(`  ✅ Demo student: ${demoStudent.email}`);

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
