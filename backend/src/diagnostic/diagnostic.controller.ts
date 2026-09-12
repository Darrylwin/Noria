import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResultDto } from './dto/diagnostic-result.dto.js';

@Controller('diagnostics')
export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() dto: SubmitDiagnosticDto): Promise<DiagnosticResultDto> {
    return this.service.submit(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<DiagnosticResultDto> {
    const result = await this.service.findById(id);

    if (!result) {
      throw new NotFoundException('Diagnostic introuvable.');
    }

    return result;
  }
}
