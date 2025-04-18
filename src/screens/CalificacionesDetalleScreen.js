// src/screens/CalificacionesDetalleScreen.js
import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { PlanillasContext } from "../context/PlanillasContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CloudDataContext } from "../context/CloudDataContext";

const { width } = Dimensions.get("window");

// Constantes para las valoraciones medias
const VALORACIONES = {
  TEA: {
    valor: "TEA",
    color: "#4CAF50",
    descripcion: "Trayectoria Educativa Avanzada",
  },
  TEP: {
    valor: "TEP",
    color: "#2196F3",
    descripcion: "Trayectoria Educativa en Proceso",
  },
  TED: {
    valor: "TED",
    color: "#F44336",
    descripcion: "Trayectoria Educativa en Desarrollo",
  },
};
// Constantes para las columnas fijas
const COLUMNAS_FIJAS = {
  PRIMER_CUATRIMESTRE: [
    {
      id: "intensificacion_marzo",
      nombre: "Intensificación Marzo",
      tipo: "nota",
    },
    {
      id: "valoracion_media_1",
      nombre: "Valoración Media",
      tipo: "valoracion",
    },
    { id: "nota_final_1", nombre: "Nota Final 1° Cuatrimestre", tipo: "nota" },
    {
      id: "intensificacion_invierno",
      nombre: "Intensificación Invierno",
      tipo: "nota",
    },
  ],
  SEGUNDO_CUATRIMESTRE: [
    {
      id: "intensificacion_agosto",
      nombre: "Intensificación Agosto",
      tipo: "nota",
    },
    {
      id: "valoracion_media_2",
      nombre: "Valoración Media",
      tipo: "valoracion",
    },
    { id: "nota_final_2", nombre: "Nota Final 2° Cuatrimestre", tipo: "nota" },
    {
      id: "intensificacion_diciembre",
      nombre: "Intensificación Diciembre",
      tipo: "nota",
    },
  ],
  FINAL: [{ id: "nota_final_anual", nombre: "Nota Final Anual", tipo: "nota" }],
};

