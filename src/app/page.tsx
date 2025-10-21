'use client';
import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import Spotlight from '@/components/Spotlight';
import { AppTile } from '@/components/AppTile';
import DashboardCard from '@/components/DashboardCard';
import DashboardRow from '@/components/DashboardRow';
import { Clock, DoorOpen, MapPin, TriangleAlert, Star, Folder, Wrench, Laptop2, Building2 } from 'lucide-react';

export default function Home() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SiteHeader onOpenSearch={() => setOpen(true)} />
      <Spotlight open={open} setOpen={setOpen} />

      <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-12 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-900/20 to-blue-700/20 rounded-full blur-xl floating-element"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-600/20 to-blue-400/20 rounded-full blur-xl floating-element" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-28 h-28 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full blur-xl floating-element" style={{animationDelay: '4s'}}></div>
          
          {/* Side filler elements for wider screens */}
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-gradient-to-r from-blue-800/5 to-transparent rounded-full blur-2xl floating-element hidden lg:block"></div>
          <div className="absolute top-1/2 -right-20 w-40 h-40 bg-gradient-to-l from-blue-600/5 to-transparent rounded-full blur-2xl floating-element hidden lg:block" style={{animationDelay: '3s'}}></div>
          <div className="absolute bottom-1/4 -left-16 w-32 h-32 bg-gradient-to-r from-blue-700/5 to-transparent rounded-full blur-2xl floating-element hidden lg:block" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/3 -right-16 w-32 h-32 bg-gradient-to-l from-blue-500/5 to-transparent rounded-full blur-2xl floating-element hidden lg:block" style={{animationDelay: '5s'}}></div>
          
          {/* Geometric patterns for side areas */}
          <div className="absolute top-1/3 left-0 w-1 h-32 bg-gradient-to-b from-blue-600/20 via-blue-400/10 to-transparent hidden xl:block"></div>
          <div className="absolute top-1/3 right-0 w-1 h-32 bg-gradient-to-b from-blue-600/20 via-blue-400/10 to-transparent hidden xl:block"></div>
          <div className="absolute bottom-1/3 left-0 w-1 h-24 bg-gradient-to-t from-blue-500/20 via-blue-300/10 to-transparent hidden xl:block"></div>
          <div className="absolute bottom-1/3 right-0 w-1 h-24 bg-gradient-to-t from-blue-500/20 via-blue-300/10 to-transparent hidden xl:block"></div>
        </div>


        {/* Dashboard */}
        <div className="mb-8 sm:mb-12 relative z-10">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-300 dark:via-blue-400 dark:to-blue-500">Dashboard</h2>
          </div>
          <div className="w-full">
            <DashboardRow>
              <DashboardCard
                title="Positive Points"
                value={18}
                subtitle="PBIS Points Today"
                variant="behavior"
                className="w-full"
              />
              <DashboardCard
                title="Tardies Today"
                value={7}
                subtitle="Logged since 7:00 AM"
                variant="warning"
                className="w-full"
              />
              <DashboardCard
                title="Passes in Use"
                value={3}
                subtitle="Students out right now"
                variant="info"
                className="w-full"
              />
            </DashboardRow>
          </div>
        </div>

        {/* Faculty Tools */}
        <div className="relative z-10">
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-300 dark:via-blue-400 dark:to-blue-500 mb-1">Faculty Tools</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Quick access</p>
          </div>

          {/* Mobile: 3x3 Grid Layout */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:hidden w-full">
            <AppTile href="/tardy" Icon={Clock} label="Tardy Log" hint="Record late students" />
            <AppTile href="/hallpass" Icon={DoorOpen} label="Hall Pass" hint="Timed passes" />
            <AppTile href="/locator" Icon={MapPin} label="Student Locator" hint="Find students" />
            <AppTile href="/detentions" Icon={TriangleAlert} label="Detentions" hint="Track attendance" />
            <AppTile href="/points" Icon={Star} label="Positive Points" hint="Reward behavior" />
            <AppTile href="/history" Icon={Folder} label="Student History" hint="View records" />
            <AppTile href="/it" Icon={Wrench} label="IT Help" hint="Report issues" />
            <AppTile href="/lost-device" Icon={Laptop2} label="Lost Device" hint="Flag devices" />
            <AppTile href="/rooms" Icon={Building2} label="Room Finder" hint="Find resources" />
          </div>

          {/* Desktop: 1x9 Horizontal Row */}
          <div className="hidden lg:grid lg:grid-cols-9 gap-2 xl:gap-3 w-full">
            <AppTile href="/tardy" Icon={Clock} label="Tardy Log" hint="Record late students" />
            <AppTile href="/hallpass" Icon={DoorOpen} label="Hall Pass" hint="Timed passes" />
            <AppTile href="/locator" Icon={MapPin} label="Student Locator" hint="Find students" />
            <AppTile href="/detentions" Icon={TriangleAlert} label="Detentions" hint="Track attendance" />
            <AppTile href="/points" Icon={Star} label="Positive Points" hint="Reward behavior" />
            <AppTile href="/history" Icon={Folder} label="Student History" hint="View records" />
            <AppTile href="/it" Icon={Wrench} label="IT Help" hint="Report issues" />
            <AppTile href="/lost-device" Icon={Laptop2} label="Lost Device" hint="Flag devices" />
            <AppTile href="/rooms" Icon={Building2} label="Room Finder" hint="Find resources" />
          </div>
        </div>
      </main>
    </>
  );
}