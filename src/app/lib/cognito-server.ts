import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";

const REGION =
  process.env.COGNITO_REGION ||
  (process.env.COGNITO_DOMAIN || "").split(".")[2] ||
  "eu-north-1";

export const CLIENT_ID = process.env.COGNITO_CLIENT_ID as string;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET as string;

export const cognito = new CognitoIdentityProviderClient({ region: REGION });

/** Cognito requires SECRET_HASH when the app client has a secret. */
export function secretHash(username: string): string {
  return createHmac("sha256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
}

export function authError(e: unknown): { msg: string; code: string } {
  const code = (e as { name?: string })?.name || "Error";
  const map: Record<string, string> = {
    NotAuthorizedException: "Incorrect email or password.",
    UserNotFoundException: "Incorrect email or password.",
    UserNotConfirmedException: "Please verify your email first.",
    UsernameExistsException: "An account with this email already exists.",
    CodeMismatchException: "That code is incorrect. Please try again.",
    ExpiredCodeException: "That code has expired. Request a new one.",
    InvalidPasswordException: "Password doesn't meet the requirements.",
    LimitExceededException: "Too many attempts — please wait a moment.",
  };
  return { msg: map[code] || (e as { message?: string })?.message || "Something went wrong.", code };
}
