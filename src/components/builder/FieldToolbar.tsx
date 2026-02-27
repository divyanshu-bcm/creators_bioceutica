"use client";

import type { FieldType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  ChevronDown,
  CheckSquare,
  Circle,
  Calendar,
  Image,
  FileText,
} from "lucide-react";

const FIELDS: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  {
    type: "textarea",
    label: "Textarea",
    icon: <AlignLeft className="h-4 w-4" />,
  },
  { type: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { type: "phone", label: "Phone", icon: <Phone className="h-4 w-4" /> },
  { type: "number", label: "Number", icon: <Hash className="h-4 w-4" /> },
  {
    type: "dropdown",
    label: "Dropdown",
    icon: <ChevronDown className="h-4 w-4" />,
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  { type: "radio", label: "Radio", icon: <Circle className="h-4 w-4" /> },
  {
    type: "datetime",
    label: "Date/Time",
    icon: <Calendar className="h-4 w-4" />,
  },
  { type: "image", label: "Image", icon: <Image className="h-4 w-4" /> },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: <FileText className="h-4 w-4" />,
  },
];

interface FieldToolbarProps {
  onAdd: (type: FieldType) => void;
}

export function FieldToolbar({ onAdd }: FieldToolbarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
        Add Field
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ type, label, icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="justify-start gap-2 text-xs"
            onClick={() => onAdd(type)}
          >
            {icon}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
