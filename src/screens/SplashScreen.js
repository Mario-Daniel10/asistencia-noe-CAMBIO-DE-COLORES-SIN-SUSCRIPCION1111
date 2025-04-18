// src/screens/SplashScreen.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FloatingLogo from "../components/FloatingLogo";
import DeveloperSignature from "../components/DeveloperSignature";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Limpiar cualquier dato de sesión anterior
        await AsyncStorage.removeItem("isLoggedIn");
        await AsyncStorage.removeItem("username");
        await AsyncStorage.removeItem("userId");
        await AsyncStorage.removeItem("user");

        // Esperar un poco para mostrar la pantalla de splash
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Siempre navegar a Login
        navigation.replace("Login");
      } catch (error) {
        console.error("Error al verificar estado de inicio de sesión:", error);
        navigation.replace("Login");
      }
    };

    checkLoginStatus();
  }, []);

  return (
    <ImageBackground
      source={require("../../assets/education-background.png")}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <FloatingLogo size={180} />
        <Text style={styles.title}>Planilla Digital Docente</Text>
        <Text style={styles.subtitle}>Tu asistente educativo</Text>
        <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        <DeveloperSignature />
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 20,
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: "#7f8c8d",
    marginTop: 10,
    marginBottom: 30,
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loader: {
    marginTop: 20,
  },
});
