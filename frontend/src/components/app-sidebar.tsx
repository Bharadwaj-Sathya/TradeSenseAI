import * as React from "react";
import {
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  PiggyBank,
  ChartNoAxesCombined,
  Wallet,
  WalletCards,
  ShieldUser,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { useSelector } from "react-redux";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRootState = { user?: { user?: any } };

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const user = useSelector((state: AppRootState) => state.user?.user);

  // Define data inside the component so it can use the user state
  const data = {
    navMain: [
      ...(user && user.role === "Admin"
        ? [
            {
              id: "0",
              groupName: "Admin",
              title: "Dashboard",
              url: "/admin/dashboard",
              icon: ShieldUser,
              iconColor: "black",
              isActive: false,
              items: [
                {
                  title: "Users",
                  url: "/admin/users",
                  icon: Users,
                },
              ],
            },
          ]
        : []),
      {
        id: "1",
        groupName: "Home",
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        iconColor: "blue",
        isActive: false,
        items: [],
      },
      {
        id: "2",
        groupName: "",
        title: "Income",
        url: "/income",
        icon: WalletCards,
        iconColor: "green",
        isActive: false,
        items: [],
      },
      {
        id: "3",
        groupName: "",
        title: "Loans",
        url: "/loans",
        icon: HandCoins,
        iconColor: "orange",
        isActive: false,
        items: [],
      },
      // {
      //   id: "4",
      //   groupName: "",
      //   title: "Debts",
      //   url: "/debts",
      //   icon: CreditCard,
      //   iconColor: "red",
      //   isActive: false,
      //   items: [],
      // },
      {
        id: "5",
        groupName: "",
        title: "Expenses",
        url: "/expenses",
        icon: ReceiptText,
        iconColor: "red",
        isActive: false,
        items: [],
      },
      {
        id: "6",
        groupName: "",
        title: "Savings",
        url: "/savings",
        icon: PiggyBank,
        iconColor: "green",
        isActive: false,
        items: [],
      },
      {
        id: "7",
        groupName: "",
        title: "Investments",
        url: "/investments",
        icon: ChartNoAxesCombined,
        iconColor: "purple",
        isActive: false,
        items: [],
      },
    ],
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className={`${
        state === "expanded" ? "w-64" : "w-16"
      } transition-width duration-300 ease-in-out`}
    >
      <SidebarHeader className="flex items-center px-4 py-3 space-x-3">
        <div className="flex items-center space-x-2">
          <span className="bg-linear-to-br from-sherpa-blue to-downy p-2 rounded-full">
            <Wallet size={18} color="white" />
          </span>
          <span className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            FIT FINANCE
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent
        className={`${
          state === "collapsed" ? "flex flex-col ml-1 items-center" : ""
        }`}
      >
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  );
}
