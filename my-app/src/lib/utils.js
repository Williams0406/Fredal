import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PERU_TIME_ZONE = "America/Lima";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getDatePartsInTimeZone = (date, timeZone = PERU_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return parts.reduce((result, part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      result[part.type] = part.value;
    }
    return result;
  }, {});
};

const buildDateOnlyAtUtcNoon = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

export function getTodayDateInputValue(timeZone = PERU_TIME_ZONE) {
  const { year, month, day } = getDatePartsInTimeZone(new Date(), timeZone);
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value, locale = "es-PE", options) {
  if (!value) return "";

  if (DATE_ONLY_PATTERN.test(value)) {
    if (!options) {
      const [year, month, day] = value.split("-");
      return `${day}/${month}/${year}`;
    }

    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: PERU_TIME_ZONE,
    }).format(buildDateOnlyAtUtcNoon(value));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: PERU_TIME_ZONE,
    ...options,
  }).format(date);
}
