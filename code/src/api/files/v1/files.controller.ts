import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { FilesService } from './files.service';

@Controller('v1/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':uuid')
  async getImageByUuid(@Param('uuid') uuid: string, @Query() query: Record<string, unknown>, @Res() res: Response) {
    const stream = await this.filesService.getImageByUuid(uuid, query);
    const contentType = stream.headers['content-type'];

    res.header('Accept', 'image/webp');
    res.header('Content-Type', typeof contentType === 'string' ? contentType : 'binary/octet-stream');

    stream.data.pipe(res);
  }
}
