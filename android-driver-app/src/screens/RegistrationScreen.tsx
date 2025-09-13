import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  navigation: any;
  onRegister: (driver: any) => void;
}

const RegistrationScreen: React.FC<Props> = ({ navigation, onRegister }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ro'yxatdan o'tish</Text>
      <Text style={styles.subtitle}>
        Telegram bot orqali ro'yxatdan o'ting: @YoldaLogisticsBot
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666' },
});

export default RegistrationScreen;