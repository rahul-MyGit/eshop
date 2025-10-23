import crypto from "crypto";
import { ValidationError } from "../../../../packages/error-handler";
import { NextFunction } from "express";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validationRegistrationData = (data: any, userType: "user" | "seller") => {
    const {name, email, password, phone_number, country} = data;
    
    if( !name || !email || !password || (userType === "seller" && (!phone_number || !country))){
        throw new ValidationError("Missing required fields")
    }

    if(!emailRegex.test(email)){
        throw new ValidationError("Invalid email format")
    }
}

export const checkOtpRestrictions = async (email: string, next: NextFunction) => {
    //check from redis
}

export const sendOtp = async (name: string, email: string, template: string) => {
    const otp = crypto.randomInt(1000, 9999).toString();
    //redis
}