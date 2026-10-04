import { createContext, useContext } from 'react';
export const ConfigCtx = createContext({});
export const useConfig = () => useContext(ConfigCtx);
