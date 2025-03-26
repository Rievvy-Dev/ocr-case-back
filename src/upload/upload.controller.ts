import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  Body,
  BadRequestException,
  Res,
  Delete,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthRequest } from '../types/express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Express, Response } from 'express';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (PDF or image)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!req.user) {
      throw new Error('User not authenticated.');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de arquivo não suportado.');
    }

    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    const userId = req.user.sub;

    const { file: savedFile, chatId } = await this.uploadService.saveFile(
      file,
      userId,
      fileType,
    );

    return { fileId: savedFile.id, chatId };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List files of the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of files' })
  async listFiles(@Req() req: AuthRequest) {
    if (!req.user) {
      throw new Error('User not authenticated.');
    }
    const userId = req.user.sub;
    return this.uploadService.listUserFiles(userId);
  }

  @Post('file')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ status: 200, description: 'Returns the file details' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileById(
    @Req() req: AuthRequest,
    @Body('pdfId') fileId: string,
    @Res() response: Response,
  ) {
    if (!req.user) {
      throw new Error('User not authenticated.');
    }

    if (!fileId) {
      throw new BadRequestException("O campo 'pdfId' é obrigatório.");
    }

    const file = await this.uploadService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException('File not found.');
    }

    if (file.mimetype !== 'application/pdf') {
      return response.json(file);
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline');
    response.send(file.content);
    response.end();

    return response.send(file.content);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a chat by ID' })
  @ApiResponse({ status: 204, description: 'Chat deleted successfully' })
  @ApiResponse({ status: 400, description: 'chatId is required' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', example: '12345' },
      },
      required: ['fileId'],
    },
  })
  async deleteFile(@Body() body: { fileId: string }) {
    console.log('Recebido para deletar arquivo:', body);

    if (!body || !body.fileId) {
      throw new BadRequestException("O campo 'fileId' é obrigatório.");
    }

    const deleted = await this.uploadService.deleteFile(body.fileId);

    if (!deleted) {
      throw new NotFoundException(
        `Arquivo com ID ${body.fileId} não encontrado.`,
      );
    }
  }
}
