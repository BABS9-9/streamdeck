import { AppShell } from '@/components/app-shell';
import { MediaLibrary } from '@/components/media-library';

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ seriesId?: string }>;
}) {
  const params = await searchParams;
  const initialSeriesId = Number(params.seriesId || '');

  return (
    <AppShell>
      <MediaLibrary kind="series" initialSeriesId={Number.isFinite(initialSeriesId) && initialSeriesId > 0 ? initialSeriesId : null} />
    </AppShell>
  );
}
