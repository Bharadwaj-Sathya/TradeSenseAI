import React from "react";
import { Outlet } from "react-router-dom";
import { useSidebar, SidebarProvider } from "./ui/sidebar";
import Header from "./Header";
import { AppSidebar } from "./app-sidebar";

const LayoutContent: React.FC = () => {
  const { state } = useSidebar();
  const sidebarWidth = state === "expanded" ? "ml-64" : "ml-16";

  return (
    <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarWidth} h-screen`}>
      {/* ✅ shrink-0 keeps header fixed height */}
      <div className="sticky top-0 z-10 bg-white shadow shrink-0">
        <Header />
      </div>
      {/* ✅ flex-1 + min-h-0 + overflow-hidden = main fills remaining space */}
      <main className="flex-1 overflow-hidden min-h-0 p-4">
        <Outlet />
      </main>
    </div>
  );
};

const Layout: React.FC = () => (
  <SidebarProvider>
    <AppSidebar />
    <LayoutContent />
  </SidebarProvider>
);

export default Layout;