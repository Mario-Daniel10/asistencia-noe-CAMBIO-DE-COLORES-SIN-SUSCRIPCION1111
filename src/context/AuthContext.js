// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../config/firebase"; // Importar auth de Firebase
import { onAuthStateChanged, signOut } from "firebase/auth"; // Importar funciones de Firebase Auth

// Crear el contexto
export const AuthContext = createContext();

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar el usuario al iniciar y escuchar cambios de autenticación en Firebase
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Intentar cargar usuario desde AsyncStorage primero (para inicio rápido)
        const savedUser = await AsyncStorage.getItem("user");
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Error al cargar el usuario desde AsyncStorage:", error);
      }
    };

    // Cargar usuario local primero
    loadUser();

    // Configurar listener para cambios de autenticación en Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado en Firebase
        console.log("Usuario autenticado en Firebase:", user.uid);

        // Crear objeto de usuario con los datos necesarios
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          // Añadir cualquier otro dato que necesites
        };

        // Guardar en AsyncStorage
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setCurrentUser(userData);
      } else {
        // No hay usuario autenticado en Firebase
        console.log("No hay usuario autenticado en Firebase");
        await AsyncStorage.removeItem("user");
        setCurrentUser(null);
      }

      setLoading(false);
    });

    // Limpiar el listener cuando se desmonte el componente
    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión
  const login = async (user) => {
    try {
      // Esta función solo actualiza el estado local y AsyncStorage
      // La autenticación real con Firebase debe hacerse antes de llamar a esta función
      await AsyncStorage.setItem("user", JSON.stringify(user));
      setCurrentUser(user);
      console.log("Usuario guardado en contexto:", user.uid);
      return true;
    } catch (error) {
      console.error("Error al guardar el usuario:", error);
      return false;
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      // Cerrar sesión en Firebase
      await signOut(auth);

      // Limpiar datos locales
      await AsyncStorage.removeItem("user");
      setCurrentUser(null);
      console.log("Sesión cerrada correctamente");
      return true;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      return false;
    }
  };

  // Función para actualizar datos del usuario
  const updateUserData = async (userData) => {
    try {
      // Combinar datos actuales con nuevos datos
      const updatedUser = { ...currentUser, ...userData };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      console.log("Datos de usuario actualizados");
      return true;
    } catch (error) {
      console.error("Error al actualizar datos del usuario:", error);
      return false;
    }
  };

  // Función para verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return currentUser !== null;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        updateUserData,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
