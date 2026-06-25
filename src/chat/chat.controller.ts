import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatQueryDto } from './dto/chat-query.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async getResponse(@Body() chatQuery: ChatQueryDto) {
    return { response: await this.chatService.handleChat(chatQuery.enquiry) };
  }
}