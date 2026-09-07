import { useState } from 'react';
import { type PricingLearningItem } from './index';
import {
  loadPricingIntelligenceSettings,
  loadPricingLearningItems,
  type PricingIntelligenceSettings,
} from './pricingRuntime';

export function useSettingsPricingState() {
  const [pricingSettings, setPricingSettings] = useState<PricingIntelligenceSettings>(() => loadPricingIntelligenceSettings());
  const [pricingLearningItems, setPricingLearningItems] = useState<PricingLearningItem[]>(() => loadPricingLearningItems());
  const [pricingDecisionSearch, setPricingDecisionSearch] = useState('');
  const [pricingDecisionActionFilter, setPricingDecisionActionFilter] = useState<'all' | 'accepted' | 'overridden' | 'manual'>('all');
  const [pricingDecisionDeltaFilter, setPricingDecisionDeltaFilter] = useState<'all' | 'higher' | 'lower' | 'same'>('all');
  const [pricingDecisionDateFrom, setPricingDecisionDateFrom] = useState('');
  const [pricingDecisionDateTo, setPricingDecisionDateTo] = useState('');

  return {
    pricingSettings,
    setPricingSettings,
    pricingLearningItems,
    setPricingLearningItems,
    pricingDecisionSearch,
    setPricingDecisionSearch,
    pricingDecisionActionFilter,
    setPricingDecisionActionFilter,
    pricingDecisionDeltaFilter,
    setPricingDecisionDeltaFilter,
    pricingDecisionDateFrom,
    setPricingDecisionDateFrom,
    pricingDecisionDateTo,
    setPricingDecisionDateTo,
  };
}
