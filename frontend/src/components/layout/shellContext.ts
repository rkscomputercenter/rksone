import { createContext } from 'react';

/** Provided by AppShell to the routed page, so the page can name itself in the topbar. */
export const ShellContext = createContext<{ setTitle: (title: string) => void } | null>(null);
