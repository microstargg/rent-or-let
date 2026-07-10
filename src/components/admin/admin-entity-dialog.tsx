"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EntityDialogCloseContext = createContext<(() => void) | null>(null);

/** Close the nearest AdminEntityDialog, if any. */
export function useEntityDialogClose() {
  return useContext(EntityDialogCloseContext);
}

interface AdminEntityDialogProps {
  triggerLabel: string;
  title: string;
  description?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

export function AdminEntityDialog({
  triggerLabel,
  title,
  description,
  triggerVariant = "default",
  triggerSize = "sm",
  children,
}: AdminEntityDialogProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} size={triggerSize}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <EntityDialogCloseContext.Provider value={close}>
          {children}
        </EntityDialogCloseContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
