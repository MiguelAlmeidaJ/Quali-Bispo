import {
  BadRequestException, Controller, Get, Headers, HttpCode, HttpStatus,
  NotFoundException, Param, Post, Res, UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { Express } from "express";
import { requireDev } from "./dev.controller";
import { readBrandAsset, readBranding, storeBrandAsset, type AssetKind } from "./branding.service";

@Controller("branding")
export class BrandingController {
  @Get()
  @HttpCode(HttpStatus.OK)
  publicSettings() { return readBranding(); }

  @Get("assets/:kind")
  async asset(@Param("kind") kind: string, @Res() response: Response) {
    if (kind !== "logo" && kind !== "favicon") throw new NotFoundException();
    try {
      const content = await readBrandAsset(kind);
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      return response.send(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundException("Imagem não cadastrada");
      throw error;
    }
  }
}

@Controller("dev/branding")
export class BrandingUploadController {
  @Post("upload/:kind")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async upload(
    @Headers("authorization") authorization: string | undefined,
    @Param("kind") kind: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = await requireDev(authorization);
    if (kind !== "logo" && kind !== "favicon") throw new BadRequestException("Tipo de imagem inválido");
    if (!file?.buffer?.length) throw new BadRequestException("Selecione uma imagem de até 2 MB");
    try { return await storeBrandAsset(kind as AssetKind, file.buffer, user.id); }
    catch (error) {
      if (error instanceof Error && /Formato inválido|unsupported|Input buffer|corrupt|pixel limit|warning/i.test(error.message)) {
        throw new BadRequestException("Imagem inválida. Envie PNG, JPG ou WebP com até 2 MB.");
      }
      throw error;
    }
  }
}
