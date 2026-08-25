import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Prefix, trust proxy, helmet, cookies, ValidationPipe, body limits — shared
  // verbatim with the e2e suite so tests cannot pass against a pipeline the
  // server does not actually run.
  configureApp(app);

  // Exact origins, never '*' — `credentials: true` requires it, and the
  // refresh cookie depends on credentialed requests.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup(
      `${API_PREFIX}/docs`,
      app,
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Kooora Network API')
          .setVersion('1.0')
          .addBearerAuth()
          .addCookieAuth('refresh_token')
          .build(),
      ),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
