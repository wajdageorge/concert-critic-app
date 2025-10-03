import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 bg-background p-4">
          <h1 className="text-2xl font-bold">Sidebar Example</h1>
          <p className="text-muted-foreground mt-2">This is how the sidebar looks in the application.</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
