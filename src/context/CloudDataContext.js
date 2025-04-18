// src/context/CloudDataContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Alert } from "react-native";
import { PlanillasContext } from "./PlanillasContext";
import { AuthContext } from "./AuthContext"; // Importar AuthContext para casos de respaldo

export const CloudDataContext = createContext();

export const CloudDataProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const planillasContext = useContext(PlanillasContext); // Obtener todo el contexto
  const { planillas, actualizarPlanilla, eliminarPlanilla } = planillasContext;
  const authContext = useContext(AuthContext); // Usar AuthContext como respaldo

  // Función para obtener el userId de manera segura
  const getUserId = () => {
    // Intentar obtener el userId de Firebase Auth primero
    if (auth.currentUser && auth.currentUser.uid) {
      return auth.currentUser.uid;
    }

    // Si no está disponible, intentar obtenerlo del AuthContext
    if (authContext && authContext.currentUser && authContext.currentUser.uid) {
      return authContext.currentUser.uid;
    }

    // Si aún no hay userId, intentar obtenerlo de AsyncStorage como último recurso
    const getUserIdFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            return user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
      return null;
    };

    // Nota: esta es una función asíncrona, pero la estamos usando en un contexto síncrono
    // Solo como último recurso y con advertencia
    console.warn(
      "No se pudo obtener userId de manera síncrona, intentando AsyncStorage"
    );
    return null;
  };

  // Función para sincronizar datos locales con la nube
  const syncDataToCloud = async () => {
    // Obtener userId de manera segura
    let userId = getUserId();

    // Si no hay userId disponible de manera síncrona, intentar obtenerlo de AsyncStorage
    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para sincronizar datos");
      Alert.alert("Error", "No hay usuario autenticado para sincronizar datos");
      return false;
    }

    try {
      setIsSyncing(true);
      console.log(`Sincronizando datos para usuario: ${userId}`);

      // 1. Sincronizar planillas
      if (planillas && planillas.length > 0) {
        for (const planilla of planillas) {
          // Asegurarse de que la planilla tenga userId
          const planillaConUserId = {
            ...planilla,
            userId: userId, // Siempre usar el ID del usuario actual
          };

          await setDoc(
            doc(db, "users", userId, "planillas", planilla.id),
            planillaConUserId
          );

          // 2. Sincronizar asistencias para cada planilla
          const año = new Date().getFullYear();
          for (let mes = 0; mes < 12; mes++) {
            const asistenciasKey = `asistencias_${planilla.id}_${mes}_${año}`;
            const asistenciasData = await AsyncStorage.getItem(asistenciasKey);

            if (asistenciasData) {
              // Guardar el objeto de asistencias directamente
              await setDoc(
                doc(
                  db,
                  "users",
                  userId,
                  "asistencias",
                  `${planilla.id}_${mes}_${año}`
                ),
                JSON.parse(asistenciasData)
              );
            }
          }

          // 3. Sincronizar calificaciones para cada planilla
          for (let cuatrimestre = 1; cuatrimestre <= 2; cuatrimestre++) {
            // Calificaciones
            const calificacionesKey = `calificaciones_${planilla.id}_cuatrimestre${cuatrimestre}`;
            const calificacionesData = await AsyncStorage.getItem(
              calificacionesKey
            );

            if (calificacionesData) {
              await setDoc(
                doc(
                  db,
                  "users",
                  userId,
                  "calificaciones",
                  `${planilla.id}_cuatrimestre${cuatrimestre}`
                ),
                JSON.parse(calificacionesData)
              );
            }

            // Evaluaciones
            const evaluacionesKey = `evaluaciones_${planilla.id}_cuatrimestre${cuatrimestre}`;
            const evaluacionesData = await AsyncStorage.getItem(
              evaluacionesKey
            );

            if (evaluacionesData) {
              const evaluacionesArray = JSON.parse(evaluacionesData);
              // Envolver el array en un objeto con la propiedad items
              const evaluacionesObj = { evaluaciones: evaluacionesArray };
              await setDoc(
                doc(
                  db,
                  "users",
                  userId,
                  "evaluaciones",
                  `${planilla.id}_cuatrimestre${cuatrimestre}`
                ),
                evaluacionesObj // Usar el objeto en lugar del array directamente
              );
            }
          }
        }
      }

      Alert.alert(
        "Éxito",
        "Todos los datos han sido sincronizados con la nube"
      );
      return true;
    } catch (error) {
      console.error("Error al sincronizar datos con la nube:", error);
      Alert.alert(
        "Error",
        "No se pudieron sincronizar los datos: " + error.message
      );
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Función para cargar datos desde la nube
  const loadDataFromCloud = async () => {
    // Obtener userId de manera segura
    let userId = getUserId();

    // Si no hay userId disponible de manera síncrona, intentar obtenerlo de AsyncStorage
    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para cargar datos");
      setIsLoading(false);
      return false;
    }

    try {
      setIsSyncing(true);
      console.log(`Cargando datos para usuario: ${userId}`);

      // 1. Cargar planillas
      const planillasSnapshot = await getDocs(
        collection(db, "users", userId, "planillas")
      );
      const planillasFromCloud = [];

      planillasSnapshot.forEach((doc) => {
        // Asegurarse de que cada planilla tenga userId
        const planillaData = doc.data();
        if (!planillaData.userId) {
          planillaData.userId = userId;
        }
        planillasFromCloud.push(planillaData);
        console.log(`Planilla cargada: ${doc.id}`);
      });

      console.log(`Total de planillas cargadas: ${planillasFromCloud.length}`);

      if (planillasFromCloud.length > 0) {
        // Guardar en AsyncStorage
        await AsyncStorage.setItem(
          "planillas",
          JSON.stringify(planillasFromCloud)
        );

        // Actualizar el estado en el contexto de planillas
        // Usar directamente setPlanillas del contexto
        planillasContext.setPlanillas(planillasFromCloud);
        console.log(
          "Planillas cargadas desde Firebase:",
          planillasFromCloud.length
        );

        // 2. Cargar asistencias y calificaciones para cada planilla
        for (const planilla of planillasFromCloud) {
          const año = new Date().getFullYear();

          // Cargar asistencias
          for (let mes = 0; mes < 12; mes++) {
            const asistenciasRef = doc(
              db,
              "users",
              userId,
              "asistencias",
              `${planilla.id}_${mes}_${año}`
            );
            const asistenciasDoc = await getDoc(asistenciasRef);

            if (asistenciasDoc.exists()) {
              // Guardar directamente el objeto de asistencias
              await AsyncStorage.setItem(
                `asistencias_${planilla.id}_${mes}_${año}`,
                JSON.stringify(asistenciasDoc.data())
              );
            }
          }

          // Cargar calificaciones y evaluaciones
          for (let cuatrimestre = 1; cuatrimestre <= 2; cuatrimestre++) {
            // Calificaciones
            const calificacionesRef = doc(
              db,
              "users",
              userId,
              "calificaciones",
              `${planilla.id}_cuatrimestre${cuatrimestre}`
            );
            const calificacionesDoc = await getDoc(calificacionesRef);

            if (calificacionesDoc.exists()) {
              await AsyncStorage.setItem(
                `calificaciones_${planilla.id}_cuatrimestre${cuatrimestre}`,
                JSON.stringify(calificacionesDoc.data())
              );
            }

            // Evaluaciones
            const evaluacionesRef = doc(
              db,
              "users",
              userId,
              "evaluaciones",
              `${planilla.id}_cuatrimestre${cuatrimestre}`
            );
            const evaluacionesDoc = await getDoc(evaluacionesRef);

            // Dentro de la función loadDataFromCloud, en la parte donde se cargan las evaluaciones:
            if (evaluacionesDoc.exists()) {
              const data = evaluacionesDoc.data();
              // Extraer el array de evaluaciones
              const evaluacionesArray = data.evaluaciones || data.items || [];
              await AsyncStorage.setItem(
                `evaluaciones_${planilla.id}_cuatrimestre${cuatrimestre}`,
                JSON.stringify(evaluacionesArray)
              );
            }
            // Añadir esto para cargar evaluaciones adicionales
            const evaluacionesAdicionalesRef = doc(
              db,
              "users",
              userId,
              "evaluaciones",
              `${planilla.id}_adicional_cuatrimestre${cuatrimestre}`
            );
            const evaluacionesAdicionalesDoc = await getDoc(
              evaluacionesAdicionalesRef
            );

            if (evaluacionesAdicionalesDoc.exists()) {
              const data = evaluacionesAdicionalesDoc.data();
              // Extraer el array de evaluaciones adicionales
              const evaluacionesArray = data.evaluaciones || data.items || [];
              await AsyncStorage.setItem(
                `evaluaciones_adicionales_${planilla.id}_cuatrimestre${cuatrimestre}`,
                JSON.stringify(evaluacionesArray)
              );
            }
          }
        }

        Alert.alert("Éxito", "Datos cargados desde la nube correctamente");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al cargar datos desde la nube:", error);
      Alert.alert("Error", "No se pudieron cargar los datos: " + error.message);
      return false;
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  // Función para guardar una planilla en la nube
  const savePlanillaToCloud = async (planilla) => {
    try {
      // Obtener userId de múltiples fuentes para mayor seguridad
      let userId = null;

      // 1. Intentar obtener de Firebase Auth
      if (auth.currentUser && auth.currentUser.uid) {
        userId = auth.currentUser.uid;
      }
      // 2. Si no está disponible, intentar obtenerlo del AuthContext
      else if (
        authContext &&
        authContext.currentUser &&
        authContext.currentUser.uid
      ) {
        userId = authContext.currentUser.uid;
      }
      // 3. Si aún no hay userId, intentar obtenerlo de la planilla
      else if (planilla && planilla.userId) {
        userId = planilla.userId;
      }
      // 4. Como último recurso, intentar obtenerlo de AsyncStorage
      else {
        try {
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            if (user && user.uid) {
              userId = user.uid;
            }
          }
        } catch (error) {
          console.error("Error al obtener userId de AsyncStorage:", error);
        }
      }

      // Verificar si se pudo obtener un userId
      if (!userId) {
        console.error(
          "No se pudo obtener un userId válido para guardar la planilla"
        );
        Alert.alert(
          "Error",
          "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente."
        );
        return false;
      }

      // Asegurarse de que la planilla tenga un userId válido
      const planillaConUserId = {
        ...planilla,
        userId: userId, // Usar el userId obtenido
      };

      console.log(
        `Guardando planilla en la nube: ${planillaConUserId.id} para usuario ${planillaConUserId.userId}`
      );

      // Guardar en Firestore
      const planillaRef = doc(
        db,
        `users/${userId}/planillas/${planillaConUserId.id}`
      );
      await setDoc(planillaRef, planillaConUserId);

      console.log(
        `Planilla ${planillaConUserId.id} guardada exitosamente en la nube`
      );
      return true;
    } catch (error) {
      console.error("Error al guardar planilla en la nube:", error);
      Alert.alert(
        "Error",
        `No se pudo guardar la planilla en la nube: ${error.message}`
      );
      return false;
    }
  };

  // Función para eliminar una planilla de la nube
  const deletePlanillaFromCloud = async (planillaId) => {
    // Obtener userId de manera segura
    let userId = getUserId();

    // Si no hay userId disponible de manera síncrona, intentar obtenerlo de AsyncStorage
    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para eliminar planilla");
      return false;
    }

    try {
      await deleteDoc(doc(db, "users", userId, "planillas", planillaId));

      // También eliminar asistencias y calificaciones relacionadas
      const año = new Date().getFullYear();

      // Eliminar asistencias
      for (let mes = 0; mes < 12; mes++) {
        try {
          await deleteDoc(
            doc(
              db,
              "users",
              userId,
              "asistencias",
              `${planillaId}_${mes}_${año}`
            )
          );
        } catch (e) {
          // Ignorar errores si el documento no existe
        }
      }

      // Eliminar calificaciones y evaluaciones
      for (let cuatrimestre = 1; cuatrimestre <= 2; cuatrimestre++) {
        try {
          await deleteDoc(
            doc(
              db,
              "users",
              userId,
              "calificaciones",
              `${planillaId}_cuatrimestre${cuatrimestre}`
            )
          );
          await deleteDoc(
            doc(
              db,
              "users",
              userId,
              "evaluaciones",
              `${planillaId}_cuatrimestre${cuatrimestre}`
            )
          );
        } catch (e) {
          // Ignorar errores si el documento no existe
        }
      }
      return true;
    } catch (error) {
      console.error("Error al eliminar planilla de la nube:", error);
      return false;
    }
  };

  // Función para guardar asistencias en la nube
  const saveAsistenciasToCloud = async (planillaId, mes, año, asistencias) => {
    // Obtener userId de manera segura
    let userId = getUserId();

    // Si no hay userId disponible de manera síncrona, intentar obtenerlo de AsyncStorage
    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para guardar asistencias");
      return false;
    }

    try {
      console.log(
        `Guardando asistencias en la nube para planilla ${planillaId}, mes ${mes}, año ${año}`
      );

      // Guardar como objeto directo, no como string dentro de un objeto
      await setDoc(
        doc(db, "users", userId, "asistencias", `${planillaId}_${mes}_${año}`),
        asistencias // Guardar el objeto directamente
      );

      console.log("Asistencias guardadas en la nube correctamente");
      return true;
    } catch (error) {
      console.error("Error al guardar asistencias en la nube:", error);
      return false;
    }
  };

  // Función para guardar calificaciones en la nube
  const saveCalificacionesToCloud = async (
    planillaId,
    cuatrimestre,
    calificaciones
  ) => {
    // Obtener userId de manera segura
    let userId = getUserId();

    // Si no hay userId disponible de manera síncrona, intentar obtenerlo de AsyncStorage
    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para guardar calificaciones");
      return false;
    }

    try {
      await setDoc(
        doc(
          db,
          "users",
          userId,
          "calificaciones",
          `${planillaId}_cuatrimestre${cuatrimestre}`
        ),
        calificaciones // Guardar el objeto directamente
      );
      return true;
    } catch (error) {
      console.error("Error al guardar calificaciones en la nube:", error);
      return false;
    }
  };

  // Función para guardar evaluaciones en la nube
  // Función para guardar evaluaciones en la nube
  const saveEvaluacionesToCloud = async (
    planillaId,
    cuatrimestre,
    evaluaciones
  ) => {
    let userId = getUserId();

    if (!userId) {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.uid) {
            userId = user.uid;
          }
        }
      } catch (error) {
        console.error("Error al obtener userId de AsyncStorage:", error);
      }
    }

    if (!userId) {
      console.log("No hay usuario autenticado para guardar evaluaciones");
      return false;
    }

    try {
      // Verificar si el cuatrimestre incluye "adicional" para usar la ruta correcta
      const isAdicional = cuatrimestre.includes("adicional");

      // Construir la ruta correcta para el documento
      const docPath = isAdicional
        ? `${planillaId}_${cuatrimestre}`
        : `${planillaId}_${cuatrimestre}`;

      // Guardar con la estructura { evaluaciones: [...] }
      await setDoc(
        doc(db, "users", userId, "evaluaciones", docPath),
        { evaluaciones } // Guardar como { evaluaciones: [...] }
      );

      console.log(`Evaluaciones guardadas en la nube: ${docPath}`);
      return true;
    } catch (error) {
      console.error("Error al guardar evaluaciones en la nube:", error);
      return false;
    }
  };

  // Verificar si hay usuario autenticado al cargar el componente
  useEffect(() => {
    const checkAuthState = () => {
      if (auth.currentUser) {
        loadDataFromCloud();
      } else {
        setIsLoading(false);
      }
    };

    // Verificar estado de autenticación cuando cambia
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadDataFromCloud();
      } else {
        setIsLoading(false);
      }
    });

    checkAuthState();

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
  }, []);

  const value = {
    isLoading,
    isSyncing,
    syncDataToCloud,
    loadDataFromCloud,
    savePlanillaToCloud,
    deletePlanillaFromCloud,
    saveAsistenciasToCloud,
    saveCalificacionesToCloud,
    saveEvaluacionesToCloud,
  };

  return (
    <CloudDataContext.Provider value={value}>
      {children}
    </CloudDataContext.Provider>
  );
};
