import { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, sendOtp, tracOtpRequest, validationRegistrationData } from "../utils/auth.helper";
import prisma from "../../../../packages/libs/prisma";
import { ValidationError } from "../../../../packages/error-handler";

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validationRegistrationData(req.body, "user");
        const { name, email } = req.body

        const existingUser = await prisma.user.findUnique({ where: email });

        if (existingUser) {
            return next(new ValidationError("User already existing with this email"))
        }

        await checkOtpRestrictions(email, next);
        await tracOtpRequest(email, next);
        await sendOtp(email, name, "user-activation-mail");

        res.status(200).json({
            message: "OTP sent to email. Please verify your account"
        });
    } catch (error) {
        return next(error);
    }
}