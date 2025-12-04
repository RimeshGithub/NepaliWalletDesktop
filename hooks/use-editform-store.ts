import { create } from "zustand"

export const useEditFormStore = create((set) => ({
  isFormOpen: false,
  openForm: () => set({ isFormOpen: true }),
  closeForm: () => set({ isFormOpen: false }),
}))
