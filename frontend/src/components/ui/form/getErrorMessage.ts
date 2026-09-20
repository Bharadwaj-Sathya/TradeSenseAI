import type { FieldError, FieldErrorsImpl, Merge, FieldValues } from "react-hook-form";

type RHFError =
  | FieldError
  | Merge<FieldError, FieldErrorsImpl<FieldValues>>
  | undefined;

export function getErrorMessage(error: RHFError): string | undefined {
  if (!error) return undefined;
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}
