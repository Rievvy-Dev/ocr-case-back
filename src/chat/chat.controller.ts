import { Controller, Post, Body, NotFoundException, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthRequest } from '../types/express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

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
      },
      required: ['chatId', 'sender', 'message'],
    },
  })
  async sendMessage(
    @Body() body: { chatId: string; sender: string; message: string },
    @Req() req: AuthRequest
  ) {
    try {
      return await this.chatService.sendMessage(body.chatId, body.sender, body.message);
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
  async getMessages(
    @Body() body: { chatId: string },
    @Req() req: AuthRequest
  ) {
    try {
      return await this.chatService.getMessages(body.chatId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
