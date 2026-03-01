import { Home, Box, BarChart3 } from 'lucide-react';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden max-w-md mx-auto bg-gray-50 shadow-2xl h-[100dvh]">
      {children}
      
      {/* Bottom Navigation */}
      <div className="absolute bottom-0 w-full border-t border-gray-200 bg-white/90 ios-blur px-6 pb-6 pt-2 z-30">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('archive')}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] group"
          >
            <Box className={`w-7 h-7 transition-colors ${activeTab === 'archive' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'archive' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>归档</span>
          </button>
          <button 
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] group"
          >
            <Home className={`w-7 h-7 transition-colors ${activeTab === 'home' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'home' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>主页</span>
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] group"
          >
            <BarChart3 className={`w-7 h-7 transition-colors ${activeTab === 'ads' ? 'text-primary fill-primary/20' : 'text-gray-400 group-hover:text-primary'}`} />
            <span className={`text-[10px] font-medium ${activeTab === 'ads' ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>投放</span>
          </button>
        </div>
        <div className="w-full flex justify-center mt-3">
          <div className="w-1/3 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
