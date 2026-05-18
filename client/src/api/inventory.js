import API from './axios';

// Get wastage report
export const getWastageReport = async (startDate, endDate) => {
    try {
        const response = await API.get('/ingredients/wastage-report', {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data;
    } catch (error) {
        console.error('Get wastage report error:', error);
        throw error;
    }
};

// Update ingredient wastage settings
export const updateIngredientWastage = async (id, wastageData) => {
    try {
        const response = await API.put(`/ingredients/${id}/wastage`, wastageData);
        return response.data;
    } catch (error) {
        console.error('Update wastage error:', error);
        throw error;
    }
};

// Calculate wastage for an order
export const calculateOrderWastage = async (orderId) => {
    try {
        const response = await API.post(`/orders/${orderId}/calculate-wastage`);
        return response.data;
    } catch (error) {
        console.error('Calculate order wastage error:', error);
        throw error;
    }
};