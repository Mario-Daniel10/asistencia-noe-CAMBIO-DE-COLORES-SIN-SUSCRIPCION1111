// src/context/PlanillasContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "./AuthContext";

export const PlanillasContext = createContext();

export const PlanillasProvider = ({ children }) => {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const authContext = useContext(AuthContext);

  // Cargar planillas al iniciar
  useEffect(() => {
    const cargarPlanillas = async () => {
      try {
        const planillasGuardadas = await AsyncStorage.getItem("planillas");
        if (planillasGuardadas) {
          const planillasParseadas = JSON.parse(planillasGuardadas);
          console.log(
            "Planillas cargadas desde AsyncStorage:",
            planillasParseadas.length
          );
          setPlanillas(planillasParseadas);
        } else {
          console.log("No hay planillas guardadas en AsyncStorage");
          setPlanillas([]);
        }
      } catch (error) {
        console.error("Error al cargar planillas:", error);
        setPlanillas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarPlanillas();
  }, []);

  // Función para verificar si el usuario ha alcanzado el límite gratuito
  const verificarLimiteGratuito = async (userId) => {
    // VERSIÓN GRATUITA SIN LÍMITES: Siempre devuelve false (no hay límite superado)
    return false;

    // CÓDIGO ORIGINAL COMENTADO - Descomentar cuando quieras volver a habilitar el límite
    /*
    try {
      // Obtener las planillas del usuario
      const planillasUsuario = planillas.filter((p) => p.userId === userId);

      // Verificar si ha alcanzado el límite (1 planilla gratuita)
      return planillasUsuario.length >= 1;
    } catch (error) {
      console.error("Error al verificar límite gratuito:", error);
      return false;
    }
    */
  };

  // Guardar planillas cuando cambien
  const guardarPlanillas = async (nuevasPlanillas) => {
    try {
      await AsyncStorage.setItem("planillas", JSON.stringify(nuevasPlanillas));
      setPlanillas(nuevasPlanillas);
      console.log("Planillas guardadas correctamente:", nuevasPlanillas.length);
      return true;
    } catch (error) {
      console.error("Error al guardar planillas:", error);
      return false;
    }
  };

  // Agregar una nueva planilla
  const agregarPlanilla = async (nuevaPlanilla) => {
    try {
      // Verificar si la planilla ya tiene userId
      if (!nuevaPlanilla.userId) {
        console.log(
          "La planilla no tiene userId, intentando obtenerlo del contexto"
        );
        const userId = authContext?.currentUser?.uid;

        // Si no hay userId en el contexto, lanzar error
        if (!userId) {
          console.log("No se pudo obtener userId del contexto");
          throw new Error("Usuario no autenticado");
        } else {
          nuevaPlanilla.userId = userId;
        }
      }

      console.log("Agregando planilla con userId:", nuevaPlanilla.userId);

      const nuevasPlanillas = [...planillas, nuevaPlanilla];
      const resultado = await guardarPlanillas(nuevasPlanillas);
      return resultado;
    } catch (error) {
      console.error("Error al agregar planilla:", error);
      return false;
    }
  };

  // Actualizar una planilla existente
  const actualizarPlanilla = async (planillaActualizada) => {
    try {
      const nuevasPlanillas = planillas.map((p) =>
        p.id === planillaActualizada.id ? planillaActualizada : p
      );
      const resultado = await guardarPlanillas(nuevasPlanillas);
      return resultado;
    } catch (error) {
      console.error("Error al actualizar planilla:", error);
      return false;
    }
  };

  // Eliminar una planilla
  const eliminarPlanilla = async (planillaId) => {
    try {
      const nuevasPlanillas = planillas.filter((p) => p.id !== planillaId);
      const resultado = await guardarPlanillas(nuevasPlanillas);
      return resultado;
    } catch (error) {
      console.error("Error al eliminar planilla:", error);
      return false;
    }
  };

  // Actualizar asistencias
  const actualizarAsistencias = async (planillaId, mes, año, asistencias) => {
    try {
      await AsyncStorage.setItem(
        `asistencias_${planillaId}_${mes}_${año}`,
        JSON.stringify(asistencias)
      );
      return true;
    } catch (error) {
      console.error("Error al actualizar asistencias:", error);
      return false;
    }
  };

  // Cargar planillas específicas de un usuario
  const cargarPlanillasUsuario = async (userId) => {
    try {
      if (!userId) {
        console.log("No se proporcionó userId para cargar planillas");
        return [];
      }

      console.log("Cargando datos para usuario:", userId);
      const planillasUsuario = planillas.filter((p) => p.userId === userId);
      console.log("Total de planillas cargadas:", planillasUsuario.length);
      return planillasUsuario;
    } catch (error) {
      console.error("Error al cargar planillas del usuario:", error);
      return [];
    }
  };

  return (
    <PlanillasContext.Provider
      value={{
        planillas,
        loading,
        setPlanillas,
        agregarPlanilla,
        actualizarPlanilla,
        eliminarPlanilla,
        actualizarAsistencias,
        verificarLimiteGratuito,
        cargarPlanillasUsuario, // Añadida nueva función para cargar planillas por usuario
      }}
    >
      {children}
    </PlanillasContext.Provider>
  );
};
