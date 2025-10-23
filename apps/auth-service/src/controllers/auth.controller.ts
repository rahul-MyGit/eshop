import { NextFunction, Request, Response } from "express";
import { checkOtpRestrictions, validationRegistrationData } from "../utils/auth.helper";
import prisma from "../../../../packages/libs/prisma";
import { ValidationError } from "../../../../packages/error-handler";

export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
    validationRegistrationData(req.body, "user");
    const {name, email} = req.body

    const existingUser = await prisma.user.findUnique({where: email});

    if(existingUser){
        return next(new ValidationError("User already existing with this email"))
    }

    await checkOtpRestrictions(email, next);
}