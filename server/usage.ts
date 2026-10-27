import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
  toneFromUsedPct,
  unavailable,
  usedPctOf,
  windowFromReportedDuration,
  windowFromUsedPct,
  type UsageAccount,
  type UsageDetail,
  type UsageReport,
} from "@getpaseo/plugin/server/usage";
import {
  configSchema,
  type Config,
  type KeySource,
  type Region,
  type UsageInput,
} from "../shared/input.js";

const execFileAsync = promisify(execFile);

const HOSTS: Record<Region, string> = {
  cn: "https://open.bigmodel.cn",
  global: "https://api.z.ai",
};
const KEY_VARIABLES: Record<Region, readonly string[]> = {
  cn: ["ZHIPU_API_KEY", "ZHIPUAI_API_KEY", "BIGMODEL_API_KEY"],
  global: ["Z_AI_API_KEY", "ZAI_API_KEY"],
};

// In the quota response `unit: 3` counts hours and `unit: 6` is the weekly window.
const HOUR_UNIT = 3;
const WEEK_UNIT = 6;
const HOUR_SECONDS = 3600;
const WEEK_SECONDS = 604800;

const nullableNumber = z.number().nullish();
const limitSchema = z.object({
  type: z.string(),
  unit: z.number(),
  number: z.number(),
  usage: nullableNumber,
  currentValue: nullableNumber,
  percentage: nullableNumber,
  nextResetTime: nullableNumber,
});
const responseSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  success: z.boolean(),
  data: z.object({ level: z.string().optional(), limits: z.array(limitSchema) }).optional(),
});
type Limit = z.infer<typeof limitSchema>;

function configPath(): string {
  return join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "glm-usage.json");
}

async function readConfig(): Promise<Config> {
  let text: string;
  try {
    text = await readFile(configPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  return configSchema.parse(JSON.parse(text));
}

async function readKey(source: KeySource): Promise<string> {
  if (source.type === "env") {
    const key = process.env[source.name]?.trim();
    if (!key) throw new Error(`${source.name} is not set in the Paseo daemon environment`);
    return key;
  }
  const [file, ...args] = source.argv;
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(file, args, { timeout: 15_000, maxBuffer: 64 * 1024 }));
  } catch {
    throw new Error(`The key command ${file} failed or timed out`);
  }
  const key = stdout.trim();
  if (!key) throw new Error(`The key command ${file} printed nothing`);
  return key;
}

function isoFromMs(ms: number | null | undefined): string | null {
  return typeof ms === "number" ? new Date(ms).toISOString() : null;
}

function durationSeconds(limit: Limit): number | null {
  if (limit.unit === HOUR_UNIT) return limit.number * HOUR_SECONDS;
  if (limit.unit === WEEK_UNIT) return WEEK_SECONDS;
  return null;
}

export function mapQuota(body: z.infer<typeof responseSchema>): UsageReport {
  if (!body.success || !body.data) {
    if (body.code === 401 || body.code === 403) return unavailable({ kind: "rejected", status: body.code });
    return unavailable({ kind: "no_quota", detail: body.msg ?? "No active coding plan" });
  }
  const { level, limits } = body.data;

  const windows = limits
    .filter((limit) => limit.type !== "TIME_LIMIT")
    .map((limit) => ({ limit, seconds: durationSeconds(limit) }))
    .sort((a, b) => (a.seconds ?? Infinity) - (b.seconds ?? Infinity))
    .map(({ limit, seconds }) =>
      windowFromReportedDuration({
        durationSeconds: seconds,
        unknown: { id: limit.type.toLowerCase(), label: "Limit", shortLabel: "" },
        utilizationPct: limit.percentage,
        resetsAt: isoFromMs(limit.nextResetTime),
        summary: true,
        tone: toneFromUsedPct(limit.percentage),
      }),
    );

  const details: UsageDetail[] = [];
  const mcp = limits.find((limit) => limit.type === "TIME_LIMIT");
  if (mcp) {
    const usedPct = mcp.percentage ?? usedPctOf(mcp.currentValue, mcp.usage);
    windows.push(
      windowFromUsedPct({
        id: "mcp_monthly",
        label: "MCP calls · Monthly",
        shortLabel: "MCP",
        utilizationPct: usedPct,
        resetsAt: isoFromMs(mcp.nextResetTime),
        tone: toneFromUsedPct(usedPct),
      }),
    );
    if (mcp.currentValue != null && mcp.usage != null) {
      details.push({
        id: "mcp_calls",
        label: "MCP calls",
        value: `${mcp.currentValue} of ${mcp.usage} used this month`,
      });
    }
  }

  return {
    status: "available",
    ...(level ? { planLabel: level.charAt(0).toUpperCase() + level.slice(1) } : {}),
    windows,
    details,
  };
}

export async function fetchUsage(
  input: UsageInput,
  fetchApi: typeof fetch = fetch,
): Promise<UsageReport> {
  const key = await readKey(input.keySource);
  const response = await fetchApi(`${HOSTS[input.region]}/api/monitor/usage/quota/limit`, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Accept-Language": "en-US,en",
    },
  });
  if (response.status === 401 || response.status === 403) {
    return unavailable({ kind: "rejected", status: response.status });
  }
  if (!response.ok) throw new Error(`GLM quota API returned ${response.status}`);
  return mapQuota(responseSchema.parse(await response.json()));
}

export async function discover(): Promise<UsageAccount[]> {
  const config = await readConfig();
  const region = config.region ?? "cn";
  let keySource: KeySource | null = null;
  if (config.keyCommand) {
    keySource = { type: "command", argv: config.keyCommand };
  } else {
    const name = KEY_VARIABLES[region].find((variable) => process.env[variable]);
    if (name) keySource = { type: "env", name };
  }
  if (!keySource) return [];
  return [{ key: region, label: new URL(HOSTS[region]).host, input: { region, keySource } }];
}
