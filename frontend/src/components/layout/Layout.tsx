import React, { useContext, useEffect } from 'react';
import AppShell from './AppShell';
import { ShellContext } from './shellContext';
import { APP_NAME } from '../../config';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * What every page wraps itself in. Inside the shell route it only sets the topbar title,
 * so the frame is not rebuilt on each navigation; a page outside it gets its own shell.
 */
export default function Layout({ children, title }: LayoutProps) {
  const shell = useContext(ShellContext);

  useEffect(() => {
    shell?.setTitle(title || APP_NAME);
  }, [shell, title]);

  if (shell) return <>{children}</>;
  return <AppShell title={title}>{children}</AppShell>;
}
