import { AppShell } from '@/components/app-shell';
import { MediaLibrary } from '@/components/media-library';

export default function SeriesPage() {
  return <AppShell><MediaLibrary kind="series" /></AppShell>;
}
