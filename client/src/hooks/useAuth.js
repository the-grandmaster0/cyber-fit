
import { useAuth as useAuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  return useAuthContext();
}
