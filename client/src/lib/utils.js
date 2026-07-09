
export function getErrorMessage(error) {
  // Check if it's an axios error
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check if it's a network error
  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }

  // Fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
}
