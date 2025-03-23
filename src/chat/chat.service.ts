import { Injectable, NotFoundException } from '@nestjs/common';
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

  async sendMessage(chatId: string, sender: string, content: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat não encontrado.');
    }

    const userMessage = await this.prisma.message.create({
      data: {
        chatId,
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
        chatId,
        sender: 'assistant',
        content: assistantMessage,
      },
    });

    return { userMessage, chatGptMessage };
  }
}