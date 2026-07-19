import type { NotificationTemplateService } from "@/src/server/notifications/interfaces";
import { renderTemplate } from "@/src/server/notifications/templates";
import type {
  NotificationTemplateKey,
  NotificationTemplatePayload,
  RenderedNotification,
} from "@/src/server/notifications/types";

export class DefaultNotificationTemplateService
  implements NotificationTemplateService
{
  render(
    templateKey: NotificationTemplateKey | string,
    payload: NotificationTemplatePayload,
  ): RenderedNotification {
    return renderTemplate(templateKey, payload);
  }
}
