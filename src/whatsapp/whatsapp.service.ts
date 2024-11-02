import { Injectable } from '@nestjs/common';
import { Client, GroupChat, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhatsappService {
  private clients: Map<string, Client> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private isConected: Map<string, boolean> = new Map();

  // Inicializa o cliente WhatsApp para o usuário especificado
  async initializeClient(
    userId: string,
  ): Promise<{ client: Client; qrCode?: string; isReady?: boolean }> {
    const existentClient = this.clients.get(userId);
    const isReady = existentClient?.info?.wid ? true : false;
    if (isReady) {
      return {
        client: existentClient,
        isReady,
      };
    }
    if (this.clients.has(userId)) {
      return {
        client: this.clients.get(userId),
        qrCode: this.qrCodes.get(userId),
        isReady,
      };
    }

    const sessionPath = path.resolve(__dirname, '..', 'sessions', userId);

    // Criar diretório se ele não existir
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId, dataPath: sessionPath }),
    });

    this.clients.set(userId, client);

    return new Promise<{ client: Client; qrCode?: string }>(
      (resolve, reject) => {
        client.initialize();

        client.on('qr', (qr) => {
          console.log(`QR code for user ${userId}:`);
          qrcode.generate(qr, { small: true });
          this.qrCodes.set(userId, qr);
          // Retorna o QR code imediatamente para o usuário
          resolve({ client, qrCode: qr });
        });

        client.on('ready', () => {
          console.log(`WhatsApp is ready for user ${userId}!`);
          this.isConected.set(userId, true);
          this.qrCodes.delete(userId);
          resolve({ client });
        });

        client.on('auth_failure', (msg) => {
          console.error('Authentication failure:', msg);
          reject(new Error('Authentication failure'));
        });

        client.on('disconnected', (reason) => {
          console.log('Client was logged out', reason);
          this.clients.delete(userId);
        });
      },
    );
  }
  async userIsReady(userId: string) {
    return this.isConected.get(userId);
  }
  // Obter grupos de um usuário específico
  async getGroups(userId: string) {
    const { client } = await this.initializeClient(userId);
    const chats = await client.getChats();
    const groups = chats
      .filter((chat) => chat.isGroup)
      .map((group) => ({
        id: group.id._serialized,
        name: group.name,
      }));
    return groups;
  }

  // Obter contatos de um grupo específico para um usuário
  async getGroupContacts(userId: string, groupId: string) {
    const { client } = await this.initializeClient(userId);
    const chat = (await client.getChatById(groupId)) as GroupChat;

    if (!chat.isGroup) {
      throw new Error('O chat selecionado não é um grupo.');
    }

    const contacts = await Promise.all(
      chat.participants.map(async (participant) => {
        const contact = await client.getContactById(participant.id._serialized);
        return {
          id: participant.id._serialized,
          name: contact.pushname || contact.number,
          number: contact.number,
        };
      }),
    );

    return contacts;
  }

  async sendMessage(userId: string, to: string, message: string) {
    const { client } = await this.initializeClient(userId);
    await client.sendMessage(to, message);
  }

  async getMessages(userId: string) {
    const { client } = await this.initializeClient(userId);
    const chats = await client.getChats();
    const messages = await Promise.all(
      chats.map(async (chat) => {
        const chatMessages = await chat.fetchMessages({ limit: 10 });
        return {
          id: chat.id._serialized,
          name: chat.name,
          messages: chatMessages.map((message) => {
            return {
              id: message.id.id,
              from: message.from,
              to: message.to,
              body: message.body,
              timestamp: message.timestamp,
            };
          }),
        };
      }),
    );
    return messages;
  }

  // Obter QR code para um usuário específico
  getQrCode(userId: string): string {
    return this.qrCodes.get(userId);
  }

  async logout(userId: string) {
    const { client } = await this.initializeClient(userId);

    if (client) {
      client.logout();
      client.destroy();
      this.clients.delete(userId);
      this.qrCodes.delete(userId);
    }
  }
}
