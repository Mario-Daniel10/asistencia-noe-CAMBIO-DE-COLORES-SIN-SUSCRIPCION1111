// src/screens/PorcentajesAsistenciaScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

const DIAS_SEMANA_ABREV = {
  domingo: "DOM",
  lunes: "LUN",
  martes: "MAR",
  miércoles: "MIE",
  jueves: "JUE",
  viernes: "VIE",
  sábado: "SAB",
};

const MESES = [
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
  "ANUAL",
];

export default function PorcentajesAsistenciaScreen({ route }) {
  const { planilla } = route.params;
  const [asistencias, setAsistencias] = useState({});
  const [asistenciasAnuales, setAsistenciasAnuales] = useState({});
  const [alumnosOrdenados, setAlumnosOrdenados] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [año] = useState(new Date().getFullYear().toString());
  const [verAnual, setVerAnual] = useState(false);

  // Referencias para sincronizar el scroll
  const horizontalScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const nombresScrollRef = useRef(null);
  const headerScrollRef = useRef(null);

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
    cargarAsistencias();
    cargarAsistenciasAnuales();
  }, [planilla, mesSeleccionado, verAnual]);

  const cargarAsistencias = async () => {
    try {
      if (!verAnual) {
        const asistenciasGuardadas = await AsyncStorage.getItem(
          `asistencias_${planilla.id}_${mesSeleccionado}_${año}`
        );
        if (asistenciasGuardadas) {
          setAsistencias(JSON.parse(asistenciasGuardadas));
        } else {
          setAsistencias({});
        }
      }
    } catch (error) {
      console.error("Error al cargar asistencias:", error);
    }
  };

  const cargarAsistenciasAnuales = async () => {
    try {
      const asistenciasAnualesObj = {};
      for (let mes = 0; mes < 12; mes++) {
        const asistenciasMes = await AsyncStorage.getItem(
          `asistencias_${planilla.id}_${mes}_${año}`
        );
        if (asistenciasMes) {
          asistenciasAnualesObj[mes] = JSON.parse(asistenciasMes);
        }
      }
      setAsistenciasAnuales(asistenciasAnualesObj);
    } catch (error) {
      console.error("Error al cargar asistencias anuales:", error);
    }
  };

  const handleMesChange = (value) => {
    if (value === 12) {
      setVerAnual(true);
    } else {
      setVerAnual(false);
      setMesSeleccionado(value);
    }
  };

  const obtenerDiasMesParaEstadisticas = (mes) => {
    const añoNum = parseInt(año);
    const diasDelMes = [];
    const ultimoDia = new Date(añoNum, mes + 1, 0).getDate();

    if (!planilla.diasSeleccionados) return [];

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

    if (!Array.isArray(diasSeleccionados)) return [];

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

  const calcularEstadisticasMensuales = (alumnoIndex) => {
    let presentes = 0;
    let ausentes = 0;
    let sinClase = 0;
    let mediaFalta = 0;
    let ausenteJustificado = 0;
    let total = 0;

    const diasDelMes = obtenerDiasMesParaEstadisticas(mesSeleccionado);

    diasDelMes.forEach((dia) => {
      const estado = asistencias[`${alumnoIndex}-${dia.numero}`] || "";
      switch (estado) {
        case "P":
          presentes++;
          break;
        case "A":
          ausentes++;
          break;
        case "SC":
          sinClase++;
          break;
        case "MF":
          mediaFalta++;
          break;
        case "AJ":
          ausenteJustificado++;
          break;
      }
      if (estado !== "SC") total++;
    });

    const porcentajeMensual =
      total > 0 ? ((presentes / total) * 100).toFixed(1) : "0.0";

    return {
      presentes,
      ausentes,
      sinClase,
      mediaFalta,
      ausenteJustificado,
      porcentajeMensual,
    };
  };

  const calcularEstadisticasAnuales = (alumnoIndex) => {
    let presentesTotal = 0;
    let ausentesTotal = 0;
    let mediaFaltaTotal = 0;
    let ausenteJustificadoTotal = 0;
    let sinClaseTotal = 0;
    let totalClases = 0;

    Object.keys(asistenciasAnuales).forEach((mes) => {
      const mesNum = parseInt(mes);
      const asistenciasMes = asistenciasAnuales[mes];
      if (!asistenciasMes) return;

      const diasMes = obtenerDiasMesParaEstadisticas(mesNum);

      diasMes.forEach((dia) => {
        const key = `${alumnoIndex}-${dia.numero}`;
        const estado = asistenciasMes[key] || "";

        switch (estado) {
          case "P":
            presentesTotal++;
            break;
          case "A":
            ausentesTotal++;
            break;
          case "SC":
            sinClaseTotal++;
            break;
          case "MF":
            mediaFaltaTotal++;
            break;
          case "AJ":
            ausenteJustificadoTotal++;
            break;
        }

        if (estado !== "SC") totalClases++;
      });
    });

    const porcentajeAnual =
      totalClases > 0
        ? ((presentesTotal / totalClases) * 100).toFixed(1)
        : "0.0";

    return {
      presentes: presentesTotal,
      ausentes: ausentesTotal,
      sinClase: sinClaseTotal,
      mediaFalta: mediaFaltaTotal,
      ausenteJustificado: ausenteJustificadoTotal,
      porcentajeAnual,
    };
  };

  // Sincronización de scroll vertical
  const handleVerticalScroll = (event) => {
    if (nombresScrollRef.current) {
      const y = event.nativeEvent.contentOffset.y;
      nombresScrollRef.current.scrollTo({ y, animated: false });
    }
  };

  // Sincronización de scroll horizontal
  const handleHorizontalScroll = (event) => {
    if (headerScrollRef.current) {
      const x = event.nativeEvent.contentOffset.x;
      headerScrollRef.current.scrollTo({ x, animated: false });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#34495e", "#2c3e50"]}
        style={styles.headerCompacto}
      >
        <Text style={styles.headerTextCompacto}>
          Porcentajes de Asistencia - {planilla.materia}
        </Text>
      </LinearGradient>

      <View style={styles.selectorContainer}>
        <Picker
          selectedValue={verAnual ? 12 : mesSeleccionado}
          style={styles.picker}
          onValueChange={handleMesChange}
        >
          {MESES.map((mes, index) => (
            <Picker.Item key={index} label={mes} value={index} />
          ))}
        </Picker>
      </View>

      <View style={styles.tablaContainer}>
        {/* Esquina superior izquierda (fija) */}
        <View style={styles.esquinaFija}>
          <View style={styles.cornerCell}>
            <Text style={styles.textoHeaderNombre}>Alumno</Text>
          </View>
        </View>

        {/* Encabezados horizontales (fijos en la parte superior) */}
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.headerHorizontal}
          scrollEnabled={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.seccionEstadisticas}>
              <Text style={styles.textoHeaderEstadisticas}>
                {verAnual ? "ANUAL" : MESES[mesSeleccionado]}
              </Text>
              <View style={styles.filaEstadisticas}>
                <View style={[styles.celdaEstadistica, styles.borderRight]}>
                  <Text style={styles.textoHeaderEstadistica}>P</Text>
                </View>
                <View style={[styles.celdaEstadistica, styles.borderRight]}>
                  <Text style={styles.textoHeaderEstadistica}>A</Text>
                </View>
                <View style={[styles.celdaEstadistica, styles.borderRight]}>
                  <Text style={styles.textoHeaderEstadistica}>MF</Text>
                </View>
                <View style={[styles.celdaEstadistica, styles.borderRight]}>
                  <Text style={styles.textoHeaderEstadistica}>AJ</Text>
                </View>
                <View style={[styles.celdaEstadistica, styles.borderRight]}>
                  <Text style={styles.textoHeaderEstadistica}>SC</Text>
                </View>
                <View
                  style={[styles.celdaPorcentajeHeader, styles.borderRight]}
                >
                  <Text style={styles.textoHeaderPorcentaje}>%M</Text>
                </View>
                <View style={styles.celdaPorcentajeHeader}>
                  <Text style={styles.textoHeaderPorcentaje}>%A</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Columna de nombres de alumnos (fija en el lado izquierdo) */}
        <ScrollView
          ref={nombresScrollRef}
          style={styles.columnaNombres}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {alumnosOrdenados.map((alumno) => (
            <View
              key={`nombre-${alumno.indiceOriginal}`}
              style={[styles.celdaNombre, styles.borderRight]}
            >
              <Text style={styles.textoNombre}>{alumno.nombre}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Contenido principal (desplazable en ambas direcciones) */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.contenidoScrollable}
          onScroll={handleVerticalScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            onScroll={handleHorizontalScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            <View>
              {alumnosOrdenados.map((alumno) => {
                const estadisticasMensuales = calcularEstadisticasMensuales(
                  alumno.indiceOriginal
                );
                const estadisticasAnuales = calcularEstadisticasAnuales(
                  alumno.indiceOriginal
                );

                return (
                  <View key={alumno.indiceOriginal} style={styles.fila}>
                    <View style={styles.filaEstadisticas}>
                      <View
                        style={[styles.celdaEstadistica, styles.borderRight]}
                      >
                        <Text style={styles.textoEstadistica}>
                          {verAnual
                            ? estadisticasAnuales.presentes
                            : estadisticasMensuales.presentes}
                        </Text>
                      </View>
                      <View
                        style={[styles.celdaEstadistica, styles.borderRight]}
                      >
                        <Text style={styles.textoEstadistica}>
                          {verAnual
                            ? estadisticasAnuales.ausentes
                            : estadisticasMensuales.ausentes}
                        </Text>
                      </View>
                      <View
                        style={[styles.celdaEstadistica, styles.borderRight]}
                      >
                        <Text style={styles.textoEstadistica}>
                          {verAnual
                            ? estadisticasAnuales.mediaFalta
                            : estadisticasMensuales.mediaFalta}
                        </Text>
                      </View>
                      <View
                        style={[styles.celdaEstadistica, styles.borderRight]}
                      >
                        <Text style={styles.textoEstadistica}>
                          {verAnual
                            ? estadisticasAnuales.ausenteJustificado
                            : estadisticasMensuales.ausenteJustificado}
                        </Text>
                      </View>
                      <View
                        style={[styles.celdaEstadistica, styles.borderRight]}
                      >
                        <Text style={styles.textoEstadistica}>
                          {verAnual
                            ? estadisticasAnuales.sinClase
                            : estadisticasMensuales.sinClase}
                        </Text>
                      </View>
                      <View
                        style={[styles.celdaPorcentaje, styles.borderRight]}
                      >
                        <Text
                          style={[
                            styles.textoPorcentaje,
                            {
                              color:
                                parseFloat(
                                  estadisticasMensuales.porcentajeMensual
                                ) >= 75
                                  ? "#27ae60"
                                  : "#e74c3c",
                            },
                          ]}
                        >
                          {estadisticasMensuales.porcentajeMensual}%
                        </Text>
                      </View>
                      <View style={styles.celdaPorcentaje}>
                        <Text
                          style={[
                            styles.textoPorcentaje,
                            {
                              color:
                                parseFloat(
                                  estadisticasAnuales.porcentajeAnual
                                ) >= 75
                                  ? "#27ae60"
                                  : "#e74c3c",
                            },
                          ]}
                        >
                          {estadisticasAnuales.porcentajeAnual}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  selectorContainer: {
    backgroundColor: "white",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  tablaContainer: {
    flex: 1,
    position: "relative",
  },
  esquinaFija: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 55,
    zIndex: 10,
    backgroundColor: "#34495e",
  },
  cornerCell: {
    width: 120,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  headerHorizontal: {
    position: "absolute",
    top: 0,
    left: 120,
    right: 0,
    height: 55,
    zIndex: 5,
  },
  headerRow: {
    flexDirection: "row",
    height: 70,
    backgroundColor: "#34495e",
  },
  columnaNombres: {
    position: "absolute",
    top: 50,
    left: 0,
    width: 120,
    bottom: 0,
    backgroundColor: "#34495e",
    zIndex: 5,
  },
  contenidoScrollable: {
    position: "absolute",
    top: 50,
    left: 120,
    right: 0,
    bottom: 0,
  },
  fila: {
    height: 40,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  celdaNombre: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#34495e",
    borderBottomWidth: 1, // Agrega esta línea
    borderBottomColor: "#666",
  },
  seccionEstadisticas: {
    paddingHorizontal: 10,
  },
  filaEstadisticas: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
  },
  celdaEstadistica: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  celdaPorcentaje: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34495e",
    borderRadius: 4,
    marginHorizontal: 2,
    height: 30,
  },
  celdaPorcentajeHeader: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c3e50",
    borderRadius: 4,
    marginHorizontal: 2,
    height: 30,
  },
  textoHeaderNombre: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  textoHeaderEstadisticas: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 5,
  },
  textoHeaderEstadistica: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  textoHeaderPorcentaje: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  textoNombre: {
    fontSize: 14,
    color: "white",
  },
  textoEstadistica: {
    fontSize: 14,
    color: "#666",
  },
  textoPorcentaje: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
});
