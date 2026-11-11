import { createPrismaClient } from "@quali/database";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const db = createPrismaClient();
export type AssetKind = "logo" | "favicon";
export type Branding = {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
};
export const defaultBranding: Branding = {
  appName: "Quali Benefícios",
  primaryColor: "#0c66aa",
  secondaryColor: "#21834a",
  logoUrl: "",
  faviconUrl: "",
};
const key = "visualIdentity";
const directory = resolve(process.env.BRAND_ASSET_DIR || join(process.cwd(), "storage", "branding"));
const fileFor = (kind: AssetKind) => join(directory, `${kind}.png`);
export const imageEndpoint = (kind: AssetKind) => `/v1/branding/assets/${kind}`;

export async function readBranding(): Promise<Branding> {
  const record = await db.systemSetting.findUnique({ where: { key } });
  const raw = (record?.value ?? {}) as Partial<Branding>;
  return {
    appName: typeof raw.appName === "string" ? raw.appName : defaultBranding.appName,
    primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : defaultBranding.primaryColor,
    secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : defaultBranding.secondaryColor,
    logoUrl: typeof raw.logoUrl === "string" && raw.logoUrl.startsWith("/v1/branding/assets/") ? raw.logoUrl : "",
    faviconUrl: typeof raw.faviconUrl === "string" && raw.faviconUrl.startsWith("/v1/branding/assets/") ? raw.faviconUrl : "",
  };
}

export async function updateBrandColors(actorId: string, incoming: Pick<Branding, "appName" | "primaryColor" | "secondaryColor">) {
  const current = await readBranding();
  const updated = { ...current, ...incoming };
  await db.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key }, create: { key, value: updated }, update: { value: updated },
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
  const output = await transformer.rotate().resize(
    kind === "favicon"
      ? { width: 64, height: 64, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }
      : { width: 1200, height: 400, fit: "inside", withoutEnlargement: true },
  ).png({ compressionLevel: 9 }).toBuffer();

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
    const next: Branding = { ...current, [kind === "logo" ? "logoUrl" : "faviconUrl"]: imageEndpoint(kind) };
    await db.$transaction(async tx => {
      await tx.systemSetting.upsert({ where: { key }, create: { key, value: next }, update: { value: next } });
      await tx.auditLog.create({
        data: { actorId, action: kind === "logo" ? "LOGO_UPDATED" : "FAVICON_UPDATED",
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
