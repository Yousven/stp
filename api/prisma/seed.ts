// Ainult kohaliku arenduse jaoks — täidab local docker-compose MySQL-i
// demoandmetega, ET TOODANGU ANDMEBAASI EI TOHI KUNAGI SELLE SKRIPTIGA KÄIVITADA.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hashPassword("DevPassword123!");
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      email: "admin@example.test",
      hourlyRate: 15,
      advance: 0,
      role: "admin",
    },
  });

  const employeePassword = await hashPassword("DevPassword123!");
  await prisma.user.upsert({
    where: { username: "employee" },
    update: {},
    create: {
      username: "employee",
      password: employeePassword,
      email: "employee@example.test",
      hourlyRate: 12,
      advance: 0,
      role: "employee",
    },
  });

  // Raadius on tahtlikult väga suur (100 km), et telefonist testides
  // (mis pole füüsiliselt Tallinnas) ei käivituks kohe geofence
  // auto-lõpetamine. Päris objektidel oleks see realistlik (nt 100-500 m).
  await prisma.workObject.upsert({
    where: { id: 1 },
    update: { radius: 100_000 },
    create: {
      id: 1,
      name: "Demo objekt",
      description: "Kohaliku arenduse test-objekt",
      address: "Tallinn, Eesti",
      latitude: 59.437,
      longitude: 24.7536,
      radius: 100_000,
      deleted: false,
    },
  });

  console.log("Seed valmis. Kasutajad: admin / employee, parool mõlemal: DevPassword123!");
  console.log("Admin id:", admin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
