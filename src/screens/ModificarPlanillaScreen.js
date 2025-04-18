// src/screens/ModificarPlanillaScreen.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { PlanillasContext } from "../context/PlanillasContext";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const ModificarPlanillaScreen = () => {
  const { planillas } = useContext(PlanillasContext);
  const [loading, setLoading] = useState(true);
  const [planillasOrdenadas, setPlanillasOrdenadas] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    if (planillas) {
      const ordenadas = [...planillas].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
      setPlanillasOrdenadas(ordenadas);
      setLoading(false);
    }
  }, [planillas]);

  const handleSeleccionarPlanilla = (planilla) => {
    navigation.navigate("CrearPlanilla", {
      planillaId: planilla.id,
      editar: true,
      planillaData: planilla,
    });
  };

  if (loading) {
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
        <Text style={styles.headerTitle}>Modificar Planillas</Text>
      </LinearGradient>

      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#3498db" />
        <Text style={styles.tipText}>
          Seleccione una planilla para modificar sus datos
        </Text>
      </View>

      {planillasOrdenadas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No hay planillas disponibles</Text>
          <Text style={styles.emptySubtext}>
            Crea tu primera planilla para comenzar
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
        <FlatList
          data={planillasOrdenadas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.planillaItem}
              onPress={() => handleSeleccionarPlanilla(item)}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.planillaHeader}
              >
                <Text style={styles.planillaNombre}>{item.nombre}</Text>
              </LinearGradient>
              <View style={styles.planillaInfo}>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Curso: </Text>
                  {item.curso} {item.division}
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
    backgroundColor: "#f8f9fa",
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
  createButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 8,
  },
  listContent: {
    padding: 10,
    paddingBottom: 80,
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
});

export default ModificarPlanillaScreen;
