import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { validateMaxInitData, MaxBridgeUser } from './max-init-data.validator';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { createHmac } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private validate(initData: string): MaxBridgeUser {
    const botToken = this.config.getOrThrow<string>('BOT_TOKEN');
    try {
      const { user } = validateMaxInitData(initData, botToken);
      return user;
    } catch (err) {
      this.logger.warn(`Ошибка валидации initData: ${String(err)}`);
      throw new UnauthorizedException('Невалидные данные MAX Bridge');
    }
  }

  /** Публичная валидация initData (для upload-контроллера) */
  validateInitData(initData: string): MaxBridgeUser {
    return this.validate(initData);
  }


  /**
   * POST /api/auth/check
   */
  async checkUser(initData: string) {
    const maxUser = this.validate(initData);
    const maxBridgeId = String(maxUser.id);

    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { volunteer: true, organization: true },
    });

    if (!user) {
      return {
        isNewUser: true,
        maxUser: {
          id: maxUser.id,
          firstName: maxUser.first_name,
          lastName: maxUser.last_name,
          username: maxUser.username ?? null,
          photoUrl: maxUser.photo_url ?? null,
        },
      };
    }

    return {
      isNewUser: false,
      user: {
        id: user.id,
        role: user.role,
        maxBridgeId: user.maxBridgeId,
        volunteer: user.volunteer
          ? {
              firstName: user.volunteer.firstName,
              lastName: user.volunteer.lastName,
              middleName: user.volunteer.middleName,
              birthDate: user.volunteer.birthDate.toISOString(),
              city: user.volunteer.city,
              address: user.volunteer.address,
            }
          : null,
        organization: user.organization
          ? {
              name: user.organization.name,
              description: user.organization.description,
              contacts: user.organization.contacts,
              socialMediaLink: user.organization.socialMediaLink,
              logoUrl: user.organization.logoUrl,
              isOfficial: user.organization.isOfficial,
              hasDocuments: !!user.organization.documentsZipFilename,
              city: user.organization.city,
              address: user.organization.address,
            }
          : null,
      },
    };
  }

  /**
   * POST /api/auth/register
   */
  async register(initData: string, dto: RegisterDto) {
    const maxUser = this.validate(initData);
    const maxBridgeId = String(maxUser.id);

    const existing = await this.prisma.user.findUnique({ where: { maxBridgeId } });
    if (existing) {
      throw new ConflictException('Пользователь уже зарегистрирован');
    }

    if (dto.role === 'volunteer') {
      if (!dto.firstName || !dto.lastName || !dto.birthDate || !dto.address) {
        throw new BadRequestException(
          'Для волонтёра обязательны: firstName, lastName, birthDate, address',
        );
      }
    } else if (dto.role === 'organization_creator') {
      if (!dto.organizationName || !dto.address) {
        throw new BadRequestException(
          'Для организации обязательны: organizationName, address',
        );
      }
    } else {
      throw new BadRequestException(`Неизвестная роль: ${dto.role}`);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { maxBridgeId, role: dto.role },
      });

      if (dto.role === 'volunteer') {
        await tx.volunteer.create({
          data: {
            userId: newUser.id,
            firstName: dto.firstName!,
            lastName: dto.lastName!,
            middleName: dto.middleName || null,
            birthDate: new Date(dto.birthDate!),
            city: dto.city || null,
            address: dto.address || null,
          },
        });
      }

      if (dto.role === 'organization_creator') {
        await tx.organization.create({
          data: {
            userId: newUser.id,
            name: dto.organizationName!,
            description: dto.description || null,
            contacts: dto.contacts || null,
            socialMediaLink: dto.socialMediaLink || null,
            logoUrl: dto.logoUrl || null,
            documentsZipFilename: dto.documentsZipFilename || null,
            city: dto.city || dto.address!,
            address: dto.address || null,
          },
        });
      }

      return newUser;
    });

    this.logger.log(
      `Зарегистрирован пользователь #${user.id} (MAX ID: ${maxBridgeId}, роль: ${dto.role})`,
    );

    return { id: user.id, role: user.role, maxBridgeId: user.maxBridgeId };
  }

  /**
   * PATCH /api/auth/profile
   * Обновление редактируемых полей профиля по роли.
   */
  async updateProfile(initData: string, dto: UpdateProfileDto) {
    const maxUser = this.validate(initData);
    const maxBridgeId = String(maxUser.id);

    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { volunteer: true, organization: true },
    });
    if (!user) throw new NotFoundException('Пользователь не зарегистрирован');

    // ---------- Волонтёр ----------
    if (user.role === 'volunteer') {
      const cur = user.volunteer;
      if (!cur) throw new BadRequestException('Профиль волонтёра не найден');

      const firstName = (dto.firstName ?? cur.firstName).trim();
      const lastName = (dto.lastName ?? cur.lastName).trim();
      if (!firstName || !lastName) {
        throw new BadRequestException('Имя и фамилия обязательны');
      }
      const address =
        dto.address !== undefined ? dto.address.trim() || null : cur.address;
      if (!address) throw new BadRequestException('Адрес обязателен');
      const city = dto.city?.trim() || address;

      const updated = await this.prisma.volunteer.update({
        where: { userId: user.id },
        data: {
          firstName,
          lastName,
          middleName:
            dto.middleName !== undefined ? dto.middleName.trim() || null : cur.middleName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : cur.birthDate,
          city,
          address: dto.address !== undefined ? dto.address || null : cur.address,
        },
      });

      this.logger.log(`Профиль волонтёра #${updated.id} обновлён`);
      return { role: user.role, updated: true };
    }

    // ---------- Организация ----------
    if (user.role === 'organization_creator') {
      const cur = user.organization;
      if (!cur) throw new BadRequestException('Профиль организации не найден');

      const name = (dto.organizationName ?? cur.name).trim();
      if (!name) throw new BadRequestException('Название организации обязательно');

      const updated = await this.prisma.organization.update({
        where: { userId: user.id },
        data: {
          name,
          description:
            dto.description !== undefined ? dto.description.trim() || null : cur.description,
          contacts:
            dto.contacts !== undefined ? dto.contacts.trim() || null : cur.contacts,
          socialMediaLink:
            dto.socialMediaLink !== undefined
              ? dto.socialMediaLink.trim() || null
              : cur.socialMediaLink,
          logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : cur.logoUrl,
          city: dto.city?.trim() || null,
          address: dto.address !== undefined ? dto.address || null : cur.address,
        },
      });

      this.logger.log(`Профиль организации #${updated.id} обновлён`);
      return { role: user.role, updated: true };
    }

    throw new BadRequestException('Для вашей роли профиль недоступен');
  }

  /** Проверка номера телефона от window.WebApp.requestContact() и сохранение */
    /** Сохранение номера телефона волонтёра */
  async verifyContact(initData: string, phone: string) {
    const maxUser = this.validate(initData);

    if (!phone) {
      throw new BadRequestException('Номер телефона не передан');
    }

    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId: String(maxUser.id) },
      include: { volunteer: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (!user.volunteer) {
      throw new BadRequestException('Телефон могут привязать только волонтёры');
    }

    await this.prisma.volunteer.update({
      where: { userId: user.id },
      data: { phone },
    });

    return { success: true, phone };
  }
}