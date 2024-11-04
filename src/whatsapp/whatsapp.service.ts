import { Injectable } from '@nestjs/common';
import { Client, GroupChat, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhatsappService {
  private client: Client;
  private qrCode: string;
  private isConnected: boolean = false;

  constructor() {
    this.initializeClient();
  }

  // Inicializa o cliente WhatsApp
  private async initializeClient() {
    const sessionPath = path.resolve(__dirname, '..', 'session');

    // Criar diretório se ele não existir
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // Adicione ou remova outras flags conforme necessário
        ],
      },
    });

    this.client.on('qr', (qr) => {
      console.log('QR code gerado:');
      qrcode.generate(qr, { small: true });
      this.qrCode = qr;
    });

    this.client.on('ready', () => {
      console.log('WhatsApp está pronto!');
      this.isConnected = true;
      this.qrCode = null;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Falha na autenticação:', msg);
      this.isConnected = false;
    });

    this.client.on('disconnected', async (reason) => {
      console.log('Cliente foi desconectado', reason);
      this.isConnected = false;
      this.qrCode = null;

      // Aguardar antes de tentar limpar os arquivos
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        await this.cleanSessionDirectory(sessionPath);
      } catch (error) {
        console.error('Erro ao limpar sessão após desconexão:', error);
      }

      // Reinicializar o cliente após a desconexão
      this.initializeClient();
    });

    this.client.initialize();
  }

  private async cleanSessionDirectory(sessionPath: string) {
    try {
      if (
        !(await fs.promises
          .access(sessionPath)
          .then(() => true)
          .catch(() => false))
      ) {
        return;
      }

      const deleteFile = async (filePath: string) => {
        for (let attempts = 0; attempts < 3; attempts++) {
          try {
            await fs.promises.unlink(filePath);
            break;
          } catch (error) {
            if (attempts === 2)
              console.error(`Não foi possível deletar ${filePath}:`, error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      };

      const files = await fs.promises.readdir(sessionPath, {
        withFileTypes: true,
      });

      for (const file of files) {
        const fullPath = path.join(sessionPath, file.name);
        if (file.isDirectory()) {
          await this.cleanSessionDirectory(fullPath);
          await fs.promises.rmdir(fullPath).catch(() => {});
        } else {
          await deleteFile(fullPath);
        }
      }

      await fs.promises.rmdir(sessionPath).catch(() => {});
    } catch (error) {
      console.error('Erro ao limpar diretório de sessão:', error);
    }
  }

  async userIsReady() {
    return this.isConnected;
  }

  // Obter grupos
  async getGroups() {
    if (!this.isConnected) {
      throw new Error('Cliente não está conectado');
    }
    const chats = await this.client.getChats();
    const groups = chats
      .filter((chat) => chat.isGroup)
      .map((group) => ({
        id: group.id._serialized,
        name: group.name,
      }));
    return groups;
  }

  // Obter contatos de um grupo específico
  async getGroupContacts(groupId: string) {
    if (!this.isConnected) {
      throw new Error('Cliente não está conectado');
    }
    const chat = (await this.client.getChatById(groupId)) as GroupChat;

    if (!chat.isGroup) {
      throw new Error('O chat selecionado não é um grupo.');
    }

    const contacts = await Promise.all(
      chat.participants.map(async (participant) => {
        const contact = await this.client.getContactById(
          participant.id._serialized,
        );
        return {
          id: participant.id._serialized,
          name: contact.pushname || contact.number,
          number: contact.number,
        };
      }),
    );

    return contacts;
  }

  async getMessages() {
    if (!this.isConnected) {
      throw new Error('Cliente não está conectado');
    }
    const chats = await this.client.getChats();
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

  // Obter QR code
  getQrCode(): string {
    return this.qrCode;
  }

  async logout() {
    if (this.client) {
      await this.client.logout();
      await this.client.destroy();
      this.isConnected = false;
      this.qrCode = null;
    }
  }

  async sendMessagesToContacts(contacts: string[], message: string) {
    if (!this.isConnected) {
      throw new Error('Cliente não está conectado');
    }

    for (const contact of contacts) {
      // Inicia o envio das mensagens em paralelo sem bloquear
      this.sendMessageWithRandomDelay(contact, message);
    }
  }

  // Função auxiliar para enviar mensagem com atraso randômico
  private async sendMessageWithRandomDelay(contact: string, message: string) {
    console.log(`Enviando mensagem para ${contact}...`);
    // Gera um atraso randômico entre 20 e 90 segundos
    const minDelay = 20000; // 20 segundos
    const maxDelay = 90000; // 1 minuto e 30 segundos
    const delay =
      Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    // Aguardar o atraso randômico
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Enviar a mensagem
    this.client
      .sendMessage(contact, message)
      .then(() => {
        console.log(
          `Mensagem enviada para ${contact} após ${delay / 1000} segundos.`,
        );
      })
      .catch((error) => {
        console.error(`Erro ao enviar mensagem para ${contact}:`, error);
      });
  }
}
