import { envBool, envNumber, envString } from "./env.ts";
import { mockArtworkPng } from "./mock-image.ts";
import { ApiError } from "./errors.ts";

export type GeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function imageGenerationEndpoint(): string {
  const account =
    Deno.env.get("CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID") ?? Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
  const gateway = Deno.env.get("CLOUDFLARE_AI_GATEWAY_ID") ?? "";
  if (account && gateway) {
    return `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/openai/images/generations`;
  }
  return "https://api.openai.com/v1/images/generations";
}

function generationHeaders(): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "cf-aig-skip-cache": "true",
    "cf-aig-collect-log": "false",
  });
  const gatewayToken = Deno.env.get("CLOUDFLARE_AI_GATEWAY_TOKEN") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (gatewayToken) {
    headers.set("cf-aig-authorization", `Bearer ${gatewayToken}`);
  }
  if (openaiKey) {
    headers.set("Authorization", `Bearer ${openaiKey}`);
  } else if (gatewayToken) {
    headers.set("Authorization", `Bearer ${gatewayToken}`);
  }
  return headers;
}

export async function generateArtwork(options: {
  prompt: string;
  submissionId: string;
}): Promise<GeneratedImage> {
  if (envBool("MOCK_IMAGE_GENERATION", true)) {
    await delay(2000);
    return {
      bytes: await mockArtworkPng(options.submissionId),
      contentType: "image/png",
      extension: "png",
    };
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const gatewayToken = Deno.env.get("CLOUDFLARE_AI_GATEWAY_TOKEN") ?? "";
  if (!openaiKey && !gatewayToken) {
    throw new ApiError("OPENAI_NOT_CONFIGURED", 500);
  }

  const model = envString("OPENAI_IMAGE_MODEL", "gpt-image-2");
  const quality = envString("OPENAI_IMAGE_QUALITY", "low");
  const size = envString("OPENAI_IMAGE_SIZE", "1024x1536");
  const format = envString("OPENAI_IMAGE_FORMAT", "webp");
  const compression = envNumber("OPENAI_IMAGE_COMPRESSION", Number.NaN);

  const body: Record<string, unknown> = {
    model,
    prompt: options.prompt,
    n: 1,
    quality,
    size,
    output_format: format,
  };
  if (Number.isFinite(compression)) {
    body.output_compression = compression;
  }

  const response = await fetch(imageGenerationEndpoint(), {
    method: "POST",
    headers: generationHeaders(),
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "13");
    const error = new ApiError("GENERATION_PACING", 429);
    (error as ApiError & { retryAfterSeconds?: number }).retryAfterSeconds =
      Number.isFinite(retryAfter) ? retryAfter : 13;
    throw error;
  }

  if (response.status === 400) {
    throw new ApiError("CONTENT_REJECTED", 400);
  }

  if (!response.ok) {
    throw new ApiError("GENERATION_FAILED", 502);
  }

  const json = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new ApiError("GENERATION_FAILED", 502);
  }

  const binary = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
  const extension = format === "jpeg" ? "jpg" : format;
  const contentType =
    format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
  return { bytes: binary, contentType, extension };
}
