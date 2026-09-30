import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const DOCS_MAX = 20 * 1024 * 1024; // 20 МБ

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function saveToDisk(file: UploadedFileLike, prefix: string): string {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = extname(file.originalname).toLowerCase();
  const name = `${prefix}-${randomUUID()}${ext}`;
  writeFileSync(join(UPLOAD_DIR, name), file.buffer);
  return name;
}

@Catch()
export class UploadExceptionFilter implements ExceptionFilter {
  catch(err: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (err?.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Файл слишком большой' });
      return;
    }
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || 'Ошибка загрузки' });
  }
}

@Controller('api')
@UseFilters(UploadExceptionFilter)
export class UploadController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/upload/documents — ZIP или PDF до 20 МБ */
  @Post('auth/upload/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: DOCS_MAX },
      fileFilter: (_req: any, file: any, cb: any) => {
        const ext = extname(file.originalname).toLowerCase();
        const isAllowed =
          file.mimetype === 'application/zip' ||
          file.mimetype === 'application/x-zip-compressed' ||
          file.mimetype === 'multipart/x-zip' ||
          file.mimetype === 'application/pdf' ||
          ext === '.zip' ||
          ext === '.pdf';
        if (!isAllowed) {
          cb(new BadRequestException('Ожидается ZIP-архив или PDF-файл'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocuments(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body('initData') initData: string,
  ) {
    this.authService.validateInitData(initData);
    if (!file) throw new BadRequestException('Файл не загружен');
    const filename = saveToDisk(file, 'docs');
    return { filename };
  }
}