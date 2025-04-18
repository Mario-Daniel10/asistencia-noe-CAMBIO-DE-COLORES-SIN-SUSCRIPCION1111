// App.js
import "./polyfills";
import { LogBox } from "react-native";
LogBox.ignoreLogs(["Warning: TextElement: Support for defaultProps"]);
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PlanillasProvider } from "./src/context/PlanillasContext";
import { CloudDataProvider } from "./src/context/CloudDataContext";
import { AuthProvider } from "./src/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Updates from "expo-updates";

// Importar pantallas
import SplashScreen from "./src/screens/SplashScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MenuScreen from "./src/screens/MenuScreen";
import CrearPlanillaScreen from "./src/screens/CrearPlanillaScreen";
import ListaPlanillasScreen from "./src/screens/ListaPlanillasScreen";
import TomarAsistenciaScreen from "./src/screens/TomarAsistenciaScreen";
import TomarAsistenciaDetalleScreen from "./src/screens/TomarAsistenciaDetalleScreen";
import ModificarPlanillaScreen from "./src/screens/ModificarPlanillaScreen";
import PlanillaCalificacionesScreen from "./src/screens/PlanillaCalificacionesScreen";
import CalificacionesDetalleScreen from "./src/screens/CalificacionesDetalleScreen";
import PorcentajesAsistenciaScreen from "./src/screens/PorcentajesAsistenciaScreen";

// Función para verificar y aplicar actualizaciones
async function onFetchUpdateAsync() {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      Alert.alert(
        "Actualización disponible",
        "Hay una nueva versión disponible. ¿Desea actualizar ahora?",
        [
          {
            text: "No",
            style: "cancel",
          },
          {
            text: "Sí",
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                Alert.alert(
                  "Actualización completada",
                  "La aplicación se reiniciará para aplicar los cambios.",
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        await Updates.reloadAsync();
                      },
                    },
                  ]
                );
              } catch (error) {
                Alert.alert("Error", "No se pudo descargar la actualización.");
              }
            },
          },
        ]
      );
    }
  } catch (error) {
    console.log("Error checking for updates:", error);
  }
}

const Stack = createNativeStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing app:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };

    initializeApp();

    if (!__DEV__) {
      onFetchUpdateAsync();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error al cargar la aplicación</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1a2a6c",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
            textShadowColor: "rgba(0, 0, 0, 0.3)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
          headerTitleAlign: "center",
          headerBackground: () => (
            <LinearGradient
              colors={["#1a2a6c", "#2d4373"]}
              style={{
                flex: 1,
                borderBottomWidth: 2,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          ),
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            title: "Menú Principal",
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="CrearPlanilla"
          component={CrearPlanillaScreen}
          options={{
            title: "Crear Nueva Planilla",
          }}
        />
        <Stack.Screen
          name="ListaPlanillas"
          component={ListaPlanillasScreen}
          options={{
            title: "Seleccionar Planilla",
          }}
        />
        <Stack.Screen
          name="TomarAsistencia"
          component={TomarAsistenciaScreen}
          options={{
            title: "Tomar Asistencia",
          }}
        />
        <Stack.Screen
          name="DetallesPlanilla"
          component={TomarAsistenciaDetalleScreen}
          options={{
            title: "Detalles de Planilla",
          }}
        />
        <Stack.Screen
          name="ModificarPlanilla"
          component={ModificarPlanillaScreen}
          options={{
            title: "Modificar Planilla",
          }}
        />
        <Stack.Screen
          name="PlanillaCalificaciones"
          component={PlanillaCalificacionesScreen}
          options={{
            title: "Planillas de Calificaciones",
          }}
        />
        <Stack.Screen
          name="CalificacionesDetalle"
          component={CalificacionesDetalleScreen}
          options={{
            title: "Registro de Calificaciones",
          }}
        />
        <Stack.Screen
          name="PorcentajesAsistencia"
          component={PorcentajesAsistenciaScreen}
          options={{
            title: "Porcentajes de Asistencia",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppWrapper() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlanillasProvider>
          <CloudDataProvider>
            <App />
          </CloudDataProvider>
        </PlanillasProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
