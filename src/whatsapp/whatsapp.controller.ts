import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';

@Controller('/')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('session')
  async startSession() {
    const isConnected = await this.whatsappService.userIsReady();

    if (isConnected) {
      return {
        message: 'Usuário já está em sessão',
      };
    }
    if (this.whatsappService.isDestroyed) {
      await this.whatsappService.restartClient();
      return {
        message: 'Sessão reiniciada',
      };
    }

    const qrCode = this.whatsappService.getQrCode();
    if (!qrCode) {
      return {
        message: 'Gerando QR Code...',
      };
    }
    return {
      message: `Escaneie o QR Code gerado: ${qrCode}`,
      qrCode,
    };
  }

  @Get('messages')
  async getMessages() {
    const isConnected = await this.whatsappService.userIsReady();
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
      };
    }
    const messages = await this.whatsappService.getMessages();
    return { messages };
  }

  @Get('groups')
  async getGroups() {
    const isConnected = await this.whatsappService.userIsReady();
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
      };
    }
    const groups = await this.whatsappService.getGroups();
    return { groups };
  }

  @Get('groups/:groupId/contacts')
  async getGroupContacts(@Param('groupId') groupId: string) {
    const isConnected = await this.whatsappService.userIsReady();
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
      };
    }
    const contacts = await this.whatsappService.getGroupContacts(groupId);
    return { contacts };
  }

  @Post('logout')
  async logout() {
    const isConnected = await this.whatsappService.userIsReady();
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
      };
    }
    await this.whatsappService.logout();
    return { message: 'Usuário deslogado com sucesso' };
  }

  @Post('send-messages')
  async sendMessages(
    @Body('contacts') contacts: string[],
    @Body('message') message: string,
  ) {
    const isConnected = await this.whatsappService.userIsReady();
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
      };
    }
    this.whatsappService.sendMessagesToContacts(contacts, message);
    return {
      message: 'Mensagens estão sendo enviadas.',
    };
  }

  @Post('send-audio-messages')
  @UseInterceptors(FileInterceptor('audio'))
  async sendAudioMessages(
    @UploadedFile() audio: Express.Multer.File,
    @Body('contactIds') contactIds: string,
  ) {
    if (!audio) {
      throw new Error('Arquivo de áudio não fornecido');
    }

    const formData = new FormData();
    formData.append(
      'audio',
      new Blob([audio.buffer], { type: audio.mimetype }),
    );
    formData.append('contactIds', contactIds);

    await this.whatsappService.sendAudioMessages(formData);
  }

  @Get('status')
  async getStatus() {
    const isConnected = await this.whatsappService.userIsReady();
    return {
      status: isConnected ? 'true' : 'false',
    };
  }
}
