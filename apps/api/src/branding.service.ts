import { createPrismaClient } from "@quali/database";
import { config as loadEnv } from "dotenv";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

loadEnv({ path: "../../.env" });
const db = createPrismaClient();
export type AssetKind = "logo" | "logo-white" | "favicon";
export type Branding = {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  whiteLogoUrl: string;
  faviconUrl: string;
};
export const defaultBranding: Branding = {
  appName: "Quali Benefícios",
  primaryColor: "#0c66aa",
  secondaryColor: "#21834a",
  logoUrl: "",
  whiteLogoUrl: "",
  faviconUrl: "",
};
const key = "visualIdentity";
const directory = resolve(process.env.BRAND_ASSET_DIR || join(process.cwd(), "storage", "branding"));
const fileFor = (kind: AssetKind) => join(directory, `${kind}.png`);
export const imageEndpoint = (kind: AssetKind) => `/v1/branding/assets/${kind}`;

export async function readBranding(): Promise<Branding> {
  const record = await db.systemSetting.findUnique({ where: { key } });
  const raw = (record?.value ?? {}) as Partial<Branding>;
  const [logoAvailable, whiteLogoAvailable, faviconAvailable] = await Promise.all(
    (["logo", "logo-white", "favicon"] as const).map(async kind => {
      try { await access(fileFor(kind)); return true; } catch { return false; }
    }),
  );
  return {
    appName: typeof raw.appName === "string" ? raw.appName : defaultBranding.appName,
    primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : defaultBranding.primaryColor,
    secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : defaultBranding.secondaryColor,
    logoUrl: logoAvailable && raw.logoUrl === imageEndpoint("logo") ? raw.logoUrl : "",
    whiteLogoUrl: whiteLogoAvailable && raw.whiteLogoUrl === imageEndpoint("logo-white") ? raw.whiteLogoUrl : "",
    faviconUrl: faviconAvailable && raw.faviconUrl === imageEndpoint("favicon") ? raw.faviconUrl : "",
  };
}

export async function updateBrandColors(actorId: string, incoming: Pick<Branding, "appName" | "primaryColor" | "secondaryColor">) {
  const current = await readBranding();
  const updated = { ...current, ...incoming };
  await db.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key }, create: { key, value: { ...updated } }, update: { value: updated },
    });
    await tx.auditLog.create({
      data: { actorId, action: "VISUAL_IDENTITY_UPDATED", entityType: "SystemSetting", entityId: key,
        metadata: { fields: ["appName", "primaryColor", "secondaryColor"] } },
    });
  });
  return updated;
}

export async function storeBrandAsset(kind: AssetKind, buffer: Buffer, actorId: string) {
  const transformer = sharp(buffer, { failOn: "warning", limitInputPixels: 20_000_000 });
  const meta = await transformer.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || !meta.width || !meta.height) {
    throw new Error("Formato inválido. Use PNG, JPG ou WebP.");
  }
  const resized = transformer.rotate().resize(
    kind === "favicon"
      ? { width: 64, height: 64, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }
      : { width: 1200, height: 400, fit: "inside", withoutEnlargement: true },
  );
  let output: Buffer;
  if (kind === "logo-white") {
    // A logo do cartão precisa de transparência real; CSS não remove um fundo branco opaco.
    // Recolorimos somente os pixels visíveis, preservando os valores alpha da arte original.
    const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) transparent++;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
    if (transparent === 0) {
      throw new Error("Logo branca precisa de fundo transparente. Envie PNG ou WebP com transparência, sem fundo branco.");
    }
    output = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9 }).toBuffer();
  } else {
    output = await resized.png({ compressionLevel: 9 }).toBuffer();
  }

  await mkdir(directory, { recursive: true });
  const target = fileFor(kind);
  const temp = join(directory, `${kind}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, output, { flag: "wx" });
    try { await rename(temp, target); }
    catch (error) {
      // Windows does not always replace an existing file atomically.
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" && (error as NodeJS.ErrnoException).code !== "EPERM") throw error;
      await rm(target, { force: true }); await rename(temp, target);
    }
    const current = await readBranding();
    const prop = kind === "logo" ? "logoUrl" : kind === "logo-white" ? "whiteLogoUrl" : "faviconUrl";
    const next: Branding = { ...current, [prop]: imageEndpoint(kind) };
    await db.$transaction(async tx => {
      await tx.systemSetting.upsert({ where: { key }, create: { key, value: { ...next } }, update: { value: next } });
      await tx.auditLog.create({
        data: { actorId, action: kind === "logo" ? "LOGO_UPDATED" : kind === "logo-white" ? "WHITE_LOGO_UPDATED" : "FAVICON_UPDATED",
          entityType: "SystemSetting", entityId: key, metadata: { format: "png", bytes: output.length } },
      });
    });
    return next;
  } finally {
    await rm(temp, { force: true }).catch(() => {});
  }
}

export async function readBrandAsset(kind: AssetKind) {
  return readFile(fileFor(kind));
}
