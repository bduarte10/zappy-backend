import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  const port = process.env.PORT || 8080;
  const host = process.env.HOSTNAME || '0.0.0.0';
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(port, host);
}
bootstrap();
