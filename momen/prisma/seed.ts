// Demo data so you can see how the app looks. Run: npm run seed
// Wipe it any time with: npm run db:reset
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const day = (offset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

async function main() {
  if ((await db.customer.count()) > 0) {
    console.log("Database already has customers — skipping seed.");
    return;
  }

  const ada = await db.customer.create({
    data: {
      name: "Adaeze Okafor",
      phone: "08031234567",
      instagram: "@adaeze.o",
      referredBy: "Instagram",
      notes: "Likes her gowns fitted at the waist, flowy at the bottom. Prefers lighter lining.",
      measurements: {
        create: {
          takenAt: day(-40),
          values: JSON.stringify({ Bust: "38", "Under bust": "33", Waist: "30", Hips: "42", Shoulder: "15", "Gown length": "58", "Sleeve length": "23", "Round sleeve (arm)": "12" }),
        },
      },
    },
    include: { measurements: true },
  });

  const tolu = await db.customer.create({
    data: {
      name: "Tolulope Bankole",
      phone: "08109876543",
      notes: "Always in a rush. Confirm dates in writing.",
      measurements: {
        create: {
          takenAt: day(-20),
          values: JSON.stringify({ Bust: "36", Waist: "28", Hips: "40", Shoulder: "14.5", "Blouse length": "22", "Skirt length": "40" }),
        },
      },
    },
    include: { measurements: true },
  });

  const kemi = await db.customer.create({ data: { name: "Kemi Adeyemi", phone: "07065554433", referredBy: "Adaeze Okafor" } });

  const o1 = await db.order.create({
    data: {
      customerId: ada.id,
      measurementId: ada.measurements[0].id,
      title: "Corset gown (wedding guest)",
      price: 120000,
      status: "DELIVERED",
      orderDate: day(-35),
      fittingDate: day(-15),
      dueDate: day(-10),
      deliveredAt: day(-12),
      fitNotes: "Took in the waist by 1 inch at fitting. Perfect after.",
      payments: { create: [{ amount: 60000, paidAt: day(-35), method: "Transfer", note: "Deposit" }, { amount: 60000, paidAt: day(-12), method: "Transfer" }] },
      costs: {
        create: [
          { category: "TAILOR", amount: 25000, date: day(-14), paidTo: "Mr. Sule" },
          { category: "LINING", amount: 6000, date: day(-30) },
          { category: "ACCESSORIES", amount: 3500, date: day(-30), note: "Boning, zip, hooks" },
        ],
      },
    },
  });

  const o2 = await db.order.create({
    data: {
      customerId: tolu.id,
      measurementId: tolu.measurements[0].id,
      title: "Aso-ebi blouse & wrapper",
      price: 45000,
      status: "SEWING",
      orderDate: day(-8),
      fittingDate: day(1),
      dueDate: day(4),
      payments: { create: [{ amount: 20000, paidAt: day(-8), method: "Cash", note: "Deposit" }] },
      promises: { create: [{ promisedDate: day(3), amount: 25000, note: "Said she'll pay balance before pickup" }] },
      costs: { create: [{ category: "EMBROIDERY", amount: 8000, date: day(-3) }, { category: "TAILOR", amount: 12000, date: day(-2), paidTo: "Mr. Sule" }] },
      tasks: { create: [{ title: "Collect blouse from embroiderer", dueDate: day(0) }] },
    },
  });

  await db.order.create({
    data: {
      customerId: kemi.id,
      title: "Kaftan dress",
      price: 35000,
      status: "PENDING",
      orderDate: day(-2),
      dueDate: day(-1),
      payments: { create: [{ amount: 10000, paidAt: day(-2), method: "Transfer", note: "Deposit" }] },
      problems: "Fabric shrank after pre-wash; need extra half yard.",
    },
  });

  await db.order.create({
    data: {
      customerId: ada.id,
      title: "Two-piece trouser set",
      price: 55000,
      status: "CUTTING",
      orderDate: day(-1),
      dueDate: day(12),
      payments: { create: [{ amount: 30000, paidAt: day(-1), method: "POS", note: "Deposit" }] },
      costs: { create: [{ category: "BUTTONHOLE", amount: 1500, date: day(0) }] },
    },
  });

  await db.expense.createMany({
    data: [
      { date: day(-25), kind: "OPERATING", category: "RENT", description: "Shop rent (monthly)", amount: 50000 },
      { date: day(-5), kind: "OPERATING", category: "FUEL", description: "Generator fuel", amount: 15000 },
      { date: day(-3), kind: "OPERATING", category: "ACCESSORIES", description: "Threads, zips, interfacing", amount: 9500, vendor: "Balogun market" },
      { date: day(-18), kind: "CAPITAL", category: "EQUIPMENT", description: "Industrial straight sewing machine", amount: 180000 },
    ],
  });

  await db.task.createMany({ data: [{ title: "Call Kemi about extra fabric", dueDate: day(0) }, { title: "Restock lining" }] });

  await db.issue.create({
    data: { title: "Kaftan due date missed", details: "Fabric shrank; waiting on extra fabric from customer.", customerId: kemi.id, orderId: (await db.order.findFirst({ where: { customerId: kemi.id } }))!.id },
  });

  console.log(`Seeded demo data (orders ${o1.id}, ${o2.id}, …).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
