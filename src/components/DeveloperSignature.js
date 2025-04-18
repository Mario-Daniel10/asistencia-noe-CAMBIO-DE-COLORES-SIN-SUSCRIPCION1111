// src/components/DeveloperSignature.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons"; // Cambiamos Ionicons por FontAwesome
import { LinearGradient } from "expo-linear-gradient";

const DeveloperSignature = () => {
  const openDeveloperContact = () => {
    // Abre WhatsApp con el número especificado
    Linking.openURL("https://wa.me/+5491159234048"); // Reemplaza con tu número real
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={openDeveloperContact}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={["#5D8AA8", "#7CB9E8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.signatureContent}
      >
        <View style={styles.iconContainer}>
          <FontAwesome name="whatsapp" size={14} color="#fff" />
        </View>
        <Text style={styles.text}>Desarrollador Profesor Alfonso Mario</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    marginVertical: 15,
    marginBottom: 20,
    width: "auto",
  },
  signatureContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

export default DeveloperSignature;
