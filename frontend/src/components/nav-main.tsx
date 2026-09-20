/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function NavMain({
  items,
}: {
  items: {
    id?: string;
    groupName?: string;
    title?: string;
    url?: string;
    icon?: LucideIcon;
    iconColor?: string;
    isActive?: boolean;
    items?: { title?: string; url: string; icon?: LucideIcon }[];
  }[];
}) {
  const [activeMenu, setActiveMenu] = useState<{
    menu: string;
    subMenu: string;
  }>({ menu: "", subMenu: "" });

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const savedMenu = localStorage.getItem("activeMenu");
    const savedSubMenu = localStorage.getItem("activeSubMenu");
    const savedOpenMenus = localStorage.getItem("openMenus");

    if (savedMenu) {
      setActiveMenu({
        menu: savedMenu,
        subMenu: savedSubMenu || "",
      });

      setOpenMenus((prev) => ({
        ...prev,
        [savedMenu]: true, 
      }));
    }

    if (savedOpenMenus) {
      setOpenMenus(JSON.parse(savedOpenMenus));
    }
  }, []);

  const toggleMenu = (menuId: string, isOpen: boolean) => {
    const newState = {
      [menuId]: isOpen,
    };

    setOpenMenus(newState);
    localStorage.setItem("openMenus", JSON.stringify(newState));

    setActiveMenu({
      menu: isOpen ? menuId : "",
      subMenu: "",
    });

    localStorage.setItem("activeMenu", isOpen ? menuId : "");
    localStorage.setItem("activeSubMenu", "");
  };

  const handleSubmenuClick = (menuId: string, subMenuTitle: string) => {
    setActiveMenu({ menu: menuId, subMenu: subMenuTitle });
    localStorage.setItem("activeMenu", menuId);
    localStorage.setItem("activeSubMenu", subMenuTitle);
  };

  return (
    <SidebarGroup>
      {items &&
        items.map((item) => (
          <SidebarMenu key={item.id}>
            {item.groupName && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 px-3">
                {item.groupName}
              </SidebarGroupLabel>
            )}
            <Collapsible
              key={item.id}
              open={openMenus[item.id || ""] || false}
              onOpenChange={(isOpen) =>
                toggleMenu(item.id || "", isOpen)
              }
              className="group/collapsible mb-2"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <Link to={item.url ? item.url : ""}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={`
                        transition-all duration-200 ease-in-out
                        rounded-lg px-3 py-2.5 mr-2
                        hover:bg-gray-100 hover:shadow-sm
                        active:scale-[0.98]
                        ${
                          activeMenu.menu === item.id 
                            ? "bg-blue-50 text-blue-700 shadow-sm" 
                            : "text-gray-700 hover:text-gray-900"
                        }
                      `}
                    >
                      {item.icon && (
                        <item.icon 
                          className="flex-shrink-0" 
                          size={20}
                          color={activeMenu.menu === item.id ? (item.iconColor || "#374151"): (item.iconColor || "#374151")} 
                        />
                      )}
                      <span
                        className={`
                          text-sm transition-all
                          ${
                            activeMenu.menu === item.id 
                              ? "font-semibold" 
                              : "font-medium"
                          }
                        `}
                      >
                        {item.title}
                      </span>
                      {item.items && item.items.length > 0 && (
                        <ChevronRight
                          size={16}
                          className={`
                            ml-auto shrink-0
                            transition-transform duration-300 ease-in-out
                            ${item.id && openMenus[item.id] ? "rotate-90" : ""}
                            ${activeMenu.menu === item.id ? "text-blue-600" : "text-gray-400"}
                          `}
                        />
                      )}
                    </SidebarMenuButton>
                  </Link>
                </CollapsibleTrigger>
                {item.items && item.items.length > 0 && (
                  <CollapsibleContent>
                    <div className="transition-all duration-300 ease-in-out mt-2">
                    <SidebarMenuSub className="ml-6 mb-2 space-y-1.5 border-l-2 border-gray-200 pl-4">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className={`
                              transition-all duration-200 ease-in-out
                              rounded-md px-3 py-2
                              hover:bg-gray-50 hover:translate-x-1
                              active:scale-[0.97]
                              ${
                                activeMenu.subMenu === subItem.title
                                  ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }
                            `}
                          >
                            <Link 
                              to={subItem.url}
                              onClick={() =>
                                handleSubmenuClick(
                                  item.id || "",
                                  subItem.title || ""
                                )
                              }
                            >
                              {subItem.icon && (
                                <subItem.icon 
                                  size={18}
                                  className={`
                                    flex-shrink-0
                                    ${activeMenu.subMenu === subItem.title ? "text-blue-600" : "text-gray-500"}
                                  `}
                                />
                              )}
                              <span
                                className={`
                                  text-sm transition-all
                                  ${
                                    activeMenu.subMenu === subItem.title
                                      ? "font-semibold"
                                      : "font-normal"
                                  }
                                `}
                              >
                                {subItem.title}
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                    </div>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        ))}
    </SidebarGroup>
  );
}