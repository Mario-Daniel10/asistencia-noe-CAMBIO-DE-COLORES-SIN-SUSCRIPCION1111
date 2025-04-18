// src/screens/PlanillaCalificacionesScreen.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { PlanillasContext } from "../context/PlanillasContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PlanillaCalificacionesScreen = () => {
  const { planillas } = useContext(PlanillasContext);
  const [loading, setLoading] = useState(true);
  const [planillasOrdenadas, setPlanillasOrdenadas] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (planillas && planillas.length > 0) {
      const planillasValidas = planillas.filter(
        (p) => p && p.id && (p.nombre || p.escuela)
      );

      const ordenadas = [...planillasValidas].sort((a, b) => {
        const nombreA = a.nombre || a.escuela;
        const nombreB = b.nombre || b.escuela;
        return nombreA.localeCompare(nombreB);
      });

      setPlanillasOrdenadas(ordenadas);
    } else {
      setPlanillasOrdenadas([]);
    }
    setLoading(false);
  }, [planillas]);
  const handleSeleccionarPlanilla = (planilla) => {
    navigation.navigate("CalificacionesDetalle", {
      planillaId: planilla.id,
      planillaNombre:
        planilla.nombre ||
        `${planilla.escuela} - ${planilla.curso} ${planilla.division}`,
      planillaCurso: planilla.curso + " " + (planilla.division || ""),
      planillaMateria: planilla.materia,
    });
  };

  const exportarCalificaciones = async (planilla) => {
    try {
      setExportLoading(true);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Error",
          "La función de compartir no está disponible en este dispositivo"
        );
        setExportLoading(false);
        return;
      }

      const planillaSeleccionada = planillas.find((p) => p.id === planilla.id);
      if (!planillaSeleccionada) {
        Alert.alert("Error", "No se encontró la planilla seleccionada");
        setExportLoading(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      // Crear hoja de información general
      const infoData = [
        ["PLANILLA DE CALIFICACIONES"],
        [""],
        ["Escuela:", planilla.escuela || ""],
        ["Curso:", planilla.curso || ""],
        ["División:", planilla.division || ""],
        ["Materia:", planilla.materia || ""],
        ["Profesor:", planilla.profesor || ""],
        [
          "Ciclo lectivo:",
          planilla.cicloLectivo || new Date().getFullYear().toString(),
        ],
        [""],
        [
          "Total de alumnos:",
          planillaSeleccionada.alumnos
            ? planillaSeleccionada.alumnos.length
            : 0,
        ],
      ];

      const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
      XLSX.utils.book_append_sheet(wb, infoSheet, "Información");

      // Obtener alumnos ordenados alfabéticamente
      const alumnosValidos = planillaSeleccionada.alumnos.filter(
        (nombre) => typeof nombre === "string" && nombre.trim() !== ""
      );
      const alumnosOrdenados = [...alumnosValidos].sort((a, b) =>
        a.localeCompare(b)
      );

      // Exportar datos de ambos cuatrimestres
      await exportarCuatrimestre(
        wb,
        "1",
        planilla.id,
        alumnosOrdenados,
        "Primer Cuatrimestre"
      );
      await exportarCuatrimestre(
        wb,
        "2",
        planilla.id,
        alumnosOrdenados,
        "Segundo Cuatrimestre"
      );

      // Generar el archivo Excel
      const excelBuffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      const fecha = new Date();
      const nombreArchivo = `Planilla_${planilla.materia}_${planilla.curso}${
        planilla.division || ""
      }_${fecha.getDate()}-${fecha.getMonth() + 1}-${fecha.getFullYear()}.xlsx`;

      const filePath = `${FileSystem.documentDirectory}${nombreArchivo}`;
      await FileSystem.writeAsStringAsync(filePath, excelBuffer, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filePath, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Compartir planilla de calificaciones",
      });

      Alert.alert("Éxito", "La planilla se exportó correctamente");
    } catch (error) {
      console.error("Error al exportar calificaciones:", error);
      Alert.alert("Error", "No se pudo exportar la planilla de calificaciones");
    } finally {
      setExportLoading(false);
    }
  };

  const handleLongPressPlanilla = (planilla) => {
    Alert.alert("Opciones de Planilla", "¿Qué desea hacer con esta planilla?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Exportar Calificaciones",
        onPress: () => exportarCalificaciones(planilla),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#3498db" />
        <Text style={styles.tipText}>
          Mantenga presionada una planilla para exportar sus calificaciones a
          Excel
        </Text>
      </View>

      <Text style={styles.title}>
        Selecciona una planilla para gestionar calificaciones
      </Text>

      {exportLoading && (
        <View style={styles.exportLoadingOverlay}>
          <View style={styles.exportLoadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.exportLoadingText}>Exportando planilla...</Text>
          </View>
        </View>
      )}

      {planillasOrdenadas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay planillas disponibles</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("CrearPlanilla")}
          >
            <LinearGradient
              colors={["#3498db", "#2980b9"]}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>Crear Nueva Planilla</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={planillasOrdenadas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.planillaItem}
              onPress={() => handleSeleccionarPlanilla(item)}
              onLongPress={() => handleLongPressPlanilla(item)}
              delayLongPress={500}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.planillaHeader}
              >
                <Text style={styles.planillaNombre}>
                  {item.nombre ||
                    `${item.escuela} - ${item.curso} ${item.division}`}
                </Text>
              </LinearGradient>
              <View style={styles.planillaInfo}>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Curso: </Text>
                  {item.curso} {item.division || ""}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Materia: </Text>
                  {item.materia}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Alumnos: </Text>
                  {item.alumnos ? item.alumnos.length : 0}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#2c3e50",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#7f8c8d",
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  createButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 16,
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
  planillaNombre: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  planillaInfo: {
    padding: 10,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 3,
    color: "#34495e",
  },
  infoLabel: {
    fontWeight: "bold",
    color: "#2c3e50",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#2c3e50",
    flex: 1,
  },
  exportLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  exportLoadingContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
  },
  exportLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#2c3e50",
  },
});

export default PlanillaCalificacionesScreen;
