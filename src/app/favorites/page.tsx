import { AppShell } from '@/components/app-shell';
import { LibraryCollections } from '@/components/library-collections';

export default function FavoritesPage() {
  return <AppShell><LibraryCollections mode="favorites" /></AppShell>;
}
