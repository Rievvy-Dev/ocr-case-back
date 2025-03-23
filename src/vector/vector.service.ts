import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { HfInference } from '@huggingface/inference';
import { ChromaClient, IEmbeddingFunction } from 'chromadb';

@Injectable()
export class VectorService {
  private hf: HfInference;
  private chroma: ChromaClient;
  private embeddingFunction: IEmbeddingFunction;

  constructor(private prisma: PrismaService) {
    this.hf = new HfInference(process.env.HF_API_KEY); 
    this.chroma = new ChromaClient({ path: 'chroma_db' });

    this.embeddingFunction = {
      generate: async (texts: string[]) => {
        const response = await this.hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: texts,
        });

        return response as number[][];
      },
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });

    return response as number[];
  }

  async saveEmbedding(fileId: string, text: string) {
    const embedding = await this.generateEmbedding(text);

    await this.prisma.embedding.create({
      data: {
        fileId,
        embedding: JSON.stringify(embedding),
      },
    });

    const collection = await this.chroma.getOrCreateCollection({
      name: 'documents',
      embeddingFunction: this.embeddingFunction, 
    });

    await collection.add({
      ids: [fileId],
      embeddings: [embedding],
      metadatas: [{ fileId }],
    });

    return { fileId, embedding };
  }

  async searchSimilarDocuments(query: string) {
    const queryEmbedding = await this.generateEmbedding(query);

    const collection = await this.chroma.getCollection({
      name: 'documents',
      embeddingFunction: this.embeddingFunction, 
    });

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 5,
    });

    if (!results.documents || results.documents.length === 0) {
      throw new NotFoundException('Nenhum documento relevante encontrado.');
    }

    return results.documents;
  }
}
