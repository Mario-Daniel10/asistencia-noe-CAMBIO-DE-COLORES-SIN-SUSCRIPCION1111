// src/utils/helpers.js

// Función simple para generar un ID único sin depender de uuid
export const generateUniqueId = () => {
  return "id_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
};
