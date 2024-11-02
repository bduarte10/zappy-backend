import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('/')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('session')
  async startSession(@Body('userId') userId: string) {
    const { qrCode, isReady } =
      await this.whatsappService.initializeClient(userId);
    if (isReady) {
      return {
        message: 'Usuário já está em sessão',
        userId,
      };
    }
    return {
      message: 'Sessão do WhatsApp iniciada para o usuário',
      userId,
      qrCode,
    };
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
}
