import { useCallback, useEffect, useState } from 'react';

export const useCarga = (funcionCarga, dependencias = []) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);

      try {
        const resultado = await funcionCarga();
        if (activo) setDatos(resultado);
      } catch (e) {
        if (activo) {
          setError({
            estado: e?.response?.status ?? null,
            mensaje:
              e?.response?.data?.detail ??
              e?.message ??
              'No se pudieron cargar los datos.',
          });
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [...dependencias, version]);

  return { datos, cargando, error, recargar };
};
