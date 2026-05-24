import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  itemsTable,
  customersTable,
  ordersTable,
  invoicesTable,
  inventoryTable,
  orderItemsTable,
  stockMovementsTable,
  tasksTable,
  employeesTable,
} from "@workspace/db/schema";
import { count, sql, desc, and, eq, lt, ne, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [suppliersCount] = await db.select({ count: count() }).from(suppliersTable);
    const [itemsCount] = await db.select({ count: count() }).from(itemsTable);
    const [customersCount] = await db.select({ count: count() }).from(customersTable);
    const [ordersCount] = await db.select({ count: count() }).from(ordersTable);
    const [invoicesCount] = await db.select({ count: count() }).from(invoicesTable);

    const inventoryAll = await db.select().from(inventoryTable);
    const lowStockCount = inventoryAll.filter((i) => i.quantityAvailable <= i.safetyLevel).length;

    const pendingOrders = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(sql`${ordersTable.status} = 'pending'`);

    const totalRevenue = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)` })
      .from(invoicesTable)
      .where(sql`${invoicesTable.status} = 'paid'`);

    res.json({
      suppliersCount: suppliersCount.count,
      itemsCount: itemsCount.count,
      customersCount: customersCount.count,
      ordersCount: ordersCount.count,
      invoicesCount: invoicesCount.count,
      lowStockCount,
      pendingOrdersCount: pendingOrders[0].count,
      totalRevenue: parseFloat(totalRevenue[0].total),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/analytics/monthly-sales", async (req, res) => {
  try {
    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${invoicesTable.issuedAt}), 'YYYY-MM')`,
        total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(invoicesTable)
      .where(
        sql`${invoicesTable.issuedAt} >= NOW() - INTERVAL '12 months'
          AND ${invoicesTable.status} IN ('issued', 'paid')`
      )
      .groupBy(sql`DATE_TRUNC('month', ${invoicesTable.issuedAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${invoicesTable.issuedAt})`);

    res.json(
      rows.map((r) => ({
        month: r.month,
        total: parseFloat(r.total),
        count: parseInt(r.count),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/analytics/monthly-purchases", async (req, res) => {
  try {
    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${stockMovementsTable.createdAt}), 'YYYY-MM')`,
        quantity: sql<string>`COALESCE(SUM(${stockMovementsTable.quantity}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(stockMovementsTable)
      .where(
        sql`${stockMovementsTable.movementType} = 'in'
          AND ${stockMovementsTable.createdAt} >= NOW() - INTERVAL '12 months'`
      )
      .groupBy(sql`DATE_TRUNC('month', ${stockMovementsTable.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${stockMovementsTable.createdAt})`);

    res.json(
      rows.map((r) => ({
        month: r.month,
        quantity: parseInt(r.quantity),
        count: parseInt(r.count),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/analytics/top-items", async (req, res) => {
  try {
    const rows = await db
      .select({
        itemId: orderItemsTable.itemId,
        itemName: itemsTable.name,
        totalQuantity: sql<string>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice}), 0)`,
      })
      .from(orderItemsTable)
      .leftJoin(itemsTable, sql`${orderItemsTable.itemId} = ${itemsTable.id}`)
      .groupBy(orderItemsTable.itemId, itemsTable.name)
      .orderBy(desc(sql`SUM(${orderItemsTable.quantity})`))
      .limit(8);

    res.json(
      rows.map((r) => ({
        itemId: r.itemId,
        itemName: r.itemName ?? "غير معروف",
        totalQuantity: parseInt(r.totalQuantity),
        totalRevenue: parseFloat(r.totalRevenue),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/analytics/top-customers", async (req, res) => {
  try {
    const rows = await db
      .select({
        customerId: ordersTable.customerId,
        customerName: customersTable.name,
        totalRevenue: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
        ordersCount: sql<string>`COUNT(*)`,
      })
      .from(ordersTable)
      .leftJoin(customersTable, sql`${ordersTable.customerId} = ${customersTable.id}`)
      .groupBy(ordersTable.customerId, customersTable.name)
      .orderBy(desc(sql`SUM(${ordersTable.totalAmount})`))
      .limit(8);

    res.json(
      rows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName ?? "غير معروف",
        totalRevenue: parseFloat(r.totalRevenue),
        ordersCount: parseInt(r.ordersCount),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/personal — role-specific personal dashboard data
router.get("/dashboard/personal", async (req, res) => {
  try {
    const role = req.session?.role ?? "sales";
    const me = req.session?.employeeId ?? null;

    // Overdue tasks — all roles see their own; admin sees all
    const overdueBase = and(
      sql`${tasksTable.dueDate} < NOW()`,
      ne(tasksTable.status, "done"),
    );
    const overdueWhere = role === "admin" ? overdueBase : and(overdueBase, me ? eq(tasksTable.assignedTo, me) : sql`false`);
    const overdueTasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        assigneeName: employeesTable.name,
      })
      .from(tasksTable)
      .leftJoin(employeesTable, eq(tasksTable.assignedTo, employeesTable.id))
      .where(overdueWhere)
      .orderBy(tasksTable.dueDate)
      .limit(10);

    // Upcoming tasks (next 7 days)
    const upcomingBase = and(
      sql`${tasksTable.dueDate} >= NOW()`,
      sql`${tasksTable.dueDate} <= NOW() + INTERVAL '7 days'`,
      ne(tasksTable.status, "done"),
    );
    const upcomingWhere = role === "admin" ? upcomingBase : and(upcomingBase, me ? eq(tasksTable.assignedTo, me) : sql`false`);
    const upcomingTasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        assigneeName: employeesTable.name,
      })
      .from(tasksTable)
      .leftJoin(employeesTable, eq(tasksTable.assignedTo, employeesTable.id))
      .where(upcomingWhere)
      .orderBy(tasksTable.dueDate)
      .limit(10);

    // Low stock items
    const allInventory = await db.select().from(inventoryTable);
    const lowStockItems = allInventory
      .filter((i) => i.quantityAvailable <= i.safetyLevel)
      .slice(0, 10);

    // Pending orders count
    const [pendingOrdersRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"));

    // Unpaid invoices count
    const [unpaidRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(invoicesTable)
      .where(ne(invoicesTable.status, "paid"));

    // Sales today & this month (admin + sales)
    let todaySales = 0;
    let monthSales = 0;
    if (role === "admin" || role === "sales") {
      const [todayRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)` })
        .from(invoicesTable)
        .where(sql`DATE(${invoicesTable.issuedAt}) = CURRENT_DATE AND ${invoicesTable.status} IN ('issued', 'paid')`);
      const [monthRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)` })
        .from(invoicesTable)
        .where(sql`DATE_TRUNC('month', ${invoicesTable.issuedAt}) = DATE_TRUNC('month', CURRENT_DATE) AND ${invoicesTable.status} IN ('issued', 'paid')`);
      todaySales = parseFloat(todayRow?.total ?? "0");
      monthSales = parseFloat(monthRow?.total ?? "0");
    }

    // 7-day sales for admin chart
    let sevenDaySales: { day: string; total: number }[] = [];
    if (role === "admin") {
      const rows = await db
        .select({
          day: sql<string>`TO_CHAR(DATE(${invoicesTable.issuedAt}), 'YYYY-MM-DD')`,
          total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)`,
        })
        .from(invoicesTable)
        .where(sql`${invoicesTable.issuedAt} >= NOW() - INTERVAL '7 days' AND ${invoicesTable.status} IN ('issued', 'paid')`)
        .groupBy(sql`DATE(${invoicesTable.issuedAt})`)
        .orderBy(sql`DATE(${invoicesTable.issuedAt})`);
      sevenDaySales = rows.map((r) => ({ day: r.day, total: parseFloat(r.total) }));
    }

    res.json({
      overdueTasks,
      upcomingTasks,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      pendingOrdersCount: parseInt(pendingOrdersRow?.count ?? "0"),
      unpaidInvoicesCount: parseInt(unpaidRow?.count ?? "0"),
      todaySales,
      monthSales,
      sevenDaySales,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
