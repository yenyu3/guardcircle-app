import React, { useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation';

export default function ResultScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const { riskLevel, riskFactors, summary, scamType, riskScore, hasFinancialKeyword } = route.params;

  useEffect(() => {
    if (riskLevel === 'high') {
      navigation.replace('ResultHigh', { scamType, riskScore, riskFactors, summary });
    } else if (riskLevel === 'medium') {
      navigation.replace('ResultMedium', { riskFactors, summary, scamType, riskScore });
    } else {
      navigation.replace('ResultSafe');
    }
  }, []);

  return null;
}
