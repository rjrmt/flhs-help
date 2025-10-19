'use client';
import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import Spotlight from '@/components/Spotlight';
import { AppTile } from '@/components/AppTile';
import { QuickActions } from '@/components/QuickActions';
import { Clock, DoorOpen, MapPin, TriangleAlert, Star, Folder, Wrench, Laptop2, Building2 } from 'lucide-react';

export default function Home() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SiteHeader onOpenSearch={() => setOpen(true)} />
      <Spotlight open={open} setOpen={setOpen} />

      <main className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 max-w-5xl relative">
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

        {/* Quick Actions */}
        <div className="mb-8 relative z-10">
          <QuickActions />
        </div>

        {/* Quick Stats Dashboard */}
        <div className="mb-8 sm:mb-12 relative z-10">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-300 dark:via-blue-400 dark:to-blue-500">Dashboard</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:max-w-2xl sm:mx-auto">
            <div className="text-center px-2 py-3 sm:p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-[transform,shadow,filter] duration-200 ease-out shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400/50">
              <div className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-1 sm:mb-2 pulse-glow">24</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Students</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Current class</div>
            </div>
            <div className="text-center px-2 py-3 sm:p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-[transform,shadow,filter] duration-200 ease-out shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400/50">
              <div className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent mb-1 sm:mb-2 pulse-glow" style={{animationDelay: '1s'}}>3</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Tasks</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Today</div>
            </div>
            <div className="text-center px-2 py-3 sm:p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-amber-200/50 dark:border-amber-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-[transform,shadow,filter] duration-200 ease-out shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400/50">
              <div className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-1 sm:mb-2 pulse-glow" style={{animationDelay: '2s'}}>12</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Pending</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">This week</div>
            </div>
          </div>
        </div>

        {/* Faculty Tools */}
        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-300 dark:via-blue-400 dark:to-blue-500 mb-2">Faculty Tools</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Essential classroom management tools</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 max-w-4xl mx-auto">
            <AppTile href="/tardy" Icon={Clock} label="Tardy Log" hint="Record late students" />
            <AppTile href="/hallpass" Icon={DoorOpen} label="Hall Pass" hint="Timed passes" />
            <AppTile href="/locator" Icon={MapPin} label="Student Locator" hint="Find students" />
            
            {/* Subtle divider */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 h-px bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/50 to-transparent my-2"></div>
            
            <AppTile href="/detentions" Icon={TriangleAlert} label="Detentions" hint="Track attendance" />
            <AppTile href="/points" Icon={Star} label="Positive Points" hint="Reward behavior" />
            <AppTile href="/history" Icon={Folder} label="Student History" hint="View records" />
            
            {/* Subtle divider */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 h-px bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/50 to-transparent my-2"></div>
            
            <AppTile href="/it" Icon={Wrench} label="IT Help" hint="Report issues" />
            <AppTile href="/lost-device" Icon={Laptop2} label="Lost Device" hint="Flag devices" />
            <AppTile href="/rooms" Icon={Building2} label="Room Finder" hint="Find resources" />
          </div>
        </div>
      </main>
    </>
  );
}