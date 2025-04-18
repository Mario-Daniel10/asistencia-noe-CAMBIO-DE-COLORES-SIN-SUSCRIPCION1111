import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  TextInput,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AsistenciaMensualScreen({ route, navigation }) {
  const { planilla, mes, nombreMes } = route.params;
  const [asistencias, setAsistencias] = useState({});
  const [temario, setTemario] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [temaActual, setTemaActual] = useState("");
  const año = new Date().getFullYear();

  const estadosAsistencia = ["P", "A", "SC", "MF", "AJ"];
  const coloresEstados = {
    P: "#2ecc71", // Verde para Presente
    A: "#e74c3c", // Rojo para Ausente
    SC: "#95a5a6", // Gris para Sin Clase
    MF: "#f1c40f", // Amarillo para Media Falta
    AJ: "#3498db", // Azul para Ausente Justificado
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const asistenciasGuardadas = await AsyncStorage.getItem(
        `asistencias_${planilla.id}_${mes}_${año}`
      );
      const temarioGuardado = await AsyncStorage.getItem(
        `temario_${planilla.id}_${mes}_${año}`
      );

      if (asistenciasGuardadas)
        setAsistencias(JSON.parse(asistenciasGuardadas));
      if (temarioGuardado) setTemario(JSON.parse(temarioGuardado));
    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  };

  const guardarDatos = async (nuevasAsistencias, nuevoTemario) => {
    try {
      await AsyncStorage.setItem(
        `asistencias_${planilla.id}_${mes}_${año}`,
        JSON.stringify(nuevasAsistencias)
      );
      await AsyncStorage.setItem(
        `temario_${planilla.id}_${mes}_${año}`,
        JSON.stringify(nuevoTemario)
      );
    } catch (error) {
      console.error("Error al guardar datos:", error);
    }
  };

  const getDiasClase = () => {
    const diasEnMes = new Date(año, mes, 0).getDate();
    const diasClase = [];

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(año, mes - 1, dia);
      const diaSemana = fecha.getDay();
      const nombreDia = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
      ][diaSemana];

      if (planilla.diasSeleccionados.includes(nombreDia)) {
        diasClase.push({
          dia,
          fecha: `${año}-${mes.toString().padStart(2, "0")}-${dia
            .toString()
            .padStart(2, "0")}`,
        });
      }
    }

    return diasClase;
  };

  const toggleAsistencia = (alumno, fecha) => {
    const estadoActual = asistencias[fecha]?.[alumno] || "A";
    const indexActual = estadosAsistencia.indexOf(estadoActual);
    const nuevoEstado =
      estadosAsistencia[(indexActual + 1) % estadosAsistencia.length];

    const nuevasAsistencias = {
      ...asistencias,
      [fecha]: {
        ...(asistencias[fecha] || {}),
        [alumno]: nuevoEstado,
      },
    };

    setAsistencias(nuevasAsistencias);
    guardarDatos(nuevasAsistencias, temario);
  };

  const abrirModalTemario = (fecha) => {
    setSelectedDate(fecha);
    setTemaActual(temario[fecha] || "");
    setModalVisible(true);
  };

  const guardarTemario = () => {
    if (selectedDate) {
      const nuevoTemario = {
        ...temario,
        [selectedDate]: temaActual,
      };
      setTemario(nuevoTemario);
      guardarDatos(asistencias, nuevoTemario);
      setModalVisible(false);
    }
  };

  const calcularEstadisticasAlumno = (alumno) => {
    let presentes = 0;
    let ausentes = 0;
    let total = 0;

    Object.entries(asistencias).forEach(([_, diaAsistencias]) => {
      const estado = diaAsistencias[alumno];
      if (estado === "P") presentes++;
      if (estado === "A" || estado === "AJ") ausentes++;
      if (estado) total++;
    });

    const porcentaje = total > 0 ? (presentes / total) * 100 : 0;

    return {
      presentes,
      ausentes,
      porcentaje: porcentaje.toFixed(2),
    };
  };

  const diasClase = getDiasClase();

  return (
    <ImageBackground
      source={require("../../assets/education-background.png")}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {planilla.materia} - {planilla.curso} {planilla.division}
          </Text>
          <Text style={styles.subHeaderText}>
            {nombreMes} {año}
          </Text>
        </View>

        <ScrollView horizontal={true}>
          <ScrollView>
            <View style={styles.tabla}>
              {/* Encabezado con fechas */}
              <View style={styles.headerRow}>
                <View style={styles.nombreCell}>
                  <Text style={styles.headerText}>Alumnos</Text>
                </View>
                {diasClase.map(({ dia, fecha }) => (
                  <View key={fecha} style={styles.fechaCell}>
                    <Text style={styles.fechaText}>{dia}</Text>
                  </View>
                ))}
                <View style={styles.estadisticaCell}>
                  <Text style={styles.estadisticaText}>P</Text>
                </View>
                <View style={styles.estadisticaCell}>
                  <Text style={styles.estadisticaText}>A</Text>
                </View>
                <View style={styles.estadisticaCell}>
                  <Text style={styles.estadisticaText}>%</Text>
                </View>
              </View>

              {/* Filas de alumnos */}
              {planilla.alumnos.map((alumno, index) => {
                const estadisticas = calcularEstadisticasAlumno(alumno);
                return (
                  <View key={index} style={styles.alumnoRow}>
                    <View style={styles.nombreCell}>
                      <Text style={styles.alumnoNombre}>{alumno}</Text>
                    </View>
                    {diasClase.map(({ fecha }) => (
                      <TouchableOpacity
                        key={fecha}
                        style={[
                          styles.asistenciaCell,
                          {
                            backgroundColor:
                              coloresEstados[
                                asistencias[fecha]?.[alumno] || "A"
                              ],
                          },
                        ]}
                        onPress={() => toggleAsistencia(alumno, fecha)}
                      >
                        <Text style={styles.asistenciaText}>
                          {asistencias[fecha]?.[alumno] || "A"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.estadisticaCell}>
                      <Text style={styles.estadisticaText}>
                        {estadisticas.presentes}
                      </Text>
                    </View>
                    <View style={styles.estadisticaCell}>
                      <Text style={styles.estadisticaText}>
                        {estadisticas.ausentes}
                      </Text>
                    </View>
                    <View style={styles.estadisticaCell}>
                      <Text style={styles.estadisticaText}>
                        {estadisticas.porcentaje}%
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Fila del temario */}
              <View style={styles.temarioRow}>
                <View style={styles.nombreCell}>
                  <Text style={styles.temarioText}>TEMARIO DIGITAL</Text>
                </View>
                {diasClase.map(({ fecha }) => (
                  <TouchableOpacity
                    key={fecha}
                    style={styles.temarioCell}
                    onPress={() => abrirModalTemario(fecha)}
                  >
                    <Text
                      style={[
                        styles.temarioContent,
                        { transform: [{ rotate: "270deg" }] },
                      ]}
                    >
                      {temario[fecha] || ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </ScrollView>

        {/* Modal para el temario */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ingrese el tema del día</Text>
              <TextInput
                style={styles.temaInput}
                multiline
                numberOfLines={4}
                value={temaActual}
                onChangeText={setTemaActual}
                placeholder="Escriba el tema aquí"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.guardarButton]}
                  onPress={guardarTemario}
                >
                  <Text style={styles.modalButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
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
  subHeaderText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    marginTop: 5,
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
  fechaCell: {
    width: 40,
    padding: 5,
    alignItems: "center",
    backgroundColor: "#bdc3c7",
  },
  fechaText: {
    fontSize: 12,
    color: "#2c3e50",
  },
  alumnoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ecf0f1",
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
  estadisticaCell: {
    width: 50,
    padding: 5,
    alignItems: "center",
    backgroundColor: "#95a5a6",
  },
  estadisticaText: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
  },
  temarioRow: {
    flexDirection: "row",
    backgroundColor: "#ecf0f1",
  },
  temarioText: {
    fontSize: 14,
    color: "white",
    fontWeight: "bold",
  },
  temarioCell: {
    width: 40,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bdc3c7",
    backgroundColor: "white",
  },
  temarioContent: {
    fontSize: 10,
    color: "#2c3e50",
    width: 100,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2c3e50",
  },
  temaInput: {
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: "45%",
  },
  cancelButton: {
    backgroundColor: "#95a5a6",
  },
  guardarButton: {
    backgroundColor: "#3498db",
  },
  modalButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});
