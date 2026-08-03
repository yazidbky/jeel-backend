import crypto from "crypto";

export const generateOtp = () => {
    return crypto.randomInt(100000,999999).toString();
};

export const generateResetToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

export const hashValue = (value) => {
    return crypto.createHash("sha256").update(value).digest("hex");
};