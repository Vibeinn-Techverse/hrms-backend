// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`❌ Missing environment variable: ${name}`);
  return value;
}

export const getEnv = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "4000",

  DATABASE_URL: required("DATABASE_URL"),

  CLERK_SECRET_KEY: required("CLERK_SECRET_KEY"),
  CLERK_PUBLISHABLE_KEY: required("CLERK_PUBLISHABLE_KEY"),
  CLERK_WEBHOOK_SECRET: required("CLERK_WEBHOOK_SECRET"),

  REDIS_URL: required("UPSTASH_REDIS_REST_URL"),
  REDIS_TOKEN: required("UPSTASH_REDIS_REST_TOKEN"),

  SMTP_HOST: required("SMTP_HOST"),
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_USER: required("SMTP_USER"),
  SMTP_PASS: required("SMTP_PASS"),
  SMTP_FROM: required("SMTP_FROM"),

  S3_REGION: required("AWS_REGION"),
  S3_ACCESS_KEY: required("AWS_ACCESS_KEY_ID"),
  S3_SECRET_KEY: required("AWS_SECRET_ACCESS_KEY"),
  S3_BUCKET: required("S3_BUCKET_NAME"),

  isDevelopment: () => process.env.NODE_ENV !== "production",
  isProduction: () => process.env.NODE_ENV === "production",
};
