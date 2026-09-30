import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventDto } from './dto/create-event.dto';
import { ConfigService } from '@nestjs/config';
import { MaxMessengerService } from './max-messenger.service';
import { MaxBotAdapter } from '../bot/max-bot.adapter';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const LIMIT = 5;

export interface EventCardDto {
  id: number;
  name: string;
  description: string | null;
  organizationalDetails: string | null;
  criteria: string | null;
  city: string | null;
  address: string | null;
  eventDate: string;
  endTime: string | null;
  minAge: number | null;
  requiredVolunteersCount: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'completed';  // ← ИСПРАВЛЕНО
  photos: string[];
  pendingCount?: number;
  registrationStatus?: string | null;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly messenger: MaxMessengerService,
    private readonly botAdapter: MaxBotAdapter
  ) {}

  private num(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private eventInclude() {
    return {
      photos: { orderBy: { position: 'asc' as const } },
      documents: { select: { filePath: true } },
      registrations: { select: { status: true } },   // ← добавить
      _count: { select: { registrations: true } },
    };
  }

  private collectPhotos(e: any): string[] {
    const photos: string[] = [];
    for (const p of e.photos ?? []) photos.push(p.url);
    if (e.photoUrl) photos.push(e.photoUrl);
    for (const d of e.documents ?? []) {
      if (IMAGE_EXT.test(d.filePath)) {
        photos.push(`/api/uploads/${d.filePath.split('/').pop() || d.filePath}`);
      }
      if (photos.length >= 4) break;
    }
    return photos.slice(0, 4);
  }

  private toCard(e: any, now: Date, registrationStatus?: string, pendingCount?: number): EventCardDto {
    const eventDate =
      e.eventDate instanceof Date ? e.eventDate : new Date(e.eventDate);
    const endTime = e.endTime
      ? (e.endTime instanceof Date ? e.endTime : new Date(e.endTime))
      : null;

    // Статус: upcoming (ещё не началось), ongoing (идёт), completed (завершено)
    let status: 'upcoming' | 'ongoing' | 'completed';
    if (endTime && now > endTime) {
      status = 'completed';
    } else if (eventDate <= now) {
      status = 'ongoing';
    } else {
      status = 'upcoming';
    }

    return {
      id: e.id,
      name: e.name,
      description: e.description ?? null,
      organizationalDetails: e.organizationalDetails ?? null,
      criteria: e.criteria ?? null,
      city: e.city,
      address: e.address ?? null,
      requiredVolunteersCount: e.requiredVolunteersCount,
      registeredCount: Array.isArray(e.registrations)
        ? e.registrations.filter((r: any) => r.status !== 'rejected').length
        : (e._count?.registrations ?? 0),
      eventDate: eventDate.toISOString(),          // было: e.eventDate.toISOString()
      endTime: endTime ? endTime.toISOString() : null,
      minAge: e.minAge ?? null,
      status,
      photos: this.collectPhotos(e),
      registrationStatus: registrationStatus ?? null,
      pendingCount,   // ← добавить последней строкой
    };
  }

  private splitByDate(cards: EventCardDto[]) {
    const active = cards
      .filter((c) => c.status !== 'completed')
      .sort((a, b) => {
        // Сначала ongoing, потом upcoming
        if (a.status === 'ongoing' && b.status === 'upcoming') return -1;
        if (a.status === 'upcoming' && b.status === 'ongoing') return 1;
        return a.eventDate.localeCompare(b.eventDate);
      });
    const past = cards.filter((c) => c.status === 'completed');
    return { active, past };
  }

  /** Блок «Мероприятия» в профиле организации (до 5) */
  async getEventsForMaxUser(maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      select: { id: true, organization: { select: { id: true } } },
    });
    if (!user?.organization) throw new NotFoundException('Организация не найдена');

    const all = await this.prisma.event.findMany({
      where: { organizationId: user.organization.id },
      include: this.eventInclude(),
      orderBy: { eventDate: 'desc' },
    });

    const now = new Date();
    const cards = all.map((e) => this.toCard(e, now));
    const { active, past } = this.splitByDate(cards);

    return { total: cards.length, events: [...active, ...past].slice(0, LIMIT) };
  }

  /** Страница «Мои мероприятия»: для организации и для волонтёра */
  async getMyEvents(maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true, volunteer: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const now = new Date();

    // Организация: все её мероприятия
    if (user.role === 'organization_creator' && user.organization) {
      const events = await this.prisma.event.findMany({
        where: { organizationId: user.organization.id },
        include: {
          ...this.eventInclude(),
          registrations: { select: { status: true } },
        },
        orderBy: { eventDate: 'asc' },
      });

      const cards = events.map((e) => {
        const pendingCount = e.registrations.filter(
          (r: any) => r.status === 'pending',
        ).length;
        return this.toCard(e, now, undefined, pendingCount);
      });

      // Фронт ждёт { active, past } — как и для волонтёра
      const active = cards.filter((c) => c.status !== 'completed');
      const past = cards.filter((c) => c.status === 'completed');

      // Активные: сначала те, где нужно одобрить (по убыванию числа заявок), затем по дате
      active.sort((a, b) => {
        const pa = a.pendingCount ?? 0;
        const pb = b.pendingCount ?? 0;
        if ((pa > 0) !== (pb > 0)) return pa > 0 ? -1 : 1;
        if (pa !== pb) return pb - pa;
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      });
      // Прошедшие: свежие сверху
      past.sort(
        (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      );

      return { active, past };
    }

    // Волонтёр: мероприятия, на которые он записан
    if (user.volunteer) {
      const regs = await this.prisma.volunteerEventRegistration.findMany({
        where: { volunteerId: user.volunteer.id },
        include: { event: { include: this.eventInclude() } },
      });
      const cards = regs.map((r) => this.toCard(r.event, now, r.status));
      return { role: user.role, ...this.splitByDate(cards) };
    }

    return { role: user.role, active: [], past: [] };
  }

  /** Создание мероприятия организацией */
  async createEvent(maxBridgeId: string, dto: CreateEventDto) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Создавать мероприятия могут только организации');
    }

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Укажите название мероприятия');

    if (!dto.eventDate || Number.isNaN(new Date(dto.eventDate).getTime())) {
      throw new BadRequestException('Укажите дату проведения');
    }

    const count = dto.requiredVolunteersCount ?? 1;
    if (!Number.isInteger(count) || count < 1) {
      throw new BadRequestException('Количество волонтёров должно быть не меньше 1');
    }

    const address = dto.address?.trim();
    if (!address) throw new BadRequestException('Укажите адрес мероприятия');

    const event = await this.prisma.event.create({
      data: {
        organizationId: user.organization.id,
        name,
        description: dto.description?.trim() || null,
        organizationalDetails: dto.organizationalDetails?.trim() || null,
        criteria: dto.criteria?.trim() || null,
        city: dto.city || null,
        address,
        requiredVolunteersCount: count,
        eventDate: new Date(dto.eventDate),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        minAge: dto.minAge ?? null,
        photos: {
          create: (dto.photos ?? [])
            .slice(0, 6)
            .map((url, i) => ({ url, position: i })),
        },
      },
    });

    return { id: event.id };
  }

    /** Детали одного мероприятия (с статусом записи для волонтёра) */
  async getEventById(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true, volunteer: true },
    });

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ...this.eventInclude(),
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isOfficial: true,
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    const now = new Date();
    const card = this.toCard(event, now);

    // Статус записи (если волонтёр)
    let registration: { status: string; registeredAt: string } | null = null;
    if (user?.volunteer) {
      const reg = await this.prisma.volunteerEventRegistration.findFirst({
        where: { volunteerId: user.volunteer.id, eventId },
      });
      if (reg) {
        registration = {
          status: reg.status,
          registeredAt: reg.registeredAt.toISOString(),
        };
      }
    }

    // Свободные слоты
    const freeSlots = Math.max(
      0,
      card.requiredVolunteersCount - card.registeredCount,
    );

    return {
      ...card,
      organization: {
        id: event.organization.id,
        name: event.organization.name,
        logoUrl: event.organization.logoUrl,
        isOfficial: event.organization.isOfficial,
      },
      freeSlots,
      registration,
      isOwner: user?.organization?.id === event.organizationId,
    };
  }

  /** Запись волонтёра на мероприятие */
  async registerForEvent(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { volunteer: true },
    });
    if (!user?.volunteer) {
      throw new ForbiddenException('Записываться могут только волонтёры');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: { select: { status: true, volunteerId: true } } },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.endTime) {
      if (new Date() > new Date(event.endTime)) {
        throw new BadRequestException('Мероприятие уже завершилось');
      }
    }

    if (event.minAge && user.volunteer.birthDate) {
      const now = new Date();
      const age = Math.floor(
        (now.getTime() - new Date(user.volunteer.birthDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      );
      if (age < event.minAge) {
        throw new BadRequestException(
          `Минимальный возраст для участия: ${event.minAge} лет`,
        );
      }
    }

    // Существующая запись этого волонтёра
    const existing = await this.prisma.volunteerEventRegistration.findFirst({
      where: { volunteerId: user.volunteer.id, eventId },
    });
    if (existing) {
      if (existing.status === 'pending') return { status: existing.status };
      if (existing.status === 'approved') {
        throw new BadRequestException('Вы уже записаны');
      }
      if (existing.status === 'rejected') {
        throw new BadRequestException(
          'Ваша заявка отклонена. Повторная подача невозможна',
        );
      }
      // completed — можно перезаписаться, удаляем старую запись
      await this.prisma.volunteerEventRegistration.delete({
        where: { id: existing.id },
      });
    }

    // Свободные слоты: считаем всех, кроме текущего волонтёра (отклонённые не в счёт)
    const activeRegistrations = event.registrations.filter(
      (r) => r.status !== 'rejected' && user.volunteer && r.volunteerId !== user.volunteer.id,
    ).length;
    if (activeRegistrations >= event.requiredVolunteersCount) {
      throw new BadRequestException('Все места заняты');
    }

    const reg = await this.prisma.volunteerEventRegistration.create({
      data: {
        volunteerId: user.volunteer.id,
        eventId,
        status: 'pending',
      },
    });
    return { status: reg.status };
  }
  /** Отмена записи волонтёром */
  async cancelRegistration(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { volunteer: true },
    });
    if (!user?.volunteer) throw new ForbiddenException('Только для волонтёров');

    const reg = await this.prisma.volunteerEventRegistration.findFirst({
      where: { volunteerId: user.volunteer.id, eventId },
    });
    if (!reg) throw new NotFoundException('Записи не найдено');
    if (reg.status === 'rejected') {
      throw new BadRequestException('Нельзя отменить отклонённую заявку');
    }
    await this.prisma.volunteerEventRegistration.delete({ where: { id: reg.id } });
    return { cancelled: true };
  }

    /**
   * Поиск мероприятий:
   * - с запросом — совпадения по названию или описанию (активные сначала, затем прошедшие);
   * - без запроса — все ближайшие (eventDate >= now) по возрастанию даты.
   */
    async searchEvents(filters: {
    query?: string;
    city?: string;
    fromDate?: string;
    toDate?: string;
    minAge?: number;
    hasFreeSlots?: boolean;
    sortBy: 'date' | 'freeSlots' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  }) {
    const now = new Date();
    const q = (filters.query ?? '').trim();

    const where: any = {
      OR: [
        { endTime: { gt: now } },
        { endTime: null, eventDate: { gte: now } },
      ],
    };

    if (q) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.fromDate) {
      where.eventDate = { ...where.eventDate, gte: new Date(filters.fromDate) };
    }

    if (filters.toDate) {
      where.eventDate = { ...where.eventDate, lte: new Date(filters.toDate) };
    }

    if (filters.minAge) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { minAge: { lte: filters.minAge } },
          { minAge: null },
        ],
      });
    }

    const events = await this.prisma.event.findMany({
      where,
      include: this.eventInclude(),
      take: 50,
    });

    let cards = events.map((e) => this.toCard(e, now));

    // Фильтр по свободным местам (пост-обработка)
    if (filters.hasFreeSlots) {
      cards = cards.filter(
        (c) => c.registeredCount < c.requiredVolunteersCount
      );
    }

    // Сортировка
    const order = filters.sortOrder === 'desc' ? -1 : 1;
    cards.sort((a, b) => {
      if (filters.sortBy === 'date') {
        return order * (new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      }
      if (filters.sortBy === 'freeSlots') {
        const freeA = a.requiredVolunteersCount - a.registeredCount;
        const freeB = b.requiredVolunteersCount - b.registeredCount;
        return order * (freeB - freeA);
      }
      return 0; // createdAt не хранится в EventCardDto, можно добавить при необходимости
    });

    return { events: cards };
  }

  /** Заявки на мероприятие (только для организации-владельца) */
  async getApplications(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) throw new ForbiddenException('Только для организаций');

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    const regs = await this.prisma.volunteerEventRegistration.findMany({
      where: { eventId },
      include: { volunteer: true },
      orderBy: { registeredAt: 'asc' },
    });

    // Подсчёт участий для всех волонтёров одним запросом
    const volunteerIds = regs.map((r) => r.volunteerId);
    const participations = await this.prisma.volunteerEventRegistration.groupBy({
      by: ['volunteerId'],
      where: {
        volunteerId: { in: volunteerIds },
        status: { in: ['approved', 'completed'] },
      },
      _count: { volunteerId: true },
    });
    const participationsMap = new Map(
      participations.map((p) => [p.volunteerId, p._count.volunteerId]),
    );

    return {
      applications: regs.map((r) => ({
        id: r.id,
        status: r.status,
        registeredAt: r.registeredAt.toISOString(),
        volunteer: {
          firstName: r.volunteer.firstName,
          lastName: r.volunteer.lastName,
          middleName: r.volunteer.middleName,
          city: r.volunteer.city,
          address: r.volunteer.address,
          participationsCount: participationsMap.get(r.volunteerId) ?? 0,
          phone: r.volunteer.phone ?? null,      // ← добавить
        },
      })),
    };
  }
  /** Одобрить/отклонить заявку; при одобрении — сообщение волонтёру в MAX */
  async applicationAction(
    registrationId: number,
    action: 'approve' | 'reject',
    maxBridgeId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) throw new ForbiddenException('Только для организаций');

    const reg = await this.prisma.volunteerEventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true, volunteer: { include: { user: true } } },
    });
    if (!reg) throw new NotFoundException('Заявка не найдена');
    if (reg.event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updated = await this.prisma.volunteerEventRegistration.update({
      where: { id: registrationId },
      data: { status },
    });

    if (action === 'approve') {
      const when = new Date(reg.event.eventDate).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const lines = [
        `Вы одобрены на мероприятие: «${reg.event.name}» ${when}`,
      ];
      if (reg.event.organizationalDetails) {
        lines.push(`Организационные моменты: ${reg.event.organizationalDetails}`);
      }

      const deepLink = this.getEventDeepLink(reg.event.id);
      const webappUrl = this.config.get<string>('WEBAPP_URL');
      const buttonUrl = deepLink ?? (webappUrl ? `${webappUrl}/events/${reg.event.id}` : null);
      const button = buttonUrl ? { text: 'Открыть мероприятие', url: buttonUrl } : undefined;

      await this.messenger.sendMessage(
        Number(reg.volunteer.user.maxBridgeId),
        lines.join('\n'),
        button,
      );
    }

    return { status: updated.status };
  }

    /** Публичный профиль организации (для волонтёров) */
  async getOrganizationProfile(organizationId: number) {
    const now = new Date();
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        events: {
          where: {
            OR: [
              { endTime: { gt: now } },
              { endTime: null, eventDate: { gte: now } },
            ],
          },
          include: this.eventInclude(),
          orderBy: { eventDate: 'asc' },
          take: 10,
        },
      },
    });
    if (!org) throw new NotFoundException('Организация не найдена');

    const events = org.events.map((e) => this.toCard(e, now));

    return {
      id: org.id,
      name: org.name,
      description: org.description,
      contacts: org.contacts,
      socialMediaLink: org.socialMediaLink,
      logoUrl: org.logoUrl,
      isOfficial: org.isOfficial,
      city: org.city,
      address: org.address,
      events,
    };
  }

    /** Главная страница волонтёра: статистика + ближайшие записи + рекомендации */
  async getVolunteerHome(maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { volunteer: true },
    });
    if (!user?.volunteer) {
      throw new NotFoundException('Профиль волонтёра не найден');
    }
    const volunteer = user.volunteer;
    const now = new Date();

    // Дней с момента регистрации
    const daysSinceRegistration = Math.max(
      0,
      Math.floor(
        (now.getTime() - volunteer.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    // Количество участий (подтверждённые: одобрен или завершено)
    const participationsCount =
      await this.prisma.volunteerEventRegistration.count({
        where: {
          volunteerId: volunteer.id,
          status: { in: ['approved', 'completed'] },
        },
      });

    // Все записи волонтёра одним запросом
    const allRegs = await this.prisma.volunteerEventRegistration.findMany({
      where: { volunteerId: volunteer.id, status: { not: 'rejected' } },
      select: {
        eventId: true,
        status: true,
        event: { select: { organizationId: true } },
      },
    });
    const registeredEventIds = allRegs.map((r) => r.eventId);

    // 3 ближайших мероприятия, на которые записан
    const myRegs = await this.prisma.volunteerEventRegistration.findMany({
      where: {
        volunteerId: volunteer.id,
        status: { not: 'rejected' },
        event: { eventDate: { gte: now } },
      },
      include: { event: { include: this.eventInclude() } },
      orderBy: { event: { eventDate: 'asc' } },
      take: 3,
    });
    const myEvents = myRegs.map((r) => this.toCard(r.event, now, r.status));

    // Организации, где волонтёр реально участвовал (одобрен/завершено)
    const orgIds = Array.from(
      new Set(
        allRegs
          .filter((r) => r.status === 'approved' || r.status === 'completed')
          .map((r) => r.event.organizationId),
      ),
    );

    // Рекомендации: новые мероприятия этих организаций, куда ещё не записан
    let recommendations: Array<EventCardDto & { organizationName: string }> = [];
    if (orgIds.length > 0) {
      const recEvents = await this.prisma.event.findMany({
        where: {
          organizationId: { in: orgIds },
          eventDate: { gte: now },
          id: { notIn: registeredEventIds },
        },
        include: {
          ...this.eventInclude(),
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      recommendations = recEvents.map((e) => ({
        ...this.toCard(e, now),
        organizationName: e.organization.name,
      }));
    }

    return {
      daysSinceRegistration,
      participationsCount,
      myEvents,
      recommendations,
    };
  }

    /** Главная страница организации: счётчики, активные мероприятия, статистика */
  async getOrganizationHome(maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Доступно только организациям');
    }
    const orgId = user.organization.id;
    const now = new Date();

    // 1. СЫРЫЕ события с регистрациями
    const events = await this.prisma.event.findMany({
      where: { organizationId: orgId },
      include: {
        registrations: {
          select: { status: true, registeredAt: true, volunteerId: true },
          orderBy: { registeredAt: 'asc' },
        },
        _count: { select: { registrations: true } },
      },
      orderBy: { eventDate: 'asc' },
    });

    // 2. ВСЕ расчёты — только по сырым данным
    const allActiveEvents = events.filter((e) => e.eventDate >= now);
    const activeEventsCount = allActiveEvents.length;

    const pendingApplicationsCount = allActiveEvents.reduce(
      (sum, e) => sum + e.registrations.filter((r) => r.status === 'pending').length,
      0,
    );

    let totalRequired = 0;
    let totalRegistered = 0;
    const fillDays: number[] = [];
    const appsPerVolunteer = new Map<number, number>();

    for (const e of events) {
      const regs = e.registrations.filter((r) => r.status !== 'rejected');
      totalRequired += e.requiredVolunteersCount;
      totalRegistered += regs.length;

      if (e.requiredVolunteersCount > 0 && regs.length >= e.requiredVolunteersCount) {
        const fullAt = regs[e.requiredVolunteersCount - 1].registeredAt;
        const days = (fullAt.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) fillDays.push(days);
      }

      for (const r of regs) {
        appsPerVolunteer.set(r.volunteerId, (appsPerVolunteer.get(r.volunteerId) ?? 0) + 1);
      }
    }

    const fillRate =
      totalRequired > 0 ? Math.round((totalRegistered / totalRequired) * 100) : 0;
    const avgFillDays =
      fillDays.length > 0
        ? Math.round(fillDays.reduce((s, d) => s + d, 0) / fillDays.length)
        : null;
    const distinctVolunteers = appsPerVolunteer.size;
    const repeatVolunteers = Array.from(appsPerVolunteer.values()).filter((c) => c >= 2).length;
    const repeatVolunteersPercent =
      distinctVolunteers > 0 ? Math.round((repeatVolunteers / distinctVolunteers) * 100) : 0;

    // 3. Конвертация в карточки — ОДИН раз, в самом конце, максимум 3 штуки
    const activeEvents = allActiveEvents.slice(0, 3).map((e) => this.toCard(e, now));

    return {
      activeEventsCount,
      pendingApplicationsCount,
      activeEvents,
      stats: { fillRate, avgFillDays, repeatVolunteersPercent },
    };
  }

    /** Рассылка сообщения всем одобренным волонтёрам мероприятия */
  async broadcastToApproved(
    eventId: number,
    message: string,
    maxBridgeId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Доступно только организациям');
    }

    const text = (message ?? '').trim();
    if (!text) throw new BadRequestException('Текст сообщения пуст');

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    // Все одобренные волонтёры с их MAX ID
    const regs = await this.prisma.volunteerEventRegistration.findMany({
      where: { eventId, status: 'approved' },
      include: {
        volunteer: { include: { user: { select: { maxBridgeId: true } } } },
      },
    });

    const when = new Date(event.eventDate).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fullText = [
      `Мероприятие «${event.name}»`,
      `Дата и время: ${when}`,
      '',
      'Сообщение от организатора:',
      text,
    ].join('\n');

    const deepLink = this.getEventDeepLink(event.id);
    const webappUrl = this.config.get<string>('WEBAPP_URL');
    const buttonUrl = deepLink ?? (webappUrl ? `${webappUrl}/events/${event.id}` : null);
    const button = buttonUrl ? { text: 'Открыть мероприятие', url: buttonUrl } : undefined;

    // Отправляем последовательно, чтобы не упереться в лимиты MAX API
    let sent = 0;
    for (const r of regs) {
      const ok = await this.messenger.sendMessage(
        Number(r.volunteer.user.maxBridgeId),
        fullText,
        button,
      );
      if (ok) sent += 1;
    }

    await this.prisma.broadcastHistory.create({
      data: {
        eventId: event.id,
        senderId: user.id,
        text,
        sentCount: sent,
        totalCount: regs.length,
      },
    });

    return { sent, total: regs.length };
  }

  async getBroadcastHistory(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Доступно только организациям');
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    const items = await this.prisma.broadcastHistory.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((b) => ({
        id: b.id,
        text: b.text,
        sentCount: b.sentCount,
        totalCount: b.totalCount,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  /** Массовое одобрение всех ожидающих заявок + сообщения каждому */
  async approveAllApplications(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) throw new ForbiddenException('Только для организаций');

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    const pendingRegs = await this.prisma.volunteerEventRegistration.findMany({
      where: { eventId, status: 'pending' },
      include: {
        volunteer: { include: { user: { select: { maxBridgeId: true } } } },
      },
    });
    if (pendingRegs.length === 0) return { approved: 0 };

    await this.prisma.volunteerEventRegistration.updateMany({
      where: { id: { in: pendingRegs.map((r) => r.id) } },
      data: { status: 'approved' },
    });

    // Сообщение каждому одобренному
    const when = new Date(event.eventDate).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const deepLink = this.getEventDeepLink(event.id);
    const webappUrl = this.config.get<string>('WEBAPP_URL');
    const buttonUrl = deepLink ?? (webappUrl ? `${webappUrl}/events/${event.id}` : null);
    const button = buttonUrl ? { text: 'Открыть мероприятие', url: buttonUrl } : undefined;

    let sent = 0;
    for (const r of pendingRegs) {
      const lines = [`Вы одобрены на мероприятие: «${event.name}» ${when}`];
      if (event.organizationalDetails) {
        lines.push(`Организационные моменты: ${event.organizationalDetails}`);
      }
      const ok = await this.messenger.sendMessage(
        Number(r.volunteer.user.maxBridgeId),
        lines.join('\n'),
        button,
      );
      if (ok) sent += 1;
    }

    return { approved: pendingRegs.length, sent };
  }

    /** Обновление мероприятия (только для владельца) */
  async updateEvent(
    eventId: number,
    dto: CreateEventDto,
    maxBridgeId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Доступно только организациям');
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    const address = dto.address?.trim();
    if (!address) throw new BadRequestException('Укажите адрес мероприятия');

    if (!dto.eventDate) {
      throw new BadRequestException('Укажите дату проведения');
    }

    const eventDate = new Date(dto.eventDate);
    if (isNaN(eventDate.getTime())) {
      throw new BadRequestException('Некорректная дата мероприятия');
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        organizationalDetails: dto.organizationalDetails?.trim() || null,
        criteria: dto.criteria?.trim() || null,
        address,
        city: dto.city || null,
        requiredVolunteersCount: dto.requiredVolunteersCount,
        eventDate,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        minAge: dto.minAge ?? null,         // ← добавить
      },
    });

    return { id: updated.id };
  }

  /** Удаление мероприятия (только для владельца) */
  async deleteEvent(eventId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) {
      throw new ForbiddenException('Доступно только организациям');
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    await this.prisma.event.delete({ where: { id: eventId } });

    return { deleted: true };
  }

  /** Диплинк, открывающий мини-приложение на странице мероприятия */
  private getEventDeepLink(eventId: number): string | null {
    const username = this.botAdapter.getBotUsername();
    if (!username) return null;
    return `https://max.ru/${username}?startapp=event_${eventId}`;
  }

  async getBotInfo() {
    const username = this.botAdapter.getBotUsername();
    return { username };
  }

    /** Удаление одной заявки (только для организации-владельца мероприятия) */
  async deleteApplication(registrationId: number, maxBridgeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { maxBridgeId },
      include: { organization: true },
    });
    if (!user?.organization) throw new ForbiddenException('Только для организаций');

    const reg = await this.prisma.volunteerEventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });
    if (!reg) throw new NotFoundException('Заявка не найдена');
    if (reg.event.organizationId !== user.organization.id) {
      throw new ForbiddenException('Это не ваше мероприятие');
    }

    await this.prisma.volunteerEventRegistration.delete({
      where: { id: registrationId },
    });

    return { deleted: true };
  }
}