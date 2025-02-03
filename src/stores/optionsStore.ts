import { create } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'
import { OptionOrder } from '@/types/order'
import { PublicKey } from '@solana/web3.js'

interface OptionsState {
  options: OptionOrder[]
  addOption: (option: OptionOrder) => void
  removeOption: (publicKey: string) => void
  updateOption: (publicKey: string, updates: Partial<OptionOrder>) => void
  clearOptions: () => void
}

const persistConfig: PersistOptions<OptionsState> = {
  name: 'options-storage',
  storage: {
    getItem: (name) => {
      const str = localStorage.getItem(name)
      if (!str) return null
      const parsed = JSON.parse(str)
      return {
        ...parsed,
        state: {
          ...parsed.state,
          options: parsed.state.options.map((option: any) => ({
            ...option,
            publicKey: new PublicKey(option.publicKey),
            owner: new PublicKey(option.owner)
          }))
        }
      }
    },
    setItem: (name, value) => {
      const serialized = {
        ...value,
        state: {
          ...value.state,
          options: value.state.options.map((option: OptionOrder) => ({
            ...option,
            publicKey: option.publicKey.toString(),
            owner: option.owner.toString()
          }))
        }
      }
      localStorage.setItem(name, JSON.stringify(serialized))
    },
    removeItem: (name) => localStorage.removeItem(name)
  }
}

export const useOptionsStore = create<OptionsState>()(
  persist(
    (set) => ({
      options: [],
      addOption: (option) => set((state) => ({ options: [...state.options, option] })),
      removeOption: (publicKey) => set((state) => ({ 
        options: state.options.filter((o) => o.publicKey.toString() !== publicKey)
      })),
      updateOption: (publicKey, updates) => set((state) => ({
        options: state.options.map((o) => 
          o.publicKey.toString() === publicKey ? { ...o, ...updates } : o
        )
      })),
      clearOptions: () => set({ options: [] })
    }),
    persistConfig
  )
) 