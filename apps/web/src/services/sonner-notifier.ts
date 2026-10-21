import { toast } from "sonner";
import { noticeAction, type Notice, type Notifier } from "./notices";

const show = {
  success: toast.success,
  error: toast.error,
  message: toast,
} as const;

export const sonnerNotifier: Notifier = {
  show(notice: Notice) {
    const action = noticeAction(notice);
    show[notice.tone](notice.title, {
      description: notice.description,
      ...(action ? { action: { label: action.label, onClick: action.run } } : {}),
    });
  },
};

export function showNotice(notice: Notice, notifier: Notifier = sonnerNotifier) {
  notifier.show(notice);
}
