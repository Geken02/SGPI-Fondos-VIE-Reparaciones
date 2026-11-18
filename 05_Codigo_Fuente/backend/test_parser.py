"""
test_parser.py
==============
Script de prueba standalone: ejecuta el parser sobre el .docx generado
e imprime un reporte legible de TODOS los datos extraídos.

Uso:
    python test_parser.py
    python test_parser.py ruta/al/otro.docx
"""
import json
import sys
from pathlib import Path

# Añadir el directorio actual al path para importar el parser
sys.path.insert(0, str(Path(__file__).parent))

from src.services.form04_parser import parsear_form04_docx


def main():
    if len(sys.argv) > 1:
        docx_path = sys.argv[1]
    else:
        # Por defecto usa el .docx generado en el proyecto
        default = Path(__file__).parent / "Formulario_Proyecto_PIELS_VIE_2027.docx"
        docx_path = str(default)

    print(f"📄 Procesando: {docx_path}")
    print("=" * 80)

    contenido = Path(docx_path).read_bytes()
    datos = parsear_form04_docx(contenido)

    # -------- Imprimir secciones --------
    print("\n■ DATOS BÁSICOS")
    print(f"  Título:           {datos['titulo']}")
    print(f"  Fecha inicio:     {datos['fecha_inicio']}")
    print(f"  Fecha fin:        {datos['fecha_fin']}")
    print(f"  Modalidad:        {datos['modalidad']}")

    s1 = datos["seccion1"]
    print("\n■ SECCIÓN 1 — PREGUNTAS GENERALES")
    print(f"  1.1 Modalidad:                         {s1['modalidad']}")
    print(f"  1.2 Otras fuentes (Sí):                {s1['otras_fuentes']['aplica']}")
    print(f"  1.3 Vinculación técnica (Sí):          {s1['vinculacion_tecnica']['aplica']}")
    print(f"  1.4 Problemas nacionales (Sí):         {s1['problemas_nacionales']['aplica']}")
    print(f"  1.5 Instrumento jurídico (Sí):         {s1['instrumento_juridico']['aplica']}")
    print(f"      Convenio Nacional:                 {s1['instrumento_juridico']['convenio_nacional']}")
    print(f"      Convenio Internacional:            {s1['instrumento_juridico']['convenio_internacional']}")
    print(f"  1.6 Convenio marco (Sí):               {s1['convenio_marco']['aplica']}")
    print(f"  1.7 Base posgrado:                     {s1['base_posgrado']['aplica']}")
    print(f"  1.8 Info confidencial (Sí):            {s1['info_confidencial']['aplica']}")
    print(f"  1.9 Potencial PI (Sí):                 {s1['potencial_pi']['aplica']}")
    print(f"      Oficio dictamen:                   {s1['potencial_pi']['oficio_dictamen']}")
    print(f"  1.10 Posee innovación (Sí):            {s1['posee_innovacion']['aplica']}")
    print(f"       Tipo innovación:                  {s1['posee_innovacion']['tipo']}")
    print(f"  1.11 TRL esperado:                     {s1['trl']}")

    print("\n■ SECCIÓN 2 — RESUMEN")
    print(f"  Resumen (caracteres):     {len(datos['resumen'])}")
    print(f"  Palabras claves:          {datos['palabras_clave'][:100]}")
    print(f"  Abstract (caracteres):    {len(datos['abstract'])}")
    print(f"  Keywords:                 {datos['keywords'][:100]}")

    print("\n■ SECCIÓN 3 — EQUIPO DE INVESTIGACIÓN")
    print(f"  Investigadores TEC ({len(datos['investigadores_tec'])}):")
    for inv in datos["investigadores_tec"]:
        print(f"    - {inv['nombre']} | ORCID: {inv['orcid']} | Rol: {inv['rol']} | "
              f"Instancia: {inv['instancia']} | Horas: {inv['horas']}")
    print(f"  Colaboradores externos ({len(datos['colaboradores_externos'])}):")
    for col in datos["colaboradores_externos"]:
        print(f"    - {col['nombre_completo']} | ORCID: {col['orcid']} | "
              f"Institución: {col['institucion']}")

    print("\n■ SECCIONES 4-7 (narrativas)")
    print(f"  Problema (caracteres):    {len(datos['problema_investigacion'])}")
    print(f"  Objetivo general:         {datos['objetivo_general'][:100]}")
    print(f"  Objetivos específicos:    {len(datos['objetivos_especificos'])}")
    for oe in datos["objetivos_especificos"]:
        print(f"    {oe['numero']}. {oe['descripcion'][:80]}")
    print(f"  Estado del arte (carac.): {len(datos['estado_arte'])}")
    print(f"  Metodología (carac.):     {len(datos['metodologia'])}")

    print("\n■ SECCIÓN 13 — PRESUPUESTO")
    for p in datos["presupuesto_anual"]:
        print(f"  Año {p['ano']}: operativo ₡{p['operativo']:,.2f} | duradero ₡{p['duradero']:,.2f} | "
              f"total ₡{p['total']:,.2f}")
    print(f"  Monto total del proyecto: ₡{datos['monto_total_proyecto']:,.2f}")

    print("\n■ SECCIÓN 14 — FINANCIAMIENTO EXTERNO")
    fa = datos["financiamiento_adicional"]
    for k in ["externo", "contrapartida", "cofinanciamiento"]:
        e = fa[k]
        print(f"  {k.capitalize():18s}: Año1 ₡{e['ano1']:,.2f} | Año2 ₡{e['ano2']:,.2f} | "
              f"Año3 ₡{e['ano3']:,.2f} | Oficio: '{e['oficio']}'")

    print("\n■ SECCIÓN 15 — COMPROMISOS")
    c = datos["compromisos"]
    print(f"  Horas semanales (básica):    {c['horas_semanales_basica']} (rango: {c['rango_basica']})")
    print(f"  Horas semanales (desarrollo): {c['horas_semanales_desarrollo']} (rango: {c['rango_desarrollo']})")
    print(f"  Productos básica ({len(c['productos_basica'])}):")
    for p in c["productos_basica"]:
        print(f"    ☒ {p['cantidad']} x {p['opcion'][:60]} (Obj: {p['objetivo']})")
    print(f"  Activos PI ({len(c['activos_propiedad_industrial'])}):")
    for a in c["activos_propiedad_industrial"]:
        print(f"    ☒ {a['tipo_activo']} | Consecutivo: {a['consecutivo']}")
    print(f"  Productos desarrollo ({len(c['productos_desarrollo'])}):")
    for p in c["productos_desarrollo"]:
        print(f"    ☒ {p['cantidad']} x {p['opcion'][:60]} (Obj: {p['objetivo']})")
    print(f"  Productos adicionales ({len(c['productos_adicionales'])}):")
    for p in c["productos_adicionales"]:
        print(f"    - {p[:80]}")

    print("\n■ SECCIÓN 16 — RESGUARDO")
    print(f"  Resguardo compromiso: {datos['resguardo']['resguardo_compromiso']}")
    print(f"  Resguardo software:   {datos['resguardo']['resguardo_software']}")

    print("\n■ SECCIÓN 17 — DIVULGACIÓN")
    d = datos["divulgacion"]
    print(f"  Científica (carac.):           {len(d['cientifica'])}")
    print(f"  Canales institucionales (car.): {len(d['canales_institucionales'])}")
    print(f"  Socialización (carac.):        {len(d['socializacion'])}")
    print(f"  Medios masivos (carac.):       {len(d['medios_masivos'])}")

    print("\n■ SECCIÓN 18 — ASPECTOS ÉTICOS")
    ae = datos["aspectos_eticos"]
    print(f"  Seres humanos (Sí):          {ae['seres_humanos']}")
    print(f"  Biodiversidad (Sí):          {ae['biodiversidad']}")
    print(f"  Animales (Sí):               {ae['animales']}")
    print(f"  Comunidades indígenas (Sí):  {ae['comunidades_indigenas']}")
    print(f"  Ente regulatorio:            {ae['ente_regulatorio'] or '(ninguno)'}")
    print(f"  Justificación exención (car.): {len(ae['justificacion_exencion'])}")

    print("\n■ SECCIÓN 19 — HOJA DE RUTA")
    print(f"  Caracteres: {len(datos['hoja_ruta'])}")

    print("\n■ SECCIÓN 20 — REFERENCIAS")
    print(f"  Total referencias: {len(datos['referencias'])}")
    for ref in datos["referencias"]:
        autores_str = "; ".join(ref["autores"][:3]) + (" et al." if len(ref["autores"]) > 3 else "")
        print(f"  [{ref['numero']}] {autores_str}")
        print(f"         Título:  {ref['titulo'][:70]}")
        print(f"         Año:     {ref['anio']} | DOI: {ref['doi'][:60]}")
        print(f"         Revista: {ref['revista_fuente'][:60] or '(no detectada)'}")
        print(f"         Indexada WoS/Scopus (heur.): {ref['es_indexada_wos_scopus']}")

    print("\n■ SECCIÓN 21 — FIRMA")
    f = datos["firma"]
    print(f"  Nombre:           {f['nombre']}")
    print(f"  Cédula:           {f['cedula']}")
    print(f"  Firma digital:    {f['firmado_digital']}")
    print(f"  Fecha firma:      {f['fecha_firma']}")

    # -------- Guardar JSON completo --------
    out_json = Path(docx_path).with_suffix(".parsed.json")
    out_json.write_text(json.dumps(datos, ensure_ascii=False, indent=2))
    print(f"\n💾 JSON completo guardado en: {out_json}")
    print("=" * 80)
    print("✅ Parser ejecutado correctamente.")


if __name__ == "__main__":
    main()
