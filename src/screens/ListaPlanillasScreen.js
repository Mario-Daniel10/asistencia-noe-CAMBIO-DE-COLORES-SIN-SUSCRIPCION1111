// src/screens/ListaPlanillasScreen.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { PlanillasContext } from "../context/PlanillasContext";
import { AuthContext } from "../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ListaPlanillasScreen = ({ navigation }) => {
  const { planillas, loading, eliminarPlanilla } = useContext(PlanillasContext);
  const authContext = useContext(AuthContext);
  const user = authContext?.currentUser;

  const [planillasUsuario, setPlanillasUsuario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const cargarPlanillas = async () => {
      if (user && planillas) {
        const misPlanillas = planillas.filter((p) => p.userId === user.uid);
        setPlanillasUsuario(misPlanillas);
      }
      setCargando(false);
    };

    cargarPlanillas();
  }, [planillas, user]);
  const handleEliminarPlanilla = (planilla) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que deseas eliminar la planilla "${planilla.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const resultado = await eliminarPlanilla(planilla.id);
              if (!resultado) {
                Alert.alert("Error", "No se pudo eliminar la planilla");
              }
            } catch (error) {
              console.error("Error al eliminar planilla:", error);
              Alert.alert("Error", "Ocurrió un error al eliminar la planilla");
            }
          },
        },
      ]
    );
  };

  const seleccionarPlanilla = (planilla) => {
    navigation.navigate("TomarAsistencia", { planilla });
  };

  const obtenerNombreMes = (numeroMes) => {
    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return meses[numeroMes];
  };

  const cargarAsistenciasMes = async (planillaId, mes, año) => {
    try {
      const key = `asistencias_${planillaId}_${mes}_${año}`;
      const asistenciasGuardadas = await AsyncStorage.getItem(key);

      if (asistenciasGuardadas) {
        return JSON.parse(asistenciasGuardadas);
      }
      return null;
    } catch (error) {
      console.error(`Error al cargar asistencias del mes ${mes}:`, error);
      return null;
    }
  };

  const ordenarAlumnosAlfabeticamente = (alumnos) => {
    if (!alumnos || alumnos.length === 0) return [];

    const alumnosConIndice = alumnos.map((nombre, index) => ({
      nombre,
      indiceOriginal: index,
    }));

    return [...alumnosConIndice].sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  };
  const exportarPlanillaExcel = async (planilla) => {
    try {
      setExportando(true);
      Alert.alert("Procesando", "Generando archivo Excel de asistencias...");

      if (!planilla.alumnos || planilla.alumnos.length === 0) {
        Alert.alert("Error", "La planilla no tiene alumnos registrados");
        setExportando(false);
        return;
      }

      const alumnosOrdenados = ordenarAlumnosAlfabeticamente(planilla.alumnos);

      console.log("Exportando planilla:", planilla.nombre);
      console.log("Alumnos en la planilla:", planilla.alumnos.length);
      console.log("Alumnos ordenados:", alumnosOrdenados.length);

      const wb = XLSX.utils.book_new();

      // 1. HOJA DE INFORMACIÓN GENERAL
      const infoGeneral = [
        ["PLANILLA DE ASISTENCIAS"],
        [""],
        ["Escuela:", planilla.escuela || ""],
        ["Curso:", `${planilla.curso || ""} ${planilla.division || ""}`],
        ["Materia:", planilla.materia || ""],
        ["Profesor:", planilla.profesor || ""],
        ["Ciclo lectivo:", planilla.cicloLectivo || new Date().getFullYear()],
        ["Total de alumnos:", planilla.alumnos?.length || 0],
        [""],
      ];

      const wsInfo = XLSX.utils.aoa_to_sheet(infoGeneral);

      wsInfo["!cols"] = [{ wch: 15 }, { wch: 40 }];

      XLSX.utils.book_append_sheet(wb, wsInfo, "Información");

      // 2. HOJA DE LISTA DE ALUMNOS
      const headersAlumnos = [
        "Apellido y Nombre",
        "DNI",
        "Legajo",
        "Email",
        "Teléfono",
      ];
      const datosAlumnos = [headersAlumnos];

      alumnosOrdenados.forEach((alumno) => {
        datosAlumnos.push([alumno.nombre || "", "", "", "", ""]);
      });

      const wsAlumnos = XLSX.utils.aoa_to_sheet(datosAlumnos);

      wsAlumnos["!cols"] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, wsAlumnos, "Lista de Alumnos");
      // 3. CARGAR ASISTENCIAS DE TODOS LOS MESES
      const añoActual = new Date().getFullYear();
      const asistenciasPorMes = {};

      for (let mes = 0; mes < 12; mes++) {
        const asistenciasMes = await cargarAsistenciasMes(
          planilla.id,
          mes,
          añoActual
        );
        if (asistenciasMes) {
          asistenciasPorMes[mes] = asistenciasMes;
        }
      }

      console.log(
        "Meses con asistencias:",
        Object.keys(asistenciasPorMes).length
      );

      // 4. CREAR HOJAS POR MES CON DATOS DE ASISTENCIA
      for (let mes = 0; mes < 12; mes++) {
        const asistenciasMes = asistenciasPorMes[mes];
        if (!asistenciasMes) continue;

        const nombreMes = obtenerNombreMes(mes);
        console.log(`Procesando mes: ${nombreMes}`);

        const diasDelMes = [];
        const diasConAsistencia = new Set();

        Object.keys(asistenciasMes).forEach((key) => {
          if (key.includes("-")) {
            const partes = key.split("-");
            if (partes.length === 2 && !isNaN(partes[1])) {
              diasConAsistencia.add(parseInt(partes[1]));
            }
          }
        });

        diasDelMes.push(...Array.from(diasConAsistencia).sort((a, b) => a - b));

        if (diasDelMes.length === 0) {
          console.log(`No hay días con asistencia en ${nombreMes}`);
          continue;
        }

        console.log(`Días con asistencia en ${nombreMes}:`, diasDelMes);

        const headers = ["Apellido y Nombre"];
        diasDelMes.forEach((dia) => {
          headers.push(`${dia}/${mes + 1}`);
        });
        headers.push("Observaciones");

        const datosDelMes = [headers];

        alumnosOrdenados.forEach((alumno) => {
          const fila = [alumno.nombre];

          diasDelMes.forEach((dia) => {
            const key = `${alumno.indiceOriginal}-${dia}`;
            const estado = asistenciasMes[key] || "";
            fila.push(estado);
          });

          const observacionKey = `observacion-${alumno.indiceOriginal}`;
          const observacion = asistenciasMes[observacionKey] || "";
          fila.push(observacion);

          datosDelMes.push(fila);
        });

        const filaTemario = ["TEMARIO"];
        diasDelMes.forEach((dia) => {
          const key = `temario-${dia}`;
          const temario = asistenciasMes[key] || "";
          filaTemario.push(temario);
        });
        filaTemario.push("");
        datosDelMes.push(filaTemario);

        const wsMes = XLSX.utils.aoa_to_sheet(datosDelMes);

        const wscols = [
          { wch: 30 },
          ...diasDelMes.map(() => ({ wch: 8 })),
          { wch: 40 },
        ];
        wsMes["!cols"] = wscols;

        XLSX.utils.book_append_sheet(wb, wsMes, nombreMes);
      }

      // 5. HOJA DE RESUMEN DE ASISTENCIAS
      const headersResumen = [
        "Apellido y Nombre",
        "Presentes",
        "Ausentes",
        "Media Falta",
        "Ausente Just.",
        "Sin Clase",
        "% Asistencia",
      ];

      const datosResumen = [headersResumen];

      alumnosOrdenados.forEach((alumno) => {
        let presentes = 0;
        let ausentes = 0;
        let mediaFalta = 0;
        let ausenteJustificado = 0;
        let sinClase = 0;

        Object.values(asistenciasPorMes).forEach((asistenciasMes) => {
          Object.keys(asistenciasMes).forEach((key) => {
            if (key.startsWith(`${alumno.indiceOriginal}-`)) {
              const estado = asistenciasMes[key];
              switch (estado) {
                case "P":
                  presentes++;
                  break;
                case "A":
                  ausentes++;
                  break;
                case "MF":
                  mediaFalta++;
                  break;
                case "AJ":
                  ausenteJustificado++;
                  break;
                case "SC":
                  sinClase++;
                  break;
              }
            }
          });
        });

        const total = presentes + ausentes + mediaFalta + ausenteJustificado;
        const porcentaje =
          total > 0 ? ((presentes / total) * 100).toFixed(2) : "0.00";

        datosResumen.push([
          alumno.nombre,
          presentes,
          ausentes,
          mediaFalta,
          ausenteJustificado,
          sinClase,
          `${porcentaje}%`,
        ]);
      });

      const wsResumen = XLSX.utils.aoa_to_sheet(datosResumen);

      wsResumen["!cols"] = [
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // 6. HOJA DE OBSERVACIONES
      const headersObservaciones = ["Apellido y Nombre", "Observaciones"];
      const datosObservaciones = [headersObservaciones];

      alumnosOrdenados.forEach((alumno) => {
        let observacionesCompletas = "";

        Object.entries(asistenciasPorMes).forEach(
          ([mesIndex, asistenciasMes]) => {
            const key = `observacion-${alumno.indiceOriginal}`;
            const observacion = asistenciasMes[key];
            if (observacion) {
              if (observacionesCompletas) observacionesCompletas += "\n\n";
              observacionesCompletas += `${obtenerNombreMes(
                parseInt(mesIndex)
              )}: ${observacion}`;
            }
          }
        );

        datosObservaciones.push([alumno.nombre, observacionesCompletas]);
      });

      const wsObservaciones = XLSX.utils.aoa_to_sheet(datosObservaciones);

      wsObservaciones["!cols"] = [{ wch: 30 }, { wch: 60 }];

      XLSX.utils.book_append_sheet(wb, wsObservaciones, "Observaciones");

      // 7. HOJA DE LEYENDA
      const datosLeyenda = [
        ["LEYENDA DE CÓDIGOS DE ASISTENCIA"],
        [""],
        ["Código", "Significado"],
        ["P", "Presente"],
        ["A", "Ausente"],
        ["MF", "Media Falta"],
        ["AJ", "Ausente Justificado"],
        ["SC", "Sin Clase"],
        [""],
      ];

      const wsLeyenda = XLSX.utils.aoa_to_sheet(datosLeyenda);

      wsLeyenda["!cols"] = [{ wch: 15 }, { wch: 30 }];

      XLSX.utils.book_append_sheet(wb, wsLeyenda, "Leyenda");

      const wbout = XLSX.write(wb, {
        type: "base64",
        bookType: "xlsx",
      });

      const fileName = `Asistencias_${planilla.curso || "Curso"}_${
        planilla.division || ""
      }_${(planilla.materia || "Materia").replace(/\s+/g, "_")}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Exportar planilla de asistencias",
          UTI: "org.openxmlformats.spreadsheetml.sheet",
        });

        Alert.alert(
          "Éxito",
          "La planilla de asistencias ha sido exportada correctamente"
        );
      } else {
        Alert.alert(
          "Exportación exitosa",
          `La planilla ha sido guardada como ${fileName}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      Alert.alert("Error", "No se pudo exportar la planilla: " + error.message);
    } finally {
      setExportando(false);
    }
  };

  const handleLongPressPlanilla = (planilla) => {
    Alert.alert("Exportar Planilla", "¿Desea exportar esta planilla a Excel?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Exportar",
        onPress: () => exportarPlanillaExcel(planilla),
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.planillaItem}
      onPress={() => seleccionarPlanilla(item)}
      onLongPress={() => handleLongPressPlanilla(item)}
      delayLongPress={500}
    >
      <LinearGradient
        colors={["#3498db", "#2980b9"]}
        style={styles.planillaHeader}
      >
        <Text style={styles.planillaNombre}>{item.nombre}</Text>
      </LinearGradient>
      <View style={styles.planillaInfo}>
        <Text style={styles.planillaDetalle}>
          <Text style={styles.infoLabel}>Curso: </Text>
          {item.curso} {item.division}
        </Text>
        <Text style={styles.planillaDetalle}>
          <Text style={styles.infoLabel}>Alumnos: </Text>
          {item.alumnos?.length || 0}
        </Text>
      </View>

      <View style={styles.botonesContainer}>
        <TouchableOpacity
          style={[styles.botonAccion, styles.botonEditar]}
          onPress={() =>
            navigation.navigate("CrearPlanilla", {
              editar: true,
              planillaData: item,
            })
          }
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botonAccion, styles.botonEliminar]}
          onPress={() => handleEliminarPlanilla(item)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading || cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando planillas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#3498db", "#2980b9"]}
        style={styles.headerContainer}
      >
        <Text style={styles.headerTitle}>Planillas de Asistencia</Text>
      </LinearGradient>

      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#3498db" />
        <Text style={styles.tipText}>
          Mantenga presionada una planilla para exportar a Excel
        </Text>
      </View>

      {planillasUsuario.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No tienes planillas creadas</Text>
          <Text style={styles.emptySubtext}>
            Crea tu primera planilla para comenzar a registrar asistencias
          </Text>
          <TouchableOpacity
            style={styles.createButtonEmpty}
            onPress={() => navigation.navigate("CrearPlanilla")}
          >
            <LinearGradient
              colors={["#3498db", "#2980b9"]}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Crear Nueva Planilla</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={planillasUsuario}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("CrearPlanilla")}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="add" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Crear Nueva Planilla</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {exportando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Exportando planilla...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#2c3e50",
  },
  headerContainer: {
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 8,
    margin: 10,
    borderRadius: 6,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#2c3e50",
    flex: 1,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  createButtonEmpty: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 20,
    width: "80%",
  },
  planillaItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  planillaHeader: {
    padding: 10,
  },
  planillaInfo: {
    padding: 10,
  },
  planillaNombre: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  planillaDetalle: {
    fontSize: 13,
    marginBottom: 3,
    color: "#34495e",
  },
  infoLabel: {
    fontWeight: "bold",
    color: "#2c3e50",
  },
  botonesContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 8,
    right: 8,
  },
  botonAccion: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  botonEditar: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  botonEliminar: {
    backgroundColor: "rgba(231, 76, 60, 0.8)",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 60,
    left: 20,
    right: 20,
  },
  createButton: {
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonGradient: {
    paddingVertical: 12,
  },
  createButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});

export default ListaPlanillasScreen;
