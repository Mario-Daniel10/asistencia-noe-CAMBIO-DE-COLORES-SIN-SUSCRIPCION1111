// polyfills.js
global.Buffer = require("buffer").Buffer;

// Usar require solo si el módulo no está definido
if (!global.process) {
  global.process = require("process");
}

// No asignar events directamente a global
