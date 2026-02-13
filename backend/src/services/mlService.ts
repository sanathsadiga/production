/**
 * ML Service Integration
 * Calls Python ML service for predictions and analysis
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

export const mlAPI = {
  /**
   * Get maintenance predictions for all machines
   */
  getMaintenancePredictions: async (machineId?: number) => {
    try {
      const url = machineId 
        ? `${ML_SERVICE_URL}/predict?machine_id=${machineId}`
        : `${ML_SERVICE_URL}/predict`;
      
      const response = await fetch(url);
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching maintenance predictions:', error);
      throw error;
    }
  },

  /**
   * Get maintenance recommendations
   */
  getMaintenanceRecommendations: async (filters?: { publication_ids?: string; start_date?: string; end_date?: string; location?: string }) => {
    try {
      let url = `${ML_SERVICE_URL}/recommendations`;
      
      if (filters) {
        const params = new URLSearchParams();
        if (filters.publication_ids) params.append('publication_ids', filters.publication_ids);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.location) params.append('location', filters.location);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  },

  /**
   * Trigger batch analysis (run daily)
   */
  runBatchAnalysis: async () => {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/batch-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error running batch analysis:', error);
      throw error;
    }
  },

  /**
   * Get model information
   */
  getModelInfo: async () => {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/model-info`);
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Error fetching model info:', error);
      throw error;
    }
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/health`);
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('ML Service health check failed:', error);
      throw error;
    }
  }
};
