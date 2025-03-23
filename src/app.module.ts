import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [PrismaModule, AuthModule, UploadModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
