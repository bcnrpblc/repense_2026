import { PrismaClient, GrupoRepense, ModeloCurso } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...\n');

  // Helper function to get next Monday
  function getNextMonday(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : 8 - day; // If Sunday, add 1; otherwise, add days until Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diff);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }

  // Helper function to get date N days ago
  function getDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  try {
    // Clean up existing seed data
    console.log('🧹 Cleaning up existing seed data...');
    
    // Find seed class IDs first
    const seedClasses = await prisma.class.findMany({
      where: {
        notion_id: {
          startsWith: 'seed-',
        },
      },
      select: {
        id: true,
      },
    });

    if (seedClasses.length > 0) {
      const seedClassIds = seedClasses.map((c) => c.id);

      // Delete in order (cascade will handle relationships)
      await prisma.attendance.deleteMany({
        where: {
          Session: {
            class_id: {
              in: seedClassIds,
            },
          },
        },
      });
      console.log('  ✓ Deleted seed Attendance records');

      await prisma.session.deleteMany({
        where: {
          class_id: {
            in: seedClassIds,
          },
        },
      });
      console.log('  ✓ Deleted seed Session records');

      await prisma.enrollment.deleteMany({
        where: {
          class_id: {
            in: seedClassIds,
          },
        },
      });
      console.log('  ✓ Deleted seed Enrollment records');

      await prisma.class.deleteMany({
        where: {
          id: {
            in: seedClassIds,
          },
        },
      });
      console.log('  ✓ Deleted seed Class records');
    } else {
      console.log('  ✓ No seed classes found to delete');
    }

    // Delete seed teachers (check if they have classes first)
    const seedTeacherEmails = ['joao@pgrepense.com', 'maria@pgrepense.com', 'pedro@pgrepense.com'];
    const seedTeachers = await prisma.teacher.findMany({
      where: {
        email: {
          in: seedTeacherEmails,
        },
      },
      select: {
        id: true,
      },
    });

    if (seedTeachers.length > 0) {
      // Only delete teachers if they don't have non-seed classes
      for (const teacher of seedTeachers) {
        const hasNonSeedClasses = await prisma.class.findFirst({
          where: {
            teacher_id: teacher.id,
            notion_id: {
              not: {
                startsWith: 'seed-',
              },
            },
          },
        });

        if (!hasNonSeedClasses) {
          await prisma.teacher.delete({
            where: { id: teacher.id },
          });
        }
      }
      console.log('  ✓ Deleted seed Teacher records (if no non-seed classes)');
    } else {
      console.log('  ✓ No seed teachers found to delete');
    }

    await prisma.admin.deleteMany({
      where: {
        email: 'admin@pgrepense.com',
      },
    });
    console.log('  ✓ Deleted seed Admin record');

    console.log('');

    // 1. Create Admin
    console.log('👤 Creating Admin account...');
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@pgrepense.com',
        password_hash: adminPasswordHash,
      },
    });
    console.log(`  ✓ Created admin: ${admin.email} (ID: ${admin.id})`);
    console.log('  📝 Login credentials: admin@pgrepense.com / Admin@123\n');

    // 2. Create Teachers
    console.log('👨‍🏫 Creating Teachers...');
    const teacherPasswordHash = await bcrypt.hash('Teacher@123', 10);
    const baseTimestamp = Date.now();

    const joao = await prisma.teacher.create({
      data: {
        id: `teacher-seed-${baseTimestamp}-1`,
        nome: 'João Silva',
        email: 'joao@pgrepense.com',
        password_hash: teacherPasswordHash,
        telefone: '19999991111',
        eh_ativo: true,
      },
    });
    console.log(`  ✓ Created teacher: ${joao.nome} (${joao.email})`);

    const maria = await prisma.teacher.create({
      data: {
        id: `teacher-seed-${baseTimestamp}-2`,
        nome: 'Maria Santos',
        email: 'maria@pgrepense.com',
        password_hash: teacherPasswordHash,
        telefone: '19999992222',
        eh_ativo: true,
      },
    });
    console.log(`  ✓ Created teacher: ${maria.nome} (${maria.email})`);

    const pedro = await prisma.teacher.create({
      data: {
        id: `teacher-seed-${baseTimestamp}-3`,
        nome: 'Pedro Costa',
        email: 'pedro@pgrepense.com',
        password_hash: teacherPasswordHash,
        telefone: '19999993333',
        eh_ativo: true,
      },
    });
    console.log(`  ✓ Created teacher: ${pedro.nome} (${pedro.email})`);
    console.log('  📝 All teachers use password: Teacher@123\n');

    // 3. Create Classes
    console.log('📚 Creating Classes...');
    const nextMonday = getNextMonday();
    const classBaseTimestamp = Date.now();

    // Igreja classes
    const igrejaOnline = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-1`,
        notion_id: 'seed-igreja-online-1',
        grupo_repense: GrupoRepense.Igreja,
        modelo: ModeloCurso.online,
        capacidade: 30,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: false,
        eh_mulheres: false,
        cidade: 'Indaiatuba',
        teacher_id: joao.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '19:00',
        link_whatsapp: 'https://chat.whatsapp.com/igreja-online',
      },
    });
    console.log(`  ✓ Created: ${igrejaOnline.grupo_repense} ${igrejaOnline.modelo} (Monday 19:00, Indaiatuba)`);

    const igrejaPresencial = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-2`,
        notion_id: 'seed-igreja-presencial-1',
        grupo_repense: GrupoRepense.Igreja,
        modelo: ModeloCurso.presencial,
        capacidade: 20,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: true,
        eh_mulheres: true,
        cidade: 'Itu',
        teacher_id: maria.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '16:00',
        link_whatsapp: 'https://chat.whatsapp.com/igreja-presencial',
      },
    });
    console.log(`  ✓ Created: ${igrejaPresencial.grupo_repense} ${igrejaPresencial.modelo} (Tuesday 16:00, Itu, Women-only)`);

    // Espiritualidade classes
    const espiritualidadeOnline = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-3`,
        notion_id: 'seed-espiritualidade-online-1',
        grupo_repense: GrupoRepense.Espiritualidade,
        modelo: ModeloCurso.online,
        capacidade: 25,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: false,
        eh_mulheres: false,
        cidade: 'Indaiatuba',
        teacher_id: pedro.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '20:00',
        link_whatsapp: 'https://chat.whatsapp.com/espiritualidade-online',
      },
    });
    console.log(`  ✓ Created: ${espiritualidadeOnline.grupo_repense} ${espiritualidadeOnline.modelo} (Wednesday 20:00, Indaiatuba)`);

    const espiritualidadePresencial = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-4`,
        notion_id: 'seed-espiritualidade-presencial-1',
        grupo_repense: GrupoRepense.Espiritualidade,
        modelo: ModeloCurso.presencial,
        capacidade: 20,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: false,
        eh_mulheres: false,
        cidade: 'Itu',
        teacher_id: joao.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '19:00',
        link_whatsapp: 'https://chat.whatsapp.com/espiritualidade-presencial',
      },
    });
    console.log(`  ✓ Created: ${espiritualidadePresencial.grupo_repense} ${espiritualidadePresencial.modelo} (Thursday 19:00, Itu)`);

    // Evangelho classes
    const evangelhoOnline = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-5`,
        notion_id: 'seed-evangelho-online-1',
        grupo_repense: GrupoRepense.Evangelho,
        modelo: ModeloCurso.online,
        capacidade: 30,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: false,
        eh_mulheres: false,
        cidade: 'Indaiatuba',
        teacher_id: maria.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '20:00',
        link_whatsapp: 'https://chat.whatsapp.com/evangelho-online',
      },
    });
    console.log(`  ✓ Created: ${evangelhoOnline.grupo_repense} ${evangelhoOnline.modelo} (Friday 20:00, Indaiatuba)`);

    const evangelhoPresencial = await prisma.class.create({
      data: {
        id: `class-seed-${classBaseTimestamp}-6`,
        notion_id: 'seed-evangelho-presencial-1',
        grupo_repense: GrupoRepense.Evangelho,
        modelo: ModeloCurso.presencial,
        capacidade: 15,
        numero_inscritos: 0,
        eh_ativo: true,
        eh_16h: true,
        eh_mulheres: false,
        cidade: 'Itu',
        teacher_id: pedro.id,
        numero_sessoes: 8,
        data_inicio: nextMonday,
        horario: '16:00',
        link_whatsapp: 'https://chat.whatsapp.com/evangelho-presencial',
      },
    });
    console.log(`  ✓ Created: ${evangelhoPresencial.grupo_repense} ${evangelhoPresencial.modelo} (Saturday 16:00, Itu)`);

    const allClasses = [
      igrejaOnline,
      igrejaPresencial,
      espiritualidadeOnline,
      espiritualidadePresencial,
      evangelhoOnline,
      evangelhoPresencial,
    ];
    console.log('');

    // 4. Create Sessions (2 per class)
    console.log('📅 Creating Sessions...');
    const sevenDaysAgo = getDaysAgo(7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allSessions: Array<{ id: string; class_id: string; numero_sessao: number; data_sessao: Date }> = [];

    for (const classItem of allClasses) {
      // Session 1: 7 days ago
      const session1Id = `session-${classItem.id}-1`;
      const session1 = await prisma.session.create({
        data: {
          id: session1Id,
          class_id: classItem.id,
          numero_sessao: 1,
          data_sessao: sevenDaysAgo,
          relatorio: 'Primeira aula realizada. Boa participação dos participantes.',
        },
      });
      allSessions.push({
        id: session1.id,
        class_id: classItem.id,
        numero_sessao: 1,
        data_sessao: sevenDaysAgo,
      });

      // Session 2: Today
      const session2Id = `session-${classItem.id}-2`;
      const session2 = await prisma.session.create({
        data: {
          id: session2Id,
          class_id: classItem.id,
          numero_sessao: 2,
          data_sessao: today,
          relatorio: null,
        },
      });
      allSessions.push({
        id: session2.id,
        class_id: classItem.id,
        numero_sessao: 2,
        data_sessao: today,
      });
    }
    console.log(`  ✓ Created ${allSessions.length} sessions (2 per class)\n`);

    // 5. Get existing students and create enrollments
    console.log('👥 Processing Students and Enrollments...');
    const existingStudents = await prisma.student.findMany({
      take: 10,
      orderBy: { criado_em: 'desc' },
    });

    if (existingStudents.length === 0) {
      console.log('  ⚠️  WARNING: No students found in database!');
      console.log('  ⚠️  Please create students first before running seed.');
      console.log('  ⚠️  Enrollments and attendance records will not be created.\n');
    } else {
      console.log(`  ✓ Found ${existingStudents.length} students in database`);

      // Enrollments per class type
      const enrollmentConfig = [
        { classes: [igrejaOnline, igrejaPresencial], studentsPerClass: 5 },
        { classes: [espiritualidadeOnline, espiritualidadePresencial], studentsPerClass: 3 },
        { classes: [evangelhoOnline, evangelhoPresencial], studentsPerClass: 2 },
      ];

      let studentIndex = 0;
      const allEnrollments: Array<{ id: string; student_id: string; class_id: string }> = [];

      for (const config of enrollmentConfig) {
        for (const classItem of config.classes) {
          for (let i = 0; i < config.studentsPerClass && studentIndex < existingStudents.length; i++) {
            const student = existingStudents[studentIndex % existingStudents.length];

            const enrollment = await prisma.enrollment.create({
              data: {
                student_id: student.id,
                class_id: classItem.id,
                status: 'ativo',
              },
            });
            allEnrollments.push({
              id: enrollment.id,
              student_id: student.id,
              class_id: classItem.id,
            });

            // Increment class enrollment count
            await prisma.class.update({
              where: { id: classItem.id },
              data: {
                numero_inscritos: {
                  increment: 1,
                },
              },
            });

            studentIndex++;
          }
        }
      }

      console.log(`  ✓ Created ${allEnrollments.length} enrollments`);
      console.log('');

      // 6. Create Attendance records
      console.log('✅ Creating Attendance records...');
      let attendanceCount = 0;

      for (const session of allSessions) {
        // Get enrollments for this class
        const classEnrollments = allEnrollments.filter((e) => e.class_id === session.class_id);

        for (const enrollment of classEnrollments) {
          const isSession1 = session.numero_sessao === 1;
          // Session 1: all present; Session 2: 80% present, 20% absent
          const shouldBePresent = isSession1 || Math.random() > 0.2;

          const attendance = await prisma.attendance.create({
            data: {
              id: `attendance-${session.id}-${enrollment.student_id}`,
              session_id: session.id,
              student_id: enrollment.student_id,
              presente: shouldBePresent,
              observacao: shouldBePresent && !isSession1 && Math.random() < 0.3 ? 'Chegou atrasado' : null,
            },
          });
          attendanceCount++;
        }
      }

      console.log(`  ✓ Created ${attendanceCount} attendance records`);
      console.log('  📊 Session 1: All students present');
      console.log('  📊 Session 2: ~80% present, ~20% absent (some with "Chegou atrasado" note)\n');
    }

    console.log('✨ Seed completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`  - 1 Admin account`);
    console.log(`  - 3 Teachers`);
    console.log(`  - ${allClasses.length} Classes`);
    console.log(`  - ${allSessions.length} Sessions`);
    if (existingStudents.length > 0) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          Class: {
            notion_id: {
              startsWith: 'seed-',
            },
          },
        },
      });
      const attendanceCount = await prisma.attendance.count({
        where: {
          Session: {
            Class: {
              notion_id: {
                startsWith: 'seed-',
              },
            },
          },
        },
      });
      console.log(`  - ${enrollmentCount} Enrollments`);
      console.log(`  - ${attendanceCount} Attendance records`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
