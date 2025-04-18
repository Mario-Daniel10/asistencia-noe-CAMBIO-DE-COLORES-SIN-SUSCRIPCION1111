import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from "react-native";

export default function SeleccionMesScreen({ route, navigation }) {
  const { planilla } = route.params;
  const meses = [
    { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" },
    { id: 5, nombre: "Mayo" },
    { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" },
    { id: 8, nombre: "Agosto" },
    { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" },
    { id: 11, nombre: "Noviembre" },
    { id: 12, nombre: "Diciembre" },
  ];

  const seleccionarMes = (mes) => {
    navigation.navigate("AsistenciaMensual", {
      planilla,
      mes: mes.id,
      nombreMes: mes.nombre,
    });
  };

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
          <Text style={styles.subHeaderText}>Seleccione un mes</Text>
        </View>

        <ScrollView contentContainerStyle={styles.mesesContainer}>
          {meses.map((mes) => (
            <TouchableOpacity
              key={mes.id}
              style={styles.mesButton}
              onPress={() => seleccionarMes(mes)}
            >
              <Text style={styles.mesButtonText}>{mes.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    padding: 20,
    backgroundColor: "#3498db",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  subHeaderText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    marginTop: 10,
  },
  mesesContainer: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  mesButton: {
    width: "45%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    margin: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mesButtonText: {
    fontSize: 18,
    color: "#2c3e50",
    textAlign: "center",
    fontWeight: "bold",
  },
});
