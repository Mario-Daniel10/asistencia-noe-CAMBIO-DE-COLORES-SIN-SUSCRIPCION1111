// src/screens/MenuScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import FloatingLogo from "../components/FloatingLogo";
import { auth } from "../config/firebase";
import { signOut } from "firebase/auth";
import { CloudDataContext } from "../context/CloudDataContext"; // Importar el contexto

export default function MenuScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const { syncDataToCloud, loadDataFromCloud, isSyncing } =
    useContext(CloudDataContext); // Usar el contexto

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem("username");
        if (storedUsername) {
          setUsername(storedUsername);
        }
      } catch (error) {
        console.error("Error al cargar el nombre de usuario:", error);
      }
    };

    loadUsername();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Cerrar Sesión", "¿Está seguro que desea cerrar sesión?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Cerrar Sesión",
        onPress: async () => {
          try {
            await signOut(auth);
            await AsyncStorage.removeItem("isLoggedIn");
            await AsyncStorage.removeItem("username");
            await AsyncStorage.removeItem("userId");
            navigation.replace("Login");
          } catch (error) {
            console.error("Error al cerrar sesión:", error);
          }
        },
      },
    ]);
  };

  // Función para sincronizar datos
  const handleSync = () => {
    Alert.alert("Sincronizar Datos", "¿Qué acción desea realizar?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Subir a la nube",
        onPress: async () => {
          try {
            const resultado = await syncDataToCloud();
            if (resultado) {
              Alert.alert("Éxito", "Datos subidos a la nube correctamente");
            } else {
              Alert.alert("Aviso", "No se pudieron subir todos los datos");
            }
          } catch (error) {
            console.error("Error al sincronizar datos:", error);
            Alert.alert(
              "Error",
              "No se pudieron subir los datos: " + error.message
            );
          }
        },
      },
      {
        text: "Descargar de la nube",
        onPress: async () => {
          try {
            const resultado = await loadDataFromCloud();
            if (resultado) {
              Alert.alert(
                "Éxito",
                "Datos descargados de la nube correctamente. Las planillas están disponibles ahora."
              );
            } else {
              Alert.alert(
                "Aviso",
                "No se encontraron datos en la nube o no se pudieron cargar completamente"
              );
            }
          } catch (error) {
            console.error("Error al cargar datos:", error);
            Alert.alert(
              "Error",
              "No se pudieron descargar los datos: " + error.message
            );
          }
        },
      },
    ]);
  };

  return (
    <ImageBackground
      source={require("../../assets/education-background.png")}
      style={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <FloatingLogo size={110} style={styles.logo} />
          <Text style={styles.welcomeText}>
            Bienvenido, {username || "Docente"}
          </Text>
        </View>

        <View style={styles.menuContainer}>
          {/* Botón de sincronización */}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <LinearGradient
              colors={["#3498db", "#2980b9"]}
              style={styles.syncGradient}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              )}
              <Text style={styles.syncText}>
                {isSyncing ? "Sincronizando..." : "Sincronizar Datos"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Planillas de Asistencia</Text>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("CrearPlanilla")}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.menuItemGradient}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="create-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>Crear Planilla</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ListaPlanillas")}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.menuItemGradient}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="calendar-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>Tomar Asistencia</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Planillas de Calificaciones</Text>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("PlanillaCalificaciones")}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.menuItemGradient}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="school-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>Calificaciones</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ModificarPlanilla")}
            >
              <LinearGradient
                colors={["#3498db", "#2980b9"]}
                style={styles.menuItemGradient}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="settings-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>Modificar Planilla</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={["#95a5a6", "#7f8c8d"]} // Cambiado a un gris más suave
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 29,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  menuContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
    paddingLeft: 10,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  menuItem: {
    width: "48%",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  menuItemGradient: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  iconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuItemText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  logoutButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  logoutGradient: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 19,
    marginLeft: 10,
  },
  // Estilos para el botón de sincronización
  syncButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  syncGradient: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  syncText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});
