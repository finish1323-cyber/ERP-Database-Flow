import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import suppliersRouter from "./suppliers";
import itemsRouter from "./items";
import priceComparisonsRouter from "./price-comparisons";
import inventoryRouter from "./inventory";
import stockMovementsRouter from "./stock-movements";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";
import companyProfileRouter from "./company-profile";
import employeesRouter from "./employees";
import auditLogRouter from "./audit-log";
import backupRouter from "./backup";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import tasksRouter from "./tasks";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(authRouter);

// All routes below require a valid session token
router.use(requireAuth);

router.use(dashboardRouter);
router.use(companyProfileRouter);
router.use(employeesRouter);
router.use(auditLogRouter);
router.use(backupRouter);
router.use(suppliersRouter);
router.use(itemsRouter);
router.use(priceComparisonsRouter);
router.use(inventoryRouter);
router.use(stockMovementsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(invoicesRouter);
router.use(chatRouter);
router.use(notificationsRouter);
router.use(tasksRouter);

export default router;
