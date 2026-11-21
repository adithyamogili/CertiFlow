
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.DEMO_PASSWORD;

  if (!demoPassword) {
    throw new Error("DEMO_PASSWORD is missing from .env");
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const users = [
    {
      name: "Anika",
      email: "anika@certiflow.demo",
      role: UserRole.TRAINING_CENTRE,
    },
    {
      name: "Dev",
      email: "dev@certiflow.demo",
      role: UserRole.DISTRICT_OFFICER,
      districtId: "HYD-01",
    },
    {
      name: "Meera",
      email: "meera@certiflow.demo",
      role: UserRole.DISTRICT_OFFICER,
      districtId: "HYD-01",
    },
    {
      name: "Kabir",
      email: "kabir@certiflow.demo",
      role: UserRole.DISTRICT_OFFICER,
      districtId: "HYD-01",
    },
    {
      name: "Neha",
      email: "neha@certiflow.demo",
      role: UserRole.QUALITY_TEAM,
    },
    {
      name: "Farah",
      email: "farah@certiflow.demo",
      role: UserRole.STATE_OFFICE,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        districtId: user.districtId ?? null,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  console.log(`Successfully seeded ${users.length} demo users.`);
}

main()
  .catch((error) => {
    console.error("Demo user seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
