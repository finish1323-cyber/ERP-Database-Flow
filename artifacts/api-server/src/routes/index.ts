import { Router, type IRouter } from "express";
import healthRouter from "./health";
import suppliersRouter from "./suppliers";
import itemsRouter from "./items";
import priceComparisonsRouter from "./price-comparisons";
import inventoryRouter from "./inventory";
import stockMovementsRouter from "./stock-movements";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(suppliersRouter);
router.use(itemsRouter);
router.use(priceComparisonsRouter);
router.use(inventoryRouter);
router.use(stockMovementsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(invoicesRouter);

export default router;
