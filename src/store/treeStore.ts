import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Person, Tree } from '../model/types'
import { linkNewRelative } from '../model/linkNewRelative'
import type { RelativeRelation } from '../model/linkNewRelative'

const EMPTY_TREE: Tree = {
    rootPersonId: '',
    persons: {},
    families: {},
}

type PersonFormState =
    | { kind: 'closed' }
    | { kind: 'add' }
    | { kind: 'edit'; personId: string }
    | { kind: 'relationPicker'; anchorId: string }
    | { kind: 'addRelative'; anchorId: string; relation: RelativeRelation }

interface TreeState {
    tree: Tree
    selectedId?: string
    personFormState: PersonFormState
    togglePerson: (personId: string) => void
    openAddPerson: () => void
    openEditPerson: (personId: string) => void
    openRelationPicker: (anchorId: string) => void
    selectRelationType: (relation: RelativeRelation) => void
    closePersonForm: () => void
    addPerson: (draft: Omit<Person, 'id'>) => void
    addRelative: (anchorId: string, relation: RelativeRelation, draft: Omit<Person, 'id'>) => void
    deletePerson: (personId: string) => void
    updatePerson: (person: Person) => void
    loadTree: (tree: Tree) => void
}

export const useTreeStore = create<TreeState>()(persist((set, get) => ({
    tree: EMPTY_TREE,
    selectedId: undefined,
    personFormState: { kind: 'closed' },

    togglePerson(personId) {
        const { selectedId } = get()
        set({ selectedId: selectedId === personId ? undefined : personId })
    },

    openAddPerson() {
        set({ personFormState: { kind: 'add' } })
    },

    openEditPerson(personId) {
        set({ personFormState: { kind: 'edit', personId } })
    },

    openRelationPicker(anchorId) {
        set({ personFormState: { kind: 'relationPicker', anchorId } })
    },

    selectRelationType(relation) {
        const { personFormState } = get()
        if (personFormState.kind !== 'relationPicker') return
        set({ personFormState: { kind: 'addRelative', anchorId: personFormState.anchorId, relation } })
    },

    closePersonForm() {
        set({ personFormState: { kind: 'closed' } })
    },

    addPerson(draft) {
        const tree = structuredClone(get().tree)
        const id = crypto.randomUUID()
        tree.persons[id] = { ...draft, id }
        if (!tree.persons[tree.rootPersonId]) tree.rootPersonId = id
        set({ tree })
    },

    addRelative(anchorId, relation, draft) {
        const tree = structuredClone(get().tree)
        const id = crypto.randomUUID()
        tree.persons[id] = { ...draft, id }
        set({ tree: linkNewRelative(tree, anchorId, relation, id) })
    },

    deletePerson(personId) {
        const tree = structuredClone(get().tree)
        delete tree.persons[personId]
        for (const family of Object.values(tree.families ?? {})) {
            family.partners = family.partners.filter(id => id !== personId)
            family.children = family.children?.filter(child => child.id !== personId)
        }
        if (tree.rootPersonId === personId) {
            tree.rootPersonId = Object.keys(tree.persons)[0] ?? ''
        }
        set({ tree })
    },

    updatePerson(person) {
        const tree = structuredClone(get().tree)
        tree.persons[person.id] = person
        set({ tree })
    },

    loadTree(tree) {
        set({ tree, selectedId: undefined })
    },
}), {
    name: 'family-tree-storage',
    partialize: (state) => ({ tree: state.tree }),
}))