import { shallowRef, watch } from "vue";

export type Theme = "light" | "dark";

function savedTheme(): Theme {
  try {
    return localStorage.getItem("space-society-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const theme = shallowRef<Theme>(savedTheme());
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", value === "dark" ? "#101f24" : "#f4f8f8");
      try {
        localStorage.setItem("space-society-theme", value);
      } catch {
        /* La selección funciona sin almacenamiento. */
      }
    },
    { immediate: true },
  );
  return {
    theme,
    toggleTheme: () => {
      theme.value = theme.value === "light" ? "dark" : "light";
    },
  };
}
