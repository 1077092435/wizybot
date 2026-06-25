import { Injectable, Inject } from '@nestjs/common';
import type { ILlmProvider } from './interfaces/llm-provider.interface';

@Injectable()
export class ChatService {

  constructor(
    @Inject('ILlmProvider') private readonly llmProvider: ILlmProvider,
  ) {}


  async handleChat(enquiry: string): Promise<string> {
    try {
      
      const response = await this.llmProvider.processEnquiry(enquiry);
      return response;
    } catch (error) {
      console.error('Error en ChatService:', error);
      return 'Lo siento, hubo un problema al procesar tu consulta.';
    }
  }
}