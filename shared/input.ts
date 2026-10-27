import { z } from "zod";

export const regionSchema = z.enum(["cn", "global"]);
export type Region = z.infer<typeof regionSchema>;

export const keySourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("env"), name: z.string().min(1) }).strict(),
  z.object({ type: z.literal("command"), argv: z.array(z.string()).min(1) }).strict(),
]);
export type KeySource = z.infer<typeof keySourceSchema>;

export const inputSchema = z.object({ region: regionSchema, keySource: keySourceSchema }).strict();
export type UsageInput = z.infer<typeof inputSchema>;

export const configSchema = z
  .object({
    region: regionSchema.optional(),
    keyCommand: z.array(z.string()).min(1).optional(),
  })
  .strict();
export type Config = z.infer<typeof configSchema>;
