// src/firebase/config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Tu configuración de Firebase (reemplaza con tus valores reales)
const firebaseConfig = {
  apiKey: "tu-api-key-real",
  authDomain: "tu-proyecto-real.firebaseapp.com",
  projectId: "tu-proyecto-real",
  storageBucket: "tu-proyecto-real.appspot.com",
  messagingSenderId: "tu-messaging-sender-id-real",
  appId: "tu-app-id-real",
};

// Inicializar Firebase solo si no existe una instancia
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Si ya existe, usa la instancia existente
}

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
