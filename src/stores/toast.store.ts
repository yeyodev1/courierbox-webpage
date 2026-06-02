import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export const useToastStore = defineStore('toast', () => {
  const show = ref(false);
  const message = ref('');
  const type = ref<ToastType>('info');

  let timeout: any = null;

  const showNotification = (msg: string, t: ToastType = 'info') => {
    message.value = msg;
    type.value = t;
    show.value = true;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      show.value = false;
    }, 3000);
  };

  return { show, message, type, showNotification };
});
