import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as pdfParse from 'pdf-parse';
import { ChromaClient, IEmbeddingFunction } from 'chromadb';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class UploadService {
  private chroma: ChromaClient;
  private embedder: any;
  private embeddingFunction: IEmbeddingFunction;

  constructor(private prisma: PrismaService) {
    this.chroma = new ChromaClient();
    this.embedder = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    this.embeddingFunction = {
      generate: async (texts: string[]) => {
        const embeddings = await Promise.all(
          texts.map(async (text) => {
            const tensor = await this.embedder(text, { pooling: 'mean', normalize: true });
            return Array.from(tensor.data as Float32Array);
          })
        );
        return embeddings;
      },
    };
  }

  async saveFile(file: Express.Multer.File, userId: string) {
    let extractedText = '';

    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text.trim();
    }

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
      data: {
        fileId: savedFile.id,
      },
    });

    if (extractedText) {
      await this.indexFile(savedFile.id, extractedText);
    }

    return { file: savedFile, chatId: chat.id };
  }

  async indexFile(fileId: string, content: string) {
    try {
      const embedding = await this.embeddingFunction.generate([content]);

      const collection = await this.chroma.getOrCreateCollection({
        name: 'documents',
        embeddingFunction: this.embeddingFunction, 
      });

      await collection.add({
        ids: [fileId],
        embeddings: embedding,
        metadatas: [{ fileId, content }],
      });
    } catch (error) {
      console.error('Erro ao indexar o arquivo no ChromaDB:', error);
    }
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
}
