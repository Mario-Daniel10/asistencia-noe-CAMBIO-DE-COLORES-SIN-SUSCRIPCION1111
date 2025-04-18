// src/screens/CrearPlanillaScreen.js
import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { PlanillasContext } from "../context/PlanillasContext";
import { AuthContext } from "../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CheckBox } from "@rneui/themed";
import { CloudDataContext } from "../context/CloudDataContext";
import { auth } from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CrearPlanillaScreen = ({ route, navigation }) => {
  const { agregarPlanilla, actualizarPlanilla, verificarLimiteGratuito } =
    useContext(PlanillasContext);
  const { savePlanillaToCloud } = useContext(CloudDataContext);
  const authContext = useContext(AuthContext);
  const user = authContext?.currentUser;

  const [limiteSuperado, setLimiteSuperado] = useState(false);
  const [escuela, setEscuela] = useState("");
  const [materia, setMateria] = useState("");
  const [curso, setCurso] = useState("");
  const [division, setDivision] = useState("");
  const [alumnos, setAlumnos] = useState([""]);
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [editando, setEditando] = useState(false);
  const [planillaId, setPlanillaId] = useState(null);

  useEffect(() => {
    const verificarLimite = async () => {
      if (route.params?.editar) {
        setEditando(true);
        return;
      }
      setLimiteSuperado(false);
    };

    verificarLimite();
  }, [route.params, user]);

  const diasSemana = [
    { id: "lunes", label: "Lunes" },
    { id: "martes", label: "Martes" },
    { id: "miércoles", label: "Miércoles" },
    { id: "jueves", label: "Jueves" },
    { id: "viernes", label: "Viernes" },
    { id: "todos", label: "Lun a Vier" },
  ];

  useEffect(() => {
    if (route.params?.editar && route.params?.planillaData) {
      const planilla = route.params.planillaData;
      setEscuela(planilla.escuela || "");
      setMateria(planilla.materia || "");
      setCurso(planilla.curso || "");
      setDivision(planilla.division || "");
      setAlumnos(planilla.alumnos || [""]);

      if (planilla.diasSeleccionados) {
        if (Array.isArray(planilla.diasSeleccionados)) {
          setDiasSeleccionados(planilla.diasSeleccionados);
        } else if (typeof planilla.diasSeleccionados === "string") {
          setDiasSeleccionados(
            planilla.diasSeleccionados
              .split(",")
              .map((d) => d.trim().toLowerCase())
          );
        }
      }

      setEditando(true);
      setPlanillaId(planilla.id);
    }
  }, [route.params]);

  const agregarAlumno = () => {
    setAlumnos([...alumnos, ""]);
  };

  const eliminarAlumno = (index) => {
    if (alumnos.length > 1) {
      const nuevosAlumnos = [...alumnos];
      nuevosAlumnos.splice(index, 1);
      setAlumnos(nuevosAlumnos);
    }
  };

  const actualizarAlumno = (texto, index) => {
    const nuevosAlumnos = [...alumnos];
    nuevosAlumnos[index] = texto;
    setAlumnos(nuevosAlumnos);
  };

  const toggleDia = (dia) => {
    if (dia === "todos") {
      const diasLaborables = [
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
      ];

      const todosDiasSeleccionados = diasLaborables.every((d) =>
        diasSeleccionados.includes(d)
      );

      if (todosDiasSeleccionados) {
        setDiasSeleccionados(
          diasSeleccionados.filter((d) => !diasLaborables.includes(d))
        );
      } else {
        const diasActuales = [...diasSeleccionados];
        diasLaborables.forEach((d) => {
          if (!diasActuales.includes(d)) {
            diasActuales.push(d);
          }
        });
        setDiasSeleccionados(diasActuales);
      }
    } else {
      if (diasSeleccionados.includes(dia)) {
        setDiasSeleccionados(diasSeleccionados.filter((d) => d !== dia));
      } else {
        setDiasSeleccionados([...diasSeleccionados, dia]);
      }
    }
  };

  const validarFormulario = () => {
    if (!escuela.trim()) {
      Alert.alert("Error", "El nombre de la escuela es obligatorio");
      return false;
    }
    if (!materia.trim()) {
      Alert.alert("Error", "La materia es obligatoria");
      return false;
    }
    if (!curso.trim()) {
      Alert.alert("Error", "El curso es obligatorio");
      return false;
    }
    if (!division.trim()) {
      Alert.alert("Error", "La división es obligatoria");
      return false;
    }
    if (diasSeleccionados.length === 0) {
      Alert.alert("Error", "Debe seleccionar al menos un día de clase");
      return false;
    }

    const alumnosVacios = alumnos.filter((alumno) => !alumno.trim());
    if (alumnosVacios.length > 0) {
      Alert.alert("Error", "Todos los alumnos deben tener un nombre");
      return false;
    }

    return true;
  };

  const getUserId = async () => {
    if (auth.currentUser && auth.currentUser.uid) {
      return auth.currentUser.uid;
    }

    if (user && user.uid) {
      return user.uid;
    }

    if (authContext && authContext.currentUser && authContext.currentUser.uid) {
      return authContext.currentUser.uid;
    }

    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.uid) {
          return parsedUser.uid;
        }
      }
    } catch (error) {
      console.error("Error al obtener userId de AsyncStorage:", error);
    }

    return null;
  };

  const handleGuardar = async () => {
    if (!validarFormulario()) return;

    const alumnosLimpios = alumnos
      .filter((alumno) => alumno.trim() !== "")
      .map((alumno) => alumno.trim());

    const userId = await getUserId();

    if (!userId) {
      Alert.alert(
        "Error",
        "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente."
      );
      return;
    }

    const planillaData = {
      escuela: escuela.trim(),
      materia: materia.trim(),
      curso: curso.trim(),
      division: division.trim(),
      alumnos: alumnosLimpios,
      diasSeleccionados,
      fechaCreacion: new Date().toISOString(),
      nombre: `${escuela} - ${curso} ${division} - ${materia}`,
      userId: userId,
    };

    try {
      let resultado;

      if (editando && planillaId) {
        const planillaCompleta = {
          ...planillaData,
          id: planillaId,
          userId: userId,
        };
        resultado = await actualizarPlanilla(planillaCompleta);

        if (planillaCompleta.userId) {
          await savePlanillaToCloud(planillaCompleta);
        }

        if (resultado) {
          Alert.alert("Éxito", "La planilla se ha actualizado correctamente", [
            {
              text: "OK",
              onPress: () => navigation.navigate("Menu"),
            },
          ]);
        }
      } else {
        const id = generateUniqueId();
        const planillaCompleta = {
          ...planillaData,
          id,
          userId: userId,
        };

        resultado = await agregarPlanilla(planillaCompleta);

        if (planillaCompleta.userId) {
          await savePlanillaToCloud(planillaCompleta);
        }

        if (resultado) {
          Alert.alert("Éxito", "La planilla se ha creado correctamente", [
            {
              text: "OK",
              onPress: () => navigation.navigate("Menu"),
            },
          ]);
        }
      }

      if (!resultado) {
        Alert.alert("Error", "No se pudo guardar la planilla");
      }
    } catch (error) {
      console.error("Error al guardar la planilla:", error);
      Alert.alert("Error", "Ocurrió un error al guardar la planilla");
    }
  };

  const generateUniqueId = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const todosDiasSeleccionados = () => {
    const diasLaborables = [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
    ];
    return diasLaborables.every((d) => diasSeleccionados.includes(d));
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <LinearGradient
          colors={["#1a2a6c", "#2d4373"]}
          style={styles.headerContainer}
        >
          <Text style={styles.headerTitle}>
            {editando ? "Modificar Planilla" : "Crear Nueva Planilla"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {editando
              ? "Actualiza los datos de la planilla"
              : "ASISTENCIA // CALIFICACIONES                      Llenar los campos obligatorios"}
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Información General</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de la Escuela:</Text>
            <TextInput
              style={styles.input}
              value={escuela}
              onChangeText={setEscuela}
              placeholder="Ej: Escuela Secundaria N° 5"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Materia:</Text>
            <TextInput
              style={styles.input}
              value={materia}
              onChangeText={setMateria}
              placeholder="Ej: Matemática"
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Curso:</Text>
              <TextInput
                style={styles.input}
                value={curso}
                onChangeText={setCurso}
                placeholder="Ej: 1°"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>División:</Text>
              <TextInput
                style={styles.input}
                value={division}
                onChangeText={setDivision}
                placeholder="Ej: A"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Días de Clase</Text>
          <Text style={styles.sectionSubtitle}>
            Selecciona los días en que se dicta la materia
          </Text>

          <View style={styles.diasContainer}>
            {diasSemana.map((dia) => (
              <CheckBox
                key={dia.id}
                title={dia.label}
                checked={
                  dia.id === "todos"
                    ? todosDiasSeleccionados()
                    : diasSeleccionados.includes(dia.id)
                }
                onPress={() => toggleDia(dia.id)}
                containerStyle={styles.checkboxContainer}
                textStyle={styles.checkboxText}
                checkedColor="#1a2a6c"
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Lista de Alumnos (Apellido y nombre)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Agrega los alumnos que formarán parte de esta planilla
          </Text>

          {alumnos.map((alumno, index) => (
            <View key={index} style={styles.alumnoContainer}>
              <TextInput
                style={styles.alumnoInput}
                value={alumno}
                onChangeText={(text) => actualizarAlumno(text, index)}
                placeholder={`Alumno ${index + 1}`}
              />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => eliminarAlumno(index)}
              >
                <Ionicons name="trash-outline" size={24} color="#2F4F4F" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={agregarAlumno}>
            <Ionicons name="add-circle-outline" size={24} color="#1a2a6c" />
            <Text style={styles.addButtonText}>Agregar Alumno</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <View style={styles.fixedBottomPanel}>
        <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
          <LinearGradient
            colors={["#1a2a6c", "#2d4373"]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {editando ? "Actualizar Planilla" : "Guardar Planilla"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerContainer: {
    padding: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    color: "#1a2a6c",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  diasContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  checkboxContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    marginRight: 10,
    marginBottom: 10,
    width: "45%",
  },
  checkboxText: {
    fontWeight: "normal",
    fontSize: 14,
  },
  alumnoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  alumnoInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginVertical: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  addButtonText: {
    marginLeft: 10,
    color: "#1a2a6c",
    fontSize: 16,
    fontWeight: "500",
  },
  fixedBottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    padding: 15,
    paddingBottom: 25,
  },
  saveButton: {
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 20,
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CrearPlanillaScreen;
