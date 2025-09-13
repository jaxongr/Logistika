import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Driver } from '../App';
import { ApiService } from '../services/ApiService';

interface Props {
  navigation: any;
  onLogin: (driver: Driver) => void;
}

const LoginScreen: React.FC<Props> = ({ navigation, onLogin }) => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as +998 (XX) XXX-XX-XX
    let formatted = '';
    if (digits.length > 0) {
      if (digits.startsWith('998')) {
        formatted = '+998';
        if (digits.length > 3) {
          formatted += ` (${digits.slice(3, 5)}`;
          if (digits.length > 5) {
            formatted += `) ${digits.slice(5, 8)}`;
            if (digits.length > 8) {
              formatted += `-${digits.slice(8, 10)}`;
              if (digits.length > 10) {
                formatted += `-${digits.slice(10, 12)}`;
              }
            }
          }
        }
      } else {
        // Add +998 prefix
        formatted = '+998' + digits;
        if (formatted.length > 4) {
          formatted = `+998 (${digits.slice(0, 2)}`;
          if (digits.length > 2) {
            formatted += `) ${digits.slice(2, 5)}`;
            if (digits.length > 5) {
              formatted += `-${digits.slice(5, 7)}`;
              if (digits.length > 7) {
                formatted += `-${digits.slice(7, 9)}`;
              }
            }
          }
        }
      }
    }
    
    return formatted;
  };

  const validatePhone = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, '');
    const isValid = digits.length === 12 && digits.startsWith('998');
    setIsPhoneValid(isValid);
    return isValid;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    validatePhone(formatted);
  };

  const handleLogin = async () => {
    if (!isPhoneValid) {
      Alert.alert('Xato', 'Iltimos, to\'g\'ri telefon raqam kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await ApiService.loginDriver(`+${cleanPhone}`);
      
      if (response.data.success) {
        onLogin(response.data.driver);
      } else {
        Alert.alert('Xato', 'Tizimga kirishda xatolik yuz berdi');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 404) {
        Alert.alert(
          'Haydovchi topilmadi',
          'Bu telefon raqam bilan ro\'yxatdan o\'tmagan. Ro\'yxatdan o\'tishni xohlaysizmi?',
          [
            { text: 'Bekor qilish', style: 'cancel' },
            { 
              text: 'Ro\'yxatdan o\'tish', 
              onPress: () => navigation.navigate('Registration', { phone: cleanPhone })
            }
          ]
        );
      } else {
        Alert.alert('Xato', 'Tizimga kirishda xatolik. Internetni tekshiring.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPress = () => {
    navigation.navigate('Registration');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="local-shipping" size={48} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Yo'lda Driver</Text>
          <Text style={styles.headerSubtitle}>
            Professional haydovchilar platformasi
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.formTitle}>Tizimga kirish</Text>
          <Text style={styles.formSubtitle}>
            Telefon raqamingizni kiriting
          </Text>

          <View style={styles.inputContainer}>
            <Icon name="phone" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                isPhoneValid && styles.inputValid,
                phone && !isPhoneValid && styles.inputInvalid,
              ]}
              placeholder="+998 (XX) XXX-XX-XX"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={19}
              autoFocus={true}
              editable={!isLoading}
            />
            {phone.length > 0 && (
              <TouchableOpacity 
                onPress={() => setPhone('')}
                style={styles.clearButton}
              >
                <Icon name="clear" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {phone && !isPhoneValid && (
            <Text style={styles.errorText}>
              Telefon raqam noto'g'ri formatda
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.loginButton,
              (!isPhoneValid || isLoading) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!isPhoneValid || isLoading}
          >
            <LinearGradient
              colors={
                isPhoneValid && !isLoading
                  ? ['#4CAF50', '#45a049']
                  : ['#E0E0E0', '#BDBDBD']
              }
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Icon name="hourglass-empty" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Tekshirilmoqda...</Text>
                </View>
              ) : (
                <>
                  <Icon name="login" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Kirish</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>yoki</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegisterPress}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              Ro'yxatdan o'tish
            </Text>
            <Icon name="arrow-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tizimga kirish orqali siz{' '}
          <Text style={styles.footerLink}>Foydalanish shartlari</Text>ni qabul qilasiz
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingTop: 32,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  inputValid: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  inputInvalid: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  clearButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 48,
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: '#999',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  registerButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default LoginScreen;