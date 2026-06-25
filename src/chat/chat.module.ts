import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OllamaProvider } from './providers/ollama.provider';
import { CurrencyService } from './providers/Currency.service';

@Module({
  imports: [ConfigModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    CurrencyService, 
    {
      provide: 'ILlmProvider', 
      useClass: OllamaProvider, 
    },
  ],
})
export class ChatModule {}