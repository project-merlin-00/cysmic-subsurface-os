import React from 'react';
import { 
  LayoutDashboard, 
  Droplet, 
  Activity, 
  FileText, 
  Settings,
  MessageSquare,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: MessageSquare, label: 'Chat', id: 'chat' },
  { icon: Droplet, label: 'Wells', id: 'wells' },
  { icon: Activity, label: 'Live Ops', id: 'liveops' },
  { icon: Layers, label: '3D View', id: '3dview' },
  { icon: FileText, label: 'Reports', id: 'reports' },
  { icon: AlertTriangle, label: 'Alerts', id: 'alerts' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  id: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, id: _id, isActive, isCollapsed, onClick }: NavItemProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150",
        "hover:bg-sandstone-100",
        isActive && "bg-white text-primary-600 shadow-panel",
        isCollapsed && "justify-center"
      )}
      title={isCollapsed ? label : undefined}
      onClick={onClick}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </button>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [activeItem, setActiveItem] = React.useState('chat');
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sandstone-50 border-r border-sandstone-200 transition-all duration-200",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sandstone-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-sandstone-900">CYSMIC</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-primary-600 flex items-center justify-center">
            <Droplet className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            isActive={activeItem === item.id}
            isCollapsed={isCollapsed}
            onClick={() => setActiveItem(item.id)}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sandstone-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-full p-2 text-sandstone-500 hover:text-sandstone-700 hover:bg-sandstone-100 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
