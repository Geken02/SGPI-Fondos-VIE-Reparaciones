import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import consejoEscuelaService from "../../services/consejoEscuelaService";
import "./acuerdosConsejo.css";

const estadoInicial = {
  propuestaId: "",
  tipoAcuerdoId: "",
  numeroAcuerdo: "",
  fechaAcuerdo: "",
  horasAprobadas: "",
  tipoHoraId: "",
  periodoNombramiento: "",
  presupuestoAprobado: "",
};

export default function AcuerdosConsejo() {
  const { rolesUsuario = [] } = useAuth();
  const esDirectorEscuela = rolesUsuario.includes("DirectorEscuela");

  const [acuerdos, setAcuerdos] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [tiposAcuerdo, setTiposAcuerdo] = useState([]);
  const [tiposHora, setTiposHora] = useState([]);
  const [cargandoPropuestas, setCargandoPropuestas] = useState(false);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generandoDoc, setGenerandoDoc] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // =========================================================================
  // CARGA DE DATOS
  // =========================================================================
  const cargarAcuerdos = async () => {
    try {
      setCargando(true);
      setError("");
      const respuesta = await consejoEscuelaService.listarAcuerdos();
      setAcuerdos(Array.isArray(respuesta) ? respuesta : respuesta?.items ?? []);
    } catch (err) {
      console.error("Error al cargar acuerdos:", err);
      setError("No fue posible cargar los acuerdos. Verificá tu sesión y los permisos.");
    } finally {
      setCargando(false);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [tiposAc, tiposH] = await Promise.all([
        consejoEscuelaService.listarTiposAcuerdo(),
        consejoEscuelaService.listarTiposHora(),
      ]);
      setTiposAcuerdo(tiposAc || []);
      setTiposHora(tiposH || []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  const cargarPropuestas = async () => {
    try {
      setCargandoPropuestas(true);
      const respuesta = await consejoEscuelaService.listarPropuestasDisponibles();
      setPropuestas(Array.isArray(respuesta) ? respuesta : []);
    } catch (err) {
      console.error("Error al cargar propuestas:", err);
      setError("No fue posible cargar las propuestas disponibles para registrar el acuerdo.");
    } finally {
      setCargandoPropuestas(false);
    }
  };

  useEffect(() => {
    cargarAcuerdos();
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (esDirectorEscuela && mostrarFormulario) {
      cargarPropuestas();
    }
  }, [esDirectorEscuela, mostrarFormulario]);

  // =========================================================================
  // MANEJADORES DE FORMULARIO
  // =========================================================================
  const manejarCambio = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const manejarGuardar = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!formulario.propuestaId || !formulario.tipoAcuerdoId) {
      setError("La propuesta y el tipo de acuerdo son obligatorios.");
      return;
    }

    const datos = {
      propuestaId: Number(formulario.propuestaId),
      tipoAcuerdoId: Number(formulario.tipoAcuerdoId),
    };

    if (formulario.numeroAcuerdo.trim()) {
      datos.numeroAcuerdo = formulario.numeroAcuerdo.trim();
    }
    if (formulario.fechaAcuerdo) {
      datos.fechaAcuerdo = formulario.fechaAcuerdo;
    }
    if (formulario.horasAprobadas !== "") {
      datos.horasAprobadas = Number(formulario.horasAprobadas);
    }
    if (formulario.tipoHoraId !== "") {
      datos.tipoHoraId = Number(formulario.tipoHoraId);
    }
    if (formulario.periodoNombramiento.trim()) {
      datos.periodoNombramiento = formulario.periodoNombramiento.trim();
    }
    if (formulario.presupuestoAprobado !== "") {
      datos.presupuestoAprobado = Number(formulario.presupuestoAprobado);
    }

    try {
      setGuardando(true);

      // El backend genera automáticamente el documento Word y lo sube a S3
      const respuesta = await consejoEscuelaService.crearAcuerdo(datos);

      setMensaje("El acuerdo se registró correctamente y el documento oficial fue generado.");
      setFormulario(estadoInicial);
      setMostrarFormulario(false);
      await cargarAcuerdos();
    } catch (err) {
        console.error("Error al registrar acuerdo:", err);

        const detalle = err.response?.data?.detail;

        if (Array.isArray(detalle)) {
          const nombresCampos = {
            horasAprobadas: "Horas aprobadas",
            presupuestoAprobado: "Presupuesto aprobado",
            numeroAcuerdo: "Número de acuerdo",
            periodoNombramiento: "Período de nombramiento",
            propuestaId: "Propuesta",
            tipoAcuerdoId: "Tipo de acuerdo",
            tipoHoraId: "Tipo de hora",
          };

          const mensajes = detalle.map((error) => {
            const campo = error.loc?.[error.loc.length - 1];
            const nombre = nombresCampos[campo] || campo || "Dato";

            if (error.type === "less_than_equal") {
              return `${nombre}: supera el máximo permitido.`;
            }

            if (error.type === "decimal_max_digits") {
              return `${nombre}: excede la cantidad máxima de dígitos permitida.`;
            }

            if (error.type === "decimal_max_places") {
              return `${nombre}: tiene demasiados decimales.`;
            }

            if (error.type === "string_too_long") {
              return `${nombre}: supera la longitud máxima permitida.`;
            }

            if (error.type === "greater_than_equal") {
              return `${nombre}: no puede ser negativo.`;
            }

            return `${nombre}: dato inválido.`;
          });

          setError(mensajes.join(" "));
        } else {
          setError(
            typeof detalle === "string"
              ? detalle
              : "No fue posible registrar el acuerdo. Revisá los datos y los permisos."
          );
        }
      } finally {
        setGuardando(false);
      }
  };

  // =========================================================================
  // DESCARGA DE DOCUMENTO
  // =========================================================================
  const descargarDocumento = async (acuerdoId) => {
    try {
      setGenerandoDoc(acuerdoId);
      setError("");

      // El backend devuelve la URL de descarga directamente
      const respuesta = await consejoEscuelaService.generarDocumentoAcuerdo(acuerdoId);

      if (respuesta && respuesta.urlDescarga) {
        window.open(respuesta.urlDescarga, "_blank");
        setMensaje("Documento oficial descargado exitosamente.");
      } else {
        throw new Error("No se recibió URL de descarga");
      }
    } catch (err) {
      console.error("Error al descargar documento:", err);
      setError("No fue posible descargar el documento del acuerdo.");
    } finally {
      setGenerandoDoc(null);
    }
  };

  // =========================================================================
  // HELPERS DE VISUALIZACIÓN
  // =========================================================================
  const obtenerTipoAcuerdoNombre = (tipoId) => {
    const tipo = tiposAcuerdo.find((t) => t.tipoAcuerdoId === tipoId);
    return tipo?.nombre || tipoId;
  };

  const obtenerTipoHoraNombre = (tipoId) => {
    const tipo = tiposHora.find((t) => t.tipoHoraId === tipoId);
    return tipo ? `${tipo.codigo} - ${tipo.descripcion}` : tipoId;
  };

  const obtenerFecha = (fecha) => {
    if (!fecha) return "—";
    const fechaLocal = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(fechaLocal.getTime()) ? fecha : fechaLocal.toLocaleDateString("es-CR");
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <main className="acuerdos-consejo">
      <header className="acuerdos-encabezado">
        <div>
          <p className="acuerdos-subtitulo">Consejo de Escuela</p>
          <h1>Gestión de acuerdos</h1>
          <p className="acuerdos-descripcion">
            Consulta y registra los acuerdos relacionados con las propuestas de investigación.
          </p>
        </div>

        {esDirectorEscuela && (
          <button
            type="button"
            className="acuerdos-boton-principal"
            onClick={() => {
              setError("");
              setMensaje("");
              setMostrarFormulario((actual) => !actual);
            }}
          >
            {mostrarFormulario ? "Cancelar" : "＋ Nuevo acuerdo"}
          </button>
        )}
      </header>

      {mensaje && (
        <div className="acuerdos-alerta acuerdos-alerta-exito" role="status">{mensaje}</div>
      )}

      {error && (
        <div className="acuerdos-alerta acuerdos-alerta-error" role="alert">{error}</div>
      )}

      {esDirectorEscuela && mostrarFormulario && (
        <section className="acuerdos-panel">
          <h2>Registrar acuerdo</h2>

          <form onSubmit={manejarGuardar}>
            <div className="acuerdos-formulario-grid">
              {/* Propuesta */}
              <label>
                Propuesta *
                <select
                  name="propuestaId"
                  value={formulario.propuestaId}
                  onChange={manejarCambio}
                  required
                  disabled={cargandoPropuestas || propuestas.length === 0}
                >
                  <option value="">
                    {cargandoPropuestas
                      ? "Cargando propuestas..."
                      : propuestas.length === 0
                      ? "No hay propuestas disponibles"
                      : "Seleccione una propuesta"}
                  </option>
                  {propuestas.map((propuesta) => (
                    <option
                      key={propuesta.propuestaId}
                      value={propuesta.propuestaId}
                    >
                      {propuesta.codigoPropuesta
                        ? `${propuesta.codigoPropuesta} - ${propuesta.titulo}`
                        : `${propuesta.propuestaId} - ${propuesta.titulo}`}
                    </option>
                  ))}
                </select>
              </label>

              {/* Tipo de acuerdo */}
              <label>
                Tipo de acuerdo *
                <select
                  name="tipoAcuerdoId"
                  value={formulario.tipoAcuerdoId}
                  onChange={manejarCambio}
                  required
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposAcuerdo.map((tipo) => (
                    <option key={tipo.tipoAcuerdoId} value={tipo.tipoAcuerdoId}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {/* Número de acuerdo */}
              <label>
                Número de acuerdo
                <input
                  type="text"
                  name="numeroAcuerdo"
                  maxLength={50}
                  value={formulario.numeroAcuerdo}
                  onChange={manejarCambio}
                  placeholder="Ej. AC-2026-001"
                />
              </label>

              {/* Fecha */}
              <label>
                Fecha del acuerdo
                <input
                  type="date"
                  name="fechaAcuerdo"
                  value={formulario.fechaAcuerdo}
                  onChange={manejarCambio}
                />
              </label>

              {/* Horas aprobadas */}
              <label>
                Horas aprobadas
                <input
                  type="number"
                  name="horasAprobadas"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formulario.horasAprobadas}
                  onChange={manejarCambio}
                />
              </label>

              {/* Tipo de hora */}
              <label>
                Tipo de hora
                <select
                  name="tipoHoraId"
                  value={formulario.tipoHoraId}
                  onChange={manejarCambio}
                >
                  <option value="">Seleccione tipo de hora</option>
                  {tiposHora.map((tipo) => (
                    <option key={tipo.tipoHoraId} value={tipo.tipoHoraId}>
                      {tipo.codigo} - {tipo.descripcion}
                    </option>
                  ))}
                </select>
              </label>

              {/* Período */}
              <label>
                Período de nombramiento
                <input
                  type="text"
                  name="periodoNombramiento"
                  maxLength={100}
                  value={formulario.periodoNombramiento}
                  onChange={manejarCambio}
                  placeholder="Ej. I Semestre 2027"
                />
              </label>

              {/* Presupuesto */}
              <label>
                Presupuesto aprobado
                <input
                  type="number"
                  name="presupuestoAprobado"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  value={formulario.presupuestoAprobado}
                  onChange={manejarCambio}
                />
              </label>
            </div>

            <div className="acuerdos-formulario-acciones">
              <button
                type="button"
                className="acuerdos-boton-secundario"
                onClick={() => {
                  setFormulario(estadoInicial);
                  setMostrarFormulario(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="acuerdos-boton-principal"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar acuerdo"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* =========================================================================
          LISTADO DE ACUERDOS
          ========================================================================= */}
      <section className="acuerdos-panel">
        <div className="acuerdos-listado-encabezado">
          <div>
            <h2>Acuerdos registrados</h2>
            <p>{acuerdos.length} acuerdo(s)</p>
          </div>

          <button
            type="button"
            className="acuerdos-boton-secundario"
            onClick={cargarAcuerdos}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="acuerdos-estado" role="status">Cargando acuerdos...</p>
        ) : acuerdos.length === 0 ? (
          <p className="acuerdos-estado">No hay acuerdos registrados para mostrar.</p>
        ) : (
          <div className="acuerdos-tabla-contenedor">
            <table className="acuerdos-tabla">
              <caption className="sr-only">Acuerdos registrados por el Consejo de Escuela</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Propuesta</th>
                  <th scope="col">Tipo de acuerdo</th>
                  <th scope="col">Número</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Horas</th>
                  <th scope="col">Tipo Hora</th>
                  <th scope="col">Presupuesto</th>
                  <th scope="col">Documento Oficial</th>
                </tr>
              </thead>

              <tbody>
                {acuerdos.map((acuerdo) => {
                  const id = acuerdo.acuerdoId ?? acuerdo.id ?? "—";
                  const propuesta =
                    acuerdo.propuestaId ??
                    acuerdo.propuesta?.propuestaId ??
                    acuerdo.propuesta?.codigoPropuesta ??
                    "—";
                  const tipo =
                    acuerdo.tipoAcuerdo?.nombre ??
                    acuerdo.tipoAcuerdoNombre ??
                    acuerdo.tipoAcuerdoId ??
                    "—";

                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>{propuesta}</td>
                      <td>{obtenerTipoAcuerdoNombre(acuerdo.tipoAcuerdoId)}</td>
                      <td>{acuerdo.numeroAcuerdo || "—"}</td>
                      <td>{obtenerFecha(acuerdo.fechaAcuerdo)}</td>
                      <td>{acuerdo.horasAprobadas ?? "—"}</td>
                      <td>{obtenerTipoHoraNombre(acuerdo.tipoHoraId)}</td>
                      <td>
                        {acuerdo.presupuestoAprobado == null
                          ? "—"
                          : Number(acuerdo.presupuestoAprobado).toLocaleString("es-CR", {
                              style: "currency",
                              currency: "CRC",
                            })}
                      </td>
                      <td>
                        {acuerdo.rutaArchivo ? (
                          <button
                            type="button"
                            className="acuerdos-boton-accion"
                            onClick={() => descargarDocumento(id)}
                            disabled={generandoDoc === id}
                            title="Descargar documento oficial (Form-07/Form-08)"
                            style={{
                              backgroundColor: "#10b981",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              cursor: generandoDoc === id ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {generandoDoc === id ? "⏳ Descargando..." : "📄 Descargar"}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontStyle: "italic",
                            }}
                          >
                            Documento en proceso...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}