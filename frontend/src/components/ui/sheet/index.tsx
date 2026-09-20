"use client";

import React, { createContext, useContext, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextProps | undefined>(undefined);

interface SheetProps {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Sheet = ({
  children,
  className,
  open: controlledOpen,
  onOpenChange,
}: SheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      <div className={cn("relative", className)}>{children}</div>
    </SheetContext.Provider>
  );
};

export const SheetPortal = ({ children }: { children: React.ReactNode }) => {
  const { open } = useSheet();
  return open ? <div className="fixed inset-0 z-50">{children}</div> : null;
};

export const SheetOverlay = () => {
  const { setOpen } = useSheet();
  return (
    <div className="fixed inset-0 bg-black/80" onClick={() => setOpen(false)} />
  );
};

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export const SheetContent: React.FC<SheetContentProps> = ({
  children,
  side = "right",
  className,
  ...props
}) => {
  const { open } = useSheet();

  return (
    <div
      className={cn(
        "fixed bg-white shadow-lg transition-transform duration-300",
        side === "right" && "top-0 right-0 h-full w-3/4 sm:max-w-sm transform",
        side === "left" && "top-0 left-0 h-full w-3/4 sm:max-w-sm transform",
        side === "top" && "top-0 left-0 w-full h-1/3 transform",
        side === "bottom" && "bottom-0 left-0 w-full h-1/3 transform",
        open
          ? "translate-x-0 translate-y-0"
          : side === "right"
          ? "translate-x-full"
          : side === "left"
          ? "-translate-x-full"
          : side === "top"
          ? "-translate-y-full"
          : "translate-y-full",
        className
      )}
      {...props} // Spread props here
    >
      <div className="relative">
        <SheetClose />
        {children}
      </div>
    </div>
  );
};

export const SheetTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const {open, setOpen } = useSheet();
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </button>
  );
};

export const SheetClose = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const { setOpen } = useSheet();
  return (
    <button
      onClick={() => setOpen(false)}
      className={cn(
        "absolute right-4 top-4 text-gray-500 hover:text-gray-700",
        className
      )}
    >
      {children ?? <X className="h-5 w-5" />}
    </button>
  );
};

export const SheetHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
  >
    {children}
  </div>
);

export const SheetFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
  >
    {children}
  </div>
);

export const SheetTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;

export const SheetDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={cn("text-sm text-gray-600", className)}>{children}</p>;

// Custom Hook to Get Context
const useSheet = () => {
  const context = useContext(SheetContext);
  if (!context) throw new Error("Sheet components must be used inside <Sheet>");
  return context;
};
