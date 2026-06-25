import { IsString, IsNotEmpty } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  enquiry!: string;
}