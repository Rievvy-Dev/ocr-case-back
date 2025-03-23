import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { AuthModule } from '../auth/auth.module'; 
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule], 
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}