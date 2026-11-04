import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modalCrearPropuestaAbierto, setModalCrearPropuestaAbierto] = useState(false);

  const abrirModalCrearPropuesta = () => setModalCrearPropuestaAbierto(true);
  const cerrarModalCrearPropuesta = () => setModalCrearPropuestaAbierto(false);

  return (
    <ModalContext.Provider 
      value={{ 
        modalCrearPropuestaAbierto, 
        abrirModalCrearPropuesta, 
        cerrarModalCrearPropuesta 
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal debe usarse dentro de ModalProvider');
  }
  return context;
};
