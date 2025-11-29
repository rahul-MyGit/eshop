import express, {Router} from "express";

import { loginUser, userRegistration, verifyUser } from "../controllers/auth.controller";

const router: Router = express.Router()

router.post("/user-registeration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser)

//TODO: refresh token route

export default router