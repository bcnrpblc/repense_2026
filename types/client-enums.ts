// Client-safe enum types (not importing from @prisma/client to avoid bundling PrismaClient)
// These must match the enums defined in prisma/schema.prisma

export enum GrupoRepense {
  Igreja = 'Igreja',
  Espiritualidade = 'Espiritualidade',
  Evangelho = 'Evangelho',
}

export enum ModeloCurso {
  online = 'online',
  presencial = 'presencial',
}
