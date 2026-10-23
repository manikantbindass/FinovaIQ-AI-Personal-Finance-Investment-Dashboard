import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
export const uuid = z.uuid();
export const amount = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/)
  .refine((v) => Number(v) > 0, "Must be greater than zero");
export const nonnegative = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/);
export const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const date = z.iso
  .date()
  .refine(
    (v) => v >= "2000-01-01" && v <= "2099-12-31",
    "Date outside supported range",
  );
export const text = z.string().trim().min(1).max(120);
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new BadRequestException(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  return parsed.data;
}
