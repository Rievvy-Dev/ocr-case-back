import { Controller, Post, Get, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthRequest } from '../types/express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Express } from 'express';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: AuthRequest) {
    if (!req.user) {
      throw new Error("User not authenticated.");
    }
    const userId = req.user.sub;
    return this.uploadService.saveFile(file, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List files of the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of files' })
  async listFiles(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new Error("User not authenticated.");
    }
    const userId = req.user.sub;
    return this.uploadService.listUserFiles(userId);
  }
}