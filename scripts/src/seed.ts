import { db } from "@workspace/db";
import {
  suppliersTable,
  itemsTable,
  priceComparisonsTable,
  inventoryTable,
  stockMovementsTable,
  customersTable,
  ordersTable,
  orderItemsTable,
  invoicesTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  const [s1, s2, s3] = await db
    .insert(suppliersTable)
    .values([
      { name: "شركة النيل للتوريدات", contactName: "أحمد محمود", phone: "01001234567", email: "ahmed@nile.eg", address: "القاهرة، مصر الجديدة" },
      { name: "مؤسسة الخليج التجارية", contactName: "خالد العمري", phone: "01112345678", email: "khalid@gulf.sa", address: "الرياض، المملكة العربية السعودية" },
      { name: "مصنع الوحدة للصناعات", contactName: "سارة يوسف", phone: "01223456789", email: "sara@wahda.eg", address: "الإسكندرية، مصر" },
    ])
    .returning();

  const [i1, i2, i3, i4] = await db
    .insert(itemsTable)
    .values([
      { name: "ورق A4", description: "ورق طباعة مقاس A4", category: "مستلزمات مكتبية", defaultPrice: "45.00" },
      { name: "أحبار طابعة", description: "خرطوشة حبر للطابعات الليزر", category: "مستلزمات مكتبية", defaultPrice: "120.00" },
      { name: "كمبيوتر محمول", description: "لابتوب للأعمال", category: "أجهزة إلكترونية", defaultPrice: "8500.00" },
      { name: "كرسي مكتبي", description: "كرسي مكتبي مريح", category: "أثاث", defaultPrice: "650.00" },
    ])
    .returning();

  await db.insert(priceComparisonsTable).values([
    { itemId: i1.id, supplierId: s1.id, quotedPrice: "42.00", notes: "سعر الجملة" },
    { itemId: i1.id, supplierId: s2.id, quotedPrice: "45.50", notes: "شحن مجاني" },
    { itemId: i2.id, supplierId: s1.id, quotedPrice: "115.00" },
    { itemId: i2.id, supplierId: s3.id, quotedPrice: "110.00", notes: "ضمان سنة" },
    { itemId: i3.id, supplierId: s2.id, quotedPrice: "8200.00" },
  ]);

  await db.insert(inventoryTable).values([
    { itemId: i1.id, quantityAvailable: 150, safetyLevel: 20, location: "مستودع A" },
    { itemId: i2.id, quantityAvailable: 8, safetyLevel: 10, location: "مستودع A" },
    { itemId: i3.id, quantityAvailable: 5, safetyLevel: 2, location: "مستودع B" },
    { itemId: i4.id, quantityAvailable: 12, safetyLevel: 5, location: "مستودع B" },
  ]);

  await db.insert(stockMovementsTable).values([
    { itemId: i1.id, movementType: "in", quantity: 200, reference: "PO-001", notes: "استلام طلبية" },
    { itemId: i2.id, movementType: "in", quantity: 20, reference: "PO-002" },
    { itemId: i2.id, movementType: "out", quantity: 12, reference: "REQ-001", notes: "صرف للإدارة" },
    { itemId: i3.id, movementType: "in", quantity: 5, reference: "PO-003" },
  ]);

  const [c1, c2, c3] = await db
    .insert(customersTable)
    .values([
      { name: "شركة الأمل للمقاولات", phone: "01234567890", email: "amal@amal.eg", deliverySuccessRate: "95.00", notes: "عميل مميز" },
      { name: "مؤسسة النجاح التجارية", phone: "01098765432", email: "najah@najah.eg", deliverySuccessRate: "87.50" },
      { name: "مصنع الحرية للصناعات", phone: "01187654321", email: "horeya@factory.eg", deliverySuccessRate: "100.00" },
    ])
    .returning();

  const [o1, o2] = await db
    .insert(ordersTable)
    .values([
      { customerId: c1.id, status: "delivered", totalAmount: "1045.00", notes: "طلب عاجل" },
      { customerId: c2.id, status: "pending", totalAmount: "8500.00" },
    ])
    .returning();

  await db.insert(orderItemsTable).values([
    { orderId: o1.id, itemId: i1.id, quantity: 10, unitPrice: "42.00" },
    { orderId: o1.id, itemId: i2.id, quantity: 5, unitPrice: "115.00" },
    { orderId: o2.id, itemId: i3.id, quantity: 1, unitPrice: "8500.00" },
  ]);

  const now = new Date();
  await db.insert(invoicesTable).values([
    {
      orderId: o1.id,
      invoiceNumber: "INV-2026-001",
      issuedAt: now,
      total: "1045.00",
      status: "paid",
      notes: "تم السداد نقداً",
    },
    {
      orderId: o2.id,
      invoiceNumber: "INV-2026-002",
      issuedAt: now,
      total: "8500.00",
      status: "draft",
    },
  ]);

  console.log("Seeding complete!");
}

seed().catch(console.error);
