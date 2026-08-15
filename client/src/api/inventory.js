import API from './axios';

// ============================================
// INGREDIENT MANAGEMENT
// ============================================

// Get all ingredients
export const getIngredients = async () => {
    try {
        const response = await API.get('/ingredients');
        return response.data;
    } catch (error) {
        console.error('Get ingredients error:', error);
        throw error;
    }
};

// Create ingredient
export const createIngredient = async (data) => {
    try {
        const response = await API.post('/ingredients', data);
        return response.data;
    } catch (error) {
        console.error('Create ingredient error:', error);
        throw error;
    }
};

// Update ingredient
export const updateIngredient = async (id, data) => {
    try {
        const response = await API.put(`/ingredients/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Update ingredient error:', error);
        throw error;
    }
};

// Delete ingredient
export const deleteIngredient = async (id) => {
    try {
        const response = await API.delete(`/ingredients/${id}`);
        return response.data;
    } catch (error) {
        console.error('Delete ingredient error:', error);
        throw error;
    }
};

// Adjust stock
export const adjustStock = async (id, amount, reason) => {
    try {
        const response = await API.put(`/ingredients/${id}/adjust-stock`, { amount, reason });
        return response.data;
    } catch (error) {
        console.error('Adjust stock error:', error);
        throw error;
    }
};

// ============================================
// WASTAGE MANAGEMENT
// ============================================

// Get wastage report
export const getWastageReport = async (startDate, endDate) => {
    try {
        const response = await API.get('/recipes/wastage-report', {
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
        const response = await API.put(`/recipes/ingredient/${id}/wastage`, wastageData);
        return response.data;
    } catch (error) {
        console.error('Update wastage error:', error);
        throw error;
    }
};

// Calculate wastage for an order
export const calculateOrderWastage = async (orderId) => {
    try {
        const response = await API.post(`/recipes/order/${orderId}/calculate-wastage`);
        return response.data;
    } catch (error) {
        console.error('Calculate order wastage error:', error);
        throw error;
    }
};

// Get wastage for specific order
export const getOrderWastage = async (orderId) => {
    try {
        const response = await API.get(`/orders/${orderId}/wastage`);
        return response.data;
    } catch (error) {
        console.error('Get order wastage error:', error);
        throw error;
    }
};

// ============================================
// RECIPE MANAGEMENT
// ============================================

// Get all recipes
export const getRecipes = async () => {
    try {
        const response = await API.get('/recipes');
        return response.data;
    } catch (error) {
        console.error('Get recipes error:', error);
        throw error;
    }
};

// Get recipe by product
export const getRecipeByProduct = async (productId) => {
    try {
        const response = await API.get(`/recipes/product/${productId}`);
        return response.data;
    } catch (error) {
        console.error('Get recipe by product error:', error);
        throw error;
    }
};

// Create or update recipe
export const saveRecipe = async (productId, data) => {
    try {
        const response = await API.post(`/recipes/product/${productId}`, data);
        return response.data;
    } catch (error) {
        console.error('Save recipe error:', error);
        throw error;
    }
};

// Delete recipe
export const deleteRecipe = async (id) => {
    try {
        const response = await API.delete(`/recipes/${id}`);
        return response.data;
    } catch (error) {
        console.error('Delete recipe error:', error);
        throw error;
    }
};

// Delete recipe ingredient
export const deleteRecipeIngredient = async (id) => {
    try {
        const response = await API.delete(`/recipes/ingredient/${id}`);
        return response.data;
    } catch (error) {
        console.error('Delete recipe ingredient error:', error);
        throw error;
    }
};

// Get low stock ingredients
export const getLowStockIngredients = async () => {
    try {
        const response = await API.get('/recipes/ingredients/low-stock');
        return response.data;
    } catch (error) {
        console.error('Get low stock ingredients error:', error);
        throw error;
    }
};