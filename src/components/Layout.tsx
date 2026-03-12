import { Home, Box, BarChart3 } from 'lucide-react';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  return (
    <div className="mx-auto grid h-[100dvh] w-full max-w-md grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-gray-50 shadow-2xl">
      <div className="flex min-h-0 flex-col overflow-hidden">{children}</div>

      <div className="z-30 w-full border-t border-gray-200 bg-white/90 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-1.5 ios-blur">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('archive')}
            data-testid="tab-archive"
            className="group flex min-w-[64px] flex-col items-center justify-center gap-0.5 py-1"
          >
            <Box className={`h-6 w-6 transition-colors ${activeTab === 'archive' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'archive' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>归档</span>
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            data-testid="tab-home"
            className="group flex min-w-[64px] flex-col items-center justify-center gap-0.5 py-1"
          >
            <Home className={`h-6 w-6 transition-colors ${activeTab === 'home' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'home' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>主页</span>
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            data-testid="tab-ads"
            className="group flex min-w-[64px] flex-col items-center justify-center gap-0.5 py-1"
          >
            <BarChart3 className={`h-6 w-6 transition-colors ${activeTab === 'ads' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'ads' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>投放</span>
          </button>
        </div>
        <div className="mt-2 flex w-full justify-center">
          <div className="h-1 w-[28%] rounded-full bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
