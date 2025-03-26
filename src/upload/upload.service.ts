import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp'; 

@Injectable()
export class UploadService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async saveFile(file: Express.Multer.File, userId: string, fileType: string) {
    let extractedText = '';
    let summary = '';

    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text.trim();
    } else if (file.mimetype.startsWith('image/')) {
      extractedText = await this.extractTextFromImage(
        file.buffer,
        file.mimetype,
      );
    } else {
      throw new Error('Formato de arquivo não suportado.');
    }

    summary = await this.generateSummary(extractedText);

    const savedFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: file.buffer,
        extractedText,
        userId,
      },
    });

    const chat = await this.prisma.chat.create({
      data: { fileId: savedFile.id },
    });

    await this.addMessageToChat(chat.id, 'system', summary);

    return { file: savedFile, chatId: chat.id };
  }

  async extractTextFromImage(
    imageBuffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    try {
      const processedImage = await sharp(imageBuffer)
        .toFormat('png') 
        .resize(1000)
        .grayscale() 
        .toBuffer();

      // Processar com Tesseract
      const { data } = await Tesseract.recognize(processedImage, 'eng');

      return data.text.trim();
    } catch (error) {
      console.error('Erro ao extrair texto da imagem:', error);
      return 'Erro ao processar imagem.';
    }
  }

  async generateSummary(text: string): Promise<string> {
    if (!text) return 'Nenhum texto extraído para resumir.';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente que resume textos.',
          },
          { role: 'user', content: `Resuma o seguinte texto: ${text}` },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return (
        response.choices[0].message?.content ??
        'Não foi possível gerar um resumo.'
      );
    } catch (error) {
      console.error('Erro ao gerar o resumo:', error);
      return 'Erro ao gerar o resumo.';
    }
  }

  async addMessageToChat(chatId: string, sender: string, content: string) {
    await this.prisma.message.create({
      data: {
        chatId,
        sender,
        content,
      },
    });
  }

  async listUserFiles(userId: string) {
    return this.prisma.file.findMany({
      where: { userId },
      select: {
        id: true,
        filename: true,
        chat: {
          select: { id: true },
        },
      },
    });
  }

  async getFileById(fileId: string) {
    return this.prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        filename: true,
        mimetype: true,
        content: true,
        extractedText: true,
        chat: {
          select: { id: true },
        },
      },
    });
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { chat: true },
    });

    if (!file) {
      console.error(`Arquivo com ID ${fileId} não encontrado.`);
      return false;
    }

    if (file.chat) {
      await this.prisma.message.deleteMany({
        where: { chatId: file.chat.id },
      });

      await this.prisma.chat.delete({
        where: { id: file.chat.id },
      });
    }

    await this.prisma.file.delete({
      where: { id: fileId },
    });

    return true;
  }
}
