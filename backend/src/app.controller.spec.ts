import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma/prisma.service';
import { StorageService } from './modules/media/storage.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    // AppService now depends on both readiness probes. Stubbed rather than
    // instantiated: constructing the real StorageService would build an S3
    // client from config this unit suite deliberately does not load.
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const storage = { headBucket: jest.fn().mockResolvedValue(undefined) };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('liveness', () => {
    it('reports ok without touching any dependency', () => {
      expect(appController.getLiveness()).toEqual({ status: 'ok' });
    });
  });
});
