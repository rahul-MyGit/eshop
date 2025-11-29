import crypto from "crypto";
import { ValidationError } from "../../../../packages/error-handler";
import { NextFunction } from "express";
import redis from "../../../../packages/libs/redis";
import { sendEmail } from "./sendMail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validationRegistrationData = (data: any, userType: "user" | "seller") => {
    const { name, email, password, phone_number, country } = data;

    if (!name || !email || !password || (userType === "seller" && (!phone_number || !country))) {
        throw new ValidationError("Missing required fields")
    }

    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format")
    }
}

export const checkOtpRestrictions = async (email: string, next: NextFunction) => {
    //check from redis
    if (await redis.get(`otp_lock:${email}`)) {
        return next(new ValidationError("Account locked due to multiple failed attempts. Try again after 30 minutes"))
    }

    if (await redis.get(`otp_spam_lock:${email}`)) {
        return next(new ValidationError("Too many OTP request. Please wait 1hr before request"))
    }

    if (await redis.get(`otp_cooldown:${email}`)) {
        return next(new ValidationError("Please wait 1min , before requesting a new OTP"))
    }

}

export const tracOtpRequest = async (email: string, next: NextFunction) => {
    const otpRequestKey = `otp_request_count:${email}`;
    let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");

    if (otpRequests > 2) {
        await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600);
        return next(new ValidationError("Too many request, please wait 1hr before requesting again"))
    }

    await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600);
}

export const sendOtp = async (name: string, email: string, template: string) => {
    const otp = crypto.randomInt(1000, 9999).toString();

    await sendEmail(email, "Verify Your Email", template, { name, otp });

    await redis.set(`otp:${email}`, otp, "EX", 300);
    await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);

};

export const verifyOtp = async (email: string, otp: string, next: NextFunction) => {
    const storedOtp = await redis.get(`otp:${email}`);
    if(!storedOtp) {
        throw new ValidationError("Invalid or expired OTP");
    }

    const failedAttempsKey = `otp_attemps:${email}`;
    const failedAttemps = parseInt((await redis.get(failedAttempsKey)) || "0");

    if(storedOtp !== otp){
        if(failedAttemps >= 2){
            await redis.set(`otp_lock:${email}`, "locked", "EX", 1800); // lock for 30m
            await redis.del(`otp:${email}`, failedAttempsKey);
            throw new ValidationError("Account locked due to multiple failed attempts. Try again after 30 minutes");
        }

        await redis.set(failedAttempsKey, failedAttemps + 1, "EX", 300);
        throw new ValidationError(`Invalid OTP. Attemps left ${2 - failedAttemps}. Please try again`);
    }

    await redis.del(`otp:${email}`, failedAttempsKey);
};