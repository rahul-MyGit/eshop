import { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, handleForgetPassword, sendOtp, tracOtpRequest, validationRegistrationData, verifyForgetPsswordOtp, verifyOtp } from "../utils/auth.helper";
import prisma from "../../../../packages/libs/prisma";
import { AuthError, ValidationError } from "../../../../packages/error-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookie";

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

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {email, password} = req.body;
        if(!email) {
            return next(new ValidationError("email is required"));
        }
        if(!password) {
            return next(new ValidationError("password is required"));
        }

        const user = await prisma.users.findUnique({where: {email: email}});
        if(!user) {
            return next(new ValidationError("User not found"));
        }

        const isPasswordValid = bcrypt.compare(password, user.password!);
        if(!isPasswordValid) {
            return next(new AuthError("Invalid credentials"));
        }

        const accesstoken = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET as string, {expiresIn: "15m"});
        const refreshToken = jwt.sign({email: email}, process.env.REFRESH_TOKEN_SECRET as string, {expiresIn: "7d"});

        setCookie(res, "refresh_token", refreshToken);
        setCookie(res, "access_token", accesstoken);

        res.status(200).json({
            message: "login successfull",
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        })
    }
    catch (error) {
        return next(error);
    }
}

//TODO: refresh-token controller

export const userForgetPassword = async(req: Request, res: Response, next: NextFunction) => {
    await handleForgetPassword(req, res, next, 'user');
}

export const verifyUserForgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    await verifyForgetPsswordOtp(req, res, next)
}

export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {email,newPassword} = req.body;
        
        if(!email || !newPassword){
            return next(new ValidationError("Email and password is required"));
        }

        const user = await prisma.users.findUnique({where: {email}});
        if(!user) return next(new ValidationError("User not found"));

        const isSamePassword = await bcrypt.compare(newPassword, user.password!);
        if(isSamePassword){
            return next(new ValidationError("New password cannot be same as the old password"));
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);

        await prisma.users.update({
            where: {email},
            data: {password: hashPassword}
        });

        res.status(200).json({message: "Password reset successfully"})

    } catch (error) {
        next(error)
    }
}