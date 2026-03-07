import { images } from '../data/mockData';
import type { Account } from '../types';

export const DEFAULT_ACCOUNT_IMAGES = [
  images.travelVlogBg,
  images.archive2,
  images.archive3,
  images.archive1,
];

export function getDefaultAccountImage(index: number): string {
  const normalizedIndex = index < 0 ? 0 : index;
  return DEFAULT_ACCOUNT_IMAGES[normalizedIndex % DEFAULT_ACCOUNT_IMAGES.length] || images.travelVlogBg;
}

export function getAccountCover(account: Account | undefined, index = 0): string {
  return account?.coverImageUrl || getDefaultAccountImage(index);
}
