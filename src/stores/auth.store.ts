import { defineStore } from "pinia";
import { ref, computed } from "vue";
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

  const currentUser = computed(() => {
    if (!token.value) return null;
    try {
      const payload = token.value.split(".")[1];
      if (!payload) return null;
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  });

  return {
    token,
    setToken,
    logout,
    isAuthenticated,
    currentUser,
  };
});
