// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBIHaBCPg5OAYUSVdcSPMd8nMfKMUIA1XU",
  authDomain: "asistencia-noe.firebaseapp.com",
  projectId: "asistencia-noe",
  storageBucket: "asistencia-noe.appspot.com",
  messagingSenderId: "290133885421",
  appId: "1:290133885421:web:c0e28291c1003e1f2667e4",
  measurementId: "G-F2RC1ZXE09",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth con persistencia
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Inicializar y exportar Firestore
export const db = getFirestore(app);

// Exportar la instancia de la app
export default app;