export default function CalificacionesDetalleScreen({ route, navigation }) {
  const { planillaId, planillaNombre, planillaCurso, planillaMateria } =
    route.params;
  const { planillas } = useContext(PlanillasContext);
  const { saveCalificacionesToCloud, saveEvaluacionesToCloud } =
    useContext(CloudDataContext);

  const [cuatrimestre, setCuatrimestre] = useState("1");
  const [calificaciones, setCalificaciones] = useState({});
  const [alumnosOrdenados, setAlumnosOrdenados] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionesAdicionales, setEvaluacionesAdicionales] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [evaluacionActual, setEvaluacionActual] = useState(null);
  const [nombreEvaluacion, setNombreEvaluacion] = useState("");
  const [fechaEvaluacion, setFechaEvaluacion] = useState("");
  const [tipoEvaluacion, setTipoEvaluacion] = useState("regular");
  const [planilla, setPlanilla] = useState(null);
  const [valoracionModalVisible, setValoracionModalVisible] = useState(false);
  const [alumnoValoracionActual, setAlumnoValoracionActual] = useState(null);
  const [columnaValoracionActual, setColumnaValoracionActual] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [colorEvaluacion, setColorEvaluacion] = useState("#e3f2fd");

  // Referencias para los ScrollViews sincronizados
  const horizontalScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const nombresScrollRef = useRef(null);
  const headerScrollRef = useRef(null);
  // Efectos
  useEffect(() => {
    const cargarPlanilla = async () => {
      const planillaSeleccionada = planillas.find((p) => p.id === planillaId);
      if (planillaSeleccionada) {
        setPlanilla(planillaSeleccionada);
      }
    };

    cargarPlanilla();
  }, [planillaId, planillas]);

  useEffect(() => {
    if (planilla && planilla.alumnos) {
      const alumnosValidos = planilla.alumnos.filter(
        (nombre) => typeof nombre === "string" && nombre.trim() !== ""
      );

      const alumnosConIndice = alumnosValidos.map((nombre, index) => ({
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
    if (planillaId) {
      cargarCalificaciones();
      cargarEvaluaciones();
      cargarEvaluacionesAdicionales();
    }
  }, [cuatrimestre, planillaId]);

  // Funciones de carga
  const cargarCalificaciones = async () => {
    try {
      const calificacionesGuardadas = await AsyncStorage.getItem(
        `calificaciones_${planillaId}_cuatrimestre${cuatrimestre}`
      );
      if (calificacionesGuardadas) {
        setCalificaciones(JSON.parse(calificacionesGuardadas));
      } else {
        setCalificaciones({});
      }
    } catch (error) {
      console.error("Error al cargar calificaciones:", error);
    }
  };

  const cargarEvaluaciones = async () => {
    try {
      const evaluacionesGuardadas = await AsyncStorage.getItem(
        `evaluaciones_${planillaId}_cuatrimestre${cuatrimestre}`
      );
      if (evaluacionesGuardadas) {
        setEvaluaciones(JSON.parse(evaluacionesGuardadas));
      } else {
        setEvaluaciones([]);
      }
    } catch (error) {
      console.error("Error al cargar evaluaciones:", error);
    }
  };

  const cargarEvaluacionesAdicionales = async () => {
    try {
      const evaluacionesGuardadas = await AsyncStorage.getItem(
        `evaluaciones_adicionales_${planillaId}_cuatrimestre${cuatrimestre}`
      );
      if (evaluacionesGuardadas) {
        setEvaluacionesAdicionales(JSON.parse(evaluacionesGuardadas));
      } else {
        setEvaluacionesAdicionales([]);
      }
    } catch (error) {
      console.error("Error al cargar evaluaciones adicionales:", error);
    }
  };

  // Funciones de guardado y sincronización
  const guardarYSincronizar = async () => {
    try {
      setIsSaving(true);

      await AsyncStorage.setItem(
        `calificaciones_${planillaId}_cuatrimestre${cuatrimestre}`,
        JSON.stringify(calificaciones)
      );

      if (saveCalificacionesToCloud) {
        await saveCalificacionesToCloud(
          planillaId,
          `cuatrimestre${cuatrimestre}`,
          calificaciones
        );
      }

      if (saveEvaluacionesToCloud) {
        await saveEvaluacionesToCloud(
          planillaId,
          `cuatrimestre${cuatrimestre}`,
          evaluaciones
        );

        await saveEvaluacionesToCloud(
          planillaId,
          `adicional_cuatrimestre${cuatrimestre}`,
          evaluacionesAdicionales
        );
      }

      Alert.alert(
        "Éxito",
        "Las calificaciones se guardaron y sincronizaron correctamente"
      );
    } catch (error) {
      console.error("Error al guardar y sincronizar:", error);
      Alert.alert("Error", "No se pudieron guardar las calificaciones");
    } finally {
      setIsSaving(false);
    }
  };
  // Funciones de manejo de evaluaciones
  const guardarEvaluaciones = async (nuevasEvaluaciones) => {
    try {
      await AsyncStorage.setItem(
        `evaluaciones_${planillaId}_cuatrimestre${cuatrimestre}`,
        JSON.stringify(nuevasEvaluaciones)
      );

      if (saveEvaluacionesToCloud) {
        await saveEvaluacionesToCloud(
          planillaId,
          `cuatrimestre${cuatrimestre}`,
          nuevasEvaluaciones
        );
      }

      setEvaluaciones(nuevasEvaluaciones);
    } catch (error) {
      console.error("Error al guardar evaluaciones:", error);
    }
  };

  const guardarEvaluacionesAdicionales = async (nuevasEvaluaciones) => {
    try {
      await AsyncStorage.setItem(
        `evaluaciones_adicionales_${planillaId}_cuatrimestre${cuatrimestre}`,
        JSON.stringify(nuevasEvaluaciones)
      );

      if (saveEvaluacionesToCloud) {
        await saveEvaluacionesToCloud(
          planillaId,
          `adicional_cuatrimestre${cuatrimestre}`,
          nuevasEvaluaciones
        );
      }

      setEvaluacionesAdicionales(nuevasEvaluaciones);
    } catch (error) {
      console.error("Error al guardar evaluaciones adicionales:", error);
    }
  };

  const mostrarSelectorPosicionEvaluacion = () => {
    Alert.alert(
      "Posición de la evaluación",
      "¿Dónde desea agregar la evaluación?",
      [
        {
          text: "Antes de V.media",
          onPress: () => {
            setTipoEvaluacion("regular");
            setEvaluacionActual(null);
            setNombreEvaluacion("");
            setFechaEvaluacion("");
            setColorEvaluacion("#e3f2fd");
            setModalVisible(true);
          },
        },
        {
          text: "Después de V.media",
          onPress: () => {
            setTipoEvaluacion("adicional");
            setEvaluacionActual(null);
            setNombreEvaluacion("");
            setFechaEvaluacion("");
            setColorEvaluacion("#e8f5e9");
            setModalVisible(true);
          },
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]
    );
  };

  const editarEvaluacion = (index, tipo = "regular") => {
    const evaluacionesArray =
      tipo === "regular" ? evaluaciones : evaluacionesAdicionales;
    const evaluacion = evaluacionesArray[index];

    setEvaluacionActual(index);
    setNombreEvaluacion(evaluacion.nombre || "");
    setFechaEvaluacion(evaluacion.fecha || "");
    setColorEvaluacion(
      evaluacion.color || (tipo === "regular" ? "#e3f2fd" : "#e8f5e9")
    );
    setTipoEvaluacion(tipo);
    setModalVisible(true);
  };

  const eliminarEvaluacion = (index, tipo = "regular") => {
    const tipoTexto =
      tipo === "regular" ? "evaluación" : "evaluación adicional";

    Alert.alert(
      `Eliminar ${tipoTexto}`,
      `¿Está seguro de que desea eliminar esta ${tipoTexto}? Se perderán todas las calificaciones asociadas.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          onPress: () => {
            if (tipo === "regular") {
              const nuevasEvaluaciones = [...evaluaciones];
              nuevasEvaluaciones.splice(index, 1);

              const nuevasCalificaciones = { ...calificaciones };
              Object.keys(nuevasCalificaciones).forEach((key) => {
                if (key.includes(`-eval${index}-`)) {
                  delete nuevasCalificaciones[key];
                }
              });

              setCalificaciones(nuevasCalificaciones);
              guardarEvaluaciones(nuevasEvaluaciones);
            } else {
              const nuevasEvaluaciones = [...evaluacionesAdicionales];
              nuevasEvaluaciones.splice(index, 1);

              const nuevasCalificaciones = { ...calificaciones };
              Object.keys(nuevasCalificaciones).forEach((key) => {
                if (key.includes(`-evalAdicional${index}-`)) {
                  delete nuevasCalificaciones[key];
                }
              });

              setCalificaciones(nuevasCalificaciones);
              guardarEvaluacionesAdicionales(nuevasEvaluaciones);
            }
          },
          style: "destructive",
        },
      ]
    );
  };
  const guardarEvaluacion = async () => {
    if (!nombreEvaluacion.trim()) {
      Alert.alert("Error", "El nombre de la evaluación no puede estar vacío");
      return;
    }

    const nuevaEvaluacion = {
      nombre: nombreEvaluacion,
      fecha: fechaEvaluacion,
      color: colorEvaluacion,
    };

    try {
      if (tipoEvaluacion === "regular") {
        let nuevasEvaluaciones;
        if (evaluacionActual !== null) {
          nuevasEvaluaciones = [...evaluaciones];
          nuevasEvaluaciones[evaluacionActual] = nuevaEvaluacion;
        } else {
          nuevasEvaluaciones = [...evaluaciones, nuevaEvaluacion];
        }
        await guardarEvaluaciones(nuevasEvaluaciones);
        if (saveEvaluacionesToCloud) {
          await saveEvaluacionesToCloud(
            planillaId,
            `cuatrimestre${cuatrimestre}`,
            nuevasEvaluaciones
          );
        }
      } else {
        let nuevasEvaluaciones;
        if (evaluacionActual !== null) {
          nuevasEvaluaciones = [...evaluacionesAdicionales];
          nuevasEvaluaciones[evaluacionActual] = nuevaEvaluacion;
        } else {
          nuevasEvaluaciones = [...evaluacionesAdicionales, nuevaEvaluacion];
        }
        await guardarEvaluacionesAdicionales(nuevasEvaluaciones);
        if (saveEvaluacionesToCloud) {
          await saveEvaluacionesToCloud(
            planillaId,
            `adicional_cuatrimestre${cuatrimestre}`,
            nuevasEvaluaciones
          );
        }
      }

      setModalVisible(false);
    } catch (error) {
      console.error("Error al guardar evaluación:", error);
      Alert.alert("Error", "No se pudo guardar la evaluación");
    }
  };

  const actualizarCalificacion = (
    alumnoId,
    evaluacionId,
    valor,
    tipo = "regular"
  ) => {
    if (valor !== "" && (isNaN(valor) || valor < 1 || valor > 10)) {
      return;
    }

    let key;
    if (tipo === "regular") {
      key = `${alumnoId}-eval${evaluacionId}-cuatri${cuatrimestre}`;
    } else if (tipo === "adicional") {
      key = `${alumnoId}-evalAdicional${evaluacionId}-cuatri${cuatrimestre}`;
    } else {
      key = `${tipo}_${alumnoId}`;
    }

    const nuevasCalificaciones = { ...calificaciones };
    nuevasCalificaciones[key] = valor;

    if (tipo === "nota_final_2" && cuatrimestre === "2") {
      calcularNotaFinalAnual(alumnoId, valor, nuevasCalificaciones);
    }

    setCalificaciones(nuevasCalificaciones);
  };

  const calcularNotaFinalAnual = (
    alumnoId,
    notaFinalSegundoCuatrimestre,
    nuevasCalificaciones
  ) => {
    const notaFinalPrimerCuatrimestre = parseFloat(
      nuevasCalificaciones[`nota_final_1_${alumnoId}`] || 0
    );

    const intensificacionMarzo = parseFloat(
      nuevasCalificaciones[`intensificacion_marzo_${alumnoId}`] || 0
    );
    const intensificacionInvierno = parseFloat(
      nuevasCalificaciones[`intensificacion_invierno_${alumnoId}`] || 0
    );
    const intensificacionAgosto = parseFloat(
      nuevasCalificaciones[`intensificacion_agosto_${alumnoId}`] || 0
    );
    const intensificacionDiciembre = parseFloat(
      nuevasCalificaciones[`intensificacion_diciembre_${alumnoId}`] || 0
    );

    const notaFinalSegundo = parseFloat(notaFinalSegundoCuatrimestre || 0);

    let notasValidas = 0;
    let sumaNotas = 0;

    if (notaFinalPrimerCuatrimestre > 0) {
      sumaNotas += notaFinalPrimerCuatrimestre;
      notasValidas++;
    }

    if (notaFinalSegundo > 0) {
      sumaNotas += notaFinalSegundo;
      notasValidas++;
    }

    if (intensificacionMarzo > 0) {
      sumaNotas += intensificacionMarzo;
      notasValidas++;
    }

    if (intensificacionInvierno > 0) {
      sumaNotas += intensificacionInvierno;
      notasValidas++;
    }

    if (intensificacionAgosto > 0) {
      sumaNotas += intensificacionAgosto;
      notasValidas++;
    }

    if (intensificacionDiciembre > 0) {
      sumaNotas += intensificacionDiciembre;
      notasValidas++;
    }

    const notaFinalAnual =
      notasValidas > 0 ? (sumaNotas / notasValidas).toFixed(2) : "";
    nuevasCalificaciones[`nota_final_anual_${alumnoId}`] = notaFinalAnual;
  };

  const abrirSelectorValoracion = (alumnoId, columna) => {
    setAlumnoValoracionActual(alumnoId);
    setColumnaValoracionActual(columna);
    setValoracionModalVisible(true);
  };

  const seleccionarValoracion = (valoracion) => {
    if (alumnoValoracionActual !== null && columnaValoracionActual) {
      const key = `${columnaValoracionActual}_${alumnoValoracionActual}`;
      const nuevasCalificaciones = { ...calificaciones };
      nuevasCalificaciones[key] = valoracion;
      setCalificaciones(nuevasCalificaciones);
    }
    setValoracionModalVisible(false);
  };

  const getColorValoracion = (valoracion) => {
    if (valoracion === "TEA") return VALORACIONES.TEA.color;
    if (valoracion === "TEP") return VALORACIONES.TEP.color;
    if (valoracion === "TED") return VALORACIONES.TED.color;
    return "#FFFFFF";
  };

  const getColumnasFijas = () => {
    return cuatrimestre === "1"
      ? COLUMNAS_FIJAS.PRIMER_CUATRIMESTRE
      : COLUMNAS_FIJAS.SEGUNDO_CUATRIMESTRE;
  };

  const handleHorizontalScroll = (event) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTo({
        x: event.nativeEvent.contentOffset.x,
        animated: false,
      });
    }
  };

  const handleVerticalScroll = (event) => {
    if (nombresScrollRef.current) {
      nombresScrollRef.current.scrollTo({
        y: event.nativeEvent.contentOffset.y,
        animated: false,
      });
    }
  };

  const coloresPredefinidos = [
    "#e3f2fd",
    "#e8f5e9",
    "#fff3e0",
    "#f3e5f5",
    "#ffebee",
    "#e0f7fa",
    "#f1f8e9",
    "#fffde7",
  ];
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#34495e", "#2c3e50"]}
        style={styles.headerCompacto}
      >
        <Text style={styles.headerTextCompacto}>
          {planillaNombre} | {planillaCurso} | {planillaMateria}
        </Text>
      </LinearGradient>

      <View style={styles.cuatrimestreButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.cuatrimestreButton,
            cuatrimestre === "1" && styles.cuatrimestreButtonActive,
          ]}
          onPress={() => setCuatrimestre("1")}
        >
          <Text
            style={[
              styles.cuatrimestreButtonText,
              cuatrimestre === "1" && styles.cuatrimestreButtonTextActive,
            ]}
          >
            Primer Cuatrimestre
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cuatrimestreButton,
            cuatrimestre === "2" && styles.cuatrimestreButtonActive,
          ]}
          onPress={() => setCuatrimestre("2")}
        >
          <Text
            style={[
              styles.cuatrimestreButtonText,
              cuatrimestre === "2" && styles.cuatrimestreButtonTextActive,
            ]}
          >
            Segundo Cuatrimestre
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.botonesContainer}>
        <TouchableOpacity
          style={styles.botonAgregar}
          onPress={mostrarSelectorPosicionEvaluacion}
        >
          <LinearGradient
            colors={["#3498db", "#2980b9"]}
            style={styles.gradientButton}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.textoBoton}>Agregar Evaluación</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.tablaContainer}>
        <View style={styles.headerRow}>
          <View style={[styles.cornerCell, styles.borderRight]}>
            <Text style={styles.textoHeaderNombre}>Alumno</Text>
          </View>

          <ScrollView
            horizontal
            ref={headerScrollRef}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
          >
            <View style={styles.headerContent}>
              <View style={styles.columnasFijas}>
                <View style={[styles.celdaEncabezado, styles.borderRight]}>
                  <Text style={styles.textoEncabezado}>
                    {getColumnasFijas()[0].nombre}
                  </Text>
                </View>

                {evaluaciones.map((evaluacion, index) => (
                  <View
                    key={`eval-${index}`}
                    style={[
                      styles.celdaEncabezado,
                      styles.borderRight,
                      { backgroundColor: evaluacion.color || "#e3f2fd" },
                    ]}
                  >
                    <View style={styles.evaluacionHeader}>
                      <Text style={styles.textoEncabezado}>
                        {evaluacion.nombre || `Evaluación ${index + 1}`}
                      </Text>
                      <View style={styles.evaluacionActions}>
                        <TouchableOpacity
                          onPress={() => editarEvaluacion(index)}
                          style={styles.evaluacionAction}
                        >
                          <Ionicons name="pencil" size={16} color="#301" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => eliminarEvaluacion(index)}
                          style={styles.evaluacionAction}
                        >
                          <Ionicons name="trash" size={16} color="#901" />
                        </TouchableOpacity>
                      </View>
                      {evaluacion.fecha && (
                        <Text style={styles.fechaEvaluacion}>
                          {evaluacion.fecha}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}

                <View style={[styles.celdaEncabezado, styles.borderRight]}>
                  <Text style={styles.textoEncabezado}>
                    {getColumnasFijas()[1].nombre}
                  </Text>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() =>
                      Alert.alert(
                        "Valoraciones",
                        "TEA: Trayectoria Educativa Avanzada (Verde)\nTEP: Trayectoria Educativa en Proceso (Azul)\nTED: Trayectoria Educativa en Desarrollo (Rojo)"
                      )
                    }
                  >
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
                {evaluacionesAdicionales.map((evaluacion, index) => (
                  <View
                    key={`evalAdicional-${index}`}
                    style={[
                      styles.celdaEncabezado,
                      styles.borderRight,
                      { backgroundColor: evaluacion.color || "#e8f5e9" },
                    ]}
                  >
                    <View style={styles.evaluacionHeader}>
                      <Text style={styles.textoEncabezado}>
                        {evaluacion.nombre || `Eval. Adicional ${index + 1}`}
                      </Text>
                      <View style={styles.evaluacionActions}>
                        <TouchableOpacity
                          onPress={() => editarEvaluacion(index, "adicional")}
                          style={styles.evaluacionAction}
                        >
                          <Ionicons name="pencil" size={16} color="#300" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => eliminarEvaluacion(index, "adicional")}
                          style={styles.evaluacionAction}
                        >
                          <Ionicons name="trash" size={16} color="#901" />
                        </TouchableOpacity>
                      </View>
                      {evaluacion.fecha && (
                        <Text style={styles.fechaEvaluacion}>
                          {evaluacion.fecha}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}

                <View style={[styles.celdaEncabezado, styles.borderRight]}>
                  <Text style={styles.textoEncabezado}>
                    {getColumnasFijas()[2].nombre}
                  </Text>
                </View>

                <View style={[styles.celdaEncabezado, styles.borderRight]}>
                  <Text style={styles.textoEncabezado}>
                    {getColumnasFijas()[3].nombre}
                  </Text>
                </View>

                {cuatrimestre === "2" && (
                  <View style={styles.celdaEncabezado}>
                    <Text style={styles.textoEncabezado}>
                      {COLUMNAS_FIJAS.FINAL[0].nombre}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.tableContent}>
          <ScrollView
            ref={nombresScrollRef}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            style={styles.nombresColumn}
          >
            {alumnosOrdenados.map((alumno) => (
              <View
                key={alumno.indiceOriginal}
                style={[styles.celdaAlumno, styles.borderRight]}
              >
                <Text style={styles.textoAlumno} numberOfLines={2}>
                  {alumno.nombre}
                </Text>
              </View>
            ))}
          </ScrollView>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            onScroll={handleHorizontalScroll}
            scrollEventThrottle={16}
            ref={horizontalScrollRef}
          >
            <ScrollView
              onScroll={handleVerticalScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
              ref={verticalScrollRef}
            >
              <View style={styles.tableCells}>
                {alumnosOrdenados.map((alumno) => (
                  <View key={alumno.indiceOriginal} style={styles.filaAlumno}>
                    <View style={[styles.celda, styles.borderRight]}>
                      <TextInput
                        style={styles.input}
                        value={
                          calificaciones[
                            `${getColumnasFijas()[0].id}_${
                              alumno.indiceOriginal
                            }`
                          ] || ""
                        }
                        onChangeText={(text) =>
                          actualizarCalificacion(
                            alumno.indiceOriginal,
                            null,
                            text,
                            getColumnasFijas()[0].id
                          )
                        }
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    {evaluaciones.map((evaluacion, index) => (
                      <View
                        key={`eval-${index}`}
                        style={[
                          styles.celda,
                          styles.borderRight,
                          {
                            backgroundColor: evaluacion.color
                              ? evaluacion.color + "20"
                              : undefined,
                          },
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          value={
                            calificaciones[
                              `${alumno.indiceOriginal}-eval${index}-cuatri${cuatrimestre}`
                            ] || ""
                          }
                          onChangeText={(text) =>
                            actualizarCalificacion(
                              alumno.indiceOriginal,
                              index,
                              text
                            )
                          }
                          keyboardType="numeric"
                          maxLength={4}
                        />
                      </View>
                    ))}

                    <View style={[styles.celda, styles.borderRight]}>
                      <TouchableOpacity
                        style={[
                          styles.celdaValoracion,
                          {
                            backgroundColor: getColorValoracion(
                              calificaciones[
                                `${getColumnasFijas()[1].id}_${
                                  alumno.indiceOriginal
                                }`
                              ]
                            ),
                          },
                        ]}
                        onPress={() =>
                          abrirSelectorValoracion(
                            alumno.indiceOriginal,
                            getColumnasFijas()[1].id
                          )
                        }
                      >
                        <Text style={styles.textoValoracion}>
                          {calificaciones[
                            `${getColumnasFijas()[1].id}_${
                              alumno.indiceOriginal
                            }`
                          ] || ""}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {evaluacionesAdicionales.map((evaluacion, index) => (
                      <View
                        key={`evalAdicional-${index}`}
                        style={[
                          styles.celda,
                          styles.borderRight,
                          {
                            backgroundColor: evaluacion.color
                              ? evaluacion.color + "20"
                              : undefined,
                          },
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          value={
                            calificaciones[
                              `${alumno.indiceOriginal}-evalAdicional${index}-cuatri${cuatrimestre}`
                            ] || ""
                          }
                          onChangeText={(text) =>
                            actualizarCalificacion(
                              alumno.indiceOriginal,
                              index,
                              text,
                              "adicional"
                            )
                          }
                          keyboardType="numeric"
                          maxLength={4}
                        />
                      </View>
                    ))}

                    <View style={[styles.celda, styles.borderRight]}>
                      <TextInput
                        style={styles.input}
                        value={
                          calificaciones[
                            `${getColumnasFijas()[2].id}_${
                              alumno.indiceOriginal
                            }`
                          ] || ""
                        }
                        onChangeText={(text) =>
                          actualizarCalificacion(
                            alumno.indiceOriginal,
                            null,
                            text,
                            getColumnasFijas()[2].id
                          )
                        }
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    <View style={[styles.celda, styles.borderRight]}>
                      <TextInput
                        style={styles.input}
                        value={
                          calificaciones[
                            `${getColumnasFijas()[3].id}_${
                              alumno.indiceOriginal
                            }`
                          ] || ""
                        }
                        onChangeText={(text) =>
                          actualizarCalificacion(
                            alumno.indiceOriginal,
                            null,
                            text,
                            getColumnasFijas()[3].id
                          )
                        }
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    {cuatrimestre === "2" && (
                      <View style={styles.celda}>
                        <TextInput
                          style={[styles.input, styles.inputFinalAnual]}
                          value={
                            calificaciones[
                              `nota_final_anual_${alumno.indiceOriginal}`
                            ] || ""
                          }
                          editable={false}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>

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

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {evaluacionActual !== null
                ? "Editar Evaluación"
                : "Nueva Evaluación"}
            </Text>

            <Text style={styles.modalLabel}>Nombre:</Text>
            <TextInput
              style={styles.modalInput}
              value={nombreEvaluacion}
              onChangeText={setNombreEvaluacion}
              placeholder="Nombre de la evaluación"
            />

            <Text style={styles.modalLabel}>Fecha (opcional):</Text>
            <TextInput
              style={styles.modalInput}
              value={fechaEvaluacion}
              onChangeText={setFechaEvaluacion}
              placeholder="DD/MM/YYYY"
            />

            <Text style={styles.modalLabel}>Color:</Text>
            <View style={styles.colorPickerContainer}>
              {coloresPredefinidos.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    colorEvaluacion === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColorEvaluacion(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={guardarEvaluacion}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={valoracionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setValoracionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Valoración</Text>

            <TouchableOpacity
              style={[
                styles.valoracionOption,
                { backgroundColor: VALORACIONES.TEA.color },
              ]}
              onPress={() => seleccionarValoracion("TEA")}
            >
              <Text style={styles.valoracionText}>
                TEA - {VALORACIONES.TEA.descripcion}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.valoracionOption,
                { backgroundColor: VALORACIONES.TEP.color },
              ]}
              onPress={() => seleccionarValoracion("TEP")}
            >
              <Text style={styles.valoracionText}>
                TEP - {VALORACIONES.TEP.descripcion}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.valoracionOption,
                { backgroundColor: VALORACIONES.TED.color },
              ]}
              onPress={() => seleccionarValoracion("TED")}
            >
              <Text style={styles.valoracionText}>
                TED - {VALORACIONES.TED.descripcion}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.valoracionOption, { backgroundColor: "#fff" }]}
              onPress={() => seleccionarValoracion("")}
            >
              <Text style={[styles.valoracionText, { color: "#000" }]}>
                Borrar valoración
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setValoracionModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cuatrimestreButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ecf0f1",
  },
  cuatrimestreButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: "#bdc3c7",
  },
  cuatrimestreButtonActive: {
    backgroundColor: "#3498db",
  },
  cuatrimestreButtonText: {
    fontWeight: "bold",
    color: "#34495e",
  },
  cuatrimestreButtonTextActive: {
    color: "#fff",
  },
  tablaContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    margin: 5,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#34495e",
    zIndex: 2,
  },
  cornerCell: {
    width: 132,
    height: 70,
    backgroundColor: "#2c3e50",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  celdaEncabezado: {
    width: 100,
    height: 70,
    backgroundColor: "#87CEEB",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  celda: {
    width: 100,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 4,
  },
  celdaAlumno: {
    width: 132,
    height: 70,
    padding: 8,
    justifyContent: "center",
    backgroundColor: "#34495e",
  },
  input: {
    width: "65%",
    height: 40,
    textAlign: "center",
    fontSize: 12,
    color: "#000",
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  textoEncabezado: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
    flexWrap: "wrap",
  },
  textoHeaderNombre: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  textoAlumno: {
    color: "white",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "left",
    width: "100%",
    flexWrap: "wrap",
  },
  headerContent: {
    flexDirection: "row",
  },
  columnasFijas: {
    flexDirection: "row",
  },
  tableContent: {
    flex: 1,
    flexDirection: "row",
  },
  nombresColumn: {
    width: 220,
  },
  tableCells: {
    flexDirection: "column",
  },
  filaAlumno: {
    flexDirection: "row",
    height: 70,
  },
  botonesContainer: {
    padding: 10,
    alignItems: "center",
  },
  botonAgregar: {
    borderRadius: 5,
    overflow: "hidden",
    width: "80%",
    maxWidth: 300,
    marginBottom: 10,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  textoBoton: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#34495e",
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: "#34495e",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ecf0f1",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: "#e74c3c",
  },
  modalSaveButton: {
    backgroundColor: "#2ecc71",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  celdaValoracion: {
    width: "85%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  textoValoracion: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
    flexWrap: "wrap",
  },
  evaluacionHeader: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  evaluacionActions: {
    flexDirection: "row",
    position: "absolute",
    top: -20,
    right: 0,
  },
  evaluacionAction: {
    padding: 3,
  },
  fechaEvaluacion: {
    fontSize: 10,
    color: "#000",
    marginTop: 2,
  },
  inputFinalAnual: {
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
  },
  colorPickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#34495e",
  },
  infoButton: {
    marginLeft: 5,
  },
  valoracionOption: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  valoracionText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 12,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
});
