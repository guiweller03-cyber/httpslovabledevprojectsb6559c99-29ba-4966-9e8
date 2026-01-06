import { ReactNode } from 'react';
import { ModularSidebar } from './ModularSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        <ModularSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
