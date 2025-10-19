'use client';
import * as React from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { Clock, DoorOpen, MapPin, TriangleAlert, Star, Folder, Wrench, Laptop2, Building2 } from "lucide-react";

const items = [
  { label: 'Tardy Log', icon: Clock, href: '/tardy' },
  { label: 'Hall Pass', icon: DoorOpen, href: '/hallpass' },
  { label: 'Student Locator', icon: MapPin, href: '/locator' },
  { label: 'Detentions', icon: TriangleAlert, href: '/detentions' },
  { label: 'Positive Points', icon: Star, href: '/points' },
  { label: 'Student History', icon: Folder, href: '/history' },
  { label: 'IT Help Ticket', icon: Wrench, href: '/it' },
  { label: 'Report Lost/Broken Device', icon: Laptop2, href: '/lost-device' },
  { label: 'Room & Equipment Finder', icon: Building2, href: '/rooms' },
];

export default function Spotlight({ open, setOpen }:{open:boolean; setOpen:(v:boolean)=>void}) {
  const router = useRouter();
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tools…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Tools">
          {items.map(i => (
            <CommandItem
              key={i.href}
              value={i.label}
              onSelect={() => { setOpen(false); router.push(i.href); }}
            >
              <i.icon className="mr-2 h-4 w-4" /> {i.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
