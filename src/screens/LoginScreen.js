// src/screens/LoginScreen.js
import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import FloatingLogo from "../components/FloatingLogo";
import { auth } from "../config/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { CloudDataContext } from "../context/CloudDataContext"; // Importar el contexto
import { Ionicons } from "@expo/vector-icons"; // Asegúrate de que Ionicons esté importado

// src/screens/LoginScreen.js
// ... (imports se mantienen igual)

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { loadDataFromCloud } = useContext(CloudDataContext);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor complete todos los campos");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Por favor ingrese un correo electrónico válido");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      let userCredential;

      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        Alert.alert("Éxito", "Usuario registrado correctamente");
        setIsRegistering(false);
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      const user = userCredential.user;

      // Guardar datos de sesión
      await AsyncStorage.setItem("isLoggedIn", "true");
      await AsyncStorage.setItem("username", email.split("@")[0]);
      await AsyncStorage.setItem("userId", user.uid);

      // Cargar datos y navegar directamente
      try {
        await loadDataFromCloud();
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        // Navegar al menú sin importar si hubo error en la carga de datos
        navigation.replace("Menu");
      }
    } catch (error) {
      console.error("Error de autenticación:", error);

      let errorMessage = "No se pudo iniciar sesión";
      if (error.code === "auth/user-not-found") {
        errorMessage = "Usuario no encontrado";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este correo ya está registrado";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Correo electrónico inválido";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (el resto del código del componente se mantiene igual)

  return (
    <ImageBackground
      source={require("../../assets/education-background.png")}
      style={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <FloatingLogo size={160} />
          </View>

          <Text style={styles.title}>Asistencia Nóe</Text>
          <Text style={styles.subtitle}>
            {isRegistering
              ? "Crea una nueva cuenta"
              : "Presiona la firma para pedir cuenta"}
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#5d8aa8", "#2980b9"]}
                style={styles.gradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {isRegistering ? "Registrarse" : "Iniciar Sesión"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={styles.switchModeText}>
                {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#101",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 19,
    color: "#100",
    textAlign: "center",
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  // Nuevos estilos para el contenedor de contraseña
  passwordContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButton: {
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 10,
  },
  gradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  switchModeButton: {
    marginTop: 15,
    alignItems: "center",
  },
  switchModeText: {
    color: "#2980b9",
    fontSize: 16,
  },
});
