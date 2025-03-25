import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getMessages(chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    if (!messages.length) {
      throw new NotFoundException('Nenhuma mensagem encontrada para este chat.');
    }

    return messages;
  }

  async sendMessage(chatId: string | null, sender: string, content: string, fileId?: string) {
    let finalChatId = chatId ?? undefined;

    if (!finalChatId) {
      if (!fileId) {
        throw new BadRequestException('Para criar um novo chat, um fileId é necessário.');
      }

      const chat = await this.prisma.chat.create({
        data: { fileId },
      });
      finalChatId = chat.id;
    }
    
    const userMessage = await this.prisma.message.create({
      data: {
        chatId: finalChatId,
        sender,
        content,
      },
    });

    const previousMessages = await this.prisma.message.findMany({
      where: { chatId: finalChatId },
      orderBy: { createdAt: 'asc' },
    });

    const chatHistory: ChatCompletionMessageParam[] = previousMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    chatHistory.push({ role: 'user', content });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatHistory,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    const chatGptMessage = await this.prisma.message.create({
      data: {
        chatId: finalChatId,
        sender: 'assistant',
        content: assistantMessage,
      },
    });

    return { chatId: finalChatId, userMessage, chatGptMessage };
  }
}
