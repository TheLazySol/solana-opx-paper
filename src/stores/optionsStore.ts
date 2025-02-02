import { create } from 'zustand'
import { OptionOrder } from '@/types/order'

interface OptionsState {
  options: OptionOrder[]
  addOption: (option: OptionOrder) => void
  removeOption: (publicKey: string) => void
  updateOption: (publicKey: string, updates: Partial<OptionOrder>) => void
}

export const useOptionsStore = create<OptionsState>((set) => ({
  options: [],
  addOption: (option: OptionOrder) => 
    set((state) => ({ options: [...state.options, option] })),
  removeOption: (publicKey: string) =>
    set((state) => ({
      options: state.options.filter((o) => o.publicKey.toString() !== publicKey),
    })),
  updateOption: (publicKey: string, updates: Partial<OptionOrder>) =>
    set((state) => ({
      options: state.options.map((o) =>
        o.publicKey.toString() === publicKey ? { ...o, ...updates } : o
      ),
    })),
})) 