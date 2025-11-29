import express, {Router} from "express";

import { loginUser, resetUserPassword, userForgetPassword, userRegistration, verifyUser, verifyUserForgetPassword } from "../controllers/auth.controller";

const router: Router = express.Router()

router.post("/user-registeration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser)

router.post("/forgot-password-user", userForgetPassword);
router.post("/reset-password-user", resetUserPassword);
router.post("/verify-forgot-password-user", verifyUserForgetPassword);

export default router