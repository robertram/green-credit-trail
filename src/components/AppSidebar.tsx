import { Leaf, ShoppingCart, Shield, Home, Wallet, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Marketplace", url: "/marketplace", icon: ShoppingCart },
  { title: "Issue Credits", url: "/issuer", icon: Leaf },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { walletConnected, walletAddress, connectWallet, disconnectWallet, truncateAddress } = useApp();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Leaf className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-sidebar-foreground tracking-tight">GreenLedger</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/evidence/proj-001" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <Shield className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Verify Evidence</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-3">
        {walletConnected ? (
          <div className="space-y-2">
            {!collapsed && (
              <div className="px-2 py-1.5 rounded-md bg-sidebar-accent">
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Connected</p>
                <p className="text-xs font-mono text-sidebar-primary">{truncateAddress(walletAddress)}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={disconnectWallet} className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent justify-start">
              <LogOut className="h-4 w-4 mr-2" />
              {!collapsed && "Disconnect"}
            </Button>
          </div>
        ) : (
          <Button onClick={connectWallet} size="sm" className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Wallet className="h-4 w-4 mr-2" />
            {!collapsed && "Connect Wallet"}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
