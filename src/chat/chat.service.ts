import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { HfInference } from '@huggingface/inference';

@Injectable()
export class ChatService {
  private hf: HfInference;

  constructor(private prisma: PrismaService) {
    this.hf = new HfInference(process.env.HF_API_KEY);
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

    const response = await this.hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.1',
      inputs: content,
      parameters: { max_new_tokens: 200, temperature: 0.7 },
    });

    const assistantMessage = response.generated_text || 'Não foi possível gerar uma resposta.';

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