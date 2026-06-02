import { defineStore } from "pinia";
import { ref } from "vue";
import { useRouter } from "vue-router";

export const useAuthStore = defineStore("auth", () => {
  const savedToken = localStorage.getItem("admin_token");
  const token = ref<string | null>(savedToken && savedToken !== "null" ? savedToken : null);
  const router = useRouter();

  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem("admin_token", newToken);
  };

  const logout = () => {
    token.value = null;
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  const isAuthenticated = () => {
    return token.value !== null;
  };

  return {
    token,
    setToken,
    logout,
    isAuthenticated,
  };
});
