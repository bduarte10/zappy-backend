import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('/')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('session')
  async startSession() {
    try {
      console.log('Iniciando sessão');
      const { qrCode, isReady } = await this.whatsappService.initializeClient();
      console.log('Resposta do initializeClient:', { qrCode, isReady });

      if (isReady) {
        console.log('Usuário já está em sessão');
        return {
          message: 'Usuário já está em sessão',
        };
      }

      const responseData = {
        message: 'Iniciando sessão do WhatsApp, favor scanear o QR code',
        qrCode,
      };
      console.log('Resposta final:', {
        ...responseData,
        qrCodeLength: qrCode ? qrCode.length : 0,
      });
      return responseData;
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      throw error;
    }
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

  @Get('status')
  async getStatus() {
    const isConnected = await this.whatsappService.userIsReady();
    return {
      status: isConnected ? 'true' : 'false',
    };
  }
}
