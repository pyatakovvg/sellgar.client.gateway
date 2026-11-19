import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';

@Injectable()
export class FilesService {
  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  getImageByUuid(uuid: string, query: Record<string, unknown>): Promise<AxiosResponse> {
    return this.httpService.axiosRef.get(this.config.getOrThrow<string>('API_MEDIA_SRV') + '/images/' + uuid, {
      responseType: 'stream',
      params: query,
    });
  }
}
