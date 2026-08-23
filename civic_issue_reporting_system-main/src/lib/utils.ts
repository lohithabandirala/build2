import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeJson(response: Response) {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('JSON Parse Error:', err);
    return null;
  }
}

export async function apiFetch(url: string, options: any = {}) {
  const token = localStorage.getItem('civic_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const response = await fetch(url, { ...options, headers });
  return response;
}

export const safeFormatDate = (dateStr: any, formatStr: string) => {
  try {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (e) {
    return 'N/A';
  }
};

export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
