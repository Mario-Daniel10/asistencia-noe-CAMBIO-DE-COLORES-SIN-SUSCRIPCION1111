import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TomarAsistenciaDetalleScreen({ route, navigation }) {
  // Verificar si route.params y planilla existen
  const planilla = route.params?.planilla || {};
  const [asistencias, setAsistencias] = useState({});
  const [fecha] = useState(new Date().toISOString().split("T")[0]);
  const [meses] = useState([
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
  ]);

  useEffect(() => {
    if (planilla && planilla.id) {
      cargarAsistencias();
    } else {
      // Si no hay planilla válida, mostrar alerta y volver atrás
      Alert.alert("Error", "No se pudo cargar la información de la planilla", [
        { text: "Volver", onPress: () => navigation.goBack() },
      ]);
    }
  }, [planilla]);

  const cargarAsistencias = async () => {
    try {
      const asistenciasGuardadas = await AsyncStorage.getItem(
        `asistencias_${planilla.id}`
      );
      if (asistenciasGuardadas) {
        setAsistencias(JSON.parse(asistenciasGuardadas));
      }
    } catch (error) {
      console.error("Error al cargar asistencias:", error);
    }
  };

  const guardarAsistencias = async (nuevasAsistencias) => {
    try {
      await AsyncStorage.setItem(
        `asistencias_${planilla.id}`,
        JSON.stringify(nuevasAsistencias)
      );
    } catch (error) {
      console.error("Error al guardar asistencias:", error);
    }
  };

  const toggleAsistencia = (alumno, fecha) => {
    const nuevasAsistencias = {
      ...asistencias,
      [fecha]: {
        ...(asistencias[fecha] || {}),
        [alumno]: !(asistencias[fecha]?.[alumno] ?? false),
      },
    };
    setAsistencias(nuevasAsistencias);
    guardarAsistencias(nuevasAsistencias);
  };

  const getEstadoAsistencia = (alumno, fecha) => {
    return asistencias[fecha]?.[alumno] ? "P" : "A";
  };

  const getColorEstado = (alumno, fecha) => {
    return asistencias[fecha]?.[alumno] ? "#2ecc71" : "#e74c3c";
  };

  const getDiasDelMes = (mes) => {
    const año = new Date().getFullYear();
    const diasEnMes = new Date(año, mes + 2, 0).getDate();
    return Array.from({ length: diasEnMes }, (_, i) => i + 1);
  };

  // Si no hay planilla válida, mostrar pantalla de carga o error
  if (!planilla || !planilla.id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No se pudo cargar la información de la planilla
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  header: {
    padding: 15,
    backgroundColor: "#3498db",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  tabla: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
  },
  nombreCell: {
    width: 150,
    padding: 10,
    justifyContent: "center",
    backgroundColor: "#34495e",
  },
  mesContainer: {
    flexDirection: "column",
  },
  mesText: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 5,
    backgroundColor: "#3498db",
    color: "white",
    textAlign: "center",
  },
  diasContainer: {
    flexDirection: "row",
  },
  diaCell: {
    width: 40,
    padding: 5,
    alignItems: "center",
    backgroundColor: "#bdc3c7",
  },
  diaText: {
    fontSize: 12,
    color: "#2c3e50",
  },
  alumnoRow: {
    flexDirection: "row",
  },
  alumnoNombre: {
    fontSize: 14,
    color: "white",
  },
  asistenciaCell: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  asistenciaText: {
    fontSize: 14,
    color: "white",
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 18,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#3498db",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
