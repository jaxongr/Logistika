import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OrderDetailsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buyurtma tafsilotlari</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});

export default OrderDetailsScreen;