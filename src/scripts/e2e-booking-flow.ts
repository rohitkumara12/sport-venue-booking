/**
 * Tes end-to-end Feature 2 (booking & transaksi) dan Feature 3 (review).
 *
 * Cara pakai (server harus sudah jalan):
 *   terminal 1: npx ts-node src/server.ts
 *   terminal 2: npx ts-node src/scripts/e2e-booking-flow.ts
 *
 * Script membuat data tes ([TEST] / @courtkita.test), memanggil API seperti frontend,
 * lalu SELALU menghapus data tesnya di akhir (juga kalau ada tes yang gagal).
 */
import "dotenv/config";
import { addDays, addHours, format, setHours } from "date-fns";
import { prisma } from "../configs/prisma.client.config";
import { Bcrypt } from "../lib/bcrypt.lib";

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT || "8002"}${process.env.API_PREFIX || "/api/v1"}`;
const EMAIL_DOMAIN = "@courtkita.test";
const COURT_NAME = "[TEST] Lapangan E2E";
const PLAN_PREFIX = "[TEST]";
const PASSWORD = "rahasia123";
const PRICE = 100000;
const PROOF_URL = "https://res.cloudinary.com/demo/image/upload/sample.jpg";

const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd");

// ---------- helper ----------

let failed = 0;
let passed = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
    if (detail !== undefined) console.log("     ", JSON.stringify(detail));
  }
}

interface ApiResult {
  status: number;
  body: any;
}

async function api(method: string, path: string, cookie?: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie && { Cookie: cookie }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const token = res.headers.getSetCookie().find((c) => c.startsWith("token="));
  if (res.status !== 200 || !token) throw new Error(`Login ${email} gagal (status ${res.status})`);
  return token.split(";")[0];
}

const book = (cookie: string, startHour: number, hours = 1, extra: Record<string, unknown> = {}, date = tomorrow) =>
  api("POST", "/bookings", cookie, { courtId: courtIdRef.id, date, startHour, hours, ...extra });

async function slotAvailable(label: string) {
  const res = await api("GET", `/courts/${courtIdRef.id}?date=${tomorrow}`);
  return res.body.data.slots.find((s: { label: string }) => s.label === label)?.isAvailable as boolean;
}

// Memundurkan batas waktu transaksi = mensimulasikan "30 menit sudah lewat" (data tes saja).
async function expireNow(transactionId: string) {
  await prisma.transaction.update({ where: { id: transactionId }, data: { expiresAt: new Date(Date.now() - 60_000) } });
}

const courtIdRef = { id: "" };

// ---------- setup & cleanup ----------

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: EMAIL_DOMAIN } }, select: { id: true } });
  const courts = await prisma.court.findMany({ where: { name: COURT_NAME }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const courtIds = courts.map((c) => c.id);
  const bookingFilter = { OR: [{ userId: { in: userIds } }, { courtId: { in: courtIds } }] };

  const [reviews, transactions, bookings, memberships, plans, deletedCourts, , , deletedUsers] = await prisma.$transaction([
    prisma.review.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { booking: { courtId: { in: courtIds } } }] } }),
    prisma.transaction.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { booking: { courtId: { in: courtIds } } }] } }),
    prisma.booking.deleteMany({ where: bookingFilter }),
    prisma.customerMembership.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.membershipPlan.deleteMany({ where: { name: { startsWith: PLAN_PREFIX } } }),
    prisma.court.deleteMany({ where: { id: { in: courtIds } } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  return { reviews, transactions, bookings, memberships, plans, courts: deletedCourts, users: deletedUsers };
}

async function createUser(key: string, role: "USER" | "ADMIN") {
  return prisma.user.create({
    data: {
      name: `E2E ${key}`,
      email: `e2e-${key}${EMAIL_DOMAIN}`,
      password: await Bcrypt.hashPassword(PASSWORD),
      role,
      profile_Image: "",
      createdAt: new Date(),
    },
  });
}

// ---------- tes ----------

async function run() {
  console.log(`\nServer: ${BASE}`);
  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`Server tidak bisa diakses di ${BASE}. Jalankan dulu: npx ts-node src/server.ts`);

  // Sisa data dari run sebelumnya (kalau ada) dibersihkan dulu.
  await cleanup();

  console.log("\n[Setup]");
  const userA = await createUser("customer-a", "USER");
  await createUser("customer-b", "USER");
  await createUser("admin", "ADMIN");
  const A = await login(`e2e-customer-a${EMAIL_DOMAIN}`);
  const B = await login(`e2e-customer-b${EMAIL_DOMAIN}`);
  const ADMIN = await login(`e2e-admin${EMAIL_DOMAIN}`);
  check("Login 3 user tes", true);

  const created = await api("POST", "/courts", ADMIN, {
    name: COURT_NAME,
    sportType: "Futsal",
    pricePerHour: PRICE,
    description: "Data tes otomatis, akan dihapus.",
    photos: [],
  });
  check("Admin membuat court (Feature 1)", created.status === 201, created.body);
  courtIdRef.id = created.body.data.id;

  const plan = await prisma.membershipPlan.create({
    data: { name: `${PLAN_PREFIX} Paket 2 Sesi`, price: 150000, sessionCount: 2, durationDays: 30 },
  });
  const membership = await prisma.customerMembership.create({
    data: {
      userId: userA.id,
      membershipPlanId: plan.id,
      totalSessions: 2,
      remainingSessions: 2,
      startsAt: new Date(),
      expiresAt: addDays(new Date(), 30),
      status: "ACTIVE",
    },
  });

  console.log("\n[Booking & validasi]");
  const t1 = await api("POST", "/bookings", undefined, { courtId: courtIdRef.id, date: tomorrow, startHour: 10, hours: 1 });
  check("T1 tanpa login → 401", t1.status === 401, t1);

  const t2a = await book(A, 10, 5);
  const t2b = await book(A, 21, 2);
  check("T2 durasi 5 jam → 422; lewat jam tutup → 422", t2a.status === 422 && t2b.status === 422, [t2a, t2b]);

  const t3 = await book(A, 10, 1, {}, yesterday);
  check("T3 jam yang sudah lewat → 400", t3.status === 400, t3);

  const t4 = await book(A, 10, 2);
  const bookingA = t4.body?.data;
  const minutesLeft = bookingA ? (new Date(bookingA.transaction.expiresAt).getTime() - Date.now()) / 60000 : 0;
  check(
    "T4 booking 10:00 2 jam → PENDING, Rp200.000, batas ±30 menit",
    t4.status === 201 &&
      bookingA.transaction.status === "PENDING" &&
      bookingA.totalPrice === PRICE * 2 &&
      bookingA.transaction.amount === PRICE * 2 &&
      minutesLeft > 29 && minutesLeft <= 30,
    t4,
  );

  check("T5 slot 10:00 & 11:00 jadi terisi", !(await slotAvailable("10:00")) && !(await slotAvailable("11:00")));

  const t6 = await book(B, 11);
  check("T6 booking tumpang tindih (11:00) → 409", t6.status === 409, t6);

  const [race1, race2] = await Promise.all([book(A, 13), book(B, 13)]);
  const statuses = [race1.status, race2.status].sort();
  check("T7 dua booking 13:00 bersamaan → satu 201, satu 409", statuses[0] === 201 && statuses[1] === 409, statuses);

  console.log("\n[Pembayaran & admin]");
  const t8a = await api("GET", `/bookings/${bookingA.id}`, B);
  const t8b = await api("PATCH", `/bookings/${bookingA.id}/payment-proof`, B, { paymentProofUrl: PROOF_URL });
  check("T8 customer lain buka / upload ke booking A → 404", t8a.status === 404 && t8b.status === 404, [t8a.status, t8b.status]);

  const t9 = await api("PATCH", `/bookings/${bookingA.id}/payment-proof`, A, { paymentProofUrl: PROOF_URL });
  check(
    "T9 upload bukti → PROOF_SUBMITTED, batas waktu baru",
    t9.status === 200 &&
      t9.body.data.transaction.status === "PROOF_SUBMITTED" &&
      t9.body.data.transaction.paymentProofUrl === PROOF_URL &&
      new Date(t9.body.data.transaction.expiresAt) >= new Date(bookingA.transaction.expiresAt),
    t9,
  );

  const t10 = await api("GET", "/admin/transactions", A);
  check("T10 customer buka halaman admin → 403", t10.status === 403, t10);

  const t11 = await api("GET", "/admin/transactions?status=PROOF_SUBMITTED", ADMIN);
  check("T11 admin melihat transaksi A", t11.status === 200 && t11.body.data.some((t: { id: string }) => t.id === bookingA.transaction.id), t11);

  const t12 = await api("PATCH", `/admin/transactions/${bookingA.transaction.id}/confirm`, ADMIN);
  const afterConfirm = await api("GET", `/bookings/${bookingA.id}`, A);
  const t12again = await api("PATCH", `/admin/transactions/${bookingA.transaction.id}/confirm`, ADMIN);
  check(
    "T12 admin terima → PAID & CONFIRMED; terima ulang → 400",
    t12.status === 200 &&
      afterConfirm.body.data.transaction.status === "PAID" &&
      afterConfirm.body.data.status === "CONFIRMED" &&
      t12again.status === 400,
    [t12, afterConfirm.body?.data?.status, t12again.status],
  );

  const t13 = await book(B, 15);
  await api("PATCH", `/bookings/${t13.body.data.id}/payment-proof`, B, { paymentProofUrl: PROOF_URL });
  const t13reject = await api("PATCH", `/admin/transactions/${t13.body.data.transaction.id}/reject`, ADMIN);
  const t13after = await api("GET", `/bookings/${t13.body.data.id}`, B);
  check(
    "T13 admin tolak → REJECTED, booking CANCELLED, slot 15:00 kosong lagi",
    t13reject.status === 200 &&
      t13after.body.data.transaction.status === "REJECTED" &&
      t13after.body.data.status === "CANCELLED" &&
      (await slotAvailable("15:00")),
    [t13reject, t13after.body?.data?.status],
  );

  console.log("\n[Status otomatis & slot dikembalikan]");
  const t14 = await book(B, 16);
  await expireNow(t14.body.data.transaction.id);
  const t14after = await api("GET", `/bookings/${t14.body.data.id}`, B);
  check(
    "T14 tidak upload 30 menit → EXPIRED, slot 16:00 kosong lagi",
    t14after.body.data.transaction.status === "EXPIRED" && t14after.body.data.status === "EXPIRED" && (await slotAvailable("16:00")),
    t14after.body?.data,
  );

  const t15 = await book(B, 17);
  await api("PATCH", `/bookings/${t15.body.data.id}/payment-proof`, B, { paymentProofUrl: PROOF_URL });
  await expireNow(t15.body.data.transaction.id);
  const t15after = await api("GET", `/bookings/${t15.body.data.id}`, B);
  const t15confirm = await api("PATCH", `/admin/transactions/${t15.body.data.transaction.id}/confirm`, ADMIN);
  check(
    "T15 admin tidak respon 30 menit → CANCELLED, slot 17:00 kosong; terima → 400",
    t15after.body.data.transaction.status === "CANCELLED" &&
      t15after.body.data.status === "CANCELLED" &&
      (await slotAvailable("17:00")) &&
      t15confirm.status === 400,
    [t15after.body?.data, t15confirm.status],
  );

  const t16 = await book(B, 19);
  await expireNow(t16.body.data.transaction.id);
  const t16upload = await api("PATCH", `/bookings/${t16.body.data.id}/payment-proof`, B, { paymentProofUrl: PROOF_URL });
  check("T16 upload bukti setelah batas waktu → 400", t16upload.status === 400, t16upload);

  console.log("\n[Membership]");
  const t17 = await api("GET", "/bookings/memberships", A);
  check("T17 membership aktif terlihat (2 sesi)", t17.status === 200 && t17.body.data.length === 1 && t17.body.data[0].remainingSessions === 2, t17);

  const t18 = await book(A, 20, 2, { customerMembershipId: membership.id });
  const usedMembership = await prisma.customerMembership.findUnique({ where: { id: membership.id } });
  check(
    "T18 booking 2 jam pakai membership → CONFIRMED, Rp0, tanpa transaksi, sisa 0, USED_UP",
    t18.status === 201 &&
      t18.body.data.status === "CONFIRMED" &&
      t18.body.data.totalPrice === 0 &&
      t18.body.data.transaction === null &&
      usedMembership?.remainingSessions === 0 &&
      usedMembership?.status === "USED_UP",
    [t18, usedMembership],
  );

  const t19 = await book(A, 8, 1, { customerMembershipId: membership.id });
  check("T19 pakai membership yang sudah habis → 404", t19.status === 404, t19);

  const shortMembership = await prisma.customerMembership.create({
    data: {
      userId: userA.id,
      membershipPlanId: plan.id,
      totalSessions: 5,
      remainingSessions: 5,
      startsAt: new Date(),
      expiresAt: setHours(addDays(new Date(new Date().setHours(0, 0, 0, 0)), 1), 9),
      status: "ACTIVE",
    },
  });
  const t20 = await book(A, 12, 1, { customerMembershipId: shortMembership.id });
  check("T20 booking di luar masa berlaku membership → 400", t20.status === 400, t20);

  console.log("\n[Review]");
  const t21 = await api("POST", "/reviews", A, { bookingId: bookingA.id, rating: 5, comment: "Mantap" });
  check("T21 review sebelum jadwal dimainkan → 400", t21.status === 400, t21);

  // Jadwal booking A dipindah ke kemarin = mensimulasikan "jadwal sudah dipakai".
  const playedStart = setHours(addDays(new Date(new Date().setHours(0, 0, 0, 0)), -1), 10);
  await prisma.booking.update({ where: { id: bookingA.id }, data: { startTime: playedStart, endTime: addHours(playedStart, 2) } });
  const t22 = await api("POST", "/reviews", A, { bookingId: bookingA.id, rating: 5, comment: "Lapangan bersih, lampu terang" });
  const t22after = await api("GET", `/bookings/${bookingA.id}`, A);
  check(
    "T22 setelah jadwal lewat → COMPLETED, review 201",
    t22.status === 201 && t22after.body.data.status === "COMPLETED" && t22after.body.data.canReview === false,
    [t22, t22after.body?.data?.status],
  );

  const t23 = await api("POST", "/reviews", A, { bookingId: bookingA.id, rating: 4 });
  check("T23 review kedua untuk booking yang sama → 409", t23.status === 409, t23);

  const t24reviews = await api("GET", `/courts/${courtIdRef.id}/reviews`);
  const t24court = await api("GET", `/courts/${courtIdRef.id}?date=${tomorrow}`);
  check(
    "T24 ulasan tampil di profil court (rating 5, 1 ulasan)",
    t24reviews.body.data.length === 1 &&
      t24reviews.body.data[0].rating === 5 &&
      t24reviews.body.data[0].user.name === "E2E customer-a" &&
      t24court.body.data.averageRating === 5 &&
      t24court.body.data.reviewCount === 1,
    [t24reviews.body?.data, t24court.body?.data?.averageRating],
  );
}

async function main() {
  if (process.env.NODE_ENV === "PRODUCTION") throw new Error("Tes E2E tidak boleh dijalankan di PRODUCTION");

  try {
    await run();
  } catch (err) {
    failed++;
    console.error("\n❌ Tes berhenti karena error:", err instanceof Error ? err.message : err);
  } finally {
    const removed = await cleanup();
    console.log("\n[Cleanup] Data tes dihapus:", removed);
    console.log(`\nHasil: ${passed} lolos, ${failed} gagal`);
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
