import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">ReleaseWatch</span>
          <nav className="flex items-center gap-4">
            {/* User menu will go here */}
          </nav>
        </div>
      </header>
      <main className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
