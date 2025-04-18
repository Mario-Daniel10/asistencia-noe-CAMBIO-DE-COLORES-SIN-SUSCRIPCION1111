// src/components/DeveloperSignatureFixed.js
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

const DeveloperSignatureFixed = () => {
  const openDeveloperContact = () => {
    // Abre WhatsApp con el número especificado
    Linking.openURL("https://wa.me/+5491159234048"); // Reemplaza con tu número real
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={openDeveloperContact}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["#5D8AA8", "#7CB9E8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 5,
    zIndex: 100,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    width: "80%",
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

export default DeveloperSignatureFixed;
