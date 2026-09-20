/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"
import { useRef } from "react"

interface TooltipProviderProps {
  delayDuration?: number
  children: React.ReactNode
}

interface TooltipContextType {
  delayDuration: number
}

const TooltipContext = React.createContext<TooltipContextType>({
  delayDuration: 0
})

function TooltipProvider({
  delayDuration = 0,
  children,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ delayDuration }} {...props}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipState {
  isVisible: boolean
  position: { x: number; y: number }
  side: 'top' | 'bottom' | 'left' | 'right'
}

const TooltipStateContext = React.createContext<{
  state: TooltipState
  setState: React.Dispatch<React.SetStateAction<TooltipState>>
  triggerRef: React.RefObject<HTMLElement | null>
} | null>(null)

function Tooltip({ children, ...props }: TooltipProps) {
  const [state, setState] = React.useState<TooltipState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    side: 'top'
  })
  const triggerRef = React.useRef<HTMLElement>(null)

  return (
    <TooltipProvider>
      <TooltipStateContext.Provider value={{ state, setState, triggerRef }} {...props}>
        {children}
      </TooltipStateContext.Provider>
    </TooltipProvider>
  )
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

function TooltipTrigger({ 
  asChild = false, 
  children, 
  side: forcedSide,
  align = 'center',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props 
}: TooltipTriggerProps) {
  const context = React.useContext(TooltipStateContext)
  const tooltipContext = React.useContext(TooltipContext)
  
  if (!context) {
    throw new Error('TooltipTrigger must be used within a Tooltip')
  }

  const { setState, triggerRef } = context
  const { delayDuration } = tooltipContext
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calculatePosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop
    
    // Use forced side if provided, otherwise calculate best position
    let side: 'top' | 'bottom' | 'left' | 'right' = forcedSide || 'top'
    
    if (!forcedSide) {
      // Auto-calculate position based on available space
      if (rect.top < 60) {
        side = 'bottom'
      } else if (rect.right > window.innerWidth - 200) {
        side = 'left'
      } else if (rect.left < 200) {
        side = 'right'
      }
    }
    
    let x = rect.left + scrollX
    let y = rect.top + scrollY
    
    // Calculate position based on side and alignment
    switch (side) {
      case 'top':
        y = rect.top + scrollY
        break
      case 'bottom':
        y = rect.bottom + scrollY
        break
      case 'left':
        x = rect.left + scrollX
        y = rect.top + scrollY + rect.height / 2
        break
      case 'right':
        x = rect.right + scrollX
        y = rect.top + scrollY + rect.height / 2
        break
    }
    
    // Apply alignment
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          x = rect.left + scrollX
          break
        case 'center':
          x = rect.left + scrollX + rect.width / 2
          break
        case 'end':
          x = rect.right + scrollX
          break
      }
    } else {
      switch (align) {
        case 'start':
          y = rect.top + scrollY
          break
        case 'center':
          y = rect.top + scrollY + rect.height / 2
          break
        case 'end':
          y = rect.bottom + scrollY
          break
      }
    }

    return { x, y, side }
  }

  const showTooltip = () => {
    if (triggerRef.current) {
      const { x, y, side } = calculatePosition(triggerRef.current)
      setState(prev => ({
        ...prev,
        isVisible: true,
        position: { x, y },
        side
      }))
    }
  }

  const hideTooltip = () => {
    setState(prev => ({ ...prev, isVisible: false }))
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    onMouseEnter?.(e)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(showTooltip, delayDuration)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    onMouseLeave?.(e)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    hideTooltip()
  }

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    onFocus?.(e)
    showTooltip()
  }

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onBlur?.(e)
    hideTooltip()
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const originalRef = (child as any).ref;
    return React.cloneElement(child, {
      ...props,
      ref: (node: HTMLElement) => {
        // Assign to triggerRef
        (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
        // Call the original ref, if any
        if (typeof originalRef === 'function') {
          originalRef(node);
        } else if (originalRef && typeof originalRef === 'object') {
          (originalRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    })
  }

  return (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      {...props}
    >
      {children}
    </span>
  )
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  sideOffset?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  hidden?: boolean
  children: React.ReactNode
}

function TooltipContent({
  className,
  sideOffset = 4,
  side: forcedSide,
  align = 'center',
  hidden = false,
  children,
  ...props
}: TooltipContentProps) {
  const context = React.useContext(TooltipStateContext)
  
  if (!context) {
    throw new Error('TooltipContent must be used within a Tooltip')
  }

  const { state } = context
  const contentRef = React.useRef<HTMLDivElement>(null)

  const getTransformOrigin = () => {
    const actualSide = forcedSide || state.side
    switch (actualSide) {
      case 'top':
        return 'bottom center'
      case 'bottom':
        return 'top center'
      case 'left':
        return 'right center'
      case 'right':
        return 'left center'
      default:
        return 'bottom center'
    }
  }

  const getPositionStyles = () => {
    const offset = sideOffset
    const actualSide = forcedSide || state.side
    let x = state.position.x
    let y = state.position.y

    switch (actualSide) {
      case 'top':
        y -= offset
        break
      case 'bottom':
        y += offset
        break
      case 'left':
        x -= offset
        break
      case 'right':
        x += offset
        break
    }

    let transform = ''
    if (actualSide === 'top' || actualSide === 'bottom') {
      switch (align) {
        case 'start':
          transform = 'translateX(0) translateY(' + (actualSide === 'top' ? '-100%' : '0') + ')'
          break
        case 'center':
          transform = 'translateX(-50%) translateY(' + (actualSide === 'top' ? '-100%' : '0') + ')'
          break
        case 'end':
          transform = 'translateX(-100%) translateY(' + (actualSide === 'top' ? '-100%' : '0') + ')'
          break
      }
    } else {
      switch (align) {
        case 'start':
          transform = actualSide === 'left' ? 'translateX(-100%) translateY(0)' : 'translateX(0) translateY(0)'
          break
        case 'center':
          transform = actualSide === 'left' ? 'translateX(-100%) translateY(-50%)' : 'translateX(0) translateY(-50%)'
          break
        case 'end':
          transform = actualSide === 'left' ? 'translateX(-100%) translateY(-100%)' : 'translateX(0) translateY(-100%)'
          break
      }
    }

    return {
      position: 'fixed' as const, // Changed from absolute to fixed
      left: x,
      top: y,
      transform,
      transformOrigin: getTransformOrigin(),
      zIndex: 9999, // Increased z-index
    }
  }

  const getArrowStyles = () => {
    const actualSide = forcedSide || state.side
    switch (actualSide) {
      case 'top':
        return {
          position: 'absolute' as const,
          bottom: '-3px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        }
      case 'bottom':
        return {
          position: 'absolute' as const,
          top: '-3px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        }
      case 'left':
        return {
          position: 'absolute' as const,
          right: '-3px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        }
      case 'right':
        return {
          position: 'absolute' as const,
          left: '-3px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        }
      default:
        return {}
    }
  }

  if (!state.isVisible || hidden) return null

  return (
    <>
      {/* Portal-like rendering at document body */}
      {typeof window !== 'undefined' && createPortal(
        <div
          ref={contentRef}
          style={getPositionStyles()}
          className={cn(
            "bg-gray-900 text-white z-50 w-fit rounded-md px-3 py-1.5 text-xs font-medium shadow-lg border border-gray-700",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            (forcedSide || state.side) === 'bottom' && "slide-in-from-top-2",
            (forcedSide || state.side) === 'left' && "slide-in-from-right-2",
            (forcedSide || state.side) === 'right' && "slide-in-from-left-2",
            (forcedSide || state.side) === 'top' && "slide-in-from-bottom-2",
            className
          )}
          {...props}
        >
          {children}
          <div
            className="bg-gray-900 z-50 size-2 rounded-[1px]"
            style={getArrowStyles()}
          />
        </div>,
        document.body
      )}
    </>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }