/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { type ReactElement, cloneElement, Children } from "react";

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children: ReactElement<any>; // The child must be a single React element
}

export function Slot({ children, ...props }: SlotProps): ReactElement {
  const child = Children.only(children) as ReactElement<any>; // Explicitly cast child to ReactElement

  return cloneElement(child, {
    ...props,
    ...child.props, // Merge original child props
    className: [props.className, child.props.className]
      .filter(Boolean)
      .join(" "), // Merge classNames
  });
}
