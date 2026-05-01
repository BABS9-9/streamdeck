import { AppShell } from '@/components/app-shell';
import { MediaLibrary } from '@/components/media-library';

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ seriesId?: string; season?: string; episode?: string }>;

}) {
  const params = await searchParams;
  const initialSeriesId = Number(params.seriesId || '');
  const initialSeasonNumber = Number(params.season || '');
  const initialEpisodeNumber = Number(params.episode || '');

  return (
    <AppShell>
      <MediaLibrary
        kind="series"
        initialSeriesId={Number.isFinite(initialSeriesId) && initialSeriesId > 0 ? initialSeriesId : null}
        initialSeasonNumber={Number.isFinite(initialSeasonNumber) && initialSeasonNumber > 0 ? initialSeasonNumber : null}
        initialEpisodeNumber={Number.isFinite(initialEpisodeNumber) && initialEpisodeNumber > 0 ? initialEpisodeNumber : null}
      />
    </AppShell>
  );
}
