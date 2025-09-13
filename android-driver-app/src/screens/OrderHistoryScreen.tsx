import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OrderHistoryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buyurtmalar tarixi</Text>
      <Text style={styles.subtitle}>Hozircha buyurtmalar yo'q</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 16 },
});

export default OrderHistoryScreen;