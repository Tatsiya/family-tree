import { create } from 'zustand'
import type { Person, Tree } from '../model/types'
import { SEED_TREE } from '../model/seed'

interface TreeState {
    tree: Tree
    selectedId?: string
    togglePerson: (personId: string) => void
    addPerson: (draft: Omit<Person, 'id'>) => void
    deletePerson: (personId: string) => void
    updatePeson: (person: Person) => void
}

export const useTreeStore = create<TreeState>((set, get) => ({
    tree: SEED_TREE,
    selectedId: undefined,

    togglePerson(personId) {
        const { selectedId } = get()
        set({ selectedId: selectedId === personId ? undefined : personId })
    },
    
    addPerson(draft) {
        const tree = structuredClone(get().tree)
        const id = crypto.randomUUID()
        tree.persons[id] = { ...draft, id }
        set({ tree })
    },

    deletePerson(personId) {
        const tree = structuredClone(get().tree)
        delete tree.persons[personId]
        for (const family of Object.values(tree.families ?? {})) {
            family.partners = family.partners.filter(id => id !== personId)
            family.children = family.children?.filter(child => child.id !== personId)
        }
        set({ tree })
    },

    updatePeson(person) {
        const tree = structuredClone(get().tree)
        tree.persons[person.id] = person
        set({ tree })
    },
}))