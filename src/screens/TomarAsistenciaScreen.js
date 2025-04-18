// src/screens/TomarAsistenciaScreen.js

import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PlanillasContext } from "../context/PlanillasContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CloudDataContext } from "../context/CloudDataContext";
import { MaterialIcons } from "@expo/vector-icons";

const ESTADOS_ASISTENCIA = ["", "P", "A", "MF", "AJ", "SC"];

const DIAS_SEMANA_ABREV = {
  domingo: "DOM",
  lunes: "LUN",
  martes: "MAR",
  miércoles: "MIE",
  jueves: "JUE",
  viernes: "VIE",
  sábado: "SAB",
};

const { width } = Dimensions.get("window");

export default function TomarAsistenciaScreen({ route, navigation }) {
  const { planilla } = route.params;
  const [mesSeleccionado, setMesSeleccionado] = useState(
    new Date().getMonth().toString()
  );
  const [asistencias, setAsistencias] = useState({});
  const [año, setAño] = useState("2025");
  const { actualizarAsistencias } = useContext(PlanillasContext);
  const { saveAsistenciasToCloud } = useContext(CloudDataContext);
  const [asistenciasAnuales, setAsistenciasAnuales] = useState({});
  const [alumnosOrdenados, setAlumnosOrdenados] = useState([]);
  const [diasDelMes, setDiasDelMes] = useState([]);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSCTime, setLastSCTime] = useState(null);
  const [lastSCDate, setLastSCDate] = useState(null);
  const getScrollContentWidth = () => {
    return {
      flexGrow: 1,
      width: (diasDelMes?.length || 0) * 40, // 40 es el ancho de cada celda
    };
  };
  // Estados para el modal de temario
  const [temarioModalVisible, setTemarioModalVisible] = useState(false);
  const [temarioDiaActual, setTemarioDiaActual] = useState(null);
  const [temarioTexto, setTemarioTexto] = useState("");

  // Referencias para sincronizar el desplazamiento
  const horizontalScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const nombresScrollRef = useRef(null);
  const headerScrollRef = useRef(null);

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

  const años = ["2023", "2024", "2025", "2026"];
  // Estados para el modal de observaciones
  const [observacionesModalVisible, setObservacionesModalVisible] =
    useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [observacionTexto, setObservacionTexto] = useState("");

  // Ordenar alumnos alfabéticamente al cargar la pantalla
  useEffect(() => {
    if (planilla && planilla.alumnos) {
      const alumnosConIndice = planilla.alumnos.map((nombre, index) => ({
        nombre,
        indiceOriginal: index,
      }));

      const ordenados = [...alumnosConIndice].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

      setAlumnosOrdenados(ordenados);
    }
  }, [planilla]);

  useEffect(() => {
    cargarAsistencias();
    cargarAsistenciasAnuales();

    const dias = obtenerDiasMes();
    setDiasDelMes(dias);
  }, [mesSeleccionado, año]);

  const cargarAsistencias = async () => {
    try {
      const mesNum = parseInt(mesSeleccionado);
      const añoNum = parseInt(año);

      const asistenciasGuardadas = await AsyncStorage.getItem(
        `asistencias_${planilla.id}_${mesNum}_${añoNum}`
      );
      if (asistenciasGuardadas) {
        const datosAsistencias = JSON.parse(asistenciasGuardadas);
        setAsistencias(datosAsistencias);

        // Cargar el estado de bloqueo de las fechas
        const bloqueos = {};
        Object.keys(datosAsistencias).forEach((key) => {
          if (key.startsWith("bloqueo-")) {
            const fecha = key.replace("bloqueo-", "");
            bloqueos[fecha] = datosAsistencias[key];
          }
        });
        setFechasBloqueadas(bloqueos);
      } else {
        setAsistencias({});
        setFechasBloqueadas({});
      }
    } catch (error) {
      console.error("Error al cargar asistencias:", error);
    }
  };

  const cargarAsistenciasAnuales = async () => {
    try {
      const añoNum = parseInt(año);
      const asistenciasAnualesObj = {};

      for (let mes = 0; mes < 12; mes++) {
        const asistenciasMes = await AsyncStorage.getItem(
          `asistencias_${planilla.id}_${mes}_${añoNum}`
        );
        if (asistenciasMes) {
          try {
            asistenciasAnualesObj[mes] = JSON.parse(asistenciasMes);
          } catch (e) {
            console.error(`Error al parsear asistencias del mes ${mes}:`, e);
          }
        }
      }

      setAsistenciasAnuales(asistenciasAnualesObj);
    } catch (error) {
      console.error("Error al cargar asistencias anuales:", error);
    }
  };

  const obtenerDiasMes = (mes = parseInt(mesSeleccionado)) => {
    const añoNum = parseInt(año);
    const diasDelMes = [];
    const ultimoDia = new Date(añoNum, mes + 1, 0).getDate();

    if (!planilla.diasSeleccionados) {
      console.error("diasSeleccionados no existe en la planilla");
      return [];
    }

    let diasSeleccionados = planilla.diasSeleccionados;
    if (typeof diasSeleccionados === "string") {
      try {
        diasSeleccionados = JSON.parse(diasSeleccionados);
      } catch (e) {
        diasSeleccionados = diasSeleccionados
          .split(",")
          .map((dia) => dia.trim().toLowerCase());
      }
    }

    if (!Array.isArray(diasSeleccionados)) {
      console.error(
        "No se pudo convertir diasSeleccionados a un array:",
        diasSeleccionados
      );
      return [];
    }

    const diasNormalizados = diasSeleccionados.map((dia) => {
      if (dia === "miércoles") return "miercoles";
      return dia;
    });

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(añoNum, mes, dia);
      let nombreDia = fecha
        .toLocaleDateString("es-ES", { weekday: "long" })
        .toLowerCase();

      if (nombreDia === "miércoles") nombreDia = "miercoles";

      if (diasNormalizados.includes(nombreDia)) {
        let abreviatura = DIAS_SEMANA_ABREV[nombreDia];
        if (nombreDia === "miercoles") abreviatura = "MIE";

        diasDelMes.push({
          numero: dia,
          nombreDia: abreviatura,
        });
      }
    }

    return diasDelMes;
  };

  const toggleAsistencia = (alumnoId, fecha) => {
    if (fechasBloqueadas[fecha]) {
      Alert.alert(
        "Fecha bloqueada",
        "Esta fecha está bloqueada. Desbloquéala primero para hacer cambios."
      );
      return;
    }

    const alumnoIdNum = Number(alumnoId);
    const key = `${alumnoIdNum}-${fecha}`;

    const estadoActual = asistencias[key] || "";
    const index = ESTADOS_ASISTENCIA.indexOf(estadoActual);
    const nuevoEstado =
      ESTADOS_ASISTENCIA[(index + 1) % ESTADOS_ASISTENCIA.length];

    const nuevasAsistencias = { ...asistencias };
    nuevasAsistencias[key] = nuevoEstado;
    setAsistencias(nuevasAsistencias);

    // Si el nuevo estado es SC, guardar el tiempo y la fecha
    if (nuevoEstado === "SC") {
      setLastSCTime(Date.now());
      setLastSCDate(fecha);

      // Esperar 3 segundos y preguntar si quiere aplicar a todos
      setTimeout(() => {
        // Usar una función para obtener el estado más reciente
        const estadoActualizado = nuevasAsistencias[key];
        if (estadoActualizado === "SC") {
          Alert.alert(
            "Aplicar Sin Clase",
            "¿Deseas aplicar 'Sin Clase' a todos los alumnos para esta fecha?",
            [
              {
                text: "No",
                style: "cancel",
              },
              {
                text: "Sí",
                onPress: () => aplicarSCATodos(fecha),
              },
            ]
          );
        }
      }, 3000);
    } else {
      // Si cambia a otro estado, resetear el temporizador
      setLastSCTime(null);
      setLastSCDate(null);
    }
  };

  // Agregar función para bloquear/desbloquear una fecha
  const toggleBloqueoFecha = (fecha) => {
    const nuevasFechasBloqueadas = { ...fechasBloqueadas };
    nuevasFechasBloqueadas[fecha] = !nuevasFechasBloqueadas[fecha];
    setFechasBloqueadas(nuevasFechasBloqueadas);

    // Guardar el estado de bloqueo junto con las asistencias
    const nuevasAsistencias = { ...asistencias };
    nuevasAsistencias[`bloqueo-${fecha}`] = nuevasFechasBloqueadas[fecha];
    setAsistencias(nuevasAsistencias);
  };
  const aplicarSCATodos = (fecha) => {
    const nuevasAsistencias = { ...asistencias };

    alumnosOrdenados.forEach((alumno) => {
      const key = `${alumno.indiceOriginal}-${fecha}`;
      nuevasAsistencias[key] = "SC";
    });

    setAsistencias(nuevasAsistencias);
  };
  const handleTemario = (dia) => {
    const key = `temario-${dia.numero}`;
    const temarioActual = asistencias[key] || "";

    if (Platform.OS === "ios") {
      Alert.prompt(
        "Temario del día",
        `Ingrese el temario para el día ${dia.numero}:`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Guardar",
            onPress: (texto) => {
              const nuevasAsistencias = { ...asistencias };
              nuevasAsistencias[key] = texto || "";
              setAsistencias(nuevasAsistencias);
            },
          },
        ],
        "plain-text",
        temarioActual
      );
    } else {
      setTemarioDiaActual(dia.numero);
      setTemarioTexto(temarioActual);
      setTemarioModalVisible(true);
    }
  };

  const handleObservacionAlumno = (alumno) => {
    const key = `observacion-${alumno.indiceOriginal}`;
    const observacionActual = asistencias[key] || "";

    if (Platform.OS === "ios") {
      Alert.prompt(
        "Observaciones del alumno",
        `Ingrese observaciones para ${alumno.nombre}:`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Guardar",
            onPress: async (texto) => {
              const nuevasAsistencias = { ...asistencias };
              nuevasAsistencias[key] = texto || "";
              setAsistencias(nuevasAsistencias);
              await guardarYSincronizar();
            },
          },
        ],
        "plain-text",
        observacionActual
      );
    } else {
      setAlumnoSeleccionado(alumno);
      setObservacionTexto(observacionActual);
      setObservacionesModalVisible(true);
    }
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case "P":
        return "rgba(46, 204, 113, 0.8)"; // Verde más suave
      case "A":
        return "rgba(231, 76, 60, 0.8)"; // Rojo más suave
      case "SC":
        return "rgba(149, 165, 166, 0.8)"; // Gris más suave
      case "MF":
        return "rgba(241, 196, 15, 0.8)"; // Amarillo más suave
      case "AJ":
        return "rgba(52, 152, 219, 0.8)"; // Azul más suave
      default:
        return "#ffffff"; // Blanco
    }
  };

  const guardarYSincronizar = async () => {
    try {
      setIsSaving(true);
      const mesNum = parseInt(mesSeleccionado);
      const añoNum = parseInt(año);

      // 1. Guardar localmente
      await AsyncStorage.setItem(
        `asistencias_${planilla.id}_${mesNum}_${añoNum}`,
        JSON.stringify(asistencias)
      );

      // 2. Actualizar en el contexto
      if (actualizarAsistencias) {
        actualizarAsistencias(planilla.id, mesNum, añoNum, asistencias);
      }

      // 3. Guardar en la nube (si está disponible)
      let sincronizacionExitosa = false;
      if (saveAsistenciasToCloud) {
        try {
          const resultado = await saveAsistenciasToCloud(
            planilla.id,
            mesNum,
            añoNum,
            asistencias
          );
          if (resultado) {
            sincronizacionExitosa = true;
          }
        } catch (errorSync) {
          console.error("Error al sincronizar con la nube:", errorSync);
        }
      }

      await cargarAsistenciasAnuales();

      // Mostrar mensaje de éxito con información sobre la sincronización
      if (sincronizacionExitosa) {
        Alert.alert(
          "Éxito",
          "La asistencia se guardó correctamente y se sincronizó con la nube"
        );
      } else {
        Alert.alert(
          "Guardado local",
          "La asistencia se guardó localmente, pero no se pudo sincronizar con la nube"
        );
      }
    } catch (error) {
      console.error("Error al guardar asistencias:", error);
      Alert.alert("Error", "No se pudo guardar la asistencia");
    } finally {
      setIsSaving(false);
    }
  };

  const mostrarDiasSeleccionados = () => {
    if (!planilla.diasSeleccionados) return "No hay días seleccionados";

    if (typeof planilla.diasSeleccionados === "string") {
      return planilla.diasSeleccionados;
    }

    if (Array.isArray(planilla.diasSeleccionados)) {
      return planilla.diasSeleccionados.join(", ");
    }

    return JSON.stringify(planilla.diasSeleccionados);
  };

  const renderPickers = () => {
    return (
      <View style={styles.pickerRow}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Mes:</Text>
          <View
            style={Platform.OS === "ios" ? styles.pickerIOSContainer : null}
          >
            <Picker
              selectedValue={mesSeleccionado}
              style={
                Platform.OS === "ios" ? styles.pickerIOS : styles.pickerAndroid
              }
              itemStyle={styles.pickerIOSItem}
              onValueChange={(itemValue) => setMesSeleccionado(itemValue)}
            >
              {meses.map((mes, index) => (
                <Picker.Item key={index} label={mes} value={index.toString()} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Año:</Text>
          <View
            style={Platform.OS === "ios" ? styles.pickerIOSContainer : null}
          >
            <Picker
              selectedValue={año}
              style={
                Platform.OS === "ios" ? styles.pickerIOS : styles.pickerAndroid
              }
              itemStyle={styles.pickerIOSItem}
              onValueChange={(itemValue) => setAño(itemValue)}
            >
              {años.map((a) => (
                <Picker.Item key={a} label={a} value={a} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    );
  };

  // Sincronización de desplazamiento vertical
  const handleVerticalScroll = (event) => {
    if (nombresScrollRef.current) {
      const y = event.nativeEvent.contentOffset.y;
      nombresScrollRef.current.scrollTo({ y, animated: false });
    }
  };

  // Sincronización de desplazamiento horizontal
  const handleHorizontalScroll = (event) => {
    if (headerScrollRef.current) {
      const x = event.nativeEvent.contentOffset.x;
      headerScrollRef.current.scrollTo({ x, animated: false });
    }
  };

  const renderTemarioModal = () => {
    if (!temarioDiaActual) return null;

    return (
      <Modal
        visible={temarioModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTemarioModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Temario del día {temarioDiaActual}
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={temarioTexto}
              onChangeText={setTemarioTexto}
              placeholder="Ingrese el temario para este día"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setTemarioModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  const key = `temario-${temarioDiaActual}`;
                  const nuevasAsistencias = { ...asistencias };
                  nuevasAsistencias[key] = temarioTexto;
                  setAsistencias(nuevasAsistencias);
                  setTemarioModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderObservacionesModal = () => {
    if (!alumnoSeleccionado) return null;

    return (
      <Modal
        visible={observacionesModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setObservacionesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Observaciones de {alumnoSeleccionado.nombre}
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={observacionTexto}
              onChangeText={setObservacionTexto}
              placeholder="Ingrese observaciones sobre este alumno"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setObservacionesModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  const key = `observacion-${alumnoSeleccionado.indiceOriginal}`;
                  const nuevasAsistencias = { ...asistencias };
                  nuevasAsistencias[key] = observacionTexto;
                  setAsistencias(nuevasAsistencias);
                  setObservacionesModalVisible(false);
                  await guardarYSincronizar();
                }}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Verificar si hay días seleccionados
  if (diasDelMes.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#34495e", "#2c3e50"]}
          style={styles.headerCompacto}
        >
          <Text style={styles.headerTextCompacto}>
            {planilla.materia || "Sin materia"} |{" "}
            {planilla.curso || "Sin curso"} {planilla.division || ""}
          </Text>
        </LinearGradient>

        <TouchableOpacity
          style={styles.porcentajesButton}
          onPress={() =>
            navigation.navigate("PorcentajesAsistencia", { planilla })
          }
        >
          <LinearGradient
            colors={["#3498db", "#2980b9"]}
            style={styles.porcentajesGradient}
          >
            <Ionicons name="stats-chart" size={20} color="#fff" />
            <Text style={styles.porcentajesButtonText}>Ver Porcentajes</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.pickerContainer}>{renderPickers()}</View>

        <View style={styles.noDiasContainer}>
          <Ionicons name="calendar-outline" size={60} color="#90A4AE" />
          <Text style={styles.noDiasText}>
            No hay días de clase en este mes según los días seleccionados (
            {mostrarDiasSeleccionados()})
          </Text>
        </View>
      </View>
    );
  }

  // Renderizar la tabla con ScrollView anidados
  return (
    <View style={styles.container}>
      {/* Header compacto */}
      <LinearGradient
        colors={["#34495e", "#2c3e50"]}
        style={styles.headerCompacto}
      >
        <Text style={styles.headerTextCompacto}>
          {planilla.materia || "Sin materia"} | {planilla.curso || "Sin curso"}{" "}
          {planilla.division || ""}
        </Text>
      </LinearGradient>
      {/* Agregar el botón de porcentajes aquí */}
      <TouchableOpacity
        style={styles.porcentajesButton}
        onPress={() =>
          navigation.navigate("PorcentajesAsistencia", { planilla })
        }
      >
        <LinearGradient
          colors={["#3498db", "#2980b9"]}
          style={styles.porcentajesGradient}
        >
          <Ionicons name="stats-chart" size={20} color="#fff" />
          <Text style={styles.porcentajesButtonText}>Ver Porcentajes</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.pickerContainer}>{renderPickers()}</View>

      <View style={styles.tablaContainer}>
        {/* Esquina superior izquierda (fija) */}
        <View style={styles.esquinaFija}>
          <View style={styles.cornerCell}>
            <Text style={styles.textoEncabezado}>Alumno</Text>
          </View>

          {renderTemarioModal()}
          {renderObservacionesModal()}
        </View>

        {/* Encabezados horizontales (fijos en la parte superior) */}
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.headerHorizontal}
          scrollEnabled={false} // Desactivar scroll independiente
          contentContainerStyle={getScrollContentWidth()}
        >
          <View style={styles.headerRow}>
            {/* Días del mes */}
            {diasDelMes.map((dia) => (
              <TouchableOpacity
                key={`header-${dia.numero}`}
                style={styles.celdaDia}
                onPress={() => toggleBloqueoFecha(dia.numero)}
              >
                <MaterialIcons
                  name={fechasBloqueadas[dia.numero] ? "lock" : "lock-open"}
                  size={17}
                  color="#fff"
                  style={styles.candadoIcon}
                />
                <Text style={styles.textoDia}>{dia.nombreDia}</Text>
                <Text style={styles.textoDiaNumero}>{dia.numero}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Columna de nombres de alumnos (fija en el lado izquierdo) */}
        <ScrollView
          ref={nombresScrollRef}
          style={styles.columnaNombres}
          showsVerticalScrollIndicator={false}
        >
          {alumnosOrdenados.map((alumno) => {
            const key = `observacion-${alumno.indiceOriginal}`;
            const tieneObservacion =
              asistencias[key] && asistencias[key].length > 0;

            return (
              <TouchableOpacity
                key={`nombre-${alumno.indiceOriginal}`}
                style={[
                  styles.celdaNombre,
                  tieneObservacion && styles.celdaNombreConObservacion,
                ]}
                onPress={() => handleObservacionAlumno(alumno)}
              >
                <Text style={styles.textoNombre}>{alumno.nombre}</Text>
                {tieneObservacion && (
                  <View style={styles.indicadorObservacion} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Fila de Temario Digital */}
          <View style={styles.celdaTemarioNombre}>
            <Text style={styles.textoTemarioNombre}>TEMARIO DIGITAL</Text>
          </View>
        </ScrollView>

        {/* Contenido principal (desplazable en ambas direcciones) */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.contenidoScrollable}
          onScroll={(event) => {
            handleVerticalScroll(event);
            // Sincronizar el scroll vertical con la columna de nombres
            if (nombresScrollRef.current) {
              const y = event.nativeEvent.contentOffset.y;
              nombresScrollRef.current.scrollTo({ y, animated: false });
            }
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            onScroll={(event) => {
              handleHorizontalScroll(event);
              if (headerScrollRef.current) {
                const x = event.nativeEvent.contentOffset.x;
                headerScrollRef.current.scrollTo({ x, animated: false });
              }
            }}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={getScrollContentWidth()}
          >
            <View>
              {alumnosOrdenados.map((alumno) => {
                return (
                  <View
                    key={`fila-${alumno.indiceOriginal}`}
                    style={styles.fila}
                  >
                    {/* Celdas de asistencia para cada día */}
                    {diasDelMes.map((dia) => {
                      const estado =
                        asistencias[`${alumno.indiceOriginal}-${dia.numero}`] ||
                        "";
                      const temario =
                        asistencias[`temario-${dia.numero}`] || "";
                      const tieneTemario = temario.length > 0;

                      return (
                        <TouchableOpacity
                          key={`celda-${alumno.indiceOriginal}-${dia.numero}`}
                          style={[
                            styles.celda,
                            { backgroundColor: getColorEstado(estado) },
                          ]}
                          onPress={() =>
                            toggleAsistencia(alumno.indiceOriginal, dia.numero)
                          }
                          onLongPress={() => handleTemario(dia)}
                        >
                          <Text style={styles.textoEstado}>{estado}</Text>
                          {tieneTemario && (
                            <View style={styles.indicadorTemario} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}

              {/* Fila de Temario Digital */}
              <View style={styles.filaTemario}>
                {diasDelMes.map((dia) => {
                  const temario = asistencias[`temario-${dia.numero}`] || "";
                  const tieneTemario = temario.length > 0;

                  return (
                    <TouchableOpacity
                      key={`temario-celda-${dia.numero}`}
                      style={[
                        styles.celdaTemario,
                        {
                          backgroundColor: tieneTemario ? "#e3f2fd" : "#ffffff",
                        },
                      ]}
                      onPress={() => handleTemario(dia)}
                    >
                      {tieneTemario ? (
                        <Ionicons
                          name="document-text"
                          size={22}
                          color="#1976D2"
                        />
                      ) : (
                        <Ionicons
                          name="add-circle-outline"
                          size={18}
                          color="#90A4AE"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {/* Botón flotante para guardar */}
      <TouchableOpacity
        style={styles.botonGuardarFloat}
        onPress={guardarYSincronizar}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="save" size={28} color="#fff" />
        )}
      </TouchableOpacity>

      <View style={styles.footerSpace} />
      {/* Modal para editar temario */}
      {renderTemarioModal()}
      {/* Modal para observaciones de alumnos */}
      {renderObservacionesModal()}
      {/* Agregar la firma fija */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    position: "relative",
  },
  headerCompacto: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 40 : 10,
  },
  headerTextCompacto: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  // ... otros estilos existentes ...

  // Agregar estos nuevos estilos
  porcentajesButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 5,
    overflow: "hidden",
  },
  porcentajesGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  porcentajesButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  pickerContainer: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
  },
  pickerAndroid: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
  pickerIOSContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
    height: 40,
    justifyContent: "center",
  },
  pickerIOS: {
    height: 40,
  },
  pickerIOSItem: {
    fontSize: 16,
  },
  tablaContainer: {
    flex: 1,
    position: "relative",
    borderWidth: 1,
    borderColor: "#ecf0f1",
    margin: 5,
    marginBottom: 10,
  },
  esquinaFija: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 50,
    zIndex: 10,
  },
  cornerCell: {
    width: 120,
    height: 50,
    backgroundColor: "#34495e",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ecf0f1",
  },
  textoEncabezado: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },
  headerHorizontal: {
    position: "absolute",
    top: 0,
    left: 120,
    right: 0,
    height: 50,
    zIndex: 5,
  },
  headerRow: {
    flexDirection: "row",
    height: 50,
  },
  columnaNombres: {
    position: "absolute",
    top: 50,
    left: 0,
    width: 120,
    bottom: 0,
    backgroundColor: "#f0f0f0",
    zIndex: 5,
  },

  contenidoScrollable: {
    position: "absolute",
    top: 50,
    left: 120,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  fila: {
    flexDirection: "row",
    height: 40,
  },
  filaTemario: {
    flexDirection: "row",
    height: 40,
    marginTop: 5,
  },
  celda: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ecf0f1",
    position: "relative",
  },
  celdaTemario: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  celdaDia: {
    width: 40,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#34495e",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ecf0f1",
    position: "relative",
  },
  celdaNombre: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ecf0f1",
    backgroundColor: "#34495e",
  },
  celdaTemarioNombre: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ecf0f1",
    backgroundColor: "#3498db",
    marginTop: 5,
  },

  textoNombre: {
    fontSize: 12,
    color: "#fff",
  },
  textoTemarioNombre: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  textoDia: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  textoDiaNumero: {
    color: "#fff",
    fontSize: 10,
  },
  textoEstado: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#fff",
  },

  indicadorTemario: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2ecc71",
  },

  botonGuardarFloat: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2ecc71",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },

  noDiasContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noDiasText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  saveButton: {
    backgroundColor: "#2ecc71",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  candadoContainer: {
    position: "absolute",
    top: 2,
    right: 2,
    padding: 2,
  },
  candadoIcon: {
    marginBottom: -4,
  },

  celdaNombreConObservacion: {
    backgroundColor: "#3a6186", // Un tono más claro para indicar que tiene observaciones
  },
  indicadorObservacion: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2ecc71",
  },
});
