import {
  Controller,
  Post,
  Body,
  NotFoundException,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthRequest } from '../types/express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import Response from 'express';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a message to a chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', example: '12345' },
        sender: { type: 'string', example: 'user' },
        message: { type: 'string', example: 'Olá, como você está?' },
        fileId: { type: 'string', example: 'file-id-12345' },
      },
      required: ['chatId', 'sender', 'message'],
    },
  })
  async sendMessage(
    @Body()
    body: { chatId: string; sender: string; message: string; fileId?: string },
    @Req() req: AuthRequest,
  ) {
    try {
      return await this.chatService.sendMessage(
        body.chatId,
        body.sender,
        body.message,
        body.fileId,
      );
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post('messages/history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get messages from a chat' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', example: '12345' },
      },
      required: ['chatId'],
    },
  })
  async getMessages(@Body() body: { chatId: string }, @Req() req: AuthRequest) {
    try {
      return await this.chatService.getMessages(body.chatId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post('download')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download pdf of messages' })
  @ApiResponse({ status: 200, description: 'Messages file' })
  async downloadChatHistory(
    @Body() body: { chatId: string },
  ): Promise<StreamableFile> {
    if (!body.chatId) {
      throw new BadRequestException('O chatId é obrigatório.');
    }

    try {
      const pdfBuffer = await this.chatService.generateChatHistoryPdf(body.chatId);
      const readableStream = Readable.from(pdfBuffer);

      const file = new StreamableFile(readableStream, {
        type: 'application/pdf',
        disposition: `attachment; filename=chat-${body.chatId}.pdf`,
      });

      return file;
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
