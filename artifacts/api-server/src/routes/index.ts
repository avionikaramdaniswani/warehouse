import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import kategoriRouter from "./kategori.js";
import itemsRouter from "./items.js";
import transaksiMasukRouter from "./transaksi-masuk.js";
import transaksiKeluarRouter from "./transaksi-keluar.js";
import dashboardRouter from "./dashboard.js";
import activityRouter from "./activity.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(kategoriRouter);
router.use(itemsRouter);
router.use(transaksiMasukRouter);
router.use(transaksiKeluarRouter);
router.use(dashboardRouter);
router.use(activityRouter);

export default router;
