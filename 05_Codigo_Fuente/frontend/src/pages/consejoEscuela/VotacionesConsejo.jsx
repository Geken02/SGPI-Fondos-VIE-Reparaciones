import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import consejoEscuelaService from "../../services/consejoEscuelaService";
import "./votacionesConsejo.css";

export default function VotacionesConsejo() {
  const { rolesUsuario = [] } = useAuth();

  const esAsistenteConsejo = rolesUsuario.includes("AsistenteConsejoEscuela");
  const esConsejoProfesores = rolesUsuario.includes("ConsejoProfesores");

  const [votaciones, setVotaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [propuestaId, setPropuestaId] = useState("");
  const [observacionesNueva, setObservacionesNueva] = useState("");
  const [propuestas, setPropuestas] = useState([]);
  const [cargandoPropuestas, setCargandoPropuestas] = useState(false);

  const [votos, setVotos] = useState({});
  const [resultados, setResultados] = useState({});

  const obtenerLista = (respuesta) => {
    if (Array.isArray(respuesta)) return respuesta;
    if (Array.isArray(respuesta?.items)) return respuesta.items;
    if (Array.isArray(respuesta?.data)) return respuesta.data;
    return [];
  };

  // Cargar votaciones registradas
  const cargarVotaciones = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await consejoEscuelaService.listarVotaciones();
      setVotaciones(obtenerLista(respuesta));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No fue posible cargar las votaciones."
      );
    } finally {
      setCargando(false);
    }
  };

  // Cargar propuestas disponibles para el Consejo de Escuela
  const cargarPropuestas = async () => {
    try {
      setCargandoPropuestas(true);

      const respuesta = await consejoEscuelaService.listarPropuestas();
      setPropuestas(obtenerLista(respuesta));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No fue posible cargar las propuestas disponibles."
      );
    } finally {
      setCargandoPropuestas(false);
    }
  };

  // Actualizar las votaciones y las propuestas
  const actualizarInformacion = async () => {
    await cargarVotaciones();

    if (esAsistenteConsejo) {
      await cargarPropuestas();
    }
  };

  useEffect(() => {
    actualizarInformacion();
  }, []);

  // Excluir propuestas que ya tienen una votación registrada
  const propuestasDisponibles = propuestas.filter(
    (propuesta) =>
      !votaciones.some(
        (votacion) =>
          Number(votacion.propuestaId) === Number(propuesta.propuestaId)
      )
  );

  // Crear una nueva votación
  const crear = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!propuestaId || Number(propuestaId) <= 0) {
      setError("Seleccioná una propuesta válida.");
      return;
    }

    try {
      await consejoEscuelaService.crearVotacion({
        propuestaId: Number(propuestaId),
        observaciones: observacionesNueva.trim() || null,
      });

      setPropuestaId("");
      setObservacionesNueva("");
      setMensaje("La votación se creó correctamente.");

      await actualizarInformacion();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No fue posible crear la votación."
      );
    }
  };

  // Registrar el voto de un miembro del Consejo
  const votar = async (votacionId) => {
    const formulario = votos[votacionId];

    if (!formulario?.voto) {
      setError("Seleccioná un voto antes de enviarlo.");
      return;
    }

    setError("");
    setMensaje("");

    try {
      await consejoEscuelaService.registrarVoto(votacionId, {
        voto: formulario.voto,
        observaciones: formulario.observaciones?.trim() || null,
      });

      setMensaje("El voto se registró correctamente.");

      setVotos((actual) => ({
        ...actual,
        [votacionId]: {},
      }));

      await cargarVotaciones();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No fue posible registrar el voto."
      );
    }
  };

  // Registrar el resultado y cerrar una votación
  const cerrarVotacion = async (votacionId) => {
    const formulario = resultados[votacionId];

    if (!formulario?.resultadoConsejo) {
      setError("Seleccioná el resultado del Consejo.");
      return;
    }

    setError("");
    setMensaje("");

    try {
      await consejoEscuelaService.registrarResultado(votacionId, {
        resultadoConsejo: formulario.resultadoConsejo,
        observaciones: formulario.observaciones?.trim() || null,
      });

      setMensaje("El resultado se registró y la votación se cerró.");

      setResultados((actual) => ({
        ...actual,
        [votacionId]: {},
      }));

      await cargarVotaciones();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No fue posible registrar el resultado."
      );
    }
  };

  // Actualizar los campos del formulario de voto
  const actualizarVoto = (id, campo, valor) => {
    setVotos((actual) => ({
      ...actual,
      [id]: {
        ...actual[id],
        [campo]: valor,
      },
    }));
  };

  // Actualizar los campos del formulario de resultado
  const actualizarResultado = (id, campo, valor) => {
    setResultados((actual) => ({
      ...actual,
      [id]: {
        ...actual[id],
        [campo]: valor,
      },
    }));
  };

  return (
    <main className="votaciones-consejo">
      <header className="votaciones-header">
        <div>
          <h1>Votaciones del Consejo de Escuela</h1>
          <p>
            Administración de votaciones, registro de votos y resultados de
            propuestas.
          </p>
        </div>

        <button
          type="button"
          className="btn-actualizar-votaciones"
          onClick={actualizarInformacion}
        >
          Actualizar
        </button>
      </header>

      {error && <div className="alerta-votaciones error" role="alert">{error}</div>}
      {mensaje && <div className="alerta-votaciones exito" role="status">{mensaje}</div>}

      {esAsistenteConsejo && (
        <section className="crear-votacion-card">
          <h2>Crear votación</h2>

          <form onSubmit={crear} className="crear-votacion-form">
            <label>
              Propuesta

              <select
                value={propuestaId}
                onChange={(e) => setPropuestaId(e.target.value)}
                required
                disabled={
                  cargandoPropuestas || propuestasDisponibles.length === 0
                }
              >
                <option value="">
                  {cargandoPropuestas
                    ? "Cargando propuestas..."
                    : propuestasDisponibles.length === 0
                      ? "No hay propuestas disponibles"
                      : "Seleccione una propuesta"}
                </option>

                {propuestasDisponibles.map((propuesta) => (
                  <option
                    key={propuesta.propuestaId}
                    value={propuesta.propuestaId}
                  >
                    {propuesta.codigoPropuesta} - {propuesta.titulo}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observaciones
              <textarea
                value={observacionesNueva}
                onChange={(e) => setObservacionesNueva(e.target.value)}
                maxLength="1000"
                placeholder="Observaciones de la votación (opcional)"
              />
            </label>

            <button
              type="submit"
              className="btn-crear-votacion"
              disabled={
                cargandoPropuestas ||
                !propuestaId ||
                propuestasDisponibles.length === 0
              }
            >
              Crear votación
            </button>
          </form>
        </section>
      )}

      <section className="lista-votaciones">
        <h2>Votaciones registradas</h2>

        {cargando ? (
          <p className="estado-votaciones" role="status">Cargando votaciones...</p>
        ) : votaciones.length === 0 ? (
          <p className="estado-votaciones">
            No hay votaciones registradas.
          </p>
        ) : (
          votaciones.map((votacion) => {
            const id = votacion.votacionId;
            const abierta = votacion.estadoVotacion === "ABIERTA";

            const listaVotos = Array.isArray(votacion.votos)
              ? votacion.votos
              : [];

            return (
              <article className="votacion-card" key={id}>
                <div className="votacion-card-header">
                  <div>
                    <h3>Votación #{id}</h3>
                    <p>Propuesta #{votacion.propuestaId}</p>
                  </div>

                  <span
                    className={`estado-votacion ${
                      abierta ? "abierta" : "cerrada"
                    }`}
                  >
                    {abierta ? "Abierta" : "Cerrada"}
                  </span>
                </div>

                {votacion.observaciones && (
                  <p className="observaciones-votacion">
                    {votacion.observaciones}
                  </p>
                )}

                <div className="datos-votacion">
                  <span>
                    Apertura:{" "}
                    {votacion.fechaApertura
                      ? new Date(votacion.fechaApertura).toLocaleString()
                      : "No disponible"}
                  </span>

                  {votacion.fechaCierre && (
                    <span>
                      Cierre:{" "}
                      {new Date(votacion.fechaCierre).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="votos-registrados">
                  <h4>Votos registrados ({listaVotos.length})</h4>

                  {listaVotos.length === 0 ? (
                    <p>No se han registrado votos.</p>
                  ) : (
                    <ul>
                      {listaVotos.map((voto) => (
                        <li key={voto.votoId}>
                          Usuario #{voto.usuarioId}:{" "}
                          <strong>{voto.voto}</strong>
                          {voto.observaciones && (
                            <span> — {voto.observaciones}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {votacion.resultadoConsejo && (
                  <p className="resultado-votacion">
                    Resultado:{" "}
                    <strong>{votacion.resultadoConsejo}</strong>
                  </p>
                )}

                {abierta && esConsejoProfesores && (
                  <div className="acciones-votacion">
                    <div className="accion-voto">
                      <h4>Registrar voto</h4>

                      <label>
                        Voto
                        <select
                          value={votos[id]?.voto || ""}
                          onChange={(e) =>
                            actualizarVoto(id, "voto", e.target.value)
                          }
                        >
                          <option value="">Seleccionar voto</option>
                          <option value="APROBAR">Aprobar</option>
                          <option value="RECHAZAR">Rechazar</option>
                          <option value="ABSTENCION">Abstención</option>
                        </select>
                      </label>

                      <label>
                        Observaciones
                        <textarea
                          value={votos[id]?.observaciones || ""}
                          onChange={(e) =>
                            actualizarVoto(
                              id,
                              "observaciones",
                              e.target.value
                            )
                          }
                          maxLength="1000"
                          placeholder="Observaciones (opcional)"
                        />
                      </label>

                      <button
                        type="button"
                        className="btn-registrar-voto"
                        onClick={() => votar(id)}
                      >
                        Registrar voto
                      </button>
                    </div>

                    <div className="accion-voto">
                      <h4>Registrar resultado del Consejo</h4>

                      <label>
                        Resultado
                        <select
                          value={resultados[id]?.resultadoConsejo || ""}
                          onChange={(e) =>
                            actualizarResultado(
                              id,
                              "resultadoConsejo",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Seleccionar resultado</option>
                          <option value="APROBADA">Aprobada</option>
                          <option value="RECHAZADA">Rechazada</option>
                          <option value="DEVUELTA_AJUSTES">
                            Devuelta para ajustes
                          </option>
                        </select>
                      </label>

                      <label>
                        Observaciones
                        <textarea
                          value={resultados[id]?.observaciones || ""}
                          onChange={(e) =>
                            actualizarResultado(
                              id,
                              "observaciones",
                              e.target.value
                            )
                          }
                          maxLength="1000"
                          placeholder="Observaciones del resultado"
                        />
                      </label>

                      <button
                        type="button"
                        className="btn-cerrar-votacion"
                        onClick={() => cerrarVotacion(id)}
                      >
                        Registrar resultado y cerrar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
