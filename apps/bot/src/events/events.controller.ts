import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { join } from 'node:path';
import { EventsService } from './events.service';
import { AuthService } from '../auth/auth.service';
import { UploadExceptionFilter } from '../auth/upload.controller';
import type { CreateEventDto } from './dto/create-event.dto';


@Controller('api/events')
@UseFilters(UploadExceptionFilter)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly authService: AuthService,
  ) {}

  /** Блок мероприятий в профиле организации (до 5) */
  @Post('by-organization')
  @HttpCode(HttpStatus.OK)
  async byOrganization(@Body('initData') initData: string) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getEventsForMaxUser(String(maxUser.id));
  }

  /** Страница «Мои мероприятия» (организация + волонтёр) */
  @Post('my')
  @HttpCode(HttpStatus.OK)
  async my(@Body('initData') initData: string) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getMyEvents(String(maxUser.id));
  }

  /** Создание мероприятия */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body('initData') initData: string,
    @Body() dto: CreateEventDto,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.createEvent(String(maxUser.id), dto);
  }


    /** Детали мероприятия */
  @Post('details')
  @HttpCode(HttpStatus.OK)
  async details(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getEventById(
      Number(eventId),
      String(maxUser.id),
    );
  }

  /** Записаться волонтёру */
  @Post('register-for-event')
  @HttpCode(HttpStatus.CREATED)
  async registerForEvent(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.registerForEvent(
      Number(eventId),
      String(maxUser.id),
    );
  }

  /** Отменить запись */
  @Post('cancel-registration')
  @HttpCode(HttpStatus.OK)
  async cancelRegistration(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.cancelRegistration(
      Number(eventId),
      String(maxUser.id),
    );
  }

    /** Поиск мероприятий (строка поиска + ближайшие по умолчанию) */
    @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body('initData') initData: string,
    @Body('query') query?: string,
    @Body('city') city?: string,
    @Body('fromDate') fromDate?: string,
    @Body('toDate') toDate?: string,
    @Body('minAge') minAge?: number,
    @Body('hasFreeSlots') hasFreeSlots?: boolean,
    @Body('sortBy') sortBy?: 'date' | 'freeSlots' | 'createdAt',
    @Body('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    this.authService.validateInitData(initData);
    return this.eventsService.searchEvents({
      query,
      city,
      fromDate,
      toDate,
      minAge,
      hasFreeSlots,
      sortBy: sortBy ?? 'date',
      sortOrder: sortOrder ?? 'asc',
    });
  }

    /** Заявки на мероприятие (для организации) */
  @Post('applications')
  @HttpCode(HttpStatus.OK)
  async applications(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getApplications(Number(eventId), String(maxUser.id));
  }

  /** Одобрить / отклонить заявку */
  @Post('application-action')
  @HttpCode(HttpStatus.OK)
  async applicationAction(
    @Body('initData') initData: string,
    @Body('registrationId') registrationId: number,
    @Body('action') action: 'approve' | 'reject',
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.applicationAction(
      Number(registrationId),
      action,
      String(maxUser.id),
    );
  }

    /** Публичный профиль организации */
  @Post('organization-profile')
  @HttpCode(HttpStatus.OK)
  async organizationProfile(
    @Body('initData') initData: string,
    @Body('organizationId') organizationId: number,
  ) {
    this.authService.validateInitData(initData);
    return this.eventsService.getOrganizationProfile(Number(organizationId));
  }

    /** Главная страница волонтёра */
  @Post('volunteer-home')
  @HttpCode(HttpStatus.OK)
  async volunteerHome(@Body('initData') initData: string) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getVolunteerHome(String(maxUser.id));
  }

    /** Главная страница организации */
  @Post('organization-home')
  @HttpCode(HttpStatus.OK)
  async organizationHome(@Body('initData') initData: string) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getOrganizationHome(String(maxUser.id));
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcast(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
    @Body('message') message: string,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.broadcastToApproved(
      Number(eventId),
      message ?? '',
      String(maxUser.id),
    );
  }

    /** История рассылок по мероприятию */
  @Post('broadcast-history')
  @HttpCode(HttpStatus.OK)
  async broadcastHistory(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.getBroadcastHistory(
      Number(eventId),
      String(maxUser.id),
    );
  }

  /** Одобрить все ожидающие заявки */
  @Post('applications-approve-all')
  @HttpCode(HttpStatus.OK)
  async approveAllApplications(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.approveAllApplications(
      Number(eventId),
      String(maxUser.id),
    );
  }

    /** Обновление мероприятия */
  @Post('update')
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
    @Body() dto: CreateEventDto,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.updateEvent(Number(eventId), dto, String(maxUser.id));
  }

  /** Удаление мероприятия */
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Body('initData') initData: string,
    @Body('eventId') eventId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.deleteEvent(Number(eventId), String(maxUser.id));
  }

  @Post('bot-info')
  @HttpCode(HttpStatus.OK)
  async botInfo() {
    return this.eventsService.getBotInfo();
  }

  /** Удалить одну заявку */
  @Post('application-delete')
  @HttpCode(HttpStatus.OK)
  async deleteApplication(
    @Body('initData') initData: string,
    @Body('registrationId') registrationId: number,
  ) {
    const maxUser = this.authService.validateInitData(initData);
    return this.eventsService.deleteApplication(
      Number(registrationId),
      String(maxUser.id),
    );
  }
}

