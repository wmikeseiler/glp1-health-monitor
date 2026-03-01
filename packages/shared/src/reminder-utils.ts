function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

export function calculateNextInjectionDate(
  lastInjectionDate: Date | string,
  scheduleDays: number
): Date {
  const last = toDate(lastInjectionDate);
  const next = new Date(last);
  next.setDate(next.getDate() + scheduleDays);
  return next;
}

export function getDaysUntilNextInjection(
  lastInjectionDate: Date | string,
  scheduleDays: number
): number {
  const next = calculateNextInjectionDate(lastInjectionDate, scheduleDays);
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const nextMidnight = new Date(
    next.getFullYear(),
    next.getMonth(),
    next.getDate()
  );
  const diffMs = nextMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isInjectionOverdue(
  lastInjectionDate: Date | string,
  scheduleDays: number
): boolean {
  return getDaysUntilNextInjection(lastInjectionDate, scheduleDays) < 0;
}

export function formatReminderMessage(
  medicationName: string,
  daysUntil: number
): string {
  if (daysUntil > 0) {
    return `Your next ${medicationName} injection is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
  }
  if (daysUntil === 0) {
    return `Your ${medicationName} injection is due today!`;
  }
  const overdue = Math.abs(daysUntil);
  return `Your ${medicationName} injection is ${overdue} day${overdue === 1 ? "" : "s"} overdue`;
}
