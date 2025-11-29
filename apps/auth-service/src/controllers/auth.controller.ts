import { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, sendOtp, tracOtpRequest, validationRegistrationData, verifyOtp } from "../utils/auth.helper";
import prisma from "../../../../packages/libs/prisma";
import { ValidationError } from "../../../../packages/error-handler";
import bcrypt from "bcryptjs";

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validationRegistrationData(req.body, "user");
        const { name, email } = req.body

        const existingUser = await prisma.users.findUnique({where: {email: email}});

        if (existingUser) {
            return next(new ValidationError("User already existing with this email"))
        }

        await checkOtpRestrictions(email, next);
        await tracOtpRequest(email, next);
        await sendOtp(name,email, "user-activation-mail");

        res.status(200).json({
            message: "OTP sent to email. Please verify your account"
        });
    } catch (error) {
        return next(error);
    }
}

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {email, otp, password, name} = req.body;
        if(!email || !otp || !password || !name) {
            return next(new ValidationError("Missing required fields"));
        }

        const existingUser = await prisma.users.findUnique({where: {email: email}});
        if(existingUser) {
            return next(new ValidationError("User already exist"));
        }

        await verifyOtp(email, otp, next);
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.users.create({
            data : {
                name: name,
                email: email,
                password: hashedPassword
            }
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully"
        })
    } catch (error) {
        return next(error);
    }
}