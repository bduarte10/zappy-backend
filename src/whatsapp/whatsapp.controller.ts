import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('/')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('session')
  async startSession(@Body('userId') userId: string) {
    if (!userId || userId === '') {
      return {
        message: 'O userId não pode ser vazio',
      };
    }

    try {
      console.log(`Iniciando sessão para userId: ${userId}`);
      const { qrCode, isReady } =
        await this.whatsappService.initializeClient(userId);
      console.log('Resposta do initializeClient:', { qrCode, isReady });

      if (isReady) {
        console.log(`Usuário ${userId} já está em sessão`);
        return {
          message: 'Usuário já está em sessão',
          userId,
        };
      }

      const responseData = {
        message:
          'Iniciando sessão do WhatsApp para o usuário, favor scanear o QR code',
        userId,
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

  @Get('messages/:userId')
  async getMessages(@Param('userId') userId: string) {
    const isConnected = await this.whatsappService.userIsReady(userId);
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
        userId,
      };
    }
    const messages = await this.whatsappService.getMessages(userId);

    return { messages };
  }

  // Endpoint para obter todos os grupos do usuário
  @Post('groups')
  async getGroups(@Body('userId') userId: string) {
    const isConnected = await this.whatsappService.userIsReady(userId);
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
        userId,
      };
    }
    const groups = await this.whatsappService.getGroups(userId);
    return { groups };
  }

  // Endpoint para obter contatos de um grupo específico
  @Post('groups/:groupId/contacts')
  async getGroupContacts(
    @Body('userId') userId: string,
    @Param('groupId') groupId: string,
  ) {
    const isConnected = await this.whatsappService.userIsReady(userId);
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
        userId,
      };
    }
    const contacts = await this.whatsappService.getGroupContacts(
      userId,
      groupId,
    );
    return { contacts };
  }

  //rota logout
  @Post('logout')
  async logout(@Body('userId') userId: string) {
    const isConnected = await this.whatsappService.userIsReady(userId);
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
        userId,
      };
    }
    await this.whatsappService.logout(userId);
    return { message: 'Usuário deslogado com sucesso' };
  }

  @Post('send-messages')
  async sendMessages(
    @Body('userId') userId: string,
    @Body('contacts') contacts: string[],
    @Body('message') message: string,
  ) {
    const isConnected = await this.whatsappService.userIsReady(userId);
    if (!isConnected) {
      return {
        message: 'Usuário não está em sessão',
        userId,
      };
    }
    this.whatsappService.sendMessagesToContacts(userId, contacts, message);
    return {
      message: 'Mensagens estão sendo enviadas.',
      userId,
    };
  }

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    const isConnected = await this.whatsappService.userIsReady(userId);

    return {
      status: isConnected ? 'true' : 'false',
      userId,
    };
  }
}
