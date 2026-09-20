import { cn } from "@/lib/utils";
import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
  createContext,
  type ReactNode,
} from "react";

// Context to share dropdown state
const DropdownContext = createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block" ref={menuRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(DropdownContext);
  if (!context)
    throw new Error("DropdownMenuTrigger must be inside DropdownMenu");

  const { isOpen, setIsOpen } = context;

  return (
    <button
      role="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "mt-2 px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isOpen } = useContext(DropdownContext)!;
  const contentRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState({ top: 0, left: 0, transform: "none" });

  const positionContent = useCallback(() => {
    const content = contentRef.current;
    const trigger = content?.parentElement?.querySelector(
      '[role="button"]'
    ) as HTMLElement;

    if (!content || !trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const showAbove =
      spaceBelow < contentRect.height + 8 &&
      spaceAbove > contentRect.height + 8;

    const top = showAbove
      ? trigger.offsetTop - content.offsetHeight - 4
      : trigger.offsetTop + trigger.offsetHeight + 4;

    const spaceRight = window.innerWidth - triggerRect.left;
    const showRightAligned = spaceRight < contentRect.width + 16;

    let left = trigger.offsetLeft;
    let transform = "none";

    if (showRightAligned) {
      left = trigger.offsetLeft + trigger.offsetWidth;
      transform = "translateX(-100%)";
    } else if (
      content.parentElement!.offsetWidth < 300 ||
      window.innerWidth / 2 - triggerRect.left < 200
    ) {
      left = trigger.offsetLeft + trigger.offsetWidth / 2;
      transform = "translateX(-50%)";
    }

    setStyles({ top, left, transform });
  }, []);

  useEffect(() => {
    if (isOpen) {
      positionContent();
    }
  }, [isOpen, positionContent]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      style={styles}
      className={cn(
        "absolute z-50 w-48 rounded-md border border-gray-300 bg-white shadow-md focus:outline-none",
        className
      )}
    >
      {children}
    </div>
  );
}

export const DropdownMenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-3 py-2 text-sm font-semibold text-gray-700">
    {children}
  </div>
);

export const DropdownMenuItem = ({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuItem must be inside DropdownMenu");

  const { setIsOpen } = context;

  const handleClick = () => {
    if (onClick) onClick();
    setIsOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2 text-sm hover:bg-gray-100",
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownMenuSeparator = () => (
  <hr className="border-t my-1 border-gray-200" />
);
