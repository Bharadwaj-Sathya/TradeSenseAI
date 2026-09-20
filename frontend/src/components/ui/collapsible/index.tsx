"use client";

import React, {
  useState,
  type ReactNode,
  useContext,
  createContext,
  cloneElement,
  isValidElement,
} from "react";
import { cn } from "@/lib/utils";

interface CollapsibleContextProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface CollapsibleProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean; // <-- add this
  onOpenChange?: (open: boolean) => void; // <-- optional but useful
  className?: string;
}

const CollapsibleContext = createContext<CollapsibleContextProps | null>(null);

const Collapsible: React.FC<CollapsibleProps> = ({
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen: React.Dispatch<React.SetStateAction<boolean>> = (val) => {
    const value =
      typeof val === "function"
        ? (val as (prev: boolean) => boolean)(isOpen)
        : val;
    if (isControlled && onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(val);
    }
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, setIsOpen }}>
      <div className={cn("w-full", className)}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

interface CollapsibleTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({
  children,
  asChild = false,
}) => {
  const context = useContext(CollapsibleContext);

  if (!context) {
    throw new Error("CollapsibleTrigger must be used within a Collapsible");
  }

  const { setIsOpen } = context;

  if (asChild) {
    if (isValidElement(children)) {
      const childElement = children as React.ReactElement<{
        onClick?: (e: React.MouseEvent) => void;
      }>;
      return cloneElement(childElement, {
        onClick: (e: React.MouseEvent) => {
          childElement.props.onClick?.(e); // safely call existing onClick
          setIsOpen((prev) => !prev);
        },
      });
    } else {
      console.warn("asChild expects a single valid React element as a child.");
      return <>{children}</>;
    }
  }

  return (
    <button
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      className="w-full flex justify-between items-center p-2 bg-gray-800 text-white rounded-md"
    >
      {children}
      <span className="transition-transform transform rotate-0">▼</span>
    </button>
  );
};

interface CollapsibleContentProps {
  children: ReactNode;
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  children,
}) => {
  const context = useContext(CollapsibleContext);

  if (!context) {
    throw new Error("CollapsibleContent must be used within a Collapsible");
  }

  const { isOpen } = context;

  return (
    <div
      className={cn(
        "transition-all overflow-hidden duration-300 ease-in-out",
        isOpen ? "max-h-screen opacity-100 py-2" : "max-h-0 opacity-0"
      )}
    >
      {children}
    </div>
  );
};

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
