import { FavoriteEntry, SavedConnection, WatchHistoryItem } from './types';
import { normalizeRecoveryKey, normalizeVariantYear } from './provider-recovery';

type LibraryGroupKind = FavoriteEntry['kind'] | WatchHistoryItem['kind'];

export type MergedFavoriteGroup = {
  key: string;
  title: string;
  kind: FavoriteEntry['kind'];
  year?: string;
  artwork?: string;
  plot?: string;
  genre?: string;
  categoryId?: string;
  categoryName?: string;
  seriesId?: number;
  providerEntries: FavoriteEntry[];
  activeEntry: FavoriteEntry | null;
  primaryEntry: FavoriteEntry;
  duplicateProviderCount: number;
  updatedAt: number;
};

export type MergedHistoryGroup = {
  key: string;
  title: string;
  kind: WatchHistoryItem['kind'];
  year?: string;
  artwork?: string;
  categoryId?: string;
  categoryName?: string;
  seriesId?: number;
  seriesTitle?: string;
  providerEntries: WatchHistoryItem[];
  activeEntry: WatchHistoryItem | null;
  primaryEntry: WatchHistoryItem;
  duplicateProviderCount: number;
  bestProgress: number;
  updatedAt: number;
};

const buildLibraryIdentityKey = ({
  title,
  kind,
  year,
  seriesTitle,
}: {
  title?: string | null;
  kind: LibraryGroupKind;
  year?: string | null;
  seriesTitle?: string | null;
}) => `${kind}:${normalizeRecoveryKey(seriesTitle || title)}:${normalizeVariantYear(year)}`;

const rankProviderEntry = <T extends { providerId: string; updatedAt: number }>(
  entries: T[],
  activeConnectionId?: string | null
) => [...entries].sort((left, right) => {
  const leftActiveBoost = left.providerId === activeConnectionId ? 1 : 0;
  const rightActiveBoost = right.providerId === activeConnectionId ? 1 : 0;
  if (leftActiveBoost !== rightActiveBoost) return rightActiveBoost - leftActiveBoost;
  return (right.updatedAt || 0) - (left.updatedAt || 0);
});

export const buildMergedFavoriteGroups = ({
  favoriteEntriesByProvider,
  activeConnectionId,
}: {
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>;
  activeConnectionId?: string | null;
}) => {
  const grouped = Object.values(favoriteEntriesByProvider)
    .flat()
    .reduce<Record<string, FavoriteEntry[]>>((acc, entry) => {
      const key = buildLibraryIdentityKey({
        title: entry.title,
        kind: entry.kind,
        year: entry.year,
      });
      acc[key] = [...(acc[key] || []), entry];
      return acc;
    }, {});

  return Object.entries(grouped)
    .map(([key, entries]) => {
      const rankedEntries = rankProviderEntry(entries, activeConnectionId);
      const activeEntry = rankedEntries.find((entry) => entry.providerId === activeConnectionId) ?? null;
      const primaryEntry = activeEntry ?? rankedEntries[0];
      const providerIds = new Set(rankedEntries.map((entry) => entry.providerId));

      return {
        key,
        title: primaryEntry.title || 'Saved favorite',
        kind: primaryEntry.kind,
        year: primaryEntry.year,
        artwork: primaryEntry.artwork,
        plot: primaryEntry.plot,
        genre: primaryEntry.genre,
        categoryId: primaryEntry.categoryId,
        categoryName: primaryEntry.categoryName,
        seriesId: primaryEntry.seriesId,
        providerEntries: rankedEntries,
        activeEntry,
        primaryEntry,
        duplicateProviderCount: providerIds.size,
        updatedAt: Math.max(...rankedEntries.map((entry) => entry.updatedAt || entry.addedAt || 0)),
      } satisfies MergedFavoriteGroup;
    })
    .sort((left, right) => right.updatedAt - left.updatedAt || left.title.localeCompare(right.title));
};

export const buildMergedHistoryGroups = ({
  watchHistory,
  activeConnectionId,
}: {
  watchHistory: WatchHistoryItem[];
  activeConnectionId?: string | null;
}) => {
  const grouped = watchHistory.reduce<Record<string, WatchHistoryItem[]>>((acc, item) => {
    const key = buildLibraryIdentityKey({
      title: item.title,
      kind: item.kind,
      year: item.year,
      seriesTitle: item.seriesTitle,
    });
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, entries]) => {
      const rankedEntries = rankProviderEntry(entries, activeConnectionId);
      const activeEntry = rankedEntries.find((entry) => entry.providerId === activeConnectionId) ?? null;
      const primaryEntry = activeEntry ?? rankedEntries[0];
      const providerIds = new Set(rankedEntries.map((entry) => entry.providerId));

      return {
        key,
        title: primaryEntry.title,
        kind: primaryEntry.kind,
        year: primaryEntry.year,
        artwork: primaryEntry.artwork,
        categoryId: primaryEntry.categoryId,
        categoryName: primaryEntry.categoryName,
        seriesId: primaryEntry.seriesId,
        seriesTitle: primaryEntry.seriesTitle,
        providerEntries: rankedEntries,
        activeEntry,
        primaryEntry,
        duplicateProviderCount: providerIds.size,
        bestProgress: Math.max(...rankedEntries.map((entry) => entry.progress || 0)),
        updatedAt: Math.max(...rankedEntries.map((entry) => entry.updatedAt || 0)),
      } satisfies MergedHistoryGroup;
    })
    .sort((left, right) => right.updatedAt - left.updatedAt || right.bestProgress - left.bestProgress || left.title.localeCompare(right.title));
};

export const buildProviderNameMap = (connections: SavedConnection[]) =>
  Object.fromEntries(connections.map((connection) => [connection.id, connection.name]));
