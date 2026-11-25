import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { getActiveModal, subscribeModal, openModal, closeModal } from '../utils/modal';

const ModalContext = createContext({
  activeModal: null,
  openModal: () => {},
  closeModal: () => {},
});

export function ModalProvider({ children }) {
  const activeModal = useSyncExternalStore(subscribeModal, getActiveModal, () => null);

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
