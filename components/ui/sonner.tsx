"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-ink group-[.toaster]:border-silver group-[.toaster]:shadow-md",
          description: "group-[.toast]:text-ink/70",
          actionButton: "group-[.toast]:bg-navy group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-silver group-[.toast]:text-ink",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
