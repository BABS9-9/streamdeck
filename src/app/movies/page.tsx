import { AppShell } from '@/components/app-shell';
import { MediaLibrary } from '@/components/media-library';

export default function MoviesPage() {
  return <AppShell><MediaLibrary kind="movies" /></AppShell>;
}
