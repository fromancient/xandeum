import { PrismaClient } from '@prisma/client';

// Ensure a single Prisma client in dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Create Prisma client - will fail gracefully if DATABASE_URL is invalid
// Routes check availability before using it
let prismaInstance: PrismaClient;

try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    log: ['error', 'warn'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
} catch (error) {
  // If Prisma client creation fails (e.g., invalid DATABASE_URL), create a dummy instance
  // Routes will detect this via isDbAvailable() checks
  console.warn('Prisma client initialization warning (database may not be available):', error);
  // Create a client anyway - it will fail on actual use, which routes handle
  prismaInstance = new PrismaClient({
    log: [],
  }) as any;
}

export const prisma = prismaInstance;

