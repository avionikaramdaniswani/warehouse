import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import kategoriRouter from "./kategori.js";
import itemsRouter from "./items.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(kategoriRouter);
router.use(itemsRouter);

export default router;
