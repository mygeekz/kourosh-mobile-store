import {
    getProfitabilityReportFromDb,
    getInventoryVelocityReportFromDb,
    getPurchaseSuggestionsReportFromDb,
} from './database';
import { InventoryVelocityAnalysis, VelocityItem, PurchaseSuggestionItem } from '../types';

export const analyzeProfitability = async () => {
    // Pass-through, as SQL does all the work
    return await getProfitabilityReportFromDb();
};

export const analyzeInventoryVelocity = async (): Promise<InventoryVelocityAnalysis> => {
    const allItems = await getInventoryVelocityReportFromDb();
    
    const hotItems: VelocityItem[] = [];
    const staleItems: VelocityItem[] = [];
    const normalItems: VelocityItem[] = [];

    allItems.forEach((item: VelocityItem) => {
        if(item.classification === 'پرفروش (داغ)') {
            hotItems.push(item);
        } else if (item.classification === 'کم‌فروش (راکد)') {
            staleItems.push(item);
        } else {
            normalItems.push(item);
        }
    });

    return { 
        hotItems: hotItems.sort((a,b) => b.salesPerDay - a.salesPerDay), 
        staleItems: staleItems.sort((a,b) => a.salesPerDay - b.salesPerDay), 
        normalItems 
    };
};

export const generatePurchaseSuggestions = async (): Promise<PurchaseSuggestionItem[]> => {
    const REORDER_COVERAGE_DAYS = 30; // Suggest buying stock for the next 30 days
    const rawSuggestions = await getPurchaseSuggestionsReportFromDb();

    return rawSuggestions.map(item => {
        const desiredStock = item.salesPerDay * REORDER_COVERAGE_DAYS;
        const suggestedPurchaseQuantity = Math.ceil(desiredStock - item.currentStock);
        
        return {
            ...item,
            daysOfStockLeft: parseFloat(item.daysOfStockLeft.toFixed(1)),
            salesPerDay: parseFloat(item.salesPerDay.toFixed(2)),
            suggestedPurchaseQuantity: Math.max(1, suggestedPurchaseQuantity) // Suggest at least 1 unit
        };
    });
};
