"""Verifica que el parser reparado detecta correctamente TODOS los checkboxes."""
import sys, json
sys.path.insert(0, "C:\Proyecto-Reparado\SGPI-Fondos-VIE-Reparaciones")
from src.services.form04_parser import parsear_form04_docx

with open("C:\Proyecto-Reparado\SGPI-Fondos-VIE-Reparaciones/Form04_Proyecto_IoT_Cafe_PRUEBA.docx", "rb") as f:
    datos = parsear_form04_docx(f.read())

# (campo, valor_obtenido, valor_esperado) según el documento de prueba
esperado = [
    ("modalidad", datos["modalidad"], "Investigación Básica y Aplicada"),
    # 1.b → ☑ No  → aplica=False
    ("1.b otras_fuentes.aplica", datos["seccion1"]["otras_fuentes"]["aplica"], False),
    # 1.c → ☑ Sí
    ("1.c vinculacion_tecnica.aplica", datos["seccion1"]["vinculacion_tecnica"]["aplica"], True),
    ("1.c detalle", "FVIE-2025-012" in datos["seccion1"]["vinculacion_tecnica"]["detalle"], True),
    # 1.d → ☑ Sí
    ("1.d problemas_nacionales.aplica", datos["seccion1"]["problemas_nacionales"]["aplica"], True),
    ("1.d detalle", "ODS 6" in datos["seccion1"]["problemas_nacionales"]["detalle"], True),
    # 1.e → ☑ No
    ("1.e instrumento_juridico.aplica", datos["seccion1"]["instrumento_juridico"]["aplica"], False),
    # 1.f → ☑ No
    ("1.f convenio_marco.aplica", datos["seccion1"]["convenio_marco"]["aplica"], False),
    # 1.g → ☑ Sí, parcial
    ("1.g base_posgrado.aplica", datos["seccion1"]["base_posgrado"]["aplica"], "Sí, parcial"),
    ("1.g candidato", datos["seccion1"]["base_posgrado"]["candidato"], "Juan Pérez"),
    ("1.g programa", datos["seccion1"]["base_posgrado"]["programa"], "Maestría en Ingeniería Electrónica"),
    ("1.g universidad", "Instituto Tecnológico de Costa Rica" in datos["seccion1"]["base_posgrado"]["universidad"], True),
    # 1.h → ☑ No
    ("1.h info_confidencial.aplica", datos["seccion1"]["info_confidencial"]["aplica"], False),
    # 1.i → ☑ Sí
    ("1.i potencial_pi.aplica", datos["seccion1"]["potencial_pi"]["aplica"], True),
    ("1.i oficio", datos["seccion1"]["potencial_pi"]["oficio_dictamen"], "CV-DICT-2026-045"),
    # 1.j → ☑ Sí
    ("1.j posee_innovacion.aplica", datos["seccion1"]["posee_innovacion"]["aplica"], True),
    ("1.j tipo", datos["seccion1"]["posee_innovacion"]["tipo"], "de Producto"),
    # 1.k → TRL 3 (☑ en la fila 3, dentro de tabla)
    ("1.k TRL", datos["seccion1"]["trl"], 3),
    # Cuadro 6 → ☑ 11 a 20 horas (tabla)
    ("productos_14a.rango_horas", datos["productos_14a"]["rango_horas"], "11 a 20 horas"),
    # Cuadro 7 → ☑ Opción 1 (cant=1, OE 2) y ☑ Opción 2 (cant=2, OE 3)
    ("productos_14a.opcion1.check", datos["productos_14a"]["opcion1"]["check"], True),
    ("productos_14a.opcion1.cantidad", datos["productos_14a"]["opcion1"]["cantidad"], 1),
    ("productos_14a.opcion1.objetivo", datos["productos_14a"]["opcion1"]["objetivo"], "OE 2"),
    ("productos_14a.opcion2.check", datos["productos_14a"]["opcion2"]["check"], True),
    ("productos_14a.opcion2.cantidad", datos["productos_14a"]["opcion2"]["cantidad"], 2),
    ("productos_14a.opcion2.objetivo", datos["productos_14a"]["opcion2"]["objetivo"], "OE 3"),
    ("productos_14a.opcion3.check", datos["productos_14a"]["opcion3"]["check"], False),
    # Resguardo #1 → ☑ Sí ; #2 → ☑ No
    ("resguardo.resguardo_compromiso", datos["resguardo"]["resguardo_compromiso"], True),
    ("resguardo.resguardo_software", datos["resguardo"]["resguardo_software"], False),
    # Aspectos éticos 1-4 → todos ☑ No
    ("eticos.seres_humanos", datos["aspectos_eticos"]["seres_humanos"], False),
    ("eticos.biodiversidad", datos["aspectos_eticos"]["biodiversidad"], False),
    ("eticos.animales", datos["aspectos_eticos"]["animales"], False),
    ("eticos.comunidades_indigenas", datos["aspectos_eticos"]["comunidades_indigenas"], False),
    ("eticos.acuerdo_comision", "variables edafoclimáticas" in datos["aspectos_eticos"]["acuerdo_comision"], True),
    # Firma → ☑ Firmado con BCCR/GAUDI (tabla)
    ("firma.nombre", datos["firma"]["nombre"], "Gerald Hernández Gamboa"),
    ("firma.cedula", datos["firma"]["cedula"], "1-1111-1111"),
    ("firma.firmado_digital", datos["firma"]["firmado_digital"], True),
]

ok = fail = 0
print("=" * 70)
print("VERIFICACIÓN DE CHECKBOXES — PARSER REPARADO")
print("=" * 70)
for nombre, got, exp in esperado:
    marca = "OK  " if got == exp else "FAIL"
    if got == exp:
        ok += 1
    else:
        fail += 1
    print(f"  [{marca}] {nombre:38s}  got={got!r:45s} esperado={exp!r}")
print("-" * 70)
print(f"Total: {ok} OK / {fail} FAIL de {ok + fail} chequeos")
if fail == 0:
    print("\n>>> TODOS los checkboxes se detectan correctamente. <<<")
