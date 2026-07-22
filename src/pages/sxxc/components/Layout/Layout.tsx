import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LeftSidebar from '../LeftSidebar/LeftSidebar';
import { PortalModule } from '../../portal/config';
import { portalModules } from '../../portal/config';
import './Layout.less';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [currentModule, setCurrentModule] = useState<PortalModule | null>(null);
  const [currentSubModule, setCurrentSubModule] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (
      path === '/login' ||
      path.startsWith('/portal') ||
      path.startsWith('/screenView') ||
      path.startsWith('/callback')
    ) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const currentPath = location.pathname;
    for (const module of portalModules) {
      for (const child of module.children) {
        if (child.children) {
          for (const third of child.children) {
            const thirdPath = third.path.split('?')[0];
            if (currentPath === thirdPath || currentPath.startsWith(thirdPath + '/')) {
              setCurrentModule(module);
              setCurrentSubModule(third.title);
              return;
            }
          }
        }
        const childPath = child.path.split('?')[0];
        if (currentPath === childPath || currentPath.startsWith(childPath + '/')) {
          setCurrentModule(module);
          setCurrentSubModule(child.title);
          return;
        }
      }
    }
    setCurrentModule(null);
    setCurrentSubModule('');
  }, [location.pathname]);

  return (
    <div className="layout-container">
      {showSidebar && currentModule && (
        <LeftSidebar currentModule={currentModule} />
      )}
      <main className={`layout-content ${showSidebar && currentModule ? 'layout-content-with-sidebar' : ''}`}>
          {children}
      </main>
    </div>
  );
}